/**
 * Mentor Agent — orchestrator (LangGraph StateGraph), stateful via MongoDB `ProjectState`.
 *
 *                     ┌─ plan ─────▶ planner ───────────────────────────────────▶ END
 *                     │
 *   START ─▶ load ────┼─ advance ──▶ code_creator ─▶ code_reviewer ─▶ compose ─▶ END
 *            project  │                                   ▲
 *            + intent ├─ review ───────────────────────────┘   ("review my code",
 *                     │                                         "server.js throws an error",
 *                     │                                         "change the code to …")
 *                     └─ question ─▶ answer_question ─────────────────────────────▶ END
 *
 * Two roles build the project: the **Code Creator** writes one roadmap file per turn and
 * stores its code; the **Code Reviewer** (a tool-using ReAct agent, see nodes/codeReviewer.js
 * and tools/) reads that file — plus anything it depends on — fixes real problems and reports.
 * The user sees the reviewed file together with the review summary.
 */
const { StateGraph, Annotation, START, END } = require('@langchain/langgraph')
const ProjectState = require('../../models/projectState.model')
const { loadProject, detectIntent, getArtifact, progressSummary, toStateView } = require('./project')
const { planProject } = require('./nodes/planner')
const { createFile } = require('./nodes/codeCreator')
const { reviewFiles } = require('./nodes/codeReviewer')
const { answerQuestion } = require('./nodes/answerQuestion')

const MentorState = Annotation.Root({
  userId: Annotation(),
  threadid: Annotation(),
  question: Annotation(),
  history: Annotation(),
  project: Annotation(), // the loaded mongoose ProjectState document
  intent: Annotation(), // { intent, reason?, targets? }
  created: Annotation(), // Code Creator output
  review: Annotation(), // Code Reviewer output
  answer: Annotation()
})

/* ───────────────────────────── Nodes ───────────────────────────── */

async function loadNode(state) {
  const project = await loadProject(state.threadid, state.userId)
  let intent
  if (project.phase === 'planning') intent = { intent: 'plan' }
  else {
    intent = detectIntent(state.question, project)
    // Once the roadmap is finished there is nothing left to create.
    if (project.phase === 'done' && intent.intent === 'advance') intent = { intent: 'question' }
  }
  return { project, intent }
}

const routeIntent = (state) => state.intent.intent

async function plannerNode(state, config) {
  return { answer: await planProject(state.project, state.question, config) }
}

async function creatorNode(state, config) {
  return { created: await createFile(state.project, state.question, state.history, config) }
}

async function reviewerNode(state, config) {
  const { project, intent, created, question } = state

  if (intent.intent === 'advance') {
    // Review the file the Code Creator just wrote (skip if it produced no code block).
    if (!created || created.done || !getArtifact(project, created.path)) return { review: null }
    return {
      review: await reviewFiles({ project, targets: [created.path], reason: 'new-file', createdPath: created.path, config })
    }
  }

  return {
    review: await reviewFiles({ project, targets: intent.targets, reason: intent.reason, userMessage: question, config })
  }
}

async function questionNode(state, config) {
  return { answer: await answerQuestion(state.project, state.question, state.history, config) }
}

/* ───────────────────────── Composing the reply ───────────────────────── */

const STATUS_ICONS = { passed: '✅', fixed: '🛠', issues: '⚠️' }

function fence(language, code) {
  return `\`\`\`${language || ''}\n${code.replace(/\n$/, '')}\n\`\`\``
}

function reviewSection(review, { heading = true } = {}) {
  if (!review) return ''
  const lines = []
  if (heading) lines.push('---', '### 🔍 Code Reviewer')
  if (review.report?.summary) lines.push(review.report.summary)
  for (const file of review.report?.files || []) {
    const fix = review.fixes.find((f) => f.path.toLowerCase() === file.path.toLowerCase())
    const status = fix ? 'fixed' : file.status
    const icon = STATUS_ICONS[status] || '•'
    const label = status === 'fixed' ? 'fixed' : status === 'passed' ? 'no issues found' : 'issues found'
    lines.push(`\n${icon} \`${file.path}\` — ${label}${file.summary ? `: ${file.summary}` : ''}`)
    const notes = [...(fix?.changes || []), ...(!fix ? file.issues || [] : [])]
    notes.forEach((n) => lines.push(`  - ${n}`))
  }
  if (!review.finishedCleanly) lines.push('\n_(The review stopped early; any fixes shown above were saved.)_')
  return lines.join('\n')
}

function composeCreate(state) {
  const { created, review, project } = state
  if (created.done) {
    return "🎉 **This project's roadmap is already complete!** Ask me anything about it, say **\"review my code\"** for a full review, or describe a new project."
  }

  // Show the reviewed version of the file in place of the Code Creator's draft.
  let body = created.markdown
  const artifact = getArtifact(project, created.path)
  const wasFixed = review?.fixes.some((f) => f.path.toLowerCase() === created.path.toLowerCase())
  if (created.codeBlock && artifact && wasFixed) {
    body = body.replace(created.codeBlock.raw, () => fence(artifact.language || created.codeBlock.language, artifact.content))
  }

  const { done, total } = progressSummary(project)
  const narration = created.next
    ? `✅ **Completed:** \`${created.path}\` (${done}/${total})\n➡ **Now starting:** \`${created.next}\` — say **"next"** to continue, ask about this file, or report an error in it.`
    : `✅ **Completed:** \`${created.path}\` (${done}/${total})\n\n🎉 **That's the whole roadmap!** Every file has been written and reviewed. Say **"review my code"** for a final full-project review, or ask for ideas on what to add next.`

  return [
    `📍 **File:** \`${created.path}\``,
    body,
    wasFixed ? '_The code above is the version corrected by the Code Reviewer._' : '',
    reviewSection(review),
    '---',
    narration
  ].filter(Boolean).join('\n\n')
}

function composeReview(state) {
  const { review, project, intent } = state
  const titles = { error: '🐞 Error investigation', change: '✏️ Requested change', review: '🔍 Code review' }
  const parts = [`### ${titles[intent.reason] || titles.review}`, reviewSection(review, { heading: false })]

  // Show the full corrected content of every file the reviewer changed.
  for (const fix of review.fixes) {
    const artifact = getArtifact(project, fix.path)
    if (artifact) parts.push(`#### \`${artifact.path}\` (updated, v${artifact.version})\n${fence(artifact.language, artifact.content)}`)
  }
  if (!review.fixes.length) parts.push('No files needed changes.')

  const { done, total } = progressSummary(project)
  if (project.phase !== 'done') parts.push(`---\n📋 Progress: ${done}/${total} files. Say **"next"** when you're ready to continue.`)
  return parts.join('\n\n')
}

async function composeNode(state) {
  const answer = state.intent.intent === 'advance' ? composeCreate(state) : composeReview(state)
  return { answer }
}

/** Persist the project after any node that changed it. */
async function saveNode(state) {
  await state.project.save()
  return {}
}

/* ───────────────────────────── Graph ───────────────────────────── */

const graph = new StateGraph(MentorState)
  .addNode('load_project', loadNode)
  .addNode('planner', plannerNode)
  .addNode('code_creator', creatorNode)
  .addNode('code_reviewer', reviewerNode)
  .addNode('compose', composeNode)
  .addNode('answer_question', questionNode)
  .addNode('save_project', saveNode)
  .addEdge(START, 'load_project')
  .addConditionalEdges('load_project', routeIntent, {
    plan: 'planner',
    advance: 'code_creator',
    review: 'code_reviewer',
    question: 'answer_question'
  })
  .addEdge('planner', END) // the planner saves the new roadmap itself
  .addEdge('code_creator', 'code_reviewer')
  .addEdge('code_reviewer', 'compose')
  .addEdge('compose', 'save_project')
  .addEdge('save_project', END)
  .addEdge('answer_question', END)
  .compile()

const ANSWER_CHUNK = 60

/**
 * Run one mentor turn. `history` is recent conversation context only — the roadmap and the
 * generated files come from MongoDB. Yields the same events as the doc agent:
 * status (live, from every node and reviewer tool) → token (the composed reply) → done.
 */
async function* runMentorAgent({ userId, threadid, question, history, signal }) {
  const stream = await graph.stream(
    { userId, threadid, question, history },
    { streamMode: ['custom', 'updates'], signal, recursionLimit: 25 }
  )

  let answer = ''
  for await (const [mode, data] of stream) {
    if (mode === 'custom' && data?.status) {
      yield { type: 'status', status: data.status }
    } else if (mode === 'updates') {
      for (const update of Object.values(data || {})) {
        if (update && typeof update.answer === 'string') answer = update.answer
      }
    }
  }

  // The reply is assembled server-side (reviewed code + review notes), then streamed out.
  for (let i = 0; i < answer.length; i += ANSWER_CHUNK) {
    yield { type: 'token', content: answer.slice(i, i + ANSWER_CHUNK) }
  }
  yield { type: 'done', answer }
}

/** Roadmap/progress/review snapshot for GET /api/mentor/state/:threadid (no file contents). */
async function getMentorState(threadid, userId) {
  const project = await ProjectState.findOne({ threadid, userId })
  return project ? toStateView(project) : null
}

module.exports = {
  graph,
  runMentorAgent,
  getMentorState,
  detectIntent
}
