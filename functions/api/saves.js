/* ============================================================
   奇门遁甲 · /api/saves —— 盘面存档（云端）
   POST {label?, pillars?, params:{date,time,lon,clock,zi,ji,cat,q}} → 存档，返回 id
   GET  ?limit=50              → 本网络（ip_hash）最近存档列表
   GET  ?all=1&code=xxx        → 全量列表（需与 ACCESS_CODE 一致；未设则禁止）
   DELETE ?id=123              → 删除单条（仅本网络自己的存档）
   DELETE ?id=123&code=xxx     → 管理口令可删任意条
   params 白名单过滤 + JSON 尺寸守卫；IP 只存 SHA-256 前 16 位。
   F5：列表/删除均按 ip_hash 隔离——不再全站公开可读可删。
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
  /* F17：时间须为真实存在的 HH:MM（旧正则放行 99:99） */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date || '') || !/^([01]\d|2[0-3]):[0-5]\d/.test(o.time || '')) return null;
  return o;
}

function isAdmin(env, sp) {
  return !!(env && env.ACCESS_CODE && sp.get('code') === env.ACCESS_CODE);
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return L.options();
  if (!env || !env.QM_DB) return L.errMsg('未绑定 D1（QM_DB）', 500);

  /* F10：限流覆盖到存档接口（此前仅 /api/interpret，POST 可无限刷库） */
  const ip = L.clientIP(request);
  if (L.rateLimited(env, ip)) return L.errMsg('请求过于频繁，请稍后再试', 429);
  const ipHash = await L.hashIP(ip); /* 修正：旧版误传 request 对象，所有行哈希相同 */
  const sp = new URL(request.url).searchParams;

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return L.errMsg('请求体不是合法 JSON', 400); }
    const params = cleanParams(body && body.params);
    if (!params) return L.errMsg('params 缺少合法的 date/time（YYYY-MM-DD / HH:MM）', 400);
    const label = String((body && body.label) || '').slice(0, 60) || (params.date + ' ' + params.time);
    const pillars = String((body && body.pillars) || '').slice(0, 120);
    const ps = JSON.stringify(params);
    if (ps.length > MAX_PARAMS) return L.errMsg('params 超长', 400);
    const rs = await env.QM_DB.prepare(
      'INSERT INTO saves (created_at, label, pillars, params, ip_hash) VALUES (?, ?, ?, ?, ?)'
    ).bind(new Date().toISOString().replace('T', ' ').slice(0, 19), label, pillars, ps, ipHash).run();
    return L.json({ ok: true, id: rs.meta && rs.meta.last_row_id });
  }

  if (request.method === 'GET') {
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10), 1), 100);
    /* F5：默认只回本网络的存档；全量需管理口令 */
    const all = sp.get('all') === '1';
    if (all && !env.ACCESS_CODE) return L.errMsg('未设置 ACCESS_CODE，禁止全量查询', 403);
    if (all && !isAdmin(env, sp)) return L.errMsg('口令错误', 401);
    const rs = all
      ? await env.QM_DB.prepare(
          'SELECT id, created_at, label, pillars, params FROM saves ORDER BY id DESC LIMIT ?'
        ).bind(limit).all()
      : await env.QM_DB.prepare(
          'SELECT id, created_at, label, pillars, params FROM saves WHERE ip_hash=? ORDER BY id DESC LIMIT ?'
        ).bind(ipHash, limit).all();
    const total = all
      ? await env.QM_DB.prepare('SELECT COUNT(*) AS n FROM saves').first()
      : await env.QM_DB.prepare('SELECT COUNT(*) AS n FROM saves WHERE ip_hash=?').bind(ipHash).first();
    const saves = (rs.results || []).map(r => {
      let params = null;
      try { params = JSON.parse(r.params); } catch (e) { /* 脏数据置空 */ }
      return { id: r.id, created_at: r.created_at, label: r.label, pillars: r.pillars, params };
    });
    return L.json({ saves, total: (total && total.n) || 0 });
  }

  if (request.method === 'DELETE') {
    const id = sp.get('id');
    if (!id) return L.errMsg('缺少 id', 400);
    /* F5：单条删除仅限本网络自己的存档；管理口令可删任意条 */
    const rs = isAdmin(env, sp)
      ? await env.QM_DB.prepare('DELETE FROM saves WHERE id=?').bind(Number(id)).run()
      : await env.QM_DB.prepare('DELETE FROM saves WHERE id=? AND ip_hash=?').bind(Number(id), ipHash).run();
    if (!(rs.meta && rs.meta.changes)) return L.errMsg('存档不存在或不属于本网络', 404);
    return L.json({ ok: true, deleted: Number(id) });
  }

  return L.errMsg('不支持的方法', 405);
}

/* ---- Pages Functions 路由（ESM 导出） ---- */
export async function onRequest(ctx) { return handle(ctx.request, ctx.env); }
export { handle };
