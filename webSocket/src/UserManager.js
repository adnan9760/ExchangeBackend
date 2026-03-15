import { WebSocket } from "ws";
import { User } from "./User";
import { SubscriptionManager } from "./SubscriptionManager";

 export class UserManager{
   static instance;
   
   constructor() {
    this.users = new Map();
  }
  

  static getInstance(){
     if(!UserManager.instance){
        UserManager.instance = new UserManager();
     }

     return UserManager.instance;
  }

  addUser(ws){
    const id = getrandomId();
    const user = new User(ws,id);
    this.users.set(id,user);

    this.registerOnClose(ws, id);

    return user;
  }

  registerOnClose(ws , id){
    ws.on('close',()=>{
        this.users.delete(id);
        SubscriptionManager.getInstance().UserLeft(id);
    })
  }

  getUser(id) {
    return this.users.get(id);
  }

  getRandomId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
