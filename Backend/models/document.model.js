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
  size: {
    type: Number
  },
  // Where the original file lives, relative to the storage root (see services/storage.service.js)
  storageKey: {
    type: String
  },
  status: {
    type: String,
    enum: ["processing", "ready", "failed"],
    default: "processing"
  },
  // Number of vectors in Pinecone; their ids are `<documentId>_0 … _<chunkCount-1>`
  chunkCount: {
    type: Number,
    default: 0
  },
  // Human-readable reason shown in the UI when status is "failed"
  errorMessage: {
    type: String
  }
}, { timestamps: true });

const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
