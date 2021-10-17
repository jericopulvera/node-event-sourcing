"use strict";

const { Kafka, logLevel } = require("kafkajs");
const AWS = require("aws-sdk");

const brokers = process.env.KAFKA_BROKERS?.split(",") || [`172.31.10.238:9092`];
const eventsTopic = process.env.KAFKA_EVENTS_TOPIC || "GlobalEvents";

const kafka = new Kafka({
  logLevel: logLevel.ERROR,
  brokers: brokers,
  clientId: "dynamodb-stream-producer",
});

const producer = kafka.producer();

exports.handler = async (event, _) => {
  await producer.connect();

  for (const record of event.Records) {
    if (record.eventName == "INSERT") {
      const data = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

      if (typeof data?.event?.aggregateId !== "string") return;

      await producer.send({
        topic: eventsTopic,
        messages: [
          { key: data.event.aggregateId, value: JSON.stringify(data) },
        ],
      });
    }
  }

  return `Successfully processed ${event.Records.length} records.`;
};
