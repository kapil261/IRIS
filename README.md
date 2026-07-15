# IRIS v2.0 ⚡ — The Intelligent RAG-Driven Pair Programmer

IRIS v2.0 is a premium, full-stack MERN conversational AI companion engineered for high-performance pair programming, document grounding, and real-time response generation. Combining local semantic search and high-speed cloud inference, IRIS offers a fully integrated, state-of-the-art developer workspace.

---

## 🌟 Key Features

### 🔒 1. Secure User Authentication
- **Scoped Chat Environments**: Users have isolated threads, documents, and chat settings.
- **Robust Encryption**: Session security via JSON Web Tokens (JWT) and `bcryptjs` password hashing.
- **Protected Routing**: Seamless route guard redirection on Vite and Axios interceptors for authenticated API requests.

### 📚 2. Local Document Grounding - RAG
- **Local Vectors Pipeline**: Document parsing (PDF & Plain Text) utilizing `@xenova/transformers` (`all-MiniLM-L6-v2` model) running completely offline on your CPU/GPU, eliminating API fees.
- **Fast Similarity Search**: Real-time cosine similarity search to fetch context-relevant snippets.
- **Source Citations**: AI replies include interactive citation cards detailing filenames, context matches, and similarity scores.

### ⚡ 3. Real-Time Word-by-Word Streaming
- **Server-Sent Events (SSE)**: Word-by-word streaming backend implementation via Express to push token updates progressively.
- **Auth-Enabled Fetch Stream Reader**: Frontend stream consumer that reads streamed chunk data in real-time, removing loaders on first-word delivery.
- **Pulsing Thinking Indicator**: Sleek loader animation during initial token loading.

### 🧠 4. Dynamic Personas & Command
.
- **Chat-Based Learning**: Issue a slash command in the chat to dynamically append new facts, developer credits, or custom behaviors on-the-fly without restarting the application!

### 🎨 5. Premium UI/UX Design System
- **Light/Dark Theme Switcher**: Toggle theme instantly via CSS custom properties mapping with zero layout regressions.
- **Markdown & Code Block Utilities**: Complete code syntax highlighting with a one-click copy helper.
- **Collapsible Layout**: Fully responsive sidebars, empty states, and dynamic status badges.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React (Vite), SCSS, Lucide Icons, ReactMarkdown, Prism Syntax Highlighter |
| **Backend** | Node.js, Express, Mongoose, JWT, Multer, PDF-Parse |
| **Database** | MongoDB |
| **AI Models** | Groq Cloud (`llama-3.3-70b-versatile`), Transformers.js (`all-MiniLM-L6-v2` ONNX) |

---

## 📂 Project Architecture

```
IRIS2.0/
├── Backend/                 # Express Server & AI Pipeline
│   ├── config/              # Database connect & custom_instructions.json
│   ├── controllers/         # Auth, Chats, Messages, and RAG controllers
│   ├── middleware/          # JWT authorization route guards
│   ├── models/              # User, History, Message, Document, Chunk schemas
│   ├── routes/              # Express API endpoints
│   ├── services/            # rag.service.js (Embedding & Extraction)
│   └── utils/               # response.js (Groq SDK configurations)
│
├── Frontend/                # Vite + React Dashboard
│   ├── src/
│   │   ├── features/
│   │   │   ├── components/  # Sidebar, ChatArea, DocumentPanel
│   │   │   ├── Hooks/       # UseMessage Hook
│   │   │   ├── services/    # api client, auth, document, and message services
│   │   │   └── style/       # SCSS stylesheets and responsive structures
│   │   └── ...
│   └── ...
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB database)
- Groq Cloud API Key (configured in environment)

---

### 1. Server Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Backend` folder:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_signing_key
   IRIS_API_KEY=your_groq_api_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

---

### 2. Client Setup

1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser at `http://localhost:5173`.

---

## 💡 How to Use the Customizer & `/learn` Command

1. Ask IRIS a question like:
   > *"Who is Kapil Goyal?"*
2. IRIS will answer according to its current rules.
3. Teach IRIS on-the-fly:
   > */learn Kapil Goyal is the lead software architect who built IRIS v2.0.*
4. IRIS will confirm it has learned the fact.
5. Re-ask the question:
   > *"Who is Kapil Goyal?"*
6. IRIS will now output the learned answer using the dynamically updated registry.

---

## 📝 License
Created by **Kapil Goyal**. Free to use for reference and personal portfolios.
