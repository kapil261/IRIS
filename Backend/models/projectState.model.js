const mongoose = require('mongoose')

// One file inside a roadmap task.
const FileSchema = new mongoose.Schema({
    path: { type: String, required: true },
    status: { type: String, enum: ['pending', 'done'], default: 'pending' }
}, { _id: false })

// One task/phase of the project, grouping the files it needs.
const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    files: [FileSchema]
}, { _id: false })

// Outcome of the Code Reviewer's latest pass over a file.
const ReviewSchema = new mongoose.Schema({
    status: { type: String, enum: ['pending', 'passed', 'fixed', 'issues'], default: 'pending' },
    summary: { type: String, default: '' },
    issues: [{ type: String }],
    reviewedAt: { type: Date }
}, { _id: false })

// The actual code of a generated file — the "project file system" the Code Reviewer's
// tools read and write. Kept separate from the roadmap so the roadmap stays small.
const ArtifactSchema = new mongoose.Schema({
    path: { type: String, required: true },
    language: { type: String, default: '' },
    content: { type: String, default: '' },
    version: { type: Number, default: 1 }, // bumped on every reviewer fix / requested change
    review: { type: ReviewSchema, default: () => ({}) }
}, { _id: false, timestamps: true })

// Persisted Mentor-mode state for one chat thread: the roadmap, where the mentor is in it,
// and the files generated so far. GET /api/mentor/state/:threadid returns a summary of it
// so the frontend can render a live task-list/progress view.
const ProjectStateSchema = new mongoose.Schema({
    threadid: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectName: { type: String, default: '' },
    // planning: no roadmap yet, waiting for the user to describe the project.
    // building: roadmap exists, working through files.
    // done: every file in the roadmap is marked done.
    phase: { type: String, enum: ['planning', 'building', 'done'], default: 'planning' },
    roadmap: [TaskSchema],
    currentTaskIndex: { type: Number, default: 0 },
    currentFileIndex: { type: Number, default: 0 },
    artifacts: [ArtifactSchema]
}, { timestamps: true })

module.exports = mongoose.model('ProjectState', ProjectStateSchema)
