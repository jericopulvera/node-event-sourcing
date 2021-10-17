import { Kafka, Consumer as KafkaConsumer } from "kafkajs";
import { EventHandlersClassType } from "./Dto";
import { tryParseJSONObject } from "./Helper";
import ErrorStore from "./ErrorStore";
const eventsTopic = process.env.KAFKA_EVENTS_TOPIC || "GlobalEvents";

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
    this.kafkaConsumer = this.kafka.consumer({
      groupId: `${this.groupId}_${this.projector.name}`,
    });

    const projector = new this.projector();

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
              `Projector ${this.groupId}_${this.projector.name} consuming ${topic} in partition ${partition}`
            );
          }

          if (typeof event === "object") {
            const handler = projector[`on${event.event}`];

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
                  event: `topic#${this.projector.name}`,
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
      console.log(`Disconnecting: ${this.projector.name}`);
    }

    this.kafkaConsumer.disconnect();
  }
}

export default ProjectorConsumer;
