import EventStore from "./EventStore";
import AWS from "aws-sdk";
import { Kafka } from "kafkajs";

const brokers = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];

const kafka = new Kafka({
  clientId: "my-app",
  brokers,
});

const producer = kafka.producer();

class Publisher {
  async publishEvents(
    events: AWS.DynamoDB.DocumentClient.ItemList
  ): Promise<void> {
    const eventsTopic = process.env.KAFKA_EVENTS_TOPIC || "GlobalEvents";

    for (const event of events) {
      if (typeof event.aggregateId !== "string") return;
      await producer.send({
        topic: eventsTopic,
        messages: [{ key: event.aggregateId, value: JSON.stringify(event) }],
      });
    }
  }

  async run(): Promise<void> {
    await producer.connect();

    const exec = async () => {
      const events = (await EventStore.getUnpublishedEvents()).Items;

      if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "INFO") {
        console.debug(`Publishing ${events?.length} Events`);
      }

      try {
        if (events?.length) {
          await Promise.all([
            EventStore.markEventsAsPublished(events),
            this.publishEvents(events || []),
          ]);
        }

        if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "INFO") {
          console.info(`Published ${events?.length} events`);
        }
      } catch (error) {
        if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "ERROR") {
          console.error(error, "something went wrong publishing event");
        }
      }

      setTimeout(async () => {
        await exec();
      }, 500);
    };

    await exec();
  }
}

export default new Publisher();
