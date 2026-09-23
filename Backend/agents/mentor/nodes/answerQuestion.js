/** Mentor Q&A: answers a question without moving the roadmap pointer or touching files. */
const { SystemMessage, HumanMessage } = require('@langchain/core/messages')
const { getIdentityPrompt } = require('../../../services/prompts')
const { MENTOR_QUESTION_PROMPT } = require('../prompts')
const { toLangChainMessages, emitStatus, generateAnswer } = require('../../utils')
const { findCurrentFile } = require('../project')

const HISTORY_WINDOW = 6

async function answerQuestion(project, question, history, config) {
  emitStatus(config, 'Thinking…')

  const current = findCurrentFile(project)
  const position = project.roadmap.length
    ? `\n\nCurrent roadmap position: task "${current?.task.title || '(complete)'}", next file ${current ? `\`${current.file.path}\`` : '(none left — roadmap complete)'}.` +
      (project.artifacts.length ? ` Files generated so far: ${project.artifacts.map((a) => a.path).join(', ')}.` : '')
    : ''

  return generateAnswer([
    new SystemMessage(getIdentityPrompt() + '\n' + MENTOR_QUESTION_PROMPT + position),
    ...toLangChainMessages((history || []).slice(-HISTORY_WINDOW), { maxChars: 4000 }),
    new HumanMessage(question)
  ], config)
}

module.exports = { answerQuestion }
