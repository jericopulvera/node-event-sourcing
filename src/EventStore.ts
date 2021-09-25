import DynamoDB from "aws-sdk/clients/dynamodb";
import { EventDto } from "./Dto";
class EventStore {
  tableName = "EventStore";
  documentClient: DynamoDB.DocumentClient;
  service: DynamoDB;

  constructor() {
    this.tableName = process.env.EVENTSTORE_NAME || "EventStore";

    if (String(process.env.DYNAMODB_LOCAL) === "true") {
      this.service = new DynamoDB({
        region: process.env.AWS_REGION,
        endpoint: process.env.DYNAMODB_URL || "http://localhost:8000",
      });
    } else {
      this.service = new DynamoDB({
        region: process.env.AWS_REGION,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      });
    }

    this.documentClient = new DynamoDB.DocumentClient({
      service: this.service,
    });
  }

  async createTable() {
    await this.service
      .createTable({
        TableName: this.tableName,
        KeySchema: [
          { AttributeName: "aggregateId", KeyType: "HASH" },
          { AttributeName: "version", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "aggregateId", AttributeType: "S" },
          { AttributeName: "version", AttributeType: "N" },
          { AttributeName: "published", AttributeType: "N" },
          { AttributeName: "committedAt", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10,
        },
        GlobalSecondaryIndexes: [
          {
            IndexName: "PublishedCommittedAtIndex",
            KeySchema: [
              {
                AttributeName: "published",
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
  }

  async query(
    aggregateId: string,
    options?: { limit: number; reverse: boolean }
  ) {
    return this.documentClient
      .query({
        TableName: this.tableName,
        KeyConditionExpression: "aggregateId = :aggregateId",
        ExpressionAttributeValues: {
          ":aggregateId": aggregateId,
        },
        Limit: options?.limit,
        ScanIndexForward: options?.reverse ? false : true,
      })
      .promise();
  }

  createEventTransaction(eventData: EventDto) {
    return {
      Put: {
        TableName: this.tableName,
        Item: {
          ...eventData,
          published: process.env.POLLING_PUBLISHER ? 1 : 0,
          committedAt: Date.now(),
        },
      },
    };
  }

  async createEvent(eventData: EventDto) {
    return await this.documentClient
      .put({
        TableName: this.tableName,
        Item: {
          ...eventData,
          published: 1,
          committedAt: Date.now(),
        },
      })
      .promise();
  }

  async transactWrite(events: DynamoDB.DocumentClient.TransactWriteItemList) {
    return await this.documentClient
      .transactWrite({
        TransactItems: events,
      })
      .promise();
  }

  async getUnpublishedEvents() {
    return await this.documentClient
      .query({
        TableName: this.tableName,
        IndexName: "PublishedCommittedAtIndex",
        KeyConditionExpression: "published = :published",
        ExpressionAttributeValues: {
          ":published": 0,
        },
        Limit: 10,
      })
      .promise();
  }

  async markEventsAsPublished(
    events: DynamoDB.DocumentClient.ItemList | undefined
  ) {
    const params: DynamoDB.DocumentClient.BatchWriteItemInput = {
      RequestItems: {},
    };

    params.RequestItems[this.tableName] = [];
    events?.forEach((event) => {
      params.RequestItems[this.tableName].push({
        PutRequest: {
          Item: { ...event, published: 1 },
        },
      });
    });

    await this.documentClient.batchWrite(params).promise();
  }
}

export default new EventStore();
