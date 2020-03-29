---
Title: 'Create from github'
Draft: false
Date: '2020-03-29T01:23:33+09:00'
---

github から日記を書けるようにする

```javascript
d=new Date();
v=encodeURIComponent(`---
Title: ''
Draft: false
Date: '${d.toISOString()}'
---`);
fy=d.getFullYear();
fm=d.getMonth()+1+"";
fd=d.getDate()+"";
ff=(s)=>("00" +s).substr(s.length,2);
ud=`${fy}-${ff(fm)}-${ff(fd)}`;
ur="mijime/mijime.github.io";
ub="content";
document.location.href=`https://github.com/${ur}/new/${ub}?filename=content/post/${ud}/index.md&value=${v}`;
```

