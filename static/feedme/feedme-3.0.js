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
    var title = function (c) { return c.find('title').first().text(); };
    // RSS feed link for main site for channel and url for feed item
    var link = function (c) { return c.find('link').first().text(); };
    // RSS description for both channel and item
    var description = function (c) { return c.find('description').first().text(); };
    // RSS category, this just selects everything with a category, even in items
    // i'll need to figure out something for later to not select the categores in items
    var category = function (c) { return c.find('category').text(); };
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
        var i = {};
        i.author = i_author(c);
        i.block = i_block(c);
        i.category = c.find('*').ns_filter(opts.itunes, 'category').attr('text');
        i.img = i_image(c);
        i.explicit = i_explicit(c);
        i.complete = c.find('*').ns_filter(opts.itunes, 'complete').first().text();
        i.keywords = i_keywords(c);
        i.new_feed_url = c.find('*').ns_filter(opts.itunes, 'new-feed-url').first().text();
        i.owner = c.find('*').ns_filter(opts.itunes, 'owner').first().text();
        i.subtitle = i_subtitle(c);
        i.desc = i_summary(c);
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

function detectType(str) {
    if (typeof str !== 'string') return str;

    // Test for URL
    const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    if (urlPattern.test(str)) return '<a href="' + str + '" target="_blank">' + str + '</a>';

    // Test for email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(str)) return '<a href="mailto:' + str + '">' + str + '</a>';

    // Test for date (RFC 2822 or ISO)
    const date = new Date(str);
    if (!isNaN(date.getTime())) return formatDate(str);

    return str;
}

//feedRead
/**
 * The goal of this plugin is to demonstrate how feedme works as an RSS 2.0 feed reader for your webpage
 * This is only aimed at reading feeds, it won't act as a podcast media player ... yet.  this is my research plugin,
 * I might tryout the HTML 5 Audio/Video tags, but there will be not guarantees of the content playing since not all
 * feeds contain HTML 5 compatible content.
 */
(function ($) {
    $.feedRead = function (newopt) {
        var opt = {
            itunes: true, //podcast url
            manifest: 'podcasts/feeds.json',
            feed_target: '#files',
            feed_list: '#RSS_feeds',
            feed: '#feed',
            channel: '#chan_info',
            channel_ex: '#chan_extra',
            item: '#item_info',
            item_ex: '#item_extra'
        };

        $.extend(opt, newopt);

        // common html
        var div_row = function (txt) { return '<div class="row"><div class="col-md-12 ">' + txt + '</div></div>'; };
        var div_info = function (key,txt) {
            return '<div class="row"><div class="col-md-3 " style="background-color:black; color: white;">' + key + '</div><div class="col-md-9 ">' + txt + '</div></div>';
        };
        var rss_link = function (link, title) {
            if (!link) return title;
            return '<a href="' + link.replace(/^http/, 'podcast') + '" target="_blank">' + title + '</a>';
        };
        var rss_img = function (img) { return '<img src="' + img + '" style="width:380px; height: auto;"/>'; };
        var chan_info_all = function (chan) {
            $.each(chan, function (k, v) {
                if (k != 'items') {
                    if (typeof v != 'object') {
                        $(opt.channel_ex).append(div_info(k, detectType(v) ));
                    } else if (typeof v == 'object') {
                        $(opt.channel_ex).append(div_row('<strong>' + k + '</strong>'));
                        $.each(v, function (k2, v2) {  $(opt.channel_ex).append(div_info(k2, detectType(v2) )); });    
                    }
                }
            });
        };

        var item_info_all = function (item) {
            $.each(item, function (k, v) {
                if (typeof v != 'object') {
                    $(opt.item_ex).append(div_info(k, detectType(v) ));
                } else if (typeof v == 'object') {
                    $(opt.item_ex).append(div_row('<strong>' + k + '</strong>'));
                    $.each(v, function (k2, v2) { $(opt.item_ex).append(div_info(k2, detectType(v2) )); });    
                }            
            });
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

        $(opt.feed_list).on('click', 'li > ul > li > a', function (e) {
            e.preventDefault();
            var url = $(this).attr('href');
            var feed = feedMe(url);

            $(opt.feed).empty();
            $(opt.channel).empty();
            $(opt.channel_ex).empty();
            $(opt.item).empty();
            $(opt.item_ex).empty();
            chan_info_all(feed);
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
            if (typeof desc == 'string') { $(opt.channel).append(div_row(desc)); }
            if (typeof img == 'string') { $(opt.channel).append(div_row(img)); }
            if (typeof pubdate == 'string') { $(opt.channel).append(div_row(pubdate)); }
            $('.nav-tabs a[href="#chan"]').tab('show');
            if (feed.items) {
                $.each(feed.items, function (n, i) {
                    var $itemLink = $('<a>').attr({ id: 'fItem' + n, href: '#', media: '' }).text(i.title || 'Untitled Episode');
                    $(opt.feed).prepend($('<li>').append($itemLink));

                    $itemLink.click(function (e) {
                        e.preventDefault();
                        $(opt.item).empty();
                        $(opt.item_ex).empty();
                        item_info_all(i);
                        $(opt.item).append(div_row('<h3>' + (i.title || 'Untitled Episode') + '</h3>'));
                        if (i.pubdate) {
                            $(opt.item).append(div_row('Release Date: ' + detectType(i.pubdate)));
                        }
                        var media = isAudioOrVideo(i.enclosure);
                        if (media.isMedia && i.enclosure && i.enclosure['url']) {
                            var tag = media.type === 'video'
                                ? '<video controls width="100%"><source src="' + i.enclosure['url'] + '" type="' + i.enclosure['type'] + '"></video>'
                                : '<audio controls><source src="' + i.enclosure['url'] + '" type="' + i.enclosure['type'] + '"></audio>';
                            $(opt.item).append(div_row(tag));
                        } else if (i.enclosure && i.enclosure['url']) {
                            $(opt.item).append(div_row(detectType(i.enclosure['url'])));
                        }
                        if (i.link) {
                            $(opt.item).append(div_row(detectType(i.link)));
                        }
                        if (i.description) {
                            $(opt.item).append(div_row('<p>' + i.description + '</p>'));
                        }
                    });
                });
            }
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

    };
})(jQuery);