# Technical Requirement Document (TRD)

**Project:** InsightAI
**Version:** 1.0
**Date:** 2026-07-02

---

## 1. Purpose

This document defines the **technical stack, architecture, and requirements**
needed to build InsightAI. It translates the PRD's features into concrete
technology choices.

---

## 2. High-Level Architecture

```
┌─────────────┐     HTTP      ┌──────────────────┐     HTTP     ┌──────────────────┐
│   React     │ ───────────▶ │  Express + Node   │ ──────────▶ │   Model Server    │
│  (frontend) │ ◀─────────── │    (backend)      │ ◀────────── │ (Ollama / FastAPI)│
└─────────────┘              └──────────────────┘             └──────────────────┘
                                     │  ▲                              │
                                     ▼  │                              ▼
                              ┌────────────┐                  ┌──────────────────┐
                              │  MongoDB   │                  │  Vector DB (RAG)  │
                              │ (app data) │                  │ (Chroma/Pinecone) │
                              └────────────┘                  └──────────────────┘
```

The **model** runs in its own server (Python or Ollama) and is called over HTTP
— exactly like the app previously called the OpenAI API. Only the URL changes.

---

## 3. Technology Stack

### 3.1 Frontend
- **React** (Vite) — SPA chat UI.
- **Tailwind CSS** — styling / design system.
- **Axios / fetch** — API calls.
- **React Router** — navigation (login, chat, documents).
- **Server-Sent Events (SSE)** — for streaming responses.

### 3.2 Backend
- **Node.js + Express** — REST API.
- **JWT** — authentication.
- **express-rate-limit** — rate limiting.
- **Multer** — file uploads.
- **Mongoose** — MongoDB ODM.

### 3.3 Database
- **MongoDB** (Atlas free tier) — users, conversations, messages, documents.

### 3.4 AI / Model Layer
- **Base model:** an open, technically-strong model (e.g. `Qwen2.5-Coder-7B`,
  `Llama-3.2-3B-Instruct`, or `Mistral-7B-Instruct`).
- **Fine-tuning:** LoRA / QLoRA via **Unsloth** or **Hugging Face PEFT**.
- **Serving:** **Ollama** (simplest, no Python in the app) OR **FastAPI +
  transformers** (more control).
- **Embeddings:** a sentence-embedding model (e.g. `all-MiniLM` /
  `nomic-embed-text`).
- **Vector DB:** **Chroma** (local/dev) or **Pinecone** (hosted).

### 3.5 Infrastructure / DevOps
- **Docker** + docker-compose — containerize app + model.
- **Deployment:** frontend on Vercel/Netlify; backend on Render/Railway; model
  on a GPU host (RunPod / Hugging Face Inference Endpoints).
- **Git / GitHub** — version control.

---

## 4. AI Pipeline Requirements

### 4.1 Fine-Tuning
- **Method:** QLoRA (4-bit) to run on a single/rented GPU.
- **Data format:** instruction/response pairs (`{instruction, output}`).
- **Dataset:** technical Q&A + project-building examples in the desired tone.
- **Output:** a LoRA adapter, later **merged** into the base model.
- **Environment:** Google Colab (free GPU) or RunPod/Vast.ai.

### 4.2 RAG Pipeline
1. Upload document → extract text.
2. **Chunk** text (e.g. ~500 tokens with overlap).
3. **Embed** each chunk → store vectors in the vector DB with metadata.
4. On a query: embed the question → **similarity search** → top-K chunks.
5. Inject chunks into the prompt → send to model → grounded answer.

### 4.3 Mode Selection Logic
```
if (message references / uses uploaded documents):
        run RAG → build augmented prompt
else:
        use message directly
→ send to fine-tuned model
```

---

## 5. API Design (REST)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login, return JWT |
| GET  | `/api/conversations` | List user conversations |
| POST | `/api/conversations` | Create conversation |
| GET  | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/chat` | Send message, get model reply (rate-limited) |
| POST | `/api/documents/upload` | Upload & process a document |
| GET  | `/api/documents` | List user documents |
| DELETE | `/api/documents/:id` | Delete a document + its vectors |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | JWT auth, hashed passwords (bcrypt), input validation, CORS |
| **Performance** | Streaming responses; vector search < 500ms |
| **Reliability** | Graceful error handling if model server is down |
| **Abuse protection** | Rate limiting per user/IP on `/api/chat` |
| **Scalability** | Stateless backend; model server can scale separately |
| **Maintainability** | Modular code, env-based config, documented README |

---

## 7. Environment Variables (example)

```
MONGO_URI=...
JWT_SECRET=...
MODEL_API_URL=http://localhost:11434   # Ollama / FastAPI
MODEL_NAME=insightai
VECTOR_DB_URL=...
EMBEDDING_MODEL=nomic-embed-text
RATE_LIMIT_MAX=20
RATE_LIMIT_WINDOW_MS=60000
```

---

## 8. Key Technical Decisions

- **Why Ollama first?** Keeps the app 100% JavaScript; model is just a URL.
- **Why LoRA/QLoRA?** Cheap fine-tuning that runs on a single GPU.
- **Why a separate model server?** ML libs are Python; decoupling lets each
  scale independently and keeps the MERN app clean.
- **Why RAG + fine-tuning together?** RAG supplies correct *knowledge*;
  fine-tuning supplies correct *behavior/tone*.
