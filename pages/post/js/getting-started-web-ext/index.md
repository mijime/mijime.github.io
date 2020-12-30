---
Title: web-ext を使って WebExtension を始める
Date: '2017-10-14T01:38:45+09:00'
Draft: False
---

web extension 用のビルドツール `web-ext` があるらしい

[web-ext](https://github.com/mozilla/web-ext)

Signed, Debug がメインのツール。
ビルドは主要ファイルを zip に入れるだけだった

## Install

Yarn だと上手くいかない。..? ので `npm` でインストールする

```bash
npm install --global web-ext
```

## Usage

デバッグで確認する

```bash
web-ext run --firefox=${FIREFOX_BIN}
```

ビルドする

```bash
web-ext build
web-ext sign --api-key ${API_KEY} --api-secret ${API_SECRET}
```

## Reference

- https://github.com/mozilla/web-ext
- https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext
