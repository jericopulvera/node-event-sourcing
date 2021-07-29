import { KafkaConsumer } from "node-rdkafka";
import queue from "async/queue";
import CommitManager from "./CommitManager";
import Kafka from "node-rdkafka";

class Consumer {
  public consumer: KafkaConsumer;
  public maxParallelHandles: string | number = 10;
  public maxQueueSize: string | number = 30;
  public paused = true;
  public msgQueue: any = [];
  public projectors: any = [];
  public listeners: any = [];

  public globalConfig: {
    brokers: string[];
    groupId: string;
    allowAutoCreateTopics: boolean;
  } = {
    brokers: [],
    groupId: "",
    allowAutoCreateTopics: true,
  };

  public topicConfig: {
    offsetReset: string;
  } = { offsetReset: "beginning" };

  constructor(projectors, listeners) {
    this.projectors = projectors;
    this.listeners = listeners;

    this.globalConfig.brokers = process.env.KAFKA_BROKERS.split(",")
      .filter((i) => i)
      .map((i) => i.trim());

    this.globalConfig.groupId = process.env.KAFKA_GROUP_ID || "example-group";

    this.globalConfig.allowAutoCreateTopics = process.env
      .KAFKA_AUTO_CREATE_TOPICS
      ? true
      : false;

    this.topicConfig.offsetReset =
      process.env.KAFKA_OFFSET_RESET || "beginning";

    this.maxParallelHandles = isNaN(
      Number(process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES)
    )
      ? Number(process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES)
      : 10;

    this.maxQueueSize = isNaN(Number(process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE))
      ? Number(process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE)
      : 30;
  }

  public async handleCB(data, handler) {
    try {
      CommitManager.notifyStartProcessing(data);
      await handler(data);
    } catch (e) {
      console.error(`Error handling message: ${e}`);
    } finally {
      CommitManager.notifyFinishedProcessing(data);
    }
  }

  public async handleData(data) {
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

  public onRebalance(err, assignments) {
    if (err.code === Kafka.CODES.ERRORS.ERR__ASSIGN_PARTITIONS) {
      this.consumer.assign(assignments);
    } else if (err.code === Kafka.CODES.ERRORS.ERR__REVOKE_PARTITIONS) {
      if (this.paused) {
        this.consumer.resume(assignments);
        this.paused = false;
      }
      this.msgQueue.remove((d, p) => {
        return true;
      });
      this.consumer.unassign();
      CommitManager.onRebalance();
    } else {
      console.error(`Rebalace error : ${err}`);
    }
  }

  public async start() {
    this.consumer = new Kafka.KafkaConsumer(
      {
        "metadata.broker.list": this.globalConfig.brokers.length
          ? this.globalConfig.brokers
          : "localhost:9092",
        "group.id": this.globalConfig.groupId,
        "allow.auto.create.topics": this.globalConfig.allowAutoCreateTopics,
        "enable.auto.commit": false,
        log_level: 6,
        rebalance_cb: (err, assignments) => this.onRebalance(err, assignments),
      },
      {
        "auto.offset.reset": this.topicConfig.offsetReset,
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
