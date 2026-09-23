const Document = require('../models/document.model');
const { ingestDocument, deleteDocumentVectors } = require('../services/rag.service');
const { storage } = require('../services/storage.service');

const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileType = req.file.originalname.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt';
  const storageKey = storage.keyFor(req.file.path);

  const newDoc = new Document({
    userId: req.user.id,
    filename: req.file.originalname,
    fileType,
    size: req.file.size,
    storageKey,
    status: 'processing',
    chunkCount: 0
  });

  try {
    await newDoc.save();
  } catch (err) {
    await storage.remove(storageKey).catch(() => {});
    console.error("Document upload initialization error:", err);
    return res.status(500).json({ message: 'Server error starting file process', error: err.message });
  }

  // Reply immediately; chunking + embedding + Pinecone upsert run in the background and the
  // client polls GET /api/documents for the status to flip to ready/failed.
  res.status(202).json({
    message: 'File uploaded successfully. Processing in background...',
    document: newDoc
  });

  setImmediate(async () => {
    try {
      const chunkCount = await ingestDocument({
        filePath: storage.localPath(storageKey),
        fileType,
        documentId: newDoc._id,
        userId: req.user.id,
        filename: req.file.originalname
      });
      newDoc.status = 'ready';
      newDoc.chunkCount = chunkCount;
      newDoc.errorMessage = undefined;
    } catch (procErr) {
      console.error(`Error processing document ${newDoc._id}:`, procErr);
      newDoc.status = 'failed';
      newDoc.errorMessage = procErr.message || 'Processing failed';
    }
    // The original file is kept (not deleted) so it can be re-indexed or downloaded later.
    await newDoc.save().catch((err) => console.error(`Could not save status for ${newDoc._id}:`, err));
  });
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
    const document = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found or unauthorized' });
    }

    // Remove its vectors from Pinecone and the original file from storage.
    await deleteDocumentVectors({ userId: req.user.id, documentId: document._id, chunkCount: document.chunkCount });
    await storage.remove(document.storageKey).catch((err) => console.error('Could not remove stored file:', err));

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
