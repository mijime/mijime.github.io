#!/usr/bin/env python

import logging
import re

from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor

H1_RE = re.compile(r"^# (.+)$")
TITLE_RE = re.compile(r"^[-=]+$")
DEV_LOGGER = logging.getLogger(__name__)

def makeExtension(**kwargs):
    return AutoMetadataExtension(**kwargs)

class AutoMetadataExtension(Extension):
    def extendMarkdown(self, md, md_globals):
        md.registerExtension(self)
        md.preprocessors.add("autometa", AutoMetadataPreprocessor(md), "_end")

class AutoMetadataPreprocessor(Preprocessor):
    def filter_h1(self, line):
        if "title" in self.markdown.Meta:
            return line

        match_h1 = H1_RE.match(line)
        if match_h1:
            DEV_LOGGER.debug("match title: %s" % match_h1.group(1))
            self.markdown.Meta["title"] = [match_h1.group(1)]
            return ""
        else:
            return line

    def run(self, lines):
        if "title" in self.markdown.Meta:
            return lines

        return map(lambda x: self.filter_h1(x), lines)
