import { useState } from 'react'
import { ArrowRight, Pencil, ShieldCheck, Bug } from 'lucide-react'

// Messages the backend mentor agent routes on (see Backend/agents/mentor/project.js detectIntent):
//   "Proceed…"                         → Code Creator writes the next file
//   "Please change the generated code…" → Code Reviewer applies the change
//   "Review all the files…"            → Code Reviewer reviews the whole project
//   "…error…"                          → Code Reviewer investigates and fixes
export const MENTOR_NEXT_PROMPT = 'Proceed to the next step and generate the next file.'
const REVIEW_ALL_PROMPT = 'Review all the files generated so far and fix any issues.'

const MODAL_KINDS = {
  change: {
    title: 'Change the code',
    description: 'Describe what you want changed. The Code Reviewer will update the file and keep your place in the roadmap.',
    placeholder: 'e.g. Use ES6 imports instead of require, add input validation, rename the port variable…',
    submit: 'Apply change',
    toMessage: (text) => `Please change the generated code for this step according to the following requirements:\n${text}`
  },
  error: {
    title: 'Report an error',
    description: 'Paste the error message and what you ran. Mention the file name if you know it — otherwise the latest file is checked. The Code Reviewer will trace it and fix the right file.',
    placeholder: 'e.g. Running node server.js gives: TypeError: app.listen is not a function',
    submit: 'Find & fix',
    toMessage: (text) => `I'm getting an error: ${text}`
  }
}

/** Buttons under the latest mentor reply: next file, change code, report error, review everything. */
const MentorActions = ({ onSend, disabled, isComplete, hasFiles }) => {
  const [modal, setModal] = useState(null) // 'change' | 'error' | null
  const [text, setText] = useState('')
  const kind = modal ? MODAL_KINDS[modal] : null

  const close = () => {
    setModal(null)
    setText('')
  }

  const submit = () => {
    const value = text.trim()
    if (!value || disabled) return
    close()
    onSend(kind.toMessage(value))
  }

  return (
    <>
      <div className="mentor-actions">
        {!isComplete && (
          <button type="button" className="mentor-action-btn next-btn" disabled={disabled} onClick={() => onSend(MENTOR_NEXT_PROMPT)}>
            <ArrowRight size={14} /> Next File
          </button>
        )}
        {hasFiles && (
          <>
            <button type="button" className="mentor-action-btn change-btn" disabled={disabled} onClick={() => setModal('change')}>
              <Pencil size={13} /> Change Code
            </button>
            <button type="button" className="mentor-action-btn change-btn" disabled={disabled} onClick={() => setModal('error')}>
              <Bug size={13} /> Report Error
            </button>
            <button type="button" className="mentor-action-btn review-btn" disabled={disabled} onClick={() => onSend(REVIEW_ALL_PROMPT)}>
              <ShieldCheck size={13} /> Review Code
            </button>
          </>
        )}
      </div>

      {kind && (
        <div className="change-code-modal-overlay" onClick={close}>
          <div className="change-code-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{kind.title}</h3>
            <p>{kind.description}</p>
            <textarea placeholder={kind.placeholder} value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={close} type="button">Cancel</button>
              <button className="submit-btn" onClick={submit} disabled={!text.trim() || disabled} type="button">
                {kind.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MentorActions
