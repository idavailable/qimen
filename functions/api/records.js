/* ============================================================
   奇门遁甲 · /api/records —— D1 解读留痕查询
   GET    ?limit=20&offset=0  → 最近记录（不含 pan/answer 全文，列表用）
   GET    ?id=123             → 单条详情（含盘面与解读全文）
   DELETE ?id=123             → 删除单条
   DELETE ?all=1&code=xxx     → 清空（需 ACCESS_CODE 与环境变量一致；未设则禁止）
   ============================================================ */
import * as L from './_lib.js';

const COLS_LIST = 'id, created_at, cat, pillars, question, model, ms';
const COLS_FULL = 'id, created_at, cat, pillars, pan, question, answer, model, ms';

async function handle(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams;
  if (!env || !env.QM_DB) return L.errMsg('未绑定 D1（QM_DB）', 500);

  if (request.method === 'OPTIONS') return L.options();

  if (request.method === 'GET') {
    const id = q.get('id');
    if (id) {
      const row = await env.QM_DB.prepare('SELECT ' + COLS_FULL + ' FROM readings WHERE id=?').bind(Number(id)).first();
      if (!row) return L.errMsg('记录不存在', 404);
      return L.json({ record: row });
    }
    const limit = Math.min(Math.max(parseInt(q.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(q.get('offset') || '0', 10), 0);
    const rs = await env.QM_DB.prepare(
      'SELECT ' + COLS_LIST + ' FROM readings ORDER BY id DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    const total = await env.QM_DB.prepare('SELECT COUNT(*) AS n FROM readings').first();
    return L.json({ records: rs.results || [], total: (total && total.n) || 0 });
  }

  if (request.method === 'DELETE') {
    const id = q.get('id');
    if (id) {
      await env.QM_DB.prepare('DELETE FROM readings WHERE id=?').bind(Number(id)).run();
      return L.json({ ok: true, deleted: Number(id) });
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
export async function onRequest(ctx) { return handle(ctx.request, ctx.env); }
export { handle };
