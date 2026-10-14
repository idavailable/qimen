/* P1-3 流派配置 · jsdom 渲染冒烟（六种组合全覆盖）
   抓的是 test.js 纯函数断言覆盖不到的一层：render() 模板里对 R.guest 的解引用、
   中五宫在飞盘下的星/神/门展示、摘要与中间量卡片的口径切换。
   用法：NODE_PATH=<托管 workspace>/node_modules node _smoke_p13.js
   （与 _audit_dom.js 同一套 jsdom 解析逻辑：优先 require('jsdom')，失败再试本机托管路径） */
const fs=require('fs'),path=require('path');
let JSDOM;
try{({JSDOM}=require('jsdom'));}
catch(e){
  const os=require('os');
  const cands=[
    path.join(os.homedir(),'.workbuddy/binaries/node/workspace/node_modules/jsdom'),
    'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/jsdom',
  ];
  for(const c of cands){try{({JSDOM}=require(c));break;}catch(_){}}
  if(!JSDOM)throw e;
}
const PB=path.join(__dirname,'public');
const html=fs.readFileSync(path.join(PB,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g,''),{url:'https://qimen-2i1.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.alert=m=>{throw new Error('页面 alert: '+m);};
w.scrollTo=()=>{};
for(const f of ['engine.js','yongshen.js','prompt.js','interpret.js'])
  w.eval(fs.readFileSync(path.join(PB,f),'utf8')+'\n//# sourceURL='+f);
w.eval(fs.readFileSync(path.join(PB,'app.js'),'utf8')+'\n//# sourceURL=app.js');

let pass=0,fail=0;
const ck=(n,a,e)=>{const ok=String(a)===String(e);ok?pass++:fail++;console.log((ok?'  ✅ ':'  ❌ ')+n+(ok?'':'  实际='+JSON.stringify(a)+' 期望='+JSON.stringify(e)));};
const setV=(id,v)=>{const el=w.document.getElementById(id);if(!el)throw new Error('缺少元素 #'+id);el.value=v;};

/* 固定输入，只切流派三组，逐一渲染 */
const COMBOS=[
  {pan:'zhuan',method:'chaibu',tq:'suirui'},
  {pan:'fei',  method:'chaibu',tq:'suirui'},
  {pan:'fei',  method:'zhiran',tq:'suirui'},
  {pan:'fei',  method:'maoshan',tq:'suirui'},
  {pan:'zhuan',method:'zhiran',tq:'yangen-yinkun'},
  {pan:'zhuan',method:'maoshan',tq:'yangen-yinkun'},
];
for(const c of COMBOS){
  const tag=c.pan+'/'+c.method+'/'+c.tq;
  try{
    setV('iPan',c.pan);setV('iMethod',c.method);setV('iTq',c.tq);
    w.eval('cast()');
    const out=w.document.getElementById('out').innerHTML;
    const clean=out.replace(/分页参数 NaN 守卫/g,'');
    ck(tag+' 渲染 9 宫',(out.match(/class="pal/g)||[]).length,9);
    ck(tag+' 无 undefined/NaN',clean.indexOf('undefined')<0&&clean.indexOf('NaN')<0,true);
    ck(tag+' 摘要带回执',w.document.getElementById('castMsg').textContent.indexOf('已起局')===0,true);
    /* 中五宫单独一格（从 class="pal mid" 到下一个宫格为止，避免把页尾文案算进来） */
    const midCell=(()=>{const i=out.indexOf('class="pal mid');if(i<0)return '';
      const j=out.indexOf('class="pal',i+10);return out.slice(i,j<0?out.length:j);})();
    if(c.pan==='fei'){
      ck(tag+' 中五宫有星',/class="star">[^<]+</.test(midCell),true);
      ck(tag+' 中五宫无门（—）',/class="door">—</.test(midCell),true);
      ck(tag+' 中五宫标注飞盘入序（不写寄宫）',midCell.indexOf('飞盘：中五入序')>=0&&midCell.indexOf('寄')<0,true);
    }else{
      ck(tag+' 中五宫标天禽',midCell.indexOf('天禽')>=0,true);
      ck(tag+' 中五宫标寄宫',midCell.indexOf('寄')>=0,true);
    }
  }catch(e){fail++;console.log('  ❌ '+tag+' 抛错：'+e.message);}
}

/* 读档回放：saveParams → loadParams → cast 应逐字复现同一盘 */
{
  setV('iPan','fei');setV('iMethod','zhiran');setV('iTq','suirui');
  w.eval('cast()');
  const p=w.eval('saveParams()');
  const first=w.document.getElementById('out').innerHTML;
  setV('iPan','zhuan');setV('iMethod','maoshan');setV('iTq','yangen-yinkun');
  w.eval('loadParams('+JSON.stringify(p)+')');
  ck('读档回放 iPan',w.document.getElementById('iPan').value,'fei');
  ck('读档回放 iMethod',w.document.getElementById('iMethod').value,'zhiran');
  ck('读档回放 iTq',w.document.getElementById('iTq').value,'suirui');
  w.eval('cast()');
  ck('读档回放盘面逐字一致',w.document.getElementById('out').innerHTML===first,true);
  /* 旧档（无 pan/method/tq 字段）回退默认且不置空 */
  const old={date:p.date,time:p.time,lon:p.lon,clock:p.clock,zi:p.zi,ji:p.ji};
  w.eval('loadParams('+JSON.stringify(old)+')');
  ck('旧档缺流派字段回退默认',w.document.getElementById('iPan').value+'/'+w.document.getElementById('iMethod').value+'/'+w.document.getElementById('iTq').value,'zhuan/chaibu/suirui');
  w.eval('cast()');
  ck('旧档回退后仍能起局',(w.document.getElementById('out').innerHTML.match(/class="pal/g)||[]).length,9);
  /* 脏值（不在选项白名单）同样回退，不置空 */
  const dirty=Object.assign({},p,{pan:'bogus',method:'xxx',tq:'zzz'});
  w.eval('loadParams('+JSON.stringify(dirty)+')');
  ck('脏流派值回退默认',w.document.getElementById('iPan').value+'/'+w.document.getElementById('iMethod').value+'/'+w.document.getElementById('iTq').value,'zhuan/chaibu/suirui');
}

/* 校验用局（castTest）在飞盘下也要能画 */
{
  setV('tDun','1');setV('tJu','1');setV('tGZ','32');setV('iPan','fei');
  try{
    w.eval('castTest()');
    ck('校验用局·飞盘可渲染',(w.document.getElementById('out').innerHTML.match(/class="pal/g)||[]).length,9);
    ck('校验用局·飞盘中五有神',w.document.getElementById('out').innerHTML.indexOf('朱雀')>=0,true);
  }catch(e){fail++;console.log('  ❌ 校验用局·飞盘抛错：'+e.message);}
}

console.log('\n====================================================');
console.log('P1-3 渲染冒烟：通过 '+pass+' / 失败 '+fail);
console.log('====================================================');
process.exit(fail?1:0);
