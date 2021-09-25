import dotenv from "dotenv";
dotenv.config();

import Runner from "./src/Runner";
import Publisher from "./src/Publisher";
import * as path from "path";

process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES = "77777";
process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE = "77777";

const runConsumers = async () => {
  await Runner.registerListeners([
    path.resolve("./test/fixtures/Listeners/CartItemAddedListener"),
  ]);

  await Runner.registerProjectors([
    path.resolve("./test/fixtures/Projectors/HotProductsProjector"),
  ]);

  Runner.run();

  Publisher.run();
};

runConsumers().catch((err) => {
  console.error(err);
});
