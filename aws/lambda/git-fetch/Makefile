STACK_NAME = TilNotifier
GIT_REPO =
SNS_EMAIL =
S3_BUCKET =

cloudformation.yaml.compiled: cloudformation.yaml scripts/index.py
	aws cloudformation package --template-file $< --s3-bucket $(S3_BUCKET) --output-template-file $@

deploy: cloudformation.yaml.compiled
	aws cloudformation deploy --template-file $< \
		--stack-name $(STACK_NAME) \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides \
			GitRepository=$(GIT_REPO) \
			NotificationAddress=$(SNS_EMAIL)

