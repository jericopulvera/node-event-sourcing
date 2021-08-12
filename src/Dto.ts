interface EventDto {
  topic?: string;
  aggregateId?: string;
  version?: number;
  event: string;
  payload: unknown;
}

interface EventHandlersClassType {
  new (): {
    // handle?(arg0: EventDto): void;
    [index: string]: void;
  };
}

export { EventDto, EventHandlersClassType };
