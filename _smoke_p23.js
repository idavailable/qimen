/* P2-3 案例复盘 + 翻局 · jsdom 冒烟
   覆盖 test.js 纯函数够不到的一层：
   1) 翻局：cast() 入栈、上一局/下一局连同流派配置（pan/method/tq）一起回放、
      同参不重复压栈、中间起新局丢弃分支、上限 50、按钮禁用态、校验用局不入栈；
   2) 复盘：存档快照当时的 AI 解读、回填写进 feedback/verified、
      读档带回值与解读回看、换盘自动脱离、旧档无字段透明、云端条目转存本机。
   用法：NODE_PATH=<托管 workspace>/node_modules node _smoke_p23.js */
const fs = require('fs'), path = require('path');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) {
  const os = require('os');
  const cands = [
    path.join(os.homedir(), '.workbuddy/binaries/node/workspace/node_modules/jsdom'),
    'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/jsdom',
  ];
  for (const c of cands) { try { ({ JSDOM } = require(c)); break; } catch (_) { } }
  if (!JSDOM) throw e;
}
const PB = path.join(__dirname, 'public');
const html = fs.readFileSync(path.join(PB, 'index.html'), 'utf8');
const APP = fs.readFileSync(path.join(PB, 'app.js'), 'utf8');

let pass = 0, fail = 0;
const ck = (n, a, e) => { const ok = String(a) === String(e); ok ? pass++ : fail++; console.log((ok ? '  ✅ ' : '  ❌ ') + n + (ok ? '' : '  实际=' + JSON.stringify(a) + ' 期望=' + JSON.stringify(e))); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 建一个可用的 DOM：https 源（localStorage 可用），fetch 打桩为拒绝（无云端） */
function boot(url, hash) {
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ''),
    { url: url + (hash || ''), runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.alert = m => { throw new Error('页面 alert: ' + m); };
  w.scrollTo = () => { };
  w.fetch = () => Promise.reject(new Error('sandbox: no fetch'));
  for (const f of ['engine.js', 'yongshen.js', 'prompt.js', 'interpret.js'])
    w.eval(fs.readFileSync(path.join(PB, f), 'utf8') + '\n//# sourceURL=' + f);
  w.eval(APP + '\n//# sourceURL=app.js');
  w.dispatchEvent(new w.Event('load'));
  return w;
}
const $ = (w, id) => w.document.getElementById(id);
const castAt = (w, date, time, pan, method, tq) => {
  $(w, 'iDate').value = date; $(w, 'iTime').value = time;
  $(w, 'iPan').value = pan; $(w, 'iMethod').value = method; $(w, 'iTq').value = tq;
  w.eval('cast()');
};
/* 完整参数的存档行（histKey 含 lon/clock/zi/ji，缺字段会被判为换盘而脱离） */
const fullParams = o => Object.assign({ lon: '120', clock: 'true', zi: '23', ji: '2', pan: 'zhuan', method: 'chaibu', tq: 'suirui', cat: 'qiucai', q: '' }, o);

(async () => {

/* ① 翻局：入栈 / 回放 / 禁用态。
   注意：页面加载时 init() 会自动以「现在」起一局，它也是历史第 1 条。 */
{
  const w = boot('https://qimen-2i1.pages.dev/');
  ck('加载自动起局即第 1 条', $(w, 'hPos').textContent, '1/1');
  ck('栈底「上一局」禁用', $(w, 'hPrev').disabled, true);
  ck('栈尾「下一局」禁用', $(w, 'hNext').disabled, true);
  castAt(w, '1718-06-14', '12:00', 'fei', 'zhiran', 'yangen-yinkun');       // A
  ck('A 起局后 2/2', $(w, 'hPos').textContent, '2/2');
  castAt(w, '2027-12-22', '09:30', 'zhuan', 'chaibu', 'suirui');            // B
  ck('B 起局后 3/3', $(w, 'hPos').textContent, '3/3');
  ck('「下一局」在栈尾禁用', $(w, 'hNext').disabled, true);
  w.eval('prevCast()');
  ck('上一局回到 2/3', $(w, 'hPos').textContent, '2/3');
  ck('回放日期', $(w, 'iDate').value, '1718-06-14');
  ck('回放派别（飞盘）', $(w, 'iPan').value, 'fei');
  ck('回放定局法（置闰）', $(w, 'iMethod').value, 'zhiran');
  ck('回放寄宫变体（阳艮阴坤）', $(w, 'iTq').value, 'yangen-yinkun');
  ck('回放后盘面确是飞盘置闰', /<h2>三、九宫盘 <span[^>]*>（飞盘派 · 置闰法）/.test($(w, 'out').innerHTML), true);
  ck('回放后「下一局」可用', $(w, 'hNext').disabled, false);
  w.eval('nextCast()');
  ck('下一局回到 3/3', $(w, 'hPos').textContent, '3/3');
  ck('下一局回放到 B', $(w, 'iDate').value, '2027-12-22');
  ck('下一局回放派别（转盘）', $(w, 'iPan').value, 'zhuan');
  w.eval('prevCast()');
  castAt(w, '2027-12-25', '08:00', 'zhuan', 'chaibu', 'suirui');            // C（A 之后起新局）
  ck('中间起新局丢弃分支 → 3/3', $(w, 'hPos').textContent, '3/3');
  ck('分支丢弃后栈长仍为 3', $(w, 'hPos').textContent, '3/3');
  w.eval('prevCast()');
  ck('分支丢弃后上一局直达 A', $(w, 'iDate').value, '1718-06-14');
  castAt(w, '1718-06-14', '12:00', 'fei', 'zhiran', 'yangen-yinkun');       // 同参再起
  ck('同参再起不重复压栈', $(w, 'hPos').textContent, '2/3');
  ck('同参再起位置不变', $(w, 'hPos').textContent, '2/3');
  $(w, 'aiQ').value = '换个问话';
  castAt(w, '1718-06-14', '12:00', 'fei', 'zhiran', 'yangen-yinkun');       // 同局只改问话
  ck('同局改问话不制造新局', $(w, 'hPos').textContent, '2/3');
  w.eval('prevCast()');
  ck('问话随翻局回滚', $(w, 'aiQ').value, '');
  w.eval('nextCast()');
  ck('问话再翻回来（证明当次问话已更新入栈）', $(w, 'aiQ').value, '换个问话');
  const before = $(w, 'hPos').textContent;
  w.eval('castTest()');                                                      // 校验用局
  ck('校验用局不入历史栈', $(w, 'hPos').textContent, before);
}

/* ② 翻局上限 50（Date.UTC(2027,0,i) 在 i>31 时自动滚入 2/3 月，取滚后值） */
{
  const w = boot('https://qimen-2i1.pages.dev/');
  for (let i = 1; i <= 60; i++) {
    const d = new Date(Date.UTC(2027, 0, i));
    const ds = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    castAt(w, ds, '10:00', 'zhuan', 'chaibu', 'suirui');
  }
  ck('栈截到 50 条（位置 50/50）', $(w, 'hPos').textContent, '50/50');
  w.eval('prevCast()');
  ck('上一局退到倒数第二局（2027-02-28）', $(w, 'iDate').value, '2027-02-28');
  ck('未触底时「上一局」可用', $(w, 'hPrev').disabled, false);
  for (let i = 0; i < 60; i++) w.eval('prevCast()');   // 多出的调用在栈底自动空转
  ck('一路退到栈底 1/50', $(w, 'hPos').textContent, '1/50');
  ck('栈底正是被截留的最早一局（2027-01-11）', $(w, 'iDate').value, '2027-01-11');
  ck('栈底「上一局」禁用', $(w, 'hPrev').disabled, true);
}

/* ③ 复盘：存档快照 AI 解读 + 回填写回 + 读档回看 + 换盘脱离 + 旧档透明 */
{
  const w = boot('https://qimen-2i1.pages.dev/');
  const d = w.document;
  castAt(w, '2027-12-22', '09:30', 'zhuan', 'chaibu', 'suirui');
  ck('未存档时复盘卡隐藏', $(w, 'reviewCard').style.display, 'none');
  /* 造两列假的 AI 解读（模拟流式完成后的成品） */
  const aiOut = $(w, 'aiOut');
  [['deepseek-chat', '财星临生门，三日内有信'], ['gpt-4o-mini', '事体半吉，宜速决']].forEach(([m, t]) => {
    const col = d.createElement('div'); col.className = 'ai-col';
    const head = d.createElement('div'); head.className = 'ai-col-head'; head.textContent = m;
    const body = d.createElement('div'); body.className = 'ai-col-body'; body.textContent = t;
    col.appendChild(head); col.appendChild(body); aiOut.appendChild(col);
  });
  await w.eval('savePan()');
  await sleep(30);
  const saves = w.eval('localSaves()');
  ck('存档写入本地', saves.length, 1);
  ck('存档快照当时的 AI 解读（两列）', saves[0].ai && saves[0].ai.length, 2);
  ck('快照含模型名', saves[0].ai[0].model, 'deepseek-chat');
  ck('快照含正文', saves[0].ai[0].text, '财星临生门，三日内有信');
  ck('存档后复盘卡出现', $(w, 'reviewCard').style.display, 'block');
  ck('复盘卡指向该存档', $(w, 'rvInfo').innerHTML.indexOf('复盘对象') >= 0, true);
  ck('新档默认待验', $(w, 'rvVerified').value, '');
  /* 事后回填 */
  $(w, 'rvFeedback').value = '三日后对方来电商量折扣，生门应';
  $(w, 'rvVerified').value = 'yes';
  await w.eval('saveReview()');
  await sleep(30);
  const s2 = w.eval('localSaves()')[0];
  ck('回填写进 feedback', s2.feedback, '三日后对方来电商量折扣，生门应');
  ck('回填写进 verified', s2.verified, 'yes');
  ck('列表出现「应验」角标', $(w, 'savesList').innerHTML.indexOf('应验') >= 0, true);
  /* 换盘 → 复盘卡自动脱离 */
  castAt(w, '2027-12-23', '09:30', 'zhuan', 'chaibu', 'suirui');
  ck('换盘后复盘卡收起', $(w, 'reviewCard').style.display, 'none');
  $(w, 'rvFeedback').value = 'x';
  await w.eval('saveReview()');
  ck('脱离后回填被拒（无关联存档）', $(w, 'rvMsg').textContent.indexOf('请先') >= 0, true);
  /* 读档 → 回填值与解读快照一起回来 */
  await w.eval("loadSave('" + s2.id + "')");
  await sleep(30);
  ck('读档后复盘卡出现', $(w, 'reviewCard').style.display, 'block');
  ck('读档带回 feedback', $(w, 'rvFeedback').value, '三日后对方来电商量折扣，生门应');
  ck('读档带回 verified', $(w, 'rvVerified').value, 'yes');
  ck('读档回看当时的解读', $(w, 'rvAi').innerHTML.indexOf('财星临生门，三日内有信') >= 0, true);
  ck('解读区标注只读回看', $(w, 'rvAi').innerHTML.indexOf('只读回看') >= 0, true);
  /* 旧档透明：造一条没有 feedback/verified/ai 的存档 */
  const old = { id: 'L' + (Date.now() - 5000), created_at: '2026/10/14 12:00:00', label: '旧档', pillars: '旧档', params: fullParams({ date: '2026-10-14', time: '12:00' }), src: 'local' };
  w.eval('localStorage.setItem("qm_saves_v1", JSON.stringify([' + JSON.stringify(old) + ']))');
  await w.eval("loadSave('" + old.id + "')");
  await sleep(30);
  ck('旧档复盘卡可开', $(w, 'reviewCard').style.display, 'block');
  ck('旧档无 feedback → 回填空', $(w, 'rvFeedback').value, '');
  ck('旧档无 verified → 待验', $(w, 'rvVerified').value, '');
  ck('旧档无 ai → 提示当时未保存', $(w, 'rvAi').innerHTML.indexOf('当时未保存') >= 0, true);
  /* 旧档补一次回填即创建字段 */
  $(w, 'rvFeedback').value = '补记';
  $(w, 'rvVerified').value = 'no';
  await w.eval('saveReview()');
  await sleep(30);
  const row1 = w.eval('localSaves()').find(x => x.id === old.id);
  ck('旧档回填后创建字段', row1 && row1.feedback, '补记');
  ck('旧档回填后 verified 落值', row1 && row1.verified, 'no');
  /* 清空回填即删除可选字段 */
  $(w, 'rvFeedback').value = ''; $(w, 'rvVerified').value = '';
  await w.eval('saveReview()');
  await sleep(30);
  const row2 = w.eval('localSaves()').find(x => x.id === old.id);
  ck('清空回填即移除字段', row2 && row2.feedback, undefined);
}

/* ④ 云端条目：只读回填 + 转存本机（fetch 打桩出云端列表） */
{
  const w = boot('https://qimen-2i1.pages.dev/');
  /* mock 成服务端返回的原始形状（id 为数字，cloudSaves 会映射成 'C'+id） */
  const cloud = { id: 9, created_at: '2026/10/13 08:00:00', label: '云端档', pillars: '云端档', params: fullParams({ date: '2026-10-13', time: '08:00', pan: 'fei', method: 'zhiran' }) };
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ saves: [cloud] }) });
  await w.eval('renderSaves()');          // 先把云端行装进 lastCloud（loadSave/转存都从这儿命中）
  await sleep(20);
  ck('云端列表渲染出一条', $(w, 'savesList').innerHTML.indexOf('云端档') >= 0, true);
  await w.eval("loadSave('C9')");
  await sleep(30);
  ck('云端档复盘卡可开', $(w, 'reviewCard').style.display, 'block');
  ck('云端档提示需转存', $(w, 'rvInfo').innerHTML.indexOf('转存本机') >= 0, true);
  $(w, 'rvFeedback').value = '试图回填云端档';
  await w.eval('saveReview()');
  ck('云端档回填被拒并提示', $(w, 'rvMsg').textContent.indexOf('转存本机') >= 0, true);
  ck('云端档未被写入本地', w.eval('localSaves()').length, 0);
  await w.eval('cloudToLocal()');
  await sleep(30);
  ck('转存后本地多一条', w.eval('localSaves()').length, 1);
  ck('转存条目标记来源', w.eval('localSaves()')[0].fromCloud, 'C9');
  ck('转存后流派配置还在', w.eval('localSaves()')[0].params.pan, 'fei');
  /* 转存后回填才真正落库 */
  $(w, 'rvFeedback').value = '转存后补记';
  $(w, 'rvVerified').value = 'yes';
  await w.eval('saveReview()');
  await sleep(30);
  ck('转存后回填可写', w.eval('localSaves()')[0].feedback, '转存后补记');
  ck('转存后复盘卡仍开着', $(w, 'reviewCard').style.display, 'block');
}

/* ⑤ 静态约束：按钮与容器都在页面上 */
ck('页面有上一局按钮', html.indexOf('id="hPrev"') >= 0 && html.indexOf('prevCast()') >= 0, true);
ck('页面有下一局按钮', html.indexOf('id="hNext"') >= 0 && html.indexOf('nextCast()') >= 0, true);
ck('页面有翻局位置指示', html.indexOf('id="hPos"') >= 0, true);
ck('页面有复盘卡', html.indexOf('id="reviewCard"') >= 0, true);
ck('复盘卡有回填框', html.indexOf('id="rvFeedback"') >= 0, true);
ck('复盘卡有应验下拉', html.indexOf('id="rvVerified"') >= 0, true);
ck('HIST_MAX 为 50', /const HIST_MAX=50;/.test(APP), true);
ck('存档键沿用 qm_saves_v1', APP.indexOf("const SAVE_KEY='qm_saves_v1';") >= 0, true);
ck('复盘写本地不新建键', APP.indexOf('localStorage.setItem(SAVE_KEY,JSON.stringify(saves))') >= 0, true);

console.log('\n====================================================');
console.log('P2-3 冒烟：通过 ' + pass + ' / 失败 ' + fail);
console.log('====================================================');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('冒烟脚本异常：', e); process.exit(1); });
