/**
 * End-to-end integration test against the real Express app (real MongoDB, real
 * Mistral/Groq fallback, real local embeddings + Pinecone). No test framework is installed
 * in this project, so this is a standalone runnable script:
 *
 *   node test/integration.test.js
 *
 * It prints PASS/FAIL per assertion and exits non-zero if anything failed.
 */
require('dotenv').config({ quiet: true });
process.env.EMAIL_ENABLED = 'false'; // never send real email from tests
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../src/app');
const mongoose = require('mongoose');

const PORT = 4177;
const BASE = `http://localhost:${PORT}`;

let passCount = 0;
let failCount = 0;
function check(label, cond, extra) {
  if (cond) {
    passCount++;
    console.log(`  PASS  ${label}`);
  } else {
    failCount++;
    console.log(`  FAIL  ${label}${extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 300) : ''}`);
  }
}

async function json(method, urlPath, body, token) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  return { status: res.status, data };
}

/** Consume an SSE stream and return { events, content, sources }. */
async function sse(urlPath, body, token) {
  const res = await fetch(BASE + urlPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return { status: res.status, error: errBody, events: [], content: '', sources: [] };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let content = '';
  let sources = [];
  const events = [];
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith('data: ')) continue;
      const text = line.slice(6).trim();
      if (text === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(text);
        events.push(parsed.type);
        if (parsed.type === 'content') content += parsed.content;
        if (parsed.type === 'sources') sources = parsed.sources;
      } catch (e) { /* ignore parse errors on partial lines */ }
    }
  }
  return { status: res.status, events, content, sources };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const server = app.listen(PORT);
  console.log(`Test server listening on ${PORT}\n`);

  try {
    // ── 1. Auth: signup / login / me ──────────────────────────────────────
    console.log('== Auth ==');
    const email = `iris_itest_${Date.now()}@example.com`;
    const password = 'TestPass123!';

    const signup = await json('POST', '/api/auth/signup', { name: 'Integration Test', email, password });
    check('signup returns 201 + token', signup.status === 201 && !!signup.data?.token, signup);
    const signupToken = signup.data?.token;

    const login = await json('POST', '/api/auth/login', { email, password });
    check('login returns 200 + token', login.status === 200 && !!login.data?.token, login);
    const token = login.data?.token || signupToken;

    const me = await json('GET', '/api/auth/me', null, token);
    check('GET /api/auth/me returns the same email', me.status === 200 && me.data?.user?.email === email, me);

    const badLogin = await json('POST', '/api/auth/login', { email, password: 'wrong' });
    check('login with wrong password is rejected', badLogin.status === 400, badLogin);

    const authConfig = await json('GET', '/api/auth/config');
    check('GET /api/auth/config exposes the Google client id', authConfig.status === 200 && 'googleClientId' in (authConfig.data || {}), authConfig);

    const forgedGoogle = await json('POST', '/api/auth/google', { credential: 'not-a-real-google-id-token' });
    check('forged Google credential is rejected', [401, 503].includes(forgedGoogle.status), forgedGoogle);

    // ── 2. Plain chat agent ────────────────────────────────────────────────
    console.log('\n== Chat agent (POST /api/chat/message) ==');
    const chatThread = `itest_chat_${Date.now()}`;
    const chat = await sse('/api/chat/message', { threadid: chatThread, message: 'Reply with exactly one word: pong' }, token);
    check('chat stream has no error event', !chat.events.includes('error'), chat.events);
    check('chat stream produced content', chat.content.trim().length > 0, chat);

    // ── Agents keep separate conversations ─────────────────────────────────
    console.log('\n== One agent per conversation ==');
    const crossPost = await sse('/api/docs/message', { threadid: chatThread, message: 'hello from docs' }, token);
    check('posting a Chat thread to the Docs agent is rejected (409)', crossPost.status === 409, crossPost);
    const crossMentor = await sse('/api/mentor/message', { threadid: chatThread, message: 'I want to build a blog' }, token);
    check('posting a Chat thread to the Mentor agent is rejected (409)', crossMentor.status === 409, crossMentor);

    let threads = (await json('GET', '/api/chats', null, token)).data || [];
    const chatThreadDoc = threads.find((t) => t.threadid === chatThread);
    check('thread list tags the thread with agent "chat"', chatThreadDoc?.agent === 'chat', chatThreadDoc);

    const sneakyUpdate = await json('PUT', `/api/chat/${chatThreadDoc?._id}`, { title: 'Renamed chat', useDocuments: true, mentorMode: true }, token);
    threads = (await json('GET', '/api/chats', null, token)).data || [];
    const afterUpdate = threads.find((t) => t.threadid === chatThread);
    check("rename works but cannot change the thread's agent", sneakyUpdate.status === 200 && afterUpdate?.title === 'Renamed chat' && afterUpdate?.agent === 'chat', afterUpdate);

    // ── 3. Mentor agent: multi-turn roadmap flow ────────────────────────────
    console.log('\n== Mentor agent (POST /api/mentor/message, GET /api/mentor/state/:id) ==');
    const mentorThread = `itest_mentor_${Date.now()}`;

    const noStateYet = await json('GET', `/api/mentor/state/${mentorThread}`, null, token);
    check('mentor state 404s before any message', noStateYet.status === 404, noStateYet);

    const plan = await sse('/api/mentor/message', {
      threadid: mentorThread,
      message: 'I want to build a simple URL shortener with Node.js and Express'
    }, token);
    check('planning turn has no error event', !plan.events.includes('error'), plan.events);

    let state = (await json('GET', `/api/mentor/state/${mentorThread}`, null, token)).data;
    check('roadmap created (phase=building)', state?.phase === 'building', state);
    check('roadmap has at least one task with files', state?.roadmap?.length > 0 && state.roadmap[0].files.length > 0, state);
    const totalFiles = state?.progress?.total || 0;
    check('progress starts at 0 done', state?.progress?.done === 0, state?.progress);

    // "don't advance yet" turn — a question should NOT move the roadmap pointer.
    const question = await sse('/api/mentor/message', {
      threadid: mentorThread,
      message: 'Why do we need Express for this instead of raw Node http?'
    }, token);
    check('question turn has no error event', !question.events.includes('error'), question.events);
    state = (await json('GET', `/api/mentor/state/${mentorThread}`, null, token)).data;
    check('question turn does not advance progress', state?.progress?.done === 0, state?.progress);

    // "advance" turn — should generate file #1 and move the pointer.
    const advance1 = await sse('/api/mentor/message', { threadid: mentorThread, message: 'next' }, token);
    check('advance turn #1 has no error event', !advance1.events.includes('error'), advance1.events);
    check('advance turn #1 mentions the file it built', /📍|File/.test(advance1.content), advance1.content.slice(0, 200));
    state = (await json('GET', `/api/mentor/state/${mentorThread}`, null, token)).data;
    check('progress advances to 1 done after "next"', state?.progress?.done === 1, state?.progress);

    // Code Creator → Code Reviewer: every generated file is reviewed in the same turn.
    check('reply includes the Code Reviewer section', /Code Reviewer/.test(advance1.content), advance1.content.slice(-400));
    const firstFile = state?.roadmap?.flatMap((t) => t.files).find((f) => f.status === 'done');
    check('generated file has a review status', ['passed', 'fixed', 'issues'].includes(firstFile?.reviewStatus), firstFile);

    // Error report → Code Reviewer investigates; the roadmap pointer must not move.
    const errorTurn = await sse('/api/mentor/message', {
      threadid: mentorThread,
      message: `I'm getting an error when I use ${firstFile?.path}: it fails with "Unexpected token" — please fix it`
    }, token);
    check('error report has no error event', !errorTurn.events.includes('error'), errorTurn.events);
    check('error report is handled by the Code Reviewer', /Error investigation/i.test(errorTurn.content), errorTurn.content.slice(0, 300));
    state = (await json('GET', `/api/mentor/state/${mentorThread}`, null, token)).data;
    check('error report does not advance progress', state?.progress?.done === 1, state?.progress);

    if (totalFiles > 1) {
      const advance2 = await sse('/api/mentor/message', { threadid: mentorThread, message: 'continue' }, token);
      check('advance turn #2 has no error event', !advance2.events.includes('error'), advance2.events);
      state = (await json('GET', `/api/mentor/state/${mentorThread}`, null, token)).data;
      check('progress advances to 2 done after "continue"', state?.progress?.done === 2, state?.progress);

      const reviewAll = await sse('/api/mentor/message', { threadid: mentorThread, message: 'Review all the files generated so far and fix any issues.' }, token);
      check('"review all" has no error event', !reviewAll.events.includes('error'), reviewAll.events);
      check('"review all" returns a code review', /Code review/i.test(reviewAll.content), reviewAll.content.slice(0, 300));
      state = (await json('GET', `/api/mentor/state/${mentorThread}`, null, token)).data;
      const reviewed = state?.roadmap?.flatMap((t) => t.files).filter((f) => f.status === 'done');
      check('both generated files carry a review status', reviewed?.length === 2 && reviewed.every((f) => ['passed', 'fixed', 'issues'].includes(f.reviewStatus)), reviewed);
    } else {
      console.log('  SKIP  advance turn #2 (roadmap only has 1 file)');
    }

    // ── 4. Documents: upload → ready → ask → delete ─────────────────────────
    console.log('\n== Documents (txt + pdf upload / failure reason / delete) ==');
    const { UPLOAD_ROOT } = require('../services/storage.service');

    const uploadFile = async (buffer, filename, type) => {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type }), filename);
      const res = await fetch(`${BASE}/api/documents/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      return { status: res.status, data: await res.json().catch(() => null) };
    };
    const waitForDoc = async (id, timeoutMs = 90000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const found = ((await json('GET', '/api/documents', null, token)).data || []).find((d) => d._id === id);
        if (found && found.status !== 'processing') return found;
        await new Promise((r) => setTimeout(r, 2000));
      }
      return { status: 'timeout' };
    };

    // txt
    const txtUpload = await uploadFile(Buffer.from('IRIS integration test fixture. The secret code word is PINEAPPLE42. '.repeat(20)), 'fixture.txt', 'text/plain');
    check('txt upload returns 202 + document id', txtUpload.status === 202 && !!txtUpload.data?.document?._id, txtUpload);
    const txtDoc = await waitForDoc(txtUpload.data?.document?._id);
    check('txt document reaches "ready"', txtDoc.status === 'ready', txtDoc);
    const txtPath = txtDoc.storageKey && path.join(UPLOAD_ROOT, txtDoc.storageKey);
    check('original file is kept in uploads/<userId>/', !!txtPath && fs.existsSync(txtPath) && txtDoc.storageKey.startsWith(String(me.data?.user?._id)), txtDoc.storageKey);

    if (txtDoc.status === 'ready') {
      const docsThread = `itest_docs_${Date.now()}`;
      const docsAnswer = await sse('/api/docs/message', { threadid: docsThread, message: 'What is the secret code word in my document?' }, token);
      check('docs stream has no error event', !docsAnswer.events.includes('error'), docsAnswer.events);
      check('docs stream returned sources', docsAnswer.sources.length > 0, docsAnswer.sources);
      check('docs answer mentions the secret code word', /PINEAPPLE42/i.test(docsAnswer.content), docsAnswer.content.slice(0, 300));

      // A whole-document question has no words in common with the content — it must still work.
      const summary = await sse('/api/docs/message', { threadid: docsThread, message: 'Summarize my document' }, token);
      check('"summarize my document" uses the document (sources returned)', summary.sources.length > 0, summary.sources);
      check('"summarize my document" does not claim nothing was found', !/couldn'?t find/i.test(summary.content), summary.content.slice(0, 300));
    }

    // pdf (multi-page, real file)
    const samplePdf = path.join(UPLOAD_ROOT, '1784128157507_report_final.pdf');
    let pdfDoc = null;
    if (fs.existsSync(samplePdf)) {
      const pdfUpload = await uploadFile(fs.readFileSync(samplePdf), 'report final (test).pdf', 'application/pdf');
      check('pdf upload returns 202', pdfUpload.status === 202, pdfUpload);
      pdfDoc = await waitForDoc(pdfUpload.data?.document?._id, 180000);
      check('pdf document reaches "ready" with many chunks', pdfDoc.status === 'ready' && pdfDoc.chunkCount > 10, { status: pdfDoc.status, chunkCount: pdfDoc.chunkCount, errorMessage: pdfDoc.errorMessage });
      check('stored filename is sanitised (no spaces/parentheses)', !!pdfDoc.storageKey && !/[ ()]/.test(pdfDoc.storageKey), pdfDoc.storageKey);
    } else {
      console.log('  SKIP  pdf upload (sample PDF not present in uploads/)');
    }

    // failure reason is reported
    const emptyUpload = await uploadFile(Buffer.from('   \n  '), 'empty.txt', 'text/plain');
    const emptyDoc = await waitForDoc(emptyUpload.data?.document?._id);
    check('empty file fails with a readable reason', emptyDoc.status === 'failed' && /empty/i.test(emptyDoc.errorMessage || ''), emptyDoc);

    const badType = await uploadFile(Buffer.from('x'), 'notes.docx', 'application/octet-stream');
    check('unsupported file type is rejected with 400 + JSON message', badType.status === 400 && /pdf|txt/i.test(badType.data?.message || ''), badType);

    // delete removes record, vectors and the stored file
    for (const doc of [txtDoc, pdfDoc, emptyDoc].filter((d) => d && d._id)) {
      const del = await json('DELETE', `/api/documents/${doc._id}`, null, token);
      check(`delete ${doc.filename} returns 200`, del.status === 200, del);
      if (doc.storageKey) check(`stored file for ${doc.filename} is removed`, !fs.existsSync(path.join(UPLOAD_ROOT, doc.storageKey)), doc.storageKey);
    }
    const listAfter = (await json('GET', '/api/documents', null, token)).data || [];
    check('no documents listed after deletes', listAfter.length === 0, listAfter);
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log(`\n${passCount} passed, ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Integration test crashed:', err);
  process.exit(1);
});
