#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

SITEURL = "https://mijime.github.io/til"
SITENAME = "mijime's til"
AUTHOR = "mijime"
BIO = "today i learning"

PATH = "content"

TIMEZONE = "Asia/Tokyo"
DEFAULT_LANG = "ja"

THEME = "themes/mdl-blog"

USE_FOLDER_AS_CATEGORY = True
DEFAULT_CATEGORY = "misc"
DEFAULT_PAGINATION = 10

ARTICLE_URL = "posts/{date:%Y}/{date:%b}/{date:%d}/{slug}/"
ARTICLE_SAVE_AS = "posts/{date:%Y}/{date:%b}/{date:%d}/{slug}/index.html"

FEED_ALL_ATOM = "feeds/atom.xml"
CATEGORY_FEED_ATOM = "feeds/category-%s.atom.xml"
TRANSLATION_FEED_ATOM = "feeds/translation-%s.atom.xml"
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

DIRECT_TEMPLATES = ("index", "tags", "categories", "archives", "sitemap")
SITEMAP_SAVE_AS = "sitemap.xml"

# Uncomment following line if you want document-relative URLs when developing
RELATIVE_URLS = True
