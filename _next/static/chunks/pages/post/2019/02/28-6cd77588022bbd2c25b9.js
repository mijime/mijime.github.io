_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[18],{"1sdl":function(e,t,n){"use strict";n.d(t,"a",(function(){return c}));var r=n("nKUr"),a=n("YRU8");function c(e){var t=e.title,n=e.date,c=e.tags,s=void 0===c?[]:c,o=e.children;return Object(r.jsx)("div",{className:"article",children:Object(r.jsx)("div",{className:"card",children:Object(r.jsxs)("div",{className:"card-content",children:[Object(r.jsxs)("div",{className:"article-title",children:[Object(r.jsx)("div",{className:"has-text-centered",children:Object(r.jsx)("p",{className:"title",children:t})}),Object(r.jsx)(a.a,{tags:s,date:n})]}),Object(r.jsx)("div",{className:"article-body pt-8",children:Object(r.jsx)("div",{className:"content",children:o})})]})})})}},"7ljp":function(e,t,n){"use strict";n.d(t,"a",(function(){return b})),n.d(t,"b",(function(){return m}));var r=n("q1tI"),a=n.n(r);function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){c(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},c=Object.keys(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=a.a.createContext({}),p=function(e){var t=a.a.useContext(l),n=t;return e&&(n="function"===typeof e?e(t):o(o({},t),e)),n},b=function(e){var t=p(e.components);return a.a.createElement(l.Provider,{value:t},e.children)},j={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},u=a.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,c=e.originalType,s=e.parentName,l=i(e,["components","mdxType","originalType","parentName"]),b=p(n),u=r,m=b["".concat(s,".").concat(u)]||b[u]||j[u]||c;return n?a.a.createElement(m,o(o({ref:t},l),{},{components:n})):a.a.createElement(m,o({ref:t},l))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"===typeof e||r){var c=n.length,s=new Array(c);s[0]=u;var o={};for(var i in t)hasOwnProperty.call(t,i)&&(o[i]=t[i]);o.originalType=e,o.mdxType="string"===typeof e?e:r,s[1]=o;for(var l=2;l<c;l++)s[l]=n[l];return a.a.createElement.apply(null,s)}return a.a.createElement.apply(null,n)}u.displayName="MDXCreateElement"},DOML:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return l})),n.d(t,"default",(function(){return j}));var r=n("rePB"),a=n("Ff2n"),c=(n("q1tI"),n("7ljp")),s=n("u9R4");function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var l={Title:"vim-lsp\u306f\u3058\u3081\u307e\u3057\u305f",Draft:!1,Description:"",Tags:["development"],Date:"2019-02-28T01:49:54+09:00",__resourcePath:"post/2019/02/28/index.md",__scans:{},layout:"index"},p={frontMatter:l},b=s.a;function j(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(c.b)(b,i(i(i({},p),n),{},{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,"\u4eca\u307e\u3067 ",Object(c.b)("inlineCode",{parentName:"p"},"faith/vim-go")," \u3092\u3042\u308a\u304c\u305f\u304f\u4f7f\u308f\u305b\u3066\u3082\u3089\u3063\u3066\u3044\u305f\u3051\u3069\n",Object(c.b)("inlineCode",{parentName:"p"},"GO111MODULE=on")," \u306e\u3068\u304d\u306e\u6319\u52d5\u304c\u6c17\u306b\u306a\u3063\u305f\u306e\u3067 ",Object(c.b)("inlineCode",{parentName:"p"},"prabirshrestha/vim-lsp")," \u306b\u79fb\u884c\u3057\u305f"),Object(c.b)("ol",null,Object(c.b)("li",{parentName:"ol"},Object(c.b)("p",{parentName:"li"},"Wiki \u306b\u5168\u90e8\u66f8\u3044\u3066\u3042\u308b\u306e\u3067\u305d\u308c\u3092\u30b3\u30d4\u308b")),Object(c.b)("li",{parentName:"ol"},Object(c.b)("p",{parentName:"li"},Object(c.b)("inlineCode",{parentName:"p"},"go get -u github.com/saibing/bingo")," \u3067 bingo \u3092\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3057\u3066\u304a\u304f")),Object(c.b)("li",{parentName:"ol"},Object(c.b)("p",{parentName:"li"},Object(c.b)("inlineCode",{parentName:"p"},"<C-]>")," \u306a\u3069\u306e key mapping \u3092\u8a2d\u5b9a\u3059\u308b"))),Object(c.b)("pre",null,Object(c.b)("code",i({parentName:"pre"},{className:"hljs language-vim"}),Object(c.b)("span",i({parentName:"code"},{className:"hljs-comment"}),'" ...'),"\nPlug ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'prabirshrestha/async.vim'"),"\nPlug ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'prabirshrestha/vim-lsp'"),"\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"if")," ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-built_in"}),"executable"),"(",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'bingo'"),")\n    ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"augroup")," LspGo\n        au!\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," User lsp_setup ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"call")," lsp#register_server({\n            \\ ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'name'"),": ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'go-lang'"),",\n            \\ ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'cmd'"),": {server_info->[",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'bingo'"),", ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'-mode'"),", ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'stdio'"),"]},\n                      \\ ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'whitelist'"),": [",Object(c.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'go'"),"],\n                                  \\ })\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," FileType ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"go")," ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"setlocal")," noexpandtab\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," FileType ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"go")," ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"setlocal")," omnifunc=lsp#complete\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," FileType ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"go")," ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"nmap")," <C-]> :LspDefinition",Object(c.b)("span",i({parentName:"code"},{className:"hljs-symbol"}),"<CR>"),"\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," FileType ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"go")," ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"nmap")," K :LspHover",Object(c.b)("span",i({parentName:"code"},{className:"hljs-symbol"}),"<CR>"),"\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," FileType ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"go")," ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"nmap")," ]] :LspDocumentSymbol",Object(c.b)("span",i({parentName:"code"},{className:"hljs-symbol"}),"<CR>"),"\n        ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"autocmd")," BufWritePre *.",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"go")," LspDocumentFormatSync\n    ",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"augroup")," END\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-keyword"}),"endif"),"\n",Object(c.b)("span",i({parentName:"code"},{className:"hljs-comment"}),'" ...'))))}j.isMDXComponent=!0},Ff2n:function(e,t,n){"use strict";function r(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},c=Object.keys(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(r=0;r<c.length;r++)n=c[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}n.d(t,"a",(function(){return r}))},SsUb:function(e,t,n){"use strict";n.d(t,"b",(function(){return r})),n.d(t,"d",(function(){return a})),n.d(t,"c",(function(){return c})),n.d(t,"e",(function(){return s})),n.d(t,"a",(function(){return o})),n.d(t,"f",(function(){return i}));var r="ja",a="My snippets",c=5,s="https://mijime.github.io",o="UA-46554348-4",i="7gVj5rzyozu0vYcQMLhIGr4g-WWyJn4R22RgeYqQdS0"},TifM:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/2019/02/28",function(){return n("DOML")}])},YRU8:function(e,t,n){"use strict";n.d(t,"a",(function(){return c}));var r=n("nKUr"),a=n("wF+O");function c(e){var t=e.tags,n=e.date;return Object(r.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(r.jsx)(a.a,{tag:e},e)})),Object(r.jsx)("span",{className:"tag is-rounded",children:n})]})}},rePB:function(e,t,n){"use strict";function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return r}))},u9R4:function(e,t,n){"use strict";n.d(t,"a",(function(){return m}));var r=n("rePB"),a=n("nKUr"),c=n("g4pe"),s=n.n(c),o=n("SsUb"),i=function(){return o.d},l=n("1sdl");function p(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function b(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?p(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):p(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function j(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function u(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?j(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):j(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function m(e){var t=e.frontMatter,n=e.children,r=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return b(b({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t);return Object(a.jsxs)(a.Fragment,{children:[Object(a.jsx)(s.a,{children:Object(a.jsxs)("title",{children:[r.title," | ",i()]})}),Object(a.jsx)(l.a,u(u({},r),{},{children:n}))]})}}},[["TifM",0,2,1,3]]]);