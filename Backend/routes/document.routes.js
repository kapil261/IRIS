const express = require('express');
const router = express.Router();
const multer = require('multer');

const authMiddleware = require('../middleware/auth.middleware');
const documentController = require('../controllers/document.controller');
const { storage } = require('../services/storage.service');

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// Files land in uploads/<userId>/<timestamp>_<sanitised name> (see services/storage.service.js)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, storage.destinationFor(req.user.id)),
    filename: (req, file, cb) => cb(null, storage.filenameFor(file.originalname))
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    // The extension is the reliable signal — clients send inconsistent mimetypes for .txt
    // (text/plain, application/octet-stream, ...), so only gate on that.
    if (/\.(pdf|txt)$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Only .pdf and .txt files are allowed.'));
  }
});

function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File size must be under 10MB.' : (err.message || 'Upload failed');
    return res.status(400).json({ message });
  });
}

// Protect all routes (must run before multer so req.user is available for the destination)
router.use(authMiddleware);

router.post('/upload', uploadSingleFile, documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
