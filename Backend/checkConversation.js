require('dotenv').config();
const mongoose = require('mongoose');
const Conversation = require('./models/history.model');
const Message = require('./models/msg.models');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const chats = await Conversation.find({}).sort({ updatedAt: -1 }).limit(3).populate('messages');
    console.log(`\nFound ${chats.length} recent chats:`);
    for (const chat of chats) {
      console.log(`\n----------------------------------------`);
      console.log(`Chat ID: ${chat._id}, Thread ID: ${chat.threadid}, Title: "${chat.title}", useDocuments: ${chat.useDocuments}`);
      console.log(`Messages Count: ${chat.messages?.length}`);
      
      if (chat.messages && chat.messages.length > 0) {
        console.log("Conversation history:");
        chat.messages.forEach(msg => {
          console.log(`  [${msg.role}] content: ${msg.content.substring(0, 150)}...`);
          if (msg.sources && msg.sources.length > 0) {
            console.log(`    Sources cited: ${msg.sources.map(s => s.filename).join(', ')}`);
          } else {
            console.log(`    No sources.`);
          }
        });
      }
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error("Diagnostic error:", err);
  }
}

check();
