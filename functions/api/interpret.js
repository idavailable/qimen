/* ============================================================
   奇门遁甲 · /api/interpret —— 服务端流式解读代理
   密钥来源（由 _lib.resolveProvider 统一解析）：
     ① 服务端配置：secret GEMINI_API_KEY / DEEPSEEK_API_KEY / QM_API_KEY
     ② 自定义 provider：CUSTOM_PROVIDERS + <ID大写>_API_KEY（后台加，无需改代码）
     ③ 自带密钥 BYOK：请求体带 base / model / key
   统一以 SSE 增量回传（格式与前端 parseSSEChunk 兼容），完成后写 D1。
   ============================================================ */
import * as L from './_lib.js';
import SYSTEM_PROMPT from './prompt.js';

/* 供应商选择统一在 _lib.resolveProvider（与 /api/models 同一口径）：
   BYOK → 自定义 provider → 按模型名前缀（gemini/deepseek）→ 默认 provider 兜底。
   密钥一律只存在服务端（secret），不下发浏览器。 */
function pickProvider(env, body) {
  return L.resolveProvider(env, body);
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return L.options();

  let body;
  try { body = await request.json(); } catch (e) { return L.errMsg('请求体不是合法 JSON'); }
  if (!body || typeof body !== 'object') return L.errMsg('请求体为空');

  const pan = typeof body.pan === 'string' ? body.pan : '';
  if (!pan.trim()) return L.errMsg('缺少盘面（pan）');
  if (pan.length > L.LIMITS.panText) return L.errMsg('盘面过长（上限 ' + L.LIMITS.panText + ' 字）');

  const ip = L.clientIP(request);
  if (L.rateLimited(env, ip)) return L.errMsg('请求过于频繁，请稍后再试', 429);

  const prov = pickProvider(env, body);
  if (!prov) return L.errMsg('服务端未配置模型密钥，且请求未携带 base/model/key', 400);

  const history = L.cleanHistory(body.history);
  const question = typeof body.question === 'string' ? body.question.slice(0, L.LIMITS.question) : '';

  /* 系统提示词：以服务端为准（前端也传一份做兜底，取服务端 SYSTEM_PROMPT 常量） */
  const SYS = (env && env.QM_SYSTEM_PROMPT) || SYSTEM_PROMPT;
  const messages = [{ role: 'system', content: SYS }, { role: 'user', content: pan }];
  history.forEach(m => messages.push(m));
  if (question) messages.push({ role: 'user', content: question });

  const t0 = Date.now();
  const upstream = await fetch(prov.base + '/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + prov.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: prov.model, messages, stream: true })
  }).catch(e => null);

  if (!upstream) return L.errMsg('上游连接失败', 502);
  if (!upstream.ok) {
    let detail = '';
    try { detail = String(await upstream.text()).slice(0, 300); } catch (e) { }
    return L.errMsg('上游 HTTP ' + upstream.status + (detail ? ' ' + detail : ''), upstream.status === 401 ? 401 : 502);
  }

  const ct = String(upstream.headers.get('content-type') || '').toLowerCase();
  const ipHash = await L.hashIP(ip);

  /* ---- 非流式兜底：一次性回传 ---- */
  if (ct.indexOf('text/event-stream') < 0) {
    let text = '';
    try {
      const d = await upstream.json();
      const c = d.choices && d.choices[0];
      text = (c && c.message && c.message.content) || '';
    } catch (e) { }
    if (!text) return L.errMsg('上游返回为空', 502);
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(L.sseDelta(text));
        ctrl.enqueue(L.SSE_DONE);
        ctrl.close();
      }
    });
    L.saveReading(env, {
      created_at: new Date().toISOString(), cat: body.cat || '', pillars: body.pillars || '',
      pan, question, answer: text.slice(0, 4000), model: prov.model, ipHash, ms: Date.now() - t0
    });
    return new Response(stream, { status: 200, headers: L.sseHeaders() });
  }

  /* ---- 流式转发 ---- */
  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '', cut = null;
  const stream = new ReadableStream({
    async pull(ctrl) {
      while (true) {
        let r;
        try { r = await reader.read(); } catch (e) { cut = cut || 'UPSTREAM_ERROR'; break; }
        if (r.done) { cut = 'DONE'; break; }
        buf += dec.decode(r.value, { stream: true });
        const before = full;
        const st = L.parseSSEChunk(buf, full);
        buf = st.buf; full = st.full;
        if (st.cut) { cut = st.cut; break; }
        if (full.length > before.length) { ctrl.enqueue(L.sseDelta(full.slice(before.length))); return; }
      }
      /* 收尾：先送已收到的部分，再送 done */
      if (cut) {
        if (cut !== 'DONE') ctrl.enqueue(L.sseEvent({ warn: cut }));
        ctrl.enqueue(L.SSE_DONE);
        ctrl.close();
        try { await reader.cancel(); } catch (e) { }
        L.saveReading(env, {
          created_at: new Date().toISOString(), cat: body.cat || '', pillars: body.pillars || '',
          pan, question, answer: full.slice(0, 4000), model: prov.model, ipHash, ms: Date.now() - t0
        });
        return;
      }
    },
    cancel() { try { reader.cancel(); } catch (e) { } }
  });
  return new Response(stream, { status: 200, headers: L.sseHeaders() });
}

/* ---- Pages Functions 路由（ESM 导出；CommonJS module.exports 不会被识别为路由） ---- */
export async function onRequestPost(ctx) { return handle(ctx.request, ctx.env); }
export async function onRequestOptions() { return L.options(); }
export { handle };
