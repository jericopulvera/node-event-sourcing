aws dynamodb create-table \
--endpoint-url="http://localhost:8000" \
--table-name EventStore \
--attribute-definitions AttributeName=aggregateId,AttributeType=S AttributeName=version,AttributeType=N AttributeName=published,AttributeType=N AttributeName=committedAt,AttributeType=N \
--key-schema AttributeName=aggregateId,KeyType=HASH AttributeName=version,KeyType=RANGE \
--provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
--stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE \
--global-secondary-index '[
        {
            "IndexName": "ActiveCommittedAtIndex",
            "KeySchema": [
                {
                    "AttributeName": "published",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "committedAt",
                    "KeyType": "RANGE"
                }
            ],
            "Projection": {
                "ProjectionType": "ALL"
            },
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 1,
                "WriteCapacityUnits": 1
            }
        }
    ]';

aws dynamodb describe-table \
--table-name EventStore \
--endpoint-url="http://localhost:8000";

# aws --endpoint-url="$ENDPOINT_URL" lambda update-function-code \
# --function-name "publishEvents" \
# --zip-file "fileb:///Users/eco/Code/node-event-sourcing/event-publisher/publishEvents.zip";