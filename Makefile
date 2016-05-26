REPO = git@github.com:mijime/mijime.github.io.git
THEME = hyde
BRANCH = master
PUBLIC = public

help: ### Print tasks
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

build: $(PUBLIC) ### Build to
	rm -r public/*
	hugo --theme $(THEME)

deploy: build ### Deploy to
	cd public; \
		git add -A; \
		git commit -m ':memo: Update $(shell date "+%F %H:%M:%S")'; \
		git push --set-upstream origin $(BRANCH); \
		cd -

watch: ### Watch for
	hugo server --theme $(THEME) --watch

$(PUBLIC):
	git clone --branch $(BRANCH) $(REPO) $@
