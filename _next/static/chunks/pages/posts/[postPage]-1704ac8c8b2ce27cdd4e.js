_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[40],{"9vdj":function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/posts/[postPage]",function(){return r("TRD8")}])},NMsW:function(e,t,r){"use strict";r.d(t,"a",(function(){return b}));var n=r("rePB"),a=r("nKUr"),c=r("YFqc"),s=r.n(c),o=r("Y/jM"),i=r("i9nm");function j(e){var t=e.title,r=e.slug,n=e.date,c=e.tags,j=void 0===c?[]:c;return Object(a.jsxs)(o.a,{children:[Object(a.jsx)("h4",{className:"py-2",children:Object(a.jsx)(s.a,{href:"/".concat(r),children:t})}),Object(a.jsx)(i.a,{tags:j,date:n})]})}function u(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?u(Object(r),!0).forEach((function(t){Object(n.a)(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):u(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function b(e){var t=e.posts;return Object(a.jsx)("ul",{children:t.map((function(e){return Object(a.jsx)("li",{className:"pb-4",children:Object(a.jsx)(j,l({},e))},e.slug)}))})}},TRD8:function(e,t,r){"use strict";r.r(t),r.d(t,"__N_SSG",(function(){return j}));var n=r("nKUr"),a=r("g4pe"),c=r.n(a),s=r("uApM"),o=r("NMsW"),i=r("Ldh8");var j=!0;t.default=function(e){var t=e.siteName,r=e.page,a=e.pageSize,j=e.posts,u=e.postCount;return Object(n.jsxs)(i.a,{siteName:t,children:[Object(n.jsx)(c.a,{children:Object(n.jsxs)("title",{children:["Posts by page ",r," | ",t]})}),Object(n.jsx)(o.a,{posts:j}),Object(n.jsx)(s.a,{hrefFormat:"/posts/{page}/",itemCount:u,page:r,pageSize:a})]})}},"Y/jM":function(e,t,r){"use strict";r.d(t,"a",(function(){return a}));var n=r("nKUr");function a(e){var t=e.children;return Object(n.jsx)("div",{className:"bg-white px-4 py-4 rounded-md shadow-md",children:t})}},i9nm:function(e,t,r){"use strict";r.d(t,"a",(function(){return i}));var n=r("nKUr"),a=r("YFqc"),c=r.n(a),s=r("C6yQ");function o(e){var t=Math.round(((new Date).getTime()-e.getTime())/1e3),r=3600,n=86400,a=30*n,c=365*n;return t<30?"just then":t<60?t+" seconds ago":t<120?"a minute ago":t<r?Math.floor(t/60)+" minutes ago":1===Math.floor(t/r)?"1 hour ago":t<n?Math.floor(t/r)+" hours ago":t<2*n?"yesterday":t<a?Math.floor(t/n)+" days ago":1===Math.floor(t/a)?"a month ago":t<c?Math.floor(t/a)+" months ago":1===Math.floor(t/c)?"a year ago":Math.floor(t/c)+" years ago"}function i(e){var t=e.tags,r=e.date;return Object(n.jsxs)("div",{className:"flex justify-end",children:[t.map((function(e){return Object(n.jsx)(s.a,{className:"bg-blue-200 border-blue-200 text-blue-600",children:Object(n.jsx)(c.a,{href:"/tag/".concat(e,"/posts/1/"),children:e})},e)})),Object(n.jsx)(s.a,{className:"bg-gray-200 border-gray-200 text-gray-600",children:o(new Date(r))})]})}},rePB:function(e,t,r){"use strict";function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}r.d(t,"a",(function(){return n}))},uApM:function(e,t,r){"use strict";r.d(t,"a",(function(){return o}));var n=r("nKUr"),a=r("YFqc"),c=r.n(a);function s(e){var t=e.hrefFormat,r=e.page;return Object(n.jsx)("span",{className:"border-gray-100 bg-gray-200 text-gray-600 px-4 py-3 border-2 rounded-sm",children:Object(n.jsx)(c.a,{href:t.replace("{page}",String(r)),children:String(r)})})}function o(e){var t=e.hrefFormat,r=e.itemCount,a=e.page,c=e.pageSize,o=a-1,i=a+1,j=Math.ceil(r/c);return Object(n.jsx)("nav",{children:Object(n.jsxs)("ul",{className:"flex justify-center space-x-2 py-2",children:[1!==a?Object(n.jsx)("li",{children:Object(n.jsx)(s,{hrefFormat:t,page:1})}):Object(n.jsx)(n.Fragment,{}),a-1>2?Object(n.jsx)("li",{children:Object(n.jsx)("span",{className:"px-2 text-gray-400",children:"\u2026"})}):Object(n.jsx)(n.Fragment,{}),a-1>1?Object(n.jsx)("li",{children:Object(n.jsx)(s,{hrefFormat:t,page:o})}):Object(n.jsx)(n.Fragment,{}),Object(n.jsx)("li",{children:Object(n.jsx)("span",{className:"border-blue-100 bg-blue-200 text-blue-400 px-4 py-3 border-2 rounded-sm",children:a})}),j-a>1?Object(n.jsx)("li",{children:Object(n.jsx)(s,{hrefFormat:t,page:i})}):Object(n.jsx)(n.Fragment,{}),j-a>2?Object(n.jsx)("li",{children:Object(n.jsx)("span",{className:"px-2 text-gray-400",children:"\u2026"})}):Object(n.jsx)(n.Fragment,{}),j!==a?Object(n.jsx)("li",{children:Object(n.jsx)(s,{hrefFormat:t,page:j})}):Object(n.jsx)(n.Fragment,{})]})})}}},[["9vdj",0,2,1,3]]]);