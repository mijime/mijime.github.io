_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[36],{"7ljp":function(e,t,n){"use strict";n.d(t,"a",(function(){return u})),n.d(t,"b",(function(){return j}));var r=n("q1tI"),a=n.n(r);function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){c(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},c=Object.keys(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=a.a.createContext({}),p=function(e){var t=a.a.useContext(l),n=t;return e&&(n="function"===typeof e?e(t):s(s({},t),e)),n},u=function(e){var t=p(e.components);return a.a.createElement(l.Provider,{value:t},e.children)},b={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},f=a.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,c=e.originalType,o=e.parentName,l=i(e,["components","mdxType","originalType","parentName"]),u=p(n),f=r,j=u["".concat(o,".").concat(f)]||u[f]||b[f]||c;return n?a.a.createElement(j,s(s({ref:t},l),{},{components:n})):a.a.createElement(j,s({ref:t},l))}));function j(e,t){var n=arguments,r=t&&t.mdxType;if("string"===typeof e||r){var c=n.length,o=new Array(c);o[0]=f;var s={};for(var i in t)hasOwnProperty.call(t,i)&&(s[i]=t[i]);s.originalType=e,s.mdxType="string"===typeof e?e:r,o[1]=s;for(var l=2;l<c;l++)o[l]=n[l];return a.a.createElement.apply(null,o)}return a.a.createElement.apply(null,n)}f.displayName="MDXCreateElement"},Ff2n:function(e,t,n){"use strict";function r(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},c=Object.keys(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}n.d(t,"a",(function(){return r}))},W10S:function(e,t,n){"use strict";n.d(t,"a",(function(){return p}));var r=n("nKUr"),a=n("g4pe"),c=n.n(a);var o=n("MMqm"),s=n("YFqc"),i=n.n(s);function l(e){var t=e.title,n=e.date,a=e.tags,c=void 0===a?[]:a,o=e.children;return Object(r.jsx)("div",{className:"article card",children:Object(r.jsxs)("div",{className:"card-content",children:[Object(r.jsx)("div",{className:"article-title",children:Object(r.jsxs)("div",{className:"has-text-centered",children:[Object(r.jsx)("p",{className:"title",children:t}),Object(r.jsxs)("div",{className:"tags level-item has-addons",children:[c.map((function(e){return Object(r.jsx)("span",{className:"tag is-rounded is-info",children:Object(r.jsx)(i.a,{href:"/tag/".concat(e,"/1"),children:e})},e)})),Object(r.jsx)("span",{className:"tag is-rounded",children:n})]})]})}),Object(r.jsx)("div",{className:"content article-body pt-8",children:o})]})})}function p(e){var t,n=e.frontMatter,a=e.children,s={title:(t=n).title||t.Title||"",description:t.description||t.Description||"",date:t.date||t.Date||new Date,tags:t.tags||t.Tags||[],draft:!!t.draft||!!t.Draft};return Object(r.jsxs)(r.Fragment,{children:[Object(r.jsx)(c.a,{children:Object(r.jsxs)("title",{children:[s.title," | ",o.b]})}),Object(r.jsx)(l,{title:s.title,date:s.date,tags:s.tags.map((function(e){return e.toLowerCase()})),children:a})]})}},fhF4:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/python/create-pelican-plugin",function(){return n("os7c")}])},os7c:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return l})),n.d(t,"default",(function(){return b}));var r=n("rePB"),a=n("Ff2n"),c=(n("q1tI"),n("7ljp")),o=n("W10S");function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var l={Date:"2017-10-22T21:32:19+09:00",Draft:!1,Title:"Pelican\u306ePlugin\u306e\u4f5c\u308a\u65b9",Tags:["pelican"],__resourcePath:"post/python/create-pelican-plugin/index.md",__scans:{},layout:"index"},p={frontMatter:l},u=o.a;function b(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(c.b)(u,i(i(i({},p),n),{},{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,"register \u95a2\u6570\u3092\u7528\u610f\u3057\u3066\u3001 \u5404\u30a4\u30d9\u30f3\u30c8\u306e signals \u306b ",Object(c.b)("inlineCode",{parentName:"p"},"connect")," \u3059\u308b"),Object(c.b)("pre",null,Object(c.b)("code",i({parentName:"pre"},{className:"hljs language-python"}),Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"from")," pelican ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"import")," signals\n\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-function"}),Object(c.b)("span",i({parentName:"span"},{className:"hljs-keyword"}),"def")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-title"}),"register"),"():"),"\n  signals.content_object_init.connect(content_object_init_handler)\n\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-function"}),Object(c.b)("span",i({parentName:"span"},{className:"hljs-keyword"}),"def")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-title"}),"content_object_init_handler"),"(",Object(c.b)("span",i({parentName:"span"},{className:"hljs-params"}),"content"),"):"),"\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"pass"))),Object(c.b)("p",null,"signals \u306f\u4e0b\u8a18\u3092\u53c2\u7167"),Object(c.b)("p",null,Object(c.b)("a",i({parentName:"p"},{href:"http://docs.getpelican.com/en/3.7.1/plugins.html#list-of-signals"}),"http://docs.getpelican.com/en/3.7.1/plugins.html#list-of-signals")),Object(c.b)("p",null,Object(c.b)("inlineCode",{parentName:"p"},"_content")," \u3084 ",Object(c.b)("inlineCode",{parentName:"p"},"_summary")," \u3092\u66f8\u304d\u63db\u3048\u308b\u5834\u5408\u306f\u4ee5\u964d\u306e\u30b9\u30c6\u30fc\u30b8\u3067\u884c\u3048\u3070\u826f\u3044\u3068\u306e\u3053\u3068"),Object(c.b)("p",null,"\u3060\u304c\u3001\u4e00\u5ea6\u3082\u4e0a\u624b\u304f\u3044\u3063\u3066\u3044\u306a\u3044"))}b.isMDXComponent=!0},rePB:function(e,t,n){"use strict";function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return r}))}},[["fhF4",0,2,1,3]]]);