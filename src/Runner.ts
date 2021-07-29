import Consumer from "./Messaging/Consumer";

class Runner {
  public projectors = [];
  public listeners = [];

  async registerListeners(listeners) {
    for (const listener of listeners) {
      const ListenerClass = (await import(listener)).default;

      Object.getOwnPropertyNames(ListenerClass.prototype).forEach((value) => {
        if (value.slice(0, 2) === "on") {
          this.listeners.push(new ListenerClass().handle);
        }
      });
    }
  }

  async registerProjectors(projectors) {
    for (const projector of projectors) {
      const ProjectorClass = (await import(projector)).default;

      Object.getOwnPropertyNames(ProjectorClass.prototype).forEach((value) => {
        if (value.slice(0, 2) === "on") {
          this.projectors.push(new ProjectorClass()[value]);
        }
      });
    }
  }

  async run() {
    await new Consumer(this.projectors, this.listeners).start();
  }
}

export default new Runner();
