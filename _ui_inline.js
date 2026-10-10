
/* ============================================================
   界面层：engine.js（QM）提供全部算法，此处只做输入与渲染
   ============================================================ */
const {PAL,GRID,gz,DOOR_WX,ke,TG_WX}=QM;
let curR=null; // 当前解盘对象（供用神区联动）

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
}

function cast(){
  const ds=document.getElementById('iDate').value;
  const ts=document.getElementById('iTime').value;
  if(!ds||!ts){alert('请填写日期与时间');return;}
  const lon=parseFloat(document.getElementById('iLon').value)||120;
  const clock=document.getElementById('iClock').value;
  const ziSwap=document.getElementById('iZi').value==='23';
  const jg=parseInt(document.getElementById('iJi').value);
  const [Y,M,D]=ds.split('-').map(Number);
  const [h0,m0]=ts.split(':').map(Number);
  const R=QM.cast(Y,M,D,h0,m0,{lon,clock,ziSwap,jg});
  curR=R;
  render(R,R.meta);
}

function castTest(){
  const dun=parseInt(document.getElementById('tDun').value);
  const ju=parseInt(document.getElementById('tJu').value);
  const hourIdx=parseInt(document.getElementById('tGZ').value);
  const jg=parseInt(document.getElementById('iJi').value);
  const R=QM.paipan(dun,ju,hourIdx,jg);
  curR=R;
  render(R,{test:true,hourGZ:gz(hourIdx),jg});
}

/* ---------- M3 用神取法（界面层） ---------- */
const relBadge=rel=>{
  const cls=rel==='自身'||rel==='生日干'||rel==='被日干生'?'ji':rel==='克日干'||rel==='日干克'?'xiong':'zhong';
  return `<span class="chip ${cls}" style="margin:0">${rel}</span>`;
};
function renderYongshen(R){
  if(!R||!R.meta||R.meta.test)return; // 校验用局无日时干支，用神区不可用
  const catId=document.getElementById('yCat')?document.getElementById('yCat').value:'qiucai';
  const t=YS.take(R,catId);
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
  const dunBadge=`<span class="badge ${R.dun===1?'yang':'yin'}">${R.dun===1?'阳遁':'阴遁'}${R.ju}局</span>`;
  const guestNote=`天禽随天芮寄 <b>${PAL[R.guest.pal].gua}${R.guest.pal}宫</b>（中宫干 <b>${R.guest.gan}</b> 并显）${R.guest.isZF?' · <b>天禽为值符</b>':''}`;

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
      <tr><th>年干支</th><td><b>${R.nian.gan}${R.nian.zhi}</b> 年（${m.ly}）· 年马星 <b>${R.ma.year.zhi}</b>（${PAL[R.ma.year.pal].gua}${R.ma.year.pal}宫）</td></tr>
      <tr><th>旬空（空亡）</th><td>时${R.xunName}旬空 <b>${R.kong.hour.zhi.join('、')}</b> 落 ${[...new Set(R.kong.hour.pal)].map(p=>PAL[p].gua+p+'宫').join('、')}；日${gz(R.meta.dayIdx-(R.meta.dayIdx%10)).slice(0,2)}旬空 <b>${R.kong.day.zhi.join('、')}</b></td></tr>
      <tr><th>符头（拆补）</th><td>${m.fuTou} 日${m.fuTouBack>0?`（${m.fuTouBack} 日前）`:''} → <b>${m.yuanName}</b></td></tr>
      <tr><th>定局</th><td>${dunBadge} &nbsp; ${m.term}${m.yuanName}＝${R.ju}局</td></tr>
      <tr><th>值符 / 值使</th><td>${R.zfStar} 落 ${PAL[R.zfTo].gua}${R.zfTo}宫 &nbsp;/&nbsp; ${R.zsDoor} 落 ${PAL[R.zsLuo].gua}${R.zsLuo}宫</td></tr>
      <tr><th>中宫寄宫</th><td>${guestNote}</td></tr>
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
    const sky=isMid?R.di[5]:R.tian[p];
    const starTxt=isMid?'天禽':(R.tianStar[p]+(isGuest?'<span style="color:#854F0B">·禽</span>':''));
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
      <div class="fx">${isMid?`中干${R.di[5]} → 寄${PAL[R.guest.pal].gua}${R.guest.pal}宫`:''}</div>
    </div>`;
  }

  const html=head+`
  <div class="card">
    <h2>三、九宫盘</h2>
    <div class="grid">${cells}</div>
    <div class="legend">每宫自上而下：八神 / 九星 · 八门 / <b>天盘干</b>（右上角小字为寄宫之中宫干）· 地盘干 &nbsp;—&nbsp; 南下北上，符合洛书方位<br>标记：<span class="tag zf" style="position:static">值符</span> <span class="tag zs" style="position:static">值使</span> <span class="tag kong" style="position:static">旬空</span>（时/日旬空所落之宫）<span class="tag ma" style="position:static">马</span>（日马星）<span class="tag day" style="position:static">日干</span>（日干六仪落宫）</div>
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
      <tr><th style="width:60px">宫位</th><th>八神</th><th>九星</th><th>八门</th><th>天盘</th><th>地盘</th><th>门宫关系</th></tr>
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
        const starCell=p===5?'天禽':(R.tianStar[p]+(isGuest?' <span style="color:#854F0B">·禽寄</span>':''));
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
      <tr><th>天禽寄宫</th><td>天芮所临 ${PAL[R.guest.pal].gua}${R.guest.pal}宫，中宫干 <b>${R.guest.gan}</b> 并显于该宫天盘</td></tr>
      <tr><th>值使飞行</th><td>自 ${PAL[R.zsPal].gua}${R.zsPal}宫 ${R.forward?'顺':'逆'}飞 ${R.n-1} 步 → ${PAL[R.zsLuo].gua}${R.zsLuo}宫</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>九、算法依据与路线图</h2>
    <div class="note">
      <b>已实现</b>：真太阳时（经度+均时差）· 太阳视黄经求节气（精度约1分钟）· 拆补法定局（符头三元）· 地盘顺仪逆奇飞布 ·
      值符加时干转盘 · 值使按时序洛书飞宫 · 八门随值使转宫 · 八神阳顺阴逆 · 天禽随芮、中宫干寄宫并显 · 旬空（空亡宫）· 日/年驿马 · 日干·时干落宫<br>
      <b>M2 格局库</b>：十干克应 81 格全表（依据权威对照页逐条校正，如庚壬=上格、庚癸=大格、辛壬=凶蛇入狱、壬癸=幼女奸淫）· 三奇应克八宫表 · 九遁（天/地/人/神/鬼/风/云/龙/虎）· 三奇得使 · 玉女守门 · 三奇贵人升殿 · 伏吟反吟（全盘统计）· 六仪击刑 · 三奇入墓 · 门迫/门受制 · 五不遇时<br>
      <b>M3 用神取法</b>：yongshen.js 独立模块 —— 10 大类问事用神表（经营求财/工作求职/恋爱婚姻/疾病/官司/出行/失物/天气/房产/考试）· 日干=求测人、时干=所问事 · 每条用神归约到落宫 + 与日干宫生克（按落宫五行）· 界面「五、问事用神」联动展示<br>
      <b>质量保障</b>：engine.js / yongshen.js / prompt.js / interpret.js 与界面同源；node test.js 回归 248 项（池纪句解三例 / 1080 局不变式 / 寄宫专项 / 旬空驿马落宫 / 克应表 81 格 / 天遁识别 / 用神取法 / M4 流式 / Functions 服务端）全部通过<br><br>
      <b>M4 AI 流式解读</b>：盘面 + 格局 + 用神拼成提示词（四段契约：盘面事实不可改写 / 主次次序 / 追问沿用原盘 / 现实边界，对齐 liuyao interpret.js）·
      两种接入方式 —— <b>服务端代理</b>（线上默认，走本站 <code>/api/interpret</code>，密钥留服务端、解读写入 D1）与 <b>前端直连</b>（本地双击默认，密钥存 localStorage、不经中间服务器）·
      非流式 JSON 兜底 · SSE 双守卫（单行溢出 / 正文 20 万字溢出）· 多轮追问沿用原盘 · 无密钥时「复制盘面提示词」降级<br>
      <b>待实现（M1 余项）</b>：置闰法（超神接气，即《烟波钓叟歌》"超神接气为准的"）· 飞盘派排法 · 年命入局（年干支已备表单、未参与盘局）—— 置闰法涉及流派争议，待《兵法奇门》第二部「用局研究」落地
    </div>
  </div>`;
  document.getElementById('out').innerHTML=html;
  if(curR&&curR.meta&&!curR.meta.test)renderYongshen(curR);
}

/* ---------- M4 AI 流式解读（界面层） ---------- */
let aiHist=[],aiCtrl=null;
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
  aiHist=[];
  document.getElementById('aiOut').textContent='';
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
/* 服务端代理模式：POST /api/interpret，SSE 增量回传，用 QMI.parseSSEChunk 解析 */
async function aiServerStream(pan,onDelta){
  const c=aiCfg();
  const body={pan:pan,cat:aiCat(),pillars:aiPillars(),question:aiQuestion().slice(0,500),history:aiHist.slice(-8)};
  if(c.base&&c.model&&c.key){body.base=c.base;body.model=c.model;body.key=c.key;}
  const init={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  if(aiCtrl)init.signal=aiCtrl.signal;
  const resp=await fetch('/api/interpret',init);
  if(!resp.ok){
    let d='';try{d=String(await resp.text()).slice(0,300);}catch(e){}
    let msg='HTTP_'+resp.status;
    try{const j=JSON.parse(d);if(j&&j.error)msg=String(j.error);}catch(e){if(d)msg+=' '+d;}
    const err=new Error(msg);err.status=resp.status;throw err;
  }
  const ct=String(resp.headers&&resp.headers.get?resp.headers.get('content-type'):'').toLowerCase();
  if(ct.indexOf('text/event-stream')<0){
    const j=await resp.json().catch(()=>null);
    throw new Error((j&&j.error)||'服务端未返回流式响应');
  }
  const reader=resp.body.getReader();const dec=new TextDecoder();
  let buf='',full='',cut=null;
  while(true){
    const r=await reader.read();
    if(r.done)break;
    buf+=dec.decode(r.value,{stream:true});
    const before=full;
    const st=QMI.parseSSEChunk(buf,full);
    buf=st.buf;full=st.full;
    if(st.cut){cut=st.cut;break;}
    if(onDelta&&full.length>before.length)onDelta(full.slice(before.length));
  }
  if(cut){try{await reader.cancel();}catch(e){}}
  if(!full&&!cut)throw new Error('EMPTY');
  return full;
}
async function aiRun(){
  const mode=aiMode();
  const pan=aiPan(mode!=='server'); if(!pan)return; /* 服务端模式下问事单独传，不并进 pan */
  const cfg=aiCfg();
  if(mode==='front'&&(!cfg.base||!cfg.key||!cfg.model)){
    aiStatus('请填写接口地址、模型、密钥三项，或把接入方式改为「服务端代理」',true);return;
  }
  QMI.saveCfg(cfg);
  const out=document.getElementById('aiOut');
  let acc=out.textContent||'';
  if(acc)acc+='\n\n────────\n\n';
  aiCtrl=(typeof AbortController==='function')?new AbortController():null;
  aiStatus('连接中…（'+(mode==='server'?'服务端代理':'前端直连')+'）');
  try{
    const onDelta=d=>{acc+=d;out.textContent=acc;out.scrollTop=out.scrollHeight;};
    let reply;
    if(mode==='server')reply=await aiServerStream(pan,onDelta);
    else reply=await QMI.interpretStream(cfg,pan,aiHist,onDelta,(url,init)=>{
      if(aiCtrl)init=Object.assign({},init,{signal:aiCtrl.signal});
      return fetch(url,init);
    });
    aiHist.push({role:'user',content:pan},{role:'assistant',content:reply});
    aiStatus('完成 · 继续提问将沿用本盘（模型侧受「追问沿用原盘」约束）');
  }catch(e){
    const msg=e&&e.message?e.message:String(e);
    if(aiCtrl&&aiCtrl.signal&&aiCtrl.signal.aborted)aiStatus('已停止',true);
    else if(msg.indexOf('Failed to fetch')>=0||msg.indexOf('NetworkError')>=0||msg.indexOf('CORS')>=0)
      aiStatus('解读失败：'+msg+' —— 多为 CORS 跨域（该接口不允许浏览器直调），可换支持跨域的接口或点「复制盘面提示词」',true);
    else aiStatus('解读失败：'+msg,true);
  }finally{aiCtrl=null;}
}
function aiStop(){
  if(aiCtrl){aiCtrl.abort();aiCtrl=null;aiStatus('已停止',true);}
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
  const pan=aiPan(); if(!pan)return Promise.resolve(null);
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
  setNow();
})();
