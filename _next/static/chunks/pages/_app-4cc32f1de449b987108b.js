_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[6],{0:function(e,t,n){n("74v/"),e.exports=n("nOHt")},"20a2":function(e,t,n){e.exports=n("nOHt")},"74v/":function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/_app",function(){return n("cha2")}])},"7ljp":function(e,t,n){"use strict";n.d(t,"a",(function(){return f})),n.d(t,"b",(function(){return m}));var r=n("q1tI"),o=n.n(r);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function c(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var u=o.a.createContext({}),l=function(e){var t=o.a.useContext(u),n=t;return e&&(n="function"===typeof e?e(t):c(c({},t),e)),n},f=function(e){var t=l(e.components);return o.a.createElement(u.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return o.a.createElement(o.a.Fragment,{},t)}},p=o.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,a=e.parentName,u=s(e,["components","mdxType","originalType","parentName"]),f=l(n),p=r,m=f["".concat(a,".").concat(p)]||f[p]||d[p]||i;return n?o.a.createElement(m,c(c({ref:t},u),{},{components:n})):o.a.createElement(m,c({ref:t},u))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"===typeof e||r){var i=n.length,a=new Array(i);a[0]=p;var c={};for(var s in t)hasOwnProperty.call(t,s)&&(c[s]=t[s]);c.originalType=e,c.mdxType="string"===typeof e?e:r,a[1]=c;for(var u=2;u<i;u++)a[u]=n[u];return o.a.createElement.apply(null,a)}return o.a.createElement.apply(null,n)}p.displayName="MDXCreateElement"},"8OQS":function(e,t){e.exports=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}},Aiso:function(e,t,n){e.exports=n("dQHF")},LEOp:function(e,t,n){},MMqm:function(e,t,n){"use strict";n.d(t,"c",(function(){return r})),n.d(t,"b",(function(){return o})),n.d(t,"a",(function(){return i}));var r="My snippets",o=5,i="UA-46554348-4"},Mj6V:function(e,t,n){var r,o;void 0===(o="function"===typeof(r=function(){var e={version:"0.2.0"},t=e.settings={minimum:.08,easing:"ease",positionUsing:"",speed:200,trickle:!0,trickleRate:.02,trickleSpeed:800,showSpinner:!0,barSelector:'[role="bar"]',spinnerSelector:'[role="spinner"]',parent:"body",template:'<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'};function n(e,t,n){return e<t?t:e>n?n:e}function r(e){return 100*(-1+e)}function o(e,n,o){var i;return(i="translate3d"===t.positionUsing?{transform:"translate3d("+r(e)+"%,0,0)"}:"translate"===t.positionUsing?{transform:"translate("+r(e)+"%,0)"}:{"margin-left":r(e)+"%"}).transition="all "+n+"ms "+o,i}e.configure=function(e){var n,r;for(n in e)void 0!==(r=e[n])&&e.hasOwnProperty(n)&&(t[n]=r);return this},e.status=null,e.set=function(r){var c=e.isStarted();r=n(r,t.minimum,1),e.status=1===r?null:r;var s=e.render(!c),u=s.querySelector(t.barSelector),l=t.speed,f=t.easing;return s.offsetWidth,i((function(n){""===t.positionUsing&&(t.positionUsing=e.getPositioningCSS()),a(u,o(r,l,f)),1===r?(a(s,{transition:"none",opacity:1}),s.offsetWidth,setTimeout((function(){a(s,{transition:"all "+l+"ms linear",opacity:0}),setTimeout((function(){e.remove(),n()}),l)}),l)):setTimeout(n,l)})),this},e.isStarted=function(){return"number"===typeof e.status},e.start=function(){e.status||e.set(0);var n=function(){setTimeout((function(){e.status&&(e.trickle(),n())}),t.trickleSpeed)};return t.trickle&&n(),this},e.done=function(t){return t||e.status?e.inc(.3+.5*Math.random()).set(1):this},e.inc=function(t){var r=e.status;return r?("number"!==typeof t&&(t=(1-r)*n(Math.random()*r,.1,.95)),r=n(r+t,0,.994),e.set(r)):e.start()},e.trickle=function(){return e.inc(Math.random()*t.trickleRate)},function(){var t=0,n=0;e.promise=function(r){return r&&"resolved"!==r.state()?(0===n&&e.start(),t++,n++,r.always((function(){0===--n?(t=0,e.done()):e.set((t-n)/t)})),this):this}}(),e.render=function(n){if(e.isRendered())return document.getElementById("nprogress");s(document.documentElement,"nprogress-busy");var o=document.createElement("div");o.id="nprogress",o.innerHTML=t.template;var i,c=o.querySelector(t.barSelector),u=n?"-100":r(e.status||0),l=document.querySelector(t.parent);return a(c,{transition:"all 0 linear",transform:"translate3d("+u+"%,0,0)"}),t.showSpinner||(i=o.querySelector(t.spinnerSelector))&&f(i),l!=document.body&&s(l,"nprogress-custom-parent"),l.appendChild(o),o},e.remove=function(){u(document.documentElement,"nprogress-busy"),u(document.querySelector(t.parent),"nprogress-custom-parent");var e=document.getElementById("nprogress");e&&f(e)},e.isRendered=function(){return!!document.getElementById("nprogress")},e.getPositioningCSS=function(){var e=document.body.style,t="WebkitTransform"in e?"Webkit":"MozTransform"in e?"Moz":"msTransform"in e?"ms":"OTransform"in e?"O":"";return t+"Perspective"in e?"translate3d":t+"Transform"in e?"translate":"margin"};var i=function(){var e=[];function t(){var n=e.shift();n&&n(t)}return function(n){e.push(n),1==e.length&&t()}}(),a=function(){var e=["Webkit","O","Moz","ms"],t={};function n(e){return e.replace(/^-ms-/,"ms-").replace(/-([\da-z])/gi,(function(e,t){return t.toUpperCase()}))}function r(t){var n=document.body.style;if(t in n)return t;for(var r,o=e.length,i=t.charAt(0).toUpperCase()+t.slice(1);o--;)if((r=e[o]+i)in n)return r;return t}function o(e){return e=n(e),t[e]||(t[e]=r(e))}function i(e,t,n){t=o(t),e.style[t]=n}return function(e,t){var n,r,o=arguments;if(2==o.length)for(n in t)void 0!==(r=t[n])&&t.hasOwnProperty(n)&&i(e,n,r);else i(e,o[1],o[2])}}();function c(e,t){return("string"==typeof e?e:l(e)).indexOf(" "+t+" ")>=0}function s(e,t){var n=l(e),r=n+t;c(n,t)||(e.className=r.substring(1))}function u(e,t){var n,r=l(e);c(e,t)&&(n=r.replace(" "+t+" "," "),e.className=n.substring(1,n.length-1))}function l(e){return(" "+(e.className||"")+" ").replace(/\s+/gi," ")}function f(e){e&&e.parentNode&&e.parentNode.removeChild(e)}return e})?r.call(t,n,t,e):r)||(e.exports=o)},UWYU:function(e,t,n){"use strict";t.__esModule=!0,t.imageConfigDefault=t.VALID_LOADERS=void 0;t.VALID_LOADERS=["default","imgix","cloudinary","akamai"];t.imageConfigDefault={deviceSizes:[640,750,828,1080,1200,1920,2048,3840],imageSizes:[16,32,48,64,96,128,256,384],path:"/_next/image",loader:"default",domains:[]}},YFqc:function(e,t,n){e.exports=n("cTJO")},cTJO:function(e,t,n){"use strict";var r=n("J4zp"),o=n("284h");t.__esModule=!0,t.default=void 0;var i=o(n("q1tI")),a=n("elyg"),c=n("nOHt"),s=n("vNVm"),u={};function l(e,t,n,r){if((0,a.isLocalURL)(t)){e.prefetch(t,n,r).catch((function(e){0}));var o=r&&"undefined"!==typeof r.locale?r.locale:e&&e.locale;u[t+"%"+n+(o?"%"+o:"")]=!0}}var f=function(e){var t=!1!==e.prefetch,n=(0,c.useRouter)(),o=n&&n.pathname||"/",f=i.default.useMemo((function(){var t=(0,a.resolveHref)(o,e.href,!0),n=r(t,2),i=n[0],c=n[1];return{href:i,as:e.as?(0,a.resolveHref)(o,e.as):c||i}}),[o,e.href,e.as]),d=f.href,p=f.as,m=e.children,v=e.replace,g=e.shallow,y=e.scroll,b=e.locale;"string"===typeof m&&(m=i.default.createElement("a",null,m));var h=i.Children.only(m),w=h&&"object"===typeof h&&h.ref,O=(0,s.useIntersection)({rootMargin:"200px"}),j=r(O,2),x=j[0],E=j[1],S=i.default.useCallback((function(e){x(e),w&&("function"===typeof w?w(e):"object"===typeof w&&(w.current=e))}),[w,x]);(0,i.useEffect)((function(){var e=E&&t&&(0,a.isLocalURL)(d),r="undefined"!==typeof b?b:n&&n.locale,o=u[d+"%"+p+(r?"%"+r:"")];e&&!o&&l(n,d,p,{locale:r})}),[p,d,E,b,t,n]);var A={ref:S,onClick:function(e){h.props&&"function"===typeof h.props.onClick&&h.props.onClick(e),e.defaultPrevented||function(e,t,n,r,o,i,c,s){("A"!==e.currentTarget.nodeName||!function(e){var t=e.currentTarget.target;return t&&"_self"!==t||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.nativeEvent&&2===e.nativeEvent.which}(e)&&(0,a.isLocalURL)(n))&&(e.preventDefault(),null==c&&(c=r.indexOf("#")<0),t[o?"replace":"push"](n,r,{shallow:i,locale:s}).then((function(e){e&&c&&(window.scrollTo(0,0),document.body.focus())})))}(e,n,d,p,v,g,y,b)},onMouseEnter:function(e){(0,a.isLocalURL)(d)&&(h.props&&"function"===typeof h.props.onMouseEnter&&h.props.onMouseEnter(e),l(n,d,p,{priority:!0}))}};return(e.passHref||"a"===h.type&&!("href"in h.props))&&(A.href=(0,a.addBasePath)((0,a.addLocale)(p,"undefined"!==typeof b?b:n&&n.locale,n&&n.defaultLocale))),i.default.cloneElement(h,A)};t.default=f},cha2:function(e,t,n){"use strict";n.r(t),n.d(t,"default",(function(){return y}));var r=n("rePB"),o=n("nKUr"),i=n("YFqc"),a=n.n(i),c=n("Aiso"),s=n.n(c),u=n("7ljp"),l=n("20a2"),f=n.n(l),d=n("Mj6V"),p=n.n(d);f.a.events.on("routeChangeStart",(function(){return p.a.start()})),f.a.events.on("routeChangeComplete",(function(){return p.a.done()})),f.a.events.on("routeChangeError",(function(){return p.a.done()}));var m=n("MMqm");f.a.events.on("routeChangeComplete",(function(e){window.gtag("config",m.a,{page_path:e})}));n("ksaK"),n("LEOp"),n("pdi6"),n("iOjB");function v(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function g(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?v(Object(n),!0).forEach((function(t){Object(r.a)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):v(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function y(e){var t=e.Component,n=e.pageProps;return Object(o.jsx)(u.a,{components:{a:a.a,img:s.a},children:Object(o.jsx)(t,g({},n))})}},dEHY:function(e,t,n){"use strict";t.__esModule=!0,t.toBase64=function(e){return window.btoa(e)}},dQHF:function(e,t,n){"use strict";var r=n("J4zp"),o=n("RIqP"),i=n("TqRt");t.__esModule=!0,t.default=function(e){var t=e.src,n=e.sizes,i=e.unoptimized,c=void 0!==i&&i,l=e.priority,d=void 0!==l&&l,p=e.loading,v=e.className,g=e.quality,y=e.width,O=e.height,j=e.objectFit,x=e.objectPosition,E=(0,a.default)(e,["src","sizes","unoptimized","priority","loading","className","quality","width","height","objectFit","objectPosition"]),S=n?"responsive":"intrinsic",A=!1;"unsized"in E?(A=Boolean(E.unsized),delete E.unsized):"layout"in E&&(E.layout&&(S=E.layout),delete E.layout);0;var P=!d&&("lazy"===p||"undefined"===typeof p);t&&t.startsWith("data:")&&(c=!0,P=!1);var k,z,_,M=(0,f.useIntersection)({rootMargin:"200px",disabled:!P}),q=r(M,2),C=q[0],T=q[1],N=!P||T,I=w(y),L=w(O),R=w(g),D={visibility:N?"visible":"hidden",position:"absolute",top:0,left:0,bottom:0,right:0,boxSizing:"border-box",padding:0,border:"none",margin:"auto",display:"block",width:0,height:0,minWidth:"100%",maxWidth:"100%",minHeight:"100%",maxHeight:"100%",objectFit:j,objectPosition:x};if("undefined"!==typeof I&&"undefined"!==typeof L&&"fill"!==S){var U=L/I,B=isNaN(U)?"100%":"".concat(100*U,"%");"responsive"===S?(k={display:"block",overflow:"hidden",position:"relative",boxSizing:"border-box",margin:0},z={display:"block",boxSizing:"border-box",paddingTop:B}):"intrinsic"===S?(k={display:"inline-block",maxWidth:"100%",overflow:"hidden",position:"relative",boxSizing:"border-box",margin:0},z={boxSizing:"border-box",display:"block",maxWidth:"100%"},_='<svg width="'.concat(I,'" height="').concat(L,'" xmlns="http://www.w3.org/2000/svg" version="1.1"/>')):"fixed"===S&&(k={overflow:"hidden",boxSizing:"border-box",display:"inline-block",position:"relative",width:I,height:L})}else"undefined"===typeof I&&"undefined"===typeof L&&"fill"===S&&(k={display:"block",overflow:"hidden",position:"absolute",top:0,left:0,bottom:0,right:0,boxSizing:"border-box",margin:0});var H={src:"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"};N&&(H=function(e){var t=e.src,n=e.unoptimized,r=e.layout,i=e.width,a=e.quality,c=e.sizes;if(n)return{src:t};var s=function(e,t){if("number"!==typeof e||"fill"===t||"responsive"===t)return{widths:m,kind:"w"};return{widths:o(new Set([e,2*e,3*e].map((function(e){return b.find((function(t){return t>=e}))||b[b.length-1]})))),kind:"x"}}(i,r),u=s.widths,l=s.kind,f=u.length-1,d=u.map((function(e,n){return"".concat(h({src:t,quality:a,width:e})," ").concat("w"===l?e:n+1).concat(l)})).join(", ");c||"w"!==l||(c="100vw");return{src:t=h({src:t,quality:a,width:u[f]}),sizes:c,srcSet:d}}({src:t,unoptimized:c,layout:S,width:I,quality:R,sizes:n}));A&&(k=void 0,z=void 0,D=void 0);return s.default.createElement("div",{style:k},z?s.default.createElement("div",{style:z},_?s.default.createElement("img",{style:{maxWidth:"100%",display:"block"},alt:"","aria-hidden":!0,role:"presentation",src:"data:image/svg+xml;base64,".concat((0,u.toBase64)(_))}):null):null,s.default.createElement("img",Object.assign({},E,H,{decoding:"async",className:v,ref:C,style:D})))};var a=i(n("8OQS")),c=i(n("pVnL")),s=i(n("q1tI")),u=n("dEHY"),l=n("UWYU"),f=n("vNVm");var d=new Map([["imgix",function(e){var t=e.root,n=e.src,r=e.width,o=e.quality,i=["auto=format","fit=max","w="+r],a="";o&&i.push("q="+o);i.length&&(a="?"+i.join("&"));return"".concat(t).concat(O(n)).concat(a)}],["cloudinary",function(e){var t=e.root,n=e.src,r=e.width,o=e.quality,i=["f_auto","c_limit","w_"+r,"q_"+(o||"auto")].join(",")+"/";return"".concat(t).concat(i).concat(O(n))}],["akamai",function(e){var t=e.root,n=e.src,r=e.width;return"".concat(t).concat(O(n),"?imwidth=").concat(r)}],["default",function(e){var t=e.root,n=e.src,r=e.width,o=e.quality;0;return"".concat(t,"?url=").concat(encodeURIComponent(n),"&w=").concat(r,"&q=").concat(o||75)}]]),p={deviceSizes:[640,750,828,1080,1200,1920,2048,3840],imageSizes:[16,32,48,64,96,128,256,384],path:"/_next/image",loader:"default"}||l.imageConfigDefault,m=p.deviceSizes,v=p.imageSizes,g=p.loader,y=p.path,b=(p.domains,[].concat(o(m),o(v)));function h(e){var t=d.get(g);if(t)return t((0,c.default)({root:y},e));throw new Error('Unknown "loader" found in "next.config.js". Expected: '.concat(l.VALID_LOADERS.join(", "),". Received: ").concat(g))}function w(e){return"number"===typeof e?e:"string"===typeof e?parseInt(e,10):void 0}function O(e){return"/"===e[0]?e.slice(1):e}m.sort((function(e,t){return e-t})),b.sort((function(e,t){return e-t}))},iOjB:function(e,t,n){},ksaK:function(e,t,n){},pVnL:function(e,t){function n(){return e.exports=n=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},n.apply(this,arguments)}e.exports=n},pdi6:function(e,t,n){},rePB:function(e,t,n){"use strict";function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}n.d(t,"a",(function(){return r}))},vNVm:function(e,t,n){"use strict";var r=n("J4zp"),o=n("TqRt");t.__esModule=!0,t.useIntersection=function(e){var t=e.rootMargin,n=e.disabled||!c,o=(0,i.useRef)(),u=(0,i.useState)(!1),l=r(u,2),f=l[0],d=l[1],p=(0,i.useCallback)((function(e){o.current&&(o.current(),o.current=void 0),n||f||e&&e.tagName&&(o.current=function(e,t,n){var r=function(e){var t=e.rootMargin||"",n=s.get(t);if(n)return n;var r=new Map,o=new IntersectionObserver((function(e){e.forEach((function(e){var t=r.get(e.target),n=e.isIntersecting||e.intersectionRatio>0;t&&n&&t(n)}))}),e);return s.set(t,n={id:t,observer:o,elements:r}),n}(n),o=r.id,i=r.observer,a=r.elements;return a.set(e,t),i.observe(e),function(){i.unobserve(e),0===a.size&&(i.disconnect(),s.delete(o))}}(e,(function(e){return e&&d(e)}),{rootMargin:t}))}),[n,t,f]);return(0,i.useEffect)((function(){c||f||(0,a.default)((function(){return d(!0)}))}),[f]),[p,f]};var i=n("q1tI"),a=o(n("0G5g")),c="undefined"!==typeof IntersectionObserver;var s=new Map}},[[0,0,2,4,1]]]);