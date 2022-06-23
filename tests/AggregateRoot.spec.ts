import CartAggregateRoot from "./fixtures/CartAggregateRoot";

describe("AggregateRoot", () => {
  test("can create and apply event", async () => {
    const aggregateId = `${Date.now()}-create-event`;

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

  test("can create snapshot", async () => {
    const aggregateId = `${Date.now()}-snapshot`;
    let cartAggregate;

    for (let index = 0; index < 10; index++) {
      cartAggregate = new CartAggregateRoot();
      cartAggregate.snapshotIn = 10;

      await cartAggregate.retrieve(aggregateId);
      await cartAggregate.addItemToCart({ quantity: 1, productId: "1" });
    }

    cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);
    expect(cartAggregate.items).toEqual([
      {
        productId: "1",
        quantity: 10,
      },
    ]);

    expect(cartAggregate.events.length).toEqual(11);
  });

  test("can create multiple snapshot", async () => {
    const aggregateId = `${Date.now()}-snapshot-2`;
    let cartAggregate;

    for (let index = 0; index < 9; index++) {
      cartAggregate = new CartAggregateRoot();
      cartAggregate.snapshotIn = 3;

      await cartAggregate.retrieve(aggregateId);
      await cartAggregate.addItemToCart({ quantity: 2, productId: "2" });
    }

    cartAggregate = await new CartAggregateRoot().retrieveAll(aggregateId);

    expect(cartAggregate.items).toEqual([
      {
        productId: "2",
        quantity: 18,
      },
    ]);

    // version = 0, add item, index 0
    // version = 1, add item, index 1
    // version = 2, add item, index 2
    // version = 3, snapshot,
    // version = 4, add item, index 3
    // version = 5, add item, index 4
    // version = 6, snapshot,
    // version = 7, add item, index 5
    // version = 8, add item, index 6
    // version = 9, snapshot,
    // version = 10, add item, index 7
    // version = 11, add item, index 8
    // version = 12, snapshot,
    expect(
      cartAggregate.events[cartAggregate.events.length - 1].version
    ).toEqual(12);
    expect(cartAggregate.events[cartAggregate.events.length - 1].event).toEqual(
      "Snapshot"
    );
    expect(cartAggregate.events.length).toEqual(13);
  });

  test("can create event without snapshot", async () => {
    const aggregateId = `${Date.now()}`;
    let cartAggregate;

    for (let index = 0; index < 9; index++) {
      cartAggregate = await new CartAggregateRoot().retrieve(aggregateId);
      await cartAggregate.addItemToCart({ quantity: 1, productId: "3" });
    }

    cartAggregate = await new CartAggregateRoot().retrieveAll(aggregateId);

    expect(cartAggregate.items).toEqual([
      {
        productId: "3",
        quantity: 9,
      },
    ]);

    expect(
      cartAggregate.events[cartAggregate.events.length - 1].version
    ).toEqual(8);
    expect(cartAggregate.events[cartAggregate.events.length - 1].event).toEqual(
      "CartItemAdded"
    );
    expect(cartAggregate.events.length).toEqual(9);
  });

  test("can fast retrieve snapshot", async () => {
    const aggregateId = `${Date.now()}-fast-retrieve`;
    let cartAggregate;

    for (let index = 0; index < 50; index++) {
      cartAggregate = new CartAggregateRoot();
      cartAggregate.snapshotIn = 10;

      await cartAggregate.retrieve(aggregateId);
      await cartAggregate.addItemToCart({
        quantity: 1,
        productId: aggregateId,
      });
    }

    cartAggregate = new CartAggregateRoot();
    cartAggregate.snapshotIn = 10;
    await cartAggregate.retrieve(aggregateId);

    expect(cartAggregate.items).toEqual([
      {
        productId: aggregateId,
        quantity: 50,
      },
    ]);

    expect(cartAggregate.events.length).toEqual(11);
  });
});
