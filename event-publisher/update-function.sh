ENDPOINT_URL="http://localhost:8000"

aws --endpoint-url="$ENDPOINT_URL" lambda update-function-code \
--function-name "publishEvents" \
--zip-file "fileb:///Users/eco/Code/node-event-sourcing/event-publisher/publishEvents/publishEvents.zip"
