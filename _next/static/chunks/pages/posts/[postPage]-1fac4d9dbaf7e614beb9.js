_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[40],{"+VcZ":function(e,t,n){"use strict";n.d(t,"a",(function(){return s}));var c=n("nKUr"),r=n("rfoC");function s(e){var t=e.tags,n=e.date;return Object(c.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(c.jsx)(r.a,{tag:e},e)})),Object(c.jsx)("span",{className:"tag is-rounded",children:n})]})}},"9vdj":function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/posts/[postPage]",function(){return n("TRD8")}])},K2nc:function(e,t,n){"use strict";n.d(t,"a",(function(){return l}));var c=n("rePB"),r=n("nKUr"),s=n("YFqc"),i=n.n(s),a=n("+VcZ");function j(e){var t=e.title,n=e.slug,c=e.date,s=e.tags,j=void 0===s?[]:s;return Object(r.jsx)("div",{className:"block card",children:Object(r.jsxs)("div",{className:"card-content is-small",children:[Object(r.jsx)(i.a,{href:"/post/".concat(n),children:t}),Object(r.jsx)(a.a,{tags:j,date:c})]})})}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);t&&(c=c.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,c)}return n}function l(e){var t=e.posts;return Object(r.jsx)("div",{className:"articles",children:t.map((function(e){return Object(r.jsx)(j,function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){Object(c.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}({},e),e.slug)}))})}},TRD8:function(e,t,n){"use strict";n.r(t),n.d(t,"__N_SSG",(function(){return o})),n.d(t,"default",(function(){return l}));var c=n("nKUr"),r=n("g4pe"),s=n.n(r),i=n("MMqm"),a=n("K2nc"),j=n("tJ80"),o=!0;function l(e){var t=e.posts,n=e.postCount,r=e.page;return Object(c.jsxs)(c.Fragment,{children:[Object(c.jsx)(s.a,{children:Object(c.jsxs)("title",{children:["Posts: ",r," | ",i.c]})}),Object(c.jsx)(a.a,{posts:t}),Object(c.jsx)(j.a,{linkPrefix:"/posts",itemCount:n,page:r,pageSize:i.b})]})}},rePB:function(e,t,n){"use strict";function c(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return c}))},tJ80:function(e,t,n){"use strict";n.d(t,"a",(function(){return i}));var c=n("nKUr"),r=n("YFqc"),s=n.n(r);function i(e){var t=e.linkPrefix,n=e.itemCount,r=e.page,i=e.pageSize,a=r-1,j=r+1,o=Math.ceil(n/i);return Object(c.jsx)("nav",{className:"pagination is-centered pt-4",role:"navigation",children:Object(c.jsxs)("ul",{className:"pagination-list",children:[1!==r?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(s.a,{href:"".concat(t,"/").concat(1),children:"1"})})}):Object(c.jsx)(c.Fragment,{}),r-1>2?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-ellipsis",children:"\u2026"})}):Object(c.jsx)(c.Fragment,{}),r-1>1?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(s.a,{href:"".concat(t,"/").concat(a),children:""+a})})}):Object(c.jsx)(c.Fragment,{}),Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link is-current",children:r})}),o-r>1?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(s.a,{href:"".concat(t,"/").concat(j),children:""+j})})}):Object(c.jsx)(c.Fragment,{}),o-r>2?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-ellipsis",children:"\u2026"})}):Object(c.jsx)(c.Fragment,{}),o!==r?Object(c.jsx)("li",{children:Object(c.jsx)("span",{className:"pagination-link",children:Object(c.jsx)(s.a,{href:"".concat(t,"/").concat(o),children:""+o})})}):Object(c.jsx)(c.Fragment,{})]})})}}},[["9vdj",0,2,1,3]]]);