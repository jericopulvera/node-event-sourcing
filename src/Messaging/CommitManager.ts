/* eslint-disable @typescript-eslint/no-explicit-any */
import { KafkaConsumer } from "node-rdkafka";

const COMMIT_TIME_INTERVAL = 3000;
class CommitManager {
  consumer: KafkaConsumer | undefined;
  consumerConcurrency: string | number = 10;
  partitionsData: any = [];
  lastCommited: any = [];

  public start(consumer: KafkaConsumer | undefined): void {
    this.consumer = consumer;
    setInterval(() => {
      this.commitProcessedOffsets();
    }, COMMIT_TIME_INTERVAL);
  }

  public notifyStartProcessing(data: any): void {
    const partition = data.partition;
    const offset = data.offset;
    const topic = data.topic;
    this.partitionsData[partition] = this.partitionsData[partition] || [];
    this.partitionsData[partition].push({
      offset: offset,
      topic: topic,
      done: false,
    });
  }

  public notifyFinishedProcessing(data: any): void {
    const partition = data.partition;
    const offset = data.offset;

    this.partitionsData[partition] = this.partitionsData[partition] || [];

    const record = this.partitionsData[partition].filter(
      (record: { offset: any }) => {
        return record.offset === offset;
      }
    )[0];

    if (record) {
      record.done = true;
    }
  }

  public async commitProcessedOffsets(): Promise<void> {
    try {
      const offsetsToCommit = [];
      for (const key in this.partitionsData) {
        const pi = this.partitionsData[key].findIndex(
          (record: { done: any }) => {
            return record.done;
          }
        );

        // last processed index
        const npi = this.partitionsData[key].findIndex(
          (record: { done: any }) => {
            return !record.done;
          }
        );

        // first unprocessed index
        const lastProcessedRecord =
          npi > 0
            ? this.partitionsData[key][npi - 1]
            : pi > -1
            ? this.partitionsData[key][this.partitionsData[key].length - 1]
            : null;

        if (lastProcessedRecord) {
          offsetsToCommit.push({
            partition: Number(key) - 0,
            offset: lastProcessedRecord.offset + 1,
            topic: lastProcessedRecord.topic,
          });

          // remove commited records from array
          this.partitionsData[key].splice(
            0,
            this.partitionsData[key].indexOf(lastProcessedRecord) + 1
          );
        }
      }

      if (offsetsToCommit.length > 0) {
        this.consumer?.commit(offsetsToCommit);
      }

      this.lastCommited =
        offsetsToCommit.length > 0 ? offsetsToCommit : this.lastCommited;
      Promise.resolve();
    } catch (e) {
      Promise.reject(e);
    }
  }

  public onRebalance(): void {
    this.partitionsData = {};
  }

  public getLastCommited(): void {
    return this.lastCommited;
  }
}

export default CommitManager;
