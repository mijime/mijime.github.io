_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[38],{"+VcZ":function(e,t,r){"use strict";r.d(t,"a",(function(){return a}));var n=r("nKUr"),c=r("rfoC");function a(e){var t=e.tags,r=e.date;return Object(n.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(n.jsx)(c.a,{tag:e},e)})),Object(n.jsx)("span",{className:"tag is-rounded",children:r})]})}},"7ljp":function(e,t,r){"use strict";r.d(t,"a",(function(){return b})),r.d(t,"b",(function(){return O}));var n=r("q1tI"),c=r.n(n);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function o(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?o(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):o(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function l(e,t){if(null==e)return{};var r,n,c=function(e,t){if(null==e)return{};var r,n,c={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(c[r]=e[r]);return c}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(c[r]=e[r])}return c}var u=c.a.createContext({}),s=function(e){var t=c.a.useContext(u),r=t;return e&&(r="function"===typeof e?e(t):i(i({},t),e)),r},b=function(e){var t=s(e.components);return c.a.createElement(u.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return c.a.createElement(c.a.Fragment,{},t)}},f=c.a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,a=e.originalType,o=e.parentName,u=l(e,["components","mdxType","originalType","parentName"]),b=s(r),f=n,O=b["".concat(o,".").concat(f)]||b[f]||p[f]||a;return r?c.a.createElement(O,i(i({ref:t},u),{},{components:r})):c.a.createElement(O,i({ref:t},u))}));function O(e,t){var r=arguments,n=t&&t.mdxType;if("string"===typeof e||n){var a=r.length,o=new Array(a);o[0]=f;var i={};for(var l in t)hasOwnProperty.call(t,l)&&(i[l]=t[l]);i.originalType=e,i.mdxType="string"===typeof e?e:n,o[1]=i;for(var u=2;u<a;u++)o[u]=r[u];return c.a.createElement.apply(null,o)}return c.a.createElement.apply(null,r)}f.displayName="MDXCreateElement"},Ff2n:function(e,t,r){"use strict";function n(e,t){if(null==e)return{};var r,n,c=function(e,t){if(null==e)return{};var r,n,c={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(c[r]=e[r]);return c}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(c[r]=e[r])}return c}r.d(t,"a",(function(){return n}))},W10S:function(e,t,r){"use strict";r.d(t,"a",(function(){return f}));var n=r("rePB"),c=r("nKUr"),a=r("g4pe"),o=r.n(a);function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var u=r("MMqm"),s=r("wEQj");function b(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function p(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?b(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):b(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function f(e){var t=e.frontMatter,r=e.children,n=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return l(l({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t);return Object(c.jsxs)(c.Fragment,{children:[Object(c.jsx)(o.a,{children:Object(c.jsxs)("title",{children:[n.title," | ",u.c]})}),Object(c.jsx)(s.a,p(p({},n),{},{children:r}))]})}},X5VI:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return u})),r.d(t,"default",(function(){return p}));var n=r("rePB"),c=r("Ff2n"),a=(r("q1tI"),r("7ljp")),o=r("W10S");function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var u={Title:"Google tag manager \u306e\u6982\u8981",Date:"2017-10-22T03:07:56+09:00",Draft:!1,__resourcePath:"post/seo/about-gtm/index.md",__scans:{},layout:"index"},s={frontMatter:u},b=o.a;function p(e){var t=e.components,r=Object(c.a)(e,["components"]);return Object(a.b)(b,l(l(l({},s),r),{},{components:t,mdxType:"MDXLayout"}),Object(a.b)("p",null,"Google tag manager \u306f HTML \u30bf\u30b0\u3092\u52d5\u7684\u306b\u633f\u5165\u3059\u308b\u30b5\u30fc\u30d3\u30b9\u3002"),Object(a.b)("ul",null,Object(a.b)("li",{parentName:"ul"},"\u65e2\u5b58\u306e HTML \u306b\u624b\u3092\u52a0\u3048\u306a\u304f\u3066\u3082\u7ba1\u7406\u753b\u9762\u304b\u3089\u8ffd\u52a0\u3067\u304d\u308b"),Object(a.b)("li",{parentName:"ul"},"\u633f\u5165\u3059\u308b HTML \u30bf\u30b0\u3092\u4e00\u5143\u306b\u7ba1\u7406\u3067\u304d\u308b")),Object(a.b)("p",null,"\u306e\u304c\u5f37\u307f\u3002"),Object(a.b)("p",null,"\u633f\u5165\u3067\u304d\u308b HTML \u30bf\u30b0\u306e\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u304c\u7528\u610f\u3055\u308c\u3066\u304a\u308a"),Object(a.b)("ul",null,Object(a.b)("li",{parentName:"ul"},"google analytics"),Object(a.b)("li",{parentName:"ul"},"doubleclick")),Object(a.b)("p",null,"\u306a\u3069\u306f\u3059\u3050\u306b\u958b\u59cb\u3067\u304d\u308b\u3002"),Object(a.b)("p",null,"\u30ab\u30b9\u30bf\u30e0\u306e HTML \u3092\u633f\u5165\u3059\u308b\u3053\u3068\u3082\u53ef\u80fd\u3002"),Object(a.b)("h3",null,"Reference"),Object(a.b)("ul",null,Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"https://www.google.com/intl/ja/analytics/tag-manager/"}),"https://www.google.com/intl/ja/analytics/tag-manager/"))))}p.isMDXComponent=!0},fP6U:function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/seo/about-gtm",function(){return r("X5VI")}])},rePB:function(e,t,r){"use strict";function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}r.d(t,"a",(function(){return n}))},wEQj:function(e,t,r){"use strict";r.d(t,"a",(function(){return a}));var n=r("nKUr"),c=r("+VcZ");function a(e){var t=e.title,r=e.date,a=e.tags,o=void 0===a?[]:a,i=e.children;return Object(n.jsx)("div",{className:"article card",children:Object(n.jsxs)("div",{className:"card-content",children:[Object(n.jsx)("div",{className:"article-title",children:Object(n.jsxs)("div",{className:"has-text-centered",children:[Object(n.jsx)("p",{className:"title",children:t}),Object(n.jsx)(c.a,{tags:o,date:r})]})}),Object(n.jsx)("div",{className:"content article-body pt-8",children:i})]})})}}},[["fP6U",0,2,1,3]]]);