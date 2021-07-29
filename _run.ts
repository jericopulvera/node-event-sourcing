import Runner from "./src/Runner";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES = "77777";
process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE = "77777";

Runner.registerProjectors([path.resolve("./HotProductsProjector")]);

Runner.run();
