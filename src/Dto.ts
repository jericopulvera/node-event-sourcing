interface EventDto {
  aggregateId: string;
  version: number;
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

interface EventHandlersClassType {
  new (): {
    [index: string]: string | void;
  };
}

interface ListenerHandlerClassType {
  event?: string;
  __invoke(arg0: EventDto): void;
  new (): {
    event?: string;
    __invoke(arg0: EventDto): void;
  };
}

export { EventDto, EventHandlersClassType, ListenerHandlerClassType };
