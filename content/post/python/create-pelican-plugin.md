---
Date: "2017-10-22T21:32:19Z+09:00"
Draft: false
Title: "PelicanのPluginの作り方"
Tags: ["pelican"]
---

register関数を用意して、 各イベントのsignalsに `connect` する

```python
from pelican import signals

def register():
  signals.content_object_init.connect(content_object_init_handler)

def content_object_init_handler(content):
  pass
```

signalsは下記を参照

http://docs.getpelican.com/en/3.7.1/plugins.html#list-of-signals

`_content` や `_summary` を書き換える場合は以降のステージで行えば良いとのこと

だが、一度も上手くいっていない
