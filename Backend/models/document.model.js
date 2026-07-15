const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    index: true 
  },
  filename: { 
    type: String, 
    required: true 
  },
  fileType: { 
    type: String, 
    enum: ["pdf", "txt"], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["processing", "ready", "failed"], 
    default: "processing" 
  },
  chunkCount: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
