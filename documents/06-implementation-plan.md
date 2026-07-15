# Implementation Plan

**Project:** InsightAI
**Version:** 1.0
**Date:** 2026-07-02

---

## 1. Strategy

Build in **phases**, where each phase produces something that **works and is
demoable**. This avoids scope creep and guarantees you always have a
resume-worthy result, even if you stop early.

```
Phase 0  →  Setup
Phase 1  →  MVP chat app (MERN + stock model)      ← already resume-ready
Phase 2  →  RAG (document intelligence)            ← strong
Phase 3  →  Fine-tuned model + polish + deploy     ← stands out
```

---

## 2. Phase 0 — Project Setup (Foundation)

- [ ] Create repo + folder structure (`/client`, `/server`, `/model`, `/docs`).
- [ ] Initialize React (Vite) + Tailwind in `/client`.
- [ ] Initialize Express + Mongoose in `/server`.
- [ ] Set up MongoDB Atlas (free) and connect.
- [ ] Add `.env` config and `.gitignore`.
- [ ] Install Ollama locally; pull a base model (e.g. `llama3.2`).

**Deliverable:** empty app runs; DB connects; Ollama responds to a test call.

---

## 3. Phase 1 — MVP Chat App

**Backend**
- [ ] User model + signup/login routes with **JWT** + bcrypt.
- [ ] Auth middleware (verify JWT).
- [ ] Conversation + Message models.
- [ ] `POST /api/chat` → save message → call Ollama → return reply → save reply.
- [ ] Add **express-rate-limit** to `/api/chat`.

**Frontend**
- [ ] Login / Signup pages.
- [ ] Chat dashboard: sidebar + chat window + input.
- [ ] Send message → display reply.
- [ ] Conversation list + history.

**Deliverable:** Working ChatGPT-style app with auth, history, and rate
limiting, powered by a local model. **← This alone is a solid portfolio piece.**

---

## 4. Phase 2 — RAG (Document Intelligence)

**Backend**
- [ ] Document model + `POST /api/documents/upload` (Multer).
- [ ] Text extraction (PDF/TXT).
- [ ] Chunking + embedding pipeline.
- [ ] Integrate Vector DB (Chroma local).
- [ ] Store vectors with `userId` / `documentId` metadata.
- [ ] Update `/api/chat`: if `useDocuments`, retrieve top-K chunks → augment
      prompt.
- [ ] Return **source citations** with answers.

**Frontend**
- [ ] Document upload UI (drag & drop + progress).
- [ ] Document list with status.
- [ ] "Docs Mode" toggle.
- [ ] Show source citations under answers.

**Deliverable:** Upload a document → ask about it → get grounded answers with
sources.

---

## 5. Phase 3 — Fine-Tuned Model + Polish + Deploy

**Fine-tuning**
- [ ] Collect/prepare dataset (technical Q&A + project-building, in your tone).
- [ ] Fine-tune base model with **QLoRA** (Unsloth) on Colab/RunPod.
- [ ] Merge adapter → import into Ollama as `insightai`.
- [ ] Point backend `MODEL_NAME` to the fine-tuned model.

**Polish**
- [ ] **Streaming** responses (SSE) end to end.
- [ ] Markdown + code highlighting + copy button.
- [ ] Dark mode, empty states, loading states.
- [ ] Error handling (model down, rate limit banner).

**Deploy**
- [ ] **Dockerize** client, server, model.
- [ ] Deploy frontend (Vercel) + backend (Render) + model (GPU host).
- [ ] Write **README** with architecture diagram + live demo link.

**Deliverable:** Live, deployed app using YOUR fine-tuned model. **← Stands out.**

---

## 6. Suggested Folder Structure

```
insightai/
├── client/                 # React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   └── ...
├── server/                 # Express + Mongoose
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/     # auth, rateLimit
│   │   └── services/       # modelClient, ragService
│   └── ...
├── model/                  # fine-tuning + serving
│   ├── finetune/           # Colab notebook, dataset
│   └── serve/              # Ollama Modelfile / FastAPI
├── docs/                   # these 6 documents
└── docker-compose.yml
```

---

## 7. Milestones & Rough Timeline

| Milestone | Scope | Est. time* |
|-----------|-------|-----------|
| M0 | Setup complete | 1 day |
| M1 | MVP chat app working | 4–6 days |
| M2 | RAG working | 4–6 days |
| M3 | Fine-tune + deploy | 5–8 days |

\* Solo, learning-as-you-go pace. Adjust to your schedule.

---

## 8. Definition of Done (per phase)

- Code committed to GitHub with clear messages.
- Feature works end to end and is manually tested.
- No secrets committed; `.env.example` provided.
- Short note in README describing the phase's feature.

---

## 9. Resume Checkpoints

- After **M1**: "Built a full-stack MERN AI chat app with JWT auth and rate
  limiting."
- After **M2**: "Added RAG with vector search over user-uploaded documents."
- After **M3**: "Fine-tuned an open LLM (LoRA/QLoRA) and deployed the full
  system with Docker."

Each milestone adds a stronger bullet — so progress is never wasted.
