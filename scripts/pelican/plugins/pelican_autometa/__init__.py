from bs4 import BeautifulSoup
from datetime import datetime
from dulwich.repo import Repo
from os import path
from pelican import signals, contents
from pelican.utils import set_date_tzinfo
import logging
import os

DEV_LOGGER = logging.getLogger(__name__)

def datetime_from_timestamp(timestamp, content):
    return set_date_tzinfo(
            datetime.fromtimestamp(timestamp),
            tz_name=content.settings.get("TIMEZONE", None))

def find_repo_path(dir_path):
    if path.isdir(path.join(dir_path, ".git")):
        return dir_path

    next_dir_path = path.abspath(path.join(dir_path, os.pardir))
    if dir_path == next_dir_path:
        return None
    else:
        return find_repo_path(next_dir_path)

def setup_title_metadata(content):
    soup = BeautifulSoup(content.content, "html.parser")
    if soup and soup.h1:
        title = soup.h1.string
        content.title = title
        content.metadata["title"] = title
        soup.h1.extract()
        content._content = soup.decode()
        DEV_LOGGER.debug("content_object_init: title = %s" % title)
        return

def setup_date_metadata(content):
    repo_path = find_repo_path(content.source_path)
    if repo_path == None:
        return

    repo = Repo(repo_path)
    source_path = path.relpath(content.source_path, repo_path)
    for entry in repo.get_walker(paths=[source_path.encode("UTF-8")], max_entries=1):
        date = datetime_from_timestamp(entry.commit.commit_time, content)
        DEV_LOGGER.debug("content_object_init: %s: date = %s" % (source_path, date))
        content.date = date
        content.metadata["date"] = date
        locale_date = date.strftime(content.settings.get("DEFAULT_DATE_FORMAT", None))
        content.locale_date = locale_date
        content.metadata["locale_date"] = locale_date
        return

def content_object_init(content):
    if isinstance(content, contents.Static):
        return

    if "title" in content.metadata:
        pass
    else:
        setup_title_metadata(content)

    if "date" in content.metadata:
        pass
    else:
        setup_date_metadata(content)

def register():
    signals.content_object_init.connect(content_object_init)
