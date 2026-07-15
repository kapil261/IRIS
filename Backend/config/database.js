const mongoose = require('mongoose')

async function connecttoDb() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("mongoose connected")
    } catch (err) {
        console.error("mongoose connection error:", err.message)
    }
}
module.exports = connecttoDb