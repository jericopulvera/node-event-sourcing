ENDPOINT_URL="http://localhost:8000"

aws lambda create-event-source-mapping \
--function-name publishEvents \
--event-source "arn:aws:dynamodb:us-east-1:000000000000:table/EventStore/stream/2021-07-14T18:29:26.477" \
--batch-size 1 \
--starting-position TRIM_HORIZON \
--endpoint-url="$ENDPOINT_URL";

# aws lambda update-event-source-mapping \
# --uuid 7910b40b-fbbf-4ed4-96b8-f1af687a0f17 \
# --function-name publishEvents \
# --batch-size 1 \
# --endpoint-url="$ENDPOINT_URL"