---
Title: Nimble でユニットテストする
Date: 2017-10-13 13:24:00 +0900
---

## ファイルの場所

testsフォルダに .nimを配置することで始める

Warningが発生するのでSkipDirsに @["tests"] を追加する

`usage-unittest.nimble`

```nim
# Package

version       = "0.1.0"
author        = "Anonymous"
description   = "usage unit test"
license       = "MIT"

# Dependencies

requires "nim >= 0.17.2"

skipDirs = @["tests"]
```

## 始め方

`import unittest` を使ってテストする。

`nimble test` でテストを実行。

直列にテストを実行する

| Name | Desc |
| :-- | :-- |
| suite | テスト大項目 |
| test | テスト小項目 |
| setup | 各テスト前に実行すること |
| teardown | 各テスト後に実行すること |

`tests/test.nim`

```nim
import unittest

suite "hello":
   test "yes":
     require(true)
```

## Reference

- https://nim-lang.org/docs/unittest.html
