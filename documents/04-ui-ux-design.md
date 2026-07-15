# UI / UX Design Document

**Project:** InsightAI
**Version:** 1.0
**Date:** 2026-07-02

---

## 1. Design Principles

- **Familiar** — ChatGPT-like layout so users need zero learning curve.
- **Clean & focused** — the conversation is the hero; everything else is quiet.
- **Responsive** — works on desktop and mobile.
- **Feedback-rich** — loading states, streaming text, clear errors.

---

## 2. Screens

### 2.1 Landing / Auth
- Simple hero with product name + tagline.
- **Login** and **Sign Up** forms (email, password).
- Validation messages inline.

### 2.2 Main Chat Dashboard (core screen)

```
┌───────────────────────────────────────────────────────────┐
│  Sidebar          │            Chat Area                   │
│                   │                                        │
│  [+ New Chat]     │   ┌──────────────────────────────┐    │
│                   │   │  Assistant: Hello! Ask me...  │    │
│  Conversations:   │   └──────────────────────────────┘    │
│   • React help    │            ┌───────────────────────┐  │
│   • DB schema     │            │ You: How do I ...     │  │
│   • Exam notes    │            └───────────────────────┘  │
│                   │   ┌──────────────────────────────┐    │
│  ── Documents ──  │   │  Assistant: Here's how...     │    │
│   📄 notes.pdf    │   │  (streaming word by word)     │    │
│   📄 manual.pdf   │   └──────────────────────────────┘    │
│   [+ Upload]      │                                        │
│                   │   [ 📎 ] [ Type a message......] [Send]│
│  [Docs Mode: ON]  │                                        │
└───────────────────────────────────────────────────────────┘
```

### 2.3 Document Panel
- List of uploaded documents with status (Processing / Ready).
- Upload button (drag & drop supported).
- Delete document option.
- **"Docs Mode" toggle** — switch between general chat and document-grounded
  chat.

---

## 3. Key Components

| Component | Description |
|-----------|-------------|
| `Sidebar` | New chat button, conversation list, document list, docs-mode toggle |
| `ChatWindow` | Scrollable message list, auto-scroll to latest |
| `MessageBubble` | User vs assistant styling; markdown + code highlighting |
| `MessageInput` | Text box, attach button, send button, disabled while loading |
| `StreamingText` | Renders tokens as they arrive |
| `DocumentUploader` | Drag & drop / file picker, progress bar |
| `SourceCitations` | Shows which document chunks an answer used |
| `AuthForm` | Login / signup |
| `RateLimitBanner` | Appears when user hits the limit |

---

## 4. Interaction Details

- **Streaming:** assistant text appears progressively (typing effect).
- **Code blocks:** syntax-highlighted with a copy button.
- **Markdown:** headings, lists, tables render properly.
- **Auto-scroll:** view follows the latest message unless user scrolls up.
- **Empty state:** friendly prompt + example questions when no messages yet.
- **Loading:** animated "thinking" indicator before the first token.

---

## 5. Design System

| Element | Choice |
|---------|--------|
| **Framework** | Tailwind CSS |
| **Theme** | Light + Dark mode |
| **Font** | Inter / system sans-serif; monospace for code |
| **Primary color** | A single accent (e.g. indigo/blue) |
| **Spacing** | Generous padding; max content width for readability |
| **Icons** | Lucide / Heroicons |

---

## 6. Responsive Behavior

- **Desktop:** sidebar + chat side by side.
- **Mobile:** sidebar collapses into a hamburger menu; chat is full-width.
- Input bar sticks to the bottom on all sizes.

---

## 7. Accessibility

- Keyboard navigation (Enter to send, Shift+Enter for newline).
- Sufficient color contrast in both themes.
- ARIA labels on buttons and inputs.
- Focus states visible.

---

## 8. User Experience Flows (micro)

- **First-time user:** lands → sees example prompts → sends first message →
  gets streamed reply → prompted to try uploading a document.
- **Returning user:** logs in → sees past conversations → resumes instantly.
- **Hitting rate limit:** clear banner with a countdown, not a scary error.
