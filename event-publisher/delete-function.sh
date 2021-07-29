ENDPOINT_URL="http://localhost:4566"

aws --endpoint-url="$ENDPOINT_URL" lambda delete-function \
--function-name "publishEvents";
