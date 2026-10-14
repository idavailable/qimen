/* ============================================================
   奇门遁甲 · M4 AI 流式解读（interpret.js）
   前端直连 OpenAI 兼容接口（chat/completions + stream:true），
   复用 liuyao 的提示词契约与 SSE 双守卫思路。

   浏览器：window.QMI；Node：module.exports（供回归测试）
   依赖：engine.js(QM)、yongshen.js(YS)、prompt.js(QM_PROMPT) 已先加载
   ============================================================ */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'),require('./yongshen.js'),require('./prompt.js'));
  else root.QMI=factory(root.QM,root.YS,root.QM_PROMPT);
})(typeof self!=='undefined'?self:this,function(QM,YS,PROMPT){
  'use strict';

const {PAL,GRID}=QM;
if(typeof PROMPT!=='string'||!PROMPT)throw new Error('interpret.js: 未加载到 prompt.js（QM_PROMPT）');

/* ---------- 入模规模上限（对齐 liuyao LIMITS） ---------- */
const LIMITS={panText:4000,historyTurns:8,perMessage:2000};
/* ---------- SSE 双守卫（对齐 liuyao interpret.js） ---------- */
const SSE_MAX_LINE=1000000;
const SSE_MAX_REPLY=200000;

/* ---------- 系统提示词（唯一来源：prompt.js；与服务端 functions/api/prompt.js 同步） ---------- */
const SYSTEM_PROMPT=PROMPT;

/* ---------- 盘面 → 文本（入模主体，纯函数可测） ---------- */
function buildPanText(R,catId){
  const m=R.meta;
  if(!m)return null; // paipan 直出局无四柱，无法解读
  const py=YS.pillars(R);
  const p2=n=>String(n).padStart(2,'0');
  const isFei=R.pan==='fei';
  const METHOD={chaibu:'拆补法',zhiran:'置闰法',maoshan:'茅山法'};
  const L=[];
  L.push('【奇门遁甲盘面】（'+(isFei?'飞盘派':'转盘派')+' · '+(METHOD[m.method]||'拆补法')+'定局）');
  L.push('起局：'+m.ly+'-'+p2(m.lm)+'-'+p2(m.ld)+' '+p2(m.lh)+':'+p2(m.lmi)+'（'+({std:'北京时间',local:'地方平太阳时',true:'真太阳时'}[m.clock]||m.clock)+'）');
  L.push('四柱：'+py.year+'年 '+py.month+'月 '+py.day+'日 '+py.hour+'时');
  /* 定局句随流派：茅山不看符头；置闰给超神/接气/正授/置闰与上元符头；拆补给符头回溯 */
  if(m.method==='maoshan')
    L.push('局：'+(R.dun===1?'阳遁':'阴遁')+R.ju+'局 · '+m.juTerm+m.yuanName+'（茅山法：交节日当天起算，每 5 日一元，不看符头）');
  else if(m.method==='zhiran')
    L.push('局：'+(R.dun===1?'阳遁':'阴遁')+R.ju+'局 · '+m.juTerm+m.yuanName+'（置闰法·'+m.rule+'，上元符头'+m.fuTou+(m.fuTouBack>0?'，'+m.fuTouBack+'日前':'，当日')+'）');
  else
    L.push('局：'+(R.dun===1?'阳遁':'阴遁')+R.ju+'局 · '+m.term+m.yuanName+'（符头'+m.fuTou+'，'+(m.fuTouBack>0?m.fuTouBack+'日前':'当日')+'）');
  L.push('旬首：'+R.xunName+'（遁'+R.xunYi+'）；时居旬内第'+R.n+'位');
  L.push('值符：'+R.zfStar+'落'+PAL[R.zfTo].gua+R.zfTo+'宫；值使：'+R.zsDoor+'落'+PAL[R.zsLuo].gua+R.zsLuo+'宫');
  if(isFei)L.push('中五宫：飞盘入序，有星有神无门，不做天禽寄宫');
  else L.push('天禽'+(R.tianqin==='yangen-yinkun'?'（阳遁寄艮八 · 阴遁寄坤二）':'随天芮')+'寄'+PAL[R.guest.pal].gua+R.guest.pal+'宫（中宫干'+R.guest.gan+'并显）');
  L.push('旬空：时'+R.xunName+'旬空'+R.kong.hour.zhi.join('、')+'落'+[...new Set(R.kong.hour.pal)].map(p=>PAL[p].gua+p+'宫').join('、')+
        '；日'+QM.gz(R.meta.dayIdx-(R.meta.dayIdx%10)).slice(0,2)+'旬空'+R.kong.day.zhi.join('、')+'落'+[...new Set(R.kong.day.pal)].map(p=>PAL[p].gua+p+'宫').join('、'));
  L.push('驿马：日马'+R.ma.day.zhi+'落'+PAL[R.ma.day.pal].gua+R.ma.day.pal+'宫；年马'+R.ma.year.zhi+'落'+PAL[R.ma.year.pal].gua+R.ma.year.pal+'宫');
  L.push('日干'+R.luo.dayGan+(R.luo.dayDun!==R.luo.dayGan?'（遁'+R.luo.dayDun+'）':'')+'落'+(R.luo.dayPal?PAL[R.luo.dayPal].gua+R.luo.dayPal+'宫':'未上盘')+
        '；时干'+R.luo.hourGan+(R.luo.hourDun!==R.luo.hourGan?'（遁'+R.luo.hourDun+'）':'')+'落'+(R.luo.hourPal?PAL[R.luo.hourPal].gua+R.luo.hourPal+'宫':'未上盘'));
  L.push('');
  L.push('九宫（每宫：'+(isFei?'九神':'八神')+'/九星·八门/天盘干·地盘干；南下北上）');
  for(const p of GRID){
    const sky=p===5?(isFei?R.tian[5]:R.di[5]):R.tian[p];
    const g=(p!==5&&!isFei&&R.guest.pal===p&&R.guest.gan!==R.tian[p])?('（寄中干'+R.guest.gan+'）'):'';
    const starTxt=p===5?(isFei?R.tianStar[5]:'天禽'):R.tianStar[p];
    L.push(PAL[p].gua+p+'宫['+PAL[p].wx+']：'+R.god[p]+' / '+starTxt+'·'+R.door[p]+' / '+sky+g+'·'+R.di[p]);
  }
  L.push('');
  const G=R.geju||[];
  if(G.length){
    L.push('格局检出（'+G.length+'项）：');
    for(const x of G)L.push('  ['+x.t+']'+x.txt.split('——')[0]+'——'+(x.pal?('落'+PAL[x.pal].gua+x.pal+'宫'):'全盘')+'：'+x.txt);
  }else L.push('格局检出：无显著格局');
  L.push('');
  const t=YS.take(R,catId);
  if(t){
    L.push('所问类别：'+t.name);
    for(const x of t.items){
      L.push('  '+x.sym+'（'+x.role+'）：'+(x.pal?('落'+PAL[x.pal].gua+x.pal+'宫'+PAL[x.pal].wx+(x.desc.includes('旬空')?'，旬空':'')):'未上盘')+' — '+x.rel);
    }
    /* 第十轮：分类断法模板（与 CATS 同源于 yongshen.js，只作断法指引，不改写盘面事实） */
    const rule=YS.catRule(catId);
    if(rule)L.push('','【本类断法】'+rule);
    /* 第十轮：应期结构化线索（YS.yingqi：尺度 + 应期支 + 值使宫数，只给线索不断吉凶） */
    const yq=YS.yingqi(R);
    if(yq&&yq.branch){
      L.push('','【应期推算】（结构化线索，供断应期参考；不得改写盘面事实）');
      L.push('用神（日干'+py.day+'）落'+PAL[yq.pal].gua+yq.pal+'宫（地盘支'+yq.palZhi.join('、')+'）');
      L.push('尺度：'+yq.scale+'（'+yq.scaleWhy+'）→ 以'+yq.scaleUnit+'断');
      L.push('应期支：'+yq.branch+' —— '+yq.basis);
      if(yq.valueShi)L.push('值使门落'+yq.valueShi+'宫 → 事期约 '+yq.valueShi+'（随尺度取年/月/日/时，伏吟延长、反吟提前）');
    }
  }
  return L.join('\n').slice(0,LIMITS.panText);
}

/* ---------- 请求体组装（纯函数可测） ---------- */
function buildMessages(panText,history){
  const msgs=[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:panText}];
  (Array.isArray(history)?history:[]).slice(-LIMITS.historyTurns).forEach(m=>{
    if(m&&(m.role==='user'||m.role==='assistant')&&typeof m.content==='string'&&m.content){
      msgs.push({role:m.role,content:m.content.slice(0,LIMITS.perMessage)});
    }
  });
  return msgs;
}

/* ---------- SSE 行解析（纯函数可测；对齐 liuyao readSSE 语义）
   输入 {buf,full}，输出 {buf,full,cut}；守卫①无换行溢出、守卫②正文溢出
   第六轮：ev 可选——服务端会插播 {status}/{warn}/{error}/{fallback} 事件（Gemini 重试与
   回落进度、截断告警），这些不是正文，收进 ev 由调用方展示，绝不拼进 full。 ---------- */
function parseSSEChunk(buf,full,ev){
  if(buf.length>SSE_MAX_LINE)return{buf,full,cut:'LINE_OVERFLOW'};
  let cut=null;
  let idx;
  while((idx=buf.indexOf('\n'))>=0){
    const line=buf.slice(0,idx).trim();
    buf=buf.slice(idx+1);
    if(line.indexOf('data:')!==0)continue;
    const data=line.slice(5).trim();
    if(!data||data==='[DONE]')continue;
    try{
      const j=JSON.parse(data);
      if(ev){
        if(j&&j.status){ev.push({kind:'status',text:String(j.status)});continue;}
        if(j&&j.fallback){ev.push({kind:'fallback',text:String(j.fallback)});continue;}
        if(j&&j.warn){ev.push({kind:'warn',text:String(j.warn)});continue;}
        if(j&&j.error){ev.push({kind:'error',text:String(j.error)});continue;}
      }
      const c=j.choices&&j.choices[0];
      const d=c&&c.delta;
      /* 只取最终答复字段：reasoning_content / reasoning / thinking 是模型思考链，丢弃不入正文 */
      if(d&&typeof d.content==='string'&&d.content)full+=d.content;
      else if(c&&c.message&&typeof c.message.content==='string'&&c.message.content)full+=c.message.content;
    }catch(e){/* 忽略无法解析的分片 */}
  }
  if(full.length>SSE_MAX_REPLY)cut='REPLY_OVERFLOW';
  return{buf,full,cut};
}

/* ---------- 思考链剥离（第六轮） ----------
   有的上游把思考过程直接写进 content（` thinking…` 标签形式）。
   成对标签整段剔除；流式进行中标签尚未闭合时，从起始标签到末尾一并丢弃——
   宁可晚一点出字，也不让思考内容漏进正文。 */
function stripThinking(text){
  if(!text)return '';
  let s=String(text);
  s=s.replace(/<(?:think|thinking|reasoning|analysis)>[\s\S]*?<\/(?:think|thinking|reasoning|analysis)>/gi,'');
  const open=s.match(/<(?:think|thinking|reasoning|analysis)>[\s\S]*$/i);
  if(open)s=s.slice(0,open.index);
  return s;
}

/* ---------- 配置存取（localStorage，浏览器侧） ---------- */
const CFG_KEY='qmi_cfg_v1';
function loadCfg(){
  try{
    if(typeof localStorage==='undefined'||!localStorage)return null;
    const s=localStorage.getItem(CFG_KEY);
    if(!s)return null;
    const c=JSON.parse(s);
    return (c&&typeof c==='object')?c:null;
  }catch(e){return null;}
}
function saveCfg(c){
  try{
    if(typeof localStorage==='undefined'||!localStorage)return false;
    localStorage.setItem(CFG_KEY,JSON.stringify(c));
    return true;
  }catch(e){return false;}
}

/* ---------- 请求发起（fetch 可注入，Node 测试可 mock） ---------- */
function makeRequest(cfg,messages,fetchImpl){
  const f=fetchImpl||(typeof fetch==='function'?fetch:null);
  if(!f)return Promise.reject(new Error('NO_FETCH'));
  if(!cfg||!cfg.base||!cfg.key||!cfg.model)return Promise.reject(new Error('CFG_MISSING'));
  const url=String(cfg.base).replace(/\/+$/,'')+'/chat/completions';
  return f(url,{
    method:'POST',
    headers:{'Authorization':'Bearer '+cfg.key,'Content-Type':'application/json'},
    body:JSON.stringify({model:cfg.model,messages:messages,stream:true})
  });
}

/* ---------- 流式解读主流程
   interpretStream(cfg,panText,history,onDelta,fetchImpl)
   onDelta(deltaText) 每收到一个增量片段回调；返回完整正文。
   兼容：上游忽略 stream 回 JSON → 整段走非流式解析。 ---------- */
async function interpretStream(cfg,panText,history,onDelta,fetchImpl){
  const msgs=buildMessages(panText,history);
  const resp=await makeRequest(cfg,msgs,fetchImpl);
  if(!resp.ok){
    let detail='';
    try{detail=String(await resp.text()).slice(0,300);}catch(e){}
    const err=new Error('HTTP_'+resp.status+(detail?(' '+detail):''));
    err.status=resp.status;
    throw err;
  }
  const ct=String(resp.headers&&resp.headers.get?resp.headers.get('content-type'):'').toLowerCase();
  if(ct.indexOf('text/event-stream')<0){
    /* 非流式兜底（中转站忽略 stream 参数回 JSON） */
    const data=await resp.json();
    const c=data.choices&&data.choices[0];
    const text=stripThinking((c&&c.message&&c.message.content)||'');
    if(!text)throw new Error('EMPTY');
    if(onDelta)onDelta(text);
    return text;
  }
  const reader=resp.body.getReader();
  const dec=new TextDecoder();
  let buf='',full='',vis='',cut=null;
  while(true){
    const r=await reader.read();
    if(r.done)break;
    buf+=dec.decode(r.value,{stream:true});
    const st=parseSSEChunk(buf,full);
    buf=st.buf;full=st.full;
    if(st.cut){cut=st.cut;break;}
    /* 只把「剥掉思考链之后」的可见文本增量喂给界面：思考段落不显示，也不进追问历史 */
    const nv=stripThinking(full);
    if(onDelta&&nv.length>vis.length)onDelta(nv.slice(vis.length));
    vis=nv;
  }
  if(cut){try{await reader.cancel();}catch(e){/* 上游已断开则忽略 */}}
  /* 断流（守卫触发）时保留已收部分（可为空串）；仅正常读完仍无内容才抛 EMPTY */
  if(!full&&!cut)throw new Error('EMPTY');
  return stripThinking(full).slice(0,SSE_MAX_REPLY);
}

return{
  SYSTEM_PROMPT,buildPanText,buildMessages,parseSSEChunk,stripThinking,
  loadCfg,saveCfg,makeRequest,interpretStream,
  LIMITS,SSE_MAX_LINE,SSE_MAX_REPLY,CFG_KEY
};
});
