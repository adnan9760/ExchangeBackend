import express, { json } from 'express';
import cors from 'cors';
import { createClient } from "redis";


async function main(){
    const Engine = new Engine();
    const redisclient = createClient();

    await redisclient.connect();


    while(true){
        const res = await redisclient.rPop("message");
        if(!res){

        }
        else{
            Engine.process(JSON.parse(res));
        }
    }
}