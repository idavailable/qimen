/* ============================================================
   界面层：engine.js（QM）提供全部算法，此处只做输入与渲染
   ============================================================ */
const {PAL,GRID,gz,DOOR_WX,ke,TG_WX}=QM;
let curR=null; // 当前解盘对象（供用神区联动）
let hashRestored=false; // 本次加载是否由 #p= 分享链接还原过参数（init 据此跳过 setNow）

/* ---------- P2-2 分享链接：参数 ⇄ base64url（纯函数，沙箱可直接调） ----------
   只用 location.hash（#p=...），不用 query —— 避免被 Pages 的 /api 路由
   或缓存策略干扰，也保证本地双击 file:// 打开同样可用。
   编的只是起局参数（日期/时间/经度/流派等），不含解读文本。 */
const SHARE_KEYS=['date','time','lon','clock','zi','ji','pan','method','tq','cat','q'];
/* UTF-8 安全的 base64url：TextEncoder 先转字节再 btoa，
   否则问事文本含中文时 btoa 直接抛 InvalidCharacterError（返回空串）。 */
const b64uEncode=s=>{
  const bytes=new TextEncoder().encode(s);
  let bin='';for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const b64uDecode=b=>{
  const bin=atob(b);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};
function encodeParams(p){
  if(!p||typeof p!=='object')return '';
  const o={};
  for(const k of SHARE_KEYS){if(p[k]!==undefined&&p[k]!==null&&p[k]!=='')o[k]=String(p[k]);}
  if(!Object.keys(o).length)return '';
  try{return b64uEncode(JSON.stringify(o));}catch(e){return '';}
}
function decodeParams(h){
  if(!h||typeof h!=='string')return null;
  const m=h.match(/(?:^#|&)p=([A-Za-z0-9\-_]+)/);
  if(!m)return null;
  let json='';
  try{json=b64uDecode(m[1]);}catch(e){return null;}
  let o=null;
  try{o=JSON.parse(json);}catch(e){return null;}
  if(!o||typeof o!=='object')return null;
  /* 只认白名单键，脏键直接丢弃（hash 是人手可改的） */
  const out={};
  for(const k of SHARE_KEYS){if(typeof o[k]==='string'&&o[k]!=='')out[k]=o[k];}
  return out;
}
/* 分享入口：写 hash + 复制链接；失败（无剪贴板权限/file://）时退回地址栏可见即可 */
function sharePan(){
  if(!curR||!curR.meta||curR.meta.test){alert('请先以真实日期时间起一局，再分享');return;}
  const p=saveParams();
  if(!p.date||!p.time){alert('请先以真实日期时间起一局，再分享');return;}
  const enc=encodeParams(p);
  if(!enc){alert('参数编码失败');return;}
  const url=location.href.split('#')[0]+'#p='+enc;
  try{history.replaceState(null,'',url);}catch(e){location.hash='p='+enc;}
  const done=()=>castMsg('分享链接已就绪（已写入地址栏）：'+url);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done,()=>castMsg('分享链接（复制失败，请手动复制地址栏）：'+url));
  }else castMsg('分享链接（请手动复制地址栏）：'+url);
}
/* ---------- P2-2 Service Worker：http(s) 才注册，file:// 必须跳过 ---------- */
(function registerSW(){
  if(!('serviceWorker' in navigator))return;
  if(!location.protocol||location.protocol.indexOf('http')!==0)return; // file:// 跳过
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(()=>{/* 离线能力缺失不影响排盘 */});
  });
})();
/* 打开时若带 #p=...：还原参数（读档白名单逻辑复用 loadParams），
   置 hashRestored，init() 便不再用「现在」覆盖分享链接带来的时刻。
   注意：此处只还原、不 cast() —— 本 IIFE 运行于模块求值期，文件后部的
   const/let（如 relBadge）尚在 TDZ，同步起局会抛 ReferenceError；
   起局统一交给文件末尾的 init()。 */
(function restoreFromHash(){
  let p=null;
  try{p=decodeParams(location.hash);}catch(e){p=null;}
  if(!p)return;
  loadParams(p);
  if(document.getElementById('iDate').value&&document.getElementById('iTime').value){
    hashRestored=true;
  }
})();

function fmtJD(jd){
  const d=QM.jdToUTC(jd+8/24);
  const p=n=>String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// 格局：engine.js 的 geju 已含全部规则（含五不遇时），此处只传入日干
function gejuUI(R,dayGan){return QM.geju(R,dayGan);}

function setNow(){
  const n=new Date(),p=x=>String(x).padStart(2,'0');
  document.getElementById('iDate').value=`${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}`;
  document.getElementById('iTime').value=`${p(n.getHours())}:${p(n.getMinutes())}`;
  cast();
  /* 页面加载时 init() 已自动起过一局，表单往往就是当前时刻——
     再点「现在」若只走 cast() 的「已起局」回执，用户看到的与上一行一字不差，
     会以为按钮没反应。这里覆盖成明确的「已回到现在」反馈。 */
  if(curR)castMsg('已回到当前时刻 · '+castSummary(curR));
}

function cast(){
  const ds=document.getElementById('iDate').value;
  const ts=document.getElementById('iTime').value;
  if(!ds||!ts){alert('请填写日期与时间');return;}
  const lonV=parseFloat(document.getElementById('iLon').value);
  const lon=isNaN(lonV)?120:lonV; /* F14：经度 0（格林尼治）属合法输入，不能被 ||120 吞掉 */
  const clock=document.getElementById('iClock').value;
  const ziSwap=document.getElementById('iZi').value==='23';
  const jg=parseInt(document.getElementById('iJi').value);
  const pan=document.getElementById('iPan').value;
  const method=document.getElementById('iMethod').value;
  const tianqin=document.getElementById('iTq').value;
  const [Y,M,D]=ds.split('-').map(Number);
  const [h0,m0]=ts.split(':').map(Number);
  const R=QM.cast(Y,M,D,h0,m0,{lon,clock,ziSwap,jg,pan,method,tianqin});
  curR=R;
  render(R,R.meta);
  /* 可见反馈：同输入再起局时盘面逐字相同（页面加载时也已自动起过一局），
     没有任何提示会让人误以为「点了没反应」。这里每次都回一条摘要。 */
  castMsg('已起局 · '+castSummary(R));
  /* P2-3 翻局入栈（replaying 回放中由 pushHist 自行跳过） */
  pushHist();
  /* 盘面已变：与复盘卡关联的存档若不是同一局就脱离，回填不会张冠李戴 */
  syncReviewAttach();
}
function castSummary(R){
  const m=R.meta||{};
  const p2=n=>String(n).padStart(2,'0');
  let s=`${m.ly}-${p2(m.lm)}-${p2(m.ld)} ${p2(m.lh)}:${p2(m.lmi)}（${{std:'北京时间',local:'地方平太阳时',true:'真太阳时'}[m.clock]||''}）`;
  s+=` · ${R.dun===1?'阳遁':'阴遁'}${R.ju}局 · ${m.term}${m.yuanName||''}`;
  s+=' · '+({zhuan:'转盘派',fei:'飞盘派'}[R.pan]||'转盘派');
  s+=' · '+({chaibu:'拆补法',zhiran:'置闰法',maoshan:'茅山法'}[m.method]||'拆补法');
  if(m.method==='zhiran'&&m.rule&&m.rule!=='正授')s+='（'+m.rule+'）';
  if(R.pan==='zhuan'&&R.tianqin==='yangen-yinkun')s+=' · 天禽阳艮阴坤';
  try{
    const py=YS.pillars(R);
    if(py&&py.yearGZ&&py.yearGZ!=='?')s+=` · ${py.yearGZ}年 ${py.monthGZ}月 ${py.dayGZ}日 ${py.hourGZ}时`;
  }catch(e){}
  return s;
}
function castMsg(t){
  const el=document.getElementById('castMsg');
  if(!el)return;
  el.style.display=t?'block':'none';
  el.textContent=t||'';
}

/* ---------- P2-3 翻局：起局历史栈（连同流派配置一起回放） ----------
   cast() 每次成功起局都把当次参数快照压栈（最多 50 条），
   「上一局 / 下一局」在栈里前后移动并原样回放——流派三组（pan/method/tq）
   与经度、早晚子时、问事类别都随栈走，不会回放到一半丢了配置。
   回放走 replaying 标志屏蔽入栈，否则自己回放的参数会被当成新局再压一遍。 */
const HIST_MAX=50;
let historyStack=[],histPos=-1,replaying=false;
/* 栈键：决定「是不是同一局」。不含问事文本 aiQ——只改问话不制造新局；
   含 pan/method/tq/cat——改流派就是另一局，必须能翻回去对照。 */
function histKey(p){
  return [p.date,p.time,p.lon,p.clock,p.zi,p.ji,p.pan,p.method,p.tq,p.cat].join('|');
}
function pushHist(){
  if(replaying)return;
  let p=null;try{p=saveParams();}catch(e){return;}
  if(!p||!p.date||!p.time)return; /* 校验用局/空输入不进历史 */
  const k=histKey(p);
  if(histPos>=0&&historyStack[histPos]&&historyStack[histPos].k===k){
    historyStack[histPos].p=p; /* 同一局只更新问话等非键字段，不重复压栈 */
    renderHistUI();return;
  }
  historyStack=historyStack.slice(0,histPos+1); /* 在中间起过新局 → 丢弃后面的分支 */
  historyStack.push({k:k,p:p});
  if(historyStack.length>HIST_MAX)historyStack.shift();
  histPos=historyStack.length-1;
  renderHistUI();
}
function histReplay(){
  const h=historyStack[histPos];
  if(!h)return;
  replaying=true;
  try{loadParams(h.p);cast();}finally{replaying=false;}
  renderHistUI();
}
function prevCast(){if(histPos>0){histPos--;histReplay();}else renderHistUI();}
function nextCast(){if(histPos<historyStack.length-1){histPos++;histReplay();}else renderHistUI();}
function renderHistUI(){
  const prev=document.getElementById('hPrev'),next=document.getElementById('hNext'),pos=document.getElementById('hPos');
  if(prev)prev.disabled=histPos<=0;
  if(next)next.disabled=histPos>=historyStack.length-1;
  if(pos)pos.textContent=historyStack.length?((histPos+1)+'/'+historyStack.length):'0/0';
}

/* ---------- 存档 / 读档 ---------- */
const SAVE_KEY='qm_saves_v1';
const escHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function saveParams(){
  return {date:document.getElementById('iDate').value,time:document.getElementById('iTime').value,
    lon:document.getElementById('iLon').value,clock:document.getElementById('iClock').value,
    zi:document.getElementById('iZi').value,ji:document.getElementById('iJi').value,
    pan:document.getElementById('iPan').value,method:document.getElementById('iMethod').value,
    tq:document.getElementById('iTq').value,
    cat:(document.getElementById('yCat')||{}).value||'qiucai',
    q:(document.getElementById('aiQ')||{}).value||''};
}
/* 存档值若不在当前下拉选项内（旧档 / 云端旧档 / 选项改版），直接 select.value= 会把选择框置空，
   随后 cast() 读到空值（时干入中寄 parseInt('') → NaN）——按选项白名单回退默认值。
   极简 DOM 无 options 属性时保持原赋值语义（沙箱兼容）。 */
function pickOpt(id,val,def){
  const el=document.getElementById(id);if(!el)return;
  const v=(val===undefined||val===null||val==='')?def:String(val);
  const opts=el.options;
  if(!opts||!opts.length){el.value=v;return;}
  let ok=false;
  for(let i=0;i<opts.length;i++){if(String(opts[i].value)===v){ok=true;break;}}
  el.value=ok?v:def;
}
function loadParams(p){
  document.getElementById('iDate').value=p.date||'';
  document.getElementById('iTime').value=p.time||'';
  const lon = (p.lon === undefined || p.lon === null || p.lon === '') ? 120 : Number(p.lon);
  document.getElementById('iLon').value = (Number.isNaN(lon) ? 120 : lon);
  pickOpt('iClock',p.clock,'true');
  pickOpt('iZi',p.zi,'23');
  pickOpt('iJi',p.ji,'2');
  /* 流派三组同样走白名单：旧档无 pan/method/tq 字段时回退默认（转盘/拆补/随芮），
     与 cast() 的默认值一致，保证老存档读出来仍是原来那一盘 */
  pickOpt('iPan',p.pan,'zhuan');
  pickOpt('iMethod',p.method,'chaibu');
  pickOpt('iTq',p.tq,'suirui');
  /* yCat 同样走白名单：旧档/云端档 cat 值不在当前 10 类里时，直接赋值会把选择框置空，
     随后 renderYongshen 读到 '' → YS.take 返回 null → t.items 抛错，整页渲染崩掉 */
  if(document.getElementById('yCat')&&p.cat!==undefined&&p.cat!==null&&p.cat!=='')
    pickOpt('yCat',p.cat,'qiucai');
  if(document.getElementById('aiQ'))document.getElementById('aiQ').value=p.q||'';
}
async function savePan(){
  if(!curR||!curR.meta||curR.meta.test){alert('请先以真实日期时间起一局，再存档');return;}
  const params=saveParams();
  if(!params.date||!params.time){alert('请先以真实日期时间起一局，再存档');return;}
  let label='';
  try{const py=YS.pillars(curR);
    if(py&&py.dayGZ&&py.dayGZ!=='?')label=py.yearGZ+'年 '+py.monthGZ+'月 '+py.dayGZ+'日 '+py.hourGZ+'时';
  }catch(e){}
  if(!label)label=aiPillars()||params.date+' '+params.time;
  /* P2-3：把「当时的 AI 解读」一起存档——复盘时连同盘面原样回看。
     云端 POST 只认白名单字段（label/pillars/params），ai 仅落本地。 */
  const ai=collectAiTexts();
  const item={id:'L'+Date.now(),created_at:new Date().toLocaleString('zh-CN',{hour12:false}),label,pillars:label,params,src:'local'};
  if(ai.length)item.ai=ai;
  let saves=[];try{saves=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]');}catch(e){}
  saves.unshift(item);saves=saves.slice(0,100);
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves));}catch(e){}
  /* 线上环境：云端同步存档（失败不影响本地） */
  const online=location.protocol==='https:'||location.protocol==='http:';
  if(online){
    try{
      const r=await fetch('/api/saves',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({label:label.slice(0,60),pillars:label.slice(0,120),params})});
      if(r.ok){const j=await r.json();item.cloudId=j.id;
        try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves));}catch(e){} /* cloudId 回写持久化 */
      }
    }catch(e){/* 云端失败仅本地 */}
  }
  /* 复盘卡关联到刚存的这一条（换盘后由 cast() 自动脱离，见 attachReview） */
  curSaveId=item.id;curSaveKey=histKey(item.params);
  showReview(item);
  toggleSaves(true);
}
/* P2-3：收集当前 AI 解读各列的成品文本（流式中途只存到当前进度，保存即快照） */
function collectAiTexts(){
  const out=document.getElementById('aiOut');
  if(!out)return [];
  const cols=out.querySelectorAll?out.querySelectorAll('.ai-col'):[];
  const list=[];
  for(let i=0;i<cols.length;i++){
    const head=cols[i].querySelector('.ai-col-head');
    const body=cols[i].querySelector('.ai-col-body');
    const text=body?(body.textContent||'').trim():'';
    if(!text)continue;
    list.push({model:(head?(head.textContent||'').trim():'')||('模型'+(i+1)),text:text.slice(0,8000)});
  }
  return list.slice(0,8); /* 本地 localStorage 有配额，最多留 8 列 */
}
function localSaves(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'[]');}catch(e){return [];}
}
/* ---- 跨设备读档：管理口令（服务端 ACCESS_CODE） ----
   云端存档默认按 ip_hash（公网 IP 哈希）隔离——同一网络可读，换网络/换地方就读不到。
   服务端本就有 ?all=1&code= 全量查询能力，这里把它接到界面上：填对管理口令并勾选「读全部」，
   换任何电脑、任何网络都能列出全部云端存档并直接读档。口令只存本机 localStorage，
   由服务端 secret 比对，服务端既不落库也不下发。 */
const CODE_KEY='qm_code_v1',ALL_KEY='qm_all_v1';
let lastCloud=[];   /* 最近一次渲染的云端行：跨网络条目不在默认列表里，读档/删除要能直接命中 */
function savesCode(){
  const el=document.getElementById('savesCode');
  return el&&el.value?String(el.value).trim():'';
}
function wantAllCloud(){
  const el=document.getElementById('savesAll');
  return !!(el&&el.checked);
}
function setSavesMsg(t){const el=document.getElementById('savesMsg');if(el)el.textContent=t||'';}
/* 打开面板时回填上次的口令与勾选（省得每次重打） */
function hydrateSavesUI(){
  try{
    const c=document.getElementById('savesCode'),a=document.getElementById('savesAll');
    if(c&&!c.value)c.value=localStorage.getItem(CODE_KEY)||'';
    if(a)a.checked=localStorage.getItem(ALL_KEY)==='1';
  }catch(e){}
}
async function cloudSaves(){
  const online=location.protocol==='https:'||location.protocol==='http:';
  if(!online)return [];
  try{
    const r=await fetch('/api/saves?limit=50');
    if(!r.ok)return [];
    const j=await r.json();
    return (j.saves||[]).map(s=>({id:'C'+s.id,cloudId:s.id,created_at:s.created_at,label:s.label,pillars:s.pillars,params:s.params,src:'cloud'}));
  }catch(e){return [];}
}
/* 全量云端存档（需管理口令）→ {rows, error}；error 为服务端原话（未设 ACCESS_CODE / 口令错误…） */
async function cloudSavesAll(code){
  const online=location.protocol==='https:'||location.protocol==='http:';
  if(!online)return {rows:[],error:''};
  try{
    /* 口令走请求头：不再拼进 URL（避免进 CF 日志、浏览器历史、Referer） */
    const r=await fetch('/api/saves?limit=100&all=1',{headers:{'X-Access-Code':code}});
    let j=null;try{j=await r.json();}catch(e){}
    if(!r.ok)return {rows:[],error:(j&&j.error)||('HTTP '+r.status)};
    return {rows:(j.saves||[]).map(s=>({id:'C'+s.id,cloudId:s.id,created_at:s.created_at,label:s.label,pillars:s.pillars,params:s.params,src:'cloud',admin:true})),error:''};
  }catch(e){return {rows:[],error:'云端读取失败'};}
}
function toggleSaves(show){
  const p=document.getElementById('savesPanel');
  const open=show===true?true:show===false?false:p.style.display==='none';
  p.style.display=open?'block':'none';
  if(open){hydrateSavesUI();renderSaves();}
}
async function renderSaves(){
  const el=document.getElementById('savesList');
  const local=localSaves();
  const all=wantAllCloud(),code=savesCode();
  try{localStorage.setItem(CODE_KEY,code);localStorage.setItem(ALL_KEY,all?'1':'0');}catch(e){}
  el.innerHTML='<div style="font-size:12px;color:var(--muted)">加载云端存档…</div>';
  let cloud=[],err='';
  if(all&&code){const r=await cloudSavesAll(code);cloud=r.rows;err=r.error;}
  else cloud=await cloudSaves();
  lastCloud=cloud;
  if(err)setSavesMsg('云端口令查询失败：'+err);
  else if(all&&!code)setSavesMsg('已勾选「读全部」，请先填管理口令');
  else setSavesMsg(all?('全量云端存档 · '+cloud.length+' 条'):'');
  /* 云端与本地按四柱+日期时间去重（同一局可能存过两边） */
  const seen=new Set(),rows=[];
  cloud.concat(local).forEach(s=>{
    /* F26：params 缺失/字段不全时不能拼出 "undefined undefined …" 这种假键（会把不同存档并成一条） */
    const p=s.params||{};
    const k=(p.date||p.time)?(p.date+' '+p.time+' '+p.lon+' '+p.ji):s.id;
    if(seen.has(k))return;seen.add(k);rows.push(s);
  });
  if(!rows.length){el.innerHTML='<div style="font-size:12px;color:var(--muted)">暂无存档 —— 起局后点「存档」即可保存</div>';return;}
  el.innerHTML=rows.map(s=>{
    const t=(YS.CATS&&YS.CATS[s.params&&s.params.cat]?YS.CATS[s.params.cat].name:'')||'';
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid var(--line);font-size:12px">
      <span style="cursor:pointer;flex:1" onclick="loadSave('${s.id}')" title="点击恢复盘面">
        <b>${escHtml(s.label)}</b>
        ${s.src==='cloud'?'<span class="chip zhong" style="margin:0 4px;position:static">云</span>':'<span class="chip zhong" style="margin:0 4px;position:static">本</span>'}
        ${s.feedback?'<span class="chip zhong" style="margin:0 4px;position:static">'+(s.verified==='yes'?'应验':s.verified==='no'?'未应验':'已回填')+'</span>':''}
        <span style="color:var(--muted)">${escHtml(t)}${s.params&&s.params.q?' · '+escHtml(s.params.q.slice(0,30)):''} · ${escHtml(s.created_at)}</span>
      </span>
      <button class="ghost" style="padding:1px 8px" onclick="delSave('${s.id}')">删</button>
    </div>`;
  }).join('');
}
async function loadSave(id){
  let s=null;
  if(id[0]==='L')s=localSaves().find(x=>x.id===id);
  else{
    /* 先命中最近一次渲染的云端行（跨网络条目只存在于全量列表里），再退回本网络列表 */
    s=(lastCloud||[]).find(x=>x.id===id);
    if(!s){const cs=await cloudSaves();s=cs.find(x=>x.id===id);}
  }
  if(!s||!s.params){alert('存档不存在或已删除');renderSaves();return;}
  loadParams(s.params);
  /* P2-3：先关联再起局——cast() 内的 syncReviewAttach 会核对「是不是同一局」，
     顺序反了会被误判为换盘而立刻脱离 */
  curSaveId=s.id;curSaveKey=histKey(s.params);
  cast();
  /* 读档即进入该条的复盘视图（含事后回填与当时的解读回看） */
  showReview(s);
  toggleSaves(false);
  window.scrollTo({top:0,behavior:'smooth'});
}
async function delSave(id){
  if(id[0]==='L'){
    let saves=localSaves().filter(x=>x.id!==id);
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves));}catch(e){}
  }else{
    const cid=Number(id.slice(1));
    const row=(lastCloud||[]).find(x=>x.id===id);
    /* 跨网络（全量列表）的存档只有管理口令能删；本网络的存档不带口令 */
    const code=savesCode();
    const opts={method:'DELETE'};
    if(row&&row.admin&&code)opts.headers={'X-Access-Code':code};
    try{await fetch('/api/saves?id='+cid,opts);}catch(e){}
  }
  renderSaves();
}

/* ---------- P2-3 案例复盘：事后回填 + 当时的解读回看 ----------
   复盘卡挂在 AI 列下方：存档/读档某局后出现。回填写进该存档条目的
   feedback / verified 两个可选字段——旧档没有这两个字段，读不到即为空。
   本地条目直接改 localStorage；云端条目只读，「转存本机」后再回填。 */
let curSaveId=null,curSaveKey='';
function rvMsg(t,warn){
  const el=document.getElementById('rvMsg');
  if(!el)return;
  el.style.display=t?'block':'none';
  el.className='note'+(warn?' warn':'');
  el.textContent=t||'';
}
function detachReview(){
  curSaveId=null;curSaveKey='';
  const card=document.getElementById('reviewCard');
  if(card)card.style.display='none';
}
/* cast() 后调用：当前盘面与复盘卡关联的存档不是同一局 → 脱离 */
function syncReviewAttach(){
  if(!curSaveId)return;
  let p=null;try{p=saveParams();}catch(e){return;}
  if(!p||!p.date||!p.time||histKey(p)!==curSaveKey)detachReview();
}
function findSave(id){
  if(!id)return null;
  if(id[0]==='L')return localSaves().find(x=>x.id===id)||null;
  return (lastCloud||[]).find(x=>x.id===id)||null;
}
/* 打开某条存档的复盘视图：回填框带旧值，AI 区回看当时的成品快照 */
function showReview(s){
  const card=document.getElementById('reviewCard');
  if(!card||!s)return;
  card.style.display='block';
  const fb=document.getElementById('rvFeedback'),vf=document.getElementById('rvVerified');
  if(fb)fb.value=s.feedback||'';
  if(vf)vf.value=s.verified||'';
  const info=document.getElementById('rvInfo');
  if(info)info.innerHTML='复盘对象：<b>'+escHtml(s.label||'')+'</b>'+
    (s.created_at?' <span style="color:var(--muted)">'+escHtml(s.created_at)+'</span>':'')+
    (s.src==='cloud'?' <span class="chip zhong" style="position:static;margin:0 4px">云端存档 · 回填需先转存本机</span>':'');
  const box=document.getElementById('rvAi');
  if(box){
    const ai=s.ai||[];
    box.innerHTML=ai.length?
      ('<div style="font-size:12px;color:var(--muted);margin:8px 0 4px"><b>当时的 AI 解读</b>（存档快照，只读回看）</div>'+
       ai.map(a=>'<div style="border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0;background:#fff">'+
         '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">'+escHtml(a.model)+'</div>'+
         '<div style="font-size:13px;white-space:pre-wrap">'+escHtml(a.text)+'</div></div>').join('')):
      '<div style="font-size:12px;color:var(--muted);margin:8px 0 4px">当时未保存 AI 解读（存档时若尚未解读，此处为空）</div>';
  }
  rvMsg('');
}
function saveReview(){
  if(!curSaveId){rvMsg('请先「存档」或「读档」一个盘面，再做事后回填',true);return;}
  const s=findSave(curSaveId);
  if(!s){rvMsg('关联的存档已不存在，请重新读档',true);detachReview();return;}
  const fb=(document.getElementById('rvFeedback')||{}).value||'';
  const vf=(document.getElementById('rvVerified')||{}).value||'';
  if(s.src!=='local'){rvMsg('云端存档暂不支持回填——点「转存本机」后即可在本机回填',true);return;}
  const saves=localSaves();
  const it=saves.find(x=>x.id===curSaveId);
  if(!it){rvMsg('关联的存档已不存在，请重新读档',true);detachReview();return;}
  /* 空串即清除该可选字段（旧档读不到就是空，写入才创建字段） */
  if(fb)it.feedback=fb.slice(0,4000);else delete it.feedback;
  if(vf)it.verified=vf;else delete it.verified;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves));}catch(e){rvMsg('本机存储失败（可能已满）：'+e.message,true);return;}
  rvMsg('已保存到本机存档 · '+(vf==='yes'?'应验':vf==='no'?'未应验':'待验')+(fb?'（回填 '+fb.length+' 字）':''));
  renderSaves();
}
/* 云端条目转存本机：参数 + 当时的解读快照一并带上，回填随后即可写本地副本 */
function cloudToLocal(){
  /* 只有云端条目（id 以 C 开头）才需要转存；本机条目或未关联时报错 */
  if(!curSaveId||curSaveId[0]==='L'){rvMsg('仅云端存档需要转存',true);return;}
  const s=findSave(curSaveId);
  if(!s){rvMsg('存档不存在',true);return;}
  const item={id:'L'+Date.now(),created_at:new Date().toLocaleString('zh-CN',{hour12:false}),
    label:s.label||'',pillars:s.pillars||'',params:s.params||{},src:'local',fromCloud:curSaveId};
  if(s.ai&&s.ai.length)item.ai=s.ai;
  const saves=localSaves();saves.unshift(item);
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(saves.slice(0,100)));}catch(e){rvMsg('本机存储失败：'+e.message,true);return;}
  curSaveId=item.id;curSaveKey=histKey(item.params);
  showReview(item);
  rvMsg('已转存本机，可继续回填');
  renderSaves();
}

function castTest(){
  const dun=parseInt(document.getElementById('tDun').value);
  const ju=parseInt(document.getElementById('tJu').value);
  const hourIdx=parseInt(document.getElementById('tGZ').value);
  const jg=parseInt(document.getElementById('iJi').value);
  const pan=document.getElementById('iPan').value;
  const tianqin=document.getElementById('iTq').value;
  const R=QM.paipan(dun,ju,hourIdx,jg,{pan,tianqin});
  curR=R;
  render(R,{test:true,hourGZ:gz(hourIdx),jg});
}

/* ---------- M3 用神取法（界面层） ---------- */
const relBadge=rel=>{
  const cls=rel==='自身'||rel==='生日干'||rel==='被日干生'?'ji':rel==='克日干'||rel==='日干克'?'xiong':'zhong';
  return `<span class="chip ${cls}" style="margin:0">${rel}</span>`;
};
function renderYongshen(R){
  if(R===undefined)R=curR; /* 缺省对当前盘重绘（控制台/测试直调友好） */
  if(!R||!R.meta||R.meta.test)return; // 校验用局无日时干支，用神区不可用
  const catId=document.getElementById('yCat')?document.getElementById('yCat').value:'qiucai';
  const t=YS.take(R,catId);
  if(!t)return; // 类别 id 不在表内（旧档脏值/控制台直调）：不渲染而非抛错
  const body=t.items.map(x=>{
    const wx=x.pal&&x.pal>=1&&x.pal<=9?PAL[x.pal].wx:'—';
    const kong=x.desc.includes('旬空')?' <span class="tag kong" style="position:static">旬空</span>':'';
    const palTxt=x.pal?`${PAL[x.pal].gua}${x.pal}宫${kong}`:'<span style="color:#A32D2D">未找到</span>';
    return `<tr><td>${x.role}</td><td><b>${x.sym}</b></td><td>${palTxt}</td><td>${wx}</td><td>${relBadge(x.rel)}</td></tr>`;
  }).join('');
  document.getElementById('ysBody').innerHTML=body;
  document.getElementById('ysName').textContent=`${t.name} · 日干${YS.pillars(R).day}=求测人`;
  document.getElementById('ysBrief').textContent=YS.brief(R,catId);
}

function render(R,m){
  const dayGan=m.test?null:m.dayGZ.charAt(0);
  const G=gejuUI(R,dayGan);
  const isFei=R.pan==='fei';
  const dunBadge=`<span class="badge ${R.dun===1?'yang':'yin'}">${R.dun===1?'阳遁':'阴遁'}${R.ju}局</span>`;
  const guestNote=isFei
    ? '飞盘派<b>中五宫入序</b>：有星、有神、<b>无门</b>，不做天禽寄宫'
    : `天禽${R.tianqin==='yangen-yinkun'?'（阳遁寄艮八 · 阴遁寄坤二）':'随天芮'}寄 <b>${PAL[R.guest.pal].gua}${R.guest.pal}宫</b>（中宫干 <b>${R.guest.gan}</b> 并显）${R.guest.isZF?' · <b>天禽为值符</b>':''}`;
  /* 定局行随流派变化：茅山不看符头；置闰给出超神/接气/正授/置闰与符头块 */
  const dingjuRow=(()=>{
    if(m.method==='maoshan')
      return `<tr><th>定局法</th><td><b>茅山法</b>（交节日当天起算，每 5 日一元，不看符头）→ ${m.juTerm}${m.yuanName}＝${R.ju}局</td></tr>`;
    if(m.method==='zhiran')
      return `<tr><th>定局法</th><td><b>置闰法</b> · ${m.rule} · 上元符头 <b>${m.fuTou}</b> 日${m.fuTouBack>0?`（${m.fuTouBack} 日前）`:''} → <b>${m.yuanName}</b>；${m.juTerm}${m.yuanName}＝${R.ju}局</td></tr>`;
    return `<tr><th>符头（拆补）</th><td>${m.fuTou} 日${m.fuTouBack>0?`（${m.fuTouBack} 日前）`:''} → <b>${m.yuanName}</b></td></tr>`;
  })();
  const paiRow=`<tr><th>排盘派别</th><td><b>${isFei?'飞盘派':'转盘派'}</b>${isFei?'（九星/八门/九神按洛书数序飞布，八门跳过中五）':''}${!isFei&&R.tianqin==='yangen-yinkun'?' · 天禽寄宫：阳遁艮八 / 阴遁坤二':''}</td></tr>`;

  let head='';
  if(m.test){
    head=`<div class="card"><h2>校验用局（手工指定）</h2>
      <table>
      <tr><th>局</th><td>${dunBadge} &nbsp; 时干入中寄${PAL[m.jg].gua}${m.jg}宫</td></tr>
      <tr><th>时干支</th><td><b>${m.hourGZ}</b>（旬首 <b>${R.xunName}</b>，遁 ${R.xunYi}；旬内第 ${R.n} 位）</td></tr>
      <tr><th>值符</th><td>${R.zfStar}${R.zfPal===5?'（禽随芮，视同自坤二起转）':''}（原居${PAL[R.zfPal].gua}${R.zfPal}宫）→ 加时干落 <b>${PAL[R.zfTo].gua}${R.zfTo}宫</b></td></tr>
      <tr><th>值使</th><td>${R.zsDoor}（原居${PAL[R.zsPal].gua}${R.zsPal}宫）→ 飞${R.n-1}步落 <b>${PAL[R.zsLuo].gua}${R.zsLuo}宫</b></td></tr>
      <tr><th>中宫寄宫</th><td>${guestNote}</td></tr>
      </table></div>`;
  }else{
    head=`<div class="card"><h2>二、四柱与定局</h2>
    <div class="flex"><div>
    <table>
      <tr><th>公历</th><td>${m.ly}-${String(m.lm).padStart(2,'0')}-${String(m.ld).padStart(2,'0')} ${String(m.lh).padStart(2,'0')}:${String(m.lmi).padStart(2,'0')}</td></tr>
      <tr><th>时间基准</th><td>${{std:'北京时间',local:'地方平太阳时',true:'真太阳时'}[m.clock]}
        ${m.clock!=='std'?`（经度修正 ${m.lonCorr>=0?'+':''}${m.lonCorr.toFixed(1)} 分${m.clock==='true'?`，均时差 ${m.eot>=0?'+':''}${m.eot.toFixed(1)} 分`:''}）`:''}</td></tr>
      <tr><th>日 / 时干支</th><td><b>${m.dayGZ}</b> 日 &nbsp; <b>${m.hourGZ}</b> 时 ${m.ziSwap?'':'<span style="color:#854F0B">（00:00 换日）</span>'}</td></tr>
      <tr><th>旬首</th><td>${R.xunName} 旬，遁于六仪 <b>${R.xunYi}</b>；时居旬内第 <b>${R.n}</b> 位</td></tr>
    </table></div><div>
    <table>
      <tr><th>当前节气</th><td><b>${m.term}</b> · 交于 ${fmtJD(m.termJD)}</td></tr>
      <tr><th>下一节气</th><td>${m.nextTerm} · ${fmtJD(m.nextJD)}</td></tr>
      <tr><th>年干支</th><td><b>${R.nian.gan}${R.nian.zhi}</b> 年（干支年 ${m.gzYear||m.ly}，以立春为界）· 年马星 <b>${R.ma.year.zhi}</b>（${PAL[R.ma.year.pal].gua}${R.ma.year.pal}宫）</td></tr>
      <tr><th>旬空（空亡）</th><td>时${R.xunName}旬空 <b>${R.kong.hour.zhi.join('、')}</b> 落 ${[...new Set(R.kong.hour.pal)].map(p=>PAL[p].gua+p+'宫').join('、')}；日${gz(R.meta.dayIdx-(R.meta.dayIdx%10)).slice(0,2)}旬空 <b>${R.kong.day.zhi.join('、')}</b></td></tr>
      ${dingjuRow}
      <tr><th>定局</th><td>${dunBadge} &nbsp; ${m.juTerm||m.term}${m.yuanName}＝${R.ju}局</td></tr>
      <tr><th>值符 / 值使</th><td>${R.zfStar} 落 ${PAL[R.zfTo].gua}${R.zfTo}宫 &nbsp;/&nbsp; ${R.zsDoor} 落 ${PAL[R.zsLuo].gua}${R.zsLuo}宫</td></tr>
      <tr><th>中宫寄宫</th><td>${guestNote}</td></tr>
      ${paiRow}
    </table></div></div></div>`;
  }

  // 九宫格
  const kongPal=new Set(R.kong.hour.pal||[]);
  const dayKongPal=new Set((R.kong.day&&R.kong.day.pal)||[]);
  const maPal=R.ma?R.ma.day.pal:null;
  const dayPal=(R.luo&&R.luo.dayPal)||null;
  let cells='';
  for(const p of GRID){
    const isMid=p===5;
    const isGuest=!isMid&&R.guest&&p===R.guest.pal;
    const showJi=isGuest&&R.guest.gan!==R.tian[p];
    /* 中五：转盘显示地盘干（天盘干即地盘干）；飞盘中五入序，显示该宫天盘干 */
    const sky=isMid?(isFei?R.tian[5]:R.di[5]):R.tian[p];
    const starTxt=isMid?(isFei?R.tianStar[5]:'天禽'):(R.tianStar[p]+(isGuest?'<span style="color:#854F0B">·禽</span>':''));
    const isKong=kongPal.has(p)||dayKongPal.has(p);
    const tags=[];
    if(p===R.zfTo)tags.push('<span class="tag zf">值符</span>');
    if(p===R.zsLuo)tags.push('<span class="tag zs">值使</span>');
    if(isKong)tags.push('<span class="tag kong">旬空</span>');
    if(maPal===p)tags.push('<span class="tag ma">马</span>');
    if(dayPal===p&&!isMid)tags.push('<span class="tag day">日干</span>');
    cells+=`<div class="pal${isMid?' mid':''}${isKong?' kong':''}">
      ${tags.join('')}
      <div class="hd"><span>${PAL[p].gua}${p} · ${PAL[p].dir}</span><span>${PAL[p].wx}</span></div>
      <div class="god">${R.god[p]}</div>
      <div class="sd"><span class="star">${starTxt}</span><span class="door">${R.door[p]}</span></div>
      <div class="stems"><span class="sky${showJi?' two':''}">${sky}${showJi?`<span class="ji">${R.guest.gan}</span>`:''}</span><span class="earth">${R.di[p]}</span></div>
      <div class="fx">${isMid?(isFei?'飞盘：中五入序（有星有神无门）':`中干${R.di[5]} → 寄${PAL[R.guest.pal].gua}${R.guest.pal}宫`):''}</div>
    </div>`;
  }

  const html=head+`
  <div class="card">
    <h2>三、九宫盘 <span style="font-size:11px;color:#6f6e68;font-weight:400">（${isFei?'飞盘派':'转盘派'} · ${m.method==='maoshan'?'茅山法':m.method==='zhiran'?'置闰法':'拆补法'}）</span></h2>
    <div class="grid">${cells}</div>
    <div class="legend">每宫自上而下：${isFei?'九神':'八神'} / 九星 · 八门 / <b>天盘干</b>（右上角小字为寄宫之中宫干）· 地盘干 &nbsp;—&nbsp; 南下北上，符合洛书方位<br>标记：<span class="tag zf" style="position:static">值符</span> <span class="tag zs" style="position:static">值使</span> <span class="tag kong" style="position:static">旬空</span>（时/日旬空所落之宫）<span class="tag ma" style="position:static">马</span>（日马星）<span class="tag day" style="position:static">日干</span>（日干六仪落宫）</div>
  </div>

  <div class="card">
    <h2>四、格局速览 <span style="font-size:11px;color:#6f6e68;font-weight:400">（M2 · 十干克应 81 格全表 + 三奇应克 + 九遁 + 凶格）</span></h2>
    ${(()=>{
      if(!G.length)return '<span class="chip">未检出显著格局</span>';
      const groups={};
      for(const x of G)(groups[x.cat||'其他']=groups[x.cat||'其他']||[]).push(x);
      return Object.entries(groups).map(([cat,arr])=>
        `<div class="geju-group">${cat}</div>`+
        arr.map(x=>`<span class="chip ${x.t==='吉'?'ji':x.t==='中'?'zhong':'xiong'}" title="${x.txt}">${x.t} ${x.txt.split('——')[0]}</span>`).join('')
      ).join('');
    })()}
  </div>

  <div class="card">
    <h2>五、问事用神 <span style="font-size:11px;color:#6f6e68;font-weight:400">（M3 · 日干=求测人，时干=所问事）</span></h2>
    <div class="row" style="margin-bottom:10px">
      <div class="field"><label>问事类型</label>
        <select id="yCat" onchange="renderYongshen(curR)">
          <option value="qiucai">经营求财</option><option value="gongzuo">工作求职</option>
          <option value="hunyin">恋爱婚姻</option><option value="jibing">疾病</option>
          <option value="guansi">官司诉讼</option><option value="chuxing">出行远行</option>
          <option value="shiwu">失物</option><option value="tianqi">天气</option>
          <option value="fangdichan">买卖房产</option><option value="kaocha">考试升学</option>
        </select>
      </div>
      <div class="field"><label>速览</label><div id="ysName" style="font-size:13px;font-weight:600"></div></div>
    </div>
    <div id="ysBrief" class="note" style="margin-top:0"></div>
    <table>
      <tr><th style="width:130px">用神角色</th><th style="width:60px">符号</th><th>落宫</th><th style="width:50px">五行</th><th style="width:110px">与日干宫关系</th></tr>
      <tbody id="ysBody"></tbody>
    </table>
    <div class="legend" style="text-align:left;margin-top:8px">生克按<b>落宫地盘五行</b>横向比较：生日干/被日干生为吉（绿），克日干/日干克为凶（红），比和居中（黄）。旬空之宫标注灰标——落空亡则其事虚而不实，待冲空填实方应。</div>
  </div>

  <div class="card">
    <h2>七、逐宫明细</h2>
    <table>
      <tr><th style="width:60px">宫位</th><th>${isFei?'九神':'八神'}</th><th>九星</th><th>八门</th><th>天盘</th><th>地盘</th><th>门宫关系</th></tr>
      ${[1,2,3,4,5,6,7,8,9].map(p=>{
        const d=R.door[p];
        let rel='—';
        if(d&&d!=='—'){
          if(ke(DOOR_WX[d],PAL[p].wx))rel='门克宫 · 迫';
          else if(ke(PAL[p].wx,DOOR_WX[d]))rel='宫克门 · 制';
          else if(DOOR_WX[d]===PAL[p].wx)rel='比和';
          else rel='相生';
        }
        const isGuest=p!==5&&R.guest&&p===R.guest.pal&&R.guest.gan!==R.tian[p];
        const starCell=p===5?(isFei?R.tianStar[5]:'天禽'):(R.tianStar[p]+(isGuest?' <span style="color:#854F0B">·禽寄</span>':''));
        return `<tr><td><b>${PAL[p].gua}${p}</b> ${PAL[p].dir}</td><td>${R.god[p]}</td><td>${starCell}</td>
        <td>${d}</td><td><b>${R.tian[p]||''}</b>${isGuest?` <span style="color:#854F0B">(+${R.guest.gan}寄)</span>`:''}</td>
        <td>${R.di[p]}</td><td>${rel}</td></tr>`;
      }).join('')}
    </table>
  </div>

  <div class="card">
    <h2>八、中间量（供与其他排盘软件对照）</h2>
    <table>
      <tr><th>儒略日 UTC</th><td><code>${m.jdUTC?m.jdUTC.toFixed(5):'—'}</code>${m.jdAdj?` &nbsp; 修正后 <code>${m.jdAdj.toFixed(5)}</code>`:''}</td></tr>
      <tr><th>日干支序</th><td>${m.dayIdx!==undefined?m.dayIdx:'—'}${m.dayGZ?`（${m.dayGZ}）`:''}</td></tr>
      <tr><th>时干支序</th><td>${R.hourIdx}（${m.hourGZ}）</td></tr>
      <tr><th>地盘布干</th><td>${[1,2,3,4,5,6,7,8,9].map(p=>`${p}宫${R.di[p]}`).join(' ')}</td></tr>
      <tr><th>天盘旋转量</th><td>值符 ${PAL[R.zfPal].gua}${R.zfPal}宫${R.zfPal===5?'（禽随芮，自坤二起转）':''} → ${PAL[R.zfTo].gua}${R.zfTo}宫，顺时针移 <b>${R.shift}</b> 位</td></tr>
      <tr><th>天禽寄宫</th><td>${isFei?'飞盘派中五宫入序，有星有神无门，不做天禽寄宫':('天芮所临 '+PAL[R.guest.pal].gua+R.guest.pal+'宫，中宫干 <b>'+R.guest.gan+'</b> 并显于该宫天盘')}</td></tr>
      <tr><th>值使飞行</th><td>自 ${PAL[R.zsPal].gua}${R.zsPal}宫 ${R.forward?'顺':'逆'}飞 ${R.n-1} 步 → ${PAL[R.zsLuo].gua}${R.zsLuo}宫</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>九、算法依据与路线图</h2>
    <div class="note">
      <b>已实现</b>：真太阳时（经度+均时差）· 太阳视黄经求节气（精度约1分钟）· 三种定局法 —— <b>拆补法</b>（符头三元）、<b>置闰法</b>（超神/接气/正授/置闰，符头块走查，锚点 1717-12-16 甲子，康熙五十七芒种置闰算例复现）、<b>茅山法</b>（交节日当天起算每 5 日一元，不看符头）· 两种排盘派别 —— <b>转盘派</b>（值符加时干转宫）与 <b>飞盘派</b>（九星/八门/九神按洛书数序飞布，八门跳过中五，中五宫有星有神无门、不寄宫）· 天禽寄宫两变体（随天芮 / 阳遁寄艮八·阴遁寄坤二）· 地盘顺仪逆奇飞布 ·
      值符加时干转盘 · 值使按时序洛书飞宫 · 八门随值使转宫 · 八神阳顺阴逆 · 天禽随芮、中宫干寄宫并显 · 旬空（空亡宫）· 日/年驿马 · 日干·时干落宫<br>
      <b>M2 格局库</b>：十干克应 81 格全表（依据权威对照页逐条校正，如庚壬=上格、庚癸=大格、辛壬=凶蛇入狱、壬癸=幼女奸淫）· 三奇应克八宫表 · 九遁（天/地/人/神/鬼/风/云/龙/虎）· 三奇得使 · 玉女守门 · 三奇贵人升殿 · 伏吟反吟（全盘统计）· 六仪击刑 · 三奇入墓 · 门迫/门受制 · 五不遇时<br>
      <b>M3 用神取法</b>：yongshen.js 独立模块 —— 10 大类问事用神表（经营求财/工作求职/恋爱婚姻/疾病/官司/出行/失物/天气/房产/考试）· 日干=求测人、时干=所问事 · 每条用神归约到落宫 + 与日干宫生克（按落宫五行）· 界面「五、问事用神」联动展示<br>
      <b>质量保障</b>：engine.js / yongshen.js / prompt.js / interpret.js 与界面同源；node test.js 回归 549 项（池纪句解三例 / 1080 局不变式 / 寄宫专项 / 旬空驿马落宫 / 克应表 81 格 / 天遁识别 / 用神取法 / **甲取旬按本柱旬（日干≠时干口径）** / **立春真实时刻为界的干支年** / 节气基准解耦 / **历法锚点 72 节气+8 日柱（对 lunar-javascript 全量交叉校验）** / M4 流式 / Functions 服务端 / **Gemini 重试与同族递推** / **分页参数 NaN 守卫** / **P1-3 流派配置：飞盘算例四源一致逐宫比对、置闰康熙五十七算例、茅山 2027-12 算例**）全部通过，另加浏览器沙箱 128 项 + jsdom 复核 10 项 + P1-3 渲染冒烟 42 项 + P2-2 PWA/分享冒烟 23 项<br><br>
      <b>M4 AI 流式解读</b>：盘面 + 格局 + 用神拼成提示词（四段契约：盘面事实不可改写 / 主次次序 / 追问沿用原盘 / 现实边界，对齐 liuyao interpret.js）·
      两种接入方式 —— <b>服务端代理</b>（线上默认，走本站 <code>/api/interpret</code>，密钥留服务端、解读写入 D1）与 <b>前端直连</b>（本地双击默认，密钥存 localStorage、不经中间服务器）·
      非流式 JSON 兜底 · SSE 双守卫（单行溢出 / 正文 20 万字溢出）· 多轮追问沿用原盘 · 无密钥时「复制盘面提示词」降级 ·
      <b>Gemini 单独策略</b>（高峰期通道易 503）：首次失败后每 10 秒重试一次、共 2 次；仍不通则<b>在 Gemini 家族内依次递推</b>（如 3.8 Flash → 3.6 Flash），全族试完才报错，<b>不会跨到别家模型</b>；重试与递推进度在该列实时显示 ·
      多模型列<b>等高并各自出滚动条</b>、输出时自动跟随底部 · 模型思考链（reasoning / <code>&lt;think&gt;</code>）一律不入正文、不进追问历史<br>
      <b>盘面存档</b>：本地存 localStorage、线上同步 D1（默认按<b>本网络</b>隔离，他人不可见）· 面板填<b>管理口令</b>并勾选「读全部」即可<b>跨网络 / 跨设备</b>列出全部云端存档并读档（服务端 <code>?all=1</code> + <code>X-Access-Code</code> 头能力）· 读档时下拉值按选项白名单回退，不会因旧档值非法而把选择框置空<br>
      <b>P2-2 PWA 与分享</b>：manifest + Service Worker 离线缓存（<code>/api/</code> 永不缓存、只拦同源 GET）· 起局参数编成 <code>#p=</code> base64url 链接（UTF-8 安全），打开即还原并自动起局 · http(s) 才注册 SW，本地双击 <code>file://</code> 自动跳过<br>
      <b>P2-3 案例复盘与翻局</b>：存档条目增加可选 <code>feedback</code>（事后回填）/ <code>verified</code>（应验/未应验/待验）字段，AI 列下方「七、案例复盘」直接写回本机存档（旧档无字段即空，透明兼容）· 存档同时快照<b>当时的 AI 解读</b>，读档时连同盘面一起只读回看 · 云端存档可「转存本机」后回填 · 「◀ 上一局 / 下一局 ▶」在最近 50 局间翻动，<b>连同流派配置（派别/定局法/寄宫）一起回放</b><br>
      <b>待实现</b>：年命入局（年干支已备表单、未参与盘局）
    </div>
  </div>`;
  /* F1：innerHTML 整段重写会销毁 #yCat（回默认首项），先记下当前问事类别，写完回填 */
  const prevCat=document.getElementById('yCat')?document.getElementById('yCat').value:null;
  document.getElementById('out').innerHTML=html;
  if(prevCat){
    const yc=document.getElementById('yCat');
    /* 沙箱等极简 DOM 无 querySelector 时直接回填；浏览器下校验选项存在防脏值 */
    if(yc&&(typeof yc.querySelector!=='function'||yc.querySelector('option[value="'+prevCat+'"]')))yc.value=prevCat;
  }
  if(curR&&curR.meta&&!curR.meta.test)renderYongshen(curR);
  /* 换盘即作废上一盘的多轮追问历史（服务端按模型分别记录，前端直连共用 aiHist） */
  aiHist=[]; /* F4：此前漏清，本地双击模式下旧盘会随追问入模 */
  aiStates={};
}

/* ---------- M4 AI 流式解读（界面层） ---------- */
let aiHist=[],aiCtrl=null,aiStates={},aiAborted=false; /* F6：停止标志位（abort 后 aiCtrl 即失效，须独立记录） */
/* F18：esc 与 escHtml 本为同一份转义，统一引用避免两份并存 */
const esc=escHtml;

/* ---- 模型芯片（对齐 liuyao：后台 /api/models 驱动，可多选横向对比） ---- */
const QM_MODELS_KEY='qm_models';
const MODEL_TIPS={
  'gemini-3.6-flash':'快','gemini-3.8-flash':'高峰期易过载',
  'deepseek-flash':'快','deepseek-v4-pro':'深推理 · 慢'
};
const DEFAULT_MODELS=['gemini-3.8-flash','deepseek-flash'];
let MODELS=[
  {id:'gemini-3.6-flash',pv:'Google',label:'Gemini 3.6 Flash',tip:'快'},
  {id:'gemini-3.8-flash',pv:'Google',label:'Gemini 3.8 Flash',tip:'高峰期易过载'},
  {id:'deepseek-flash',pv:'DeepSeek',label:'DeepSeek Flash',tip:'快'},
  {id:'deepseek-v4-pro',pv:'DeepSeek',label:'DeepSeek V4 Pro',tip:'深推理 · 慢'}
];
function modelLabel(id){
  const p=String(id).split('-');
  return p[0].charAt(0).toUpperCase()+p[0].slice(1)+(p.length>1?' '+p.slice(1).join(' '):'');
}
function loadSelModels(){
  let saved=[];
  try{saved=JSON.parse(localStorage.getItem(QM_MODELS_KEY)||'[]');}catch(e){}
  const valid=(Array.isArray(saved)?saved:[]).filter(m=>MODELS.some(x=>x.id===m));
  return valid.length?valid:DEFAULT_MODELS.slice();
}
let selModels=loadSelModels();
function applyModels(list){
  if(!Array.isArray(list)||!list.length)return;
  MODELS=list.map(m=>({
    id:m.id,pv:m.pv||'',label:modelLabel(m.id),
    tip:(m.configured===false)?'后台未配 key':(MODEL_TIPS[m.id]||'')
  }));
  /* 合并而非覆盖：清单异步返回期间用户已点选的模型不得被静默丢弃。
     两处来源都必须按**新清单**过滤——loadSelModels() 在无存档时会回落到 DEFAULT_MODELS，
     若不过滤，后台清单里已被移除的模型（如只配了 DeepSeek）仍会被选中并发出无效请求。 */
  const cur=(selModels||[]).filter(id=>MODELS.some(x=>x.id===id));
  loadSelModels().forEach(id=>{if(cur.indexOf(id)<0&&MODELS.some(x=>x.id===id))cur.push(id);});
  selModels=cur.length?cur:(MODELS.length?[MODELS[0].id]:[]);
  renderModelChips();
}
async function loadModels(){
  const warn=document.getElementById('modelWarn');
  try{
    const res=await fetch('/api/models');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const d=await res.json();
    if(!d||!Array.isArray(d.models)||!d.models.length)throw new Error('模型清单为空');
    applyModels(d.models);
    const ws=Array.isArray(d.warnings)?d.warnings.filter(Boolean):[];
    if(warn){
      if(ws.length){warn.style.display='block';warn.textContent='⚠ '+ws.join('；');}
      else{warn.textContent='';warn.style.display='none';}
    }
  }catch(e){
    renderModelChips();
    if(warn){
      warn.style.display='block';
      warn.textContent='⚠ 未能读取后台模型清单（'+(e.message||'接口不可用')+'），当前显示内置清单，可能未配 key。';
    }
  }
}
function renderModelChips(){
  const box=document.getElementById('modelChips');
  if(!box)return;
  box.innerHTML=MODELS.map(m=>
    '<button class="mchip'+(selModels.indexOf(m.id)>=0?' on':'')+'" data-m="'+esc(m.id)+'" title="'+esc(m.tip||'')+'">'+
    '<span class="pv">'+esc(m.pv)+'</span>'+esc(m.label)+(m.tip?'<span class="pv"> · '+esc(m.tip)+'</span>':'')+'</button>').join('');
  Array.prototype.forEach.call(box.querySelectorAll('.mchip'),btn=>{
    btn.onclick=function(){
      const id=btn.dataset.m,i=selModels.indexOf(id);
      if(i>=0){if(selModels.length>1)selModels.splice(i,1);}
      else selModels.push(id);
      try{localStorage.setItem(QM_MODELS_KEY,JSON.stringify(selModels));}catch(e){}
      renderModelChips();
    };
  });
}
/* 模型 id → 安全 DOM id（带哈希，避免 gemini-3.6 与 gemini-36 之类去符号后撞名） */
function midSafe(m){
  let h=0;
  for(let i=0;i<m.length;i++)h=(h*31+m.charCodeAt(i))>>>0;
  return m.replace(/[^a-zA-Z0-9]/g,'')+h.toString(36);
}
function aiColBody(id){return document.getElementById('col-'+midSafe(id));}
/* ============================================================
   轻量 Markdown 渲染（第十轮新增）
   流式安全：先整体 HTML 转义再打标记，未闭合的星号标记按原文显示；
   双轨输出：textContent 留原文（极简 DOM/测试断言兼容），innerHTML 放渲染结果。
   支持：标题 / 粗体 / 斜体 / 删除线 / 行内代码 / 链接 / 列表 / 有序列表 /
        引用 / 表格 / 分隔线 / 段落（段内换行 <br>）
   ============================================================ */
function mdEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function mdInline(s){
  const keep=[];
  const hold=html=>{keep.push(html);return '\u0001'+(keep.length-1)+'\u0002';};
  s=s.replace(/`([^`\n]+)`/g,(m,c)=>hold('<code>'+c+'</code>'));
  s=s.replace(/\*\*([^*\n]+)\*\*/g,(m,c)=>hold('<b>'+c+'</b>'));
  s=s.replace(/~~([^~\n]+)~~/g,(m,c)=>hold('<del>'+c+'</del>'));
  s=s.replace(/\*([^*\n]+)\*/g,(m,c)=>hold('<i>'+c+'</i>'));
  s=s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g,(m,t,u)=>{
    const url=/^https?:\/\//i.test(u)?u:'';           // 只放行 http(s)，防 javascript: 等
    /* URL 进的是属性值而不是文本节点：mdEsc 不转义引号，必须自己补——
       否则 `[x](https://a.com/"onmouseover="alert(1))` 会多解析出一个事件属性（XSS）。 */
    const safeUrl=url.replace(/&/g,'&amp;').replace(/"/g,'%22').replace(/'/g,'%27').replace(/</g,'%3C').replace(/>/g,'%3E');
    return hold(url?'<a href="'+safeUrl+'" target="_blank" rel="noopener noreferrer">'+t+'</a>':t);
  });
  s=s.replace(/\u0001(\d+)\u0002/g,(m,i)=>keep[+i]);
  return s;
}
function mdRender(src){
  const lines=mdEsc(String(src||'')).replace(/\r\n?/g,'\n').split('\n');
  let out='',i=0,para=[];
  const flushPara=()=>{if(para.length){out+='<p>'+para.map(mdInline).join('<br>')+'</p>';para=[];}};
  while(i<lines.length){
    const ln=lines[i];
    let m;
    if(/^\s*$/.test(ln)){flushPara();i++;continue;}
    if(m=ln.match(/^(#{1,4})\s+(.*)$/)){flushPara();const lv=m[1].length+1;out+='<h'+lv+'>'+mdInline(m[2].trim())+'</h'+lv+'>';i++;continue;}
    if(/^\s*(-{3,}|\*{3,})\s*$/.test(ln)){flushPara();out+='<hr>';i++;continue;}
    if(/^\s*>/.test(ln)){flushPara();const buf=[];while(i<lines.length&&/^\s*>/.test(lines[i])){buf.push(lines[i].replace(/^\s*>\s?/,''));i++;}out+='<blockquote>'+mdInline(buf.join(' '))+'</blockquote>';continue;}
    if(/^\s*\|/.test(ln)){
      const buf=[];while(i<lines.length&&/^\s*\|/.test(lines[i])){buf.push(lines[i]);i++;}
      const rows=buf.filter(r=>!/^\s*\|?[\s:|-]+\|?\s*$/.test(r));
      if(rows.length){
        const cells=r=>r.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>mdInline(c.trim()));
        const head=cells(rows[0]),body=rows.slice(1).map(cells);
        out+='<table><thead><tr>'+head.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+
          body.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
      }
      continue;
    }
    if(m=ln.match(/^\s*[-*+]\s+(.*)$/)){
      flushPara();const buf=[];
      while(i<lines.length&&(m=lines[i].match(/^\s*[-*+]\s+(.*)$/))){buf.push(m[1]);i++;}
      out+='<ul>'+buf.map(t=>'<li>'+mdInline(t)+'</li>').join('')+'</ul>';continue;
    }
    if(m=ln.match(/^\s*\d+[.、]\s*(.*)$/)){
      flushPara();const buf=[];
      while(i<lines.length&&(m=lines[i].match(/^\s*\d+[.、]\s*(.*)$/))){buf.push(m[1]);i++;}
      out+='<ol>'+buf.map(t=>'<li>'+mdInline(t)+'</li>').join('')+'</ol>';continue;
    }
    para.push(ln);i++;
  }
  flushPara();
  return out;
}

function aiColHead(id){return document.getElementById('head-'+midSafe(id));}
function aiRenderCols(list){
  const out=document.getElementById('aiOut');
  out.innerHTML='<div class="ai-cols">'+list.map(m=>{
    const cfg=MODELS.filter(x=>x.id===m)[0]||{label:m,pv:''};
    return '<div class="ai-col"><div class="ai-col-head" id="head-'+midSafe(m)+'">'+esc(cfg.label||m)+
      '<span class="pv-tag">'+esc(cfg.pv||'')+'</span></div>'+
      '<div class="ai-col-body" id="col-'+midSafe(m)+'"></div></div>';
  }).join('')+'</div>';
}
/* 按接入方式切换显示：服务端代理 → 模型芯片；前端直连 → base/模型/密钥 */
function aiSyncMode(){
  const m=aiMode();
  const mr=document.getElementById('modelRow'),br=document.getElementById('byokRow');
  if(mr)mr.style.display=(m==='server')?'':'none';
  if(br)br.style.display=(m==='server')?'none':'';
  /* F13：切到服务端模式时重拉模型清单（此前只在 init 拉一次，后台新增供应商不刷新） */
  if(m==='server')loadModels();
}
const aiCfg=()=>({
  mode:(document.getElementById('aiMode')?document.getElementById('aiMode').value:'auto'),
  base:(document.getElementById('aiBase').value||'').trim(),
  model:(document.getElementById('aiModel').value||'').trim(),
  key:(document.getElementById('aiKey').value||'').trim()
});
/* 接入方式：auto 时按页面来源判定——线上（http/https）走服务端代理，本地双击（file://）走前端直连 */
function aiMode(){
  let m=document.getElementById('aiMode')?document.getElementById('aiMode').value:'auto';
  if(m==='auto')m=(location.protocol==='http:'||location.protocol==='https:')?'server':'front';
  return m;
}
function aiStatus(t,warn){
  const el=document.getElementById('aiStatus');
  el.style.display=t?'block':'none';
  el.className='note'+(warn?' warn':'');
  el.textContent=t;
}
function aiLoadCfg(){
  const c=QMI.loadCfg();
  if(!c)return;
  if(c.mode&&document.getElementById('aiMode'))document.getElementById('aiMode').value=c.mode;
  document.getElementById('aiBase').value=c.base||'';
  document.getElementById('aiModel').value=c.model||'';
  document.getElementById('aiKey').value=c.key||'';
}
function aiClearCfg(){
  ['aiBase','aiModel','aiKey'].forEach(id=>document.getElementById(id).value='');
  try{localStorage.removeItem(QMI.CFG_KEY);}catch(e){}
  aiStatus('已清空本机保存的接口配置');
}
function aiClearHist(){
  aiHist=[];aiStates={};
  document.getElementById('aiOut').innerHTML='';
  aiStatus('已清空对话，下次解读重新起一轮');
}
const aiCat=()=>document.getElementById('yCat')?document.getElementById('yCat').value:'qiucai';
const aiQuestion=()=>(document.getElementById('aiQ').value||'').trim();
function aiPan(withQ){
  if(!curR||!curR.meta||curR.meta.test){
    aiStatus('校验用局无四柱，AI 解读不可用：请先以真实日期时间起局',true);
    return null;
  }
  const q=aiQuestion();
  let pan=QMI.buildPanText(curR,aiCat());
  if(!pan){aiStatus('当前盘面无法生成提示词',true);return null;}
  if(withQ!==false&&q)pan+='\n【所问何事】'+q.slice(0,500);
  return pan;
}
function aiPillars(){
  try{
    const py=YS.pillars(curR);
    return py?[py.year,py.month,py.day,py.hour].join(' '):'';
  }catch(e){return '';}
}
/* 服务端代理模式：POST /api/interpret，SSE 增量回传，用 QMI.parseSSEChunk 解析
   第六轮：服务端会插播 status（Gemini 重试/同族递推进度）、fallback、warn（截断）、error；
   正文一律先经 QMI.stripThinking 剥掉思考链——思考内容不进正文，也不进追问历史。
   onEvent(kind,text) 用于把「等待/重试/递推」这类过程信息渲染到该列。 */
async function aiServerStream(pan,model,history,onDelta,onEvent){
  /* F7：服务端代理模式下 byok 输入行已隐藏，残留的手填 base/model/key 不得覆盖芯片选择。
     中转站请由后台 CUSTOM_PROVIDERS 配置（自动出现在芯片上），前端不再随请求带上。 */
  const body={pan:pan,cat:aiCat(),pillars:aiPillars(),question:aiQuestion().slice(0,500),
              history:(Array.isArray(history)?history:[]).slice(-8),model:model||''};
  const init={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  if(aiCtrl)init.signal=aiCtrl.signal;
  const resp=await fetch('/api/interpret',init);
  if(!resp.ok){
    let d='';try{d=String(await resp.text()).slice(0,300);}catch(e){}
    let msg='HTTP_'+resp.status;
    try{const j=JSON.parse(d);if(j&&j.error)msg=String(j.error);}catch(e){if(d)msg+=' '+d.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160);}
    const err=new Error(msg);err.status=resp.status;throw err;
  }
  const ct=String(resp.headers&&resp.headers.get?resp.headers.get('content-type'):'').toLowerCase();
  if(ct.indexOf('text/event-stream')<0){
    const j=await resp.json().catch(()=>null);
    throw new Error((j&&j.error)||'服务端未返回流式响应');
  }
  const reader=resp.body.getReader();const dec=new TextDecoder();
  let buf='',raw='',vis='',cut=null,errEvt='',warnEvt='';
  const evts=[];
  while(true){
    const r=await reader.read();
    if(r.done)break;
    buf+=dec.decode(r.value,{stream:true});
    evts.length=0;
    const st=QMI.parseSSEChunk(buf,raw,evts);
    buf=st.buf;raw=st.full;
    for(const e of evts){
      if(e.kind==='error')errEvt=e.text;
      else if(e.kind==='warn')warnEvt=e.text;
      else if(onEvent)onEvent(e.kind,e.text);
    }
    if(st.cut){cut=st.cut;break;}
    const nv=QMI.stripThinking(raw);
    if(nv.length>vis.length){if(onDelta)onDelta(nv.slice(vis.length));vis=nv;}
  }
  if(cut){try{await reader.cancel();}catch(e){}}
  /* 服务端明确报错（如 Gemini 重试与同族递推都用尽）：整列按失败处理，不留半截正文 */
  if(errEvt)throw new Error(errEvt);
  vis=QMI.stripThinking(raw);
  if(onDelta&&(warnEvt||cut))onDelta('\n\n〔回复过长已截断'+(cut?('（'+cut+'）'):'')+'，可追问「继续」〕');
  if(!vis&&!cut)throw new Error('EMPTY');
  return vis;
}
async function aiRun(){
  const mode=aiMode();
  const pan=aiPan(mode!=='server'); if(!pan)return; /* 服务端模式下问事单独传，不并进 pan */
  const cfg=aiCfg();
  if(mode==='front'&&(!cfg.base||!cfg.key||!cfg.model)){
    aiStatus('请填写接口地址、模型、密钥三项，或把接入方式改为「服务端代理」',true);return;
  }
  QMI.saveCfg(cfg);
  aiCtrl=(typeof AbortController==='function')?new AbortController():null;
  aiAborted=false; /* F6：新一轮开始前复位停止标志 */
  try{
    if(mode==='server'){
      /* 服务端代理：按选中的模型并行解读，每个模型一列（对齐 liuyao 多模型对比） */
      const list=selModels.slice();
      if(!list.length){aiStatus('请至少选择一个模型',true);return;}
      /* 不在这里重置 aiStates：多轮追问需沿用上一轮历史（重置只在换盘/清空对话时） */
      aiRenderCols(list);
      /* 每列状态：loading = 等待/重试中（只显示过程提示）；stream = 已开始出正文（提示不再覆盖正文） */
      const phase={};
      const setNote=(m,t)=>{
        if(phase[m]==='stream')return;
        const el=aiColBody(m);if(!el)return;
        el.innerHTML='<span class="loading">'+esc(t)+'</span>';
        try{el.scrollTop=0;}catch(e){}
      };
      const colAcc={},colRendered={};
      /* 渲染节流：微增量洪泛（或超长回复）下避免每片全量重渲染的 O(n²) 卡死；
         小于阈值时每片都渲染（短回复即时），超过后每累积 MD_RENDER_STEP 字符渲染一次，流末强制刷新 */
      const MD_RENDER_STEP=1500;
      const flushCol=(m)=>{
        const el=aiColBody(m);if(!el)return;
        const acc=colAcc[m];if(acc===undefined)return;
        if((colRendered[m]||0)!==acc.length){el.innerHTML=mdRender(acc);colRendered[m]=acc.length;}
      };
      const appendCol=(m,d)=>{
        const el=aiColBody(m);if(!el)return;
        /* 首次出正文：清掉「推局中…/重试中…」占位（textContent 一并清，兼容不重解析 innerHTML 的极简 DOM） */
        if(phase[m]!=='stream'){el.innerHTML='';el.textContent='';phase[m]='stream';}
        colAcc[m]=(colAcc[m]||'')+d;
        el.textContent=colAcc[m];            /* 原文：极简 DOM / 测试断言 / 复制用 */
        const acc=colAcc[m];
        if(acc.length<MD_RENDER_STEP||acc.length-(colRendered[m]||0)>=MD_RENDER_STEP){
          el.innerHTML=mdRender(acc);        /* 渲染：真实浏览器显示（流式安全，未闭合标记按原文） */
          colRendered[m]=acc.length;
        }
        /* 贴近底部时自动跟随；用户手动上滚查看时不动 */
        try{if(el.scrollHeight-el.scrollTop-el.clientHeight<48)el.scrollTop=el.scrollHeight;}catch(e){}
      };
      list.forEach(m=>{phase[m]='loading';setNote(m,'推局中…');});
      aiStatus('连接中…（服务端代理 · '+list.length+' 个模型）');
      let okN=0,lastErr='';
      await Promise.all(list.map(async m=>{
        const prev=(aiStates[m]&&aiStates[m].history)?aiStates[m].history:[];
        try{
          const reply=await aiServerStream(pan,m,prev,d=>appendCol(m,d),(kind,text)=>{
            /* status：Gemini 通道繁忙→10 秒后重试（1/2）→ 改用同族 XX 作答…，逐列实时可见 */
            if(kind==='status')setNote(m,text);
            else if(kind==='fallback'){
              /* 只在同族模型间递推（Gemini A → Gemini B → …），列头挂持久标记标明实际作答模型 */
              const head=aiColHead(m);
              if(head)head.innerHTML+='<span class="fb-tag">→ 递推 '+esc(text)+' 作答</span>';
              if(phase[m]!=='stream')setNote(m,'改用同族 '+text+' 作答…');
            }
          });
          aiStates[m]={history:prev.concat([{role:'user',content:pan},{role:'assistant',content:reply}])};
          flushCol(m);
          okN++;
        }catch(e){
          lastErr=(e&&e.message)?e.message:String(e);
          phase[m]='stream';
          flushCol(m);   /* 先刷新已收到的部分正文，再叠失败信息 */
          const el=aiColBody(m);
          if(el)el.innerHTML+='<span style="color:#A32D2D">失败：'+esc(lastErr)+'</span>';
        }
      }));
      /* F6：用户主动停止优先于成败统计，避免「全部失败：The operation was aborted.」覆盖「已停止」 */
      if(aiAborted)aiStatus('已停止',true);
      else if(okN===list.length)aiStatus('完成 · 继续提问将沿用本盘（模型侧受「追问沿用原盘」约束）');
      else if(okN>0)aiStatus('完成 '+okN+'/'+list.length+'（部分模型失败：'+lastErr+'）',true);
      else aiStatus('全部失败：'+lastErr+' —— 若提示未配置密钥，请到 Pages 后台设置对应 secret',true);
    }else{
      /* 前端直连：单列，沿用上一轮历史 */
      aiRenderCols(['front']);
      const out=aiColBody('front');
      let acc='',renderedLen=0;
      aiStatus('连接中…（前端直连）');
      const reply=await QMI.interpretStream(cfg,pan,aiHist,d=>{acc+=d;if(out){out.textContent=acc;if(acc.length<1500||acc.length-renderedLen>=1500){out.innerHTML=mdRender(acc);renderedLen=acc.length;}}},(url,init)=>{
        if(aiCtrl)init=Object.assign({},init,{signal:aiCtrl.signal});
        return fetch(url,init);
      });
      if(out){out.textContent=acc;out.innerHTML=mdRender(acc);renderedLen=acc.length;}   /* 流末强制刷新 */
      aiHist.push({role:'user',content:pan},{role:'assistant',content:reply});
      aiStatus('完成 · 继续提问将沿用本盘（模型侧受「追问沿用原盘」约束）');
    }
  }catch(e){
    const msg=e&&e.message?e.message:String(e);
    /* F6：先看独立标志位（aiStop 不再把 aiCtrl 置 null，但标志位最可靠） */
    if(aiAborted||(aiCtrl&&aiCtrl.signal&&aiCtrl.signal.aborted))aiStatus('已停止',true);
    else if(msg.indexOf('Failed to fetch')>=0||msg.indexOf('NetworkError')>=0||msg.indexOf('CORS')>=0)
      aiStatus('解读失败：'+msg+' —— 多为 CORS 跨域（该接口不允许浏览器直调），可换支持跨域的接口或点「复制盘面提示词」',true);
    else aiStatus('解读失败：'+msg,true);
  }finally{aiCtrl=null;}
}
function aiStop(){
  /* F6：先立标志再 abort，且不再把 aiCtrl 置 null（否则收尾判定全部落空） */
  if(aiCtrl){aiAborted=true;aiCtrl.abort();aiStatus('已停止',true);}
  else aiStatus('当前没有进行中的请求',true);
}
function aiCopyFallback(txt){
  const ta=document.createElement('textarea');
  ta.value=txt;
  document.body.appendChild(ta);
  ta.select();
  try{document.execCommand('copy');aiStatus('已复制系统提示词 + 盘面（'+txt.length+' 字），可粘贴到任意对话页求解');}
  catch(e){aiStatus('复制失败，请手动选择文本（'+txt.length+' 字）',true);}
  document.body.removeChild(ta);
}
function aiCopyPan(){
  /* F12：复制给外部对话用，问事随盘面显式附带且仅附一次（与服务端请求体互不叠加） */
  const pan=aiPan(true); if(!pan)return Promise.resolve(null);
  const txt=QMI.SYSTEM_PROMPT+'\n\n────────\n\n'+pan;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    return navigator.clipboard.writeText(txt).then(
      ()=>{aiStatus('已复制系统提示词 + 盘面（'+txt.length+' 字），可粘贴到任意对话页求解');return txt;},
      ()=>aiCopyFallback(txt));
  }
  return Promise.resolve(aiCopyFallback(txt));
}

/* ---------- 初始化 ---------- */
(function init(){
  const sel=document.getElementById('tGZ');
  for(let i=0;i<60;i++){const o=document.createElement('option');o.value=i;o.textContent=gz(i);sel.appendChild(o);}
  aiLoadCfg();
  renderModelChips();
  aiSyncMode(); /* 内部已在 server 模式时 loadModels（F13），本地双击 file:// 不拉清单 */
  renderHistUI(); /* P2-3：翻局按钮初始禁用态 + 0/0 */
  /* 带 #p= 分享链接进来的，保留链接里的时刻、用链接参数起局，不用「现在」覆盖 */
  if(hashRestored)cast();else setNow();
})();
