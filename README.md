# NODE EVENT SOURCING

> Opinionated OOP based node.js event sourcing library inspired by laravel-event-sourcing

## Features

- [x] Reliable event publisher
- [x] Built for microservices
- [ ] Dead letter queue support

## Current Limitations

- Only Supports DynamoDB as Event Store
- Only Supports Kafka as Message Broker

## Requirements

- Kafka
- DynamoDB

## Concepts

### AggregateRoot

Class that handles the business logic and stream of events of a specific item such as a single Product and Order.

- Events are created via AggregateRoot.createEvent method
- Events created are automatically published into Kafka topic via DynamoDB Stream (Production)
  or Polling (Dev)

### Listener

Class that handles event after being fired

### Projector

Class that handles the update to read table after event is fired

## Getting Started

### Configuration

```ts
process.env.KAFKA_BROKERS = "localhost:9092,localhost:9093"; // default: localhost:9092
process.env.KAFKA_GROUP_ID = "group"; // default: example-group
process.env.KAFKA_ENABLED = true; // default: true
process.env.KAFKA_CONSUMER_MAX_PARALLEL_HANDLES = 10; // default: 10
process.env.KAFKA_CONSUMER_MAX_QUEUE_SIZE = 30; // default: 30
process.env.KAFKA_AUTO_CREATE_TOPICS = true; // default: true
process.env.KAFKA_OFFSET_RESET = "beginning"; // default: beginning, options: beginning, latest
```

### Creating Event

```ts
interface Item {
  productId: string | null;
  quantity: number;
}

export default class CartItemAdded {
  event = "CartItemAdded";

  payload: Item = {
    productId: null,
    quantity: 0,
  };

  constructor(payload: Item) {
    this.payload = payload;
  }
}
```

### Creating AggregateRoot

```ts
import { AggregateRoot } from "node-event-sourcing";
import CartItemAdded from "./Events/CartItemAdded";

interface Item {
  productId: string;
  quantity: number;
}

export default class CartAggregateRoot extends AggregateRoot {
  public items: Item[] = [];
  public snapshotIn = 0;

  constructor() {
    super();
  }

  public async addItemToCart(item: Item): Promise<void> {
    await this.createEvent(new CartItemAdded(item));
  }

  public async applyCartItemAdded(item: Item): Promise<void> {
    const existingItem = this.items.find((i) => i.productId === item.productId);

    if (existingItem) {
      existingItem.quantity = existingItem.quantity + item.quantity;
    } else {
      this.items.push(item);
    }
  }

  public async applySnapshot(currentState: { items: Item[] }): Promise<void> {
    this.items = currentState.items;
  }
}
```

### Creating Event Listener

```ts
import { Listener } from "node-event-sourcing";

export default CartItemAddedListener implements Listener {
  public async handle() {
    // ...
  }
}
```

### Creating Projections

```ts
import { Projector } from "node-event-sourcing";

export default class HotProductsProjector implements Projector {
  public async onCartItemAdded() {
    // ...
  }
}
```

### Running Event Listener

```ts
import { Runner } from "node-event-sourcing";
import * as path from "path";

Runner.registerListeners([path.resolve("./Listeners/CartListener")]);
Runner.registerProjectors([path.resolve("./Projectors/HotProductsProjector")]);

Runner.run()
  .then(() => {
    console.log("Event Sourcing is running...");
  })
  .catch((error) => {
    console.log(error.message);
  });
```

## Running the Event Publisher

### Development

#### poll-publisher.js

```js
const Publisher = require("node-event-sourcing/publisher");

Publisher.run();
```

```bash
node poll-publisher.js
```

### Production

Upload the node-event-sourcing/lambda-event-publisher.zip in AWS Lambda and use that lambda function as a DynamoDB stream source. Make sure that the Lambda connects to Kafka server.

## Handling failures

Dead letter queue \
Circuit breaker \
Distributed circuit breaker

## Handling transient failures

Immediate retry \
Exponential Backoff

## What does the business say about the failure?

If you can make it fail fast, do it instead of using exponential backoff or dead letter queues.
