/**
 * Code Reviewer: a tool-using ReAct agent built as its own small LangGraph.
 *
 *   START ─▶ reviewer (LLM with tools bound) ──tool calls?──▶ tools (ToolNode) ─┐
 *                ▲                                                             │
 *                └─────────────── until submit_review_report ◀────────────────┘
 *
 * Like a person reviewing a project, it lists the files, reads what it needs, fixes real
 * problems with update_project_file (full corrected file), and finishes with
 * submit_review_report. The tools act on the in-memory project document; the orchestrator
 * saves it afterwards.
 */
const { StateGraph, MessagesAnnotation, START, END } = require('@langchain/langgraph')
const { ToolNode } = require('@langchain/langgraph/prebuilt')
const { SystemMessage, HumanMessage } = require('@langchain/core/messages')
const { invokeWithTools } = require('../../../services/llm.service')
const { MENTOR_REVIEWER_PROMPT } = require('../prompts')
const { emitStatus, messageText } = require('../../utils')
const { getArtifact } = require('../project')
const { createProjectFileTools, createReviewLog } = require('../tools/projectFiles.tools')

// Each tool round trip is 2 graph steps; allow room for list + a few reads + fixes + report.
const BASE_STEPS = 16
const STEPS_PER_FILE = 6
const MAX_STEPS = 60

function buildReviewerGraph(tools, log) {
  const reviewer = async (state, config) => {
    const response = await invokeWithTools(state.messages, tools, config, { temperature: 0, maxTokens: 8192 })
    return { messages: [response] }
  }

  const afterReviewer = (state) => {
    if (log.report) return END
    const last = state.messages[state.messages.length - 1]
    return last?.tool_calls?.length ? 'tools' : END // answered in plain text → stop
  }

  return new StateGraph(MessagesAnnotation)
    .addNode('reviewer', reviewer)
    .addNode('tools', new ToolNode(tools))
    .addEdge(START, 'reviewer')
    .addConditionalEdges('reviewer', afterReviewer, ['tools', END])
    .addConditionalEdges('tools', () => (log.report ? END : 'reviewer'), ['reviewer', END])
    .compile()
}

function taskMessage({ reason, targets, userMessage, createdPath }) {
  const list = targets.map((t) => `- ${t}`).join('\n')
  switch (reason) {
    case 'new-file':
      return `The Code Creator just generated \`${createdPath}\`. Review it (read files it depends on if that helps you verify imports/exports), fix any real problems, then submit your report.`
    case 'error':
      return `The user reports a problem:\n"""${userMessage}"""\n\nFiles most likely involved:\n${list}\n\nFind the cause, fix it with update_project_file, check related files if needed, then submit your report explaining the root cause and the fix.`
    case 'change':
      return `The user asked for this change:\n"""${userMessage}"""\n\nApply it to:\n${list}\n\nSave the complete updated file(s) with update_project_file, make sure nothing else breaks, then submit your report describing the change.`
    default:
      return `Review these files:\n${list}\n\n${userMessage ? `The user's request: """${userMessage}"""\n\n` : ''}Fix any real problems, then submit your report.`
  }
}

/**
 * Run a review. `reason`: 'new-file' | 'review' | 'error' | 'change'.
 * Returns { report, fixes: [{ path, changes }], reviewed: [paths], finishedCleanly }.
 */
async function reviewFiles({ project, targets, reason, userMessage, createdPath, config }) {
  const log = createReviewLog()
  const notify = (status) => emitStatus(config, status)
  const tools = createProjectFileTools({ project, log, notify })
  const graph = buildReviewerGraph(tools, log)

  notify(reason === 'new-file' ? `Code Reviewer is checking ${createdPath}…` : 'Code Reviewer is starting…')

  let lastText = ''
  let finishedCleanly = true
  try {
    const result = await graph.invoke(
      {
        messages: [
          new SystemMessage(MENTOR_REVIEWER_PROMPT),
          new HumanMessage(taskMessage({ reason, targets, userMessage, createdPath }))
        ]
      },
      {
        ...config,
        recursionLimit: Math.min(MAX_STEPS, BASE_STEPS + STEPS_PER_FILE * targets.length)
      }
    )
    const last = result.messages[result.messages.length - 1]
    if (last && !last.tool_calls?.length) lastText = messageText(last.content)
  } catch (err) {
    if (config?.signal?.aborted) throw err
    // Step limit or provider failure: keep whatever fixes were already applied.
    console.error('[mentor/reviewer] Review stopped early:', err.message)
    finishedCleanly = false
  }

  // The model may stop without calling submit_review_report — record an outcome anyway.
  if (!log.report) {
    const now = new Date()
    for (const path of targets) {
      const artifact = getArtifact(project, path)
      if (!artifact) continue
      const fixed = log.fixes.has(artifact.path)
      if (fixed || log.reads.has(artifact.path)) {
        artifact.review = {
          status: fixed ? 'fixed' : 'passed',
          summary: fixed ? log.fixes.get(artifact.path).changes.join('; ') : '',
          issues: [],
          reviewedAt: now
        }
      }
    }
    log.report = {
      summary: lastText || (log.fixes.size ? 'Applied fixes.' : 'Review finished without a written report.'),
      files: targets.map((path) => ({ path, status: log.fixes.has(path) ? 'fixed' : 'passed', issues: [] }))
    }
  }

  project.markModified('artifacts')
  return {
    report: log.report,
    fixes: [...log.fixes.values()],
    reviewed: [...log.reads],
    finishedCleanly
  }
}

module.exports = { reviewFiles }
