 ENDPOINT_URL="http://localhost:8000"
 aws --endpoint-url=$ENDPOINT_URL logs filter-log-events --log-group-name /aws/lambda/publishEvents