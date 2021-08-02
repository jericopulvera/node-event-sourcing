interface EventDto {
  aggregateId?: string;
  version?: number;
  event: string;
  payload: unknown;
}

export { EventDto };
