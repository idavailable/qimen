/* 用 GitHub Git Data API 推送本地最近一次 commit 的文件内容
 * （git push 到 github.com:443 被网络阻断时走 api.github.com）
 * 用法：node tools_push_github.mjs <TOKEN>
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TOKEN = process.argv[2];
if (!TOKEN) { console.error('用法：node tools_push_github.mjs <TOKEN>'); process.exit(1); }
const REPO = 'idavailable/qimen';
const ROOT = process.cwd();
const H = {
  Authorization: 'Bearer ' + TOKEN,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'qimen-deploy'
};
async function gh(method, p, body) {
  const r = await fetch('https://api.github.com' + p, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(method + ' ' + p + ' → ' + r.status + ' ' + JSON.stringify(j).slice(0, 400));
  return j;
}

/* 文件清单与提交说明：优先读 .git_push_files.txt / .git_push_msg.txt
 * （execSync 在 Windows 上并发时易 EBUSY，故允许由外层 shell 先生成） */
let files, msg;
const FF = path.join(ROOT, '.git_push_files.txt'), MF = path.join(ROOT, '.git_push_msg.txt');
if (fs.existsSync(FF) && fs.existsSync(MF)) {
  files = fs.readFileSync(FF, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  msg = fs.readFileSync(MF, 'utf8').trim();
} else {
  files = execSync('git diff --name-only HEAD~1 HEAD', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean);
  msg = execSync('git log -1 --pretty=%B', { cwd: ROOT, encoding: 'utf8' }).trim();
}
console.log('待推送文件（' + files.length + '）：\n  ' + files.join('\n  '));

const ref = await gh('GET', '/repos/' + REPO + '/git/ref/heads/main');
const base = ref.object.sha;
console.log('远端 base commit = ' + base.slice(0, 7));

const tree = [];
for (const f of files) {
  const full = path.join(ROOT, f);
  if (!fs.existsSync(full)) { console.log('  ⚠️ 跳过（已删除）' + f); continue; }
  const b = await gh('POST', '/repos/' + REPO + '/git/blobs', {
    content: fs.readFileSync(full).toString('base64'), encoding: 'base64'
  });
  tree.push({ path: f.split(path.sep).join('/'), mode: '100644', type: 'blob', sha: b.sha });
}

const t = await gh('POST', '/repos/' + REPO + '/git/trees', { base_tree: base, tree });
const c = await gh('POST', '/repos/' + REPO + '/git/commits', { message: msg, tree: t.sha, parents: [base] });
await gh('PATCH', '/repos/' + REPO + '/git/refs/heads/main', { sha: c.sha });
console.log('✅ 已推送 ' + c.sha.slice(0, 7) + ' → https://github.com/' + REPO);
