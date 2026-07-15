const fs = require('fs');
const Document = require('../models/document.model');
const Chunk = require('../models/chunk.model');
const { extractText, chunkText, generateEmbedding } = require('../services/rag.service');

const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileType = req.file.originalname.endsWith('.pdf') ? 'pdf' : 'txt';
  
  // 1. Create Document record as 'processing'
  const newDoc = new Document({
    userId: req.user.id,
    filename: req.file.originalname,
    fileType,
    status: 'processing',
    chunkCount: 0
  });

  try {
    await newDoc.save();
    
    // Return early to client
    res.status(202).json({
      message: 'File uploaded successfully. Processing in background...',
      document: newDoc
    });

    // 2. Asynchronously process document in background
    setTimeout(async () => {
      const filePath = req.file.path;
      try {
        // Extract text
        const text = await extractText(filePath, fileType);
        
        // Chunk text
        const textChunks = chunkText(text, 300, 50);
        
        // Generate embeddings and save chunks
        let successfulChunks = 0;
        for (const chunkTextContent of textChunks) {
          try {
            const vector = await generateEmbedding(chunkTextContent);
            const chunkRecord = new Chunk({
              documentId: newDoc._id,
              userId: req.user.id,
              text: chunkTextContent,
              embedding: vector
            });
            await chunkRecord.save();
            successfulChunks++;
          } catch (embedError) {
            console.error(`Skipping chunk due to embedding failure:`, embedError.message);
          }
        }

        // Update Document status to ready
        newDoc.status = successfulChunks > 0 ? 'ready' : 'failed';
        newDoc.chunkCount = successfulChunks;
        await newDoc.save();

      } catch (procErr) {
        console.error(`Error processing document ${newDoc._id}:`, procErr);
        newDoc.status = 'failed';
        await newDoc.save();
      } finally {
        // Clean up physical file from uploads folder
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }, 0);

  } catch (err) {
    // Cleanup physical file on immediate error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Document upload initialization error:", err);
    res.status(500).json({ message: 'Server error starting file process', error: err.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(documents);
  } catch (err) {
    console.error("Get documents error:", err);
    res.status(500).json({ message: 'Error retrieving documents', error: err.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const docId = req.params.id;
    const document = await Document.findOneAndDelete({ _id: docId, userId: req.user.id });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or unauthorized' });
    }

    // Delete chunks associated with document
    await Chunk.deleteMany({ documentId: docId, userId: req.user.id });

    res.status(200).json({ message: 'Document and its vectors deleted successfully', document });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ message: 'Error deleting document', error: err.message });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  deleteDocument
};
