#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

SITEURL = "https://mijime.github.io/til"
SITENAME = "Today I Learned"
AUTHOR = "mijime"

PATH = "content"

TIMEZONE = "Asia/Tokyo"
DEFAULT_LANG = "ja"

THEME = "themes/mdl-blog"
SUMMARY_MAX_LENGTH = 15

USE_FOLDER_AS_CATEGORY = True
DEFAULT_CATEGORY = "misc"
DEFAULT_PAGINATION = 3
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M"

ARTICLE_URL = "posts/{date:%Y}/{date:%b}/{date:%d}/{slug}/"
ARTICLE_SAVE_AS = "posts/{date:%Y}/{date:%b}/{date:%d}/{slug}/index.html"

FEED_ALL_ATOM = "feeds/atom.xml"
CATEGORY_FEED_ATOM = "feeds/category-%s.atom.xml"
TRANSLATION_FEED_ATOM = "feeds/translation-%s.atom.xml"
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

SLUGIFY_SOURCE = "basename"

PLUGIN_PATHS = ["pelican-plugins"]
PLUGINS = ["sitemap"]
SITEMAP = {"format": "xml"}

MARKDOWN = {
        "extension_configs": {
            "markdown.extensions.nl2br": {},
            "markdown.extensions.codehilite": {"css_class": "highlight"},
            "markdown.extensions.extra": {},
            "markdown.extensions.meta": {},
            "markdown.extensions.toc": {},
        },
        "output_format": "html5",
    }

# Uncomment following line if you want document-relative URLs when developing
RELATIVE_URLS = True

# Custom variables

BIO = "Today I Learned"
MDL_COLOR = "brown-orange"
GOOGLE_TAG_MANAGER = "GTM-NXFWK5L"
