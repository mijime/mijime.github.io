_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[31],{"1IgY":function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/hugo/hugo-pagination",function(){return n("2gFg")}])},"1sdl":function(e,t,n){"use strict";n.d(t,"a",(function(){return c}));var r=n("nKUr"),a=n("YRU8");function c(e){var t=e.title,n=e.date,c=e.tags,s=void 0===c?[]:c,o=e.children;return Object(r.jsx)("div",{className:"article",children:Object(r.jsx)("div",{className:"card",children:Object(r.jsxs)("div",{className:"card-content",children:[Object(r.jsxs)("div",{className:"article-title",children:[Object(r.jsx)("div",{className:"has-text-centered",children:Object(r.jsx)("p",{className:"title",children:t})}),Object(r.jsx)(a.a,{tags:s,date:n})]}),Object(r.jsx)("div",{className:"article-body pt-8",children:Object(r.jsx)("div",{className:"content",children:o})})]})})})}},"2gFg":function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return p})),n.d(t,"default",(function(){return b}));var r=n("rePB"),a=n("Ff2n"),c=(n("q1tI"),n("7ljp")),s=n("u9R4");function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var p={Date:"2016-05-25T14:05:50+09:00",Draft:!1,Title:"hugo pagination",Tags:["hugo"],__resourcePath:"post/hugo/hugo-pagination/index.md",__scans:{},layout:"index"},l={frontMatter:p},u=s.a;function b(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(c.b)(u,i(i(i({},l),n),{},{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,".Paginator \u3092\u4f7f\u3048\u3070\u81ea\u52d5\u3067\u3084\u3063\u3066\u304f\u308c\u308b\u307f\u305f\u3044"),Object(c.b)("pre",null,Object(c.b)("code",i({parentName:"pre"},{className:"hljs language-html"}),"{{- range (.Paginator 10).Pages }}\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"div"),">"),"{{ .Content }}",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"div"),">"),"\n{{- end }}")),Object(c.b)("p",null,"\u6b21\u9801\u3001\u524d\u9801\u3078\u306e\u30ea\u30f3\u30af\u3082 .Paginator \u3092\u4f7f\u3046"),Object(c.b)("pre",null,Object(c.b)("code",i({parentName:"pre"},{className:"hljs language-html"}),"{{- if or (.Paginator.HasPrev) (.Paginator.HasNext) }}\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"nav")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"role"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'"pagination"'),">"),"\n  {{- if .Paginator.HasPrev }}\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"href"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'"{{ .Paginator.Prev.URL }}"'),">"),"Prev",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a"),">"),"\n  {{- end }}\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"span")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"class"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'""'),"\n    >"),"Page {{ .Paginator.PageNumber }} of {{ .Paginator.TotalPages }}</span\n  >\n  {{- if .Paginator.HasNext }}\n  ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"<",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a")," ",Object(c.b)("span",i({parentName:"span"},{className:"hljs-attr"}),"href"),"=",Object(c.b)("span",i({parentName:"span"},{className:"hljs-string"}),'"{{ .Paginator.Next.URL }}"'),">"),"Next",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"a"),">"),"\n  {{- end }}\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-tag"}),"</",Object(c.b)("span",i({parentName:"span"},{className:"hljs-name"}),"nav"),">"),"\n{{end}}")))}b.isMDXComponent=!0},"7ljp":function(e,t,n){"use strict";n.d(t,"a",(function(){return u})),n.d(t,"b",(function(){return O}));var r=n("q1tI"),a=n.n(r);function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){c(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},c=Object.keys(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var p=a.a.createContext({}),l=function(e){var t=a.a.useContext(p),n=t;return e&&(n="function"===typeof e?e(t):o(o({},t),e)),n},u=function(e){var t=l(e.components);return a.a.createElement(p.Provider,{value:t},e.children)},b={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},j=a.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,c=e.originalType,s=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),u=l(n),j=r,O=u["".concat(s,".").concat(j)]||u[j]||b[j]||c;return n?a.a.createElement(O,o(o({ref:t},p),{},{components:n})):a.a.createElement(O,o({ref:t},p))}));function O(e,t){var n=arguments,r=t&&t.mdxType;if("string"===typeof e||r){var c=n.length,s=new Array(c);s[0]=j;var o={};for(var i in t)hasOwnProperty.call(t,i)&&(o[i]=t[i]);o.originalType=e,o.mdxType="string"===typeof e?e:r,s[1]=o;for(var p=2;p<c;p++)s[p]=n[p];return a.a.createElement.apply(null,s)}return a.a.createElement.apply(null,n)}j.displayName="MDXCreateElement"},Ff2n:function(e,t,n){"use strict";function r(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},c=Object.keys(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}n.d(t,"a",(function(){return r}))},SsUb:function(e,t,n){"use strict";n.d(t,"b",(function(){return r})),n.d(t,"d",(function(){return a})),n.d(t,"c",(function(){return c})),n.d(t,"e",(function(){return s})),n.d(t,"a",(function(){return o})),n.d(t,"f",(function(){return i}));var r="ja",a="My snippets",c=5,s="https://mijime.github.io",o="UA-46554348-4",i="7gVj5rzyozu0vYcQMLhIGr4g-WWyJn4R22RgeYqQdS0"},YRU8:function(e,t,n){"use strict";n.d(t,"a",(function(){return c}));var r=n("nKUr"),a=n("wF+O");function c(e){var t=e.tags,n=e.date;return Object(r.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(r.jsx)(a.a,{tag:e},e)})),Object(r.jsx)("span",{className:"tag is-rounded",children:n})]})}},rePB:function(e,t,n){"use strict";function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return r}))},u9R4:function(e,t,n){"use strict";n.d(t,"a",(function(){return O}));var r=n("rePB"),a=n("nKUr"),c=n("g4pe"),s=n.n(c),o=n("SsUb"),i=function(){return o.d},p=n("1sdl");function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function u(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function b(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function j(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?b(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):b(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function O(e){var t=e.frontMatter,n=e.children,r=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return u(u({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t);return Object(a.jsxs)(a.Fragment,{children:[Object(a.jsx)(s.a,{children:Object(a.jsxs)("title",{children:[r.title," | ",i()]})}),Object(a.jsx)(p.a,j(j({},r),{},{children:n}))]})}}},[["1IgY",0,2,1,3]]]);