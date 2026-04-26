---
Title: 'codeをbookmarkletに変換する'
IsDraft: false
CreatedAt: '2020-03-29T07:58:48.611Z'
---

ページ上の `<code>` 要素をクリックすると、そのコードをブックマークレット用 URL に変換したリンクを生成するスニペット。

<!--more-->

```javascript
Array.from(document.querySelectorAll('code')).map(
  c =>
    (c.onclick = () => {
      a = document.createElement('a')
      a.innerText = new Date()
      a.href = 'javascript:' + encodeURIComponent(c.innerText)
      c.parentElement.appendChild(a)
    })
)
```

このコード自体をブックマークレットにしておき、ブログ記事などのページで実行する。code をクリックすると `javascript:` スキームのリンクが追加されるので、そのリンクをブックマークバーに保存すればブックマークレットとして使える。
