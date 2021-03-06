import { Kafka, Consumer as KafkaConsumer } from "kafkajs";
import { ListenerHandlerClassType } from "./Dto";
import { tryParseJSONObject } from "./Helper";
import ErrorStore from "./ErrorStore";
const eventsTopic = process.env.KAFKA_EVENTS_TOPIC || "GlobalEvents";

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
    this.kafkaConsumer = this.kafka.consumer({
      groupId: `${this.groupId}`,
    });

    const run = async () => {
      await this.kafkaConsumer.connect();

      await this.kafkaConsumer.subscribe({
        topic: eventsTopic,
        fromBeginning: true,
      });

      await this.kafkaConsumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          if (topic !== eventsTopic) return;
          const event = tryParseJSONObject(message.value?.toString());

          if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "INFO") {
            console.info(
              `Listener ${this.groupId} consuming ${topic} in partition ${partition}`
            );
          }

          if (typeof event === "object") {
            const listener = this.listeners.find(
              (listener) =>
                listener.event === event.event ||
                listener.constructor.name.slice(0, -8) === event.event
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
                let errorMessage = "Failed to do something exceptional";

                if (error instanceof Error) {
                  errorMessage = error.message;
                }

                await ErrorStore.create({
                  event: `topic#${this.groupId}`,
                  date: new Date().toISOString(),
                  payload: {
                    message: errorMessage,
                    text: JSON.stringify(error),
                  },
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
