---
Title: web-ext を使って WebExtension を始める
CreatedAt: '2017-10-14T01:38:45+09:00'
IsDraft: False
---

WebExtension 開発用のビルドツール。署名・デバッグ・ビルドをコマンドラインで実行できる。ビルドは主要ファイルを zip にまとめるだけ。

[web-ext](https://github.com/mozilla/web-ext)

## インストール

Yarn では動作しない場合があるため `npm` を使う:

```bash
npm install --global web-ext
```

## 使い方

デバッグ実行:

```bash
web-ext run --firefox=${FIREFOX_BIN}
```

ビルドと署名:

```bash
web-ext build
web-ext sign --api-key ${API_KEY} --api-secret ${API_SECRET}
```

## 参考

- https://github.com/mozilla/web-ext
- https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext
