const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Document", 
    required: true, 
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    index: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  embedding: { 
    type: [Number], 
    required: true 
  }
}, { timestamps: true });

const Chunk = mongoose.model("Chunk", chunkSchema);
module.exports = Chunk;
