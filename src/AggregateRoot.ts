import { Default, EventStore } from "./EventStore";

interface Event {
  aggregateId: string;
  version: number;
  event: string;
  payload: unknown;
}

class AggregateRoot {
  public aggregateId: string;
  public version = 0;
  public events: Event[] = [];
  public snapshotIn = 0;

  public async createEvent(eventData: Event): Promise<void> {
    this.apply(eventData);

    if (this.snapshotIn && this.events.length % this.snapshotIn === 0) {
      const payload = JSON.parse(JSON.stringify(this));
      delete payload.events;
      delete payload.aggregateId;
      delete payload.version;
      delete payload.snapshotIn;

      const snapshotData = {
        aggregateId: this.aggregateId,
        version: this.version + 1,
        event: "Snapshot",
        payload: payload,
        active: 1,
      };

      this.apply(snapshotData);

      await Default.transactWrite([
        EventStore.putTransaction({
          aggregateId: this.aggregateId,
          version: this.version,
          event: eventData.event,
          payload: eventData.payload,
          active: 1,
        }),
        EventStore.putTransaction(snapshotData),
      ]);

      this.version = this.version + 2;
    } else {
      await EventStore.put({
        aggregateId: this.aggregateId,
        version: this.version,
        event: eventData.event,
        payload: eventData.payload,
      });

      this.version++;
    }
  }

  public async retrieve(aggregateId: string): Promise<this> {
    this.aggregateId = aggregateId;
    this.events = [];
    let events = [];

    if (this.snapshotIn) {
      events = (
        await EventStore.query(aggregateId, {
          limit: this.snapshotIn + 1,
          reverse: true,
        })
      ).Items;

      events = events.reverse();
    } else {
      events = (await EventStore.query(aggregateId)).Items;
    }

    events.forEach((event) => {
      this.version = event.version + 1;

      this.apply(event);
    });

    return this;
  }

  public apply(event: Event): void {
    this[`apply${event.event}`](event.payload);
    this.events.push(event);
  }
}

export default AggregateRoot;
