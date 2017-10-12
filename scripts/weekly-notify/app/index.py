from bs4 import BeautifulSoup
from datetime import datetime
from dulwich.client import HttpGitClient
from dulwich.repo import MemoryRepo
from urllib import request
from urllib.parse import urlparse
import boto3
import itertools
import math
import os

UNIT_DAYS_TO_SEC = 24 * 60 * 60 # 1 day
LIMIT_DAYS_TO_SEC = 3 * UNIT_DAYS_TO_SEC
SUBJECT_FORMAT = "[{url}] 前回のコミットから {diff:d} 日経過しています"
MESSAGE_FORMAT = """
{url} では前回のコミットから {diff:d} 日経過しています

学んだことを記録しませんか

# 参考レポジトリ
"""
TRENDS_FORMAT = "* [{title}]({url})\n {desc}"

def build_message(url=None, diff=0):
    return MESSAGE_FORMAT.format(url=url, diff=diff).strip() + \
            "\n\n" + \
            "\n\n".join(itertools.islice(fetch_trend_repolist(), 10))

def fetch_trend_repolist(tag="", since="daily"):
    html = request.urlopen("https://github.com/trending/{tag}?since={since}"
            .format(since=since,tag=tag))
    soup = BeautifulSoup(html, "html.parser")
    repolist = soup.select(".repo-list li")
    for repo in repolist:
        title_anchor = repo.select("h3 a")[0]
        title = title_anchor.getText().strip()
        url = "https://github.com" + title_anchor.get("href").strip()
        desc = repo.select(".py-1 p")[0].getText().strip()
        yield TRENDS_FORMAT.format(title=title, url=url, desc=desc)

def get_first_commit_time(repo):
    for entry in itertools.islice(repo.get_walker(), 1):
        return entry.commit.commit_time

def fetch_repo(repo=None, url=None):
    url_object = urlparse(url)
    client = HttpGitClient("://".join([url_object.scheme, url_object.netloc]))
    remote_refs = client.fetch(url_object.path, repo)
    for ref, sha1 in remote_refs.items():
        repo.refs[ref] = sha1
    return repo

def lambda_handler(event, context):
    url = os.getenv("GIT_REPO")
    repo = fetch_repo(repo=MemoryRepo(), url=url)
    diff = datetime.now().timestamp() - get_first_commit_time(repo)
    diff_days = math.floor(diff/UNIT_DAYS_TO_SEC)

    print("diff_days: {diff_days:d}".format(diff_days=diff_days))

    if diff > LIMIT_DAYS_TO_SEC:
        subject = SUBJECT_FORMAT.format(url=url, diff=diff_days)
        print("Subject: ", subject)
        message = build_message(url=url, diff=diff_days)
        print("Message: ", message)
        sns = boto3.client("sns")
        sns.publish(TopicArn=os.getenv("SNS_TOPIC_ARN"), Subject=subject, Message=message)

if __name__ == "__main__":
    lambda_handler({}, {})
