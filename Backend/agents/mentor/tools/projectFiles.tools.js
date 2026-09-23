/**
 * Code Reviewer tools. They operate on the mentor project's generated files (the
 * `artifacts` stored on ProjectState), which act as the project's file system.
 *
 * Built per review run: each tool closes over the loaded project document, a `log` that
 * records what the reviewer did (reads, fixes, final report), and a `notify` callback that
 * streams progress ("Reviewer is reading server.js…") to the client.
 * Nothing here saves to MongoDB — the caller saves the project once the review finishes.
 */
const { tool } = require('@langchain/core/tools')
const { z } = require('zod')
const { getArtifact } = require('../project')

const MAX_FILE_CHARS = 60000

const withLineNumbers = (content) =>
  content.split('\n').map((line, i) => `${String(i + 1).padStart(4)} | ${line}`).join('\n')

/** Reviewers sometimes paste back the numbered view or wrap the file in a fence — undo that. */
function cleanSubmittedContent(content) {
  let text = String(content || '')
  const fenced = text.match(/^\s*```[\w.+-]*\s*\n([\s\S]*?)\n?```\s*$/)
  if (fenced) text = fenced[1]
  const lines = text.split('\n')
  if (lines.length > 1 && lines.every((l) => /^\s*\d+ \| /.test(l) || l.trim() === '')) {
    text = lines.map((l) => l.replace(/^\s*\d+ \| /, '')).join('\n')
  }
  return text.replace(/\s+$/, '') + '\n'
}

function createProjectFileTools({ project, log, notify = () => {} }) {
  const listProjectFiles = tool(
    async () => {
      notify('Code Reviewer is listing the project files…')
      const files = project.roadmap.flatMap((task) =>
        task.files.map((f) => {
          const artifact = getArtifact(project, f.path)
          return {
            path: f.path,
            task: task.title,
            generated: !!artifact,
            lines: artifact ? artifact.content.split('\n').length : 0,
            reviewStatus: artifact?.review?.status || null
          }
        })
      )
      return JSON.stringify({ project: project.projectName, files }, null, 2)
    },
    {
      name: 'list_project_files',
      description: 'List every file in the project roadmap with whether it has been generated yet, its size in lines, and its last review status.',
      schema: z.object({})
    }
  )

  const readProjectFile = tool(
    async ({ path }) => {
      const artifact = getArtifact(project, path)
      if (!artifact) {
        return `ERROR: "${path}" has not been generated yet (or is not in the roadmap). Use list_project_files to see available files.`
      }
      notify(`Code Reviewer is reading ${artifact.path}…`)
      log.reads.add(artifact.path)
      const content = artifact.content.length > MAX_FILE_CHARS
        ? `${artifact.content.slice(0, MAX_FILE_CHARS)}\n… [truncated]`
        : artifact.content
      return `File: ${artifact.path} (version ${artifact.version}, ${artifact.language || 'text'})\n${withLineNumbers(content)}`
    },
    {
      name: 'read_project_file',
      description: 'Read the current content of one generated project file, with line numbers.',
      schema: z.object({
        path: z.string().describe('File path exactly as listed by list_project_files, e.g. "Backend/src/app.js"')
      })
    }
  )

  const updateProjectFile = tool(
    async ({ path, content, changes }) => {
      const artifact = getArtifact(project, path)
      if (!artifact) return `ERROR: "${path}" has not been generated yet — you can only fix existing files.`

      const next = cleanSubmittedContent(content)
      if (next.trim().length < 5) return 'ERROR: content is empty. Send the COMPLETE corrected file.'
      if (next.trim() === artifact.content.trim()) return 'No change: the content is identical to the current file.'
      // Guard against a truncated/partial rewrite silently replacing a whole file.
      if (artifact.content.length > 400 && next.length < artifact.content.length * 0.4) {
        return 'ERROR: the new content is much shorter than the current file. Send the COMPLETE corrected file, not a fragment.'
      }

      notify(`Code Reviewer is fixing ${artifact.path}…`)
      artifact.content = next
      artifact.version += 1
      const entry = log.fixes.get(artifact.path) || { path: artifact.path, changes: [] }
      entry.changes.push(...(changes || []))
      log.fixes.set(artifact.path, entry)
      return `Saved ${artifact.path} (now version ${artifact.version}).`
    },
    {
      name: 'update_project_file',
      description: 'Replace a generated file with its COMPLETE corrected content (not a diff). Only call this for files that have real problems.',
      schema: z.object({
        path: z.string().describe('File path exactly as listed by list_project_files'),
        content: z.string().describe('The complete corrected file content, without line numbers or markdown fences'),
        changes: z.array(z.string()).describe('Short bullet list of what you changed and why')
      })
    }
  )

  const submitReviewReport = tool(
    async ({ summary, files }) => {
      const now = new Date()
      log.report = { summary, files }
      for (const entry of files) {
        const artifact = getArtifact(project, entry.path)
        if (!artifact) continue
        const fixed = log.fixes.has(artifact.path)
        artifact.review = {
          // A file the reviewer actually rewrote is "fixed" regardless of what it reported.
          status: fixed ? 'fixed' : (entry.status === 'fixed' ? 'issues' : entry.status),
          summary: entry.summary || '',
          issues: entry.issues || [],
          reviewedAt: now
        }
      }
      return 'Review report recorded. You are done — do not call any more tools.'
    },
    {
      name: 'submit_review_report',
      description: 'Finish the review. Call exactly once, as your final action.',
      schema: z.object({
        summary: z.string().describe('One or two sentences summarising the review'),
        files: z.array(z.object({
          path: z.string(),
          status: z.enum(['passed', 'fixed', 'issues']).describe('passed = no changes needed; fixed = you saved a corrected version; issues = problems you could not fix'),
          summary: z.string().describe('One line about this file').optional(),
          issues: z.array(z.string()).describe('Problems found in this file (empty if none)')
        }))
      })
    }
  )

  return [listProjectFiles, readProjectFile, updateProjectFile, submitReviewReport]
}

/** Fresh per-run log the tools write into. */
const createReviewLog = () => ({ reads: new Set(), fixes: new Map(), report: null })

module.exports = { createProjectFileTools, createReviewLog }
