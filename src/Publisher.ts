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
    for (const event of events) {
      await producer.send({
        topic: event.event,
        messages: [{ value: JSON.stringify(event) }],
      });
    }
  }

  async run(): Promise<void> {
    await producer.connect();

    const exec = async () => {
      const events = (await EventStore.getUnpublishedEvents()).Items;

      console.log("Events ", events?.length);
      try {
        if (events?.length) {
          await Promise.all([
            EventStore.markEventsAsPublished(events),
            this.publishEvents(events || []),
          ]);
        }
      } catch (error) {
        console.error(error, "something went wrong marking event as published");
      }

      setTimeout(async () => {
        await exec();
      }, 2000);
    };

    await exec();
  }
}

export default new Publisher();
