---
Title: Nim の main 関数の処理方法について
CreatedAt: '2017-10-12T13:53:00+09:00'
IsDraft: False
---

Nim でコマンドライン引数を扱うための標準的な関数・変数のまとめ。

<!--more-->

## コマンドライン引数関連

| 用途 | 名前 | 型 | モジュール |
| :--- | :--- | :--- | :--- |
| メイン関数として呼ばれているか | `isMainModule` | bool | system |
| メイン関数の戻り値 | `programResult` | int | system |
| 引数の数 | `paramCount()` | int | os |
| 引数の値 | `commandLineParams()` | seq[TaintedString] | os |

## 使用例

```nim
import os

when isMainModule:
  for i, arg in commandLineParams():
    echo i, ": ", arg
  programResult = 0
```

## 参考

- https://nim-lang.org/docs/system.html
- https://nim-lang.org/docs/os.html
