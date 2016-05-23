deploy:
	[[ -d public ]] \
		|| git clone git@github.com:mijime/mijime.github.io.git public
	hugo --theme hyde
	cd public; \
		git add -A; \
		git commit -m ':memo: Update $(shell date "+%F %H:%M:%S")'; \
		git push; \
		cd -
