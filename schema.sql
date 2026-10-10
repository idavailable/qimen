/* ============================================================
   奇门遁甲 · D1 建表（数据库名 qimen）
   执行：npx wrangler d1 execute qimen --file=schema.sql --remote
   ============================================================ */
CREATE TABLE IF NOT EXISTS readings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,          -- ISO 时间（UTC）
  cat        TEXT    DEFAULT '',        -- 问事类别 id（qiucai/gongzuo/...）
  pillars    TEXT    DEFAULT '',        -- 四柱（列表展示用，短）
  pan        TEXT    DEFAULT '',        -- 盘面全文（入模原文）
  question   TEXT    DEFAULT '',        -- 用户补充问事
  answer     TEXT    DEFAULT '',        -- 模型解读（截断 4000 字）
  model      TEXT    DEFAULT '',        -- 实际调用的模型名
  ip_hash    TEXT    DEFAULT '',        -- 访客 IP 的 SHA-256 前 16 位（不存原文）
  ms         INTEGER DEFAULT 0          -- 上游耗时（毫秒）
);
CREATE INDEX IF NOT EXISTS idx_readings_created ON readings (created_at DESC);
