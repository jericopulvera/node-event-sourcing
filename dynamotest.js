/* eslint-disable no-undef */

const DynamoDB = require("aws-sdk/clients/dynamodb");

const service = new DynamoDB({
  region: "ap-southeast-2",
  endpoint: "http://localhost:8000",
});

const documentClient = new DynamoDB.DocumentClient({
  service: service,
});

const run = async () => {
  const tableName = "EventStore";

  try {
    await service
      .createTable({
        TableName: tableName,
        KeySchema: [
          { AttributeName: "aggregateId", KeyType: "HASH" },
          { AttributeName: "version", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "aggregateId", AttributeType: "S" },
          { AttributeName: "version", AttributeType: "N" },
          { AttributeName: "active", AttributeType: "N" },
          { AttributeName: "committedAt", AttributeType: "N" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10,
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: "ActiveCommittedAtIndex",
            KeySchema: [
              {
                AttributeName: "active",
                KeyType: "HASH",
              },
              {
                AttributeName: "committedAt",
                KeyType: "RANGE",
              },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
          },
        ],
      })
      .promise();
    console.log("Table created.");
  } catch (_) {
    console.log(_.message);
  }

  try {
    await documentClient
      .put({
        TableName: tableName,
        Item: {
          active: 1,
          committedAt: Date.now(),
          aggregateId: Date.now().toString(),
          version: 0,
          event: "TestEvent",
          payload: {},
        },
      })
      .promise();
  } catch (error) {
    console.log(error.message);
  }
};

run().catch((err) => console.error(err));
