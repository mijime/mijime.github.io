_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[38],{"7ljp":function(e,t,r){"use strict";r.d(t,"a",(function(){return b})),r.d(t,"b",(function(){return O}));var n=r("q1tI"),c=r.n(n);function o(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){o(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function u(e,t){if(null==e)return{};var r,n,c=function(e,t){if(null==e)return{};var r,n,c={},o=Object.keys(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||(c[r]=e[r]);return c}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(c[r]=e[r])}return c}var l=c.a.createContext({}),s=function(e){var t=c.a.useContext(l),r=t;return e&&(r="function"===typeof e?e(t):i(i({},t),e)),r},b=function(e){var t=s(e.components);return c.a.createElement(l.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return c.a.createElement(c.a.Fragment,{},t)}},f=c.a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,o=e.originalType,a=e.parentName,l=u(e,["components","mdxType","originalType","parentName"]),b=s(r),f=n,O=b["".concat(a,".").concat(f)]||b[f]||p[f]||o;return r?c.a.createElement(O,i(i({ref:t},l),{},{components:r})):c.a.createElement(O,i({ref:t},l))}));function O(e,t){var r=arguments,n=t&&t.mdxType;if("string"===typeof e||n){var o=r.length,a=new Array(o);a[0]=f;var i={};for(var u in t)hasOwnProperty.call(t,u)&&(i[u]=t[u]);i.originalType=e,i.mdxType="string"===typeof e?e:n,a[1]=i;for(var l=2;l<o;l++)a[l]=r[l];return c.a.createElement.apply(null,a)}return c.a.createElement.apply(null,r)}f.displayName="MDXCreateElement"},Ff2n:function(e,t,r){"use strict";function n(e,t){if(null==e)return{};var r,n,c=function(e,t){if(null==e)return{};var r,n,c={},o=Object.keys(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||(c[r]=e[r]);return c}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(c[r]=e[r])}return c}r.d(t,"a",(function(){return n}))},TJE1:function(e,t,r){"use strict";r.d(t,"a",(function(){return j}));var n=r("rePB"),c=r("nKUr"),o=r("g4pe"),a=r.n(o),i=r("ZOjW"),u=function(){return i.d},l=r("WL+Y");function s(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function b(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?s(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):s(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var p=r("Ldh8");function f(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function O(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?f(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):f(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function j(e){var t=e.frontMatter,r=e.children,n=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return b(b({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t),o=u();return Object(c.jsxs)(p.a,{siteName:o,children:[Object(c.jsx)(a.a,{children:Object(c.jsxs)("title",{children:[n.title," | ",o]})}),Object(c.jsx)(l.a,O(O({},n),{},{children:r}))]})}},"WL+Y":function(e,t,r){"use strict";r.d(t,"a",(function(){return o}));var n=r("nKUr"),c=r("i9nm");function o(e){var t=e.title,r=e.date,o=e.tags,a=void 0===o?[]:o,i=e.children;return Object(n.jsx)("div",{className:"article",children:Object(n.jsx)("div",{className:"card",children:Object(n.jsxs)("div",{className:"card-content",children:[Object(n.jsxs)("div",{className:"article-title",children:[Object(n.jsx)("div",{className:"has-text-centered",children:Object(n.jsx)("p",{className:"title",children:t})}),Object(n.jsx)(c.a,{tags:a,date:r})]}),Object(n.jsx)("div",{className:"article-body pt-8",children:Object(n.jsx)("div",{className:"content",children:i})})]})})})}},X5VI:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return l})),r.d(t,"default",(function(){return p}));var n=r("rePB"),c=r("Ff2n"),o=(r("q1tI"),r("7ljp")),a=r("TJE1");function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function u(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var l={Title:"Google tag manager \u306e\u6982\u8981",Date:"2017-10-22T03:07:56+09:00",Draft:!1,__resourcePath:"post/seo/about-gtm/index.md",__scans:{},layout:"index"},s={frontMatter:l},b=a.a;function p(e){var t=e.components,r=Object(c.a)(e,["components"]);return Object(o.b)(b,u(u(u({},s),r),{},{components:t,mdxType:"MDXLayout"}),Object(o.b)("p",null,"Google tag manager \u306f HTML \u30bf\u30b0\u3092\u52d5\u7684\u306b\u633f\u5165\u3059\u308b\u30b5\u30fc\u30d3\u30b9\u3002"),Object(o.b)("ul",null,Object(o.b)("li",{parentName:"ul"},"\u65e2\u5b58\u306e HTML \u306b\u624b\u3092\u52a0\u3048\u306a\u304f\u3066\u3082\u7ba1\u7406\u753b\u9762\u304b\u3089\u8ffd\u52a0\u3067\u304d\u308b"),Object(o.b)("li",{parentName:"ul"},"\u633f\u5165\u3059\u308b HTML \u30bf\u30b0\u3092\u4e00\u5143\u306b\u7ba1\u7406\u3067\u304d\u308b")),Object(o.b)("p",null,"\u306e\u304c\u5f37\u307f\u3002"),Object(o.b)("p",null,"\u633f\u5165\u3067\u304d\u308b HTML \u30bf\u30b0\u306e\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u304c\u7528\u610f\u3055\u308c\u3066\u304a\u308a"),Object(o.b)("ul",null,Object(o.b)("li",{parentName:"ul"},"google analytics"),Object(o.b)("li",{parentName:"ul"},"doubleclick")),Object(o.b)("p",null,"\u306a\u3069\u306f\u3059\u3050\u306b\u958b\u59cb\u3067\u304d\u308b\u3002"),Object(o.b)("p",null,"\u30ab\u30b9\u30bf\u30e0\u306e HTML \u3092\u633f\u5165\u3059\u308b\u3053\u3068\u3082\u53ef\u80fd\u3002"),Object(o.b)("h3",null,"Reference"),Object(o.b)("ul",null,Object(o.b)("li",{parentName:"ul"},Object(o.b)("a",u({parentName:"li"},{href:"https://www.google.com/intl/ja/analytics/tag-manager/"}),"https://www.google.com/intl/ja/analytics/tag-manager/"))))}p.isMDXComponent=!0},ZOjW:function(e,t,r){"use strict";r.d(t,"b",(function(){return n})),r.d(t,"d",(function(){return c})),r.d(t,"c",(function(){return o})),r.d(t,"e",(function(){return a})),r.d(t,"a",(function(){return i})),r.d(t,"f",(function(){return u}));var n="ja",c="My snippets",o=5,a="https://mijime.github.io",i="UA-46554348-4",u="7gVj5rzyozu0vYcQMLhIGr4g-WWyJn4R22RgeYqQdS0"},fP6U:function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/seo/about-gtm",function(){return r("X5VI")}])},i9nm:function(e,t,r){"use strict";r.d(t,"a",(function(){return o}));var n=r("nKUr"),c=r("C6yQ");function o(e){var t=e.tags,r=e.date;return Object(n.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(n.jsx)(c.a,{tag:e},e)})),Object(n.jsx)("span",{className:"tag is-rounded",children:r})]})}},rePB:function(e,t,r){"use strict";function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}r.d(t,"a",(function(){return n}))}},[["fP6U",0,2,1,3]]]);