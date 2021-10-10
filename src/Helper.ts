export function isJson(item: string | null): boolean {
  item = typeof item !== "string" ? JSON.stringify(item) : item;

  try {
    item = JSON.parse(item);
  } catch (e) {
    return false;
  }

  if (typeof item === "object" && item !== null) {
    return true;
  }

  return false;
}

export function tryParseJSONObject(jsonString: string | undefined):
  | {
      aggregateId: string;
      version: string;
      event: string;
      published: number;
      committedAt: string;
      payload: never;
    }
  | boolean {
  try {
    // @ts-ignore
    const o = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return o;
    }
    // eslint-disable-next-line no-empty
  } catch (e) {}

  return false;
}
