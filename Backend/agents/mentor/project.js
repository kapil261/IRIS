/**
 * Mentor project helpers: loading the persisted ProjectState, roadmap pointer math, the
 * generated-file store, and classifying what the user wants this turn.
 */
const ProjectState = require('../../models/projectState.model')

async function loadProject(threadid, userId) {
  let doc = await ProjectState.findOne({ threadid, userId })
  if (!doc) doc = await ProjectState.create({ threadid, userId, phase: 'planning', roadmap: [] })
  return doc
}

/** First not-yet-done file, searching forward from the current pointers. */
function findCurrentFile(project) {
  for (let t = project.currentTaskIndex; t < project.roadmap.length; t++) {
    const task = project.roadmap[t]
    const startFile = t === project.currentTaskIndex ? project.currentFileIndex : 0
    for (let f = startFile; f < task.files.length; f++) {
      if (task.files[f].status !== 'done') return { taskIndex: t, fileIndex: f, task, file: task.files[f] }
    }
  }
  return null
}

/** The next not-yet-done file after the given position, or null if the roadmap is complete. */
function findNextFile(project, afterTaskIndex, afterFileIndex) {
  for (let t = afterTaskIndex; t < project.roadmap.length; t++) {
    const task = project.roadmap[t]
    const startFile = t === afterTaskIndex ? afterFileIndex + 1 : 0
    for (let f = startFile; f < task.files.length; f++) {
      if (task.files[f].status !== 'done') return { taskIndex: t, fileIndex: f, task, file: task.files[f] }
    }
  }
  return null
}

function progressSummary(project) {
  const allFiles = project.roadmap.flatMap((t) => t.files)
  return { done: allFiles.filter((f) => f.status === 'done').length, total: allFiles.length }
}

/* ──────────────────────── Generated-file store ──────────────────────── */

const normalizePath = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.?\//, '').trim()

function getArtifact(project, path) {
  const target = normalizePath(path).toLowerCase()
  return project.artifacts.find((a) => a.path.toLowerCase() === target) || null
}

/** Save (or replace) a file's content. Returns the artifact. */
function upsertArtifact(project, { path, content, language }) {
  const existing = getArtifact(project, path)
  if (existing) {
    existing.content = content
    if (language) existing.language = language
    existing.version += 1
    existing.review = { status: 'pending', summary: '', issues: [] }
    return existing
  }
  project.artifacts.push({ path: normalizePath(path), content, language: language || '', version: 1 })
  return project.artifacts[project.artifacts.length - 1]
}

function roadmapPaths(project) {
  return project.roadmap.flatMap((t) => t.files.map((f) => f.path))
}

/** Generated files whose path or file name appears in the message. */
function artifactsMentionedIn(project, message) {
  const text = (message || '').toLowerCase().replace(/\\/g, '/')
  return project.artifacts.filter((a) => {
    const full = a.path.toLowerCase()
    const base = full.split('/').pop()
    return text.includes(full) || new RegExp(`(^|[^\\w.-])${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w.-])`).test(text)
  })
}

/** The most recently generated/updated file (ties → the one added last). */
function lastArtifact(project) {
  return project.artifacts
    .map((artifact, index) => ({ artifact, index, time: new Date(artifact.updatedAt || 0).getTime() }))
    .sort((a, b) => b.time - a.time || b.index - a.index)[0]?.artifact || null
}

/* ──────────────────────────── Intent ──────────────────────────── */

// "Move on" phrases, checked against the whole trimmed message ("next", "continue", …).
const ADVANCE_PATTERNS = [
  /^next\b/, /^continue\b/, /^proceed\b/, /^go ahead\b/, /^move on\b/, /^start\b/, /^begin\b/,
  /^yes\b/, /^yep\b/, /^ok(ay)?\b/, /^sure\b/, /^do it\b/, /^sounds good\b/, /^let'?s (go|continue|proceed)\b/,
  /next file/, /next step/, /next task/, /move to the next/, /generate (it|the next file)/
]

// Asking the Code Reviewer: explicit review requests, reported errors, or change requests.
const REVIEW_REQUEST = /\b(review|audit|check|inspect)\b.*\b(code|file|files|project|it|everything|all)\b|\b(code|project|file)\s+review\b/
const ERROR_REPORT = /\b(bug|bugs|error|errors|exception|stack ?trace|crash(es|ed|ing)?|broken|not working|doesn'?t work|isn'?t working|fails?|failing|failed|undefined is not|cannot find module|syntaxerror|typeerror|referenceerror)\b/
const CHANGE_REQUEST = /\bchange the (generated )?code\b|\b(modify|update|refactor|rewrite)\b.*\b(file|code)\b/

/**
 * What does the user want this turn?
 *   { intent: 'advance' }                              → Code Creator writes the next file
 *   { intent: 'review', reason, targets }              → Code Reviewer (reason: review | error | change)
 *   { intent: 'question' }                             → answer without touching the roadmap
 */
function detectIntent(message, project) {
  const trimmed = (message || '').trim()
  const lower = trimmed.toLowerCase()
  const hasFiles = project.artifacts.length > 0

  if (hasFiles) {
    const mentioned = artifactsMentionedIn(project, message)
    const isReview = REVIEW_REQUEST.test(lower)
    const isError = ERROR_REPORT.test(lower)
    const isChange = CHANGE_REQUEST.test(lower)

    if (isReview || isError || isChange) {
      const reason = isChange ? 'change' : isError ? 'error' : 'review'
      let targets
      if (mentioned.length) targets = mentioned.map((a) => a.path)
      else if (reason === 'review') targets = project.artifacts.map((a) => a.path) // "review my code" → everything
      else targets = [lastArtifact(project).path] // an error/change with no file named → the latest file
      return { intent: 'review', reason, targets }
    }
  }

  if (ADVANCE_PATTERNS.some((re) => re.test(lower))) return { intent: 'advance' }

  // Right after the roadmap is created, a non-question message ("ok let's build it", a
  // restatement of the idea, …) should still kick off file #1.
  const isBootstrap = project.phase === 'building' && progressSummary(project).done === 0
  const looksLikeQuestion = trimmed.includes('?') || /^(what|why|how|can|could|should|is|are|does|do|will|explain|change|instead|but|wait)\b/.test(lower)
  if (isBootstrap && !looksLikeQuestion) return { intent: 'advance' }

  return { intent: 'question' }
}

/** Summary for GET /api/mentor/state (no file contents). */
function toStateView(project) {
  const reviewByPath = new Map(project.artifacts.map((a) => [a.path.toLowerCase(), a]))
  const { done, total } = progressSummary(project)
  return {
    threadid: project.threadid,
    projectName: project.projectName,
    phase: project.phase,
    currentTaskIndex: project.currentTaskIndex,
    currentFileIndex: project.currentFileIndex,
    roadmap: project.roadmap.map((task) => ({
      title: task.title,
      files: task.files.map((f) => {
        const artifact = reviewByPath.get(f.path.toLowerCase())
        return {
          path: f.path,
          status: f.status,
          reviewStatus: artifact?.review?.status || null,
          reviewSummary: artifact?.review?.summary || '',
          version: artifact?.version || 0
        }
      })
    })),
    progress: { done, total }
  }
}

module.exports = {
  loadProject,
  findCurrentFile,
  findNextFile,
  progressSummary,
  normalizePath,
  getArtifact,
  upsertArtifact,
  roadmapPaths,
  artifactsMentionedIn,
  lastArtifact,
  detectIntent,
  toStateView
}
