ENDPOINT_URL="http://localhost:8000"

aws --endpoint-url="$ENDPOINT_URL" lambda create-function \
--function-name "publishEvents" \
--zip-file "fileb:///Users/eco/Code/node-event-sourcing/event-publisher/publishEvents/publishEvents.zip" \
--handle "index.handler" \
--runtime "nodejs14.x" \
--role r1;
