# Nimble でユニットテストする

## ファイルの場所

tests フォルダに .nim を配置することで始める

Warning が発生するので SkipDirs に @["tests"] を追加する

## 始め方

`import unittest` を使ってテストする.

`nimble test` でテストを実行.

直列にテストを実行する

| Name | Desc |
| :-- | :-- |
| suite | テスト大項目 |
| test | テスト小項目 |
| setup | 各テスト前に実行すること |
| teardown | 各テスト後に実行すること |

## Reference

- https://nim-lang.org/docs/unittest.html
