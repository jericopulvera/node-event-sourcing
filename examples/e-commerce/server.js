const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const express = require("express");
const RunnerClass = require("../../dist/Runner.js");
const EventStore = require("../../dist/EventStore.js");
const Publisher = require("../../dist/Publisher.js");
const fg = require("fast-glob");

const app = express();
const port = 3000;

EventStore.default
  .createTable()
  .then(() => {
    console.log("Event Store Table Creataed");
  })
  .catch((e) => {
    console.log(e.message);
  });

const runConsumers = async () => {
  const Runner = new RunnerClass.default();

  const listeners = fg.sync([
    path.join(__dirname, "./Domains/**/**Listener.js"),
  ]);

  const projectors = fg.sync([
    path.join(__dirname, "./Domains/**/**Projector.js"),
  ]);

  await Runner.registerListeners(listeners);
  await Runner.registerProjectors(projectors);

  Runner.run();
  Publisher.default.run();

  const errorTypes = ["unhandledRejection", "uncaughtException"];
  const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];

  errorTypes.map((type) => {
    process.on(type, (e) => {
      try {
        console.log(`process.on ${type}`);
        console.error(e);
        Runner.stop();
        process.exit(0);
      } catch (_) {
        process.exit(1);
      }
    });
  });

  signalTraps.map((type) => {
    process.once(type, () => {
      try {
        Runner.stop();
      } finally {
        process.kill(process.pid, type);
      }
    });
  });
};

runConsumers().catch((err) => {
  console.error(err);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/add-to-cart", async (req, res) => {
  const userId = "1";

  try {
    await EventStore.default.createEvent({
      aggregateId: `USER#${userId}`,
      event: "CartItemAdded",
      version: Number(Date.now()),
      payload: {
        product: {
          id: 1,
          qty: 1,
          price: 100,
        },
      },
    });
    return res.send("Cart Item Added");
  } catch (error) {
    console.log(error.message);
    return res.send("Error");
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
