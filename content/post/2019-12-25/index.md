---
Title: 'macOSからChromeOSに移行したけど、いろいろ辛かった'
Draft: false
Description: ''
Tags: ['development']
Date: '2019-12-25T01:23:33+09:00'
---

初めてのChromeOSだったのでいろいろハマった

<!--more-->

## 標準ターミナルで日本語打つとぶっ壊れる

そもそも標準ターミナルで日本語の切り替え方がわからずにハマった。

- https://chromium.googlesource.com/apps/libapps/+/master/hterm/doc/KeyboardBindings.md

Secure Shell appのほうのkeybidingsで`Ctrl-Space`を送信できれば解決できた。
fcitxで解決、みたいな記事をよくみかけたけど、自分は解決できなかった。

下記の設定をkeybindingsにいれた。

```
{
    "keybindings": {
        "Ctrl-Space": "DEFAULT"
    }
}
```

ただ、実際に日本語で送信してみると、補完入力とターミナルのバッファが
ごっちゃになっているように見える。
補完の内容がバッファに残ったままだったり、tmuxのwindow-sizeがおかしくなったりと辛い。

vim内であればCtrl-Lでリセットできる。日本語入力中は辛いが。

## Alacrittyで絵文字表示されない

上の問題があって、TerminalをAlacritty + fcitxを採用したけど、ここでも問題があった。

デフォルトだとWAYLAND?の設定が良くないらしく、fcitxが立ち上がらなかったり、
全画面起動ができなかった。

WAYLANDを空白で起動すれば解決した。
毎回ターミナルからalacrittyを立ち上げるのは嫌なのでalacritty.desktopを用意した。

```
[Desktop Entry]
Type=Application
TryExec=alacritty
Exec=env WAYLAND_DISPLAY= alacritty
Icon=Alacritty
Terminal=false
Categories=System;TerminalEmulator;

Name=Alacritty
GenericName=Terminal
Comment=A cross-platform, GPU enhanced terminal emulator
StartupWMClass=Alacritty
Actions=New;

[Desktop Action New]
Name=New Terminal
Exec=env WAYLAND_DISPLAY= alacritty
```

fcitx自体は立ち上がるようになったけど、今度は絵文字がうまく表示されず。

Alacritty自体に同様のIssueが結構上がっていて、MacOSの絵文字はうまくいくんだけど。。みたいな内容で終わっていたように見える。

カラフルな絵文字は諦めたが、さすがに空白だと辛いので `twemoji-color-font` を入れて
starshipに設定していた絵文字は全部表示できるようにした。

## 音楽が再生できない

mpvを入れたけど、今度はターミナルから音楽がならない。
コンテナを`--enable-audio-capture`して起動しないといけないらしい。

- https://chromium.googlesource.com/chromiumos/docs/+/master/containers_and_vms.md#is-audio-capture-e_g_microphone_supported

crosh上で

```
vmc stop termina
vmc start termina --enable-audio-capture
```

すれば解決した。

その後、Alacrittyが透過できない+画面最大化できない、という症状になったけど
これはLogout->Loginで治った。

思ったより、音楽を鳴らすのにCPUを使っているけど。。pluseなんぞや。。
