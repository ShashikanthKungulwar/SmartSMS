import dotenv from "dotenv"
dotenv.config(
    {path: "../../.env"}
)
import cors from "cors";
import helmet from "helmet";


import dBconnection from "./config/db.js";
import express, { Router } from "express"
import authMiddleWare from "./middleware/auth.js";
import User from "./models/Users.js";
import authRouter from './routes/auth.js'
import ruleRouter from "./routes/rules.js"
import deviceRouter from './routes/devices.js'
import errorhandler from "./middleware/errors.js";
import feedbackRouter from './routes/feedback.js'
import analyticsRouter from './routes/analytics.js'
import mongoSanitizeMiddleware from "./middleware/mongoSanitize.js";
import { generalLimiter } from "./middleware/rateLimiters.js";

// Warn (don't crash) on weak JWT secrets in production — a short secret is
// brute-forceable and defeats the point of signing tokens.
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        console.warn('[SECURITY WARNING] JWT_SECRET is missing or under 32 characters');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        console.warn('[SECURITY WARNING] JWT_REFRESH_SECRET is missing or under 32 characters');
    }
}

// await dBconnection();
const app = express();
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json())
app.use(mongoSanitizeMiddleware);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
})

app.use('/api/auth',authRouter)

// generalLimiter applies to everything mounted after this point — auth routes
// above already have their own stricter authLimiter, so they're excluded.
app.use(generalLimiter);

app.use('/api/rules',ruleRouter)
app.use('/api/device',deviceRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/analytics', analyticsRouter);

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

