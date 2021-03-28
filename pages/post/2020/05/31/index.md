---
Title: 'vim でカーソル直下のgit hash commitの内容を見る'
Draft: false
Tags: []
CreatedAt: '2020-05-31T12:39:09.887Z'
---

`git rebase -i` でいじっているときにコミットメッセージが Update だけだと、あれ、なんの修正だろうってなる

そのときにカーソル直下の hash から`git show`したい

<!--more-->

`expand("<cword>")` で取れる。

`:echo system("git show ". expand("<cword>"))`

本当はバッファに開いて diff の syntax を当てたい。。。

---

`Ctrl-K` で取れる
