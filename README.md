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
  records.js            D1 解读记录：列表 / 详情 / 删除
  _lib.js               CORS、SSE、入参校验、限流、D1 写入
  prompt.js             服务端提示词副本（必须与 public/prompt.js 逐字一致）
test.js                 回归测试（248 项）
sandbox_ui_verify.js    浏览器全局模型沙箱 UI 全流程验证（67 项）
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
| `QM_API_KEY` | secret | 服务端默认模型密钥；未设则要求请求自带密钥 |
| `QM_BASE_URL` | 文本变量 | OpenAI 兼容端点，如 `https://api.deepseek.com/v1` |
| `QM_MODEL` | 文本变量 | 模型名，如 `deepseek-chat` |
| `RATE_LIMIT_PER_MIN` | 文本变量 | 每 IP 每分钟上限；**不设 = 不限流** |
| `ACCESS_CODE` | secret | 仅用于 `/api/records?all=1` 清空校验；未设则禁止清空 |

## D1

库名 `qimen`，单表 `readings`（id、时间、类别、四柱、盘面、问事、解读、模型、IP 哈希、耗时）。

```bash
npm run db:list   # 查最近 20 条
```

## 测试

```bash
npm test          # 248 项回归（算法 1080 局不变式 + 克应 81 格 + M3 用神 + M4 + Functions）
npm run ui:verify # 67 项浏览器沙箱全流程（含服务端代理 I 组）
```

## 路线图

- ✅ M1 起局引擎 · M2 格局库（十干克应 81 格等）· M3 用神取法 · M4 AI 流式解读（前端直连 + 服务端代理 + D1）
- ⏳ 置闰法（超神接气）· 飞盘派 —— 有流派争议，待《兵法奇门》第二部核校后再定
