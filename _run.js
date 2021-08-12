/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const Runner = require("./dist/Runner");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES = "77777";
process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE = "77777";

Runner.default.registerListeners([
  path.resolve("./test/fixtures/Listeners/CartItemAddedListener.js"),
]);

Runner.default.run();
