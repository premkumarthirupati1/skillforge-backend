const express = require('express');

const app = express();
const mongoose = require('mongoose');

const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;


const PORT = 3000;
mongoose.connect(MONGODB_URI)
    .then(result => {
        app.listen(PORT);
    })
    .catch(err => {
        console.log(err);
    })