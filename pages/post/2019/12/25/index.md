---
Title: 'macOSからChromeOSに移行したけど、いろいろ辛かった'
Draft: false
Description: ''
Tags: ['development']
CreatedAt: '2019-12-25T01:23:33+09:00'
---

初めての ChromeOS だったのでいろいろハマった

<!--more-->

## 標準ターミナルで日本語打つとぶっ壊れる

そもそも標準ターミナルで日本語の切り替え方がわからずにハマった。

- https://chromium.googlesource.com/apps/libapps/+/master/hterm/doc/KeyboardBindings.md

Secure Shell app のほうの keybidings で`Ctrl-Space`を送信できれば解決できた。

fcitx で解決、みたいな記事をよくみかけたけど、自分は解決できなかった。

下記の設定を keybindings にいれた。

```
{
    "keybindings": {
        "Ctrl-Space": "DEFAULT"
    }
}
```

ただ、実際に日本語で送信してみると、補完入力とターミナルのバッファが
ごっちゃになっているように見える。
補完の内容がバッファに残ったままだったり、tmux の window-size がおかしくなったりと辛い。

vim 内であれば Ctrl-L でリセットできる。日本語入力中は辛いが。

## Alacritty で絵文字表示されない

上の問題があって、Terminal を Alacritty + fcitx を採用したけど、ここでも問題があった。

デフォルトだと WAYLAND?の設定が良くないらしく、fcitx が立ち上がらなかったり、
全画面起動ができなかった。

WAYLAND を空白で起動すれば解決した。
毎回ターミナルから alacritty を立ち上げるのは嫌なので alacritty.desktop を用意した。

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

fcitx 自体は立ち上がるようになったけど、今度は絵文字がうまく表示されず。

Alacritty 自体に同様の Issue が結構上がっていて、MacOS の絵文字はうまくいくんだけど。。みたいな内容で終わっていたように見える。

カラフルな絵文字は諦めたが、さすがに空白だと辛いので `twemoji-color-font` を入れて
starship に設定していた絵文字は全部表示できるようにした。

## 音楽が再生できない

mpv を入れたけど、今度はターミナルから音楽がならない。
コンテナを`--enable-audio-capture`して起動しないといけないらしい。

- https://chromium.googlesource.com/chromiumos/docs/+/master/containers_and_vms.md#is-audio-capture-e_g_microphone_supported

crosh 上で

```
vmc stop termina
vmc start termina --enable-audio-capture
```

すれば解決した。

その後、Alacritty が透過できない+画面最大化できない、という症状になったけど
これは Logout->Login で治った。

思ったより、音楽を鳴らすのに CPU を使っているけど。。pluse なんぞや。。
