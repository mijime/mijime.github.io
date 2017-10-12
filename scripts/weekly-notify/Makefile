STACK_NAME = TilNotifier
GIT_REPO =
SNS_EMAIL =
S3_BUCKET =

build: app/index.py
	docker-compose up builder

deploy: cloudformation.yaml.compiled
	aws cloudformation deploy --template-file $< \
		--stack-name $(STACK_NAME) \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides \
			GitRepository=$(GIT_REPO) \
			NotificationAddress=$(SNS_EMAIL)

cloudformation.yaml.compiled: cloudformation.yaml scripts/index.py
	aws cloudformation package --template-file $< --s3-bucket $(S3_BUCKET) --output-template-file $@
