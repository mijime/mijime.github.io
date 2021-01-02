_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[17],{"43J5":function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return l})),n.d(t,"default",(function(){return u}));var r=n("rePB"),c=n("Ff2n"),a=(n("q1tI"),n("7ljp")),s=n("TJE1");function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var l={Title:"\u30ea\u30e2\u30fc\u30c8\u30ef\u30fc\u30af\u7528\u306e\u74b0\u5883\u3092\u69cb\u7bc9\u3059\u308b\u3068\u304d\u306f\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u5206\u3051\u308b\u3068\u3088\u3055\u305d\u3046",Draft:!1,Tags:["development"],Date:"2019-02-16T14:56:38+09:00",__resourcePath:"post/2019/02/16/index.md",__scans:{},layout:"index"},b={frontMatter:l},p=s.a;function u(e){var t=e.components,n=Object(c.a)(e,["components"]);return Object(a.b)(p,i(i(i({},b),n),{},{components:t,mdxType:"MDXLayout"}),Object(a.b)("p",null,"\u6700\u8fd1\u30ea\u30e2\u30fc\u30c8\u7528\u306e\u74b0\u5883\u3092\u79c1\u7269\u306e PC \u306b\u69cb\u7bc9\u3057\u305f\u3002"),Object(a.b)("p",null,"\u305d\u306e\u6642\u306b\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u5206\u3051\u3066\u3001\u30d6\u30c3\u30af\u30de\u30fc\u30af\u3068\u304b\u4f5c\u696d\u74b0\u5883\u3092\u6df7\u3056\u3089\u306a\u3044\u3088\u3046\u306b\u3057\u305f\u304c\n\u8272\u3005\u3084\u308b\u3053\u3068\u304c\u3042\u3063\u305f\u306e\u3067\u30e1\u30e2\u3063\u3066\u304a\u304f"),Object(a.b)("h2",null,"brew \u306e\u8a2d\u5b9a\u3092\u5206\u3051\u308b"),Object(a.b)("p",null,"\u30c7\u30d5\u30a9\u30eb\u30c8\u3060\u3068 ",Object(a.b)("inlineCode",{parentName:"p"},"/usr/local")," \u306b\u5168\u3066\u5165\u3063\u3066\u30a2\u30ab\u30a6\u30f3\u30c8\u5171\u6709\u306b\u306a\u3063\u3066\u3057\u307e\u3046\u3002"),Object(a.b)("p",null,"\u305d\u3046\u3059\u308b\u3068\u66f4\u65b0\u3059\u308b\u305f\u3073\u306b",Object(a.b)("inlineCode",{parentName:"p"},"sudo"),"\u6a29\u9650\u3092\u6c42\u3081\u3089\u308c\u3066\u3057\u307e\u3046\u305f\u3081\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u6bce\u306b ",Object(a.b)("inlineCode",{parentName:"p"},"brew")," \u3092\u8a2d\u5b9a\u3057\u305f\u3002"),Object(a.b)("p",null,Object(a.b)("inlineCode",{parentName:"p"},"brew")," \u3092\u5225\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u306b\u7f6e\u3051\u3070\u3001\u52dd\u624b\u306b",Object(a.b)("inlineCode",{parentName:"p"},"BREW_HOME"),"\u3092\u89aa\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u306b\u8a2d\u5b9a\u3057\u3066\u304f\u308c\u308b\u3002"),Object(a.b)("pre",null,Object(a.b)("code",i({parentName:"pre"},{className:"hljs language-bash"}),"mkdir -p ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-string"}),'"',Object(a.b)("span",i({parentName:"span"},{className:"hljs-variable"}),"${HOME}"),'/.brew"'),"\ncurl -L https://github.com/Homebrew/brew/archive/master.tar.gz \\\n         | tar xz --strip-components=1 -C ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-string"}),'"',Object(a.b)("span",i({parentName:"span"},{className:"hljs-variable"}),"${HOME}"),'/.brew"'),"\n",Object(a.b)("span",i({parentName:"code"},{className:"hljs-built_in"}),"export")," PATH=",Object(a.b)("span",i({parentName:"code"},{className:"hljs-variable"}),"${HOME}"),"/.brew/bin:",Object(a.b)("span",i({parentName:"code"},{className:"hljs-variable"}),"${PATH}"))),Object(a.b)("h2",null,"dotfiles \u3092\u5171\u6709\u3059\u308b"),Object(a.b)("p",null,"\u4f1a\u793e\u7528\u306e Github \u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u65b0\u898f\u3067\u4f5c\u6210\u3057\u305f\u304c\u3001\u3055\u3059\u304c\u306b dotfiles \u306f\u5e38\u3005\u66f4\u65b0\u3059\u308b\u306e\u3067\u3001\n\u540c\u3058\u3082\u306e\u3092\u4f7f\u3044\u305f\u3044\u3002"),Object(a.b)("p",null,Object(a.b)("inlineCode",{parentName:"p"},"git config core.sshCommand"),"\u3067\u500b\u5225\u306b\u9375\u3092\u6307\u5b9a\u3057\u305f\u3002"),Object(a.b)("pre",null,Object(a.b)("code",i({parentName:"pre"},{className:"hljs language-bash"}),"mkdir -p ~/.ssh/projects/github.com/\nssh-keygen -t ed25519 -N ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-string"}),'""')," -C ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-string"}),'""')," -f ~/.ssh/projects/github.com/",Object(a.b)("span",i({parentName:"code"},{className:"hljs-variable"}),"${USER}"),"_id_ed25519\ngit config core.sshCommand ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-string"}),'"ssh -i ~/.ssh/projects/github.com/',Object(a.b)("span",i({parentName:"span"},{className:"hljs-variable"}),"${USER}"),'_id_ed25519"'))),Object(a.b)("h2",null,"PS1 \u306b icon \u3092\u8a2d\u5b9a\u3059\u308b"),Object(a.b)("p",null,Object(a.b)("inlineCode",{parentName:"p"},"su")," \u3067\u96d1\u306b\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u5f80\u5fa9\u3059\u308b\u3053\u3068\u304c\u3042\u308b\u3093\u3060\u3051\u3069\u3082\u3001\u540d\u524d\u306f\u9055\u3048\u3069\u8272\u5473\u304c\u307b\u307c\u307b\u307c\u540c\u3058\u306a\u306e\u3067\n'\u3042\u308c\u3001\u3069\u3063\u3061\u3067\u4f5c\u696d\u3057\u3066\u3044\u308b\u3093\u3060\u3063\u3051\u2026'\u7684\u306a\u3053\u3068\u304c\u6642\u3005\u8d77\u3053\u308b"),Object(a.b)("p",null,"\u540d\u524d\u304b\u3089\u30e9\u30f3\u30c0\u30e0\u306b\u7d75\u6587\u5b57\u3092\u8a2d\u5b9a\u3057\u3066\u307f\u305f\u3002"),Object(a.b)("pre",null,Object(a.b)("code",i({parentName:"pre"},{className:"hljs language-bash"}),"icon=$(",Object(a.b)("span",i({parentName:"code"},{className:"hljs-built_in"}),"echo")," -ne $((",Object(a.b)("span",i({parentName:"code"},{className:"hljs-number"}),"127744")," + ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-number"}),"16"),"#$(whoami|md5sum|cut -c-",Object(a.b)("span",i({parentName:"code"},{className:"hljs-number"}),"8"),")%",Object(a.b)("span",i({parentName:"code"},{className:"hljs-number"}),"512"),"))|awk ",Object(a.b)("span",i({parentName:"code"},{className:"hljs-string"}),"'{printf(\"%3c\",$1)}'"),")")),Object(a.b)("p",null,"\u3053\u308c\u3092\u9069\u5f53\u306b PS1 \u306b\u5165\u308c\u3066\u304a\u3051\u3070\u3001\u9593\u9055\u3048\u306b\u304f\u304f\u306a\u308b"),Object(a.b)("h2",null,"\u30bb\u30ad\u30e5\u30a2\u306a\u30c7\u30fc\u30bf\u3092 GoogleDrive \u306b\u3044\u308c\u3066 Git \u3067\u7ba1\u7406\u3059\u308b"),Object(a.b)("p",null,"\u3060\u3044\u3076 Bad Practice \u306a\u6c17\u304c\u3059\u308b\u304c\u3001\u30d1\u30b9\u30ef\u30fc\u30c9\u3068\u304b ssh-key \u3068\u304b\u306f\u5168\u90e8 Git \u306e\u30ea\u30dd\u30b8\u30c8\u30ea\u306b\u3057\u3066\u7ba1\u7406\u3057\u3066\u3044\u308b\u3002"),Object(a.b)("p",null,"\u305d\u308c\u3092\u4e00\u65e6 GoogleDrive \u3068\u304b\u306b\u3076\u3061\u8fbc\u3093\u3067\u5225\u7aef\u672b\u306b\u6301\u3063\u3066\u304d\u305f\u3002"),Object(a.b)("p",null,"\u3055\u3059\u304c\u306b\u5185\u5bb9\u304c\u5185\u5bb9\u306a\u306e\u3067\u3001",Object(a.b)("inlineCode",{parentName:"p"},"git encrypt")," \u30b3\u30de\u30f3\u30c9\u3092\u4f5c\u3063\u3066\u6697\u53f7\u5316\u3057\u3066\u307f\u305f"),Object(a.b)("p",null,Object(a.b)("a",i({parentName:"p"},{href:"https://github.com/kojimat/git-encrypt"}),"https://github.com/kojimat/git-encrypt")))}u.isMDXComponent=!0},"7ljp":function(e,t,n){"use strict";n.d(t,"a",(function(){return p})),n.d(t,"b",(function(){return O}));var r=n("q1tI"),c=n.n(r);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,c=function(e,t){if(null==e)return{};var n,r,c={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(c[n]=e[n]);return c}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(c[n]=e[n])}return c}var l=c.a.createContext({}),b=function(e){var t=c.a.useContext(l),n=t;return e&&(n="function"===typeof e?e(t):o(o({},t),e)),n},p=function(e){var t=b(e.components);return c.a.createElement(l.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return c.a.createElement(c.a.Fragment,{},t)}},j=c.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,a=e.originalType,s=e.parentName,l=i(e,["components","mdxType","originalType","parentName"]),p=b(n),j=r,O=p["".concat(s,".").concat(j)]||p[j]||u[j]||a;return n?c.a.createElement(O,o(o({ref:t},l),{},{components:n})):c.a.createElement(O,o({ref:t},l))}));function O(e,t){var n=arguments,r=t&&t.mdxType;if("string"===typeof e||r){var a=n.length,s=new Array(a);s[0]=j;var o={};for(var i in t)hasOwnProperty.call(t,i)&&(o[i]=t[i]);o.originalType=e,o.mdxType="string"===typeof e?e:r,s[1]=o;for(var l=2;l<a;l++)s[l]=n[l];return c.a.createElement.apply(null,s)}return c.a.createElement.apply(null,n)}j.displayName="MDXCreateElement"},Ff2n:function(e,t,n){"use strict";function r(e,t){if(null==e)return{};var n,r,c=function(e,t){if(null==e)return{};var n,r,c={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(c[n]=e[n]);return c}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(c[n]=e[n])}return c}n.d(t,"a",(function(){return r}))},TJE1:function(e,t,n){"use strict";n.d(t,"a",(function(){return f}));var r=n("rePB"),c=n("nKUr"),a=n("g4pe"),s=n.n(a),o=n("ZOjW"),i=function(){return o.d},l=n("WL+Y");function b(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function p(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?b(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):b(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var u=n("Ldh8");function j(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function O(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?j(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):j(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function f(e){var t=e.frontMatter,n=e.children,r=function(e){var t={title:e.title||e.Title||"",description:e.description||e.Description||"",date:e.date||e.Date||(new Date).toISOString(),tags:e.tags||e.Tags||[],draft:!!e.draft||!!e.Draft};return p(p({},t),{},{date:new Date(t.date).toISOString(),tags:t.tags.map((function(e){return e.toLowerCase()}))})}(t),a=i();return Object(c.jsxs)(u.a,{siteName:a,children:[Object(c.jsx)(s.a,{children:Object(c.jsxs)("title",{children:[r.title," | ",a]})}),Object(c.jsx)(l.a,O(O({},r),{},{children:n}))]})}},"WL+Y":function(e,t,n){"use strict";n.d(t,"a",(function(){return a}));var r=n("nKUr"),c=n("i9nm");function a(e){var t=e.title,n=e.date,a=e.tags,s=void 0===a?[]:a,o=e.children;return Object(r.jsx)("div",{className:"article",children:Object(r.jsx)("div",{className:"card",children:Object(r.jsxs)("div",{className:"card-content",children:[Object(r.jsxs)("div",{className:"article-title",children:[Object(r.jsx)("div",{className:"has-text-centered",children:Object(r.jsx)("p",{className:"title",children:t})}),Object(r.jsx)(c.a,{tags:s,date:n})]}),Object(r.jsx)("div",{className:"article-body pt-8",children:Object(r.jsx)("div",{className:"content",children:o})})]})})})}},ZOjW:function(e,t,n){"use strict";n.d(t,"b",(function(){return r})),n.d(t,"d",(function(){return c})),n.d(t,"c",(function(){return a})),n.d(t,"e",(function(){return s})),n.d(t,"a",(function(){return o})),n.d(t,"f",(function(){return i}));var r="ja",c="My snippets",a=5,s="https://mijime.github.io",o="UA-46554348-4",i="7gVj5rzyozu0vYcQMLhIGr4g-WWyJn4R22RgeYqQdS0"},i9nm:function(e,t,n){"use strict";n.d(t,"a",(function(){return a}));var r=n("nKUr"),c=n("C6yQ");function a(e){var t=e.tags,n=e.date;return Object(r.jsxs)("div",{className:"tags level-item is-right has-addons",children:[t.map((function(e){return Object(r.jsx)(c.a,{tag:e},e)})),Object(r.jsx)("span",{className:"tag is-rounded",children:n})]})}},rePB:function(e,t,n){"use strict";function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return r}))},uDU1:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/2019/02/16",function(){return n("43J5")}])}},[["uDU1",0,2,1,3]]]);