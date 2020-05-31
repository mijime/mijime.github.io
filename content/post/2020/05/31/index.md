---
Title: 'vim でカーソル直下のgit hash commitの内容を見る'
Draft: false
Tags: []
Date: '2020-05-31T12:39:09.887Z'
---

`git rebase -i` でいじっているときにコミットメッセージがUpdateだけだと、あれ、なんの修正だろうってなる

そのときにカーソル直下のhashから`git show`したい

<!--more-->

`expand("<cword>")` で取れる。

`:echo system("git show ". expand("<cword>")`

本当はバッファに開いてdiffのsyntaxを当てたい。。。
