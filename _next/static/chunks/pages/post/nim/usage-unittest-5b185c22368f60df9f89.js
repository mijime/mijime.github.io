_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[36],{pmdj:function(e,t,a){"use strict";a.r(t),a.d(t,"frontMatter",(function(){return j})),a.d(t,"default",(function(){return i}));var n=a("wx14"),b=a("Ff2n"),c=a("q1tI"),s=a.n(c),l=a("7ljp"),r=a("TJE1"),j=(s.a.createElement,{Title:"Nimble \u3067\u30e6\u30cb\u30c3\u30c8\u30c6\u30b9\u30c8\u3059\u308b",CreatedAt:"2017-10-13T13:24:00+09:00",Draft:!1,__resourcePath:"post/nim/usage-unittest/index.md",__scans:{},layout:"index"}),p={frontMatter:j},m=r.a;function i(e){var t=e.components,a=Object(b.a)(e,["components"]);return Object(l.b)(m,Object(n.a)({},p,a,{components:t,mdxType:"MDXLayout"}),Object(l.b)("h2",null,"\u30d5\u30a1\u30a4\u30eb\u306e\u5834\u6240"),Object(l.b)("p",null,"tests \u30d5\u30a9\u30eb\u30c0\u306b .nim \u3092\u914d\u7f6e\u3059\u308b\u3053\u3068\u3067\u59cb\u3081\u308b"),Object(l.b)("p",null,"Warning \u304c\u767a\u751f\u3059\u308b\u306e\u3067 SkipDirs \u306b @",'["tests"]'," \u3092\u8ffd\u52a0\u3059\u308b"),Object(l.b)("p",null,Object(l.b)("inlineCode",{parentName:"p"},"usage-unittest.nimble")),Object(l.b)("pre",null,Object(l.b)("code",Object(n.a)({parentName:"pre"},{className:"hljs language-nim"}),Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-comment"}),"# Package"),"\n\nversion       = ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"0.1.0"'),"\nauthor        = ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"Anonymous"'),"\ndescription   = ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"usage unit test"'),"\nlicense       = ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"MIT"'),"\n\n",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-comment"}),"# Dependencies"),"\n\nrequires ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"nim >= 0.17.2"'),"\n\nskipDirs = @[",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"tests"'),"]")),Object(l.b)("h2",null,"\u59cb\u3081\u65b9"),Object(l.b)("p",null,Object(l.b)("inlineCode",{parentName:"p"},"import unittest")," \u3092\u4f7f\u3063\u3066\u30c6\u30b9\u30c8\u3059\u308b\u3002"),Object(l.b)("p",null,Object(l.b)("inlineCode",{parentName:"p"},"nimble test")," \u3067\u30c6\u30b9\u30c8\u3092\u5b9f\u884c\u3002"),Object(l.b)("p",null,"\u76f4\u5217\u306b\u30c6\u30b9\u30c8\u3092\u5b9f\u884c\u3059\u308b"),Object(l.b)("table",null,Object(l.b)("thead",{parentName:"table"},Object(l.b)("tr",{parentName:"thead"},Object(l.b)("th",Object(n.a)({parentName:"tr"},{align:"left"}),"Name"),Object(l.b)("th",Object(n.a)({parentName:"tr"},{align:"left"}),"Desc"))),Object(l.b)("tbody",{parentName:"table"},Object(l.b)("tr",{parentName:"tbody"},Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"suite"),Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"\u30c6\u30b9\u30c8\u5927\u9805\u76ee")),Object(l.b)("tr",{parentName:"tbody"},Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"test"),Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"\u30c6\u30b9\u30c8\u5c0f\u9805\u76ee")),Object(l.b)("tr",{parentName:"tbody"},Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"setup"),Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"\u5404\u30c6\u30b9\u30c8\u524d\u306b\u5b9f\u884c\u3059\u308b\u3053\u3068")),Object(l.b)("tr",{parentName:"tbody"},Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"teardown"),Object(l.b)("td",Object(n.a)({parentName:"tr"},{align:"left"}),"\u5404\u30c6\u30b9\u30c8\u5f8c\u306b\u5b9f\u884c\u3059\u308b\u3053\u3068")))),Object(l.b)("p",null,Object(l.b)("inlineCode",{parentName:"p"},"tests/test.nim")),Object(l.b)("pre",null,Object(l.b)("code",Object(n.a)({parentName:"pre"},{className:"hljs language-nim"}),Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-keyword"}),"import")," unittest\n\nsuite ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"hello"'),":\n   test ",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-string"}),'"yes"'),":\n     require(",Object(l.b)("span",Object(n.a)({parentName:"code"},{className:"hljs-literal"}),"true"),")")),Object(l.b)("h2",null,"Reference"),Object(l.b)("ul",null,Object(l.b)("li",{parentName:"ul"},Object(l.b)("a",Object(n.a)({parentName:"li"},{href:"https://nim-lang.org/docs/unittest.html"}),"https://nim-lang.org/docs/unittest.html"))))}i.isMDXComponent=!0},uU6S:function(e,t,a){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/nim/usage-unittest",function(){return a("pmdj")}])}},[["uU6S",0,2,1,3]]]);