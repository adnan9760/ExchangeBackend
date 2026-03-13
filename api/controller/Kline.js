import express from "express";
import { Router } from "express";
import { Client } from "pg";

export const KlineRoute = Router();
const pgclient = new Client({
    user:'',
    host:'',
    database:'',
    password:'',
    port:''
});
pgclient.connect();


KlineRoute.get("/",async(req,res)=>{
    const{ market , interval,startTime , endTime} =req.body;
    let query;

    switch(interval){
        case '1m':
            query =`SELECT * FROM klines_1m WHERE bucket >=$1 AND bucket <= $2`;
            break;
        case '1h':
            query=`SELECT * FROM klines_1h WHERE bucket >=$1 AND bucket <= $2`;
            break;
        case '1w':
            query =`SELECT * FROM klines_1w WHERE bucket >=$1 AND bucket <= $2`;
            break;
        default:
            return res.status(400).send('Invalid interval');
    }

    try {
        const result = await pgclient.query(query, [new Date(startTime * 1000), new Date(endTime * 1000)]);
         res.json(result.rows.map(x => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quoteVolume,
            start: x.start,
            trades: x.trades,
            volume: x.volume,
        })));
    } catch (error) {
        res.status(500).json(error);
    }
})