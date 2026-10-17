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

/* F9：D1 留痕挂 ctx.waitUntil——流关闭后 isolate 可能被冻结，裸调用有丢写风险 */
function recordReading(env, ctx, row) {
  const p = L.saveReading(env, row);
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
}

/* ---------- 上游建连（单次尝试；失败一律归 null，不抛） ----------
   2026-10-17：
   · 接 AbortSignal（总超时 + 客户端断开），避免上游挂起时请求无限悬置；
   · BYOK 走 redirect:'manual'——公网地址 302 到内网是 byokBaseOk 字符串校验绕不过去的
     经典 SSRF 路径；手动处理 3xx 并直接判失败。 */
function connectUpstream(prov, model, messages, signal) {
  const opts = {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + prov.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model, messages: messages, stream: true })
  };
  if (signal) opts.signal = signal;
  if (prov.from === 'byok') opts.redirect = 'manual';
  return fetch(prov.base + '/chat/completions', opts)
    .then(r => {
      if (opts.redirect === 'manual' && r.status >= 300 && r.status < 400) return null; // 不跟随跳转
      return r;
    })
    .catch(() => null);
}

/* ---------- 七轮：Gemini 单独策略（家族内依次递推） ----------
   高峰期 Gemini 通道易 503（网关过载），单独给一套策略：
     ① 当前模型：失败即等 10 秒重试，共 2 次（可重试状态：5xx / 429 / 连接失败）；
     ② 仍不通 → 改用**同一家族（Gemini）的其他模型**，依次递推逐个试一次；
     ③ 全族试完仍不通 → 明确报错，**不跨到别家模型**（DeepSeek 等解读风格与本家不一致）。
   全过程用 SSE status / fallback 事件实时回报，前端逐列可见，不让用户干等。
   其它供应商维持「一次即返」的原速失败语义，不引入额外延迟。
   重试间隔可用 QM_RETRY_WAIT_MS 覆盖（默认 10000，测试置 0）。 */
const RETRY_TIMES = 2;
const RETRY_WAIT_MS = 10000;
const RETRY_STATUS = { 408: 1, 425: 1, 429: 1, 500: 1, 502: 1, 503: 1, 504: 1 };
function retriable(resp) { return !resp || !!RETRY_STATUS[resp.status]; }
/* 是否「Gemini 一家」：内置 gemini 供应商，或模型名以 gemini 开头（走自定义中转的 Gemini 也算） */
function isGeminiProv(prov) {
  if (!prov) return false;
  return prov.from === 'gemini' || /^gemini/i.test(String(prov.model || ''));
}
/* 只有 Gemini + 可重试错误才进重试流程；其余供应商维持一次即返 */
function shouldRetry(prov, resp) { return isGeminiProv(prov) && retriable(resp); }
function retryWaitMs(env) {
  const n = parseInt((env && env.QM_RETRY_WAIT_MS), 10);
  return Number.isFinite(n) && n >= 0 ? n : RETRY_WAIT_MS;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
/* 展示名一律走 _lib.modelLabel：gemini-3.8-flash → Gemini 3.8 Flash（状态栏/列头更易读） */
function provLabel(prov) {
  if (!prov) return '上游';
  return prov.label || L.modelLabel(prov.model) || prov.from || '上游';
}
function familyLabel(prov) {
  const f = String((prov && prov.from) || '');
  if (f === 'gemini') return 'Gemini';
  if (f === 'deepseek') return 'DeepSeek';
  return (prov && (prov.label || prov.from)) || '上游';
}
function failText(resp) { return resp ? ('HTTP ' + resp.status) : '连接失败'; }

/* 剥完 HTML 标签的上游错误详情（五轮修：不把整页 markup 透传给前端） */
async function upstreamDetail(resp) {
  try {
    return String(await resp.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  } catch (e) { return ''; }
}
async function upstreamErrorResponse(resp) {
  if (!resp) return L.errMsg('上游连接失败', 502);
  /* 上游原始错误体只进服务端日志，不回传浏览器：中转站/网关在 401/500 时回显
     Authorization 或 key 的情况确实存在，透传等于把服务端密钥交出去。
     前端只需状态码即可提示重试。 */
  const detail = await upstreamDetail(resp);
  if (detail) console.error('[qimen] 上游 HTTP ' + resp.status + ' 详情:', detail);
  return L.errMsg('上游 HTTP ' + resp.status + '，请稍后重试', resp.status === 401 ? 401 : 502);
}

async function handle(request, env, ctx) {
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
  if (prov && prov.invalid === 'byok_base') return L.errMsg('自带接口地址不合法：仅允许公网 http(s) 地址（禁内网/回环）', 400);
  if (!prov) return L.errMsg('服务端未配置模型密钥，且请求未携带 base/model/key', 400);

  const history = L.cleanHistory(body.history);
  const question = typeof body.question === 'string' ? body.question.slice(0, L.LIMITS.question) : '';

  /* 上游总超时与客户端断开（2026-10-17）：
     fetch 在 Workers 里没有默认超时，上游「不返回也不断开」会让请求无限悬置；
     客户端关页面后也要立刻掐掉上游，否则重试与流式读取仍在烧 token。 */
  const timeoutMs = Math.max(1000, parseInt(env.QM_LLM_TIMEOUT_MS || '120000', 10) || 120000);
  const abortCtl = new AbortController();
  let timedOut = false, clientGone = false;
  const timer = setTimeout(() => { timedOut = true; abortCtl.abort(); }, timeoutMs);
  /* Node 测试环境：定时器会把事件循环挂住 120s；Workers 的 setTimeout 返回数字，无 unref */
  if (timer && typeof timer.unref === 'function') timer.unref();
  if (request.signal) {
    const onClientAbort = () => { clientGone = true; abortCtl.abort(); };
    if (request.signal.aborted) onClientAbort();
    else request.signal.addEventListener('abort', onClientAbort, { once: true });
  }
  const cleanup = () => { clearTimeout(timer); };

  /* 系统提示词：以服务端为准（前端也传一份做兜底，取服务端 SYSTEM_PROMPT 常量） */
  const SYS = (env && env.QM_SYSTEM_PROMPT) || SYSTEM_PROMPT;
  const messages = [{ role: 'system', content: SYS }, { role: 'user', content: pan }];
  /* F15：追问历史的 user 消息里夹着与本次完全相同的盘面全文（前端每轮都把 pan 入历史），
     同一盘重复入模既多耗 token 又可能干扰——剔重，只留上方首轮那一份 */
  history.forEach(m => { if (m.role === 'user' && m.content === pan) return; messages.push(m); });
  if (question) messages.push({ role: 'user', content: question });

  const t0 = Date.now();
  const ipHash = await L.hashIP(ip);

  /* 首次建连：成功、或「不需要重试的失败」都在此定型——
     后者（401/400/403、非 Gemini 的 503、连接失败…）仍以原 HTTP 状态码直返，
     不引入任何等待，既有契约与响应速度不变。 */
  let up = await connectUpstream(prov, prov.model, messages, abortCtl.signal);
  let usedProv = prov;
  if (!(up && up.ok) && !shouldRetry(prov, up)) { cleanup(); return upstreamErrorResponse(up); }

  const dec = new TextDecoder();
  let reader = null, buf = '', full = '', cut = null, connected = false;
  const usedModel = () => usedProv.model || prov.model;

  const stream = new ReadableStream({
    async pull(ctrl) {
      /* ① 建连阶段：首次即可重试失败 →
             当前模型重试 2 次（间隔 10 秒）→ 同族（Gemini）其他模型依次递推逐个试一次 */
      if (!(up && up.ok)) {
        const notice = s => { try { ctrl.enqueue(L.sseEvent(s)); } catch (e) { } };
        const tried = [prov.model];   /* 已投过的模型：当前模型打头 */
        const fam = familyLabel(prov);
        for (let i = 1; i <= RETRY_TIMES; i++) {
          notice({ status: provLabel(prov) + ' 通道繁忙（' + failText(up) + '），' + Math.round(retryWaitMs(env) / 1000) + ' 秒后重试（' + i + '/' + RETRY_TIMES + '）' });
          await sleep(retryWaitMs(env));
          if (abortCtl.signal.aborted) break;   // 总超时或客户端已断开，不再耗时重试
          up = await connectUpstream(prov, prov.model, messages, abortCtl.signal);
          if (up && up.ok) break;
          if (!retriable(up)) break; /* 变成硬错误（如 401）就不再耗时间 */
        }
        /* 同族递推：换模型即换实例，逐个立即试一次，不再各等 10 秒（否则干等翻倍） */
        while (!(up && up.ok) && retriable(up) && !abortCtl.signal.aborted) {
          const fb = L.fallbackProvider(env, prov, tried);
          if (!fb) break;
          tried.push(fb.model);
          notice({ status: provLabel(prov) + ' 仍不可用，改用同族 ' + L.modelLabel(fb.model) + ' 作答…' });
          up = await connectUpstream(fb, fb.model, messages, abortCtl.signal);
          if (up && up.ok) { usedProv = fb; notice({ fallback: fb.label }); break; }
        }
        if (!(up && up.ok)) {
          const nSib = tried.length - 1;
          notice({ error: '上游 ' + failText(up) + '：' + provLabel(prov) + ' 重试 ' + RETRY_TIMES + ' 次' +
            (nSib ? '、同族 ' + nSib + ' 个模型依次递推' : '') + '后仍不可用（本策略只在 ' + fam + ' 家族内递推，不跨用别家模型）' });
          try { ctrl.enqueue(L.SSE_DONE); } catch (e) { }
          ctrl.close();
          cleanup();
          return;
        }
      }

      /* ② 内容类型分流：非流式兜底一次性回传，流式则取 reader 逐片转发 */
      if (!connected) {
        connected = true;
        const ct = String(up.headers.get('content-type') || '').toLowerCase();
        if (ct.indexOf('text/event-stream') < 0) {
          let text = '';
          try {
            const d = await up.json();
            const c = d.choices && d.choices[0];
            text = (c && c.message && c.message.content) || '';
          } catch (e) { }
          text = L.stripThinking(text);
          if (!text) {
            ctrl.enqueue(L.sseEvent({ error: '上游返回为空' }));
            ctrl.enqueue(L.SSE_DONE);
            ctrl.close();
            cleanup();
            return;
          }
          ctrl.enqueue(L.sseDelta(text));
          ctrl.enqueue(L.SSE_DONE);
          ctrl.close();
          cleanup();
          recordReading(env, ctx, {
            created_at: new Date().toISOString(), cat: body.cat || '', pillars: body.pillars || '',
            pan, question, answer: text.slice(0, 20000), model: usedModel(), ipHash, ms: Date.now() - t0
          });
          return;
        }
        reader = up.body.getReader();
      }

      /* ③ 流式转发（原语义不变：有增量就回一片并让出，触发下一次 pull） */
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
        cleanup();
        try { await reader.cancel(); } catch (e) { }
        recordReading(env, ctx, {
          created_at: new Date().toISOString(), cat: body.cat || '', pillars: body.pillars || '',
          pan, question, answer: L.stripThinking(full).slice(0, 20000), model: usedModel(), ipHash, ms: Date.now() - t0
        });
        return;
      }
    },
    cancel() { cleanup(); if (reader) { try { reader.cancel(); } catch (e) { } } }
  });
  return new Response(stream, { status: 200, headers: L.sseHeaders() });
}

/* ---- Pages Functions 路由（ESM 导出；CommonJS module.exports 不会被识别为路由） ---- */
export async function onRequestPost(ctx) { return L.route(ctx.request, handle(ctx.request, ctx.env, ctx), ctx.env); }
export async function onRequestOptions(ctx) { return L.route(ctx.request, L.options(), ctx.env); }
export { handle };
export { retriable, shouldRetry, isGeminiProv, RETRY_TIMES, RETRY_WAIT_MS };
