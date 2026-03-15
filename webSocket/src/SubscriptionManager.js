import { RedisClientType, createClient } from "redis";
import { UserManager } from "./UserManager";

export class SubscriptionManager{
    static instance;

constructor(){
     this.subscriptions = new Map();
     this.reversesubcription = new Map();
       this.redisClient = createClient();
        this.redisClient.connect();
}


 static getInstance() {
        if (!this.instance)  {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    subscribe(id,s){
         if (this.subscriptions.get(id)?.includes(s)) {
            return
        }

        this.subscriptions.set(id,(this.s.get(id)||[]).concat(s));
        this.reversesubcription.set(s, (this.reversesubcription.get(s) || []).concat(id));

        if(this.reversesubcription.get(s)?.length() === 1){
            this.redisClient.subscribe(s,this.rediscallbackhandler);
        }
    }

    unsubscibe(userId,subscription){
        const subscriptions = this.subscriptions.get(userId);
        if(subscriptions){
             this.subscriptions.set(userId, subscriptions.filter(s => s !== subscription));
        }

        const reverseSubscriptions = this.reversesubcription.get(subscription);

        if(reverseSubscriptions){
             this.reversesubcription.set(subscription, reverseSubscriptions.filter(s => s !== userId));
          if(this.reversesubcription.get(subscription)?.length() === 0){
             this.reversesubcription.delete(subscription);
                this.redisClient.unsubscribe(subscription);
          }
        }
    }

      UserLeft(userId) {
        console.log("user left " + userId);
        this.subscriptions.get(userId)?.forEach(s => this.unsubscibe(userId, s));
    }
    
    getSubscriptions(userId) {
        return this.subscriptions.get(userId) || [];
    }

     rediscallbackhandler = (message, channel) => {
        const parsedMessage = JSON.parse(message);
        this.reversesubcription.get(channel)?.forEach(s => UserManager.getInstance().getUser(s)?.emit(parsedMessage));
    }
}