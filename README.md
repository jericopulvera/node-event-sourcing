# NODE EVENT SOURCING

> Opinionated OOP based node.js event sourcing library inspired by laravel-event-sourcing

## Features

- [x] Reliable event publisher
- [x] Built for microservices

## Current Limitations

- Only Supports DynamoDB as Event Store
- Only Supports Kafka as Message Broker

## Requirements

- Kafka
- DynamoDB

## Concepts

### AggregateRoot

> Class that handles the business logic and stream of events of a specific item such as a single Product and Order.

- Events are created via AggregateRoot.createEvent method
- Events created are automatically published into Kafka topic via DynamoDB Stream (Production)
  or Polling (Dev)

### Listener

> Class that handles event after being fired

### Projector

> Class that handles the update to read table after event is fired

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

### Creating Aggregate

### Creating Event Listener

```ts
import { Listener } from "node-event-sourcing";

class CartItemAddedListener implements Listener {
  public async handle() {
    // ...
  }
}

export default CartItemAddedListener;
```

### Creating Projections

```ts
import { Projector } from "node-event-sourcing";

class HotProductsProjector implements Projector {
  public async onCartItemAdded() {
    // ...
  }
}

export default HotProductsProjector;
```

### Running Event Listener

```ts
import { Runner } from "node-event-sourcing";

Runner.registerListeners(["App/Domains/Cart/Listeners/CartListener"]);

Runner.registerProjectors(["App/Domains/Cart/Projectors/CartProjector"]);

Runner.run()
  .then(() => {
    console.log("Event Sourcing is running...");
  })
  .catch((error) => {
    console.log(error.message);
  });
```
