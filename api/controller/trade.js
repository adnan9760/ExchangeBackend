import express from 'express';
import { RedisManager } from '../src/RedisManager';
import { Client } from 'pg';
import { Router } from 'express';
export const tradeRoutes = Router();

const pgclient = new Client({
    user:'',
    database:'',
    host:'',
    password:'',port:''
});



tradeRoutes.get('/',async(req,res)=>{
    const{market,limit} = req.query;
    //DB call

})