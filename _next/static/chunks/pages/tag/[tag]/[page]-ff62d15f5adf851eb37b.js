_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[41],{"+VcZ":function(e,t,n){"use strict";n.d(t,"a",(function(){return s}));var c=n("nKUr"),r=n("YFqc"),a=n.n(r);function i(e){var t=e.tag;return Object(c.jsx)("span",{className:"tag is-rounded is-info",children:Object(c.jsx)(a.a,{href:"/tag/".concat(t,"/1"),children:t})})}function s(e){var t=e.tags,n=e.date;return Object(c.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(c.jsx)(i,{tag:e},e)})),Object(c.jsx)("span",{className:"tag is-rounded",children:n})]})}},"4nyh":function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/tag/[tag]/[page]",function(){return n("k3kS")}])},K2nc:function(e,t,n){"use strict";n.d(t,"a",(function(){return o}));var c=n("rePB"),r=n("nKUr"),a=n("YFqc"),i=n.n(a),s=n("+VcZ");function j(e){var t=e.title,n=e.slug,c=e.date,a=e.tags,j=void 0===a?[]:a;return Object(r.jsx)("div",{className:"block card",children:Object(r.jsxs)("div",{className:"card-content is-small",children:[Object(r.jsx)(i.a,{href:"/post/".concat(n),children:t}),Object(r.jsx)(s.a,{tags:j,date:c})]})})}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);t&&(c=c.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,c)}return n}function o(e){var t=e.posts;return Object(r.jsx)("div",{className:"articles",children:t.map((function(e){return Object(r.jsx)(j,function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){Object(c.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}({},e),e.slug)}))})}},k3kS:function(e,t,n){"use strict";n.r(t),n.d(t,"__N_SSG",(function(){return l})),n.d(t,"default",(function(){return o}));var c=n("nKUr"),r=n("g4pe"),a=n.n(r),i=n("MMqm"),s=n("K2nc"),j=n("tJ80"),l=!0;function o(e){var t=e.posts,n=e.postCount,r=e.page,l=e.tagName;return Object(c.jsxs)(c.Fragment,{children:[Object(c.jsx)(a.a,{children:Object(c.jsxs)("title",{children:[l," | ",i.c]})}),Object(c.jsx)(s.a,{posts:t}),Object(c.jsx)(j.a,{linkPrefix:"/tag/".concat(l),page:r,itemCount:n})]})}},rePB:function(e,t,n){"use strict";function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return c}))},tJ80:function(e,t,n){"use strict";n.d(t,"a",(function(){return s}));var c=n("nKUr"),r=n("YFqc"),a=n.n(r),i=n("MMqm");function s(e){var t=e.linkPrefix,n=e.page,r=e.itemCount,s=n-1,j=n+1,l=Math.ceil(r/i.b);return Object(c.jsx)("nav",{className:"pagination is-centered pt-4",role:"navigation",children:Object(c.jsxs)("ul",{className:"pagination-list",children:[1!==n?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(a.a,{href:"".concat(t,"/").concat(1),children:"1"})})}):Object(c.jsx)(c.Fragment,{}),n-1>2?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-ellipsis",children:"\u2026"})}):Object(c.jsx)(c.Fragment,{}),n-1>1?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(a.a,{href:"".concat(t,"/").concat(s),children:""+s})})}):Object(c.jsx)(c.Fragment,{}),Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link is-current",children:n})}),l-n>1?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(a.a,{href:"".concat(t,"/").concat(j),children:""+j})})}):Object(c.jsx)(c.Fragment,{}),l-n>2?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-ellipsis",children:"\u2026"})}):Object(c.jsx)(c.Fragment,{}),l!==n?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(a.a,{href:"".concat(t,"/").concat(l),children:""+l})})}):Object(c.jsx)(c.Fragment,{})]})})}}},[["4nyh",0,2,1,3]]]);