import { EventHandlersClassType } from "./Dto";
import Consumer from "./Messaging/Consumer";

class Runner {
  projectors: FunctionConstructor[] = [];
  listeners: EventHandlersClassType[] = [];
  consumers!: Consumer[];

  registerListeners(listeners: string[]) {
    const storeListeners = async () => {
      for (const listener of listeners) {
        const ListenerClass = (await import(listener)).default;

        this.listeners.push(ListenerClass);
      }
    };
    storeListeners();
  }

  registerProjectors(projectors: string[]) {
    const storeProjectors = async () => {
      for (const projector of projectors) {
        const ProjectorClass = (await import(projector)).default;

        this.projectors.push(ProjectorClass);
      }
    };
    storeProjectors();
  }

  run() {
    // Create consumers for listeners and for each projector
    this.consumers = [
      new Consumer(
        this.listeners,
        {
          "metadata.broker.list": "localhost:9092",
          "group.id": "group1",
          "allow.auto.create.topics": true,
          "enable.auto.commit": false,
          log_level: 6,
        },
        {
          "auto.offset.reset": "beginning", // "beginning", "latest"
        }
      ),
    ];

    // this.projectors.forEach(
    //   (projector) => new Consumer(this.projectors, this.listeners, {}, {})
    // );

    this.consumers.forEach((consumer) => {
      consumer.start();
    });
  }
}

export default new Runner();
