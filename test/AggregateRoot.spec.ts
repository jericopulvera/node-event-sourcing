import CartAggregateRoot from "./fixtures/CartAggregateRoot";
const { nanoid } = require("nanoid");

describe("AggregateRoot", () => {
  test("Can create and apply event", async () => {
    const aggregateId = nanoid();

    let cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);

    await cartAggregate.addItemToCart({ quantity: 1, productId: "1" });

    cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);

    expect(cartAggregate.events.length).toBe(1);
    expect(cartAggregate.items).toEqual([
      {
        productId: "1",
        quantity: 1,
      },
    ]);
  });

  test("Can create snapshot", async () => {
    const aggregateId = nanoid();

    for (let index = 0; index < 20; index++) {
      const cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);
      cartAggregate.snapshotIn = 10;
      await cartAggregate.addItemToCart({ quantity: 1, productId: "1" });
    }

    let cartAggregate = new CartAggregateRoot();
    cartAggregate.snapshotIn = 10;
    cartAggregate = await cartAggregate.retrieve(aggregateId);

    expect(cartAggregate.items).toEqual([
      {
        productId: "1",
        quantity: 20,
      },
    ]);

    expect(cartAggregate.events.length).toEqual(11);
  });
});
