---
CreatedAt: "2017-10-22T21:25:19+09:00"
IsDraft: false
Title: "Gitがインストールされていない環境でログを取得し、ハンドリングする"
Tags: ["Git"]
---

Git がインストールされていない環境（AWS Lambda など）で Git リポジトリを操作するには、Python の [dulwich](https://github.com/jelmer/dulwich) を使う。

<!--more-->

HTTP 経由でリポジトリを fetch し、最初のコミット時刻を取得する例を示す。

```python
from dulwich.client import HttpGitClient
from dulwich.repo import MemoryRepo
from urllib.parse import urlparse

def fetch_repo(repo=None, url=None):
    url_object = urlparse(url)
    client = HttpGitClient("://".join([url_object.scheme, url_object.netloc]))
    remote_refs = client.fetch(url_object.path, repo)
    for ref, sha1 in remote_refs.items():
        repo.refs[ref] = sha1
    return repo

def get_first_commit_time(repo):
    for entry in repo.get_walker():
        return entry.commit.commit_time
```

`MemoryRepo` を使うことでファイルシステムへの書き込みなしにリポジトリを扱える。

## 参考

- https://github.com/jelmer/dulwich
- http://ijin.github.io/blog/2016/02/18/ssh-and-git-on-aws-lambda/
- https://qiita.com/shibataka000/items/910754486ba2585209b2
