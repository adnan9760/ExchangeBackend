import express, { json, response } from 'express';
import { Router } from 'express';
import { RedisManager } from '../src/RedisManager';
export const orderRoute = Router();

orderRoute.post("/",async(req,res)=>{
    const { market, price, quantity, side, userId } = req.body;

    console.log({market,price,quantity,side,userId});

    const responce = await RedisManager.getInstance().sendAndAwait({
        type:CREATE_ORDER,
        data:{
            market,
            price,
            quantity,
            side,
            userId
        }
    })
    res.json(responce.payload);
})


orderRoute.delete("/",async(req,res)=>{
    const{orderId , market } = req.body;

    const res = await RedisManager.getInstance().sendAndAwait({
        type:CANCEL_ORDER,
        data:{
            orderId,
            market
        }
    })
    res.json(res.payload);
});


orderRoute.get("/openorder",async(req,res)=>{
    const res = await RedisManager.getInstance.sendAndAwait({

        type:GET_OPEN_ORDERS,
        data:{
            userId:req.query.userId,
            market:req.query.market
        }
    })
    res.json(res.payload);
})