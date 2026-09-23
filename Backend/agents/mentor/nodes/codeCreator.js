/**
 * Code Creator: writes exactly the current roadmap file, stores its code as a project
 * artifact (so the Code Reviewer's tools can read/fix it), and advances the roadmap pointer.
 */
const { SystemMessage, HumanMessage } = require('@langchain/core/messages')
const { getIdentityPrompt } = require('../../../services/prompts')
const { MENTOR_FILE_PROMPT, extractCodeBlock } = require('../prompts')
const { toLangChainMessages, emitStatus, generateAnswer } = require('../../utils')
const { findCurrentFile, findNextFile, upsertArtifact } = require('../project')

const HISTORY_WINDOW = 6

/**
 * Returns { done: true } when the roadmap is already complete, otherwise
 * { path, taskTitle, markdown, codeBlock, next } where `next` is the following file (or null).
 */
async function createFile(project, question, history, config) {
  const current = findCurrentFile(project)
  if (!current) {
    project.phase = 'done'
    return { done: true }
  }

  const { file, task } = current
  emitStatus(config, `Code Creator is writing ${file.path}…`)

  const prompt = MENTOR_FILE_PROMPT
    .replace(/\{filePath\}/g, () => file.path)
    .replace(/\{taskTitle\}/g, () => task.title)

  const markdown = await generateAnswer([
    new SystemMessage(getIdentityPrompt() + '\n' + prompt),
    ...toLangChainMessages((history || []).slice(-HISTORY_WINDOW), { maxChars: 4000 }),
    new HumanMessage(question)
  ], config, { maxTokens: 6144 })

  // Store the file's code so the reviewer (and later "review my project" requests) can use it.
  const codeBlock = extractCodeBlock(markdown)
  if (codeBlock) upsertArtifact(project, { path: file.path, content: `${codeBlock.code}\n`, language: codeBlock.language })

  // Mark done + move the pointer (the reviewer may still correct the content afterwards).
  file.status = 'done'
  const next = findNextFile(project, current.taskIndex, current.fileIndex)
  if (next) {
    project.currentTaskIndex = next.taskIndex
    project.currentFileIndex = next.fileIndex
  } else {
    project.phase = 'done'
  }
  project.markModified('roadmap')

  return { path: file.path, taskTitle: task.title, markdown, codeBlock, next: next ? next.file.path : null }
}

module.exports = { createFile }
