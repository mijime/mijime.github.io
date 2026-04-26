---
Title: Nimble でユニットテストする
CreatedAt: '2017-10-13T13:24:00+09:00'
IsDraft: false
---

Nim で `nimble test` によるユニットテストを始める手順。

## プロジェクト設定

`tests/` フォルダに `.nim` を置く。そのままだと Warning が出るため `.nimble` ファイルで `skipDirs` を設定する。

```nim
# usage-unittest.nimble
version       = "0.1.0"
author        = "Anonymous"
description   = "usage unit test"
license       = "MIT"

requires "nim >= 0.17.2"

skipDirs = @["tests"]
```

## テストの書き方

`import unittest` を使い、`nimble test` で実行する。

| キーワード | 用途 |
| :--- | :--- |
| `suite` | テストグループ |
| `test` | テストケース |
| `setup` | 各テスト前の処理 |
| `teardown` | 各テスト後の処理 |

```nim
# tests/test.nim
import unittest

suite "hello":
  setup:
    discard
  test "yes":
    require(true)
```

## 参考

- https://nim-lang.org/docs/unittest.html
