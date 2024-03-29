import dotenv from "dotenv";
dotenv.config();

jest.setTimeout(30000);

import EventStore from "../src/EventStore";

const setup = async (): Promise<void> => {
  try {
    await EventStore.createTable();
    // eslint-disable-next-line no-empty
  } catch (_) {}
};

setup();

export default setup;
