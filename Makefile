REPO = git@github.com:mijime/mijime.github.io.git
THEME = hyde

help: ### Print tasks
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

deploy: ### Deploy to master
	[[ -d public ]] \
		|| git clone $(REPO) public
	hugo --theme $(THEME)
	cd public; \
		git add -A; \
		git commit -m ':memo: Update $(shell date "+%F %H:%M:%S")'; \
		git push --set-upstream origin master; \
		cd -

watch: ### Watch for
	hugo server --theme $(THEME) --watch
