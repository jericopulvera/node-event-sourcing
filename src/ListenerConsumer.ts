import { Kafka, Consumer as KafkaConsumer } from "kafkajs";
import { ListenerHandlerClassType } from "./Dto";
import EventStore from "./EventStore";
import { tryParseJSONObject } from "./Helper";

class ListenerConsumer {
  kafka!: Kafka;
  kafkaConsumer!: KafkaConsumer;
  listeners!: ListenerHandlerClassType[];
  groupId = "";

  constructor(
    kafka: Kafka,
    groupId: string,
    listeners: ListenerHandlerClassType[]
  ) {
    this.kafka = kafka;
    this.groupId = groupId;
    this.listeners = listeners;
  }

  public start(): void {
    const topics: string[] = [];

    this.kafkaConsumer = this.kafka.consumer({
      groupId: `${this.groupId}`,
    });

    for (const listener of this.listeners) {
      if (listener?.event) {
        topics.push(listener.event);
      } else {
        topics.push(listener.constructor.name.slice(0, -8));
      }
    }

    const run = async () => {
      await this.kafkaConsumer.connect();

      for (const topic of topics) {
        await this.kafkaConsumer.subscribe({ topic, fromBeginning: true });
      }

      await this.kafkaConsumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          const event = tryParseJSONObject(message.value?.toString());

          if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "INFO") {
            console.info(
              `Listener ${this.groupId} consuming ${topic} in partition ${partition}`
            );
          }

          if (typeof event === "object") {
            const listener = this.listeners.find(
              (listener) =>
                listener.event === topic ||
                listener.constructor.name.slice(0, -8) === topic
            );

            let handler;

            if (listener) handler = listener.__invoke;

            if (
              typeof handler === "function" &&
              typeof event.aggregateId === "string" &&
              typeof event.version === "number" &&
              typeof event.event === "string" &&
              typeof event.committedAt === "number" &&
              typeof event.published === "number"
            ) {
              try {
                // @ts-ignore
                await handler(event);
              } catch (error) {
                await EventStore.createEvent({
                  aggregateId: "ERROR",
                  version: Number(Date.now()),
                  event: "SystemUnhandledException",
                  payload: JSON.stringify(error),
                });
              }
            }
          }

          this.kafkaConsumer.commitOffsets([
            {
              topic,
              partition,
              offset: String(Number(message.offset) + 1),
            },
          ]);
        },
      });
    };

    run().catch((e) => console.error(`[example/consumer] ${e.message}`, e));
  }

  public disconnect(): void {
    if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "INFO") {
      console.log(`Disconnecting: ${this.groupId}`);
    }

    this.kafkaConsumer.disconnect();
  }
}

export default ListenerConsumer;
