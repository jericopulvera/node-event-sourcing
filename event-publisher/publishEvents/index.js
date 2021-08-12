"use strict";

const { Kafka, logLevel } = require("kafkajs");
const AWS = require("aws-sdk");

const brokers = process.env.KAFKA_BROKERS?.split(",") || [
  `b-1.demo-cluster-1.mbh1qh.c4.kafka.ap-southeast-2.amazonaws.com:9092`,
  `b-2.demo-cluster-1.mbh1qh.c4.kafka.ap-southeast-2.amazonaws.com:9092`,
];

const kafka = new Kafka({
  logLevel: logLevel.ERROR,
  brokers: brokers,
  clientId: "dynamodb-stream-producer",
});

const producer = kafka.producer();

exports.handler = async (event, context) => {
  await producer.connect();

  for (const record of event.Records) {
    if (record.eventName == "INSERT") {
      const data = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

      if (data.event) {
        await producer.send({
          topic: data.event,
          messages: [{ value: JSON.stringify(data) }],
        });
      }
    }
  }

  return `Successfully processed ${event.Records.length} records.`;
};
