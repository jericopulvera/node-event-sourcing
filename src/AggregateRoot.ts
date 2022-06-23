import EventStore from "./EventStore";
import { CreateEventDto, EventDto } from "./Dto";
import { ItemList } from "aws-sdk/clients/dynamodb";
import clone from "rfdc";
export default class AggregateRoot {
  public aggregateId!: string;
  public version = 0;
  public events: EventDto[] = [];
  public snapshotIn = 0;
  payload: unknown;

  public async createEvent(createEventData: CreateEventDto): Promise<void> {
    const eventData = {
      ...createEventData,
      aggregateId: this.aggregateId,
      version: this.version,
    };

    this.apply(eventData);

    await EventStore.createEvent(eventData);
    this.version++;

    if (
      this.snapshotIn &&
      this.events.length &&
      Number.isInteger(this.version / this.snapshotIn) &&
      this.version >= this.snapshotIn
    ) {
      const payload = JSON.parse(JSON.stringify(this));
      delete payload.events;
      delete payload.aggregateId;
      delete payload.version;
      delete payload.snapshotIn;

      const snapshotData = {
        aggregateId: this.aggregateId,
        version: this.version,
        event: "Snapshot",
        payload: payload,
        published: 1,
      };

      this.apply(snapshotData);
      await EventStore.createEvent(snapshotData);
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

      events?.sort(function (a, b) {
        return Number(a.version) - Number(b.version);
      });
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

  public async retrieveAll(aggregateId: string): Promise<this> {
    this.aggregateId = aggregateId;
    this.events = [];
    this.payload = undefined;
    let events: ItemList | undefined = [];

    events = (await EventStore.query(aggregateId)).Items;

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
    const eventData = clone()(event);
    // @ts-ignore
    if (typeof this[`apply${event.event}`] === "function") {
      // @ts-ignore
      this[`apply${event.event}`]({ ...eventData.payload });
    }
    this.events.push({ ...eventData });
  }
}
