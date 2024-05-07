run:
	gcloud functions deploy auth --runtime nodejs18 --trigger-http --entry-point app  --allow-unauthenticated
