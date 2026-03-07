import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());

app.use(express.json());
app.use("/api/v1/order",)

app.listen(3000,()=>{
    console.log("server is running on the port 3000");
})