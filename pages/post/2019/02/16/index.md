---
Title: リモートワーク用の環境を構築するときはアカウントを分けるとよさそう
Draft: false
Tags: ['development']
Date: '2019-02-16T14:56:38+09:00'
---

最近リモート用の環境を私物の PC に構築した。

その時にアカウントを分けて、ブックマークとか作業環境を混ざらないようにしたが
色々やることがあったのでメモっておく

<!--more-->

## brew の設定を分ける

デフォルトだと `/usr/local` に全て入ってアカウント共有になってしまう。

そうすると更新するたびに`sudo`権限を求められてしまうため、アカウント毎に `brew` を設定した。

`brew` を別ディレクトリに置けば、勝手に`BREW_HOME`を親ディレクトリに設定してくれる。

```bash
mkdir -p "${HOME}/.brew"
curl -L https://github.com/Homebrew/brew/archive/master.tar.gz \
         | tar xz --strip-components=1 -C "${HOME}/.brew"
export PATH=${HOME}/.brew/bin:${PATH}
```

## dotfiles を共有する

会社用の Github アカウントを新規で作成したが、さすがに dotfiles は常々更新するので、
同じものを使いたい。

`git config core.sshCommand`で個別に鍵を指定した。

```bash
mkdir -p ~/.ssh/projects/github.com/
ssh-keygen -t ed25519 -N "" -C "" -f ~/.ssh/projects/github.com/${USER}_id_ed25519
git config core.sshCommand "ssh -i ~/.ssh/projects/github.com/${USER}_id_ed25519"
```

## PS1 に icon を設定する

`su` で雑にアカウントを往復することがあるんだけども、名前は違えど色味がほぼほぼ同じなので
'あれ、どっちで作業しているんだっけ…'的なことが時々起こる

名前からランダムに絵文字を設定してみた。

```bash
icon=$(echo -ne $((127744 + 16#$(whoami|md5sum|cut -c-8)%512))|awk '{printf("%3c",$1)}')
```

これを適当に PS1 に入れておけば、間違えにくくなる

## セキュアなデータを GoogleDrive にいれて Git で管理する

だいぶ Bad Practice な気がするが、パスワードとか ssh-key とかは全部 Git のリポジトリにして管理している。

それを一旦 GoogleDrive とかにぶち込んで別端末に持ってきた。

さすがに内容が内容なので、`git encrypt` コマンドを作って暗号化してみた

https://github.com/kojimat/git-encrypt
