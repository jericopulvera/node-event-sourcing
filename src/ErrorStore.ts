import DynamoDB from "aws-sdk/clients/dynamodb";

class ErrorStore {
  tableName = "ErrorStore";
  documentClient: DynamoDB.DocumentClient;
  service: DynamoDB;

  constructor() {
    this.tableName = process.env.ERRORSTORE_TABLE_NAME || "ERRORSTORE_NAME";
    this.tableName = `${process.env.DYNAMODB_PREFIX}_${this.tableName}`;

    if (String(process.env.DYNAMODB_LOCAL) === "true") {
      this.service = new DynamoDB({
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
          { AttributeName: "event", KeyType: "HASH" },
          { AttributeName: "date", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "event", AttributeType: "S" },
          { AttributeName: "date", AttributeType: "S" },
        ],
      })
      .promise();
  }

  async create(data: { event: string; date: string; payload: unknown }) {
    return await this.documentClient
      .put({
        TableName: this.tableName,
        Item: {
          ...data,
        },
      })
      .promise();
  }
}

export default new ErrorStore();
