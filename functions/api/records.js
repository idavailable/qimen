/* ============================================================
   奇门遁甲 · /api/records —— D1 解读留痕查询
   GET    ?limit=20&offset=0  → 本网络（ip_hash）最近记录（不含 pan/answer 全文，列表用）
   GET    ?id=123             → 单条详情（含盘面与解读全文；仅本网络）
   GET    ?all=1&code=xxx     → 全量列表（需 ACCESS_CODE）
   DELETE ?id=123             → 删除单条（仅本网络）
   DELETE ?id=123&code=xxx    → 管理口令可删任意条
   DELETE ?all=1&code=xxx     → 清空（需 ACCESS_CODE 与环境变量一致；未设则禁止）
   F5：查询/删除均按 ip_hash 隔离——不再全站公开可读可删。
   ============================================================ */
import * as L from './_lib.js';

const COLS_LIST = 'id, created_at, cat, pillars, question, model, ms';
const COLS_FULL = 'id, created_at, cat, pillars, pan, question, answer, model, ms';

function isAdmin(env, q) {
  return !!(env && env.ACCESS_CODE && q.get('code') === env.ACCESS_CODE);
}

function parseId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

async function handle(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams;
  if (!env || !env.QM_DB) return L.errMsg('未绑定 D1（QM_DB）', 500);

  if (request.method === 'OPTIONS') return L.options();

  /* F10：限流覆盖到留痕查询/删除（此前仅 /api/interpret） */
  const ip = L.clientIP(request);
  if (L.rateLimited(env, ip)) return L.errMsg('请求过于频繁，请稍后再试', 429);
  const ipHash = await L.hashIP(ip);

  if (request.method === 'GET') {
    const all = q.get('all') === '1';
    if (all && !env.ACCESS_CODE) return L.errMsg('未设置 ACCESS_CODE，禁止全量查询', 403);
    if (all && !isAdmin(env, q)) return L.errMsg('口令错误', 401);
    const id = q.get('id');
    if (id) {
      const idNum = parseId(id);
      if (idNum === null) return L.errMsg('id 须为正整数', 400);
      /* F5：单条详情也按网络隔离（含 question/answer 原文） */
      const row = isAdmin(env, q)
        ? await env.QM_DB.prepare('SELECT ' + COLS_FULL + ' FROM readings WHERE id=?').bind(idNum).first()
        : await env.QM_DB.prepare('SELECT ' + COLS_FULL + ' FROM readings WHERE id=? AND ip_hash=?').bind(idNum, ipHash).first();
      if (!row) return L.errMsg('记录不存在', 404);
      return L.json({ record: row });
    }
    /* 非法 limit/offset（如 ?limit=abc）不得把 NaN 绑进 SQL——LIMIT NULL 等于无上限 */
    const limit = L.clampInt(q.get('limit'), 20, 1, 100);
    const offset = L.clampInt(q.get('offset'), 0, 0, 1000000);
    /* F5：默认只回本网络的记录 */
    const rs = all
      ? await env.QM_DB.prepare(
          'SELECT ' + COLS_LIST + ' FROM readings ORDER BY id DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all()
      : await env.QM_DB.prepare(
          'SELECT ' + COLS_LIST + ' FROM readings WHERE ip_hash=? ORDER BY id DESC LIMIT ? OFFSET ?'
        ).bind(ipHash, limit, offset).all();
    const total = all
      ? await env.QM_DB.prepare('SELECT COUNT(*) AS n FROM readings').first()
      : await env.QM_DB.prepare('SELECT COUNT(*) AS n FROM readings WHERE ip_hash=?').bind(ipHash).first();
    return L.json({ records: rs.results || [], total: (total && total.n) || 0 });
  }

  if (request.method === 'DELETE') {
    const id = q.get('id');
    if (id) {
      const idNum = parseId(id);
      if (idNum === null) return L.errMsg('id 须为正整数', 400);
      /* F5：单条删除仅限本网络；管理口令可删任意条 */
      const rs = isAdmin(env, q)
        ? await env.QM_DB.prepare('DELETE FROM readings WHERE id=?').bind(idNum).run()
        : await env.QM_DB.prepare('DELETE FROM readings WHERE id=? AND ip_hash=?').bind(idNum, ipHash).run();
      if (!(rs.meta && rs.meta.changes)) return L.errMsg('记录不存在或不属于本网络', 404);
      return L.json({ ok: true, deleted: idNum });
    }
    if (q.get('all')) {
      const code = env.ACCESS_CODE;
      if (!code) return L.errMsg('未设置 ACCESS_CODE，禁止清空', 403);
      if (q.get('code') !== code) return L.errMsg('口令错误', 401);
      await env.QM_DB.prepare('DELETE FROM readings').run();
      return L.json({ ok: true, cleared: true });
    }
    return L.errMsg('缺少 id 或 all=1');
  }

  return L.errMsg('不支持的方法', 405);
}

/* ---- Pages Functions 路由（ESM 导出） ---- */
export async function onRequest(ctx) { return L.route(ctx.request, handle(ctx.request, ctx.env)); }
export { handle };
