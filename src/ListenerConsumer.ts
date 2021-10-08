import Kafka from "kafkajs";
import { EventDto, EventHandlersClassType } from "./Dto";

class ListenerConsumer {
  eventHandlers: EventHandlersClassType[] = [];
  maxParallelHandles: string | number = 10;
  maxQueueSize: string | number = 30;
  paused = false;
  consumerName = "";

  constructor(eventHandlers: EventHandlersClassType[]) {
    this.eventHandlers = eventHandlers;
  }

  public start(): void {}
}

export default ListenerConsumer;
