/* ============================================================
   奇门遁甲 · Cloudflare Pages Functions 公共库（_lib.js）
   供 /api/interpret、/api/records 复用。
   ============================================================ */

/* ---------- 入模规模上限（F20：与 public/interpret.js LIMITS 口径统一） ---------- */
const LIMITS = { panText: 4000, historyTurns: 8, perMessage: 2000, question: 500 };

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
      /* 六轮：只取最终答复字段。reasoning_content / reasoning / thinking 是模型的思考链，
         显式丢弃——不得混进解读正文（正文里若带  thinking 标签，再由 stripThinking 兜底剔除）。 */
      if (d && typeof d.content === 'string' && d.content) full += d.content;
      else if (c && c.message && typeof c.message.content === 'string' && c.message.content) full += c.message.content;
    } catch (e) { /* 忽略无法解析的分片 */ }
  }
  if (full.length > SSE_MAX_REPLY) cut = 'REPLY_OVERFLOW';
  return { buf, full, cut };
}

/* ---------- 思考链剥离（六轮） ----------
   上游把思考过程直接写进 content 的（` thinking…<｜end▁of▁thinking｜>` 等）在此剔干净；
   流式进行中标签可能尚未闭合——此时从起始标签到末尾一并丢弃，宁可晚出内容也不漏思考。 */
const THINK_TAG = /<(think|thinking|reasoning|analysis)>/i;
function stripThinking(text) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/<(?:think|thinking|reasoning|analysis)>[\s\S]*?<\/(?:think|thinking|reasoning|analysis)>/gi, '');
  const open = s.match(/<(?:think|thinking|reasoning|analysis)>[\s\S]*$/i);
  if (open) s = s.slice(0, open.index);
  return s;
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

/* ---------- 内置模型清单（models.js 与同族回落链共用同一份，避免两处漂移） ---------- */
const BUILTIN_MODELS = [
  { id: 'gemini-3.6-flash', pv: 'Google' },
  { id: 'gemini-3.8-flash', pv: 'Google' },
  { id: 'deepseek-flash', pv: 'DeepSeek' },
  { id: 'deepseek-v4-pro', pv: 'DeepSeek' }
];

/* 模型 id → 展示名：gemini-3.6-flash → Gemini 3.6 Flash；deepseek-v4-pro → DeepSeek V4 Pro */
function modelLabel(id) {
  const s = String(id || '');
  const fam = /^deepseek/i.test(s) ? 'DeepSeek' : (/^gemini/i.test(s) ? 'Gemini' : '');
  if (!fam) return s;
  return fam + s.replace(/^[a-z]+/i, '').split('-').filter(Boolean)
    .map(t => ' ' + t.charAt(0).toUpperCase() + t.slice(1)).join('');
}

/* 同一供应商（家族）下的模型序列 —— 「依次递推」的候选池。
   gemini / deepseek 取内置清单（可用 QM_GEMINI_MODELS / QM_DEEPSEEK_MODELS 逗号分隔覆盖，
   书写顺序即递推顺序），自定义 provider 取其 models；环境指定的默认模型一律提到最前。
   BYOK 无法枚举同族模型 → 空表：宁可报错，也不凭空编模型名（必然上游 400）。 */
function familyModels(env, from) {
  env = env || {};
  const fam = String(from || '');
  const overrideKey = fam === 'gemini' ? 'QM_GEMINI_MODELS' : (fam === 'deepseek' ? 'QM_DEEPSEEK_MODELS' : '');
  let list = [];
  if (overrideKey && env[overrideKey]) {
    list = String(env[overrideKey]).split(',').map(s => s.trim()).filter(Boolean);
  } else if (fam === 'gemini' || fam === 'deepseek') {
    list = BUILTIN_MODELS.filter(m => m.id.indexOf(fam) === 0).map(m => m.id);
  } else {
    const p = customProviders(env).filter(x => x.id === fam)[0];
    if (p) list = p.models.map(String);
  }
  const def = fam === 'gemini' ? env.GEMINI_MODEL : (fam === 'deepseek' ? env.DEEPSEEK_MODEL : '');
  if (def) list.unshift(String(def));
  const seen = new Set();
  return list.filter(m => { if (seen.has(m)) return false; seen.add(m); return true; });
}
/* F11：BYOK base 校验——仅公网 http(s)，禁回环/内网/保留地址，堵住借服务端 fetch 探测内网的 SSRF 面 */
function byokBaseOk(base) {
  try {
    const u = new URL(String(base));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '::1' || h === '[::1]') return false;
    if (h.endsWith('.internal') || h.endsWith('.local') || h.endsWith('.localhost') || h.endsWith('.lan')) return false;
    const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) {
      const a = +v4[1], b = +v4[2];
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 169 && b === 254) return false;
      if (a >= 224) return false; /* 组播/保留段 */
    }
    return true;
  } catch (e) { return false; }
}
function resolveProvider(env, body) {
  env = env || {}; body = body || {};
  /* ① BYOK */
  if (body.base && body.key && body.model) {
    if (!byokBaseOk(body.base)) return { invalid: 'byok_base' };
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
  /* F3：回落到别家供应商时必须换用该家的模型名——把 gemini 的模型名原样发给 deepseek 必然上游 400 */
  const def = String(env.QM_PROVIDER || 'deepseek').toLowerCase();
  if (def === 'gemini' && env.GEMINI_API_KEY) {
    return {
      base: norm(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'),
      model: env.GEMINI_MODEL || (/^gemini/i.test(m) ? m : 'gemini-3.8-flash'), key: env.GEMINI_API_KEY, from: 'gemini'
    };
  }
  if (env.DEEPSEEK_API_KEY) {
    return {
      base: norm(env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'),
      model: env.DEEPSEEK_MODEL || (/^deepseek/i.test(m) ? m : 'deepseek-flash'), key: env.DEEPSEEK_API_KEY, from: 'deepseek'
    };
  }
  if (env.GEMINI_API_KEY) {
    return {
      base: norm(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'),
      model: env.GEMINI_MODEL || (/^gemini/i.test(m) ? m : 'gemini-3.8-flash'), key: env.GEMINI_API_KEY, from: 'gemini'
    };
  }
  if (env.QM_API_KEY) {
    return { base: norm(env.QM_BASE_URL || 'https://api.deepseek.com/v1'), model: env.QM_MODEL || m || 'deepseek-chat', key: env.QM_API_KEY, from: 'server' };
  }
  return null;
}

/* ---------- 同族回落（七轮：不再跨到别家，只在**同一供应商的其它模型**间依次递推） ----------
   六轮原实现是「Gemini 挂了就改投 DeepSeek 作答」——换家族等于换解读风格，与用户所选不一致；
   七轮改为家族内递推：当前模型重试耗尽 → 同族下一个模型 → 再下一个……全部试过仍不通才报错。
   · tried：已尝试过的模型名（调用方传入，含当前模型），避免对同一模型反复投递；
   · 递推沿用本家 base/key，只换模型名（跨家族换名才会必然上游 400，见 F3）；
   · BYOK 无同族清单 → null（不编造模型名）。 */
function fallbackProvider(env, current, tried) {
  env = env || {};
  const cur = current || {};
  const fam = String(cur.from || '');
  const done = new Set((tried || []).map(String));
  if (cur.model) done.add(String(cur.model));
  const next = familyModels(env, fam).filter(m => !done.has(m))[0];
  if (!next) return null;
  return { base: cur.base, model: next, key: cur.key, from: fam, label: modelLabel(next) };
}
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
export { stripThinking };
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
export { fallbackProvider };
export { familyModels };
export { modelLabel };
export { BUILTIN_MODELS };
export { byokBaseOk };