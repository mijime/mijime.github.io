HUGO_VERSION = 0.59.1
HUGO_OS = Linux
REPO = git@github.com:mijime/mijime.github.io
BRANCH = master
PUBLIC = public
FAVICONS = static/favicon.png \
					 static/apple-touch-icon-144-precomposed.png
FAVICON_BASE = assets/favicon.png

HUGO = assets/hugo
CONTENT = $(shell find content -name "*.md")
LAYOUT = $(shell find layouts -name "*.html")

help: ### Print tasks
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install:
	npm install

build: $(PUBLIC) ### Build to
	npm run build
	PATH=$(PATH):assets hugo

clean:
	rm -rf $(PUBLIC)

deploy: build ### Deploy to
	cp -rv .github public/
	cd public; \
		git add -A; \
		git commit -m ':memo: Update $(shell date "+%F %H:%M:%S")'; \
		git push --set-upstream origin $(BRANCH); \
		cd -

watch: ### Watch for
	$(HUGO) server --buildDrafts --watch

test: ### Test
	npm test

post-diary: post-diary/index ### Add dairy (/{title})
post-diary/%:
	$(HUGO) new post/$(shell date +%F)/$*.md

post-memo: post-diary/index ### Add memo (/{tag}/{title})
post-memo/%:
	$(HUGO) new post/$*.md

post-slide: post-slide/index ### Add slide (/{title})
post-slide/%:
	$(HUGO) new slide/$(shell date +%F)/$*.md

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

assets/hugo:
	mkdir -p $(shell dirname $@)
	curl -L https://github.com/gohugoio/hugo/releases/download/v$(HUGO_VERSION)/hugo_$(HUGO_VERSION)_$(HUGO_OS)-64bit.tar.gz \
		| tar xvfz - -C $(shell dirname $@)

docker-build:
	docker-compose run --rm builder make install build

docker-watch:
	docker-compose run --rm builder make install watch

npm_upgrade:
	cat package.json | jq '.devDependencies|keys|@csv' -r|sed -e 's/,/ /g' | xargs npm install -D
