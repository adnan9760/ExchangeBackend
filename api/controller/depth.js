import express from 'express';
import { Router } from 'express';
import { RedisManager } from '../src/RedisManager';



export const  depthRoute = Router();


depthRoute.get("/",async(req,res)=>{
    const {sym} = req.query;

    const responce = await RedisManager.getInstance().sendAndAwait({
        type:"GET_DEPTH",
        data:{
            market:sym
        }
    });
    res.json(
        responce.payload
    )
});

