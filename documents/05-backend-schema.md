# Backend Schema Document

**Project:** InsightAI
**Version:** 1.0
**Date:** 2026-07-02
**Database:** MongoDB (via Mongoose)

---

## 1. Overview

The backend uses **MongoDB** for application data (users, conversations,
messages, documents) and a **Vector DB** (Chroma/Pinecone) for embeddings.
This document defines the MongoDB collections, their fields, relationships, and
the REST API contract.

---

## 2. Entity Relationship (conceptual)

```
User (1) ──────< (many) Conversation (1) ──────< (many) Message
  │
  └──────< (many) Document ──────< (many) Chunk vectors [stored in Vector DB]
```

- One **User** has many **Conversations** and many **Documents**.
- One **Conversation** has many **Messages**.
- One **Document** produces many **chunk vectors** (kept in the Vector DB, keyed
  by `documentId`).

---

## 3. Collections

### 3.1 `users`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Primary key |
| `name` | String | Display name |
| `email` | String | Unique, indexed |
| `passwordHash` | String | bcrypt hash |
| `role` | String | `"user"` \| `"admin"` (default `user`) |
| `plan` | String | `"free"` \| `"pro"` (for rate-limit tiers) |
| `createdAt` | Date | |
| `updatedAt` | Date | |

```js
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  plan: { type: String, enum: ["free", "pro"], default: "free" },
}, { timestamps: true });
```

---

### 3.2 `conversations`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId → users | Owner, indexed |
| `title` | String | Auto-generated from first message |
| `useDocuments` | Boolean | Docs mode on/off for this conversation |
| `createdAt` | Date | |
| `updatedAt` | Date | |

```js
const conversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, default: "New Chat" },
  useDocuments: { type: Boolean, default: false },
}, { timestamps: true });
```

---

### 3.3 `messages`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Primary key |
| `conversationId` | ObjectId → conversations | Indexed |
| `userId` | ObjectId → users | For ownership checks |
| `role` | String | `"user"` \| `"assistant"` \| `"system"` |
| `content` | String | Message text |
| `sources` | Array | Optional: doc chunks used (for RAG answers) |
| `tokensUsed` | Number | Optional analytics |
| `createdAt` | Date | |

```js
const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  sources: [{ documentId: Schema.Types.ObjectId, chunkText: String, score: Number }],
  tokensUsed: { type: Number, default: 0 },
}, { timestamps: true });
```

---

### 3.4 `documents`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId → users | Owner, indexed |
| `filename` | String | Original file name |
| `fileType` | String | `pdf` \| `txt` |
| `status` | String | `"processing"` \| `"ready"` \| `"failed"` |
| `chunkCount` | Number | Number of chunks embedded |
| `vectorNamespace` | String | Key linking to vectors in the Vector DB |
| `createdAt` | Date | |

```js
const documentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  filename: { type: String, required: true },
  fileType: { type: String, enum: ["pdf", "txt"], required: true },
  status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
  chunkCount: { type: Number, default: 0 },
  vectorNamespace: { type: String, required: true },
}, { timestamps: true });
```

---

## 4. Vector DB Records (Chroma/Pinecone)

Not in MongoDB — stored in the vector database:

| Field | Description |
|-------|-------------|
| `id` | Unique chunk id |
| `embedding` | The vector (e.g. 384/768 dims) |
| `metadata.userId` | Owner (for filtering) |
| `metadata.documentId` | Parent document |
| `metadata.text` | The original chunk text |
| `metadata.chunkIndex` | Position in the document |

Retrieval always filters by `userId` so users only see their own data.

---

## 5. REST API Contract

### Auth
```
POST /api/auth/signup   { name, email, password }        → { token, user }
POST /api/auth/login    { email, password }               → { token, user }
```

### Conversations
```
GET    /api/conversations                          → [ conversation ]
POST   /api/conversations   { title? }             → conversation
DELETE /api/conversations/:id                      → { success }
GET    /api/conversations/:id/messages             → [ message ]
```

### Chat
```
POST /api/chat  { conversationId, message, useDocuments } → streamed reply
      (protected + rate-limited)
```

### Documents
```
POST   /api/documents/upload   (multipart file)    → document
GET    /api/documents                              → [ document ]
DELETE /api/documents/:id                          → { success }  (also deletes vectors)
```

---

## 6. Indexes

- `users.email` — unique.
- `conversations.userId` — list a user's chats fast.
- `messages.conversationId` — load a conversation's messages fast.
- `documents.userId` — list a user's documents fast.

---

## 7. Security Rules

- Every protected route verifies **JWT** and derives `userId` from it.
- All queries are **scoped to `userId`** — no cross-user data access.
- Passwords stored only as **bcrypt hashes**.
- File uploads validated by type and size before processing.
