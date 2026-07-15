# App Flow Document

**Project:** InsightAI
**Version:** 1.0
**Date:** 2026-07-02

---

## 1. Purpose

This document describes how a user moves through the app and how data flows
through the system for each key action.

---

## 2. User Journey (High Level)

```
Landing Page → Sign Up / Login → Chat Dashboard
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        General Chat          Upload Documents          View History
     (talk to model)      (build knowledge base)   (past conversations)
```

---

## 3. Authentication Flow

```
User opens app
   ↓
Has account?
   ├── No  → Sign Up form → create user (hash password) → issue JWT → Chat
   └── Yes → Login form  → verify password → issue JWT → Chat
   ↓
JWT stored on client → sent with every API request (Authorization header)
   ↓
Backend verifies JWT on protected routes
```

---

## 4. General Chat Flow (no documents)

```
1. User types a message in the input box and hits Send.
2. Frontend → POST /api/chat  { message, conversationId }  (+ JWT).
3. Backend passes through the rate limiter.
      └── Over limit? → return 429 "Too many requests" → stop.
4. Backend saves the user message to MongoDB.
5. Backend calls the Model Server:
      POST {MODEL_API_URL}  { model, prompt }.
6. Model generates a reply (streamed token-by-token).
7. Backend streams the reply back to the frontend (SSE).
8. Backend saves the assistant reply to MongoDB.
9. Frontend renders the reply in the chat window.
```

---

## 5. Document Upload Flow (building the knowledge base)

```
1. User selects a file (PDF/TXT) and uploads.
2. Frontend → POST /api/documents/upload  (multipart, + JWT).
3. Backend (Multer) receives the file.
4. Text is extracted from the document.
5. Text is split into chunks (with overlap).
6. Each chunk is embedded → vector.
7. Vectors stored in the Vector DB with metadata (userId, docId, chunk text).
8. Document record saved in MongoDB (name, status, chunk count).
9. Frontend shows the document as "Ready".
```

---

## 6. Document Chat Flow (RAG)

```
1. User asks a question (with documents available).
2. Frontend → POST /api/chat  { message, useDocuments: true }.
3. Backend rate-limit check.
4. Backend embeds the question → query vector.
5. Vector DB similarity search → top-K relevant chunks (for THIS user).
6. Backend builds an augmented prompt:
      "Using the following context: [chunks] ... answer: [question]".
7. Prompt → Model Server → grounded answer.
8. Backend returns answer + source chunks (citations).
9. Frontend renders the answer and shows which document parts were used.
```

---

## 7. Mode Selection (the key branch)

```
Message received
   ↓
useDocuments == true  AND  user has documents?
   ├── YES → RAG path  (retrieve chunks → augmented prompt)
   └── NO  → Direct path (message → model as-is)
   ↓
Same fine-tuned model generates the final answer
```

---

## 8. Error / Edge Flows

| Situation | Behavior |
|-----------|----------|
| Model server down | Backend returns friendly error; UI shows "Assistant unavailable, retry" |
| Rate limit exceeded | 429 response; UI shows cooldown message |
| Invalid/expired JWT | 401 response; redirect to login |
| Unsupported file type | Reject upload with clear message |
| Empty vector results | Fall back to general chat + note "no relevant docs found" |

---

## 9. End-to-End Data Flow (summary)

```
React (input)
   → Express (auth + rate limit + save message)
   → [optional] Vector DB (retrieve context)
   → Model Server (generate)
   → Express (save reply, stream)
   → React (display)
   ↕
MongoDB (users, conversations, messages, documents)
```
