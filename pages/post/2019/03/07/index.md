---
Title: 'circleci local で死ぬパターン'
Draft: false
Description: ''
Tags: ['development']
CreatedAt: '2019-03-07T00:38:33+09:00'
---

circleci は通るけど、`circleci local` で死ぬパターンがある。

<!--more-->

- ファイル数が `xargs` の上限を超える

  ローカルのファイルを `git ls-files | xargs tar cfz - | tar xfz -C`
  みたいな感じで所定のリポジトリに移動している。
  なので `xargs` の引数を超過すると死ぬ

- Git コマンドを使用する

  `git ls-files` でファイルだけを持っているので、ビルドタスクで
  `git submodule` や `git commit && git push` があると死ぬ

素直に docker とかで別途テストできる環境を用意しておくのが吉。
