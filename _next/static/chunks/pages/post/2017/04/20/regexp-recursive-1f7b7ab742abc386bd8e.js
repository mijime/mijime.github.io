_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[14],{"+l+v":function(e,a,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/2017/04/20/regexp-recursive",function(){return t("CfkB")}])},CfkB:function(e,a,t){"use strict";t.r(a),t.d(a,"frontMatter",(function(){return b})),t.d(a,"default",(function(){return m}));var c=t("wx14"),n=t("Ff2n"),s=t("q1tI"),l=t.n(s),r=t("7ljp"),o=t("TJE1"),b=(l.a.createElement,{Description:"",Tags:["Development","JavaScript"],Date:"2017-04-20T07:48:28+09:00",Title:"JS\u306e\u6b63\u898f\u8868\u73fe\u306e\u518d\u5e30\u306b\u306f\u307e\u3063\u305f",Draft:!1,__resourcePath:"post/2017/04/20/regexp-recursive/index.md",__scans:{},layout:"index"}),p={frontMatter:b},j=o.a;function m(e){var a=e.components,t=Object(n.a)(e,["components"]);return Object(r.b)(j,Object(c.a)({},p,t,{components:a,mdxType:"MDXLayout"}),Object(r.b)("p",null,"\u306e\u3067\u30e1\u30e2\u308b"),Object(r.b)("p",null,"\u518d\u5e30\u7684\u306b\u6b63\u898f\u8868\u73fe\u3067\u629c\u304d\u51fa\u3057\u3066\u8a70\u3081\u305f\u3044\u5834\u5408\u304c\u3042\u308b\u3068\u3059\u308b\u3002"),Object(r.b)("pre",null,Object(r.b)("code",Object(c.a)({parentName:"pre"},{className:"hljs language-js"}),Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-function"}),Object(r.b)("span",Object(c.a)({parentName:"span"},{className:"hljs-keyword"}),"function")," ",Object(r.b)("span",Object(c.a)({parentName:"span"},{className:"hljs-title"}),"regexpr"),"(",Object(r.b)("span",Object(c.a)({parentName:"span"},{className:"hljs-params"}),"re, text, acc = []"),") "),"{\n  ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-keyword"}),"const")," res = re.exec(text)\n  ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-keyword"}),"return")," res\n    ? regexpr(\n        re,\n        text.substr(res.index + res[",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-number"}),"0"),"].length, text.length),\n        acc.concat(res)\n      )\n    : acc\n}")),Object(r.b)("p",null,"\u3053\u306e\u3068\u304d chrome \u3055\u3093\u3060\u3068\u3001 g \u30aa\u30d7\u30b7\u30e7\u30f3\u3064\u3051\u305f\u6642\u3067\u7d50\u679c\u304c\u7570\u306a\u308b\u3002"),Object(r.b)("pre",null,Object(r.b)("code",Object(c.a)({parentName:"pre"},{className:"hljs language-js"}),"regexpr(",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/"),", ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),"'hello world'"),") ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-comment"}),'// => ["hello", "world"]'),"\nregexpr(",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/g"),", ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),"'hello world'"),") ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-comment"}),'// => ["hello"]'),"\nregexpr(",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/"),", ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),"'hello world hello world'"),") ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-comment"}),'// => ["hello", "world", "hello", "world"]'),"\nregexpr(",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/g"),", ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),"'hello world hello world'"),") ",Object(r.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-comment"}),'// => ["hello", "hello"]'))),Object(r.b)("p",null,"index \u3084\u7d50\u679c\u306f\u5909\u308f\u3089\u306a\u3044\u306e\u306b\u3001\u306a\u3093\u3067\u3060\u308d\u3046"))}m.isMDXComponent=!0}},[["+l+v",0,2,1,3]]]);