import { KafkaConsumer } from "node-rdkafka";
import { queue, QueueObject } from "async";
import CommitManager from "./CommitManager";
import Kafka from "node-rdkafka";
import { EventDto, EventHandlersClassType } from "../Dto";

function isJson(item: string | null) {
  item = typeof item !== "string" ? JSON.stringify(item) : item;

  try {
    item = JSON.parse(item);
  } catch (e) {
    return false;
  }

  if (typeof item === "object" && item !== null) {
    return true;
  }

  return false;
}

class Consumer {
  consumer!: KafkaConsumer;
  msgQueue!: QueueObject<Kafka.Message>;
  globalConfig: Kafka.ConsumerGlobalConfig = {};
  topicConfig: Kafka.ConsumerTopicConfig = {};
  eventHandlers: EventHandlersClassType[] = [];
  maxParallelHandles: string | number = 10;
  maxQueueSize: string | number = 30;
  paused = false;
  consumerName = "";
  commitManager!: CommitManager;
  consumeInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    eventHandlers: EventHandlersClassType[],
    globalConfig: Kafka.ConsumerGlobalConfig,
    topicConfig: Kafka.ConsumerTopicConfig
  ) {
    this.eventHandlers = eventHandlers;

    this.globalConfig = globalConfig;
    this.topicConfig = topicConfig;

    this.maxParallelHandles = isNaN(
      Number(process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES)
    )
      ? Number(process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES)
      : 10;

    this.maxQueueSize = isNaN(Number(process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE))
      ? Number(process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE)
      : 30;
  }

  public async handleCB(
    data: Kafka.Message,
    handler: (arg0: EventDto) => void
  ): Promise<void> {
    try {
      this.commitManager.notifyStartProcessing(data);

      if (data.value && isJson(data.value?.toString())) {
        const message = JSON.parse(data.value.toString());

        await handler(message);
      }

      this.commitManager.notifyFinishedProcessing(data);
    } catch (e) {
      console.error(`Error handling message: ${e}`);
    }
  }

  public onRebalance(
    err: Kafka.LibrdKafkaError,
    assignments: Kafka.Assignment[]
  ): void {
    if (err.code === Kafka.CODES.ERRORS.ERR__ASSIGN_PARTITIONS) {
      this.consumer.assign(assignments);
    } else if (err.code === Kafka.CODES.ERRORS.ERR__REVOKE_PARTITIONS) {
      if (this.paused) {
        this.consumer.resume(assignments);
        this.paused = false;
      }
      this.msgQueue.remove(() => {
        return true;
      });
      this.consumer.unassign();
      this.commitManager.onRebalance();
    } else {
      console.error(`Rebalace error : ${err}`);
    }
  }

  public start(): void {
    this.consumer = new Kafka.KafkaConsumer(
      {
        ...this.globalConfig,
        rebalance_cb: (
          err: Kafka.LibrdKafkaError,
          assignments: Kafka.Assignment[]
        ) => this.onRebalance(err, assignments),
      },
      {
        ...this.topicConfig,
      }
    );

    this.msgQueue = queue((data, done) => {
      let handler;

      this.eventHandlers.forEach((eventHandler) => {
        if (eventHandler.name.slice(0, -8) === data.topic) {
          handler = new eventHandler()["handle"];
        }

        if (typeof new eventHandler()[`on${data.topic}`] === "function") {
          handler = new eventHandler()[`on${data.topic}`];
        }
      });

      if (handler) {
        this.handleCB(data, handler);
      }

      done();
    }, Number(this.maxParallelHandles));

    this.msgQueue.drain(() => {
      if (this.paused) {
        this.consumer.resume(this.consumer.assignments());
        this.paused = false;
      }
    });

    this.consumer.connect();

    this.consumer.on("ready", (arg) => {
      this.consumerName = JSON.stringify(arg);
      console.log("consumer ready." + this.consumerName);
      const topics: string[] = [];

      this.eventHandlers.forEach((eventHandler) => {
        if (eventHandler.name.slice(-8) === "Listener") {
          topics.push(eventHandler.name.slice(0, -8));
        } else {
          Object.getOwnPropertyNames(eventHandler.prototype).forEach(
            (value) => {
              if (value.slice(0, 2) === "on") {
                topics.push(value.slice(2));
              }
            }
          );
        }
      });

      this.consumer.subscribe(topics);

      this.consumeInterval = setInterval(() => {
        this.consumer.consume(10);
      }, 10000);

      this.commitManager = new CommitManager();

      this.commitManager.start(this.consumer);
    });

    this.consumer.on("data", (data) => {
      this.msgQueue.push(data);

      if (this.msgQueue.length() > this.maxQueueSize) {
        this.consumer.pause(this.consumer.assignments());
        this.paused = true;
      }
    });

    this.consumer.on("event.error", (err) => {
      console.error("Error from consumer");
      console.error(err);
    });
  }

  public async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }
}

export default Consumer;
