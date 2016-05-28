REPO = git@github.com:mijime/mijime.github.io.git
THEME = hyde
BRANCH = master
PUBLIC = public
FAVICONS = static/favicon.png \
					 static/apple-touch-icon-144-precomposed.png
FAVICON_BASE = favicon.png


help: ### Print tasks
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

build: $(PUBLIC) ### Build to
	npm run build
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

test: ### Test
	npm run test

$(PUBLIC):
	git clone --branch $(BRANCH) $(REPO) $@

favicon: $(FAVICONS) ### Create favicon use imagemagick

static/favicon.png: $(FAVICON_BASE)
	convert $< \
		-thumbnail 32x32^ -gravity center -extent 32x32 \
		-type GrayScale \
		\( -size 32x32 xc:none -fill white -draw 'circle 15,15 15,0' \) \
		-compose CopyOpacity -composite $@

static/apple-touch-icon-144-precomposed.png: $(FAVICON_BASE)
	convert $< \
		-thumbnail 144x144^ -gravity center -extent 144x144 \
		-type GrayScale \
		\( -size 144x144 xc:none -fill white -draw 'circle 71,71 71,0' \) \
		-compose CopyOpacity -composite $@
