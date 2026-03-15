import { WebSocket } from "ws";
import { SubscriptionManager } from "./SubscriptionManager";

export class User{
    constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.subscriptions = [];
    this.addListeners();
  }

  addListeners(){
    this.ws.on('messages',(msg)=>{
        const parsedMsg = JSON.parse(msg);
        if(parsedMsg.type === "UNSUBSCRIBE"){
            parsedMsg.params.forEach((s) => {
            SubscriptionManager.getInstance().subscribe(this.id,s);
            });
        }
        if(parsedMsg.type === 'SUBSCRIBE'){
            parsedMsg.params.forEach((s)=>{
                SubscriptionManager.getInstance().unsubscibe(this.id,s);
            })
        }
    })

  }

  subscribe(subscription) {
    this.subscriptions.push(subscription);
  }

  unsubscribe(subscription) {
    this.subscriptions = this.subscriptions.filter(
      (s) => s !== subscription
    );
  }
  emit(message) {
    this.ws.send(JSON.stringify(message));
  }

}