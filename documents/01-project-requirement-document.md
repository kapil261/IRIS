   # Project Requirement Document (PRD)

**Project Name:** InsightAI — A Technical AI Assistant with Document Intelligence
**Author:** _(you)_
**Version:** 1.0
**Date:** 2026-07-02

---

## 1. Overview

InsightAI is a full-stack GenAI web application that lets users **chat with a
custom AI assistant** that is:

1. **Fine-tuned** to be strong at technical topics (coding, system design,
   building projects) and to answer in a clear, structured, engineer-friendly
   style.
2. **Document-aware** — users can upload their own documents (PDFs, notes) and
   ask questions answered directly from that content using **RAG**
   (Retrieval-Augmented Generation).

In short: **a technically-minded AI that also knows YOUR documents.**

---

## 2. Problem Statement

Generic AI models (like ChatGPT) have two limitations for real users:

1. **They don't know your private information.** They can't answer questions
   about your notes, company handbook, or project docs — and they may
   hallucinate answers.
2. **Their behavior isn't tailored.** They give generic answers instead of the
   focused, technical, practical responses that developers and technical users
   actually want.

Searching long documents manually is slow, and normal keyword search (`Ctrl+F`)
only matches exact words, not meaning.

---

## 3. Solution

A single assistant with two modes:

- **General Chat Mode** — powered by a fine-tuned technical model, so answers
  feel like talking to a helpful senior developer.
- **Document Mode** — upload documents, then ask questions answered from that
  content via semantic (meaning-based) search + the model.

The app decides automatically: if documents are relevant to the message, it
uses RAG; otherwise it answers from the model's fine-tuned knowledge.

---

## 4. Target Users

| User type | Why they need it |
|-----------|------------------|
| Developers / students | A technical assistant that explains code, planning, and concepts clearly |
| Researchers | Chat with their papers and notes instead of re-reading them |
| Teams / professionals | Ask questions against internal docs, policies, manuals |
| Anyone with lots of documents | Find answers by asking instead of scrolling |

---

## 5. Goals & Objectives

- Deliver a **production-grade** full-stack AI app (not a toy demo).
- Demonstrate **fine-tuning** and **RAG** working together.
- Provide a smooth, ChatGPT-like chat experience with streaming responses.
- Keep the whole app buildable on the **MERN stack** + a model server.

---

## 6. Features

### 6.1 Core (MVP)
- User **authentication** (signup / login).
- **Chat interface** with message history.
- **General chat** powered by the (fine-tuned) model.
- **Rate limiting** to protect the model from abuse.
- **Conversation persistence** in the database.

### 6.2 V2 — Document Intelligence (RAG)
- **Document upload** (PDF, TXT).
- Documents processed, split, embedded, and stored in a **vector database**.
- **RAG-powered answers** grounded in uploaded documents.
- Show **source references** for answers.

### 6.3 V3 — Custom Model & Polish
- Replace stock model with the **fine-tuned technical model**.
- **Streaming responses** (word-by-word, like ChatGPT).
- **Dockerized** and **deployed live** with a public demo link.
- Polished UI + README with architecture diagram.

---

## 7. Out of Scope (for now)

- Mobile native apps (web is responsive instead).
- Voice input / output.
- Multi-language fine-tuning.
- Team/organization workspaces & sharing (possible future work).

---

## 8. Success Metrics

- ✅ End-to-end flow works: frontend → backend → model → response → saved.
- ✅ RAG answers correctly cite uploaded document content.
- ✅ Fine-tuned model noticeably outperforms the stock model on technical tone.
- ✅ App is deployed with a working public demo link.
- ✅ Rate limiting and auth prevent abuse.

---

## 9. Assumptions & Constraints

- The model runs on a **GPU** (local for dev, rented/cloud GPU for production).
- Fine-tuning uses **LoRA/QLoRA** on an open model (Llama/Qwen/Mistral).
- Free-tier infra is used where possible to keep costs low.

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Not enough fine-tuning data | Start with a technically-strong base model; fine-tune lightly |
| GPU cost for hosting | Use small (3B–7B) models; rent GPU by the hour only when needed |
| Scope creep | Build in strict phases (MVP → V2 → V3), each independently demoable |
