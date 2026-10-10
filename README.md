# 奇门遁甲决策工具 · qimen

时家奇门（**转盘派 · 拆补法定局**）排盘 + 格局检出 + 用神取法 + AI 流式解读。
纯前端排盘（双击 `public/index.html` 即可用，无网络请求），线上部署在 Cloudflare Pages，
解读可选走 **服务端代理**（`/api/interpret`，密钥留服务端，解读写入 D1）。

- 线上：<https://qimen-2i1.pages.dev>
- 源码：<https://github.com/idavailable/qimen>

> 若 `git push` 到 github.com:443 被网络阻断，可用 `node tools_push_github.mjs <TOKEN>`
> 走 Git Data API（blob → tree → commit → PATCH ref）同步最近一次 commit。

## 目录结构

```
public/                 ← 部署根（pages_build_output_dir），只有这 5 个文件进公网
  index.html            单页 UI
  engine.js             M1 起局引擎（真太阳时 / 定局 / 四盘 / 旬空驿马）
  yongshen.js           M3 用神取法（10 类问事）
  prompt.js             系统提示词唯一来源（前后端共用，test.js 有同步校验）
  interpret.js          M4 盘面→提示词 + SSE 流式读取
functions/api/          ← Pages Functions（不进静态产物）
  interpret.js          流式解读代理（服务端密钥 / 自带密钥 BYOK）+ D1 留痕
  models.js             模型清单（按密钥可用性标注，支持后台自定义供应商）
  records.js            D1 解读记录：列表 / 详情 / 删除
  _lib.js               CORS、SSE、入参校验、限流、D1 写入、供应商路由
  prompt.js             服务端提示词副本（必须与 public/prompt.js 逐字一致）
test.js                 回归测试（352 项）
sandbox_ui_verify.js    浏览器全局模型沙箱 UI 全流程验证（93 项）
_audit_dom.js           jsdom 真实 DOM 复核（8 项：换局类别/停止文案/换盘历史/芯片覆盖）
schema.sql              D1 建表
wrangler.toml           Pages 配置（含 D1 绑定）
```

## 使用

- **本地**：双击 `public/index.html`。AI 解读默认「前端直连」—— 填接口地址/模型/密钥，
  请求直发该接口，密钥仅存本机 localStorage。
- **线上**：AI 解读默认「服务端代理」，密钥可在服务端配为 secret，浏览器无需填写；
  每次解读写入 D1（IP 只存 SHA-256 前 16 位）。

支持任意 OpenAI 兼容接口（`/chat/completions` + `stream:true`）：DeepSeek、Moonshot、通义、GLM、中转站等。

## 部署

```bash
# 1. 建表（仅首次）
npx wrangler d1 execute qimen --file=schema.sql --remote

# 2. 部署
npx wrangler pages deploy public --project-name=qimen
```

服务端密钥（可选，配了之后浏览器端免填）：

```bash
npx wrangler pages secret put QM_API_KEY --project-name=qimen
# 同时在 Pages → Settings → Variables 设 QM_BASE_URL、QM_MODEL
```

> secret / 变量变更后须**重新部署一次**才生效（实测线上 Functions 会持旧环境快照）。

## 环境变量

| 变量 | 位置 | 说明 |
|---|---|---|
| `GEMINI_API_KEY` | secret | Google AI Studio 密钥；配了则 `gemini-*` 模型可用 |
| `DEEPSEEK_API_KEY` | secret | DeepSeek 密钥；配了则 `deepseek-*` 模型可用 |
| `GEMINI_BASE_URL` | 文本变量 | 默认 `https://generativelanguage.googleapis.com/v1beta/openai`；数据中心 IP 被拒时可改接 CF AI Gateway |
| `DEEPSEEK_BASE_URL` | 文本变量 | 默认 `https://api.deepseek.com/v1` |
| `QM_PROVIDER` | 文本变量 | 请求未指定模型时的默认供应商（`deepseek` / `gemini`） |
| `CUSTOM_PROVIDERS` | 文本变量 | JSON 数组，后台加供应商无需改代码：`[{"id":"kimi","label":"Moonshot","base":"https://api.moonshot.cn/v1","models":["kimi-k2"]}]`，密钥为 `<ID大写>_API_KEY` |
| `QM_API_KEY` / `QM_BASE_URL` / `QM_MODEL` | secret / 变量 | 通用兜底（未走上面几家时使用） |
| `RATE_LIMIT_PER_MIN` | 文本变量 | 每 IP 每分钟上限；**不设 = 不限流** |
| `ACCESS_CODE` | secret | 管理口令：`/api/records`、`/api/saves` 的全量查询（`?all=1`）、越权删除、清空校验；未设则一律禁止 |

模型清单由 `GET /api/models` 动态返回（按密钥是否配置标注可用性），前端渲染成**可多选的模型芯片**，
选中几个就并行解读几个、横向对比。后台增删供应商/密钥后刷新页面即可，不用改代码。

## D1

库名 `qimen`，两表：

- `readings`（解读留痕：id、时间、类别、四柱、盘面、问事、解读、模型、IP 哈希、耗时）
- `saves`（盘面存档：id、时间、标签、四柱、参数 JSON、IP 哈希）

**网络隔离**：两张表的列表/详情/删除默认都按 `ip_hash` 过滤——仅同一网络可读写自己的数据，
不再全站公开；全量查询与越权删除需 `ACCESS_CODE` 口令。

```bash
npm run db:list   # 查最近 20 条
```

## 测试

```bash
npm test          # 352 项回归（算法 1080 局不变式 + 克应 81 格 + M3 用神 + 立春干支年边界 + 节气基准解耦 + M4 + Functions + 供应商路由）
npm run ui:verify # 93 项浏览器沙箱全流程（含模型芯片与服务端代理 I 组、存档读档 J 组）
node _audit_dom.js # 8 项 jsdom 真实 DOM 复核（补沙箱不解析 innerHTML 的盲区）
```

## 2026-10-10 全量审计修复（P1×6 + P2×7 + P3 若干，依据《审计报告-2026-10-10.md》）

| 类别 | 修复 |
|---|---|
| 前端状态 | 换局保留问事类别（F1）· 换盘清空前端直连历史 aiHist（F4）· 停止按钮独立标志位、状态不再被「全部失败」覆盖（F6）· 服务端模式芯片不再被 byok 残留覆盖（F7）· 切换接入方式重拉模型清单（F13）· 经度 0 不再被吞成 120（F14） |
| 算法 | **立春为界的干支年**：小寒/大寒期间年干支·月干支·年马星归上一年（F2，meta.gzYear）· 节气判定改用真实时刻 jdUTC，与「时间基准」解耦（F8）· 三奇得使收紧为传统组合（乙加己/辛、丙加戊/庚、丁加壬/癸）（F16） |
| 服务端 | provider 回落换用本家模型名（F3）· **saves/records 按 ip_hash 网络隔离** + 管理口令 ACCESS_CODE（F5，顺带修复 hashIP 误传 request 对象）· D1 留痕挂 ctx.waitUntil（F9）· 限流覆盖 saves/records（F10）· BYOK base 仅公网 http(s)、禁内网回环（F11）· 追问历史中重复盘面剔重（F15）· 存档 time 校验收紧（F17）· panText 上限前后端统一 4000（F20） |

## 2026-10-10 二轮核查（依据《审计报告-二轮-2026-10-10.md》）

一轮修复后重新通读全量代码 + 实测取证，**抓到一条此前漏网的 P1**：

| 编号 | 问题 | 修法 | 验证 |
|---|---|---|---|
| **F21** | **元旦至小寒前的干支年仍错一年**——旧判据只看「最近节气是否小寒/大寒」，而 1/1–1/4 的最近节气是**上一年冬至**，同样在立春之前。影响年干支、月干支（五虎遁）、年马星、用神「上级领导」（年干）、AI 提示词四柱。**每年 1/1–小寒前约 4~5 天** | 改用**立春真实时刻**（`meta.liChunJD`）比较 `jdUTC` 定干支年；yongshen 兜底同步 | 2026-01-02/03/04 → 乙巳年 戊子月、年马星亥；2026-02-05 立春起 → 丙午年；2020–2030 逐年全扫 0 错 ✅ |
| F26 | 存档列表去重键在 params 缺失时拼出 `undefined undefined …` 假键，会把不同存档并成一条 | 无有效 params 时回退用 id | 回归 ✅ |
| F27 | `/api/models` 的 `defaultModel` 可能指向**未配密钥**的模型（只配 Gemini 时仍给 deepseek-flash） | 取「已配 key」的模型；prefer 未配则回退首个已配 | 28.6b/28.6c ✅ |

二轮另记若干 P3 观察（未改代码）：客户端主动断开时服务端不写留痕；`/api/models` 前端未消费 `defaultModel`；云端存档列表上限 50 条。详见二轮报告。

已知遗留（P3，暂不修）：限流为单 isolate 内计数（F19，根治需 KV/D1 计数器）。

## 路线图

- ✅ M1 起局引擎 · M2 格局库（十干克应 81 格等）· M3 用神取法 · M4 AI 流式解读（前端直连 + 服务端代理 + D1）
- ⏳ 置闰法（超神接气）· 飞盘派 —— 有流派争议，待《兵法奇门》第二部核校后再定
