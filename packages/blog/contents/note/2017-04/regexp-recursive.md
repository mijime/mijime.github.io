---
Description: ""
Tags: ["Development", "JavaScript"]
CreatedAt: "2017-04-20T07:48:28+09:00"
Title: "JSの正規表現の再帰にはまった"
IsDraft: false
---

JavaScript で正規表現を使って文字列から再帰的にマッチを取り出す際に、`g` フラグの挙動でハマった。

<!--more-->

```js
function regexpr(re, text, acc = []) {
  const res = re.exec(text);
  return res
    ? regexpr(re, text.substr(res.index + res[0].length, text.length), acc.concat(res))
    : acc;
}
```

Chrome では `g` フラグの有無で結果が変わる。

```js
regexpr(/hello|world/, "hello world"); // => ["hello", "world"]
regexpr(/hello|world/g, "hello world"); // => ["hello"]
regexpr(/hello|world/, "hello world hello world"); // => ["hello", "world", "hello", "world"]
regexpr(/hello|world/g, "hello world hello world"); // => ["hello", "hello"]
```

原因は `g` フラグ付きの RegExp オブジェクトが `lastIndex` を内部に持つため。`re.exec()` を呼ぶたびに `lastIndex` が更新されるが、`text.substr()` で文字列を切り詰めても `lastIndex` はリセットされない。そのため次のマッチ位置がずれて、2番目以降のマッチを読み飛ばしてしまう。

再帰でマッチを取り出す場合は `g` フラグを使わないか、毎回 `re.lastIndex = 0` でリセットする必要がある。
