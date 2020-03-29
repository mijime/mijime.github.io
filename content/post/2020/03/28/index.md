---
Title: "Create page from github"
Draft: false
Date: "2020-03-29T01:23:33+09:00"
---

githubから日記を書けるようにする

<!--more-->

filename,valueを直接渡せばテンプレート化できそう。

```javascript
d=new Date();
fy=d.getFullYear();
fm=d.getMonth()+1+"";
fd=d.getDate()+"";
ff=(s)=>("00" +s).substr(s.length,2);
b="mijime/mijime.github.io/new/content";
f=`content/post/${fy}/${ff(fm)}/${ff(fd)}/index.md`;
v=encodeURIComponent(`---
Title: ""
Draft: false
Date: "${d.toISOString()}"
---

<!--more-->`);
document.location.href=`https://github.com/${b}?filename=${f}&value=${v}`;
```
