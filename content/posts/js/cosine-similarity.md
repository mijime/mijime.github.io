+++
date = "2016-05-28T21:12:36+09:00"

draft = false

title = "関連記事を探す"

tags = ["tech", "js"]
+++

他のブログを参考にすると関連記事というのを最後に表示しているらしい。

まだ記事の数は少ないけど、ある程度近い記事を探すことができるようにする。

### 類似度の取得

"MeCab" + "類似" でググったら、コサイン類似度なるものがあるとのこと。

- [コサイン類似度](http://www.cse.kyoto-su.ac.jp/~g0846020/keywords/cosinSimilarity.html)
- [TF-IDF Cos類似度推定法](http://qiita.com/nmbakfm/items/6bb91b89571dd68fcea6)

このブログはjs + hugoで書いているので、
[kuromoji](https://www.npmjs.com/package/kuromoji) のラッパー
[kuromojin](https://www.npmjs.com/package/kuromojin) を使って形態素解析する。

分解した単語と出現回数を記録する。

{{<gist-it repo="mijime/mijime.github.io" branch="content" path="source/js/similarity/index.js?slice=54:71">}}

出現回数を数えるのは名詞で3文字以上の単語のみ。

{{<gist-it repo="mijime/mijime.github.io" branch="content" path="source/js/similarity/index.js?slice=32:39">}}

あとは計算しておしまい。

{{<gist-it repo="mijime/mijime.github.io" branch="content" path="source/js/similarity/index.js?slice=71:96">}}

### 実行結果

うーん、全然関係ない単語でしか一致しない、、、その通りではあるんだけど

```
> babel-node source/js/similarity "content/posts/js/cosine-similarity.md" "content"
>
> 0       content/posts/2016-05-26/border-implement.md
> 0.42074115723005184     content/posts/2016-05-23/github-cli.md  com, https, github, mijime
> 0       content/posts/2016-05-26/ci-is-difficult.md
> 0       content/posts/blog/blog-of-policy.md
> 0       content/posts/blog/first-blogged.md
> 0.007841750524290146    content/posts/hugo/hugo-pagination.md   html
> 0.036063527762575875    content/posts/hugo/hugo-deploy.md       content
> 1       content/posts/js/cosine-similarity.md   100, 89571, MeCab, コサイン, http
> 0.017920111019015677    content/slides/2016-05-27/my-first-slide.md     html
```

