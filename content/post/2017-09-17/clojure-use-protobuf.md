---
Title: Clojure から GRPC とか ProtoBuf を触ってみる
Tags: ["Development", "clojure"]
draft: true
Description: ""
date: "2017-09-17T07:48:28+09:00"
---

# Grpc ?

- https://grpc.io/docs/

# Protocol Buffers ?

- https://developers.google.com/protocol-buffers/

## 触るモチベーション

- HTTP2っていうのが早いらしい
- 分散するらしい
- RPC系を一度は触っておきたい

# Tutorial

- https://developers.google.com/protocol-buffers/docs/javatutorial

  - ProtoBuf 2.x系だったのでちょっと古め

- https://grpc.io/docs/quickstart/java.html
- https://grpc.io/docs/tutorials/basic/java.html

  - Grpcのチュートリアル

- https://github.com/grpc/grpc-java/tree/master/examples

  - Grpcのチュートリアルのリポジトリ

## 依存関係

```clojure
(defproject clojure-protobuf-test "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.8.0"]
                 [com.google.protobuf/protobuf-java "3.3.0"]
                 [com.google.api.grpc/proto-google-common-protos "0.1.9"]
                 [io.grpc/grpc-netty "1.6.1"
                  :exclusions [io.netty/netty-codec-http2
                               io.grpc/grpc-core]]
                 [io.grpc/grpc-protobuf "1.6.1"]
                 [io.grpc/grpc-stub "1.6.1"]]

  :source-paths ["src/main/clojure"]
  :test-paths ["src/test/clojure"]
  :resource-paths ["src/main/resource"]
  :java-source-paths ["gen/main/java" "gen/main/grpc"]
  :javac-options ["-target" "1.8" "-source" "1.8"]
  :aot :all
  )
```


# その他メモ

## ClojureでJavaClassの継承

- ClojureでJavaクラスの継承などしてみる
  http://qiita.com/FScoward/items/ede5b4c0c98111c219bf

## InnterClassの参照方法

- A$Bで指定する必要あり
- `:extends` に指定する場合はパッケージ名じゃないと難しそう
