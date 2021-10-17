import { EventHandlersClassType, ListenerHandlerClassType } from "./Dto";
import ListenerConsumer from "./ListenerConsumer";
import ProjectorConsumer from "./ProjectorConsumer";
import EventStore from "./EventStore";
import ErrorStore from "./ErrorStore";
import { Kafka } from "kafkajs";

class Runner {
  kafka!: Kafka;
  listenerConsumer: ListenerConsumer | undefined;
  listeners: ListenerHandlerClassType[] = [];
  projectors: EventHandlersClassType[] = [];
  projectorsConsumers: ProjectorConsumer[] = [];

  constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];
    const clientId = process.env.KAFKA_CLIENT_ID || "default-client-id";

    let logLevel = 4;
    if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "NOTHING") logLevel = 0;
    if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "ERROR") logLevel = 1;
    if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "WARN") logLevel = 2;
    if (process.env.KAFKA_LOG_LEVEL?.toUpperCase() === "DEBUG") logLevel = 5;

    this.kafka = new Kafka({
      logLevel,
      brokers,
      clientId,
    });
  }

  async registerListeners(listeners: string[]): Promise<void> {
    for (const listener of listeners) {
      const ListenerClass = (await import(listener)).default;
      this.listeners.push(new ListenerClass());
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

    try {
      await ErrorStore.createTable();
      await EventStore.createTable();
      // eslint-disable-next-line no-empty
    } catch (_) {}

    if (this.listeners.length) {
      this.listenerConsumer = new ListenerConsumer(
        this.kafka,
        groupId,
        this.listeners
      );

      this.listenerConsumer.start();
    }

    for (const projector of this.projectors) {
      this.projectorsConsumers.push(
        new ProjectorConsumer(this.kafka, groupId, projector)
      );
    }

    for (const consumer of this.projectorsConsumers) {
      await consumer.start();
    }
  }

  stop(): void {
    if (this.listenerConsumer) {
      this.listenerConsumer.disconnect();
    }

    for (const consumer of this.projectorsConsumers) {
      consumer.disconnect();
    }
  }
}

export default Runner;
