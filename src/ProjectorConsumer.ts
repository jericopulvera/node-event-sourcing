import { Kafka, Consumer as KafkaConsumer } from "kafkajs";
import { EventHandlersClassType } from "./Dto";
import { tryParseJSONObject } from "./Helper";
import EventStore from "./EventStore";

class ProjectorConsumer {
  kafka!: Kafka;
  kafkaConsumer!: KafkaConsumer;
  projector!: EventHandlersClassType;
  eventHandlers: EventHandlersClassType[] = [];
  groupId = "";

  constructor(
    kafka: Kafka,
    groupId: string,
    projector: EventHandlersClassType
  ) {
    this.kafka = kafka;
    this.groupId = groupId;
    this.projector = projector;
  }

  public start(): void {
    const topics: string[] = [];

    Object.getOwnPropertyNames(this.projector.prototype).forEach((value) => {
      if (value.slice(0, 2) === "on") {
        topics.push(value.slice(2));
      }
    });

    this.kafkaConsumer = this.kafka.consumer({
      groupId: `${this.groupId}_${this.projector.name}`,
    });

    const projector = new this.projector();

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
              `Projector ${this.groupId}_${this.projector.name} consuming ${topic} in partition ${partition}`
            );
          }

          if (typeof event === "object") {
            const handler = projector[`on${topic}`];

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
      console.log(`Disconnecting: ${this.projector.name}`);
    }

    this.kafkaConsumer.disconnect();
  }
}

export default ProjectorConsumer;
