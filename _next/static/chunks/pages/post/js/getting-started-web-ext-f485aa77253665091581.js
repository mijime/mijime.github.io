_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[33],{"+VcZ":function(e,t,r){"use strict";r.d(t,"a",(function(){return i}));var n=r("nKUr"),c=r("YFqc"),a=r.n(c);function o(e){var t=e.tag;return Object(n.jsx)("span",{className:"tag is-rounded is-info",children:Object(n.jsx)(a.a,{href:"/tag/".concat(t,"/1"),children:t})})}function i(e){var t=e.tags,r=e.date;return Object(n.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(n.jsx)(o,{tag:e},e)})),Object(n.jsx)("span",{className:"tag is-rounded",children:r})]})}},"7ljp":function(e,t,r){"use strict";r.d(t,"a",(function(){return u})),r.d(t,"b",(function(){return f}));var n=r("q1tI"),c=r.n(n);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function o(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?o(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):o(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function l(e,t){if(null==e)return{};var r,n,c=function(e,t){if(null==e)return{};var r,n,c={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(c[r]=e[r]);return c}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(c[r]=e[r])}return c}var s=c.a.createContext({}),b=function(e){var t=c.a.useContext(s),r=t;return e&&(r="function"===typeof e?e(t):i(i({},t),e)),r},u=function(e){var t=b(e.components);return c.a.createElement(s.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return c.a.createElement(c.a.Fragment,{},t)}},O=c.a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,a=e.originalType,o=e.parentName,s=l(e,["components","mdxType","originalType","parentName"]),u=b(r),O=n,f=u["".concat(o,".").concat(O)]||u[O]||p[O]||a;return r?c.a.createElement(f,i(i({ref:t},s),{},{components:r})):c.a.createElement(f,i({ref:t},s))}));function f(e,t){var r=arguments,n=t&&t.mdxType;if("string"===typeof e||n){var a=r.length,o=new Array(a);o[0]=O;var i={};for(var l in t)hasOwnProperty.call(t,l)&&(i[l]=t[l]);i.originalType=e,i.mdxType="string"===typeof e?e:n,o[1]=i;for(var s=2;s<a;s++)o[s]=r[s];return c.a.createElement.apply(null,o)}return c.a.createElement.apply(null,r)}O.displayName="MDXCreateElement"},ASlP:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return s})),r.d(t,"default",(function(){return p}));var n=r("rePB"),c=r("Ff2n"),a=(r("q1tI"),r("7ljp")),o=r("W10S");function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var s={Title:"web-ext \u3092\u4f7f\u3063\u3066 WebExtension \u3092\u59cb\u3081\u308b",Date:"2017-10-14T01:38:45+09:00",Draft:!1,__resourcePath:"post/js/getting-started-web-ext/index.md",__scans:{},layout:"index"},b={frontMatter:s},u=o.a;function p(e){var t=e.components,r=Object(c.a)(e,["components"]);return Object(a.b)(u,l(l(l({},b),r),{},{components:t,mdxType:"MDXLayout"}),Object(a.b)("p",null,"web extension \u7528\u306e\u30d3\u30eb\u30c9\u30c4\u30fc\u30eb ",Object(a.b)("inlineCode",{parentName:"p"},"web-ext")," \u304c\u3042\u308b\u3089\u3057\u3044"),Object(a.b)("p",null,Object(a.b)("a",l({parentName:"p"},{href:"https://github.com/mozilla/web-ext"}),"web-ext")),Object(a.b)("p",null,"Signed, Debug \u304c\u30e1\u30a4\u30f3\u306e\u30c4\u30fc\u30eb\u3002\n\u30d3\u30eb\u30c9\u306f\u4e3b\u8981\u30d5\u30a1\u30a4\u30eb\u3092 zip \u306b\u5165\u308c\u308b\u3060\u3051\u3060\u3063\u305f"),Object(a.b)("h2",null,"Install"),Object(a.b)("p",null,"Yarn \u3060\u3068\u4e0a\u624b\u304f\u3044\u304b\u306a\u3044\u3002..? \u306e\u3067 ",Object(a.b)("inlineCode",{parentName:"p"},"npm")," \u3067\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3059\u308b"),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"hljs language-bash"}),"npm install --global web-ext")),Object(a.b)("h2",null,"Usage"),Object(a.b)("p",null,"\u30c7\u30d0\u30c3\u30b0\u3067\u78ba\u8a8d\u3059\u308b"),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"hljs language-bash"}),"web-ext run --firefox=",Object(a.b)("span",l({parentName:"code"},{className:"hljs-variable"}),"${FIREFOX_BIN}"))),Object(a.b)("p",null,"\u30d3\u30eb\u30c9\u3059\u308b"),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"hljs language-bash"}),"web-ext build\nweb-ext sign --api-key ",Object(a.b)("span",l({parentName:"code"},{className:"hljs-variable"}),"${API_KEY}")," --api-secret ",Object(a.b)("span",l({parentName:"code"},{className:"hljs-variable"}),"${API_SECRET}"))),Object(a.b)("h2",null,"Reference"),Object(a.b)("ul",null,Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"https://github.com/mozilla/web-ext"}),"https://github.com/mozilla/web-ext")),Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext"}),"https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext"))))}p.isMDXComponent=!0},Ff2n:function(e,t,r){"use strict";function n(e,t){if(null==e)return{};var r,n,c=function(e,t){if(null==e)return{};var r,n,c={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(c[r]=e[r]);return c}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(c[r]=e[r])}return c}r.d(t,"a",(function(){return n}))},SLlm:function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/js/getting-started-web-ext",function(){return r("ASlP")}])},W10S:function(e,t,r){"use strict";r.d(t,"a",(function(){return O}));var n=r("rePB"),c=r("nKUr"),a=r("g4pe"),o=r.n(a);function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var s=r("MMqm"),b=r("wEQj");function u(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function p(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?u(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):u(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function O(e){var t=e.frontMatter,r=e.children,n=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return l(l({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t);return Object(c.jsxs)(c.Fragment,{children:[Object(c.jsx)(o.a,{children:Object(c.jsxs)("title",{children:[n.title," | ",s.c]})}),Object(c.jsx)(b.a,p(p({},n),{},{slug:"",content:"",children:r}))]})}},rePB:function(e,t,r){"use strict";function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}r.d(t,"a",(function(){return n}))},wEQj:function(e,t,r){"use strict";r.d(t,"a",(function(){return a}));var n=r("nKUr"),c=r("+VcZ");function a(e){var t=e.title,r=e.date,a=e.tags,o=void 0===a?[]:a,i=e.children;return Object(n.jsx)("div",{className:"article card",children:Object(n.jsxs)("div",{className:"card-content",children:[Object(n.jsx)("div",{className:"article-title",children:Object(n.jsxs)("div",{className:"has-text-centered",children:[Object(n.jsx)("p",{className:"title",children:t}),Object(n.jsx)(c.a,{tags:o,date:r})]})}),Object(n.jsx)("div",{className:"content article-body pt-8",children:i})]})})}}},[["SLlm",0,2,1,3]]]);