import EventStore from "./EventStore";
import AWS from "aws-sdk";
import Kafka from "node-rdkafka";

const producer = new Kafka.HighLevelProducer({
  "metadata.broker.list": process.env.KAFKA_BROKERS || `localhost:9092`,
  "queue.buffering.max.messages": 10000000,
});

class Publisher {
  async publishEvents(
    events: AWS.DynamoDB.DocumentClient.ItemList
  ): Promise<void> {
    for (const event of events) {
      await new Promise<void>((resolve, reject) => {
        return producer.produce(
          event.event,
          null,
          Buffer.from(
            JSON.stringify({
              payload: Date.now().toString(),
            })
          ),
          null,
          Date.now(),
          (err) => {
            if (err) {
              console.log({ err });
              reject(err);
              return;
            }
            resolve();
          }
        );
      });
    }
  }

  async run(): Promise<void> {
    producer.connect();

    const exec = async () => {
      console.log("polling publisher");

      const events = (await EventStore.getUnpublishedEvents()).Items;

      console.log(events);

      await this.publishEvents(events || []);

      if (events?.length) {
        await EventStore.markEventsAsPublished(events);
      }

      setTimeout(async () => {
        await exec();
      }, 2000);
    };

    await exec();
  }
}

export default new Publisher();
