#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pyyaml",
#     "requests",
# ]
# ///
"""Download podcast RSS/Atom feeds configured in podcasts.yaml into podcasts/."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import xml.etree.ElementTree as ET

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import yaml

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_NAMES = ("podcasts.yaml", "podcast.yaml")
DEFAULT_CACHE_DIR = "podcasts"
DEFAULT_TIMEOUT = 30
USER_AGENT = "FeedMe-RSS-Cacher/1.0 (+https://github.com/salamcast)"
VALID_ROOT_TAGS = {"rss", "feed", "rdf"}


def resolve_config_path(config_arg: str | None) -> Path:
    """Resolve the YAML config file path, supporting podcasts.yaml and podcast.yaml."""
    if config_arg:
        path = Path(config_arg)
        if not path.is_absolute() and not path.exists():
            candidate = BASE_DIR / path
            if candidate.exists():
                return candidate
        return path

    for root in (Path.cwd(), BASE_DIR):
        for name in DEFAULT_CONFIG_NAMES:
            candidate = root / name
            if candidate.is_file():
                return candidate

    return BASE_DIR / DEFAULT_CONFIG_NAMES[0]


def load_feeds_from_yaml(config_path: Path) -> list[tuple[str, str]]:
    """Read and validate podcast feed definitions from a YAML file."""
    if not config_path.is_file():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    if not isinstance(data, dict) or "feeds" not in data:
        raise ValueError(f"Expected a top-level 'feeds' key in {config_path}")

    raw_feeds = data["feeds"]
    if raw_feeds is None:
        return []

    parsed: list[tuple[str, str]] = []
    if isinstance(raw_feeds, dict):
        items = raw_feeds.items()
    elif isinstance(raw_feeds, list):
        items = []
        for entry in raw_feeds:
            if not isinstance(entry, dict):
                raise ValueError(f"Invalid feed entry in {config_path}: {entry!r}")
            name = entry.get("name") or entry.get("title")
            url = entry.get("url")
            items.append((name, url))
    else:
        raise ValueError(f"'feeds' in {config_path} must be a mapping or list")

    for raw_name, raw_url in items:
        name = str(raw_name).strip() if raw_name is not None else ""
        url = str(raw_url).strip() if raw_url is not None else ""
        if not name or not url:
            raise ValueError(f"Feed entries must have both name and URL: {raw_name!r}: {raw_url!r}")
        if not url.startswith(("http://", "https://")):
            raise ValueError(f"Unsupported URL scheme for '{name}': {url}")
        parsed.append((name, url))

    return parsed


def sanitize_filename(name: str, used_names: set[str]) -> str:
    """Convert a podcast title into a safe, unique .rss filename."""
    cleaned = re.sub(r'[\\/:*?"<>|\s]+', "_", name.strip()).strip("._")
    if not cleaned:
        cleaned = "feed"

    stem = cleaned[:-4] if cleaned.lower().endswith(".rss") else cleaned
    candidate = f"{stem}.rss"
    counter = 2
    while candidate.lower() in used_names:
        candidate = f"{stem}_{counter}.rss"
        counter += 1

    used_names.add(candidate.lower())
    return candidate


def build_session() -> requests.Session:
    """Create a requests session with retry handling for transient failures."""
    retry = Retry(
        total=3,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        }
    )
    return session


def validate_feed_xml(payload: bytes) -> bytes:
    """Verify downloaded content is valid RSS or Atom XML and strip leading whitespace."""
    trimmed = payload.lstrip(b"\xef\xbb\xbf \t\r\n")
    if not trimmed:
        raise ValueError("Empty response body")

    root = ET.fromstring(trimmed)
    local_tag = root.tag.split("}")[-1].lower()
    if local_tag not in VALID_ROOT_TAGS:
        raise ValueError(f"Unexpected XML root element <{local_tag}> (expected rss, feed, or rdf)")

    # Return BOM-free XML with any leading whitespace stripped before <?xml
    return trimmed


def atomic_write_bytes(target_path: Path, data: bytes) -> None:
    """Atomically write bytes to target_path without leaving partial files behind."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=target_path.parent, prefix=".tmp_", suffix=target_path.suffix)
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        os.chmod(tmp_path, 0o644)
        os.replace(tmp_path, target_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def fetch_feed(session: requests.Session, url: str, timeout: int) -> bytes:
    """Download and validate a single RSS/Atom feed."""
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return validate_feed_xml(response.content)


def build_relative_url(target_path: Path, cache_dir: Path) -> str:
    """Compute web-relative POSIX URL for the cached feed file."""
    for base in (Path.cwd().resolve(), BASE_DIR.resolve()):
        try:
            return target_path.resolve().relative_to(base).as_posix()
        except ValueError:
            continue
    return f"{cache_dir.name}/{target_path.name}"


def cache_feeds(
    config_path: Path,
    cache_dir: Path,
    timeout: int = DEFAULT_TIMEOUT,
    prune: bool = False,
    strict: bool = False,
) -> int:
    """Download all feeds from config_path into cache_dir and generate feeds.json."""
    feeds = load_feeds_from_yaml(config_path)
    cache_dir.mkdir(parents=True, exist_ok=True)

    used_names: set[str] = set()
    manifest_entries: list[dict[str, str]] = []
    downloaded = 0
    fallback_used = 0
    failed = 0

    session = build_session()
    try:
        for title, source_url in feeds:
            filename = sanitize_filename(title, used_names)
            target_path = cache_dir / filename
            print(f"Fetching '{title}' from {source_url} ...", flush=True)
            available = False
            try:
                payload = fetch_feed(session, source_url, timeout=timeout)
                atomic_write_bytes(target_path, payload)
                size_kb = len(payload) / 1024
                print(f"  -> Saved {target_path} ({size_kb:.1f} KiB)", flush=True)
                downloaded += 1
                available = True
            except Exception as exc:
                if target_path.is_file() and not strict:
                    print(
                        f"  ! Warning: failed to update '{title}' ({exc}); keeping existing cached file {target_path}",
                        file=sys.stderr,
                        flush=True,
                    )
                    fallback_used += 1
                    available = True
                else:
                    print(f"  x Error caching '{title}': {exc}", file=sys.stderr, flush=True)
                    failed += 1

            if available:
                manifest_entries.append(
                    {
                        "title": title,
                        "filename": filename,
                        "url": build_relative_url(target_path, cache_dir),
                        "source_url": source_url,
                    }
                )
    finally:
        session.close()

    if prune:
        expected = {entry["filename"].lower() for entry in manifest_entries}
        for existing in cache_dir.iterdir():
            if existing.is_file() and existing.suffix.lower() in {".rss", ".xml"}:
                if existing.name.lower() not in expected:
                    existing.unlink()
                    print(f"Pruned stale cached feed: {existing}", flush=True)

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "feeds": manifest_entries,
    }
    manifest_path = cache_dir / "feeds.json"
    atomic_write_bytes(manifest_path, (json.dumps(manifest, indent=2) + "\n").encode("utf-8"))
    print(
        f"Done: {downloaded} updated, {fallback_used} cached fallback, {failed} failed. "
        f"Manifest written to {manifest_path}",
        flush=True,
    )

    if failed > 0:
        return 1
    if feeds and not manifest_entries:
        return 1
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Download podcast RSS feeds from podcasts.yaml (or podcast.yaml) and cache them locally."
    )
    parser.add_argument(
        "-c",
        "--config",
        help="Path to podcast YAML config file (defaults to podcasts.yaml or podcast.yaml).",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        default=None,
        help=f"Directory to cache RSS feeds (default: {DEFAULT_CACHE_DIR}).",
    )
    parser.add_argument(
        "-t",
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"HTTP request timeout in seconds (default: {DEFAULT_TIMEOUT}).",
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="Delete .rss/.xml files in output-dir that are no longer in the YAML config.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with non-zero status if any feed fails, even when a cached copy exists.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """CLI entry point."""
    args = parse_args(argv)
    config_path = resolve_config_path(args.config)
    output_dir = (
        Path(args.output_dir)
        if args.output_dir is not None
        else config_path.parent / DEFAULT_CACHE_DIR
    )
    try:
        return cache_feeds(
            config_path=config_path,
            cache_dir=output_dir,
            timeout=args.timeout,
            prune=args.prune,
            strict=args.strict,
        )
    except Exception as exc:
        print(f"Fatal error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
