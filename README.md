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
test.js                 回归测试（418 项）
sandbox_ui_verify.js    浏览器全局模型沙箱 UI 全流程验证（119 项）
_audit_dom.js           jsdom 真实 DOM 复核（10 项：换局类别/停止文案/换盘历史/芯片覆盖/对比列等高滚动）
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
| `QM_RETRY_WAIT_MS` | 文本变量 | Gemini 重试间隔毫秒数；默认 `10000`（10 秒）。调小仅用于测试 |
| `QM_GEMINI_MODELS` / `QM_DEEPSEEK_MODELS` | 文本变量 | 覆盖同族**递推顺序**（逗号分隔，书写顺序即试的顺序）；不设则用内置清单 |
| `GEMINI_MODEL` / `DEEPSEEK_MODEL` | 文本变量 | 该家默认模型；设在则自动排在递推链最前 |
| `ACCESS_CODE` | secret | 管理口令：`/api/records`、`/api/saves` 的全量查询（`?all=1`）、越权删除、清空校验；未设则一律禁止。**也是跨设备读档的钥匙**——前端存档面板填该口令并勾选「读全部」，即可换网络/换电脑读到全部云端存档 |

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
npm test          # 418 项回归（算法 1080 局不变式 + 克应 81 格 + M3 用神 + 立春干支年边界 + 节气基准解耦 + M4 + Functions + 供应商路由 + Gemini 重试与同族递推）
npm run ui:verify # 119 项浏览器沙箱全流程（含模型芯片与服务端代理 I 组、存档读档 J 组、重试/递推/思考链 K 组、跨设备读档口令 L 组）
node _audit_dom.js # 10 项 jsdom 真实 DOM 复核（补沙箱不解析 innerHTML 的盲区）
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

## 2026-10-14 第六轮（高峰期 Gemini 通道策略 + 对比列体验 + 思考链）

| 项 | 做法 |
|---|---|
| **Gemini 单独重试策略** | 高峰期 Gemini 网关易 503。首次建连失败（503/429/5xx/连接失败）后，**每 10 秒重试一次、共 2 次**；重试仍不通即改用同族其它模型作答（回落目标已在**第七轮更正**为「同族依次递推」，不再是跨家）。重试与递推进度以 SSE `status` / `fallback` 事件**在该列实时显示**，用户不必干等。前缀响应仍是 200 流，`error` 事件收尾时报明重试与递推都已用尽。**其它供应商一次即返、不引入任何等待**；Gemini 401 等硬错误同样不重试 |
| 对比列等高 | `.ai-col-body` 由 `min-height + flex:1` 改为**固定高度 440px**（小屏 `min(440px,62vh)`）+ `overflow-y:auto`——两列始终等高，内容长出即各自出滚动条；输出时贴近底部自动跟随，用户上滚查看则不动 |
| 思考链不入正文 | ① 服务端/前端 SSE 解析**显式丢弃** `reasoning_content` / `reasoning` / `thinking` 字段；② `stripThinking()` 兜底剔除写在 `content` 里的 ` thinking…` 标签（流式中未闭合则从起始标签到末尾一并丢弃）；③ D1 留痕与非流式兜底同样剥离；④ 提示词加一条「不得输出思考过程、推理草稿、自我提问」 |
| 工程 | `_ui_inline.js`（沙箱用内联脚本副本）**与 `index.html` 全量同步**（此前漂移出 F4/F6/F7/F12/F14/F18/F26 多处旧代码，沙箱实际在测旧版）；`_audit_dom.js` 的提取正则改为换行无关（Windows CRLF 检出下旧正则直接匹配失败） |

## 2026-10-14 第七轮（回落目标更正：同族依次递推）

| 项 | 做法 |
|---|---|
| **递推目标更正** | 第六轮的回落是「Gemini 挂了改投 DeepSeek」——换家族等于换解读风格，与用户所选的模型不一致。第七轮改为**只在同一供应商（家族）的其它模型间依次递推**：`gemini-3.8-flash` 重试 2 次仍不通 → 改用同族 `gemini-3.6-flash` → 再下一个……**全族试完仍不通才报错，绝不跨用别家模型** |
| 递推链 | `_lib.familyModels(env, from)` 收口同族候选池：内置清单（`gemini-*` / `deepseek-*`）或自定义 provider 的 `models`；可用 `QM_GEMINI_MODELS` / `QM_DEEPSEEK_MODELS` 覆盖顺序，`GEMINI_MODEL` / `DEEPSEEK_MODEL` 自动置顶。内置模型清单同时供 `/api/models` 与递推链使用（`_lib.BUILTIN_MODELS` 单处定义，不再两处漂移） |
| 递推节奏 | 当前模型 10 秒 ×2 重试；**同族候补逐个立即试一次**（换模型即换实例，不再各等 10 秒，免得干等翻倍）。递推沿用本家 `base`/`key`，只换模型名（跨家换名才会必然上游 400，同 F3 口径） |
| 可读性 | 状态栏与列头改用展示名（`gemini-3.8-flash` → `Gemini 3.8 Flash`，`_lib.modelLabel`）；列头持久标记由「由 X 回落作答」改为「→ 递推 X 作答」；`error` 文案点明「同族 N 个模型依次递推后仍不可用（本策略只在 X 家族内递推，不跨用别家模型）」 |
| 边界 | BYOK 无法枚举同族模型 → 递推链为空，直接报错，**不凭空编模型名**（必然上游 400）；`shouldRetry` 不变，非 Gemini 供应商仍一次即返 |

## 2026-10-14 第八轮（跨设备读档：管理口令入口）

| 项 | 做法 |
|---|---|
| 问题 | 云端存档默认按 `ip_hash`（`CF-Connecting-IP` 的 SHA-256 前 16 位）隔离——同一网络换电脑可读，**换网络就读不到**；本地存档在浏览器 localStorage，换机必无。服务端本有 `?all=1&code=ACCESS_CODE` 全量查询能力，但前端没有入口，线上也未配 `ACCESS_CODE` |
| 前端入口 | 存档面板加「管理口令」输入框 + 「读全部云端存档（跨网络）」勾选 + 「刷新」；填对并勾选即调 `cloudSavesAll()` 走 `?limit=100&all=1&code=…`，跨网络/跨设备列出全部云端存档，可直接读档与删除。口令与勾选状态存本机 localStorage（`qm_code_v1` / `qm_all_v1`），面板打开时自动回填 |
| 失败可见 | 服务端原话（「未设置 ACCESS_CODE，禁止全量查询」/「口令错误」）直接显示在面板提示位，不再静默当成「暂无存档」 |
| 读档/删除 | 全量拉到的行带 `admin:true`：`loadSave` 先命中最近一次渲染的云端行（跨网络条目不在默认列表里）；`delSave` 对这类行附 `&code=`（服务端只有管理口令能删他人/他网络的存档） |
| 顺带修（P3） | `loadParams` 由直接 `select.value=` 改为 `pickOpt()` 白名单回退：存档值不在当前 `<option>` 内时（旧档/云端旧档/选项改版）回退默认值，不再把选择框置空——空值会让 `cast()` 的时干入中寄 `parseInt('')` 得 NaN |
| 测试 | `test.js` **400/400**（新增 30.35–30.40：面板入口、全量 URL、admin 标记、删除附口令、持久化键名、pickOpt 三处）· 沙箱 **116/116**（新增 L 组 11 项：默认不带 all/code、全量查询、跨网络存档入列、读档命中、口令错误提示、删除附口令、持久化、pickOpt 回退与合法值恢复）· jsdom **10/10** |

## 2026-10-14 第九轮（全面审计：甲取旬口径 + 两处健壮性修复）

对 engine.js / yongshen.js / interpret.js / index.html / prompt.js×2 / functions/api 全量通读，并用权威资料交叉核验定局链条（符头三元、阴阳遁界、地盘布干序、值使门飞行含中宫计步与寄宫、九星八门八神旋转、旬空驿马、三奇应克 24 项、十干克应 81 格）。**算法主体未发现错误**；确认并修复 3 处：

| 编号 | 级别 | 问题 | 修复 |
|---|---|---|---|
| P2-1 | 逻辑 | `yongshen.js` 的 `ganPal()` 对「甲」一律取**时柱旬**六仪；而 `engine.js` 盘面文字 `R.luo.dayDun` 用的是**日柱旬**。甲日用神表「求测人落 Z 宫」与盘面「日干甲（遁 X）落 Y 宫」给出两个不同答案（实测 2026-01-10 甲申日：盘面落 1 宫、旧用神逻辑落 8 宫） | `ganPal(R,g,xunIdx)` 按**本柱旬**遁干：日干传日柱序、时干传时柱序、年干/月干传各自柱序（`pillars()` 增补 `yearIdx/monthIdx/dayIdx/hourIdx`，月柱序由五虎遁月干与节气月支解中国剩余定理得出）；`relToDay` 同步收日柱序；缺省第三参时退化为时柱序（向后兼容 paipan 直出与 2 参调用） |
| P2-2 | 代码 | `loadParams` 的 `yCat` 直赋不过白名单：旧档/云端档 `cat` 不在 10 类内时下拉被置空，`renderYongshen` 读到 `''` → `YS.take` 返回 null → `t.items` 抛 TypeError，读档后整页渲染崩掉（第八轮只给 iClock/iZi/iJi 加了 pickOpt，漏了 yCat） | 改走 `pickOpt('yCat',p.cat,'qiucai')`；`renderYongshen` 增加 `if(!t)return` 守卫（脏值不渲染而非崩页面） |
| P3-1 | 代码 | `records.js`/`saves.js` 的 `limit`/`offset` 解析：`?limit=abc` → `parseInt` 得 NaN → `Math.min/max` 传 NaN 仍为 NaN → D1 `bind(NaN)` → SQLite `LIMIT NULL` 等于**无上限**，一次拖回全表 | `_lib.clampInt(v,def,lo,hi)` 统一守卫，非法值回落默认并夹区间；两接口改用它 |

| 测试 | `test.js` **418/418**（甲取旬口径 13 项 + clampInt 5 项）· 沙箱 **119/119**（新增 L11–L13：yCat 白名单回退、合法值恢复、脏类别不抛错）· jsdom **10/10** |

审计中核对为**正确、未改动**的关键实现：拆补定局全链（符头→元→节气三元局表→阴阳遁）、地盘布干序＝九宫数序 1→9 含中五、值使门按九宫数序飞（中宫计一步、落 5 寄宫，与《同安康奇门起局歌》两实例逐字吻合）、转盘旋转、天禽寄宫、旬空、驿马、三奇得使/入墓/击刑、门迫门制、五不遇时、十干克应 81 格、三奇应克 24 项、`prompt.js` 两份逐字一致、`models.js` 密钥可用性判定。

## 路线图

- ✅ M1 起局引擎 · M2 格局库（十干克应 81 格等）· M3 用神取法 · M4 AI 流式解读（前端直连 + 服务端代理 + D1）
- ⏳ 置闰法（超神接气）· 飞盘派 —— 有流派争议，待《兵法奇门》第二部核校后再定
