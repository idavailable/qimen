/* ============================================================
   奇门遁甲 · Cloudflare Pages Functions 公共库（_lib.js）
   供 /api/interpret、/api/records 复用。
   ============================================================ */
'use strict';

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

module.exports = {
  LIMITS, cors, json, options,
  sseHeaders, sseDelta, sseEvent, SSE_DONE, parseSSEChunk,
  cleanHistory, errMsg, clientIP, rateLimited, saveReading, hashIP,
  SSE_MAX_LINE, SSE_MAX_REPLY
};
