---
CreatedAt: "2016-05-25T14:05:50+09:00"
IsDraft: false
Title: "hugo pagination"
Tags: ["hugo"]
---

Hugo では `.Paginator` を使うことでページネーションを簡単に実装できる。

<!--more-->

## 記事の一覧表示

第1引数でページあたりの件数を指定する。

```html
{{- range (.Paginator 10).Pages }}
<div>{{ .Content }}</div>
{{- end }}
```

## 前後ページへのナビゲーション

```html
{{- if or (.Paginator.HasPrev) (.Paginator.HasNext) }}
<nav role="pagination">
  {{- if .Paginator.HasPrev }}
  <a href="{{ .Paginator.Prev.URL }}">Prev</a>
  {{- end }}
  <span>Page {{ .Paginator.PageNumber }} of {{ .Paginator.TotalPages }}</span>
  {{- if .Paginator.HasNext }}
  <a href="{{ .Paginator.Next.URL }}">Next</a>
  {{- end }}
</nav>
{{end}}
```
