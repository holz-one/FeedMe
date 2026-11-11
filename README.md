# FeedMe 3.0 - jQuery RSS 2.0 + ATOM/iTunes Parser

![FeedMe 3.0](static/feedme.jpg)

FeedMe is a basic RSS feed and Podcast parser with XML namespace support for JavaScript and jQuery web apps, now packaged as a static site for GitHub Pages with daily feed caching via GitHub Actions.

I have done some repairs to the code and tested it with jQuery 3.7.1, removing properties that are left empty or undefined so that the returned object is smaller and has less wasted space.

## Interface Overview

- **Home Tab (`#home`)**: Displays the cached podcasts sidebar (`podcasts/feeds.json`) with live search filtering and original related projects in the left column, alongside the FeedMe banner.
- **Globe Tab (`#chan`)**: Splits the view 40% / 60% between the searchable/sortable **Episodes** sidebar (`#chan_info` and `#playlist`) and the current episode media player and show notes (`#item_info`).
- **Feed Data Pop-up (`#feedInfoModal`)**: Displays **Channel** metadata (first tab) and **Episode** metadata (second tab) in the same modal pop-up, with fields grouped into importance panels (**Essential**, **Details & iTunes**, and **Technical & Protocol**).

## Project Structure

```text
.
├── .github/workflows/update-and-deploy.yml  # Daily feed caching + GitHub Pages deploy
├── cache_rss.py                             # Downloads feeds from podcasts.yaml into podcasts/
├── index.html                               # Static RSS feed reader & podcast player
├── podcasts.yaml                            # Podcast feed subscriptions (also supports podcast.yaml)
├── podcasts/                                # Cached .rss feeds + generated feeds.json manifest
├── requirements.txt                         # Python dependencies for cache_rss.py
└── static/
    ├── feedme.jpg                           # FeedMe banner illustration
    └── feedme/                              # CSS, JS, and Bootstrap font assets
```

## Caching Podcast Feeds Locally

Add or update subscriptions in `podcasts.yaml`:

```yaml
feeds:
  This Week in Linux: https://feeds.fireside.fm/thisweekinlinux/rss
  Linux Unplugged: https://feeds.jupiterbroadcasting.com/lup
  Late Night Linux: https://latenightlinux.com/feed/mp3
```

Then install dependencies and run `cache_rss.py`:

```bash
pip install -r requirements.txt
python3 cache_rss.py
```

Or with `uv`:

```bash
uv run cache_rss.py
```

This downloads each feed into `podcasts/` and writes `podcasts/feeds.json` so `index.html` automatically discovers all cached podcasts.

Useful flags:
- `--config <path>` / `-c`: Use a custom YAML file (defaults to `podcasts.yaml`, falling back to `podcast.yaml`).
- `--output-dir <dir>` / `-o`: Destination folder for cached `.rss` files (defaults to `podcasts/`).
- `--prune`: Remove `.rss`/`.xml` files in `podcasts/` that are no longer listed in the YAML file.
- `--strict`: Exit with status `1` if any feed fails to download, even if an older cached file exists.

## Local Preview

Serve the repository over HTTP (required for browser XML/JSON requests):

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## GitHub Actions & GitHub Pages Setup

The workflow in `.github/workflows/update-and-deploy.yml` runs:
- Daily at `06:00 UTC` (`schedule` cron)
- On every push to `main` or `master`
- Manually via **Actions -> Cache Podcasts and Deploy to GitHub Pages -> Run workflow**

To enable GitHub Pages for this repository:
1. Push the repository to GitHub.
2. Open **Settings -> Pages** in your GitHub repository.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

On each run, the workflow installs Python dependencies, runs `python cache_rss.py --prune` to refresh `podcasts/`, and publishes `index.html`, `static/`, and `podcasts/` directly to GitHub Pages.

## Reference

* [RSS 2.0](http://www.rssboard.org/rss-2-0)
* Reference for iTunes Podcasting: [spec](http://www.apple.com/itunes/podcasts/specs.html) [howto](http://www.podcast411.com/howto_1.html)
* Reference for [ATOM](http://tools.ietf.org/html/rfc4287)

This class returns a normal Javascript object.

### Display Example with my jQuery Plugin, `feedRead`:

```javascript
jQuery(function ($) {
    $.feedRead({
        itunes: true, // podcast url
        manifest: 'podcasts/feeds.json',
        feed_list: '#podcast',
        feed: '#playlist',
        channel: '#chan_info',
        item: '#item_info',
        modal: '#feedInfoModal',
        modal_body: '#feedModalBody'
    });
});
```
