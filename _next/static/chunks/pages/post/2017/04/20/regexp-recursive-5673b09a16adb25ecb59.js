_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[14],{"+l+v":function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/2017/04/20/regexp-recursive",function(){return r("CfkB")}])},"7ljp":function(e,t,r){"use strict";r.d(t,"a",(function(){return b})),r.d(t,"b",(function(){return j}));var n=r("q1tI"),a=r.n(n);function c(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function l(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function s(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?l(Object(r),!0).forEach((function(t){c(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):l(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function o(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},c=Object.keys(e);for(n=0;n<c.length;n++)r=c[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(n=0;n<c.length;n++)r=c[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var i=a.a.createContext({}),p=function(e){var t=a.a.useContext(i),r=t;return e&&(r="function"===typeof e?e(t):s(s({},t),e)),r},b=function(e){var t=p(e.components);return a.a.createElement(i.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},d=a.a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,c=e.originalType,l=e.parentName,i=o(e,["components","mdxType","originalType","parentName"]),b=p(r),d=n,j=b["".concat(l,".").concat(d)]||b[d]||u[d]||c;return r?a.a.createElement(j,s(s({ref:t},i),{},{components:r})):a.a.createElement(j,s({ref:t},i))}));function j(e,t){var r=arguments,n=t&&t.mdxType;if("string"===typeof e||n){var c=r.length,l=new Array(c);l[0]=d;var s={};for(var o in t)hasOwnProperty.call(t,o)&&(s[o]=t[o]);s.originalType=e,s.mdxType="string"===typeof e?e:n,l[1]=s;for(var i=2;i<c;i++)l[i]=r[i];return a.a.createElement.apply(null,l)}return a.a.createElement.apply(null,r)}d.displayName="MDXCreateElement"},CfkB:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return i})),r.d(t,"default",(function(){return u}));var n=r("rePB"),a=r("Ff2n"),c=(r("q1tI"),r("7ljp")),l=r("W10S");function s(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?s(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):s(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var i={Description:"",Tags:["Development","JavaScript"],Date:"2017-04-20T07:48:28+09:00",Title:"JS\u306e\u6b63\u898f\u8868\u73fe\u306e\u518d\u5e30\u306b\u306f\u307e\u3063\u305f",Draft:!1,__resourcePath:"post/2017/04/20/regexp-recursive/index.md",__scans:{},layout:"index"},p={frontMatter:i},b=l.a;function u(e){var t=e.components,r=Object(a.a)(e,["components"]);return Object(c.b)(b,o(o(o({},p),r),{},{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,"\u306e\u3067\u30e1\u30e2\u308b"),Object(c.b)("p",null,"\u518d\u5e30\u7684\u306b\u6b63\u898f\u8868\u73fe\u3067\u629c\u304d\u51fa\u3057\u3066\u8a70\u3081\u305f\u3044\u5834\u5408\u304c\u3042\u308b\u3068\u3059\u308b\u3002"),Object(c.b)("pre",null,Object(c.b)("code",o({parentName:"pre"},{className:"hljs language-js"}),Object(c.b)("span",o({parentName:"code"},{className:"hljs-function"}),Object(c.b)("span",o({parentName:"span"},{className:"hljs-keyword"}),"function")," ",Object(c.b)("span",o({parentName:"span"},{className:"hljs-title"}),"regexpr"),"(",Object(c.b)("span",o({parentName:"span"},{className:"hljs-params"}),"re, text, acc = []"),") "),"{\n  ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-keyword"}),"const")," res = re.exec(text)\n  ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-keyword"}),"return")," res\n    ? regexpr(\n        re,\n        text.substr(res.index + res[",Object(c.b)("span",o({parentName:"code"},{className:"hljs-number"}),"0"),"].length, text.length),\n        acc.concat(res)\n      )\n    : acc\n}")),Object(c.b)("p",null,"\u3053\u306e\u3068\u304d chrome \u3055\u3093\u3060\u3068\u3001 g \u30aa\u30d7\u30b7\u30e7\u30f3\u3064\u3051\u305f\u6642\u3067\u7d50\u679c\u304c\u7570\u306a\u308b\u3002"),Object(c.b)("pre",null,Object(c.b)("code",o({parentName:"pre"},{className:"hljs language-js"}),"regexpr(",Object(c.b)("span",o({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/"),", ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-string"}),"'hello world'"),") ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-comment"}),'// => ["hello", "world"]'),"\nregexpr(",Object(c.b)("span",o({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/g"),", ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-string"}),"'hello world'"),") ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-comment"}),'// => ["hello"]'),"\nregexpr(",Object(c.b)("span",o({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/"),", ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-string"}),"'hello world hello world'"),") ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-comment"}),'// => ["hello", "world", "hello", "world"]'),"\nregexpr(",Object(c.b)("span",o({parentName:"code"},{className:"hljs-regexp"}),"/hello|world/g"),", ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-string"}),"'hello world hello world'"),") ",Object(c.b)("span",o({parentName:"code"},{className:"hljs-comment"}),'// => ["hello", "hello"]'))),Object(c.b)("p",null,"index \u3084\u7d50\u679c\u306f\u5909\u308f\u3089\u306a\u3044\u306e\u306b\u3001\u306a\u3093\u3067\u3060\u308d\u3046"))}u.isMDXComponent=!0},Ff2n:function(e,t,r){"use strict";function n(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},c=Object.keys(e);for(n=0;n<c.length;n++)r=c[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(n=0;n<c.length;n++)r=c[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}r.d(t,"a",(function(){return n}))},W10S:function(e,t,r){"use strict";r.d(t,"a",(function(){return p}));var n=r("nKUr"),a=r("g4pe"),c=r.n(a);var l=r("MMqm"),s=r("YFqc"),o=r.n(s);function i(e){var t=e.title,r=e.date,a=e.tags,c=void 0===a?[]:a,l=e.children;return Object(n.jsx)("div",{className:"article card",children:Object(n.jsxs)("div",{className:"card-content",children:[Object(n.jsx)("div",{className:"article-title",children:Object(n.jsxs)("div",{className:"has-text-centered",children:[Object(n.jsx)("p",{className:"title",children:t}),Object(n.jsxs)("div",{className:"tags level-item has-addons",children:[c.map((function(e){return Object(n.jsx)("span",{className:"tag is-rounded is-info",children:Object(n.jsx)(o.a,{href:"/tag/".concat(e,"/1"),children:e})},e)})),Object(n.jsx)("span",{className:"tag is-rounded",children:r})]})]})}),Object(n.jsx)("div",{className:"content article-body",children:l})]})})}function p(e){var t,r=e.frontMatter,a=e.children,s={title:(t=r).title||t.Title||"",description:t.description||t.Description||"",date:t.date||t.Date||new Date,tags:t.tags||t.Tags||[],draft:!!t.draft||!!t.Draft};return Object(n.jsxs)(n.Fragment,{children:[Object(n.jsx)(c.a,{children:Object(n.jsxs)("title",{children:[s.title," | ",l.b]})}),Object(n.jsx)(i,{title:s.title,date:s.date,tags:s.tags,children:a})]})}},rePB:function(e,t,r){"use strict";function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}r.d(t,"a",(function(){return n}))}},[["+l+v",0,2,1,3]]]);