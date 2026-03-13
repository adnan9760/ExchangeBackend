import { createClient } from "redis";

export class RedisManager {
  static instance;

  constructor() {
    this.client = createClient();
    this.client.connect();
  }

  static getInstance() {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  // send message to DB worker
  publishToDB(message) {
    this.client.lPush("db_processor", JSON.stringify(message));
  }

  // send real-time message to websocket server
  publishToWeb(channel, message) {
    this.client.publish(channel, JSON.stringify(message));
  }

  // send response back to API
  sendToApi(client, message) {
    this.client.publish(client, JSON.stringify(message));
  }
}