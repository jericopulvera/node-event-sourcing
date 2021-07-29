const COMMIT_TIME_INTERVAL = 5000;

class CommitManager {
  public consumer: any;
  public consumerConcurrency: string | number = 10;
  public msgQueue: any = [];
  public partitionsData: any = [];
  public lastCommited: any = [];

  public start(consumer) {
    this.consumer = consumer;
    setInterval(() => {
      this.commitProcessedOffsets();
    }, COMMIT_TIME_INTERVAL);
  }

  public notifyStartProcessing(data) {
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

  public notifyFinishedProcessing(data) {
    const partition = data.partition;

    const offset = data.offset;

    this.partitionsData[partition] = this.partitionsData[partition] || [];

    const record = this.partitionsData[partition].filter((record) => {
      return record.offset === offset;
    })[0];

    if (record) {
      record.done = true;
    }
  }

  public async commitProcessedOffsets() {
    try {
      const offsetsToCommit = [];
      for (const key in this.partitionsData) {
        const pi = this.partitionsData[key].findIndex((record) => {
          return record.done;
        });

        // last processed index
        const npi = this.partitionsData[key].findIndex((record) => {
          return !record.done;
        });

        // first unprocessed index
        const lastProcessedRecord =
          npi > 0
            ? this.partitionsData[key][npi - 1]
            : pi > -1
            ? this.partitionsData[key][this.partitionsData[key].length - 1]
            : null;

        if (lastProcessedRecord) {
          offsetsToCommit.push({
            // @ts-ignore
            partition: key - 0,
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
        this.consumer.commit(offsetsToCommit);
      }

      this.lastCommited =
        offsetsToCommit.length > 0 ? offsetsToCommit : this.lastCommited;
      Promise.resolve();
    } catch (e) {
      Promise.reject(e);
    }
  }

  public onRebalance() {
    this.partitionsData = {};
  }

  public getLastCommited() {
    return this.lastCommited;
  }
}

export default new CommitManager();
