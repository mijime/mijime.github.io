_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[31],{"+VcZ":function(e,t,n){"use strict";n.d(t,"a",(function(){return c}));var a=n("nKUr"),r=n("rfoC");function c(e){var t=e.tags,n=e.date;return Object(a.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(a.jsx)(r.a,{tag:e},e)})),Object(a.jsx)("span",{className:"tag is-rounded",children:n})]})}},"1IgY":function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/hugo/hugo-pagination",function(){return n("2gFg")}])},"2gFg":function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return p})),n.d(t,"default",(function(){return u}));var a=n("rePB"),r=n("Ff2n"),c=(n("q1tI"),n("7ljp")),s=n("W10S");function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){Object(a.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var p={Date:"2016-05-25T14:05:50+09:00",Draft:!1,Title:"hugo pagination",Tags:["hugo"],__resourcePath:"post/hugo/hugo-pagination/index.md",__scans:{},layout:"index"},l={frontMatter:p},b=s.a;function u(e){var t=e.components,n=Object(r.a)(e,["components"]);return Object(c.b)(b,i(i(i({},l),n),{},{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,".Paginator \u3092\u4f7f\u3048\u3070\u81ea\u52d5\u3067\u3084\u3063\u3066\u304f\u308c\u308b\u307f\u305f\u3044"),Object(c.b)("pre",null,Object(c.b)("code",i({parentName:"pre"},{className:"hljs language-html"}),"{{- range (.Paginator 10).Pages }}\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"div"),">"),"{{ .Content }}",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"div"),">"),"\n{{- end }}")),Object(c.b)("p",null,"\u6b21\u9801\u3001\u524d\u9801\u3078\u306e\u30ea\u30f3\u30af\u3082 .Paginator \u3092\u4f7f\u3046"),Object(c.b)("pre",null,Object(c.b)("code",i({parentName:"pre"},{className:"hljs language-html"}),"{{- if or (.Paginator.HasPrev) (.Paginator.HasNext) }}\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"nav")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"role"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'"pagination"'),">"),"\n  {{- if .Paginator.HasPrev }}\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"href"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'"{{ .Paginator.Prev.URL }}"'),">"),"Prev",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a"),">"),"\n  {{- end }}\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"span")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"class"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'""'),"\n    >"),"Page {{ .Paginator.PageNumber }} of {{ .Paginator.TotalPages }}",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"span"),"\n  >"),"\n  {{- if .Paginator.HasNext }}\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"href"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'"{{ .Paginator.Next.URL }}"'),">"),"Next",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a"),">"),"\n  {{- end }}\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"nav"),">"),"\n{{end}}")))}u.isMDXComponent=!0},"7ljp":function(e,t,n){"use strict";n.d(t,"a",(function(){return b})),n.d(t,"b",(function(){return O}));var a=n("q1tI"),r=n.n(a);function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){c(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},c=Object.keys(e);for(a=0;a<c.length;a++)n=c[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(a=0;a<c.length;a++)n=c[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var p=r.a.createContext({}),l=function(e){var t=r.a.useContext(p),n=t;return e&&(n="function"===typeof e?e(t):o(o({},t),e)),n},b=function(e){var t=l(e.components);return r.a.createElement(p.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.a.createElement(r.a.Fragment,{},t)}},j=r.a.forwardRef((function(e,t){var n=e.components,a=e.mdxType,c=e.originalType,s=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),b=l(n),j=a,O=b["".concat(s,".").concat(j)]||b[j]||u[j]||c;return n?r.a.createElement(O,o(o({ref:t},p),{},{components:n})):r.a.createElement(O,o({ref:t},p))}));function O(e,t){var n=arguments,a=t&&t.mdxType;if("string"===typeof e||a){var c=n.length,s=new Array(c);s[0]=j;var o={};for(var i in t)hasOwnProperty.call(t,i)&&(o[i]=t[i]);o.originalType=e,o.mdxType="string"===typeof e?e:a,s[1]=o;for(var p=2;p<c;p++)s[p]=n[p];return r.a.createElement.apply(null,s)}return r.a.createElement.apply(null,n)}j.displayName="MDXCreateElement"},Ff2n:function(e,t,n){"use strict";function a(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},c=Object.keys(e);for(a=0;a<c.length;a++)n=c[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(a=0;a<c.length;a++)n=c[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}n.d(t,"a",(function(){return a}))},W10S:function(e,t,n){"use strict";n.d(t,"a",(function(){return j}));var a=n("rePB"),r=n("nKUr"),c=n("g4pe"),s=n.n(c);function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){Object(a.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var p=n("MMqm"),l=n("wEQj");function b(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function u(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?b(Object(n),!0).forEach((function(t){Object(a.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):b(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function j(e){var t=e.frontMatter,n=e.children,a=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return i(i({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t);return Object(r.jsxs)(r.Fragment,{children:[Object(r.jsx)(s.a,{children:Object(r.jsxs)("title",{children:[a.title," | ",p.c]})}),Object(r.jsx)(l.a,u(u({},a),{},{slug:"",content:"",children:n}))]})}},rePB:function(e,t,n){"use strict";function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return a}))},wEQj:function(e,t,n){"use strict";n.d(t,"a",(function(){return c}));var a=n("nKUr"),r=n("+VcZ");function c(e){var t=e.title,n=e.date,c=e.tags,s=void 0===c?[]:c,o=e.children;return Object(a.jsx)("div",{className:"article card",children:Object(a.jsxs)("div",{className:"card-content",children:[Object(a.jsx)("div",{className:"article-title",children:Object(a.jsxs)("div",{className:"has-text-centered",children:[Object(a.jsx)("p",{className:"title",children:t}),Object(a.jsx)(r.a,{tags:s,date:n})]})}),Object(a.jsx)("div",{className:"content article-body pt-8",children:o})]})})}}},[["1IgY",0,2,1,3]]]);