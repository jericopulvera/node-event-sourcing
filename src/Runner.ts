import { ConsumerTopicConfig } from "node-rdkafka";
import { EventHandlersClassType } from "./Dto";
import Consumer from "./Messaging/Consumer";

class Runner {
  projectors: EventHandlersClassType[] = [];
  listeners: EventHandlersClassType[] = [];
  consumers!: Consumer[];

  async registerListeners(listeners: string[]) {
    for (const listener of listeners) {
      const ListenerClass = (await import(listener)).default;

      this.listeners.push(ListenerClass);
    }
  }

  async registerProjectors(projectors: string[]) {
    for (const projector of projectors) {
      const ProjectorClass = (await import(projector)).default;
      this.projectors.push(ProjectorClass);
    }
  }

  async run() {
    const groupId = process.env.KAFKA_GROUP_ID || "example-group";
    const offsetReset: ConsumerTopicConfig["auto.offset.reset"] = [
      "smallest",
      "earliest",
      "beginning",
      "largest",
      "latest",
      "end",
      "error",
    ].find(
      (v) => v === process.env.KAFKA_OFFSET_RESET
    ) as ConsumerTopicConfig["auto.offset.reset"];

    this.consumers = [
      new Consumer(
        this.listeners,
        {
          "metadata.broker.list": "localhost:9092",
          "group.id": groupId,
          "allow.auto.create.topics": true,
          "enable.auto.commit": false,
          log_level: 6,
        },
        {
          "auto.offset.reset": offsetReset || "beginning",
        }
      ),
    ];

    this.projectors.forEach((projector) => {
      this.consumers.push(
        new Consumer(
          [projector],
          {
            "metadata.broker.list": "localhost:9092",
            "group.id": `${groupId}_${projector.name}`,
            "allow.auto.create.topics": true,
            "enable.auto.commit": false,
            log_level: 6,
          },
          {
            "auto.offset.reset": offsetReset || "beginning",
          }
        )
      );
    });

    await Promise.all(this.consumers.map((consumer) => consumer.start()));
  }

  async stop() {
    try {
      await Promise.all(
        this.consumers.map((consumer) => consumer.disconnect())
      );
    } catch (error) {
      console.error(error);
    }
  }
}

export default new Runner();
