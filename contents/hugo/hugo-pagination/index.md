---
CreatedAt: '2016-05-25T14:05:50+09:00'
Draft: false
Title: 'hugo pagination'
Tags: ['hugo']
---

<!--more-->

.Paginator を使えば自動でやってくれるみたい

```html
{{- range (.Paginator 10).Pages }}
<div>{{ .Content }}</div>
{{- end }}
```

次頁、前頁へのリンクも .Paginator を使う

```html
{{- if or (.Paginator.HasPrev) (.Paginator.HasNext) }}
<nav role="pagination">
  {{- if .Paginator.HasPrev }}
  <a href="{{ .Paginator.Prev.URL }}">Prev</a>
  {{- end }}
  <span class=""
    >Page {{ .Paginator.PageNumber }} of {{ .Paginator.TotalPages }}</span
  >
  {{- if .Paginator.HasNext }}
  <a href="{{ .Paginator.Next.URL }}">Next</a>
  {{- end }}
</nav>
{{end}}
```
