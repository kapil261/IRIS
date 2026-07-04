const mongoose= require('mongoose')

async function connecttoDb(){
    mongoose.connect(process.env.MONGO_URI)
    .then(
        console.log("mongoose connected")
    )
}
module.exports= connecttoDb