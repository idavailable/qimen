/* ============================================================
   奇门遁甲 · GET /api/models —— 前端模型芯片的数据源
   清单由服务端密钥决定可用性（configured），密钥本身绝不下发。
   自定义供应商：后台设 CUSTOM_PROVIDERS（JSON 数组）+ <ID大写>_API_KEY，
   模型即出现在芯片上，无需改代码（口径与 interpret.js 共用 _lib）。
   ============================================================ */
import * as L from './_lib.js';

const BUILTIN = [
  { id: 'gemini-3.6-flash', pv: 'Google' },
  { id: 'gemini-3.8-flash', pv: 'Google' },
  { id: 'deepseek-flash', pv: 'DeepSeek' },
  { id: 'deepseek-v4-pro', pv: 'DeepSeek' }
];

async function handle(request, env) {
  if (request.method === 'OPTIONS') return L.options();
  env = env || {};

  const geminiKeyed = !!env.GEMINI_API_KEY;
  const deepseekKeyed = !!env.DEEPSEEK_API_KEY;
  const all = BUILTIN.map(m => ({
    id: m.id, pv: m.pv,
    configured: /^gemini/i.test(m.id) ? geminiKeyed : deepseekKeyed
  }));

  /* 自定义供应商（后台 CUSTOM_PROVIDERS） */
  L.customProviders(env).forEach(p => {
    const keyed = !!env[L.customKeyEnv(p.id)];
    p.models.slice(0, 8).forEach(m => {
      all.push({ id: String(m), pv: p.label || p.id, configured: keyed });
    });
  });

  /* 去重：用 Set 而非对象字面量（避免 constructor/toString 等原型键误判重复） */
  const seen = new Set();
  const models = all.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  const warnings = L.customProviderWarnings(env);
  const unkeyed = models.filter(m => !m.configured).map(m => m.id);
  if (unkeyed.length) warnings.push('以下模型未配置密钥（不可用）：' + unkeyed.join('、'));

  return L.json({
    models: models,
    warnings: warnings,
    defaultModel: String(env.QM_PROVIDER || 'deepseek') === 'gemini'
      ? (env.GEMINI_MODEL || 'gemini-3.8-flash')
      : (env.DEEPSEEK_MODEL || 'deepseek-flash')
  });
}

export async function onRequest(ctx) { return handle(ctx.request, ctx.env); }
export async function onRequestGet(ctx) { return handle(ctx.request, ctx.env); }
export { handle };
