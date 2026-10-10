/* ============================================================
   奇门遁甲 · /api/saves —— 盘面存档（云端）
   POST {label?, pillars?, params:{date,time,lon,clock,zi,ji,cat,q}} → 存档，返回 id
   GET  ?limit=50              → 最近存档列表（含 params，前端读档重排）
   DELETE ?id=123              → 删除单条
   params 白名单过滤 + JSON 尺寸守卫；IP 只存 SHA-256 前 16 位。
   ============================================================ */
import * as L from './_lib.js';

const PARAM_KEYS = ['date', 'time', 'lon', 'clock', 'zi', 'ji', 'cat', 'q'];
const MAX_PARAMS = 2048;

function cleanParams(p) {
  if (!p || typeof p !== 'object') return null;
  const o = {};
  for (const k of PARAM_KEYS) {
    const v = p[k];
    if (v === undefined || v === null || v === '') continue;
    o[k] = String(v).slice(0, 200);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date || '') || !/^\d{2}:\d{2}/.test(o.time || '')) return null;
  return o;
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return L.options();
  if (!env || !env.QM_DB) return L.errMsg('未绑定 D1（QM_DB）', 500);

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return L.errMsg('请求体不是合法 JSON', 400); }
    const params = cleanParams(body && body.params);
    if (!params) return L.errMsg('params 缺少合法的 date/time（YYYY-MM-DD / HH:MM）', 400);
    const label = String((body && body.label) || '').slice(0, 60) || (params.date + ' ' + params.time);
    const pillars = String((body && body.pillars) || '').slice(0, 120);
    const ps = JSON.stringify(params);
    if (ps.length > MAX_PARAMS) return L.errMsg('params 超长', 400);
    const ipHash = await L.hashIP(request);
    const rs = await env.QM_DB.prepare(
      'INSERT INTO saves (created_at, label, pillars, params, ip_hash) VALUES (?, ?, ?, ?, ?)'
    ).bind(new Date().toISOString().replace('T', ' ').slice(0, 19), label, pillars, ps, ipHash).run();
    return L.json({ ok: true, id: rs.meta && rs.meta.last_row_id });
  }

  if (request.method === 'GET') {
    const limit = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('limit') || '50', 10), 1), 100);
    const rs = await env.QM_DB.prepare(
      'SELECT id, created_at, label, pillars, params FROM saves ORDER BY id DESC LIMIT ?'
    ).bind(limit).all();
    const total = await env.QM_DB.prepare('SELECT COUNT(*) AS n FROM saves').first();
    const saves = (rs.results || []).map(r => {
      let params = null;
      try { params = JSON.parse(r.params); } catch (e) { /* 脏数据置空 */ }
      return { id: r.id, created_at: r.created_at, label: r.label, pillars: r.pillars, params };
    });
    return L.json({ saves, total: (total && total.n) || 0 });
  }

  if (request.method === 'DELETE') {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return L.errMsg('缺少 id', 400);
    await env.QM_DB.prepare('DELETE FROM saves WHERE id=?').bind(Number(id)).run();
    return L.json({ ok: true, deleted: Number(id) });
  }

  return L.errMsg('不支持的方法', 405);
}

/* ---- Pages Functions 路由（ESM 导出） ---- */
export async function onRequest(ctx) { return handle(ctx.request, ctx.env); }
export { handle };
