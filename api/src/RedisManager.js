import { createClient } from "redis";

export class RedisManager {
  static instance;

  constructor() {
    this.client = createClient();
    this.client.connect();

    this.publisher = createClient();
    this.publisher.connect();
  }

  static getInstance() {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  getRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }

  sendAndAwait(message) {
    return new Promise((resolve) => {
      const id = this.getRandomId();

      this.client.subscribe(id, (msg) => {
        this.client.unsubscribe(id);
        resolve(JSON.parse(msg));
      });

      this.publisher.lPush(
        "messages",
        JSON.stringify({
          clientId: id,
          message: message,
        })
      );
    });
  }
}