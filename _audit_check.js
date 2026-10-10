/* 审计取证脚本：逐条核对可疑点（只读，不改代码） */
const path=require('path');
const PB=path.join(__dirname,'public');
const QM=require(path.join(PB,'engine.js'));
const YS=require(path.join(PB,'yongshen.js'));
const QMI=require(path.join(PB,'interpret.js'));

const opt={lon:120,clock:'true',ziSwap:true,jg:2};

console.log('=== F12 · buildPanText 长度 vs LIMITS.panText 截断 ===');
let over=0, lens=[];
for(const [y,m,d,h] of [[2026,10,10,9],[2026,3,21,15],[2027,6,21,12],[2025,12,22,3]]){
  const R=QM.cast(y,m,d,h,0,opt);
  for(const c of YS.ALL){
    const t=QMI.buildPanText(R,c)||'';
    lens.push(t.length);
    // 截断检测：末尾是否仍含“所问类别”（用神段）
    const hasCat=t.indexOf('所问类别：')>=0;
    if(!hasCat){over++; if(over<4)console.log('  截断丢用神 →',y+'-'+m+'-'+d,h+'时','cat='+c,'len='+t.length);}
  }
}
lens.sort((a,b)=>b-a);
console.log('  样本数',lens.length,'最长',lens[0],'最短',lens[lens.length-1],'上限',QMI.LIMITS.panText);
console.log('  因截断丢失“所问类别（用神段）”的样本数 =',over);

console.log('\n=== F2 · 立春前（公历年 vs 干支年）四柱 ===');
for(const [y,m,d] of [[2026,1,15],[2026,2,3],[2026,2,5],[2025,1,20]]){
  const R=QM.cast(y,m,d,12,0,opt);
  const py=YS.pillars(R);
  console.log(`  ${y}-${m}-${d}（节气${R.meta.term}）→ 年=${py.yearGZ} 月=${py.monthGZ} 日=${py.dayGZ} 时=${py.hourGZ}`);
}
console.log('  ↑ 传统：干支年以立春为界。2026-01-15 应为 乙巳年（而非丙午），月柱应为 己丑（而非辛丑）');

console.log('\n=== F5 · 经度 0 被 ||120 吞掉（纯表达式核对）===');
console.log('  parseFloat("0")||120 =',(parseFloat('0')||120),'  （期望 0）');
console.log('  parseFloat("-5")||120 =',(parseFloat('-5')||120));
console.log('  前端 cast() 实际取值：lon=parseFloat(iLon)||120 → 输入 0 会变',120);

console.log('\n=== F14 · 服务端模式 chip 模型被 byok 残留覆盖（逻辑核对）===');
(function(){
  const c={base:'https://stale.example/v1',model:'old-manual',key:'sk-old'};   // localStorage 残留
  const body={model:'gemini-3.8-flash'};
  if(c.base&&c.model&&c.key){body.base=c.base;body.model=c.model;body.key=c.key;}
  console.log('  chip 选中 gemini-3.8-flash，body.model 最终 =',body.model,'（被 c.model 覆盖 → 多列全部同模型）');
})();

console.log('\n=== F6 · saves/records 是否按 IP 隔离（读 SQL）===');
const fs=require('fs');
const sv=fs.readFileSync(path.join(__dirname,'functions','api','saves.js'),'utf8');
console.log('  saves GET 语句含 WHERE 条件：',/SELECT[^;]*FROM saves WHERE/i.test(sv));
console.log('  saves GET 是否使用 ip_hash 过滤：',/ip_hash/.test(sv.split('SELECT id, created_at')[1]||''));
const rc=fs.readFileSync(path.join(__dirname,'functions','api','records.js'),'utf8');
console.log('  records GET 是否使用 ip_hash 过滤：',/ip_hash/.test(rc));

console.log('\n=== F25 · 换盘后 aiHist（前端直连历史）是否重置（读源码）===');
const html=fs.readFileSync(path.join(PB,'index.html'),'utf8');
console.log('  render() 内出现 aiStates={} ：',/aiStates=\{\};/.test(html));
console.log('  render() 内出现 aiHist=[] ：',/aiHist=\[\];/.test(html));
console.log('  → aiStates(服务端) 会重置，aiHist(前端直连) 不会 → 换盘后直连历史仍带旧盘');

console.log('\n=== F4 · 停止后状态被覆盖（逻辑核对）===');
console.log('  aiStop(): aiCtrl.abort(); aiCtrl=null; aiStatus("已停止")');
console.log('  catch 判定 if(aiCtrl&&aiCtrl.signal&&aiCtrl.signal.aborted) → aiCtrl 已为 null → 走通用分支');
console.log('  server 模式收尾 okN===0 → aiStatus("全部失败："+lastErr) 覆盖"已停止"');

console.log('\n=== F32/F9 · 限流覆盖面 ===');
for(const f of ['interpret.js','records.js','saves.js','models.js']){
  const s=fs.readFileSync(path.join(__dirname,'functions','api',f),'utf8');
  console.log('  '+f.padEnd(14),'rateLimited 调用次数 =',(s.match(/rateLimited/g)||[]).length);
}
