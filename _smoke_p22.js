/* P2-2 PWA 离线 + 分享链接 · jsdom 冒烟
   覆盖 test.js 纯函数够不到的一层：
   1) serviceWorker 注册只在 http(s) 发生，file://（本地双击）必须跳过；
   2) 带 #p= 打开时还原参数并起局，且不被 init() 的「现在」覆盖；
   3) manifest / sw.js 的静态约束（清单资源存在、/api/ 永不缓存、只拦同源 GET）。
   用法：NODE_PATH=<托管 workspace>/node_modules node _smoke_p22.js */
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
const SW = fs.readFileSync(path.join(PB, 'sw.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(PB, 'manifest.webmanifest'), 'utf8'));

let pass = 0, fail = 0;
const ck = (n, a, e) => { const ok = String(a) === String(e); ok ? pass++ : fail++; console.log((ok ? '  ✅ ' : '  ❌ ') + n + (ok ? '' : '  实际=' + JSON.stringify(a) + ' 期望=' + JSON.stringify(e))); };

/* 建一个可用的 DOM：url 决定 location.protocol，serviceWorker 可打桩计数 */
function boot(url, hash) {
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ''),
    { url: url + (hash || ''), runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.alert = m => { throw new Error('页面 alert: ' + m); };
  w.scrollTo = () => { };
  const swCalls = [];
  Object.defineProperty(w.navigator, 'serviceWorker', {
    value: { register: (u) => { swCalls.push(u); return Promise.resolve({ scope: './' }); } },
    configurable: true
  });
  for (const f of ['engine.js', 'yongshen.js', 'prompt.js', 'interpret.js'])
    w.eval(fs.readFileSync(path.join(PB, f), 'utf8') + '\n//# sourceURL=' + f);
  w.eval(APP + '\n//# sourceURL=app.js');
  w.dispatchEvent(new w.Event('load'));   // 触发 registerSW 里的 load 监听
  return { w: w, swCalls: swCalls };
}

/* ① http(s) 注册一次，且注册的是 sw.js */
{
  const { w, swCalls } = boot('https://qimen-2i1.pages.dev/');
  ck('https 下注册一次 serviceWorker', swCalls.length, 1);
  ck('注册路径为 sw.js', swCalls[0], 'sw.js');
  ck('页面挂 manifest 链接', /<link rel="manifest" href="manifest\.webmanifest">/.test(html), true);
  ck('页面挂 theme-color', /<meta name="theme-color" content="#0F6E56">/.test(html), true);
  ck('有分享按钮', html.indexOf('sharePan()') >= 0, true);
  ck('正常加载不中断（九宫在）', (w.document.getElementById('out').innerHTML.match(/class="pal/g) || []).length, 9);
}
/* ② file:// 不注册（本地双击） */
{
  const { swCalls } = boot('file:///C:/qimen/index.html');
  ck('file:// 不注册 serviceWorker', swCalls.length, 0);
}

/* ③ #p= 分享还原：参数来自链接而非「现在」 */
{
  const p = { date: '1718-06-14', time: '12:00', lon: 116, clock: 'true', zi: '23', ji: '2', pan: 'fei', method: 'zhiran', tq: 'suirui', cat: 'qiucai', q: '' };
  const enc = btoa(JSON.stringify(p)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const { w } = boot('https://qimen-2i1.pages.dev/', '#p=' + enc);
  ck('分享还原：日期来自链接', w.document.getElementById('iDate').value, '1718-06-14');
  ck('分享还原：时间来自链接', w.document.getElementById('iTime').value, '12:00');
  ck('分享还原：派别来自链接', w.document.getElementById('iPan').value, 'fei');
  ck('分享还原：定局法来自链接', w.document.getElementById('iMethod').value, 'zhiran');
  const out = w.document.getElementById('out').innerHTML;
  ck('分享还原：已自动起局', (out.match(/class="pal/g) || []).length, 9);
  ck('分享还原：盘面确是飞盘置闰（中五有星无门）', /class="pal mid[\s\S]*?class="door">—</.test(out), true);
  /* 换局按钮：hash 不含解读文本，只影响参数 */
  ck('分享 hash 只带参数', enc.indexOf('%') < 0, true);
}

/* ④ sw.js 静态约束 */
ck('sw.js 缓存 /api/ 前显式跳过', SW.indexOf("url.pathname.indexOf('/api/') === 0") >= 0, true);
ck('sw.js 非 GET 直接透传', SW.indexOf("req.method !== 'GET'") >= 0, true);
ck('sw.js 只管同源', SW.indexOf('url.origin !== self.location.origin') >= 0, true);
ck('sw.js 安装即预缓存全部静态资源', (SW.match(/caches\.open\(CACHE\)/g) || []).length >= 2, true);
ck('sw.js 激活时清旧缓存', SW.indexOf("caches.keys()") >= 0 && SW.indexOf('caches.delete(k)') >= 0, true);
/* 清单里的每个资源都要真实存在（否则 PWA 安装即失败） */
const scope = MANIFEST.start_url.replace(/^\.\//, '');
let missing = [];
for (const a of MANIFEST.icons) { if (!fs.existsSync(path.join(PB, a.src.replace(/^\.\//, '')))) missing.push(a.src); }
for (const a of ['./', './index.html', './manifest.webmanifest', './engine.js', './yongshen.js', './prompt.js', './interpret.js', './app.js', './sw.js'])
  if (!fs.existsSync(path.join(PB, a.replace(/^\.\//, '')))) missing.push(a);
ck('清单与脚本资源全部存在', missing.join(',') || 'none', 'none');
ck('manifest 有 192/512 图标', MANIFEST.icons.filter(i => i.sizes === '192x192').length >= 1 && MANIFEST.icons.filter(i => i.sizes === '512x512').length >= 1, true);
ck('manifest display=standalone', MANIFEST.display, 'standalone');
ck('manifest theme_color 与页面一致', MANIFEST.theme_color, '#0F6E56');

console.log('\n====================================================');
console.log('P2-2 冒烟：通过 ' + pass + ' / 失败 ' + fail);
console.log('====================================================');
process.exit(fail ? 1 : 0);
