import { EventHandlersClassType } from "./Dto";
import ListenerConsumer from "./ListenerConsumer";
import ProjectorConsumer from "./ProjectorConsumer";
import { Kafka } from "kafkajs";

class Runner {
  projectors: EventHandlersClassType[] = [];
  listeners: EventHandlersClassType[] = [];
  listenersConsumers: ListenerConsumer[] = [];
  projectorsConsumers: ProjectorConsumer[] = [];
  kafka!: Kafka;

  constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];
    const clientId = process.env.KAFKA_CLIENT_ID || "default-client-id";

    let logLevel = 4;
    if (process.env.KAFKA_LOG_LEVEL === "NOTHING") logLevel = 0;
    if (process.env.KAFKA_LOG_LEVEL === "ERROR") logLevel = 1;
    if (process.env.KAFKA_LOG_LEVEL === "WARN") logLevel = 2;
    if (process.env.KAFKA_LOG_LEVEL === "DEBUG") logLevel = 5;

    this.kafka = new Kafka({
      logLevel,
      brokers,
      clientId,
    });
  }

  async registerListeners(listeners: string[]): Promise<void> {
    for (const listener of listeners) {
      const ListenerClass = (await import(listener)).default;
      this.listeners.push(ListenerClass);
    }
  }

  async registerProjectors(projectors: string[]): Promise<void> {
    for (const projector of projectors) {
      const ProjectorClass = (await import(projector)).default;

      this.projectors.push(ProjectorClass);
    }
  }

  async run(): Promise<void> {
    const groupId = process.env.KAFKA_GROUP_ID || "default-group";

    for (const projector of this.projectors) {
      this.projectorsConsumers.push(
        new ProjectorConsumer(this.kafka, groupId, projector)
      );
    }

    for (const consumer of this.projectorsConsumers) {
      await consumer.start();
    }

    // for (const consumer of this.listenersConsumers) {
    //   await consumer.start();
    // }
  }

  stop(): void {
    // for (const consumer of this.listenersConsumers) {
    //   consumer.disconnect();
    // }

    for (const consumer of this.projectorsConsumers) {
      consumer.disconnect();
    }
  }
}

export default Runner;
