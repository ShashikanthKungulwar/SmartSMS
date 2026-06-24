// require('dotenv').config();
import dotenv from "dotenv"
import experss from "express"
// const express = require('express');
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(process.env.PORT || 5000, () => console.log('AI service on :5000'));