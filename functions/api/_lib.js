/* ============================================================
   奇门遁甲 · Cloudflare Pages Functions 公共库（_lib.js）
   供 /api/interpret、/api/records 复用。
   ============================================================ */

/* ---------- 入模规模上限（对齐 public/interpret.js LIMITS） ---------- */
const LIMITS = { panText: 6000, historyTurns: 8, perMessage: 2000, question: 500 };

/* ---------- CORS ---------- */
const ALLOW_ORIGIN = '*'; // 纯静态站点 + 无鉴权，允许任意来源；如需收紧改成指定域名
function cors(extra) {
  return Object.assign({
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Access-Code',
    'Access-Control-Max-Age': '86400'
  }, extra || {});
}
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: cors({ 'Content-Type': 'application/json; charset=utf-8' })
  });
}
function options() { return new Response(null, { status: 204, headers: cors() }); }

/* ---------- SSE 构造（统一格式，前端 parseSSEChunk 可直接解析） ---------- */
function sseHeaders() {
  return cors({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
}
const enc = new TextEncoder();
function sseDelta(text) {
  return enc.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n');
}
function sseEvent(obj) {
  return enc.encode('data: ' + JSON.stringify(obj) + '\n\n');
}
const SSE_DONE = enc.encode('data: [DONE]\n\n');

/* ---------- 上游 SSE 行解析（与前端 parseSSEChunk 同语义） ---------- */
const SSE_MAX_LINE = 1000000;
const SSE_MAX_REPLY = 200000;
function parseSSEChunk(buf, full) {
  if (buf.length > SSE_MAX_LINE) return { buf, full, cut: 'LINE_OVERFLOW' };
  let cut = null, idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (line.indexOf('data:') !== 0) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const j = JSON.parse(data);
      const c = j.choices && j.choices[0];
      const d = c && c.delta;
      if (d && d.content) full += d.content;
      else if (c && c.message && c.message.content) full += c.message.content;
    } catch (e) { /* 忽略无法解析的分片 */ }
  }
  if (full.length > SSE_MAX_REPLY) cut = 'REPLY_OVERFLOW';
  return { buf, full, cut };
}

/* ---------- 入参校验 ---------- */
function cleanHistory(history) {
  const out = [];
  if (!Array.isArray(history)) return out;
  history.slice(-LIMITS.historyTurns).forEach(m => {
    if (!m) return;
    if (m.role !== 'user' && m.role !== 'assistant') return; // 拒绝伪 system 注入
    if (typeof m.content !== 'string' || !m.content) return;
    out.push({ role: m.role, content: m.content.slice(0, LIMITS.perMessage) });
  });
  return out;
}
function errMsg(msg, status) { return json({ error: String(msg) }, status || 400); }

/* ---------- IP（仅用于限流与留痕，不做指纹存储原文） ---------- */
function clientIP(request) {
  return (request.headers && request.headers.get('CF-Connecting-IP')) || 'unknown';
}

/* ---------- 限流（软开关：未设 RATE_LIMIT_PER_MIN 或为 0 → 不限流） ---------- */
const buckets = new Map();
function rateLimited(env, ip) {
  const n = parseInt((env && env.RATE_LIMIT_PER_MIN) || '0', 10);
  if (!n || n <= 0) return false;
  const minute = Math.floor(Date.now() / 60000);
  const key = ip + ':' + minute;
  const c = (buckets.get(key) || 0) + 1;
  buckets.set(key, c);
  /* 顺手清理过期桶，避免 Map 无界增长 */
  if (buckets.size > 5000) {
    for (const k of buckets.keys()) {
      if (parseInt(k.split(':')[1], 10) < minute) buckets.delete(k);
    }
  }
  return c > n;
}

/* ---------- 供应商解析（models.js 与 interpret.js 共用同一口径） ----------
   ① BYOK：请求自带 base/model/key
   ② 自定义 provider：CUSTOM_PROVIDERS（JSON 数组）+ <ID大写>_API_KEY，按模型名匹配
   ③ 内置：model 以 gemini 开头 → Google；以 deepseek 开头 → DeepSeek
   ④ 兜底：QM_PROVIDER 指定 / 任一已配密钥 / 通用 QM_API_KEY
   密钥只存在服务端，不下发浏览器。 */
function customProviders(env) {
  if (!env || !env.CUSTOM_PROVIDERS) return [];
  let arr;
  try { arr = JSON.parse(env.CUSTOM_PROVIDERS); } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.filter(p => p && p.id && p.base && Array.isArray(p.models) && p.models.length);
}
function customKeyEnv(id) {
  return String(id).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
}
function customProviderWarnings(env) {
  const w = [];
  if (env && env.CUSTOM_PROVIDERS) {
    let arr = null;
    try { arr = JSON.parse(env.CUSTOM_PROVIDERS); } catch (e) { w.push('CUSTOM_PROVIDERS 不是合法 JSON'); }
    if (arr && !Array.isArray(arr)) w.push('CUSTOM_PROVIDERS 需为数组');
    (customProviders(env) || []).forEach(p => {
      if (!env[customKeyEnv(p.id)]) w.push('自定义供应商 ' + p.id + ' 未配置密钥 ' + customKeyEnv(p.id));
    });
  }
  return w;
}
function norm(base) { return String(base || '').replace(/\/+$/, ''); }
function resolveProvider(env, body) {
  env = env || {}; body = body || {};
  /* ① BYOK */
  if (body.base && body.key && body.model) {
    return { base: norm(body.base), model: String(body.model), key: String(body.key), from: 'byok' };
  }
  const m = body.model ? String(body.model) : '';
  /* ② 自定义 provider（按模型名匹配） */
  for (const p of customProviders(env)) {
    if (m && p.models.indexOf(m) >= 0 && env[customKeyEnv(p.id)]) {
      return { base: norm(p.base), model: m, key: env[customKeyEnv(p.id)], from: p.id };
    }
  }
  /* ③ 内置（按模型名前缀） */
  if (/^gemini/i.test(m) && env.GEMINI_API_KEY) {
    return {
      base: norm(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'),
      model: m, key: env.GEMINI_API_KEY, from: 'gemini'
    };
  }
  if (/^deepseek/i.test(m) && env.DEEPSEEK_API_KEY) {
    return {
      base: norm(env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'),
      model: m, key: env.DEEPSEEK_API_KEY, from: 'deepseek'
    };
  }
  /* ④ 兜底：默认 provider → 任一已配 → 通用 QM_* */
  const def = String(env.QM_PROVIDER || 'deepseek').toLowerCase();
  if (def === 'gemini' && env.GEMINI_API_KEY) {
    return {
      base: norm(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'),
      model: env.GEMINI_MODEL || m || 'gemini-3.8-flash', key: env.GEMINI_API_KEY, from: 'gemini'
    };
  }
  if (env.DEEPSEEK_API_KEY) {
    return {
      base: norm(env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'),
      model: env.DEEPSEEK_MODEL || m || 'deepseek-flash', key: env.DEEPSEEK_API_KEY, from: 'deepseek'
    };
  }
  if (env.GEMINI_API_KEY) {
    return {
      base: norm(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'),
      model: env.GEMINI_MODEL || m || 'gemini-3.8-flash', key: env.GEMINI_API_KEY, from: 'gemini'
    };
  }
  if (env.QM_API_KEY) {
    return { base: norm(env.QM_BASE_URL || 'https://api.deepseek.com/v1'), model: env.QM_MODEL || m || 'deepseek-chat', key: env.QM_API_KEY, from: 'server' };
  }
  return null;
}

/* ---------- D1 留痕（失败不影响主流程） ---------- */
async function saveReading(env, row) {
  try {
    if (!env || !env.QM_DB) return;
    await env.QM_DB.prepare(
      'INSERT INTO readings (created_at, cat, pillars, pan, question, answer, model, ip_hash, ms) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(
      row.created_at, row.cat || '', row.pillars || '', row.pan || '',
      row.question || '', row.answer || '', row.model || '', row.ipHash || '', row.ms || 0
    ).run();
  } catch (e) { /* 写库失败不回传错误，避免掩盖解读结果 */ }
}
/* 简单哈希：不落原文 IP */
async function hashIP(ip) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode('qimen:' + ip));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch (e) { return 'na'; }
}

export { LIMITS };
export { cors };
export { json };
export { options };
export { sseHeaders };
export { sseDelta };
export { sseEvent };
export { SSE_DONE };
export { parseSSEChunk };
export { cleanHistory };
export { errMsg };
export { clientIP };
export { rateLimited };
export { saveReading };
export { hashIP };
export { SSE_MAX_LINE };
export { SSE_MAX_REPLY };
export { customProviders };
export { customKeyEnv };
export { customProviderWarnings };
export { resolveProvider };