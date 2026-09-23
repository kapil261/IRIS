/** Planner: turns the user's project idea into a narrative overview + a persisted roadmap. */
const { SystemMessage, HumanMessage } = require('@langchain/core/messages')
const { getIdentityPrompt } = require('../../../services/prompts')
const { MENTOR_PLANNING_PROMPT, parseRoadmapJson, stripRoadmapJson } = require('../prompts')
const { emitStatus, generateAnswer } = require('../../utils')
const { findCurrentFile, progressSummary } = require('../project')

async function planProject(project, question, config) {
  emitStatus(config, 'Planning your project…')

  // Generated fully server-side (not token-streamed) so the raw ```json roadmap block never
  // flashes on screen — only the cleaned narrative is sent to the client.
  const raw = await generateAnswer([
    new SystemMessage(getIdentityPrompt() + '\n' + MENTOR_PLANNING_PROMPT),
    new HumanMessage(question)
  ], config)

  const parsed = parseRoadmapJson(raw)
  const narrative = stripRoadmapJson(raw)
  if (!parsed) {
    return `${narrative}\n\n_(I couldn't turn that into a structured roadmap — could you describe the project again, or list the main features you want?)_`
  }

  project.projectName = parsed.projectName
  project.roadmap = parsed.tasks
  project.phase = 'building'
  project.currentTaskIndex = 0
  project.currentFileIndex = 0
  await project.save()

  const { total } = progressSummary(project)
  const first = findCurrentFile(project)
  return `${narrative}\n\n---\n📋 **Roadmap saved:** ${total} file${total === 1 ? '' : 's'} across ${project.roadmap.length} task${project.roadmap.length === 1 ? '' : 's'}.\n` +
    `Each file is written by the **Code Creator** and then checked by the **Code Reviewer**.\n` +
    `➡ **Now starting:** \`${first.file.path}\` — say **"next"** to generate it.`
}

module.exports = { planProject }
