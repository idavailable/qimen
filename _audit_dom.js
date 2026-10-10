/* 真实 DOM（jsdom）复核 v2：修正测试自身干扰（let 不挂 window / fetch 须响应 abort） */
const fs=require('fs'),path=require('path');
const {JSDOM}=require('C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/jsdom');
const PB=path.join(__dirname,'public');
const html=fs.readFileSync(path.join(PB,'index.html'),'utf8');
const inline=html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];

let pass=0,fail=0;
const ck=(n,a,e)=>{const ok=String(a)===String(e);ok?pass++:fail++;console.log((ok?'  ✅ ':'  ❌ ')+n+(ok?'':'  实际='+JSON.stringify(a)+' 期望='+JSON.stringify(e)));};

const dom=new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g,''),{url:'https://qimen-2i1.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.__alerts=[];w.alert=m=>w.__alerts.push(m);w.scrollTo=()=>{};
w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.AbortController=AbortController;
Object.defineProperty(w.navigator,'clipboard',{value:{writeText:()=>Promise.resolve()},configurable:true});
w.__fetches=[];
w.__slow=false;                       // true → 流式挂起直到 abort（模拟真实长流）
w.fetch=function(url,init){
  w.__fetches.push({url:String(url),init:init,body:init&&init.body?JSON.parse(init.body):null});
  const u=String(url);
  if(u.indexOf('/api/models')>=0)
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({models:[
      {id:'gemini-3.8-flash',pv:'Google',configured:true},{id:'deepseek-flash',pv:'DeepSeek',configured:true}],warnings:[]})});
  if(u.indexOf('/api/saves')>=0&&(!init||!init.method||init.method==='GET'))
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({saves:[],total:0})});
  const enc=new TextEncoder();
  return Promise.resolve({ok:true,status:200,
    headers:{get:h=>h==='content-type'?'text/event-stream':null},
    body:{getReader:()=>({read:()=>{
      /* 真实浏览器：signal 中止时 read() 会 reject AbortError */
      if(init&&init.signal&&init.signal.aborted)
        return Promise.reject(Object.assign(new Error('The operation was aborted.'),{name:'AbortError'}));
      if(w.__slow)return new Promise((_,rej)=>{
        if(init&&init.signal)init.signal.addEventListener('abort',()=>
          rej(Object.assign(new Error('The operation was aborted.'),{name:'AbortError'})),{once:true});
      });
      return Promise.resolve({done:false,value:enc.encode('data: '+JSON.stringify({choices:[{delta:{content:'甲'}}]})+'\n\n')});
    },cancel:()=>Promise.resolve()})},
    json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
};

for(const f of ['engine.js','yongshen.js','prompt.js','interpret.js'])
  w.eval(fs.readFileSync(path.join(PB,f),'utf8'));
w.eval(inline);
const $=id=>w.document.getElementById(id);

(async()=>{
console.log('=== F3 · 换局后「问事用神」类别被重置（真实 DOM）===');
$('iDate').value='2026-10-10';$('iTime').value='09:00';$('iLon').value='120';
w.cast();
$('yCat').value='hunyin';w.renderYongshen();     // 缺省参数=当前盘（renderYongshen 已支持缺省）
ck('选「恋爱婚姻」后用神区显示恋爱婚姻',/恋爱婚姻/.test($('ysName').textContent),true);
w.cast();
ck('★换局后 yCat 值（期望 hunyin）',$('yCat')?$('yCat').value:'(空)','hunyin');
ck('★换局后用神区（期望仍恋爱婚姻）',$('ysName').textContent.includes('恋爱婚姻'),true);
ck('★换局后 saveParams().cat（期望 hunyin）',w.saveParams().cat,'hunyin');

console.log('\n=== F4 · 点「停止」后的状态文案（abort 感知的 fetch）===');
$('aiMode').value='server';w.aiSyncMode();
$('iDate').value='2026-10-10';$('iTime').value='09:00';w.cast();
w.__slow=true;
const p=w.aiRun();
await new Promise(r=>setTimeout(r,30));
w.aiStop();
await p.catch(()=>{});
await new Promise(r=>setTimeout(r,30));
const st=$('aiStatus').textContent;
console.log('    实际状态文本 =',JSON.stringify(st));
ck('★停止后状态为「已停止」（不应被覆盖）',/已停止/.test(st)&&!/全部失败|解读失败/.test(st),true);
w.__slow=false;

console.log('\n=== F25 · 换盘后前端直连历史是否残留旧盘（真实 DOM + 请求体取证）===');
w.__fetches.length=0;
$('aiMode').value='front';w.aiSyncMode();
$('aiBase').value='https://x.example/v1';$('aiModel').value='m';$('aiKey').value='k';
$('iDate').value='2026-10-10';$('iTime').value='09:00';w.cast();
await w.aiRun();
const A=w.__fetches[w.__fetches.length-1].body;
const panA=A.messages[1].content;
ck('第1轮只带本盘',A.messages.length,2);
$('iDate').value='2026-10-11';$('iTime').value='10:00';w.cast();   // 换盘
await w.aiRun();
const B=w.__fetches[w.__fetches.length-1].body;
const hasOld=B.messages.some(m=>m.content===panA);
console.log('    第2轮 messages 条数 =',B.messages.length,'  含第1轮旧盘 =',hasOld);
ck('★换盘后不应再带旧盘（期望 false）',hasOld,false);

console.log('\n=== F14 · 服务端模式下 chip 模型被 byok 残留覆盖 ===');
$('aiMode').value='server';w.aiSyncMode();
$('aiBase').value='https://stale.example/v1';$('aiModel').value='old-manual';$('aiKey').value='sk-old';
$('iDate').value='2026-10-10';$('iTime').value='09:00';w.cast();
w.__fetches.length=0;
await w.aiRun();
const cols=w.__fetches.filter(f=>String(f.url).indexOf('/api/interpret')>=0).map(f=>f.body.model);
console.log('    两列实际请求的 model =',JSON.stringify(cols));
ck('★chip 选择应生效（不应被 aiModel 覆盖）',cols.every(m=>m==='old-manual'),false);

console.log('\n'+'='.repeat(52));
console.log('jsdom 复核：通过 '+pass+' / 失败 '+fail);
process.exit(0);
})();
