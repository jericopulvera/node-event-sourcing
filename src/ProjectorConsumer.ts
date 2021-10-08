import { Kafka, Consumer as KafkaConsumer } from "kafkajs";
import { EventDto, EventHandlersClassType } from "./Dto";
import { tryParseJSONObject } from "./Helper";

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
    console.log(`${this.groupId}_${this.projector.name}`);

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

          const handler = projector[`on${topic}`];

          if (typeof handler === "function") {
            // @ts-ignore
            await handler(event);
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
    console.log(`Disconnecting: ${this.projector.name}`);
    this.kafkaConsumer.disconnect();
  }
}

export default ProjectorConsumer;
