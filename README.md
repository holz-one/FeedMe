# FeedMe 3.0 - jQuery RSS 2.0 + ATOM/iTunes Parser

![FeedMe 3.0](static/feedme.jpg)

FeedMe 3.0 is a lightweight RSS 2.0, Atom, and iTunes podcast parser with XML namespace support for JavaScript and jQuery web applications, packaged as a static site for GitHub Pages with automated daily feed caching via GitHub Actions.

This codebase has been updated and verified with jQuery 3.7.1, pruning empty or undefined fields from parsed feed results to produce cleaner, more compact JavaScript objects. Please note that this is the final version of the project and is no longer actively maintained.

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

## My Original Related PHP/JS Projects

* [ProxyCast](https://www.phpclasses.org/package/7693-PHP-Generate-JSON-from-podcast-feeds-to-serve-players.html)
* [SalamCast PHP Podcast Generator](https://www.phpclasses.org/package/7973-PHP-Generate-RSS-feeds-for-podcasts.html)
* [WaldScan](https://www.phpclasses.org/package/7968-PHP-Scan-directories-for-files-with-certain-extensions.html)
* [FeedMe](https://www.jsclasses.org/package/194-JavaScript-Retrieve-and-parse-a-RSS-feed.html)
* [SalamCast Podcast Player](https://www.jsclasses.org/package/191-JavaScript-Play-podcast-episodes-from-RSS-feed-using-jPlayer.html)
* [CSS One](https://www.phpclasses.org/package/7573-PHP-Combine-CSS-and-images-into-a-single-stylesheet.html)
* [eKatab ePub reader](https://www.phpclasses.org/package/9876-PHP-Display-ebooks-in-the-epub-format-on-Web-pages.html)
* [PHP Comic Reader Tools](https://www.phpclasses.org/package/11667-PHP-Display-images-from-comic-books-in-HTML-pages.html)

These projects are no longer being developed, but are still available for use. Some may be translated to Python in the future as part of this project.
