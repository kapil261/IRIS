const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { streamChat } = require('../services/llm.service');

/** Flatten LangChain message content (string or content-part array) to plain text. */
function messageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('');
  }
  return '';
}

/** Convert stored `{ role, content }` messages to LangChain messages. */
function toLangChainMessages(history, { maxChars } = {}) {
  return history.map((msg) => {
    let content = msg.content || '';
    if (maxChars && content.length > maxChars) {
      content = `${content.slice(0, maxChars)}\n…[truncated]`;
    }
    return msg.role === 'user' ? new HumanMessage(content) : new AIMessage(content);
  });
}

/** Emit a progress status to the client via LangGraph's `custom` stream mode. */
function emitStatus(config, status) {
  if (config && typeof config.writer === 'function') {
    config.writer({ status });
  }
}

/**
 * Run the Mistral→Groq fallback chain and accumulate the streamed chunks into the final
 * text. `config` is threaded through so LangGraph's `messages` stream mode still sees every
 * token as it comes off the underlying model, even though this function awaits the whole thing.
 */
async function generateAnswer(messages, config, options) {
  let text = '';
  for await (const chunk of streamChat(messages, config, options)) {
    text += messageText(chunk.content);
  }
  return text;
}

module.exports = {
  messageText,
  toLangChainMessages,
  emitStatus,
  generateAnswer,
  streamChat
};
