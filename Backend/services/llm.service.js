/**
 * LLM provider setup: Mistral (primary) with an automatic Groq fallback.
 *
 * `.withFallbacks()` isn't used here on purpose: ChatMistralAI/ChatGroq don't actually make
 * their HTTP request until the returned stream is iterated, so by the time a request fails,
 * `.withFallbacks()`'s try/catch around the call that *produced* the stream has already
 * exited and can't catch it. Instead `streamChat()` is a custom async generator that pulls
 * just the FIRST chunk of each candidate's stream inside its own try/catch — that's where
 * the request actually fires and can fail — before committing to that model for the rest
 * of the response. `config` (the LangGraph run config) is threaded into every `.stream()`
 * call so token-level events still reach LangGraph's `messages` stream mode.
 *
 * Two resilience rules on top of the ordered fallback:
 *   - A model that fails permanently (bad API key, model not found) is skipped for a while
 *     instead of being retried on every call.
 *   - If every model is rate-limited, wait for the provider's suggested retry time (up to
 *     RATE_LIMIT_MAX_WAIT_MS) once, telling the client via the run's status stream.
 */
const { ChatMistralAI } = require('@langchain/mistralai');
const { ChatGroq } = require('@langchain/groq');

const MISTRAL_MODEL = 'mistral-large-latest';
const MISTRAL_FAST_MODEL = 'mistral-small-latest';

// Tried in order after Mistral. The first two are what was asked for explicitly; the rest are
// models confirmed reachable on this Groq key, kept as a further safety net.
const GROQ_FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
];
// Extra capacity for tool-calling agents only: Groq rate limits are per model, and this one
// calls tools well, but it can emit raw <think> text so it isn't used for streamed replies.
const GROQ_TOOL_EXTRA_MODELS = ['qwen/qwen3.8-27b'];

const UNAVAILABLE_SKIP_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_WAIT_MS = 45 * 1000;

const unavailableUntil = new Map(); // "provider:model" → timestamp

function mistralAvailable() {
  return !!process.env.MISTRAL_API_KEY;
}

function groqAvailable() {
  return !!process.env.IRIS_API_KEY;
}

const keyOf = (model) => `${model.constructor.name}:${model.model || model.modelName}`;

function buildCandidates({ temperature = 0.2, maxTokens = 4096, fast = false, tools = false } = {}) {
  const candidates = [];

  if (mistralAvailable()) {
    candidates.push(new ChatMistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
      model: fast ? MISTRAL_FAST_MODEL : MISTRAL_MODEL,
      temperature,
      maxTokens,
      maxRetries: 0
    }));
  }

  if (groqAvailable()) {
    const groqModels = tools ? [...GROQ_FALLBACK_MODELS, ...GROQ_TOOL_EXTRA_MODELS] : GROQ_FALLBACK_MODELS;
    for (const model of groqModels) {
      candidates.push(new ChatGroq({
        apiKey: process.env.IRIS_API_KEY,
        model,
        temperature,
        maxTokens,
        maxRetries: 0
      }));
    }
  }

  if (candidates.length === 0) {
    throw new Error('No LLM provider configured. Set MISTRAL_API_KEY and/or IRIS_API_KEY (Groq) in .env');
  }

  // Skip models that recently failed permanently — unless that would leave nothing to try.
  const now = Date.now();
  const usable = candidates.filter((m) => (unavailableUntil.get(keyOf(m)) || 0) <= now);
  return usable.length ? usable : candidates;
}

const statusOf = (err) => err?.status ?? err?.statusCode ?? err?.response?.status;

/** Bad key / no access / unknown model: retrying won't help for a while. */
function isPermanentFailure(err) {
  return [401, 403, 404].includes(statusOf(err)) ||
    /status 401|invalid api key|model_not_found|does not exist or you do not have access/i.test(err?.message || '');
}

/** Milliseconds the provider asked us to wait, or null if this isn't a rate-limit error. */
function rateLimitDelay(err) {
  const msg = err?.message || '';
  if (statusOf(err) !== 429 && !/\b429\b|rate.?limit/i.test(msg)) return null;
  const m = /try again in (?:(\d+)m)?([\d.]+)s/i.exec(msg);
  return m ? Math.ceil(((Number(m[1]) || 0) * 60 + parseFloat(m[2])) * 1000) : 10000;
}

function recordFailure(model, err, context) {
  const label = keyOf(model).replace(':', '(') + ')';
  if (isPermanentFailure(err)) {
    unavailableUntil.set(keyOf(model), Date.now() + UNAVAILABLE_SKIP_MS);
    console.error(`[llm] ${label}${context} unavailable (${err.message.slice(0, 120)}), skipping it for 10 min`);
  } else {
    console.error(`[llm] ${label}${context} failed, trying next provider:`, err.message.slice(0, 200));
  }
}

/** When every candidate failed: wait out a short rate limit once, or give up. */
async function waitIfAllRateLimited(errors, config, attempt) {
  if (attempt > 0 || !errors.length || config?.signal?.aborted) return false;
  const delays = errors.map(rateLimitDelay);
  if (delays.some((d) => d === null)) return false; // at least one non-rate-limit failure
  const wait = Math.min(...delays);
  if (wait > RATE_LIMIT_MAX_WAIT_MS) return false;

  const seconds = Math.ceil(wait / 1000);
  config?.writer?.({ status: `AI provider rate limit reached — retrying in ${seconds}s…` });
  console.warn(`[llm] All providers rate-limited; waiting ${seconds}s before one retry`);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, wait + 500);
    config?.signal?.addEventListener?.('abort', () => { clearTimeout(timer); reject(config.signal.reason || new Error('aborted')); }, { once: true });
  });
  return true;
}

/**
 * Try each candidate model in order. A candidate is only committed to once its stream
 * yields a first chunk without throwing; any earlier failure (auth, rate limit, network,
 * model not found) moves on to the next one. Yields the underlying AIMessageChunk objects.
 */
async function* streamChat(messages, config, options = {}) {
  for (let attempt = 0; ; attempt++) {
    const errors = [];
    for (const model of buildCandidates(options)) {
      let started = false;
      try {
        const stream = await model.stream(messages, config);
        const iterator = stream[Symbol.asyncIterator]();
        const first = await iterator.next();
        if (first.done) continue; // empty stream, try the next candidate

        started = true;
        yield first.value;
        let next = await iterator.next();
        while (!next.done) {
          yield next.value;
          next = await iterator.next();
        }
        return; // this candidate completed the whole response
      } catch (err) {
        if (started || config?.signal?.aborted) throw err; // mid-stream failure: can't switch models
        recordFailure(model, err, '');
        errors.push(err);
      }
    }
    if (!(await waitIfAllRateLimited(errors, config, attempt))) {
      throw errors[errors.length - 1] || new Error('All LLM providers failed');
    }
  }
}

/**
 * Non-streaming call with tools bound (for tool-using agents like the Code Reviewer).
 * Same provider order as streamChat plus extra tool-capable models; here the request fires
 * inside `invoke`, so a plain try/catch per candidate is enough to fall through.
 * Returns the AIMessage (check `.tool_calls`).
 */
async function invokeWithTools(messages, tools, config, options = {}) {
  for (let attempt = 0; ; attempt++) {
    const errors = [];
    for (const model of buildCandidates({ ...options, tools: true })) {
      try {
        return await model.bindTools(tools).invoke(messages, config);
      } catch (err) {
        if (config?.signal?.aborted) throw err;
        recordFailure(model, err, ' (tools)');
        errors.push(err);
      }
    }
    if (!(await waitIfAllRateLimited(errors, config, attempt))) {
      throw errors[errors.length - 1] || new Error('All LLM providers failed');
    }
  }
}

module.exports = {
  streamChat,
  invokeWithTools
};
