/**
 * Doc Agent (LangGraph StateGraph) — stateless.
 *
 * Serves both plain chat and document-grounded (RAG) answers from one graph: the very first
 * edge decides whether to retrieve at all, based on the `useDocuments` flag the caller passes
 * in (routes/chat.routes.js forces it false, routes/docs.routes.js forces it true, and the
 * legacy /api/message route passes the thread's saved flag).
 *
 *   START ──useDocuments?──┬─ no ─▶ answer_direct ──────────────────────────────▶ END
 *                          │
 *                          └─ yes ─▶ rewrite_query ─▶ retrieve ─┬─▶ answer_with_context ─▶ END
 *                                                                ├─▶ answer_no_context ─────▶ END
 *                                                                └─▶ answer_no_documents ────▶ END
 */
const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const {
  retrieveContext,
  formatDocsForPrompt,
  docsToSources
} = require('../services/rag.service');
const {
  getIdentityPrompt,
  CHAT_SYSTEM_PROMPT,
  QUERY_REWRITE_PROMPT,
  DOC_SYSTEM_PROMPT,
  DOC_NO_CONTEXT_PROMPT,
  NO_DOCUMENTS_MESSAGE
} = require('../services/prompts');
const { streamChat } = require('../services/llm.service');
const { messageText, toLangChainMessages, emitStatus, generateAnswer } = require('./utils');

const CHAT_HISTORY_WINDOW = 12;
const DOC_HISTORY_WINDOW = 8;
const REWRITE_HISTORY_WINDOW = 6;

const DocAgentState = Annotation.Root({
  userId: Annotation(),
  question: Annotation(),
  history: Annotation(),
  useDocuments: Annotation(),
  searchQuery: Annotation(),
  hasDocuments: Annotation(),
  documents: Annotation(),
  sources: Annotation(),
  documentNames: Annotation(), // the user's ready documents, for the "nothing relevant" reply
  answer: Annotation()
});

function routeByDocsFlag(state) {
  return state.useDocuments ? 'retrieveBranch' : 'answer_direct';
}

async function answerDirect(state, config) {
  emitStatus(config, 'Thinking…');
  const messages = [
    new SystemMessage(getIdentityPrompt() + '\n' + CHAT_SYSTEM_PROMPT),
    ...toLangChainMessages(state.history.slice(-CHAT_HISTORY_WINDOW)),
    new HumanMessage(state.question)
  ];
  const answer = await generateAnswer(messages, config);
  return { answer };
}

/** Turn a follow-up ("what about page 3?") into a standalone search query. */
async function rewriteQuery(state, config) {
  if (!state.history.length) return { searchQuery: state.question };

  emitStatus(config, 'Understanding your question…');
  try {
    const transcript = state.history
      .slice(-REWRITE_HISTORY_WINDOW)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${(m.content || '').slice(0, 800)}`)
      .join('\n');
    const messages = [
      new SystemMessage(QUERY_REWRITE_PROMPT),
      new HumanMessage(`Conversation:\n${transcript}\n\nFollow-up question: ${state.question}\n\nStandalone search query:`)
    ];
    let rewritten = '';
    for await (const chunk of streamChat(messages, config, { fast: true, maxTokens: 128 })) {
      rewritten += messageText(chunk.content);
    }
    rewritten = rewritten.replace(/<think>[\s\S]*?<\/think>/g, '').trim().replace(/^["']|["']$/g, '');
    return { searchQuery: rewritten || state.question };
  } catch (err) {
    console.error('[doc_agent] Query rewrite failed, using original question:', err.message);
    return { searchQuery: state.question };
  }
}

async function retrieve(state, config) {
  emitStatus(config, 'Searching your documents…');

  // Small knowledge base → all chunks; "summarize my doc" → sampled chunks; otherwise similarity.
  const { documents, strategy, readyDocs } = await retrieveContext(state.userId, {
    question: state.question,
    searchQuery: state.searchQuery
  });
  if (!readyDocs.length) return { hasDocuments: false, documents: [], sources: [], documentNames: [] };

  if (strategy === 'overview' || strategy === 'all') emitStatus(config, 'Reading your documents…');
  return {
    hasDocuments: true,
    documents,
    sources: docsToSources(documents),
    documentNames: readyDocs.map((d) => d.filename)
  };
}

function routeAfterRetrieve(state) {
  if (!state.hasDocuments) return 'answer_no_documents';
  return state.documents.length > 0 ? 'answer_with_context' : 'answer_no_context';
}

async function answerWithContext(state, config) {
  const count = state.documents.length;
  emitStatus(config, `Reading ${count} relevant passage${count === 1 ? '' : 's'}…`);

  const context = formatDocsForPrompt(state.documents);
  const system = getIdentityPrompt() + '\n' + DOC_SYSTEM_PROMPT.replace('{context}', () => context);
  const messages = [
    new SystemMessage(system),
    ...toLangChainMessages(state.history.slice(-DOC_HISTORY_WINDOW), { maxChars: 2000 }),
    new HumanMessage(state.question)
  ];
  const answer = await generateAnswer(messages, config);
  return { answer };
}

async function answerNoContext(state, config) {
  emitStatus(config, 'No matching passages found…');
  const names = (state.documentNames || []).map((n) => `- ${n}`).join('\n') || '- (none)';
  const messages = [
    new SystemMessage(getIdentityPrompt() + '\n' + DOC_NO_CONTEXT_PROMPT.replace('{documents}', () => names)),
    ...toLangChainMessages(state.history.slice(-DOC_HISTORY_WINDOW), { maxChars: 2000 }),
    new HumanMessage(state.question)
  ];
  const answer = await generateAnswer(messages, config);
  return { answer };
}

async function answerNoDocuments() {
  return { answer: NO_DOCUMENTS_MESSAGE };
}

const graph = new StateGraph(DocAgentState)
  .addNode('answer_direct', answerDirect)
  .addNode('rewrite_query', rewriteQuery)
  .addNode('retrieve', retrieve)
  .addNode('answer_with_context', answerWithContext)
  .addNode('answer_no_context', answerNoContext)
  .addNode('answer_no_documents', answerNoDocuments)
  .addConditionalEdges(START, routeByDocsFlag, {
    answer_direct: 'answer_direct',
    retrieveBranch: 'rewrite_query'
  })
  .addEdge('answer_direct', END)
  .addEdge('rewrite_query', 'retrieve')
  .addConditionalEdges('retrieve', routeAfterRetrieve, ['answer_with_context', 'answer_no_context', 'answer_no_documents'])
  .addEdge('answer_with_context', END)
  .addEdge('answer_no_context', END)
  .addEdge('answer_no_documents', END)
  .compile();

const STREAMING_NODES = new Set(['answer_direct', 'answer_with_context', 'answer_no_context']);

/**
 * Run the graph and yield client-facing events:
 *   { type: 'status',  status }
 *   { type: 'sources', sources }
 *   { type: 'token',   content }
 *   { type: 'done',    answer }
 */
async function* runDocAgent({ userId, question, history, useDocuments, signal }) {
  const stream = await graph.stream(
    { userId, question, history, useDocuments: !!useDocuments, documents: [], sources: [] },
    { streamMode: ['messages', 'updates', 'custom'], signal }
  );

  let streamed = '';
  let finalAnswer = '';

  for await (const [mode, data] of stream) {
    if (mode === 'messages') {
      const [chunk, metadata] = data;
      if (!STREAMING_NODES.has(metadata?.langgraph_node)) continue;
      const text = messageText(chunk.content);
      if (text) {
        streamed += text;
        yield { type: 'token', content: text };
      }
    } else if (mode === 'custom') {
      if (data?.status) yield { type: 'status', status: data.status };
    } else if (mode === 'updates') {
      for (const update of Object.values(data || {})) {
        if (!update) continue;
        if (update.sources && update.sources.length) yield { type: 'sources', sources: update.sources };
        if (typeof update.answer === 'string') finalAnswer = update.answer;
      }
    }
  }

  if (!streamed && finalAnswer) {
    streamed = finalAnswer;
    yield { type: 'token', content: finalAnswer };
  }

  yield { type: 'done', answer: finalAnswer || streamed };
}

module.exports = { graph, runDocAgent };
