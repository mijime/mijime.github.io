REPO = $(shell git config remote.origin.url)
BRANCH = master
PUBLIC = public
FAVICONS = static/favicon.png \
					 static/apple-touch-icon-144-precomposed.png
FAVICON_BASE = assets/favicon.png

CONTENT = $(shell find content -name "*.md")
LAYOUT = $(shell find layouts -name "*.html")

help: ### Print tasks
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

build: $(PUBLIC) ### Build to
	yarn run build
	make hugo

clean:
	rm -rf $(PUBLIC)

deploy: ### Deploy to
	make clean
	make build
	cp -rv circle.yml public/circle.yml
	cd public; \
		git add -A; \
		git commit -m ':memo: Update $(shell date "+%F %H:%M:%S")'; \
		git push --set-upstream origin $(BRANCH); \
		cd -

watch: ### Watch for
	hugo server --buildDrafts --watch

test: ### Test
	yarn test

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

assets/:
	mkdir -p $@

hugo: assets/.hugo

assets/.hugo: assets/ $(CONTENT) $(LAYOUT)
	hugo
	touch assets/.hugo
