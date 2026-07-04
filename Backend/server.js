require('dotenv').config();
const app = require('./src/app')
const connecttodb= require('./config/database')

connecttodb();

app.listen(3000,()=>{
    console.log("server is running on port 3000")
})