(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[4],{C6yQ:function(e,a,t){"use strict";t.d(a,"a",(function(){return s}));var n=t("q1tI"),r=t.n(n),o=t("TSYQ"),i=t.n(o),l=t("Mvn+"),u=t.n(l),c=r.a.createElement;function s(e){var a=e.className,t=e.children;return c("span",{className:i()(u.a.tag,a)},t)}},GHa4:function(e,a,t){e.exports={navbarHeader:"navbar-header_navbarHeader__2QEfN",navbarHeaderTitle:"navbar-header_navbarHeaderTitle__ucqZ4"}},LcSJ:function(e,a,t){e.exports={defaultLayout:"default_defaultLayout__3Vqq_",defaultLayoutContent:"default_defaultLayoutContent__1-Dol"}},Ldh8:function(e,a,t){"use strict";t.d(a,"a",(function(){return m}));var n=t("q1tI"),r=t.n(n),o=t("TSYQ"),i=t.n(o),l=t("YFqc"),u=t.n(l),c=t("LcSJ"),s=t.n(c),f=t("GHa4"),p=t.n(f),v=r.a.createElement;function g(e){var a=e.children;return v("section",{className:i()(p.a.navbarHeader)},v("h3",{className:i()(p.a.navbarHeaderTitle)},a))}var d=r.a.createElement;function m(e){var a=e.siteName,t=e.children;return d("div",{className:i()(s.a.defaultLayout)},d(g,null,d(u.a,{href:"/"},a)),d("div",{className:i()(s.a.defaultLayoutContent)},t))}},"Mvn+":function(e,a,t){e.exports={tag:"tag_tag__35zkz"}},N4mq:function(e,a,t){e.exports={tagList:"tag-list_tagList__JhjSf",tagLink:"tag-list_tagLink__1TsNW",tagDate:"tag-list_tagDate__x9jrl"}},NMsW:function(e,a,t){"use strict";t.d(a,"a",(function(){return _}));var n=t("q1tI"),r=t.n(n),o=t("TSYQ"),i=t.n(o),l=t("VM3A"),u=t.n(l),c=t("YFqc"),s=t.n(c),f=t("v3qr"),p=t.n(f),v=t("Y/jM"),g=t("i9nm"),d=r.a.createElement;function m(e){var a=e.title,t=e.slug,n=e.createdAt,r=e.tags,o=void 0===r?[]:r;return d(v.a,null,d("h4",{className:i()(p.a.title)},d(s.a,{href:"/".concat(t)},a)),d(g.a,{tags:o,createdAt:n}))}var h=r.a.createElement;function _(e){var a=e.posts;return h("ul",null,a.map((function(e){return h("li",{key:e.slug,className:i()(u.a.articleItem)},h(m,e))})))}},RYRg:function(e,a,t){e.exports={paginationLink:"pagination_paginationLink__3IzfV",paginationCurrentLink:"pagination_paginationCurrentLink__26Wt8",paginationEllip:"pagination_paginationEllip__2cUUM",pagination:"pagination_pagination__ksFHs"}},TSYQ:function(e,a,t){var n;!function(){"use strict";var t={}.hasOwnProperty;function r(){for(var e=[],a=0;a<arguments.length;a++){var n=arguments[a];if(n){var o=typeof n;if("string"===o||"number"===o)e.push(n);else if(Array.isArray(n)&&n.length){var i=r.apply(null,n);i&&e.push(i)}else if("object"===o)for(var l in n)t.call(n,l)&&n[l]&&e.push(l)}}return e.join(" ")}e.exports?(r.default=r,e.exports=r):void 0===(n=function(){return r}.apply(a,[]))||(e.exports=n)}()},VM3A:function(e,a,t){e.exports={articleItem:"article-list_articleItem__1I0vb"}},"Y/jM":function(e,a,t){"use strict";t.d(a,"a",(function(){return s}));var n=t("q1tI"),r=t.n(n),o=t("TSYQ"),i=t.n(o),l=t("tE44"),u=t.n(l),c=r.a.createElement;function s(e){var a=e.children;return c("div",{className:i()(u.a.card)},a)}},YFqc:function(e,a,t){e.exports=t("cTJO")},cTJO:function(e,a,t){"use strict";var n=t("J4zp"),r=t("284h");a.__esModule=!0,a.default=void 0;var o=r(t("q1tI")),i=t("elyg"),l=t("nOHt"),u=t("vNVm"),c={};function s(e,a,t,n){if(e&&(0,i.isLocalURL)(a)){e.prefetch(a,t,n).catch((function(e){0}));var r=n&&"undefined"!==typeof n.locale?n.locale:e&&e.locale;c[a+"%"+t+(r?"%"+r:"")]=!0}}var f=function(e){var a=!1!==e.prefetch,t=(0,l.useRouter)(),r=t&&t.pathname||"/",f=o.default.useMemo((function(){var a=(0,i.resolveHref)(r,e.href,!0),t=n(a,2),o=t[0],l=t[1];return{href:o,as:e.as?(0,i.resolveHref)(r,e.as):l||o}}),[r,e.href,e.as]),p=f.href,v=f.as,g=e.children,d=e.replace,m=e.shallow,h=e.scroll,_=e.locale;"string"===typeof g&&(g=o.default.createElement("a",null,g));var y=o.Children.only(g),L=y&&"object"===typeof y&&y.ref,M=(0,u.useIntersection)({rootMargin:"200px"}),N=n(M,2),x=N[0],E=N[1],b=o.default.useCallback((function(e){x(e),L&&("function"===typeof L?L(e):"object"===typeof L&&(L.current=e))}),[L,x]);(0,o.useEffect)((function(){var e=E&&a&&(0,i.isLocalURL)(p),n="undefined"!==typeof _?_:t&&t.locale,r=c[p+"%"+v+(n?"%"+n:"")];e&&!r&&s(t,p,v,{locale:n})}),[v,p,E,_,a,t]);var q={ref:b,onClick:function(e){y.props&&"function"===typeof y.props.onClick&&y.props.onClick(e),e.defaultPrevented||function(e,a,t,n,r,o,l,u){("A"!==e.currentTarget.nodeName||!function(e){var a=e.currentTarget.target;return a&&"_self"!==a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.nativeEvent&&2===e.nativeEvent.which}(e)&&(0,i.isLocalURL)(t))&&(e.preventDefault(),null==l&&(l=n.indexOf("#")<0),a[r?"replace":"push"](t,n,{shallow:o,locale:u,scroll:l}).then((function(e){e&&l&&document.body.focus()})))}(e,t,p,v,d,m,h,_)},onMouseEnter:function(e){(0,i.isLocalURL)(p)&&(y.props&&"function"===typeof y.props.onMouseEnter&&y.props.onMouseEnter(e),s(t,p,v,{priority:!0}))}};if(e.passHref||"a"===y.type&&!("href"in y.props)){var k="undefined"!==typeof _?_:t&&t.locale,F=(0,i.getDomainLocale)(v,k,t&&t.locales,t&&t.domainLocales);q.href=F||(0,i.addBasePath)((0,i.addLocale)(v,k,t&&t.defaultLocale))}return o.default.cloneElement(y,q)};a.default=f},g4pe:function(e,a,t){e.exports=t("8Kt/")},i9nm:function(e,a,t){"use strict";t.d(a,"a",(function(){return h}));var n=t("q1tI"),r=t.n(n),o=t("TSYQ"),i=t.n(o),l=t("YFqc"),u=t.n(l),c=t("N4mq"),s=t.n(c),f=t("C6yQ"),p=3600,v=86400,g=30*v,d=365*v,m=r.a.createElement;function h(e){var a=e.tags,t=e.createdAt;return m("div",{className:i()(s.a.tagList)},a.map((function(e){return m(f.a,{key:e,className:i()(s.a.tagLink)},m(u.a,{href:"/tag/".concat(e,"/posts/1/")},e))})),m(f.a,{className:i()(s.a.tagDate)},function(e){for(var a=Math.round(((new Date).getTime()-e.getTime())/1e3),t=0,n=[{expr:a<30,value:"just then"},{expr:a<60,value:"".concat(a," seconds ago")},{expr:a<120,value:"a minute ago"},{expr:a<p,value:"".concat(Math.floor(a/60)," minutes ago")},{expr:1===Math.floor(a/p),value:"1 hour ago"},{expr:a<v,value:"".concat(Math.floor(a/p)," hours ago")},{expr:a<2*v,value:"yesterday"},{expr:a<g,value:"".concat(Math.floor(a/v)," days ago")},{expr:1===Math.floor(a/g),value:"a month ago"},{expr:a<d,value:"".concat(Math.floor(a/g)," months ago")},{expr:1===Math.floor(a/d),value:"a year ago"}];t<n.length;t++){var r=n[t],o=r.expr,i=r.value;if(o)return i}return"".concat(Math.floor(a/d)," years ago")}(new Date(t))))}},tE44:function(e,a,t){e.exports={card:"card_card__23baz"}},uApM:function(e,a,t){"use strict";var n=t("q1tI"),r=t.n(n),o=t("TSYQ"),i=t.n(o),l=t("YFqc"),u=t.n(l),c=t("RYRg"),s=t.n(c),f=r.a.createElement,p=function(e){var a=e.hrefFormat,t=e.page;return f("span",{className:i()(s.a.paginationLink)},f(u.a,{href:a.replace("{page}",String(t))},String(t)))};a.a=function(e){var a=e.hrefFormat,t=e.itemCount,n=e.page,o=e.pageSize,l=n-1,u=n+1,c=Math.ceil(t/o);return f("nav",null,f("ul",{className:i()(s.a.pagination)},1===n?f(r.a.Fragment,null):f("li",null,f(p,{hrefFormat:a,page:1})),n-1<=2?f(r.a.Fragment,null):f("li",null,f("span",{className:i()(s.a.paginationEllip)},"\u2026")),n-1<=1?f(r.a.Fragment,null):f("li",null,f(p,{hrefFormat:a,page:l})),f("li",null,f("span",{className:i()(s.a.paginationCurrentLink)},n)),c-n<=1?f(r.a.Fragment,null):f("li",null,f(p,{hrefFormat:a,page:u})),c-n<=2?f(r.a.Fragment,null):f("li",null,f("span",{className:i()(s.a.paginationEllip)},"\u2026")),c===n?f(r.a.Fragment,null):f("li",null,f(p,{hrefFormat:a,page:c}))))}},v3qr:function(e,a,t){e.exports={title:"article-item_title__2qoZ-"}},vNVm:function(e,a,t){"use strict";var n=t("J4zp"),r=t("TqRt");a.__esModule=!0,a.useIntersection=function(e){var a=e.rootMargin,t=e.disabled||!l,r=(0,o.useRef)(),c=(0,o.useState)(!1),s=n(c,2),f=s[0],p=s[1],v=(0,o.useCallback)((function(e){r.current&&(r.current(),r.current=void 0),t||f||e&&e.tagName&&(r.current=function(e,a,t){var n=function(e){var a=e.rootMargin||"",t=u.get(a);if(t)return t;var n=new Map,r=new IntersectionObserver((function(e){e.forEach((function(e){var a=n.get(e.target),t=e.isIntersecting||e.intersectionRatio>0;a&&t&&a(t)}))}),e);return u.set(a,t={id:a,observer:r,elements:n}),t}(t),r=n.id,o=n.observer,i=n.elements;return i.set(e,a),o.observe(e),function(){i.delete(e),o.unobserve(e),0===i.size&&(o.disconnect(),u.delete(r))}}(e,(function(e){return e&&p(e)}),{rootMargin:a}))}),[t,a,f]);return(0,o.useEffect)((function(){l||f||(0,i.default)((function(){return p(!0)}))}),[f]),[v,f]};var o=t("q1tI"),i=r(t("0G5g")),l="undefined"!==typeof IntersectionObserver;var u=new Map}}]);