---
Title: "codeをbookmarkletに変換する"
Draft: false
Date: "2020-03-29T07:58:48.611Z"
---

コードをurlencodeして、そのhrefをブックマークすればよさそう

<!--more-->

```javascript
Array.from(document.querySelectorAll('code'))
.map(c=>c.onclick=()=>{
a=document.createElement('a');
a.innerText=new Date();
a.href="javascript:"+encodeURIComponent(c.innerText);
c.parentElement.appendChild(a);
});
```
