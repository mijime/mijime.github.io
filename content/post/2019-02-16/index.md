---
Title: リモートワーク用の環境を構築するときはアカウントを分けるとよさそう
Draft: false
Categories: ["development"]
Date: "2019-02-16T14:56:38+09:00"
---

最近リモート用の環境を私物のPCに構築した。

その時にアカウントを分けて、ブックマークとか作業環境を混ざらないようにしたが
色々やることがあったのでメモっておく

<!--more-->

## brewの設定を分ける

デフォルトだと `/usr/local` に全て入ってアカウント共有になってしまう。

そうすると更新するたびに`sudo`権限を求められてしまうため、アカウント毎に `brew` を設定した。

`brew` を別ディレクトリに置けば、勝手に`BREW_HOME`を親ディレクトリに設定してくれる。

```bash
mkdir -p "${HOME}/.brew"
curl -L https://github.com/Homebrew/brew/archive/master.tar.gz \
         | tar xz --strip-components=1 -C "${HOME}/.brew"
export PATH=${HOME}/.brew/bin:${PATH}
```

## dotfilesを共有する

会社用のGithubアカウントを新規で作成したが、さすがにdotfilesは常々更新するので、
同じものを使いたい。

`git config core.sshCommand`で個別に鍵を指定した。

```bash
mkdir -p ~/.ssh/projects/github.com/
ssh-keygen -t ed25519 -N "" -C "" -f ~/.ssh/projects/github.com/${USER}_id_ed25519
git config core.sshCommand "ssh -i ~/.ssh/projects/github.com/${USER}_id_ed25519"
```

## PS1にiconを設定する

`su` で雑にアカウントを往復することがあるんだけども、名前は違えど色味がほぼほぼ同じなので
'あれ、どっちで作業しているんだっけ…'的なことが時々起こる

名前からランダムに絵文字を設定してみた。

```bash
icon=$(echo -ne $((127744 + 16#$(whoami|md5sum|cut -c-8)%512))|awk '{printf("%3c",$1)}')
```

これを適当にPS1に入れておけば、間違えにくくなる

## セキュアなデータをGoogleDriveにいれてGitで管理する

だいぶBad Practiceな気がするが、パスワードとかssh-keyとかは全部Gitのリポジトリにして管理している。

それを一旦GoogleDriveとかにぶち込んで別端末に持ってきた。

さすがに内容が内容なので、`git encrypt` コマンドを作って暗号化してみた

https://github.com/kojimat/git-encrypt

