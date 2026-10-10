/* 审计取证 2：provider 回落模型名 / 节气边界 / 值使中宫 */
const path=require('path');
const PB=path.join(__dirname,'public');
const QM=require(path.join(PB,'engine.js'));

(async()=>{
const L=await import('file:///'+path.join(__dirname,'functions','api','_lib.js').replace(/\\/g,'/'));

console.log('=== F15 · provider 回落时沿用别家模型名 ===');
const envA={DEEPSEEK_API_KEY:'sk-ds'};            // 只配了 DeepSeek，没配 Gemini
console.log('  只配 DeepSeek，请求 model=gemini-3.8-flash →',
  JSON.stringify(L.resolveProvider(envA,{model:'gemini-3.8-flash'})));
console.log('  ↑ base 是 DeepSeek，但 model 仍是 gemini-3.8-flash → 上游必然 400/404');
const envB={GEMINI_API_KEY:'g'};
console.log('  只配 Gemini，请求 model=deepseek-flash →',
  JSON.stringify(L.resolveProvider(envB,{model:'deepseek-flash'})));
const envC={};
console.log('  无任何密钥，请求 model=xxx →',JSON.stringify(L.resolveProvider(envC,{model:'xxx'})));

console.log('\n=== F16 · 节气边界与「时间基准」耦合 ===');
const opt=(clock)=>({lon:120,clock,ziSwap:true,jg:2});
// 找 2026 各节气交节前 eot 分钟内的时刻，比较 std 与 true 选出的节气
let flips=[];
for(const t of QM.termsOfYear(2026)){
  const eot=QM.eqOfTime(t.jd);                    // 分（正值表示真太阳时快）
  const jdTest=t.jd-Math.min(Math.abs(eot),15)/1440;  // 交节前 15 分钟以内
  const d=QM.jdToUTC(jdTest+8/24);
  const Y=d.getUTCFullYear(),M=d.getUTCMonth()+1,D=d.getUTCDate(),H=d.getUTCHours(),MI=d.getUTCMinutes();
  const Rs=QM.cast(Y,M,D,H,MI,opt('std'));
  const Rt=QM.cast(Y,M,D,H,MI,opt('true'));
  if(Rs.meta.term!==Rt.meta.term||Rs.ju!==Rt.ju)
    flips.push({term:t.name,at:`${Y}-${M}-${D} ${H}:${String(MI).padStart(2,'0')}`,eot:eot.toFixed(1),
      std:Rs.meta.term+Rs.ju+'局',true:Rt.meta.term+Rt.ju+'局'});
}
console.log('  切换时间基准导致节气/局数改变的样本数 =',flips.length);
flips.slice(0,4).forEach(f=>console.log('   ',f.at,'交于',f.term,f.eot+'分前','std='+f.std,'true='+f.true));

console.log('\n=== 值使落中宫（旬首六仪入中）处理核对 ===');
for(const hourIdx of [0,10,20,30,40,50]){
  const R=QM.paipan(1,1,hourIdx,2);
  if(R.zfPal===5)console.log('  时干支',QM.gz(hourIdx),'旬首遁',R.xunYi,'入中 → 值符',R.zfStar,'值使',R.zsDoor,'落'+R.zsLuo);
}
console.log('  （抽样完成）');

console.log('\n=== 三奇得使判定宽度 ===');
const R=QM.cast(2026,10,10,9,0,opt('true'));
const gj=R.geju.filter(x=>x.cat==='三奇得使');
console.log('  2026-10-10 09:00 三奇得使命中',gj.length,'条：',gj.map(x=>x.txt).join(' | ')||'无');
console.log('  值使门 =',R.zsDoor);
})();
