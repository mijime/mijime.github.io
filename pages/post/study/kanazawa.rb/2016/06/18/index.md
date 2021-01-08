---
Description: ''
Tags: ['Development', 'lambda', 'kzrb']
CreatedAt: '2016-06-18T13:23:05+09:00'
title: ' kanazawa.rb meetup 46に参加した'
---

## AWS Lambda を管理するツール Lamma やってみた

Ruby で書かれた lammba というリポジトリが上がったので
ruby 勉強会に参加がてら触ってみた

### [lamma](https://github.com/ayemos/Lamma)

### 作業リポジトリ

[source](https://github.com/mijime/mijime.github.io/tree/content/source/study/kanazawa.rb/2016-06-18)

### 作業雑感

シンプルな Lambda 管理ツール

#### Pros

- 1 dir, 1 func なのでわかりやすいね
- 勝手に zip してくれるね
- Ruby なので今後拡張しやすい、のかな？

#### Cons

- nodejs, python2.7 のみ対応
- 消したりするのめんどくさそう ... まぁ関数だけだからいいんだけども ...
- node_modules 入ってない？

### 作業ログ

まずは環境作成

```ruby
source "https://rubygems.org"

gem "lamma"
```

```
FROM ruby

COPY Gemfile /var/app/Gemfile
WORKDIR /var/app
RUN bundle install
```

```
---
version: '2'
services:
  app:
    build: .
    command: sleep 3600
    environment:
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    volumes:
      - ./scripts:/var/app/scripts
```

とりあえずインストールして実行してみる

AWS 関連の情報を渡して ...

```
eval $(cat ~/.aws/credentials | awk -v FS=" = " '$1~/^aws/{print "export",toupper($1)"="$2}')
```

関数を作成してみる

```
lamma create scripts/my-function-1 --runtime python2.7

Creating function at directory ./scripts/my-function-1.
bundler: failed to load command: lamma (/usr/local/bundle/bin/lamma)
NoMethodError: undefined method `match' for nil:NilClass
Did you mean?  catch
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/aws-sdk-core/endpoint_provider.rb:67:in `block in partition_matching_region'
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/aws-sdk-core/endpoint_provider.rb:66:in `each'
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/aws-sdk-core/endpoint_provider.rb:66:in `find'
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/aws-sdk-core/endpoint_provider.rb:66:in `partition_matching_region'
...
```

うーん ... なぜに nil ...

AWS_REGION を渡す

```diff
diff --git a/source/study/kanazawa.rb/2016-06-18/docker-compose.yml b/source/study/kanazawa.rb/2016-06-18/docker-compose.yml
index e03b010..2784d3c 100644
--- a/source/study/kanazawa.rb/2016-06-18/docker-compose.yml
+++ b/source/study/kanazawa.rb/2016-06-18/docker-compose.yml
@@ -7,5 +7,6 @@ services:
     environment:
       AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
       AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
+      AWS_REGION: ap-northeast-1
     volumes:
       - ./scripts:/var/app/scripts
```

```
$ lamma create my-function --runtime python2.7

Creating function at directory ./my-function.
Done.
```

```
$ tree .

my-function
  ├── lambda_function.py
  └── lamma.conf

1 directory, 2 files
```

まだこの時点で関数は作られていないみたい ... なんで AWS 認証求められたんだ

deploy してみる。

```
$ lamma deploy test

Loading configuration.
Done.
bundler: failed to load command: lamma (/usr/local/bundle/bin/lamma)
Aws::Lambda::Errors::BadRequest:
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/seahorse/client/plugins/raise_response_errors.rb:15:in `call'
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/aws-sdk-core/plugins/param_converter.rb:20:in `call'
/usr/local/bundle/gems/aws-sdk-core-2.3.14/lib/seahorse/client/plugins/response_target.rb:21:in `call'
```

うーん ... ?

よくわからないので JS で作り直す

```
$ lamma create my-function-js --runtime nodejs

Creating function at directory ./my-function-js.
Done.
```

```
$ lamma deploy test

Loading configuration.
Done.
Function 'my-function-js' doesn't seem to be exists.
Do you want to create new function 'my-function-js' ? (y/n) y
Creating function 'my-function-js' ...
bundler: failed to load command: lamma (/usr/local/bundle/bin/lamma)
Errno::ENOENT: No such file or directory @ rb_sysopen - /tmp/d20160618-92-1fppw7/lambda.zip
  /usr/local/bundle/gems/lamma-0.1.1/lib/lamma/function.rb:57:in `initialize'
...
```

zip ...

```diff
diff --git a/source/study/kanazawa.rb/2016-06-18/Dockerfile b/source/study/kanazawa.rb/2016-06-18/Dockerfile
index f9e4aff..0595f36 100644
--- a/source/study/kanazawa.rb/2016-06-18/Dockerfile
+++ b/source/study/kanazawa.rb/2016-06-18/Dockerfile
@@ -3,3 +3,4 @@ FROM ruby
COPY Gemfile /var/app/Gemfile
WORKDIR /var/app
RUN bundle install
+RUN apt-get update && apt-get install -y zip
```

```
$ lamma deploy test

Loading configuration.
Done.
Function 'my-function-js' doesn't seem to be exists.
Do you want to create new function 'my-function-js' ? (y/n) y
Creating function 'my-function-js' ...
adding: lamma.conf (deflated 17%)
adding: index.js (deflated 45%)
ArgumentError occured. You might need to specify role arn you want to pass to your function via 'lamma.conf' file or ENV['AWS_LAMBDA_IAM_ROLE'].
Done.
```

ほむほむ ... あんましロールを書きたくないので env で

```
export AWS_LAMBDA_IAM_ROLE=arn:aws:iam::000000000000:role/lambda_basic_execution
```

```
$ lamma deploy test

Loading configuration.
Done.
Function 'my-function-js' doesn't seem to be exists.
Do you want to create new function 'my-function-js' ? (y/n) y
Creating function 'my-function-js' ...
adding: lamma.conf (deflated 17%)
adding: index.js (deflated 45%)
Done.
Setting aliases.
Done.
```

```
$ lamma list-functions

my-function-js
```

できた。

## LT 感想

### シェルチェックを使おう

- 文法がバラバラなので統一する
- 各環境でパッケージとして提供されている

確かにシェルは動かすの簡単だけど、 他の環境で動かないことが多い ...

### shUnit2 を使おう

- 対応シェルも幅広い
- ダウンロードするだけで使える！

bats 派だけど、 msys でも早いなら乗り換えたいかも

### Dokku

- Heroku like
- 前面に nginx があって、 コンテナにルーティング
- heroku の build packs も利用できるので良い！
- 運用メンテナンスが気になるところ

スケーリングしないとかで敬遠してたけども、 開発環境で利用するなら楽だよなぁ

だいぶバージョンアップされているとのことなので、触ってみたい

もっと利用されるという話なので、その話を聞いてからかな？

dokku-alt との違いもあとで調べておこう ...

### AWSSummit

SIer が完全に淘汰されちゃう感じ

PaaS, SaaS の流行には全然触れてなかったので、 今回の話を機会に調べてみよう ...

### Iot

書き込むのに結構ツールが必要なんですね ...

IOT 超絶敷居高い。
