import { KafkaConsumer } from "node-rdkafka";
import queue from "async/queue";
import CommitManager from "./CommitManager";
import Kafka from "node-rdkafka";
import { EventDto } from "../Dto";

class Consumer {
  public consumer: KafkaConsumer;
  public maxParallelHandles: string | number = 10;
  public maxQueueSize: string | number = 30;
  public paused = true;
  public msgQueue: unknown = [];
  public projectors: unknown = [];
  public listeners: unknown = [];

  public globalConfig: Kafka.ConsumerGlobalConfig = {};
  public topicConfig: Kafka.ConsumerTopicConfig = {};

  constructor(
    projectors: AsyncGeneratorFunction[],
    listeners: AsyncGeneratorFunction[],
    globalConfig: Kafka.ConsumerGlobalConfig,
    topicConfig: Kafka.ConsumerTopicConfig
  ) {
    this.projectors = projectors;
    this.listeners = listeners;

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
    data: unknown,
    handler: AsyncGeneratorFunction
  ): Promise<void> {
    try {
      CommitManager.notifyStartProcessing(data);
      await handler(data);
    } catch (e) {
      console.error(`Error handling message: ${e}`);
    } finally {
      CommitManager.notifyFinishedProcessing(data);
    }
  }

  public handleData(data: EventDto): void {
    const hasHandler =
      this.projectors.some((i) => i.name.slice(2) === data.topic) ||
      this.listeners.some((i) => i.name.slice(2) === data.topic);

    console.log({ hasHandler, topic: data.topic });
    if (hasHandler) {
      this.msgQueue.push(data);

      if (this.msgQueue.length() > this.maxQueueSize) {
        this.consumer.pause(this.consumer.assignments());
        this.paused = true;
      }
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
      CommitManager.onRebalance();
    } else {
      console.error(`Rebalace error : ${err}`);
    }
  }

  public start(): void {
    this.consumer = new Kafka.KafkaConsumer(
      {
        ...this.globalConfig,
        rebalance_cb: (err, assignments) => this.onRebalance(err, assignments),
      },
      {
        ...this.topicConfig,
      }
    );

    this.msgQueue = queue(async (data, done) => {
      const handler =
        this.projectors.find((i) => i.name.slice(2) === data.topic) ||
        this.listeners.find((i) => i.name.slice(2) === data.topic);

      console.log({ handler });
      await this.handleCB(data, handler);
      done();
    }, this.maxParallelHandles);

    this.msgQueue.drain(async () => {
      console.log("draining");
      if (this.paused) {
        this.consumer.resume(this.consumer.assignments());
        this.paused = false;
      }
    });

    this.consumer.on("ready", (arg) => {
      console.log("consumer ready." + JSON.stringify(arg));
      this.consumer.subscribe(["test"]);
      this.consumer.consume();

      CommitManager.start(this.consumer);
    });

    this.consumer.on("data", (data) => this.handleData(data));

    this.consumer.on("event.error", (err) => {
      console.error("Error from consumer");
      console.error(err);
    });

    this.consumer.connect();

    ["unhandledRejection", "uncaughtException"].map((type) => {
      process.on(type, async (e) => {
        try {
          console.log(`process.on ${type}`);
          console.error(e);
          await this.consumer.disconnect();
          process.exit(0);
        } catch (_) {
          process.exit(1);
        }
      });
    });

    ["SIGTERM", "SIGINT", "SIGUSR2"].map((type) => {
      process.once(type, async () => {
        try {
          await this.consumer.disconnect();
        } finally {
          process.kill(process.pid, type);
        }
      });
    });
  }
}

export default Consumer;
