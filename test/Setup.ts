import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

import { EventStore } from "../src/EventStore";

export default async () => {
  try {
    await EventStore.createTable();
  } catch (_) {}
};
