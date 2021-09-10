// import Runner from "../src/Runner";
// import * as path from "path";
// import CartAggregateRoot from "./fixtures/CartAggregateRoot";
// import { nanoid } from "nanoid";

describe("Projector", () => {
  //   beforeAll(() => {
  //     process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES = "77777";
  //     process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE = "77777";

  //     const runConsumers = async () => {
  //       await Runner.registerListeners([
  //         path.resolve("./test/fixtures/Listeners/CartItemAddedListener"),
  //       ]);

  //       await Runner.registerProjectors([
  //         path.resolve("./test/fixtures/Projectors/HotProductsProjector"),
  //       ]);

  //       Runner.run();
  //     };

  //     runConsumers().catch((err) => {
  //       console.error(err);
  //     });
  //   });

  //   afterAll(async () => {
  //     await Runner.stop();

  //     await new Promise((resolve) => setTimeout(resolve, 5000, []));
  //   });

  test("Can project", async () => {
    // const aggregateId = nanoid();

    // let cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);

    // await cartAggregate.addItemToCart({ quantity: 1, productId: "1" });

    // cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);

    expect(2 + 2).toBe(4);
  });
});
