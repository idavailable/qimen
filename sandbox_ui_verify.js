/* M3+M4 UI 集成 · 真实浏览器全局模型沙箱全流程验证（驱动）
 * 模型：win 即全局对象（win.window=win; win.self=win; vm.createContext(win)）
 * 顺序：engine.js → yongshen.js → interpret.js → app.js(init 自执行) → __ref → 验证脚本 → AI 异步组
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=__dirname;const PB=path.join(dir,'public');
const QN=require(path.join(PB,'engine.js')); // Node 侧参照引擎
const srcE=fs.readFileSync(path.join(PB,'engine.js'),'utf8');
const srcY=fs.readFileSync(path.join(PB,'yongshen.js'),'utf8');
const srcP=fs.readFileSync(path.join(PB,'prompt.js'),'utf8');
const srcI=fs.readFileSync(path.join(PB,'interpret.js'),'utf8');
const srcU=fs.readFileSync(path.join(PB,'app.js'),'utf8');
const srcV=fs.readFileSync(path.join(dir,'_ui_verify_src.js'),'utf8');
const srcH=fs.readFileSync(path.join(dir,'_ui_verify_ai.js'),'utf8');

/* ---------- DOM 极简模型 ---------- */
function makeEl(id){return{id,value:'',innerHTML:'',textContent:'',children:[],scrollTop:0,scrollHeight:0,style:{},className:'',appendChild(c){this.children.push(c);},select(){},querySelectorAll(){return[];}};}
const ids=['iDate','iTime','iLon','iClock','iZi','iJi','out','tDun','tJu','tGZ','yCat','ysBody','ysName','ysBrief',
           'aiMode','aiBase','aiModel','aiKey','aiQ','aiOut','aiStatus',
           'modelChips','modelWarn','modelRow','byokRow',
           'savesPanel','savesList'];
const els={};ids.forEach(i=>els[i]=makeEl(i));
els.iLon.value='120';els.iClock.value='true';els.iZi.value='23';els.iJi.value='2';
els.tDun.value='1';els.tJu.value='1';els.tGZ.value='0';els.yCat.value='qiucai';
els.aiMode.value='auto';

/* ---------- 浏览器全局对象（win 即全局） ---------- */
const win={
  document:{
    /* 未知 id 自动建并缓存：模拟 innerHTML 渲染出的新节点（多模型分栏 col-* 依赖此行为） */
    getElementById:id=>els[id]||(els[id]=makeEl(id)),
    createElement:t=>makeEl(t),
    body:{appendChild(){},removeChild(){}},
    execCommand:()=>true
  },
  __alerts:[],
  __fetches:[],
  console
};
win.alert=m=>win.__alerts.push(m);
win.window=win;win.self=win;

/* 浏览器 API 存根（vm context 无 Web API，全部显式注入） */
win.localStorage={
  _d:{},
  getItem(k){return Object.prototype.hasOwnProperty.call(this._d,k)?this._d[k]:null;},
  setItem(k,v){this._d[k]=String(v);},
  removeItem(k){delete this._d[k];}
};
win.navigator={clipboard:{_last:null,writeText(t){this._last=String(t);return Promise.resolve();}}};
win.scrollTo=()=>{}; /* loadSave 读档后回顶，沙箱无滚动 */
/* location：默认模拟「本地双击打开」（file:）→ auto 判为前端直连；
   I 组会临时改成 https: 验证线上走服务端代理 */
win.location={protocol:'file:',href:'file:///C:/qimen/public/index.html'};
win.TextEncoder=TextEncoder;win.TextDecoder=TextDecoder;win.AbortController=AbortController;
win.setTimeout=setTimeout;win.clearTimeout=clearTimeout;win.Promise=Promise;win.JSON=JSON;
/* fetch 存根：返回两片 SSE + [DONE]，并记录每次请求 */
const enc=new TextEncoder();
function sseChunk(o){return enc.encode('data: '+JSON.stringify(o)+'\n\n');}
win.fetch=function(url,init){
  win.__fetches.push({url:url,init:init,body:JSON.parse(init.body)});
  const chunks=[
    sseChunk({choices:[{delta:{content:'一、盘面要点：'}}]}),
    sseChunk({choices:[{delta:{content:'值符落宫，用神生克。'}}]}),
    enc.encode('data: [DONE]\n\n')
  ];
  let i=0;
  return Promise.resolve({
    ok:true,status:200,
    headers:{get:h=>h==='content-type'?'text/event-stream':null},
    body:{getReader:()=>({read:()=>i<chunks.length?Promise.resolve({done:false,value:chunks[i++]}):Promise.resolve({done:true}),cancel:()=>Promise.resolve()})},
    json:()=>Promise.resolve({choices:[{message:{content:'整段'}}]}),
    text:()=>Promise.resolve('')
  });
};

vm.createContext(win);

async function main(){
  /* ---------- 按浏览器加载顺序执行 ---------- */
  vm.runInContext(srcE,win,{filename:'engine.js'});
  vm.runInContext(srcY,win,{filename:'yongshen.js'});
  vm.runInContext(srcP,win,{filename:'prompt.js'});
  vm.runInContext(srcI,win,{filename:'interpret.js'});
  vm.runInContext(srcU,win,{filename:'app.js'}); // init() 立即 aiLoadCfg + setNow + cast

  /* ---------- Node 侧参照值 ---------- */
  const Rq=QN.cast(2026,10,10,9,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  win.__ref={
    dun:Rq.dun,ju:Rq.ju,dayGZ:Rq.meta.dayGZ,hourGZ:Rq.meta.hourGZ,term:Rq.meta.term,
    zfTo:Rq.zfTo,zsLuo:Rq.zsLuo,zfStar:Rq.zfStar,zsDoor:Rq.zsDoor,
    di:Object.fromEntries([1,2,3,4,5,6,7,8,9].map(p=>[p,Rq.di[p]])),
    tian:Object.fromEntries([1,2,3,4,5,6,7,8,9].map(p=>[p,Rq.tian[p]])),
    door:Object.fromEntries([1,2,3,4,5,6,7,8,9].map(p=>[p,Rq.door[p]])),
    god:Object.fromEntries([1,2,3,4,5,6,7,8,9].map(p=>[p,Rq.god[p]]))
  };

  /* ---------- A–G 同步验证 ---------- */
  vm.runInContext(srcV,win,{filename:'_ui_verify_src.js'});

  /* ---------- H · M4 AI 组（异步） ---------- */
  await vm.runInContext('(async function(){'+srcH+'\n__passes=P;__fails=F;})()',win,{filename:'_ui_verify_ai.js'});

  console.log('\n=== 沙箱驱动侧结论 ===');
  console.log('context 通过 '+win.__passes+' / 失败 '+win.__fails+
    ' ；alert '+win.__alerts.length+' 次；fetch 调用 '+win.__fetches.length+' 次');
  process.exit(win.__fails>0?1:0);
}
main();
