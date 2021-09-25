import EventStore from "./EventStore";
import { EventDto } from "./Dto";
import { ItemList } from "aws-sdk/clients/dynamodb";

export default class AggregateRoot {
  public aggregateId: string | undefined;
  public version = 0;
  public events: EventDto[] = [];
  public snapshotIn = 0;

  public async createEvent(eventData: EventDto): Promise<void> {
    this.apply(eventData);

    eventData = {
      ...eventData,
      aggregateId: this.aggregateId,
      version: this.version,
    };

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
        published: 1,
      };

      this.apply(snapshotData);

      await EventStore.transactWrite([
        EventStore.createEventTransaction(eventData),
        EventStore.createEventTransaction(snapshotData),
      ]);

      this.version = this.version + 2;
    } else {
      await EventStore.createEvent(eventData);

      this.version++;
    }
  }

  public async retrieve(aggregateId: string): Promise<this> {
    this.aggregateId = aggregateId;
    this.events = [];
    let events: ItemList | undefined = [];

    if (this.snapshotIn) {
      events = (
        await EventStore.query(aggregateId, {
          limit: this.snapshotIn + 1,
          reverse: true,
        })
      ).Items;

      events = events?.reverse();
    } else {
      events = (await EventStore.query(aggregateId)).Items;
    }

    events?.forEach((event) => {
      this.version = Number(event.version) + 1;
      this.apply({
        aggregateId: String(event.aggregateId),
        version: Number(event.version),
        event: String(event.event),
        payload: event.payload,
      });
    });

    return this;
  }

  public apply(event: EventDto): void {
    // @ts-ignore
    this[`apply${event.event}`](event.payload);
    this.events.push(event);
  }
}
