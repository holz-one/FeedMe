/*
 ################################################################################
 #
 #   FeedMe 3.0 - jQuery RSS 2.0 + ATOM/iTunes parser, April 2026
 #      feedme-3.0.js
 #
 #   Copyright 2026 Abu Khadeejah Karl Holz
 #
 #   https://github.com/salamcast
 #
 #   Licensed under the Apache License, Version 2.0 (the "License");
 #   you may not use this file except in compliance with the License.
 #   You may obtain a copy of the License at
 #
 #       http://www.apache.org/licenses/LICENSE-2.0
 #
 #   Unless required by applicable law or agreed to in writing, software
 #   distributed under the License is distributed on an "AS IS" BASIS,
 #   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 #   See the License for the specific language governing permissions and
 #   limitations under the License.
 #
 ################################################################################

 Reference for RSS 2.0

 http://www.rssboard.org/rss-2-0

 Reference for iTunes Podcasting 

 http://www.apple.com/itunes/podcasts/specs.html
 http://www.podcast411.com/howto_1.html

 Reference for ATOM

 http://tools.ietf.org/html/rfc4287

 */


var feedMe = function ($url) {
// XML Namespaces used in RSS, ATOM, iTunes and other common feeds
    var opts = {
        itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd',
        atom: 'http://www.w3.org/2005/Atom',
        cc: 'http://backend.userland.com/creativeCommonsRssModule',  // http://www.rssboard.org/creative-commons
        trackback: 'http://madskills.com/public/xml/rss/module/trackback/', // http://www.rssboard.org/trackback
        blogChannel: "http://backend.userland.com/blogChannelModule",
        media: "http://search.yahoo.com/mrss/",
        yt: "http://www.youtube.com/xml/schemas/2015"
    };
    // ********************************************************************************
    // RSS items in both channel and item
    // ********************************************************************************
    // RSS feed title, should be the same as the HTML title for channel and title for the item
    var title = function (c) { return c.children('title').first().text() || c.find('title').first().text(); };
    // RSS feed link for main site for channel and url for feed item
    var link = function (c) { return c.children('link').first().text() || c.find('link').first().text(); };
    // RSS description for both channel and item
    var description = function (c) { return c.children('description').first().text() || c.find('description').first().text(); };
    // RSS category, selecting direct children only so channel category doesn't concatenate all item categories
    var category = function (c) {
        return c.children('category').map(function () { return $.trim($(this).text()); }).get().filter(Boolean).join(', ');
    };
    // ********************************************************************************
    // iTunes items both in channel and item/entry tags
    // ********************************************************************************
    // <itunes:author> - Artist column
    var i_author = function (c) { return c.find('*').ns_filter(opts.itunes, 'author').first().text(); };
    // <itunes:block> - prevent an episode or podcast from appearing
    var i_block = function (c) { return c.find('*').ns_filter(opts.itunes, 'block').first().text(); };
    //<itunes:image> - Same location as album art
    var i_image = function (c) { return c.find('*').ns_filter(opts.itunes, 'image').first().attr('href'); };
    //<itunes:explicit> - parental advisory graphic in Name column
    var i_explicit = function (c) { return c.find('*').ns_filter(opts.itunes, 'explicit').first().text(); };
    //<itunes:keywords> - not visible but can be searched
    var i_keywords = function (c) { return c.find('*').ns_filter(opts.itunes, 'keywords').first().text(); };
    //<itunes:subtitle> - Description column
    var i_subtitle = function (c) { return c.find('*').ns_filter(opts.itunes, 'subtitle').first().text(); };
    //<itunes:summary> - when the "circled i" in Description column is clicked
    var i_summary = function (c) { return c.find('*').ns_filter(opts.itunes, 'summary').first().text(); };
    // ********************************************************************************
    // iTunes Channel items
    // ********************************************************************************
    /* itunes tags in channel tag
     xml tag			      channel	item	where content appears in iTunes
     <itunes:category>   	    Y	 	        Category column and in iTunes Store Browse
     <itunes:complete>   	    Y		        indicates completion of podcasts; no more episodes
     <itunes:new-feed-url>	    Y		        not visible, used to inform iTunes of new feed URL location
     <itunes:owner>		        Y	 	        not visible, used for contact only
     // ********************************************************************************  */
    var i_channel = function (c) {
        var ch = c.children();
        var i = {};
        i.author = ch.ns_filter(opts.itunes, 'author').first().text();
        i.block = ch.ns_filter(opts.itunes, 'block').first().text();
        i.category = ch.ns_filter(opts.itunes, 'category').map(function () { return $(this).attr('text'); }).get().filter(Boolean).join(', ');
        i.img = ch.ns_filter(opts.itunes, 'image').first().attr('href');
        i.explicit = ch.ns_filter(opts.itunes, 'explicit').first().text();
        i.complete = ch.ns_filter(opts.itunes, 'complete').first().text();
        i.keywords = ch.ns_filter(opts.itunes, 'keywords').first().text();
        i.new_feed_url = ch.ns_filter(opts.itunes, 'new-feed-url').first().text();
        i.owner = ch.ns_filter(opts.itunes, 'owner').first().text();
        i.subtitle = ch.ns_filter(opts.itunes, 'subtitle').first().text();
        i.desc = ch.ns_filter(opts.itunes, 'summary').first().text();
        return i;
    };
    // ********************************************************************************
    /* itunes tags in item/entry tag
     xml tag			            channel	  item  	where content appears in iTunes
     <itunes:duration>		 	                Y	    Time column
     <itunes:isClosedCaptioned>		            Y	    Closed Caption graphic in Name column
     <itunes:order>		            	        Y   	override the order of episodes on the store
     // ******************************************************************************** */
    var i_item = function ($item) {
        return {
            author: i_author($item),
            block: i_block($item),
            img: i_image($item),
            time: $item.find('*').ns_filter(opts.itunes, 'duration').first().text(),
            explicit: i_explicit($item),
            isCC: $item.find('*').ns_filter(opts.itunes, 'isClosedCaptioned').first().text(),
            order: $item.find('*').ns_filter(opts.itunes, 'order').first().text(),
            keywords: i_keywords($item),
            subtitle: i_subtitle($item)
        };
    };
    // ********************************************************************************
    //  ATOM items in both channel/feed and item/entry
    // ********************************************************************************
    //<atom:id> ATOM id
    var a_id = function (c) { return c.find('*').ns_filter(opts.atom, 'id').first().text(); };
    //<atom:title> ATOM title
    var a_title = function (c) { return c.find('*').ns_filter(opts.atom, 'title').first().text(); };
    //<atom:summary> ATOM summary
    var a_summary = function (c) { return c.find('*').ns_filter(opts.atom, 'summary').first().text(); };
    // ********************************************************************************
    // ATOM items in RSS
    // ********************************************************************************
    var atom = function (c) {
        var a = {};
        a.id = a_id(c);
        a.title = a_title(c);
        a.summary = a_summary(c);
        return a;
    };

    // ********************************************************************************
    var cloud = function (c) {
        var cd = {};
        cd.domain = c.find('cloud').attr('domain');
        cd.port = c.find('cloud').attr('port');
        cd.path = c.find('cloud').attr('path');
        cd.registerProcedure = c.find('cloud').attr('registerProcedure');
        cd.protocol = c.find('cloud').attr('protocol');
        return cd;
    };
    // ********************************************************************************
    var rss_img = function (c) {
        var img = {};
        img.url = c.find('image').find('url').first().text();
        img.title = c.find('image').find('title').first().text();
        img.link = c.find('image').find('link').first().text();
        img.width = c.find('image').find('width').first().text(); // max 144, default 88
        img.height = c.find('image').find('height').first().text(); // max 400, default 31
        img.description = c.find('image').find('description').first().text();
        return img;
    };
    // ********************************************************************************
    var text_input = function (c) {
        var txt = {};
        txt.title = c.find('textInput').find('title').first().text();
        txt.link = c.find('textInput').find('link').first().text();
        txt.name = c.find('textInput').find('name').first().text();
        txt.description = c.find('image').find('description').first().text();
        return txt;
    };
    // ********************************************************************************
    var track_back = function ($item) {
        var tb = {
            about: $item.find('*').ns_filter(opts.trackback, 'about').first().text(),
            ping: $item.find('*').ns_filter(opts.trackback, 'ping').first().text()
        };
        return tb;
    };
    // ********************************************************************************
    var enclosure = function ($item) {
        var e = {	// enclosure
            url: $item.find('enclosure').attr("url"),
            type: $item.find('enclosure').attr("type"),
            size: $item.find('enclosure').attr("length")
        };
        return e;
    };
    // ********************************************************************************
    // ********************************************************************************
    var chan = {};
    chan.items = [];
    $.ajax({
        type: 'GET', url: $url, dataType: 'xml', async: false, success: function (d) {
            $(d).find('channel').each(function () {
                var c = jQuery(this);
                chan.title = title(c); // Name column (itunes)
                chan.link = link(c); //website link and arrow in Name column (itunes)
                chan.description = description(c);
                chan.lang = c.find('language').first().text();
                chan.copyright = c.find('copyright').first().text(); // not visible (itunes)
                chan.managingEditor = c.find('managingEditor').first().text();
                chan.webMaster = c.find('webMaster').first().text();
                chan.pubDate = c.find('pubDate').first().text();
                chan.lastBuildDate = c.find('lastBuildDate').first().text();
                chan.category = category(c);
                chan.generator = c.find('generator').first().text();
                chan.docs = c.find('docs').first().text();
                chan.cloud = cloud(c);
                chan.ttl = c.find('ttl').first().text();
                chan.image = rss_img(c);
                chan.rating = c.find('rating').first().text(); // PICS rating - http://www.w3.org/PICS/ - FYI not maintained
                chan.textInput = text_input(c);
//         skipHours: '', skipDays: '',  // i'll have to look into this later on, many rss readers ignore this, so i will too for now
                chan.licence = c.find('*').ns_filter(opts.cc, 'license').first().text();
                chan.itunes = i_channel(c);
                chan.atom = atom(c);
            });
            // this is based on youtubes feed
            // found the link in this article
            // http://authorityseolab.com/how-to-find-your-youtube-feeds-2015-and-later/
            $(d).find('feed').each(function () {
                var c = jQuery(this);
                chan.title = title(c); // Name column (itunes)
                chan.link = c.find("author").find('uri').first().text();
//                chan.description = description(c);
                chan.author = c.find('author').find('name').first().text();
                chan.pubDate = c.find('published').first().text();
            });

            // rss 2.0 item
            $(d).find('item').each(function () {
                var $item = jQuery(this);
                var I = {};
                I.title = title($item); // Name column(itunes)
                I.link = link($item);
                I.description = description($item);
                I.author = $item.find('author').first().text();
                I.category = category($item);
                I.comments = $item.find('comments').text();
                I.enclosure = enclosure($item);
                I.guid = $item.find('guid').first().text();
                I.isPermaLink = $item.find('guid').attr('isPermaLink');
                I.pubdate = $item.find('pubDate').text(); // Release Date column (itunes)
                I.source = $item.find('source').first().text();
                I.source_url = $item.find('source').first().attr('url');
                // extras
                I.licence = $item.find('*').ns_filter(opts.cc, 'license').first().text();
                I.trackback = track_back($item);
                I.itunes = i_item($item);
                I.atom = atom($item);
                chan.items.push(I);
            });

            $(d).find('entry').each(function () {
                var $item = jQuery(this);
                var I = {};
                I.title = title($item); // Name column(itunes)
                I.link = $item.find("author").find('uri').first().text();
                I.description = $item.find('*').ns_filter(opts.media, 'description').first().text();
                I.author = $item.find('author').find('name').first().text();
                I.id = $item.find('id').first().text();
                I.pubdate = $item.find('published').text(); // Release Date column (itunes)
                chan.items.push(I);
            });
        }
    });

    //filter function to remove all empty and undefined elements
    var channel = {};
    $.each(chan, function (k, v) {
        if (v === '' || typeof v == "undefined") {
            //place holder for skipping this type of value
        } else if (typeof v == "object") {
            channel[k] = {};
            $.each(v, function (k2, v2) {
                if (v2 === '' || typeof v2 == "undefined") {
                    //place holder for skipping this type of value
                } else if (typeof v2 === "object") {
                    channel[k][k2] = {};
                    $.each(v2, function (k3, v3) {
                        if (v3 == '' || typeof v3 == "undefined") {
                            //place holder for skipping this type of value
                        } else if (typeof v3 === "object") {
                            channel[k][k2][k3] = {};
                            $.each(v3, function (k4, v4) {
                                if (v4 == '' || typeof v4 == "undefined") {
                                    //place holder for skipping this type of value
                                } else if (typeof v4 === "object") {
                                    channel[k][k2][k3][k4] = {};
                                    $.each(v4, function (k5, v5) {
                                        if (v5 == '' || typeof v5 == "undefined") {
                                            //place holder for skipping this type of value
                                        } else if (typeof v5 === "object") {
                                            channel[k][k2][k3][k4][k5] = {};
                                            //don't think there is anymore objects this deep, but you'll see an empty one if there is
//                                            if (jQuery.isEmptyObject(channel[k][k2][k3][k4][k5])) {
//                                                delete channel[k][k2][k3][k4][k5];
//                                            }
                                        } else { channel[k][k2][k3][k4][k5] = v5; }
                                    });
                                    if (jQuery.isEmptyObject(channel[k][k2][k3][k4])) { delete channel[k][k2][k3][k4]; }
                                } else { channel[k][k2][k3][k4] = v4; }
                            });
                            if (jQuery.isEmptyObject(channel[k][k2][k3])) { delete channel[k][k2][k3]; }
                        } else { channel[k][k2][k3] = v3; }
                    });
                    if (jQuery.isEmptyObject(channel[k][k2])) { delete channel[k][k2]; }
                } else { channel[k][k2] = v2; }
            });
            if (jQuery.isEmptyObject(channel[k])) { delete channel[k]; }
        } else { channel[k] = v; }
    });
    return channel;
};

//#############################################################################################
// Extras to make this plugin work
//#############################################################################################
// ns_filter, a jQuery plugin for XML namespace queries.
// http://www.ibm.com/developerworks/xml/library/x-feedjquery/#listing2
(function ($) {
    $.fn.ns_filter = function (namespaceURI, localName) {
        return $(this).filter(function () {
            var domnode = $(this)[0];
            return (domnode.namespaceURI == namespaceURI && domnode.localName == localName);
        });
    };
})(jQuery);
/**
 * Extras for feed reader, not part of the feedMe plugin, but used in the feed reader plugin to make it work better
 * with the help of Brave AI
 */
// test url type
function isAudioOrVideo(urlObj) {
    if (!urlObj || typeof urlObj.type !== 'string') {
        return { isMedia: false, type: 'audio' };
    }
    const type = urlObj.type; // e.g., "audio/mpeg", "video/mp4"
    const isAudio = type.startsWith('audio/');
    const isVideo = type.startsWith('video/');

    return {
        isMedia: isAudio || isVideo,
        type: isVideo ? 'video' : 'audio'
    };
}

function formatDate(rfc2822Str) {
    const date = new Date(rfc2822Str);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatBytes(bytesVal) {
    var num = Number(bytesVal);
    if (!isFinite(num) || num <= 0) return String(bytesVal);
    var units = ['B', 'KB', 'MB', 'GB'];
    var idx = 0;
    var scaled = num;
    while (scaled >= 1024 && idx < units.length - 1) {
        scaled /= 1024;
        idx += 1;
    }
    return scaled.toFixed(idx === 0 ? 0 : 1) + ' ' + units[idx] + ' (' + num.toLocaleString() + ' bytes)';
}

function detectType(str) {
    if (typeof str !== 'string') return str;

    // Test for URL
    const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    if (urlPattern.test(str)) return '<a href="' + str + '" target="_blank" rel="noopener noreferrer">' + str + '</a>';

    // Test for email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(str)) return '<a href="mailto:' + str + '">' + str + '</a>';

    // Test for date (RFC 2822 or ISO 8601) - avoid false positives on episode titles like "Episode 01"
    const rfc2822Pattern = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i;
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
    if (rfc2822Pattern.test(str.trim()) || isoDatePattern.test(str.trim())) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) return formatDate(str);
    }

    return $('<span>').text(str).html();
}

//feedRead
/**
 * The goal of this plugin is to demonstrate how feedme works as an RSS 2.0 feed reader for your webpage
 * This is only aimed at reading feeds, it won't act as a podcast media player ... yet.  this is my research plugin,
 * I might tryout the HTML 5 Audio/Video tags, but there will be not guarantees of the content playing since not all
 * feeds contain HTML 5 compatible content.
 */
(function ($) {
    var IMPORTANCE_GROUPS = [
        { key: 'essential', label: 'Essential', badgeClass: 'label-primary' },
        { key: 'details', label: 'Details & iTunes', badgeClass: 'label-info' },
        { key: 'technical', label: 'Technical & Protocol', badgeClass: 'label-default' }
    ];

    var CHANNEL_IMPORTANCE = {
        'title': { group: 'essential', label: 'Show Title' },
        'link': { group: 'essential', label: 'Website' },
        'description': { group: 'essential', label: 'Description', html: true },
        'itunes.desc': { group: 'essential', label: 'iTunes Summary', html: true },
        'itunes.subtitle': { group: 'essential', label: 'Subtitle' },
        'itunes.author': { group: 'essential', label: 'Author / Network' },
        'author': { group: 'essential', label: 'Author' },
        'pubDate': { group: 'essential', label: 'Published Date' },
        'lastBuildDate': { group: 'essential', label: 'Last Build Date' },
        'lang': { group: 'essential', label: 'Language' },
        'itunes.img': { group: 'essential', label: 'Cover Artwork', image: true },
        'image.url': { group: 'essential', label: 'RSS Image URL', image: true },

        'category': { group: 'details', label: 'RSS Category' },
        'itunes.category': { group: 'details', label: 'iTunes Category' },
        'itunes.keywords': { group: 'details', label: 'Keywords' },
        'itunes.explicit': { group: 'details', label: 'Explicit', badge: true },
        'itunes.complete': { group: 'details', label: 'Series Complete', badge: true },
        'itunes.owner': { group: 'details', label: 'Owner Contact' },
        'copyright': { group: 'details', label: 'Copyright' },
        'managingEditor': { group: 'details', label: 'Managing Editor' },
        'webMaster': { group: 'details', label: 'Webmaster' },
        'licence': { group: 'details', label: 'License' },
        'image.title': { group: 'details', label: 'Image Title' },
        'image.link': { group: 'details', label: 'Image Link' },
        'image.width': { group: 'details', label: 'Image Width' },
        'image.height': { group: 'details', label: 'Image Height' },
        'image.description': { group: 'details', label: 'Image Description' },

        'generator': { group: 'technical', label: 'Feed Generator' },
        'docs': { group: 'technical', label: 'Specification Docs' },
        'ttl': { group: 'technical', label: 'TTL (minutes)' },
        'rating': { group: 'technical', label: 'PICS Rating' },
        'itunes.block': { group: 'technical', label: 'iTunes Block', badge: true },
        'itunes.new_feed_url': { group: 'technical', label: 'New Feed URL' },
        'atom.id': { group: 'technical', label: 'Atom ID' },
        'atom.title': { group: 'technical', label: 'Atom Title' },
        'atom.summary': { group: 'technical', label: 'Atom Summary', html: true }
    };

    var ITEM_IMPORTANCE = {
        'title': { group: 'essential', label: 'Episode Title' },
        'pubdate': { group: 'essential', label: 'Release Date' },
        'itunes.time': { group: 'essential', label: 'Duration' },
        'enclosure.url': { group: 'essential', label: 'Media URL' },
        'enclosure.type': { group: 'essential', label: 'Media Type' },
        'enclosure.size': { group: 'essential', label: 'Media Size', bytes: true },
        'link': { group: 'essential', label: 'Episode Link' },
        'description': { group: 'essential', label: 'Show Notes', html: true },
        'itunes.subtitle': { group: 'essential', label: 'Subtitle' },
        'itunes.author': { group: 'essential', label: 'iTunes Author' },
        'author': { group: 'essential', label: 'Author' },
        'itunes.img': { group: 'essential', label: 'Episode Artwork', image: true },

        'category': { group: 'details', label: 'Categories' },
        'itunes.keywords': { group: 'details', label: 'Keywords' },
        'itunes.explicit': { group: 'details', label: 'Explicit', badge: true },
        'itunes.isCC': { group: 'details', label: 'Closed Captioned', badge: true },
        'itunes.order': { group: 'details', label: 'Episode Order' },
        'comments': { group: 'details', label: 'Comments URL' },
        'licence': { group: 'details', label: 'License' },
        'source': { group: 'details', label: 'Source' },
        'source_url': { group: 'details', label: 'Source URL' },

        'guid': { group: 'technical', label: 'GUID' },
        'isPermaLink': { group: 'technical', label: 'GUID Is PermaLink', badge: true },
        'id': { group: 'technical', label: 'Atom Entry ID' },
        'itunes.block': { group: 'technical', label: 'iTunes Block', badge: true },
        'trackback.about': { group: 'technical', label: 'Trackback About' },
        'trackback.ping': { group: 'technical', label: 'Trackback Ping' },
        'atom.id': { group: 'technical', label: 'Atom ID' },
        'atom.title': { group: 'technical', label: 'Atom Title' },
        'atom.summary': { group: 'technical', label: 'Atom Summary', html: true }
    };

    function flattenFeedFields(obj, rules) {
        var grouped = { essential: [], details: [], technical: [] };
        if (!obj) return grouped;

        function pushField(path, val) {
            if (val === undefined || val === null || val === '') return;
            var meta = rules[path] || { group: 'technical', label: path };
            grouped[meta.group].push({
                key: path,
                label: meta.label,
                value: val,
                meta: meta
            });
        }

        $.each(obj, function (k, v) {
            if (k === 'items') return;
            if (typeof v === 'object' && v !== null) {
                $.each(v, function (k2, v2) {
                    if (typeof v2 !== 'object') {
                        pushField(k + '.' + k2, v2);
                    }
                });
            } else {
                pushField(k, v);
            }
        });
        return grouped;
    }

    function formatFieldCell(entry) {
        var val = entry.value;
        var meta = entry.meta;
        var $cell = $('<td>');

        if (meta.bytes) {
            return $cell.text(formatBytes(val));
        }
        if (meta.badge) {
            var strVal = String(val).toLowerCase();
            var cls = (strVal === 'yes' || strVal === 'true') ? 'label-warning' : 'label-default';
            return $cell.append($('<span>').addClass('label ' + cls).text(String(val)));
        }
        if (meta.html) {
            return $cell.append($('<div>').addClass('feed-inspector-desc').html(String(val)));
        }
        if (meta.image) {
            $cell.append(detectType(String(val)));
            $cell.append('<br>');
            $cell.append($('<img>').addClass('feed-inspector-thumb').attr('src', String(val)).attr('alt', entry.label));
            return $cell;
        }
        var formatted = detectType(String(val));
        if (String(val).length > 300) {
            return $cell.append($('<div>').addClass('feed-inspector-desc').html(formatted));
        }
        return $cell.html(formatted);
    }

    function buildSectionPanel(title, panelClass, rows, emptyMsg) {
        var $panel = $('<div>').addClass('panel ' + panelClass);
        var $heading = $('<div>').addClass('panel-heading').append(
            $('<h4>').addClass('panel-title').text(title + ' ').append(
                $('<span>').addClass('badge').text(rows.length)
            )
        );
        $panel.append($heading);

        if (!rows.length) {
            $panel.append($('<div>').addClass('panel-body text-muted').text(emptyMsg));
            return $panel;
        }

        var $table = $('<table>').addClass('table table-striped table-bordered table-condensed feed-inspector-table');
        var $tbody = $('<tbody>');
        $.each(rows, function (_, entry) {
            var $tr = $('<tr>');
            $tr.append($('<th>').text(entry.label));
            $tr.append(formatFieldCell(entry));
            $tbody.append($tr);
        });
        $table.append($tbody);
        $panel.append($('<div>').addClass('table-responsive').append($table));
        return $panel;
    }

    function renderImportanceSections($pane, grouped, panelClass, emptyAlertMsg) {
        var total = 0;
        $.each(IMPORTANCE_GROUPS, function (_, grp) {
            var rows = grouped[grp.key];
            if (rows.length) {
                total += rows.length;
                $pane.append(
                    buildSectionPanel(grp.label, panelClass, rows, '')
                );
            }
        });
        if (!total) {
            $pane.append($('<div>').addClass('alert alert-info').text(emptyAlertMsg));
        }
    }

    function renderFeedInspector($container, feed, item, idPrefix) {
        if (!$container || !$container.length) return;
        $container.empty();

        if (!feed) {
            $container.append(
                $('<div>').addClass('alert alert-info').html(
                    '<strong>No podcast feed loaded yet.</strong> Choose a podcast on the Home tab to inspect channel and episode metadata.'
                )
            );
            return;
        }

        var chanGroups = flattenFeedFields(feed, CHANNEL_IMPORTANCE);
        var itemGroups = flattenFeedFields(item, ITEM_IMPORTANCE);

        var countGroupTotal = function (grouped) {
            return grouped.essential.length + grouped.details.length + grouped.technical.length;
        };

        var tabs = [
            {
                key: 'channel',
                label: 'Channel',
                badgeClass: 'label-primary',
                panelClass: 'panel-primary',
                grouped: chanGroups,
                count: countGroupTotal(chanGroups),
                emptyMsg: 'No channel metadata available.'
            },
            {
                key: 'episode',
                label: 'Episode',
                badgeClass: 'label-info',
                panelClass: 'panel-info',
                grouped: itemGroups,
                count: countGroupTotal(itemGroups),
                emptyMsg: 'Select an episode from the Episodes sidebar to inspect episode metadata.'
            }
        ];

        var $nav = $('<ul>').addClass('nav nav-tabs feed-inspector-tabs').attr('role', 'tablist');
        var $tabContent = $('<div>').addClass('tab-content');

        $.each(tabs, function (idx, tab) {
            var tabId = idPrefix + tab.key;
            var $a = $('<a>')
                .attr({ href: '#' + tabId, role: 'tab', 'data-toggle': 'tab' })
                .text(tab.label + ' ')
                .append($('<span>').addClass('label ' + tab.badgeClass).text(tab.count));
            var $li = $('<li>').attr('role', 'presentation').append($a);
            if (idx === 0) $li.addClass('active');
            $nav.append($li);

            var $pane = $('<div>')
                .addClass('tab-pane fade' + (idx === 0 ? ' in active' : ''))
                .attr({ id: tabId, role: 'tabpanel' });
            renderImportanceSections($pane, tab.grouped, tab.panelClass, tab.emptyMsg);
            $tabContent.append($pane);
        });

        $container.append($nav).append($tabContent);
    }

    $.feedRead = function (newopt) {
        var opt = {
            itunes: true, //podcast url
            manifest: 'podcasts/feeds.json',
            feed_target: '#files',
            feed_list: '#podcast',
            feed: '#playlist',
            channel: '#chan_info',
            item: '#item_info',
            modal: '#feedInfoModal',
            modal_body: '#feedModalBody'
        };

        $.extend(opt, newopt);

        var currentFeed = null;
        var currentItem = null;

        // common html
        var div_row = function (txt) { return '<div class="row"><div class="col-md-12 ">' + txt + '</div></div>'; };
        var rss_link = function (link, title) {
            if (!link) return title;
            return '<a href="' + link.replace(/^http/, 'podcast') + '" target="_blank" rel="noopener noreferrer">' + title + '</a>';
        };
        var rss_img = function (img) { return '<img src="' + img + '" class="img-responsive center-block" alt="Podcast artwork"/>'; };

        var refreshInspector = function (activeTab) {
            renderFeedInspector($(opt.modal_body), currentFeed, currentItem, 'modal-');
            var modalTitle = 'Feed Data';
            if (currentFeed && currentFeed.title) {
                modalTitle = currentFeed.title + (currentItem && currentItem.title ? ' — ' + currentItem.title : '');
            }
            $('#feedInfoModalLabel').html('<span class="glyphicon glyphicon-info-sign"></span> ').append(document.createTextNode(modalTitle));
            if (activeTab) {
                $(opt.modal_body + ' .feed-inspector-tabs a[href="#modal-' + activeTab + '"]').tab('show');
            }
        };

        var seenLinks = {};
        var appendFeedLink = function (targetSelector, link, title) {
            if (!link || seenLinks[link]) return;
            seenLinks[link] = true;
            var $li = $('<li>').append($('<a>').attr('href', link).text(title || link));
            $(targetSelector).append($li);
        };

        var loadLinkTags = function () {
            $('link[type="application/rss+xml"]').each(function () {
                var link = $(this).attr('href');
                var title = $(this).attr('title');
                var className = $(this).attr('class');
                var target = className ? '#' + className : opt.feed_target;
                appendFeedLink(target, link, title);
            });
        };

        if (opt.manifest) {
            $.getJSON(opt.manifest)
                .done(function (data) {
                    if (data && $.isArray(data.feeds)) {
                        $.each(data.feeds, function (_, entry) {
                            appendFeedLink(opt.feed_target, entry.url, entry.title);
                        });
                    }
                    loadLinkTags();
                })
                .fail(function () {
                    loadLinkTags();
                });
        } else {
            loadLinkTags();
        }

        refreshInspector();

        $(opt.feed_list).on('click', 'li > ul > li > a', function (e) {
            e.preventDefault();
            var $clicked = $(this);
            $(opt.feed_list + ' li > ul > li').removeClass('active');
            $clicked.parent('li').addClass('active');

            var url = $clicked.attr('href');
            var feed = feedMe(url);
            currentFeed = feed;
            currentItem = null;

            $(opt.feed).empty();
            $(opt.channel).empty();
            $(opt.item).empty();
            $('#searchEpisode').val('');

            //description
            var desc;
            if (opt.itunes && feed.itunes && typeof feed.itunes['desc'] == 'string') {
                desc = '<p>' + feed.itunes['desc'] + '</p>';
            } else if (typeof feed.description == 'string') {
                desc = '<p>' + feed.description + '</p>';
            }

            //image
            var img;
            if (opt.itunes && feed.itunes && typeof feed.itunes['img'] == 'string') {
                img = rss_img(feed.itunes['img']);
            } else if (typeof feed.image != 'undefined' && feed.image['url']) {
                img = rss_img(feed.image['url']);
            }

            var pubdate;
            if (typeof feed.pubDate == 'string') { pubdate = formatDate(feed.pubDate); }

            //title
            $(opt.channel).append(div_row(rss_link(feed.link, '<h4>' + (feed.title || 'Podcast Feed') + '</h4>')));
            if (typeof img == 'string') { $(opt.channel).append(div_row(img)); }
            if (typeof pubdate == 'string') { $(opt.channel).append(div_row('<p class="text-muted"><small>Updated: ' + pubdate + '</small></p>')); }
            if (typeof desc == 'string') { $(opt.channel).append(div_row(desc)); }

            var episodeItems = [];
            var episodeCount = 0;
            if (feed.items) {
                $.each(feed.items, function (n, i) {
                    var $itemLink = $('<a>')
                        .attr({ id: 'fItem' + n, href: '#', media: '' })
                        .data('itemIndex', n)
                        .text(i.title || 'Untitled Episode');
                    episodeItems.unshift($('<li>').append($itemLink)[0]);
                    episodeCount += 1;
                });
                $(opt.feed).append(episodeItems);
            }

            $(opt.item).append(
                $('<div>').addClass('panel panel-default').append(
                    $('<div>').addClass('panel-body').append(
                        $('<h4>').text(feed.title || 'Podcast'),
                        $('<p>').text(episodeCount + ' episodes loaded. Select an episode from the sidebar to view show notes and play media.'),
                        $('<button type="button" class="btn btn-info btn-sm open-feed-modal" data-inspector-tab="channel">')
                            .html('<span class="glyphicon glyphicon-info-sign"></span> Feed Data')
                    )
                )
            );

            refreshInspector();
            $('.nav-tabs a[href="#chan"]').tab('show');
        });

        $(opt.feed).on('click', 'a', function (e) {
            e.preventDefault();
            if (!currentFeed || !currentFeed.items) return;

            var $link = $(this);
            var idx = $link.data('itemIndex');
            var i = currentFeed.items[idx];
            if (!i) return;

            $(opt.feed + ' li').removeClass('active');
            $link.parent('li').addClass('active');

            currentItem = i;
            $(opt.item).empty();

            var $panel = $('<div>').addClass('panel panel-default');
            var $heading = $('<div>').addClass('panel-heading clearfix').append(
                $('<h3>').addClass('panel-title pull-left').css('padding-top', '4px').text(i.title || 'Untitled Episode'),
                $('<button type="button" class="btn btn-xs btn-info pull-right open-feed-modal" data-inspector-tab="episode">')
                    .html('<span class="glyphicon glyphicon-info-sign"></span> Feed Data')
            );
            var $body = $('<div>').addClass('panel-body');

            var metaParts = [];
            if (i.pubdate) metaParts.push('Release Date: ' + detectType(i.pubdate));
            if (i.itunes && i.itunes.time) metaParts.push('Duration: ' + $('<span>').text(i.itunes.time).html());
            if (metaParts.length) {
                $body.append(div_row('<p class="text-muted">' + metaParts.join(' &middot; ') + '</p>'));
            }

            var media = isAudioOrVideo(i.enclosure);
            if (media.isMedia && i.enclosure && i.enclosure['url']) {
                var tag = media.type === 'video'
                    ? '<video controls width="100%"><source src="' + i.enclosure['url'] + '" type="' + i.enclosure['type'] + '"></video>'
                    : '<audio controls><source src="' + i.enclosure['url'] + '" type="' + i.enclosure['type'] + '"></audio>';
                $body.append(div_row(tag));
            } else if (i.enclosure && i.enclosure['url']) {
                $body.append(div_row(detectType(i.enclosure['url'])));
            }
            if (i.link) {
                $body.append(div_row('<p>' + detectType(i.link) + '</p>'));
            }
            if (i.description) {
                $body.append(div_row('<div>' + i.description + '</div>'));
            }

            $panel.append($heading).append($body);
            $(opt.item).append($panel);
            refreshInspector();
        });

        $(document).on('click', '.open-feed-modal', function (e) {
            e.preventDefault();
            var requestedTab = $(this).data('inspectorTab') || 'channel';
            refreshInspector(requestedTab);
            $(opt.modal).modal('show');
        });

        $('#reorder_playlist').click(function (e) {
            e.preventDefault();
            $(opt.feed).append($(opt.feed).children('li').get().reverse());
            return true;
        });

        $('#searchPodcast').on('input keyup', function() {
            var term = $(this).val().toLowerCase();
            $(opt.feed_list + ' ul > li').filter(function() {
                $(this).toggle($(this).text().toLowerCase().indexOf(term) > -1);
            });
        });

        $('#searchEpisode').on('input keyup', function() {
            var term = $(this).val().toLowerCase();
            $(opt.feed + ' > li').filter(function() {
                $(this).toggle($(this).text().toLowerCase().indexOf(term) > -1);
            });
        });

    };
})(jQuery);