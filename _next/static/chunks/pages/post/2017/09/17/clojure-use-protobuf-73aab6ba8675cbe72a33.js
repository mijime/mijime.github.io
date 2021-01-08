_N_E=(window.webpackJsonp_N_E=window.webpackJsonp_N_E||[]).push([[16],{MuLT:function(e,a,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/post/2017/09/17/clojure-use-protobuf",function(){return t("gHFW")}])},gHFW:function(e,a,t){"use strict";t.r(a),t.d(a,"frontMatter",(function(){return o})),t.d(a,"default",(function(){return m}));var c=t("wx14"),s=t("Ff2n"),b=t("q1tI"),l=t.n(b),n=t("7ljp"),r=t("TJE1"),o=(l.a.createElement,{Title:"Clojure \u304b\u3089 GRPC \u3068\u304b ProtoBuf \u3092\u89e6\u3063\u3066\u307f\u308b",Tags:["Development","clojure"],Draft:!0,Description:"",CreatedAt:"2017-09-17T07:48:28+09:00",__resourcePath:"post/2017/09/17/clojure-use-protobuf/index.md",__scans:{},layout:"index"}),p={frontMatter:o},j=r.a;function m(e){var a=e.components,t=Object(s.a)(e,["components"]);return Object(n.b)(j,Object(c.a)({},p,t,{components:a,mdxType:"MDXLayout"}),Object(n.b)("h1",null,"Grpc ?"),Object(n.b)("ul",null,Object(n.b)("li",{parentName:"ul"},Object(n.b)("a",Object(c.a)({parentName:"li"},{href:"https://grpc.io/docs/"}),"https://grpc.io/docs/"))),Object(n.b)("h1",null,"Protocol Buffers ?"),Object(n.b)("ul",null,Object(n.b)("li",{parentName:"ul"},Object(n.b)("a",Object(c.a)({parentName:"li"},{href:"https://developers.google.com/protocol-buffers/"}),"https://developers.google.com/protocol-buffers/"))),Object(n.b)("h2",null,"\u89e6\u308b\u30e2\u30c1\u30d9\u30fc\u30b7\u30e7\u30f3"),Object(n.b)("ul",null,Object(n.b)("li",{parentName:"ul"},"HTTP2 \u3063\u3066\u3044\u3046\u306e\u304c\u65e9\u3044\u3089\u3057\u3044"),Object(n.b)("li",{parentName:"ul"},"\u5206\u6563\u3059\u308b\u3089\u3057\u3044"),Object(n.b)("li",{parentName:"ul"},"RPC \u7cfb\u3092\u4e00\u5ea6\u306f\u89e6\u3063\u3066\u304a\u304d\u305f\u3044")),Object(n.b)("h1",null,"Tutorial"),Object(n.b)("ul",null,Object(n.b)("li",{parentName:"ul"},Object(n.b)("p",{parentName:"li"},Object(n.b)("a",Object(c.a)({parentName:"p"},{href:"https://developers.google.com/protocol-buffers/docs/javatutorial"}),"https://developers.google.com/protocol-buffers/docs/javatutorial")),Object(n.b)("ul",{parentName:"li"},Object(n.b)("li",{parentName:"ul"},"ProtoBuf 2.x \u7cfb\u3060\u3063\u305f\u306e\u3067\u3061\u3087\u3063\u3068\u53e4\u3081"))),Object(n.b)("li",{parentName:"ul"},Object(n.b)("p",{parentName:"li"},Object(n.b)("a",Object(c.a)({parentName:"p"},{href:"https://grpc.io/docs/quickstart/java.html"}),"https://grpc.io/docs/quickstart/java.html"))),Object(n.b)("li",{parentName:"ul"},Object(n.b)("p",{parentName:"li"},Object(n.b)("a",Object(c.a)({parentName:"p"},{href:"https://grpc.io/docs/tutorials/basic/java.html"}),"https://grpc.io/docs/tutorials/basic/java.html")),Object(n.b)("ul",{parentName:"li"},Object(n.b)("li",{parentName:"ul"},"Grpc \u306e\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb"))),Object(n.b)("li",{parentName:"ul"},Object(n.b)("p",{parentName:"li"},Object(n.b)("a",Object(c.a)({parentName:"p"},{href:"https://github.com/grpc/grpc-java/tree/master/examples"}),"https://github.com/grpc/grpc-java/tree/master/examples")),Object(n.b)("ul",{parentName:"li"},Object(n.b)("li",{parentName:"ul"},"Grpc \u306e\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb\u306e\u30ea\u30dd\u30b8\u30c8\u30ea")))),Object(n.b)("h2",null,"\u4f9d\u5b58\u95a2\u4fc2"),Object(n.b)("pre",null,Object(n.b)("code",Object(c.a)({parentName:"pre"},{className:"hljs language-clojure"}),"(",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-name"}),"defproject")," clojure-protobuf-test ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"0.1.0-SNAPSHOT"'),"\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":description")," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"FIXME: write description"'),"\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":url")," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"http://example.com/FIXME"'),"\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":license")," {",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":name")," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"Eclipse Public License"'),"\n            ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":url")," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"http://www.eclipse.org/legal/epl-v10.html"'),"}\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":dependencies")," [[org.clojure/clojure ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"1.8.0"'),"]\n                 [com.google.protobuf/protobuf-java ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"3.3.0"'),"]\n                 [com.google.api.grpc/proto-google-common-protos ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"0.1.9"'),"]\n                 [io.grpc/grpc-netty ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"1.6.1"'),"\n                  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":exclusions")," [io.netty/netty-codec-http2\n                               io.grpc/grpc-core]]\n                 [io.grpc/grpc-protobuf ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"1.6.1"'),"]\n                 [io.grpc/grpc-stub ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"1.6.1"'),"]]\n\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":source-paths")," [",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"src/main/clojure"'),"]\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":test-paths")," [",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"src/test/clojure"'),"]\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":resource-paths")," [",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"src/main/resource"'),"]\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":java-source-paths")," [",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"gen/main/java"')," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"gen/main/grpc"'),"]\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":javac-options")," [",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"-target"')," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"1.8"')," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"-source"')," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-string"}),'"1.8"'),"]\n  ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":aot")," ",Object(n.b)("span",Object(c.a)({parentName:"code"},{className:"hljs-symbol"}),":all"),"\n  )")),Object(n.b)("h1",null,"\u305d\u306e\u4ed6\u30e1\u30e2"),Object(n.b)("h2",null,"Clojure \u3067 JavaClass \u306e\u7d99\u627f"),Object(n.b)("ul",null,Object(n.b)("li",{parentName:"ul"},"Clojure \u3067 Java \u30af\u30e9\u30b9\u306e\u7d99\u627f\u306a\u3069\u3057\u3066\u307f\u308b\n",Object(n.b)("a",Object(c.a)({parentName:"li"},{href:"http://qiita.com/FScoward/items/ede5b4c0c98111c219bf"}),"http://qiita.com/FScoward/items/ede5b4c0c98111c219bf"))),Object(n.b)("h2",null,"InnterClass \u306e\u53c2\u7167\u65b9\u6cd5"),Object(n.b)("ul",null,Object(n.b)("li",{parentName:"ul"},"A\\$B \u3067\u6307\u5b9a\u3059\u308b\u5fc5\u8981\u3042\u308a"),Object(n.b)("li",{parentName:"ul"},Object(n.b)("inlineCode",{parentName:"li"},":extends")," \u306b\u6307\u5b9a\u3059\u308b\u5834\u5408\u306f\u30d1\u30c3\u30b1\u30fc\u30b8\u540d\u3058\u3083\u306a\u3044\u3068\u96e3\u3057\u305d\u3046")))}m.isMDXComponent=!0}},[["MuLT",0,2,1,3]]]);