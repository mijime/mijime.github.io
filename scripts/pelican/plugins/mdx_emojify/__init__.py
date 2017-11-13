#!/usr/bin/env python

import emoji
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor

def makeExtension(**kwargs):
    return EmojifyExtension(**kwargs)

class EmojifyExtension(Extension):
    def extendMarkdown(self, md, md_globals):
        md.registerExtension(self)
        md.preprocessors.add("emojify", EmojifyPreprocessor(md), "_end")

class EmojifyPreprocessor(Preprocessor):
    def run(self, lines):
        return map(lambda x: emoji.emojize(x, use_aliases=True), lines)
