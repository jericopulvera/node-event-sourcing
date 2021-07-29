import { Table, Entity } from "dynamodb-toolbox";
const TableName = process.env.EVENTSTORE_NAME || "EventStore";
import DynamoDB from "aws-sdk/clients/dynamodb";
let service;

if (String(process.env.DYNAMODB_LOCAL) === "true") {
  service = new DynamoDB({
    region: process.env.AWS_REGION,
    endpoint: process.env.DYNAMODB_URL || "http://localhost:8000",
  });
} else {
  service = new DynamoDB({
    region: process.env.AWS_REGION,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  });
}

const DocumentClient = new DynamoDB.DocumentClient({
  service: service,
});

const Default = new Table({
  name: TableName,
  partitionKey: "aggregateId",
  sortKey: "version",
  attributes: {
    aggregateId: "string",
    version: "number",
    event: "string",
    payload: "map",
    committedAt: "string",
    active: "number",
  },
  indexes: {
    ActiveCommittedAtIndex: {
      partitionKey: "active",
      sortKey: "committedAt",
    },
  },
  DocumentClient,
});

const EventStore = new Entity({
  name: "EventStore",
  attributes: {
    aggregateId: { partitionKey: true },
    version: { sortKey: true, type: "number" },
    event: { type: "string" },
    payload: { type: "map" },
    active: { type: "number" },
  },
  created: "committedAt",
  table: Default,
});

EventStore.createTable = async () => {
  return service
    .createTable({
      TableName: TableName,
      KeySchema: [
        { AttributeName: "aggregateId", KeyType: "HASH" },
        { AttributeName: "version", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "aggregateId", AttributeType: "S" },
        { AttributeName: "version", AttributeType: "N" },
        { AttributeName: "active", AttributeType: "N" },
        { AttributeName: "committedAt", AttributeType: "S" },
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
};

export { Default, EventStore };
