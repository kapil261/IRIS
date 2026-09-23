/**
 * File storage for uploaded documents.
 *
 * Only a `local` driver exists today: files live on this server's disk under
 * `uploads/<userId>/`. Every caller goes through `storage.save / remove / localPath`, so
 * moving to cloud storage for deployment (S3, Cloudinary, GCS, …) means adding a driver
 * here and setting STORAGE_DRIVER — controllers and the RAG pipeline don't change.
 *
 * Why not let users choose a server path: on most hosts (Render, Railway, containers) the
 * disk is ephemeral and wiped on every deploy, and accepting paths from clients opens the
 * server to path-traversal writes. Object storage is the deployment answer.
 */
const fs = require('fs')
const path = require('path')

const UPLOAD_ROOT = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')
const DRIVER = process.env.STORAGE_DRIVER || 'local'

/** Strip directory parts and anything outside a conservative character set. */
function safeFilename(originalName) {
  const base = path.basename(originalName || 'file')
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '')
  return (cleaned || 'file').slice(-120)
}

function userDir(userId) {
  const dir = path.join(UPLOAD_ROOT, String(userId))
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Resolve a stored key to an absolute path, refusing anything that escapes UPLOAD_ROOT. */
function resolveKey(key) {
  const full = path.resolve(UPLOAD_ROOT, key)
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) throw new Error('Invalid storage key')
  return full
}

const localDriver = {
  /** Multer destination for a user's uploads. */
  destinationFor: (userId) => userDir(userId),

  /** Unique on-disk name for an upload. */
  filenameFor: (originalName) => `${Date.now()}_${safeFilename(originalName)}`,

  /** Storage key (relative to UPLOAD_ROOT) for a file multer just wrote. */
  keyFor: (absolutePath) => path.relative(UPLOAD_ROOT, absolutePath).split(path.sep).join('/'),

  /** Absolute local path for reading (the RAG loader needs a real file). */
  localPath: (key) => resolveKey(key),

  remove: async (key) => {
    if (!key) return
    await fs.promises.rm(resolveKey(key), { force: true })
  }
}

const drivers = { local: localDriver }

if (!drivers[DRIVER]) {
  throw new Error(`Unknown STORAGE_DRIVER "${DRIVER}". Available: ${Object.keys(drivers).join(', ')}`)
}

module.exports = {
  storage: drivers[DRIVER],
  safeFilename,
  UPLOAD_ROOT
}
