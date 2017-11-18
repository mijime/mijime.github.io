---
Title: Nim の main 関数の処理方法について
Date: "2017-10-12T13:53:00+09:00"
Draft: False
---

## 各パラメータ概要

| 用途                           | 名                    | 型                 | module |
| :---                           | :---                  | :---               | :---   |
| メイン関数として呼ばれているか | `isMainModule`        | bool               | system |
| メイン関数の戻り値             | `programResult`       | int                | system |
| 引数の数                       | `paramCount()`        | int                | os     |
| 引数の値                       | `commandLineParams()` | seq[TaintedString] | os     |

## Reference

- https://nim-lang.org/docs/system.html
- https://nim-lang.org/docs/os.html
- https://qiita.com/6in/items/c735cb2ffbe79f3f9d94
