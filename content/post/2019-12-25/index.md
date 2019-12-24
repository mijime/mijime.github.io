---
Title: "macOSからChromeOSに移行してみた"
Draft: true
Description: ""
Tags: ["development"]
Date: "2019-12-25T01:23:33+09:00"
---

初めてのChromeOSだったのでいろいろハマった

<!--more-->

## やったこと

### debianのアップデート

初期がstretchだったので、busterにアップデートした


下記の3ファイルの `stretch` を `buster` に書き換えた

```
/etc/apt/sources.list
/etc/apt/sources.list.d/cros.list
/etc/apt/sources.list.d/cros-gpu.list
```

`/etc/apt/sources.list.d/cros-gpu.list` に関しては適当にそれっぽいのにした

```
deb https://apt.llvm.org/buster/ llvm-toolchain-buster main
```

あとはaptを使ってアップデートする

```sh
sudo apt update
sudo apt dist-upgrade
sudo apt autoclean
```

### fcitxの設定

### alacrittyの導入

### linuxbrewの導入

### dockerの導入

## 困ってること

### 標準ターミナルで日本語打つとぶっ壊れる

### Alacrittyで絵文字表示されない
