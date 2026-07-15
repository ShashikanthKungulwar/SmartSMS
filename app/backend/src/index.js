import dotenv from "dotenv"
dotenv.config(
    {path: "../../.env"}
)
import cors from "cors";


import dBconnection from "./config/db.js";
import express, { Router } from "express"
import authMiddleWare from "./middleware/auth.js";
import User from "./models/Users.js";
import authRouter from './routes/auth.js'
import ruleRouter from "./routes/rules.js"
import smsRouter from './routes/sms.js';
import deviceRouter from './routes/devices.js'
import errorhandler from "./middleware/errors.js";
import feedbackRouter from './routes/feedback.js'
// await dBconnection();
const app = express();
app.use(cors());
app.use(express.json())

app.use('/api/auth',authRouter)
app.use('/api/rules',ruleRouter)
app.use('/api/sms', smsRouter);
app.use('/api/device',deviceRouter);
app.use('/api/feedback', feedbackRouter);



app.get('/api/me',authMiddleWare,async(req,res)=>{
    // console.log("check");
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    res.json(user);
})


app.use(errorhandler);

dBconnection()
.then(()=>{
    app.listen(process.env.PORT,()=>{console.log(`backend on PORT : ${process.env.PORT}`)});
})
.catch(err =>{
    console.error('DB failed',err);process.exit(1);
})

