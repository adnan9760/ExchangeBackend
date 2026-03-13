import fs from "fs";
import { Orderbook } from "./orderbook.js";
import { RedisManager } from "../src/RedisManager.js";
import { type } from "os";
import { use, useEffect } from "react";
import { error } from "console";

export class Engine {

    orderbooks = [];
    balances = new Map();

    constructor() {

        let snapshot = null;

        try {
            if (process.env.WITH_SNAPSHOT) {
                snapshot = fs.readFileSync("./snapshot.json");
            }
        } catch (error) {
            console.log("No snapshot found");
        }

        if (snapshot) {

            const snapshotData = JSON.parse(snapshot.toString());

            this.orderbooks = snapshotData.orderbooks.map((o) =>
                new Orderbook(
                    o.baseAsset,
                    o.bids,
                    o.asks,
                    o.lastTradeId,
                    o.currentPrice
                )
            );

            this.balances = new Map(snapshotData.balances);

        } else {

            this.orderbooks = [new Orderbook("TATA", [], [], 0, 0)];
            this.setBaseBalances();

        }

        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);
    }

    process(message, clientId) {
        switch (message) {
            case 'CREATE_ORDER':
                try {
                    const { executedQty, fills, orderId } = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.side, message.data.userId);

                    RedisManager.getInstance().sendToApi(clientId,{
                        type:"ORDER_FILLED",
                        payload:{
                            orderId,
                            executedQty,
                            fills
                        }
                    })

                } catch (error) {
                  RedisManager.getInstance().sendToApi(clientId,{
                        type:"ORDER_CANCELLED",
                        payload:{
                            orderId:"",
                            executedQty:0,
                            fills:0
                        }
                    })
                }
                break;
            case 'CANCEL_ORDER':

            try {
                const orderId = message.data.orderId; 
                const cancelMarket = message.data.market;
                 const cancelOrderbook = this.orderbooks.find(o => o.ticker() === cancelMarket);
                  const quoteAsset = cancelMarket.split("_")[1];

                 if(!cancelOrderbook){
                    throw  new error("No orderBook found");
                 }

                 const order = cancelOrderbook.asks.find(o=>{
                    o.ticker() === orderId
                 }) || cancelOrderbook.bids.find(o=>o.ticker() === orderId);

                 if (!order) { 
                    console.log("No order found"); 
                    throw new Error("No order found");
                 }

                 if(order.side === "buy"){
                    const price = cancelOrderbook.cancelbid(order);

                    const leftQuantity = (order.quantity - order.filled) * order.price;


                      this.balances.get(order.userId)[BASE_CURRENCY].available += leftQuantity;
    
                        this.balances.get(order.userId)[BASE_CURRENCY].locked -= leftQuantity;

                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                 }
                 else{
                    const price = cancelOrderbook.cancelask(order)
                        const leftQuantity = order.quantity - order.filled;
                   
                        this.balances.get(order.userId)[quoteAsset].available += leftQuantity;
                     
                        this.balances.get(order.userId)[quoteAsset].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                 }
            } catch (error) {
                throw new error("Error While Cancel the order")
            }
            break;
            case GET_OPEN_ORDERS:
                try {
                    const openOrderbook = this.orderbooks.find(o => o.ticker() === message.data.market);
                    if (!openOrderbook) {
                        throw new Error("No orderbook found");
                    }
                    const openOrders = openOrderbook.getOpenOrders(message.data.userId);

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders
                    }); 
                } catch(e) {
                    console.log(e);
                }
                break;

                 case GET_DEPTH:
                try {
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        throw new Error("No orderbook found");
                    }
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: orderbook.getDepth()
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: []
                        }
                    });
                }
                break;
                 case ON_RAMP:
                const userId = message.data.userId;
                const amount = Number(message.data.amount);
                this.onRamp(userId, amount);
                break;


        }
    }

       onRamp(userId, amount) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                [BASE_CURRENCY]: {
                    available: amount,
                    locked: 0
                }
            });
        } else {
            userBalance[BASE_CURRENCY].available += amount;
        }
    }
    createOrder(market, price, quantity, side, userId) {
        const orderbook = this.orderbooks.find((o) => o.ticker() === market);
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];

        if (!orderbook) {
            throw new Error("No orderboook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);

        const order ={
            price,
            quantity,
            orderid:Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15),
            filled:0,
            side,
            userId
        }

        const{fills,executedQty}= Orderbook.addorder(order);

        this.updatedBalance(userId,baseAsset,quoteAsset,side,fills,executedQty);

        this.createDbTrade(fills,market,userId);

        this.updateDbOrders(order, executedQty, fills, market);

 this.publisWsDepthUpdates(fills,price,side,market);

 createDbTrade(fills,market,userId);

    }


     publisWsDepthUpdates(fills, price, side, market) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        if (side === "buy") {
            const updatedAsks = depth?.asks.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedBid = depth?.bids.find(x => x[0] === price);
            console.log("publish ws depth updates")
            RedisManager.getInstance().  publishToWeb(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsks,
                    b: updatedBid ? [updatedBid] : [],
                    e: "depth"
                }
            });
        }
        if (side === "sell") {
           const updatedBids = depth?.bids.filter(x => fills.map(f => f.price).includes(x[0].toString()));
           const updatedAsk = depth?.asks.find(x => x[0] === price);
           console.log("publish ws depth updates")
           RedisManager.getInstance().  publishToWeb(`depth@${market}`, {
               stream: `depth@${market}`,
               data: {
                   a: updatedAsk ? [updatedAsk] : [],
                   b: updatedBids,
                   e: "depth"
               }
           });
        }
    }

    

     publishWsTrades(fills, userId, market) {
        fills.forEach(fill => {
            RedisManager.getInstance().publishToWeb(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: fill.otherUserId === userId,
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market,
                }
            });
        });
    }

      sendUpdatedDepthAt(price, market) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        const updatedBids = depth?.bids.filter(x => x[0] === price);
        const updatedAsks = depth?.asks.filter(x => x[0] === price);
        
        RedisManager.getInstance().  publishToWeb(`depth@${market}`, {
            stream: `depth@${market}`,
            data: {
                a: updatedAsks.length ? updatedAsks : [[price, "0"]],
                b: updatedBids.length ? updatedBids : [[price, "0"]],
                e: "depth"
            }
        });
    }

updateDbOrders(order,executedQty,fills,market){
   RedisManager.getInstance().publishToDB({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderid,
                executedQty: executedQty,
                market: market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side,
            }
        });

        fills.forEach(fill=>{
            RedisManager.getInstance().publishToDB({
                type:ORDER_UPDATE,
                data:{
                     orderId: fill.markerOrderId,
                    executedQty: fill.qty
                }
            })
        })
}
    createDbTrade(fills,market,userId){
        fills.forEach(fill => {
            RedisManager.getInstance().publishToDB({
                type:"TRADE_ADDED",
                data:{
                    market:market,
                    id:fill.tradeId.toString(),
                    isBuyerMaker: fill.otherUserId === userId, 
                    price: fill.price,
                    quantity: fill.qty.toString(),
                    quoteQuantity: (fill.qty * Number(fill.price)).toString(),
                    timestamp: Date.now()
                }
            })
        });
    }

    updatedBalance(userId,baseAsset,quoteAsset,side,fills,executedQty){
        for(const fill of fills){
            if(side === "buy"){

                //increase seller amount
                this.balances.get(fill.otherUserId)?.[quoteAsset]?.available += fill.qty * fill.price;

               //decrese buyer amount
                this.balances.get(userId)?.[quoteAsset]?.locked -= fill.qty * fill.price;

              // seller give
              this.balances.get(fill.otherUserId)?.[baseAsset]?.locked -= fill.qty * fill.price;


              //buy amount take

              this.balances.get(userId)?.[baseAsset]?.available += fill.qty * fill.price;
            }
            else{
                
                this.balances.get(fill.otherUserId)[quoteAsset].locked = this.balances.get(fill.otherUserId)?.[quoteAsset].locked - (fill.qty * fill.price);

          
                this.balances.get(userId)[quoteAsset].available = this.balances.get(userId)?.[quoteAsset].available + (fill.qty * fill.price);

           
                this.balances.get(fill.otherUserId)[baseAsset].available = this.balances.get(fill.otherUserId)?.[baseAsset].available + fill.qty;

              
                this.balances.get(userId)[baseAsset].locked = this.balances.get(userId)?.[baseAsset].locked - (fill.qty);
            }
        }
        
    }
    checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity) {
        if (side === "buy") {
            if ((this.balances.get(userId)?.[quoteAsset]?.available || 0) < Number(quantity) * Number(price)) {
                throw new Error("Insufficient funds");
            }

            this.balances.get(userId)[quoteAsset].available = this.balances.get(userId)?.[quoteAsset].available - (Number(quantity) * Number(price));

            this.balances.get(userId)[quoteAsset].locked = this.balances.get(userId)?.[quoteAsset].locked + (Number(quantity) * Number(price));


        }
        else{
             if ((this.balances.get(userId)?.[baseAsset]?.available || 0) < Number(quantity)) {
                throw new Error("Insufficient funds");
            }
           
            this.balances.get(userId)[baseAsset].available = this.balances.get(userId)?.[baseAsset].available - (Number(quantity));
    
            this.balances.get(userId)[baseAsset].locked = this.balances.get(userId)?.[baseAsset].locked + Number(quantity);
        }
    }

     setBaseBalances() {
        this.balances.set("1", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });

        this.balances.set("2", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });

        this.balances.set("5", {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "TATA": {
                available: 10000000,
                locked: 0
            }
        });
    }
}