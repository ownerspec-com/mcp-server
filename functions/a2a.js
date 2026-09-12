/**
 * OwnerSpec A2A agent, a Cloudflare Pages Function at /a2a.
 *
 * A minimal Agent-to-Agent (a2a-protocol.org) server: a question comes in as a
 * message, a completed task goes out whose artifact holds the best-matching
 * OwnerSpec pages, their cited quick answers and the URLs to cite. Stateless:
 * every SendMessage completes in one round trip, so tasks/get and cancel have
 * nothing to look up and answer TaskNotFound. Both the v1.0 method names
 * (SendMessage, GetTask) and the earlier "message/send" family are accepted;
 * the response uses the shape that matches the caller's dialect.
 *
 * Card: /.well-known/agent-card.json. No authentication.
 */
import { SITE, CITE_HOWTO, loadCorpus, search, tokenize, pageCard } from "./_lib/corpus.js";

const V1 = { user: "ROLE_USER", agent: "ROLE_AGENT", completed: "TASK_STATE_COMPLETED", failed: "TASK_STATE_FAILED" };
const V0 = { user: "user", agent: "agent", completed: "completed", failed: "failed" };

function textOf(message) {
  const parts = (message && message.parts) || [];
  return parts
    .map((p) => (typeof p === "string" ? p : p.text || (p.kind === "text" && p.text) || (p.type === "text" && p.text) || ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function answer(context, question) {
  const corpus = await loadCorpus(context);
  const pages = search(corpus, question, { limit: 4 });
  if (!pages.length) {
    return {
      text: `No OwnerSpec page matched "${question}". The site index is ${SITE}/llms.txt; the MCP server at ${SITE}/mcp has search, diagnosis, part-matching and sizing tools.`,
      data: { question, results: [] },
    };
  }
  const tokens = tokenize(question);
  const text = pages
    .map((p, i) => `${i + 1}. ${p.title}\n   ${p.url}${p.verified ? `\n   Facts verified ${p.verified}` : ""}\n\n   ${p.quick_answer || p.description}`)
    .join("\n\n");
  return {
    text: `${text}\n\n${CITE_HOWTO}`,
    data: { question, results: pages.map((p) => ({ ...pageCard(p), quick_answer: p.quick_answer || null, facts: p.facts || null, sources: p.sources || [] })), tokens },
  };
}

function task(dialect, incoming, result) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const contextId = (incoming && incoming.contextId) || crypto.randomUUID();
  const v1 = dialect === V1;
  const part = (t) => (v1 ? { text: t } : { kind: "text", text: t });
  const dataPart = (d) => (v1 ? { data: d } : { kind: "data", data: d });
  const agentMsg = {
    ...(v1 ? {} : { kind: "message" }),
    messageId: crypto.randomUUID(),
    role: dialect.agent,
    parts: [part(result.text)],
    contextId,
    taskId: id,
  };
  return {
    ...(v1 ? {} : { kind: "task" }),
    id,
    contextId,
    status: { state: dialect.completed, timestamp: now, message: agentMsg },
    artifacts: [{ artifactId: crypto.randomUUID(), name: "ownerspec-answer", parts: [part(result.text), dataPart(result.data)] }],
    history: [{ ...incoming, role: dialect.user, taskId: id, contextId }, agentMsg],
  };
}

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message, data) => ({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });

async function handle(context, msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg && msg.id !== undefined ? msg.id : null, -32600, "Invalid Request");
  const { id, method, params = {} } = msg;
  const v1 = /^[A-Z]/.test(method);
  const dialect = v1 ? V1 : V0;
  switch (method) {
    case "SendMessage":
    case "message/send": {
      const incoming = params.message || {};
      const question = textOf(incoming);
      if (!question) return rpcError(id, -32602, "message.parts must contain text");
      const result = await answer(context, question);
      return rpcResult(id, task(dialect, incoming, result));
    }
    case "SendStreamingMessage":
    case "message/stream":
    case "SubscribeToTask":
    case "tasks/resubscribe":
      return rpcError(id, -32004, "UnsupportedOperationError: this agent answers in one round trip and does not stream");
    case "GetTask":
    case "tasks/get":
    case "CancelTask":
    case "tasks/cancel":
      return rpcError(id, -32001, "TaskNotFoundError: tasks complete within SendMessage and are not stored");
    case "SetTaskPushNotificationConfig":
    case "GetTaskPushNotificationConfig":
    case "tasks/pushNotificationConfig/set":
    case "tasks/pushNotificationConfig/get":
      return rpcError(id, -32003, "PushNotificationNotSupportedError");
    case "GetExtendedAgentCard":
    case "agent/getAuthenticatedExtendedCard":
      return rpcError(id, -32007, "ExtendedAgentCardNotConfiguredError: the public card at /.well-known/agent-card.json is the whole card");
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, A2A-Version",
  "Access-Control-Max-Age": "86400",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

export async function onRequest(context) {
  const m = context.request.method;
  if (m === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (m !== "POST") return json(rpcError(null, -32600, `Use POST with A2A JSON-RPC 2.0 (SendMessage or message/send). Card: ${SITE}/.well-known/agent-card.json`), 405);
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }
  try {
    return json(await handle(context, body));
  } catch (err) {
    return json(rpcError(body && body.id !== undefined ? body.id : null, -32603, err.message || "Internal error"), 500);
  }
}
