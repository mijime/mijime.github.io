---
Description: ''
Tags: ['Development', 'JavaScript']
CreatedAt: '2017-04-20T07:48:28+09:00'
Title: 'JSの正規表現の再帰にはまった'
Draft: false
---

のでメモる

再帰的に正規表現で抜き出して詰めたい場合があるとする。

<!--more-->

```js
function regexpr(re, text, acc = []) {
  const res = re.exec(text)
  return res
    ? regexpr(
        re,
        text.substr(res.index + res[0].length, text.length),
        acc.concat(res)
      )
    : acc
}
```

このとき chrome さんだと、 g オプションつけた時で結果が異なる。

```js
regexpr(/hello|world/, 'hello world') // => ["hello", "world"]
regexpr(/hello|world/g, 'hello world') // => ["hello"]
regexpr(/hello|world/, 'hello world hello world') // => ["hello", "world", "hello", "world"]
regexpr(/hello|world/g, 'hello world hello world') // => ["hello", "hello"]
```

index や結果は変わらないのに、なんでだろう
