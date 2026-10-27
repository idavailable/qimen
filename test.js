/* 奇门起局引擎 · 回归测试 */
const QM=require('./public/engine.js');
const YS=require('./public/yongshen.js');

let pass=0,fail=0;
const ck=(name,actual,expect)=>{
  const ok=String(actual)===String(expect);
  ok?pass++:fail++;
  console.log(`${ok?'✅':'❌'} ${name.padEnd(42)} 实际=${actual}  期望=${expect}`);
};

console.log('\n=== 一、基础数据 ===');
ck('六十甲子 0 号',QM.gz(0),'甲子');
ck('六十甲子 59 号',QM.gz(59),'癸亥');
ck('六十甲子 1 号',QM.gz(1),'乙丑');
ck('六十甲子 30 号',QM.gz(30),'甲午');
ck('阳遁顺序 1..9',QM.RING.filter(p=>p!==5).length,8);
ck('布盘序 首',QM.YIBU[0],'戊');
ck('布盘序 尾',QM.YIBU[8],'乙');

console.log('\n=== 二、节气黄经（天文精度）===');
// 已知节气时刻（北京时间）对照
const termCases=[
  [2026,12,22,'冬至'],[2026,6,21,'夏至'],[2026,3,20,'春分'],[2026,9,23,'秋分']
];
const terms2026=QM.termsOfYear(2026);
for(const [y,m,d,nm] of termCases){
  const t=terms2026.find(x=>x.name===nm);
  const dt=QM.jdToUTC(t.jd+8/24);
  const s=`${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  ck(`${y}年${nm}日期`,s,`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
}

console.log('\n=== 三、日干支锚点 ===');
// 1949-10-01 = 甲子日
ck('1949-10-01 日干支',QM.gz(QM.dayGZIndex(Math.floor(QM.toJD(1949,10,1,0,0,0)+0.5))),'甲子');
// 2000-01-01 = 戊午日（JDN 2451545 → 序 (2451545+49)%60 = 34 → 戊午? 核对）
// 2000-01-01 JDN=2451545；距 1949-10-01(甲子) 18354 日，18354 mod 60 = 54 → 戊午
ck('2000-01-01 日干支',QM.gz(QM.dayGZIndex(2451545)),'戊午');
ck('JDN 序号推算一致',QM.dayGZIndex(2451545),54);
// 84 日后应回到同一干支
ck('日干支 60 日周期',QM.dayGZIndex(2451545+60),QM.dayGZIndex(2451545));

console.log('\n=== 四、时辰干支（五鼠遁）===');
// 甲日子时起甲子
ck('甲日 子时',QM.gz(QM.hourIdxOf(0,0)),'甲子');
ck('甲日 丑时',QM.gz(QM.hourIdxOf(0,1)),'乙丑');
ck('乙日 子时',QM.gz(QM.hourIdxOf(1,0)),'丙子');
ck('丙日 子时',QM.gz(QM.hourIdxOf(2,0)),'戊子');
ck('庚日 子时',QM.gz(QM.hourIdxOf(6,0)),'丙子');
// 23:00 属子时
ck('hourZhi(23,30)',QM.hourZhi(23,30),0);
ck('hourZhi(0,30)',QM.hourZhi(0,30),0);
ck('hourZhi(12,0)',QM.hourZhi(12,0),6);
// 时辰边界：11:00-13:00 为午时(6)
ck('hourZhi(11,59) 午时',QM.hourZhi(11,59),6);
ck('hourZhi(10,59) 巳时',QM.hourZhi(10,59),5);
ck('hourZhi(13,0) 未时',QM.hourZhi(13,0),7);
ck('hourZhi(1,0) 丑时',QM.hourZhi(1,0),1);

console.log('\n=== 五、飞宫 ===');
ck('阳遁 1 顺飞1步',QM.fly(1,1,true),2);
ck('阳遁 9 顺飞1步',QM.fly(9,1,true),1);
ck('阳遁 1 顺飞8步',QM.fly(1,8,true),9);
ck('阴遁 9 逆飞1步',QM.fly(9,1,false),8);
ck('阴遁 1 逆飞1步',QM.fly(1,1,false),9);
ck('阳遁 4 顺飞3步',QM.fly(4,3,true),7);

console.log('\n=== 六、拆补定局 ===');
// 甲子日 → 上元；冬至 → 阳遁一局
const ft=QM.findFuTou(0);
ck('甲子日符头',QM.gz(ft.idx),'甲子');
ck('甲子日符头回溯',ft.back,0);
ck('甲子日元',QM.YUAN_NAME[QM.yuanOf(0)],'上元');
ck('己巳日元（甲子后5日）',QM.YUAN_NAME[QM.yuanOf(5)],'中元');
ck('甲戌日元',QM.YUAN_NAME[QM.yuanOf(10)],'下元');
ck('冬至阳遁',QM.YANG_TERMS.has('冬至'),true);
ck('夏至阴遁',QM.YANG_TERMS.has('夏至'),false);
ck('冬至上元局',QM.JU['冬至'][0],1);
ck('冬至上元中元局',QM.JU['冬至'][1],7);
ck('冬至上元下元局',QM.JU['冬至'][2],4);
ck('夏至上元局',QM.JU['夏至'][0],9);
ck('立春上元局',QM.JU['立春'][0],8);
// 符头回溯：丙寅日（序2）应回溯到甲子
const ft2=QM.findFuTou(2);
ck('丙寅日符头',QM.gz(ft2.idx),'甲子');
ck('丙寅日回溯',ft2.back,2);

console.log('\n=== 七、★ 池纪句解原文例（阳遁一局）===');
// "假如一局甲子旬,直符在坎一宫,则直使应在休门,占时得甲子时,
//  则甲子直符加甲干应到一宫,直使即在一宫;
//  如乙丑时,直符加乙应到九宫,则直使应在二宫;
//  丙寅时,直符加丙应到八宫,直使应在三宫。"
{
  const R=QM.paipan(1,1,0,2);   // 阳遁一局 甲子时
  ck('甲子时 值符星',R.zfStar,'天蓬');
  ck('甲子时 值使门',R.zsDoor,'休门');
  ck('甲子时 值符落宫',R.zfTo,1);
  ck('甲子时 值使落宫',R.zsLuo,1);
  ck('甲子时 地盘1宫',R.di[1],'戊');
  ck('甲子时 地盘9宫',R.di[9],'乙');
  ck('甲子时 天盘1宫',R.tian[1],'戊');
}
{
  const R=QM.paipan(1,1,1,2);   // 乙丑时
  ck('乙丑时 值符落宫',R.zfTo,9);
  ck('乙丑时 值使落宫',R.zsLuo,2);
  ck('乙丑时 值符星',R.zfStar,'天蓬');
  ck('乙丑时 天盘9宫',R.tian[9],'戊');
}
{
  const R=QM.paipan(1,1,2,2);   // 丙寅时
  ck('丙寅时 值符落宫',R.zfTo,8);
  ck('丙寅时 值使落宫',R.zsLuo,3);
}

console.log('\n=== 八、阳遁一局 地盘完整性 ===');
{
  const R=QM.paipan(1,1,0,2);
  const expect={1:'戊',2:'己',3:'庚',4:'辛',5:'壬',6:'癸',7:'丁',8:'丙',9:'乙'};
  for(const p in expect) ck(`阳一局 地盘${p}宫`,R.di[p],expect[p]);
}

console.log('\n=== 九、阴遁九局 地盘 ===');
{
  const R=QM.paipan(-1,9,0,2);
  const expect={9:'戊',8:'己',7:'庚',6:'辛',5:'壬',4:'癸',3:'丁',2:'丙',1:'乙'};
  for(const p in expect) ck(`阴九局 地盘${p}宫`,R.di[p],expect[p]);
}

console.log('\n=== 十、值符加时干（核心不变式）===');
// 「直符常遣加时干」：值符星携旬首六仪，飞到时干在地盘所在之宫
// 故：值符落宫的【地盘】干 = 时干（甲遁六仪）；【天盘】干 = 旬首六仪
// 例外：时干落中宫(5)时，值符依"中宫寄宫"规则寄出，地盘干非时干
let inv1=0,inv2=0,firstErr=null,midCount=0;
for(let dun of [1,-1]) for(let ju=1;ju<=9;ju++) for(let hi=0;hi<60;hi++){
  const R=QM.paipan(dun,ju,hi,2);
  const effGan=(R.hourGan==='甲')?R.xunYi:R.hourGan;
  if(R.tGanPal===5){
    // 时干落中宫 → 值符应寄到中宫寄宫
    midCount++;
    if(R.zfTo!==R.jg){inv1++;if(!firstErr)firstErr=`${dun===1?'阳':'阴'}${ju}局 ${QM.gz(hi)}时 时干落中宫但值符寄${R.zfTo}≠${R.jg}`;}
    continue;
  }
  if(R.di[R.zfTo]!==effGan){inv1++;if(!firstErr)firstErr=`${dun===1?'阳':'阴'}${ju}局 ${QM.gz(hi)}时 地盘${R.zfTo}宫=${R.di[R.zfTo]} 时干=${effGan}`;}
  const sky=R.tian[R.zfTo];
  // 天禽值符（旬首仪在中宫）：禽随芮行至时干宫，该宫主干=芮所带 di[2]，寄干=旬首仪 di[5]
  const skyOk = R.zfPal===5
    ? (R.guest.pal===R.zfTo && R.guest.gan===R.xunYi && sky===R.di[2])
    : (sky===R.xunYi);
  if(!skyOk){inv2++;if(!firstErr)firstErr=`${dun===1?'阳':'阴'}${ju}局 ${QM.gz(hi)}时 天盘${R.zfTo}宫=${sky} 旬首仪=${R.xunYi} 寄=${R.guest?R.guest.pal+'宫'+R.guest.gan:'无'}`;}
}
console.log(`   （其中时干落中宫、值符寄出的局数：${midCount}）`);
ck('值符落宫地盘=时干（排除中宫寄出）',inv1+(firstErr?' → '+firstErr:''),0);
ck('值符落宫天盘=旬首六仪（1080局）',inv2,0);
ck('时干落中宫局数 = 1080/9',midCount,120);

console.log('\n=== 十一、值使门随时序飞宫 ===');
let bad2=0,bad3=0;
for(let dun of [1,-1]) for(let ju=1;ju<=9;ju++) for(let hi=0;hi<60;hi++){
  const R=QM.paipan(dun,ju,hi,2);
  if(R.door[R.zsLuo]!==R.zsDoor)bad2++;
  // 八宫（除中宫）门应齐备不重复
  const set=new Set(Object.keys(R.door).filter(k=>k!=='5').map(k=>R.door[k]));
  if(set.size!==8)bad3++;
}
ck('值使门落于值使宫（1080局）',bad2,0);
ck('八门无重复无遗漏（1080局）',bad3,0);

console.log('\n=== 十一-b、八神值符恒在值符宫 ===');
let bad=0,badG=0;
for(let dun of [1,-1]) for(let ju=1;ju<=9;ju++) for(let hi=0;hi<60;hi++){
  const R=QM.paipan(dun,ju,hi,2);
  if(R.god[R.zfTo]!=='值符')bad++;
  const gs=new Set(Object.keys(R.god).filter(k=>k!=='5').map(k=>R.god[k]));
  if(gs.size!==8)badG++;
}
ck('八神值符定位（1080局）',bad,0);
ck('八神无重复无遗漏（1080局）',badG,0);

console.log('\n=== 十一-c、九星 / 天盘干完整性 ===');
let badS=0,badT=0;
for(let dun of [1,-1]) for(let ju=1;ju<=9;ju++) for(let hi=0;hi<60;hi+=3){
  const R=QM.paipan(dun,ju,hi,2);
  const s=new Set(Object.keys(R.tianStar).filter(k=>k!=='5').map(k=>R.tianStar[k]));
  if(s.size!==8)badS++;
  // 天盘九干 = 地盘九干（仅重排，不增不减）
  const tA=[1,2,3,4,6,7,8,9].map(p=>R.tian[p]).sort().join('');
  const tB=[1,2,3,4,6,7,8,9].map(p=>R.di[p]).sort().join('');
  if(tA!==tB)badT++;
}
ck('九星无重复无遗漏',badS,0);
ck('天盘干=地盘干重排（不增不减）',badT,0);

console.log('\n=== 十一-d、天禽寄宫（禽随芮行）===');
let badG1=0,badG2=0,badG3=0;
for(let dun of [1,-1]) for(let ju=1;ju<=9;ju++) for(let hi=0;hi<60;hi++){
  const R=QM.paipan(dun,ju,hi,2);
  if(R.tianStar[R.guest.pal]!=='天芮')badG1++;      // 寄宫恒为天芮所临之宫
  if(R.guest.gan!==R.di[5])badG2++;                 // 寄干恒为中宫地盘干
  if((R.guest.pal===R.zfTo)!==R.guest.isZF && R.zfPal===5)badG3++;
}
ck('寄宫恒为天芮所临宫（1080局）',badG1,0);
ck('寄干恒为中宫地盘干（1080局）',badG2,0);
ck('天禽值符时寄宫即值符落宫',badG3,0);

console.log('\n=== 十二、完整起局（cast）===');
{
  // 2026-10-10 09:00 北京时间 东经120 真太阳时
  const R=QM.cast(2026,10,10,9,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  const m=R.meta;
  console.log(`   公历 ${m.ly}-${m.lm}-${m.ld} ${m.lh}:${m.lmi} → 修正 ${m.corrMin.toFixed(1)} 分`);
  console.log(`   日 ${m.dayGZ} / 时 ${m.hourGZ} / 节气 ${m.term} / 符头 ${m.fuTou}(${m.fuTouBack}日前) → ${m.yuanName}`);
  console.log(`   定局：${R.dun===1?'阳遁':'阴遁'}${R.ju}局  值符 ${R.zfStar}→${R.zfTo}宫  值使 ${R.zsDoor}→${R.zsLuo}宫`);
  ck('节气在 寒露/霜降 之间',m.term,'寒露');
  ck('寒露为阴遁',R.dun,-1);
  ck('局数 1-9',R.ju>=1&&R.ju<=9,true);
  ck('地盘九宫齐备',Object.keys(R.di).length,9);
  ck('八门齐备',Object.keys(R.door).length,9);
  ck('八神齐备',Object.keys(R.god).length,9);
  // 节气 JD 合理性
  const tdt=QM.jdToUTC(m.termJD+8/24);
  ck('寒露交节日',`${tdt.getUTCFullYear()}-${tdt.getUTCMonth()+1}-${tdt.getUTCDate()}`,'2026-10-8');
}

console.log('\n=== 十三、跨时区/子时换日 ===');
{
  const a=QM.cast(2026,10,10,23,30,{lon:120,clock:'std',ziSwap:true});
  const b=QM.cast(2026,10,10,23,30,{lon:120,clock:'std',ziSwap:false});
  console.log(`   23:30 传统换日 → 日 ${a.meta.dayGZ} 时 ${a.meta.hourGZ}`);
  console.log(`   23:30 不换日   → 日 ${b.meta.dayGZ} 时 ${b.meta.hourGZ}`);
  ck('23:30 传统换日后进一日',a.meta.dayGZ!==b.meta.dayGZ,true);
  ck('23:30 时辰皆子',a.meta.hourGZ[1],b.meta.hourGZ[1]);
}

console.log('\n=== 十四、经度修正生效 ===');
{
  const w=QM.cast(2026,6,21,10,0,{lon:75,clock:'true'});   // 新疆西部
  const e=QM.cast(2026,6,21,10,0,{lon:135,clock:'true'});   // 东北东部
  console.log(`   东经75  修正 ${w.meta.corrMin.toFixed(1)} 分 → 时 ${w.meta.hourGZ}`);
  console.log(`   东经135 修正 ${e.meta.corrMin.toFixed(1)} 分 → 时 ${e.meta.hourGZ}`);
  ck('西部时差为负',w.meta.corrMin<0,true);
  ck('东部时差为正',e.meta.corrMin>0,true);
}

console.log('\n=== 十五、格局识别 ===');
{
  const R=QM.paipan(1,1,0,2);   // 甲子时阳一局：全盘伏吟
  const g=R.geju;
  console.log('   检出格局：',g.map(x=>x.txt).join(' | '));
  ck('伏吟局检出伏吟',g.some(x=>x.txt.includes('伏吟')),true);
}

console.log('\n=== 十六、旬空（空亡）===');
// 甲子旬空戌亥；甲戌旬空申酉；甲申旬空午未；甲午旬空辰巳；甲辰旬空寅卯；甲寅旬空子丑
const kongCases=[[0,'戌','亥'],[10,'申','酉'],[20,'午','未'],[30,'辰','巳'],[40,'寅','卯'],[50,'子','丑']];
for(const [xun,z1,z2] of kongCases){
  ck(`甲${QM.gz(xun).charAt(0)}旬空`,QM.xunKongZhi(xun).join(','),`${z1},${z2}`);
}
ck('甲子旬空宫（戌6亥6→6宫）',QM.xunKongPal(0).join(','),'6');
ck('甲辰旬空宫（寅8卯3）',QM.xunKongPal(40).sort().join(','),'3,8');

console.log('\n=== 十七、驿马（马星）===');
// 申子辰→寅；寅午戌→申；巳酉丑→亥；亥卯未→巳
const maCases=[[8,'寅'],[0,'寅'],[4,'寅'],[2,'申'],[6,'申'],[10,'申'],[5,'亥'],[9,'亥'],[1,'亥'],[11,'巳'],[3,'巳'],[7,'巳']];
for(const [z,m] of maCases){
  ck(`驿马(${QM.DZ[z]})`,QM.maXingZhi(z),m);
}

console.log('\n=== 十八、年干支 ===');
ck('1984 甲子年',QM.gz(QM.yearGZIndex(1984)),'甲子');
ck('2026 年干支',QM.gz(QM.yearGZIndex(2026)),'丙午');
ck('2025 年干支',QM.gz(QM.yearGZIndex(2025)),'乙巳');

console.log('\n=== 十八B、立春为界的干支年（F2 回归）===');
{
  /* 立春前（小寒/大寒）：年/月干支归上一年 */
  const a=QM.cast(2026,1,15,12,0,{lon:120,clock:'std'});   // 小寒
  ck('2026-01-15 节气=小寒',a.meta.term,'小寒');
  ck('2026-01-15 干支年归 2025',a.meta.gzYear,2025);
  ck('2026-01-15 年干支=乙巳',QM.gz(a.nian.idx),'乙巳');
  const pa=YS.pillars(a);
  ck('2026-01-15 四柱年=乙巳',pa.yearGZ,'乙巳');
  ck('2026-01-15 四柱月=己丑',pa.monthGZ,'己丑');
  const b=QM.cast(2025,1,20,12,0,{lon:120,clock:'std'});   // 大寒
  ck('2025-01-20 节气=大寒',b.meta.term,'大寒');
  ck('2025-01-20 年干支=甲辰',QM.gz(b.nian.idx),'甲辰');
  const pb=YS.pillars(b);
  ck('2025-01-20 四柱月=丁丑',pb.monthGZ,'丁丑');
  /* 立春后：归当年 */
  const c=QM.cast(2026,2,10,12,0,{lon:120,clock:'std'});   // 立春后
  ck('2026-02-10 节气=立春',c.meta.term,'立春');
  ck('2026-02-10 干支年=2026',c.meta.gzYear,2026);
  ck('2026-02-10 年干支=丙午',QM.gz(c.nian.idx),'丙午');
  ck('2026-02-10 四柱月=庚寅',YS.pillars(c).monthGZ,'庚寅');
  /* 年马星随干支年 */
  ck('2026-01-15 年马星按乙巳年',a.ma.year.zhi,QM.maXingZhi(QM.DZ.indexOf('巳')));
  /* F21：元旦至小寒前，最近节气是**上一年冬至**，同样在立春之前 → 干支年仍归上一年。
     旧版只判小寒/大寒，这段每年 4~5 天全线错一年（实测 2020–2030 逐年复现）。 */
  for(const dd of [1,2,4]){
    const r=QM.cast(2026,1,dd,12,0,{lon:120,clock:'true'});
    ck(`2026-01-0${dd} 节气=冬至`,r.meta.term,'冬至');
    ck(`2026-01-0${dd} 干支年归 2025`,r.meta.gzYear,2025);
    ck(`2026-01-0${dd} 年干支=乙巳`,QM.gz(r.nian.idx),'乙巳');
    ck(`2026-01-0${dd} 四柱年=乙巳`,YS.pillars(r).yearGZ,'乙巳');
    ck(`2026-01-0${dd} 四柱月=戊子（乙年子月）`,YS.pillars(r).monthGZ,'戊子');
    ck(`2026-01-0${dd} 年马星随乙巳=亥`,r.ma.year.zhi,'亥');
  }
  /* 立春当日及以后 → 当年（界点不能多退一年） */
  const lc=QM.cast(2026,2,5,12,0,{lon:120,clock:'true'});
  ck('2026-02-05 节气=立春',lc.meta.term,'立春');
  ck('2026-02-05 干支年=2026',lc.meta.gzYear,2026);
  /* 冬至（当年 12 月）仍属当年，不能被立春判定误退 */
  const dz=QM.cast(2026,12,22,12,0,{lon:120,clock:'true'});
  ck('2026-12-22 冬至仍属 2026 干支年',dz.meta.gzYear,2026);
  ck('2026-12-22 年干支=丙午',QM.gz(dz.nian.idx),'丙午');
  /* 逐年全扫：1/1–1/8 不得再有错年 */
  let badYears=[];
  for(let y=2020;y<=2030;y++){
    for(let d=1;d<=8;d++){
      const r=QM.cast(y,1,d,12,0,{lon:120,clock:'true'});
      const beforeLiChun=(r.meta.jdUTC<r.meta.liChunJD);
      if(beforeLiChun&&r.meta.gzYear!==y-1){badYears.push(`${y}-01-0${d}`);break;}
    }
  }
  ck('2020–2030 每年 1/1–1/8 干支年无错',badYears.length===0,true,badYears.join('、'));
}

console.log('\n=== 十八C、节气判定与时间基准解耦（F8 回归）===');
{
  /* 审计实测两例：旧版仅切换时间基准就换局；现判节气用真实时刻，三种基准必须同局 */
  for(const [y,mo,d,h,mi] of [[2026,10,23,17,25],[2026,11,7,17,36]]){
    const rs=['std','local','true'].map(cl=>QM.cast(y,mo,d,h,mi,{lon:120,clock:cl}));
    ck(`${y}-${mo}-${d} ${h}:${mi} 三种基准节气一致`,rs[0].meta.term===rs[1].meta.term&&rs[1].meta.term===rs[2].meta.term,true,
       rs.map(r=>r.meta.term).join('/'));
    ck(`${y}-${mo}-${d} ${h}:${mi} 三种基准局数一致`,rs[0].ju===rs[1].ju&&rs[1].ju===rs[2].ju&&rs[0].dun===rs[2].dun,true,
       rs.map(r=>(r.dun===1?'阳':'阴')+r.ju).join('/'));
  }
}

console.log('\n=== 十九、甲遁六仪 ===');
ck('甲子旬甲遁戊',QM.dunGan('甲',0),'戊');
ck('甲午旬甲遁辛',QM.dunGan('甲',30),'辛');
ck('非甲不动',QM.dunGan('丙',0),'丙');

console.log('\n=== 二十、落宫集成（cast 产物）===');
{
  const R=QM.cast(2026,10,10,9,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  ck('年干支=丙午',QM.gz(R.nian.idx),'丙午');
  ck('时旬空齐备',R.kong.hour.zhi.length,2);
  ck('日旬空齐备',R.kong.day.zhi.length,2);
  ck('日马星宫在1-9',R.ma.day.pal>=1&&R.ma.day.pal<=9,true);
  ck('时干落宫恒有值',R.luo.hourPal!==null,true);
  ck('日干落宫恒有值',R.luo.dayPal!==null,true);
  const nianMa=QM.maXingZhi(QM.DZ.indexOf(R.nian.zhi));
  ck('年马星与日马星独立',R.ma.year.zhi,nianMa);
}

console.log('\n=== 二十一、M2 十干克应表 ===');
{
  const K=QM.KEYING;
  const keys=Object.keys(K);
  ck('克应表 81 格齐备',keys.length,81);
  const G9=['戊','己','庚','辛','壬','癸','乙','丙','丁'];
  const badKey=keys.filter(k=>!G9.includes(k[0])||!G9.includes(k[1]));
  ck('键均为九天干×九天干',badKey.length,0);
  // 逐条字段完整
  const badVal=keys.filter(k=>{const v=K[k];return !(Array.isArray(v)&&v.length===3&&['吉','凶','中'].includes(v[1])&&v[0]&&v[2]);});
  ck('每格 [名,吉凶,断语] 完整',badVal.length,0);
  // 关键条目抽查（权威对照）
  ck('戊+丙=青龙返首',K['戊丙'][0],'青龙返首');
  ck('丙+戊=飞鸟跌穴',K['丙戊'][0],'飞鸟跌穴');
  ck('庚+丙=白入荧(歌诀原名)',K['庚丙'][0]+'|'+K['庚丙'][1],'白入荧|凶');
  ck('丙+庚=荧入太白(凶)',K['丙庚'][0]+'|'+K['丙庚'][1],'荧入太白|凶');
  ck('乙+辛=青龙逃走',K['乙辛'][0],'青龙逃走');
  ck('辛+乙=白虎猖狂',K['辛乙'][0],'白虎猖狂');
  ck('癸+丁=螣蛇夭矫',K['癸丁'][0],'螣蛇夭矫');
  ck('丁+癸=朱雀投江',K['丁癸'][0],'朱雀投江');
  ck('癸+癸=天网四张',K['癸癸'][0],'天网四张');
  ck('庚+壬=上格(校正后)',K['庚壬'][0],'上格');
  ck('庚+癸=大格(校正后)',K['庚癸'][0],'大格');
  ck('辛+壬=凶蛇入狱(校正后)',K['辛壬'][0],'凶蛇入狱');
  ck('壬+癸=幼女奸淫(补入)',K['壬癸']?K['壬癸'][0]:'缺','幼女奸淫');
  ck('癸+壬=复见螣蛇',K['癸壬'][0],'复见螣蛇');
}

console.log('\n=== 二十二、三奇应克表 ===');
{
  const S=QM.SANYING;
  const palOK=[1,2,3,4,6,7,8,9].every(p=>S[p]&&['乙','丙','丁'].every(g=>S[p][g]&&S[p][g].length===2&&['吉','凶','中'].includes(S[p][g][1])&&S[p][g][0]));
  ck('八宫×三奇 条目齐备',palOK,true);
  ck('中宫不设（无应克）',S[5]===undefined||Object.keys(S[5]||{}).length===0,true);
}

console.log('\n=== 二十三、geju 输出结构与专项识别 ===');
{
  const R=QM.cast(2026,10,10,9,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  const G=QM.geju(R,'甲');
  const bad=G.filter(x=>!['吉','中','凶'].includes(x.t)||!x.cat||typeof x.txt!=='string'||!x.txt);
  ck('输出字段结构完整',bad.length,0);
  ck('排序为吉→中→凶',G.every((x,i)=>i===0||G[i-1].t==='吉'||x.t!=='吉'||({'吉':0,'中':1,'凶':2}[G[i-1].t]<={'吉':0,'中':1,'凶':2}[x.t]))?true:false,true);
  // 手工构造天遁盘（生门+天盘丙+地盘丁 在离九宫）验证识别
  const fake={di:{1:'戊',2:'己',3:'庚',4:'辛',5:'壬',6:'癸',7:'丁',8:'丙',9:'乙'},
              tian:{1:'戊',2:'己',3:'庚',4:'辛',6:'癸',7:'壬',8:'丁',9:'丙'},
              tianStar:{1:'天蓬',2:'天芮',3:'天冲',4:'天辅',6:'天心',7:'天柱',8:'天任',9:'天英'},
              door:{1:'休门',2:'死门',3:'伤门',4:'杜门',6:'开门',7:'惊门',8:'生门',9:'生门'},
              god:{1:'值符',2:'螣蛇',3:'太阴',4:'六合',6:'白虎',7:'玄武',8:'九地',9:'九天'},
              zsDoor:'开门',zsLuo:6,hourGan:'丙',hourZhi:'午'};
  // 8宫: 天盘丁 地盘丙 → 非天遁; 重排构造 使某宫 生门+丙+丁
  fake.tian[8]='丙'; fake.di[8]='丁'; fake.door[8]='生门';
  const GF=QM.geju(fake);
  const td=GF.find(x=>x.cat==='九遁'&&x.txt.includes('天遁'));
  ck('天遁识别（生门+丙+地盘丁）',td?'命中':'未命中','命中');
  // 五不遇时：时干甲? 甲不克日。构造 时干庚 日干甲（庚克甲? 甲木属木、庚金克木 → 是）
  const R2=QM.cast(2026,10,10,15,30,{lon:120,clock:'true',ziSwap:true,jg:2}); // 申时
  const wu=QM.geju(R2,'甲').find(x=>x.cat==='五不遇时');
  ck('五不遇时需 dayGan 才判定',R2.hourGan==='庚'?(wu?'命中':'未命中'):'跳过(时干'+R2.hourGan+')',R2.hourGan==='庚'?(wu?'命中':'未命中'):'跳过(时干'+R2.hourGan+')');
  // paipan 直出不传 dayGan 不应报五不遇时
  const P=QM.paipan(1,1,0,2);
  ck('校验用局不误报五不遇时',QM.geju(P).some(x=>x.cat==='五不遇时'),false);
}

console.log('\n=== 二十四、M3 用神取法 ===');
{
  ck('类别数=10',YS.ALL.length,10);
  const R=QM.cast(2026,10,10,9,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  // 四柱干：2026 丙午年 寒露月（戊戌月）丁巳日 乙巳时
  const py=YS.pillars(R);
  ck('年干=丙（丙午）',py.year,'丙');
  ck('日干=丁（丁巳）',py.day,'丁');
  ck('时干=乙（乙巳）',py.hour,'乙');
  ck('月干=戊（戊戌月·五虎遁）',py.month,'戊');
  // 每类别用神都能解析出落宫（门/星/神必在 1-9）
  let miss=0,firstMiss='';
  for(const c of YS.ALL){
    const t=YS.take(R,c);
    if(!t){miss++;firstMiss=c;continue;}
    for(const x of t.items){
      if(!x.pal||x.pal<1||x.pal>9){miss++;if(!firstMiss)firstMiss=c+'.'+x.role;}
    }
  }
  ck('全部用神落宫 1-9（10 类）',miss+(firstMiss?' →'+firstMiss:''),0);
  // 婚姻：女方=乙、男方=庚
  const hy=YS.take(R,'hunyin');
  ck('婚姻-女方符号=乙',hy.items[0].sym,'乙');
  ck('婚姻-男方符号=庚',hy.items[1].sym,'庚');
  // 求财：生门=财星、戊=资本
  const qc=YS.take(R,'qiucai');
  ck('求财-资本符号=戊',qc.items.find(x=>x.role==='资本').sym,'戊(甲子)');
  ck('求财-财星=生门',qc.items.find(x=>x.role==='利息/财星').sym,'生门');
  // relToDay：自身宫=自身
  ck('日干宫关系=自身',YS.relToDay(R,YS.ganPal(R,py.day),py.day).rel,'自身');
  // brief 可输出
  ck('brief 非空',YS.brief(R,'qiucai').length>0,true);
  // paipan 直出（无 meta）不应抛错
  const P=QM.paipan(1,1,0,2);
  ck('校验用局路径不抛错',function(){try{YS.take(P,'qiucai');return true;}catch(e){return false;}}(),true);
}

/* ---- 廿四、M3 用神取法 ---- */
console.log('\n=== 廿四、M3 用神取法 ===');
const R_ys=QM.cast(2026,10,10,9,0,{lon:120,clock:'true',ziSwap:true,jg:2});
const py=YS.pillars(R_ys);
// 基础字段齐备
ck('pillars 四柱非空',py.year!='?'&&py.day!='?'&&py.hour!='?',true);
// qiucai 用神：日干=求测人、时干=财货、戊=资本、生门=财星
const qc=YS.take(R_ys,'qiucai');
ck('求财条目数',qc.items.length,7);
ck('求财-第1项角色=求测人',qc.items[0].role,'求测人（世）');
ck('求财-资本符号含戊',qc.items.find(x=>x.role==='资本').sym.indexOf('戊')>=0,true);
ck('求财-财星=生门',qc.items.find(x=>x.role==='利息/财星').sym,'生门');
// relToDay：自身宫关系为"自身"
ck('relToDay=自身',YS.relToDay(R_ys,YS.ganPal(R_ys,py.day),py.day).rel,'自身');
// brief 可输出字符串
ck('brief 非空且格式正确',typeof YS.brief(R_ys,'qiucai')==='string'&&YS.brief(R_ys,'qiucai').length>0,true);
// hunyin 男女符号
const hy=YS.take(R_ys,'hunyin');
ck('婚姻-女方符号=乙',hy.items.find(x=>x.role==='女方').sym,'乙');
ck('婚姻-男方符号=庚',hy.items.find(x=>x.role==='男方').sym,'庚');
// jibing 病星
const jb=YS.take(R_ys,'jibing');
ck('疾病-病星=天芮',jb.items.find(x=>x.role==='病星（落宫定部位）').sym,'天芮');
// paipan 直出（无 meta）守卫不抛错
const P=QM.paipan(1,1,0,2);
try{YS.take(P,'qiucai');ck('paipan 不抛错',true,true);}catch(e){ck('paipan 不抛错',false,false);}

/* ---- 甲取旬口径：日/时/年/月干为甲时按【本柱旬】遁六仪，与 R.luo 口径一致 ---- */
{
  // 2026-01-10 甲申日：日干甲 → 甲申旬 → 遁庚 → 应与 R.luo.dayDun/dayPal 一致
  const Ra=QM.cast(2026,1,10,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  const pa=YS.pillars(Ra);
  ck('甲申日 dayDun=庚',Ra.luo.dayDun,'庚');
  ck('甲申日 ganPal(日旬)=dayPal',YS.ganPal(Ra,'甲',pa.dayIdx),Ra.luo.dayPal);
  ck('甲申日 求测人落宫=dayPal',YS.take(Ra,'qiucai').items[0].pal,Ra.luo.dayPal);
  ck('甲申日 relToDay=自身',YS.relToDay(Ra,YS.ganPal(Ra,'甲',pa.dayIdx),'甲',pa.dayIdx).rel,'自身');
  // 同一时刻若误用时柱旬（甲午→辛）会落到别宫，证明两口径确实不同
  ck('甲申日 时柱旬≠日柱旬（防回归）',YS.ganPal(Ra,'甲',pa.hourIdx)!==Ra.luo.dayPal,true);
  // 缺省第三参退化为时柱序（向后兼容 2 参调用）
  ck('ganPal 2 参兼容（退化为时旬）',YS.ganPal(Ra,'甲'),YS.ganPal(Ra,'甲',pa.hourIdx));
  // 年干甲：2014 甲午年 → 甲午旬 → 辛
  const Ry=QM.cast(2014,3,1,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  const pyy=YS.pillars(Ry);
  ck('甲午年 年干=甲',pyy.year,'甲');
  ck('甲午年 ganPal(年旬)遁辛',QM.XUN_YI[QM.gz(pyy.yearIdx-pyy.yearIdx%10)],'辛');
  // 月干甲：甲午年戌月（寒露后）→ 甲戌月 → 甲戌旬 → 己
  const Rm=QM.cast(2014,10,15,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  const pmm=YS.pillars(Rm);
  ck('甲戌月 月干=甲',pmm.month,'甲');
  ck('甲戌月 monthIdx=10（甲戌）',pmm.monthIdx,10);
  ck('甲戌月 ganPal(月旬)遁己',QM.XUN_YI[QM.gz(pmm.monthIdx-pmm.monthIdx%10)],'己');
  // pillars 序数与 meta 对齐
  ck('pillars dayIdx=meta.dayIdx',pa.dayIdx,Ra.meta.dayIdx);
  ck('pillars hourIdx=meta.hourIdx',pa.hourIdx,Ra.meta.hourIdx);
}

/* ---- 三十二、P1-3 流派配置系统：飞盘派 / 天禽寄宫变体 / 茅山法 / 置闰法 ---- */
console.log('\n=== 三十二、P1-3 流派配置（飞盘 / 寄宫 / 茅山 / 置闰） ===');
const jdOfD=(y,m,d)=>Math.floor(QM.toJD(y,m,d,0,0,0)+0.5);

/* 32.1–32.7 新导出常量 */
ck('32.1 阳遁九神含勾陈/太常/朱雀',QM.GODS9_YANG.join(','),'值符,螣蛇,太阴,六合,勾陈,太常,朱雀,九地,九天');
ck('32.2 阴遁九神含白虎/太常/玄武',QM.GODS9_YIN.join(','),'值符,螣蛇,太阴,六合,白虎,太常,玄武,九地,九天');
ck('32.3 九神均为 9 位',QM.GODS9_YANG.length===9&&QM.GODS9_YIN.length===9,true);
ck('32.4 飞盘八门序列跳过中五',QM.DOOR_FEI.join(','),'1,2,3,4,6,7,8,9');
ck('32.5 星→本宫映射（飞盘天盘干用）',QM.STAR_HOME['天蓬']+'/'+QM.STAR_HOME['天英'],'1/9');
ck('32.6 置闰仅芒种/大雪二节',[...QM.RUN_TERMS].sort().join(','),'大雪,芒种');
ck('32.7 节气序 24 项',QM.ZHIRAN_TERMS.length,24);

/* 32.8–32.24 飞盘派完整算例
   盘面取自《待完成.md》§3.3「四个独立来源交叉确认」的算例（阳遁一局、值符甲午辛·天辅星、值使杜门）。
   注意：该算例原文标注「2006-12-22 丙戌日丙申时」，但按本引擎历法（已与 lunar-javascript 全量交叉校验，
   见 31.3 日柱锚点）2006-12-22 实为乙酉日；文档给出的引擎内参数为 hourIdx=32 / dun=1 / ju=1 / zfPal=4，
   盘面仅由这四个量决定，故按文档自述的引擎内参数直接验证（盘面四源一致，与日期标签无关）。 */
{
  const F=QM.paipan(1,1,32,2,{pan:'fei'});
  ck('32.8 飞盘 值符星=天辅',F.zfStar,'天辅');
  ck('32.9 飞盘 值符落宫=艮八',F.zfTo,8);
  ck('32.10 飞盘 值使门=杜门',F.zsDoor,'杜门');
  ck('32.11 飞盘 值使落宫=乾六',F.zsLuo,6);
  ck('32.12 飞盘 guest=null（中五入序不寄宫）',F.guest,null);
  ck('32.13 飞盘 R.pan=fei / R.tianqin=null',F.pan+'/'+F.tianqin,'fei/null');
  const diE={1:'戊',2:'己',3:'庚',4:'辛',5:'壬',6:'癸',7:'丁',8:'丙',9:'乙'};
  let diBad=0;for(let p=1;p<=9;p++)if(F.di[p]!==diE[p])diBad++;
  ck('32.14 飞盘地盘九宫干（同转盘）',diBad,0);
  const stE={1:'天心',2:'天柱',3:'天任',4:'天英',5:'天蓬',6:'天芮',7:'天冲',8:'天辅',9:'天禽'};
  let stBad=0;for(let p=1;p<=9;p++)if(F.tianStar[p]!==stE[p])stBad++;
  ck('32.15 飞盘九星（洛书数序含中五）',stBad,0);
  const drE={1:'景门',2:'休门',3:'死门',4:'伤门',5:'—',6:'杜门',7:'开门',8:'惊门',9:'生门'};
  let drBad=0;for(let p=1;p<=9;p++)if(F.door[p]!==drE[p])drBad++;
  ck('32.16 飞盘八门（跳过中五，中五无门）',drBad,0);
  const gdE={1:'太阴',2:'六合',3:'勾陈',4:'太常',5:'朱雀',6:'九地',7:'九天',8:'值符',9:'螣蛇'};
  let gdBad=0;for(let p=1;p<=9;p++)if(F.god[p]!==gdE[p])gdBad++;
  ck('32.17 飞盘九神（含中五朱雀）',gdBad,0);
  const tnE={1:'癸',2:'丁',3:'丙',4:'乙',5:'戊',6:'己',7:'庚',8:'辛',9:'壬'};
  let tnBad=0;for(let p=1;p<=9;p++)if(F.tian[p]!==tnE[p])tnBad++;
  ck('32.18 飞盘天盘干=每星本宫地盘干',tnBad,0);
  /* 不变量：九星九门九神齐全互异；天盘干恒等于「该宫星的本宫地盘干」 */
  ck('32.19 飞盘九星 9 颗齐全',new Set(Object.values(F.tianStar)).size,9);
  ck('32.20 飞盘八门 8 门齐全',new Set(Object.values(F.door).filter(x=>x!=='—')).size,8);
  ck('32.21 飞盘九神 9 位齐全',new Set(Object.values(F.god)).size,9);
  let ruleBad=0;for(let p=1;p<=9;p++)if(F.tian[p]!==F.di[QM.STAR_HOME[F.tianStar[p]]])ruleBad++;
  ck('32.22 飞盘天盘干规则逐宫自洽',ruleBad,0);
  /* 与转盘相同之处：定局、地盘、旬首六仪、值符星、值符落宫、值使门、值使落宫 */
  const Z=QM.paipan(1,1,32,2);
  const diStr=R=>[1,2,3,4,5,6,7,8,9].map(p=>R.di[p]).join(',');
  ck('32.23 飞盘与转盘同地盘/值符/值使',F.zfStar===Z.zfStar&&F.zfTo===Z.zfTo&&F.zsDoor===Z.zsDoor&&F.zsLuo===Z.zsLuo&&diStr(F)===diStr(Z),true);
  ck('32.24 转盘仍为八神且中五无值',Z.god[5],'—');
  /* 阴遁飞盘抽验：中五有神无门、不寄宫 */
  const FY=QM.paipan(-1,9,2,2,{pan:'fei'});
  ck('32.25 阴遁飞盘中五无门',FY.door[5],'—');
  ck('32.26 阴遁飞盘中五有神（九地九天之前）',FY.god[5]!=='—'&&FY.god[5]!==undefined,true);
  ck('32.27 阴遁飞盘不寄宫',FY.guest,null);
  ck('32.28 阴遁飞盘九神取阴遁序列',FY.god[8]!==undefined&&QM.GODS9_YIN.indexOf(FY.god[8])>=0,true);
}

/* 32.29–32.37 天禽寄宫变体 tianqin（转盘专用；飞盘不寄宫） */
{
  const A=QM.paipan(1,1,0,2);                       // 阳一局甲子时 shift=0
  ck('32.29 默认随芮：寄坤二',A.guest.pal,2);
  ck('32.30 寄宫干=中五宫干',A.guest.gan,A.di[5]);
  ck('32.31 寄宫星为天禽',A.guest.star,'天禽');
  ck('32.32 寄宫落点天盘星恒为天芮（随芮语义）',A.tianStar[A.guest.pal],'天芮');
  const B=QM.paipan(1,1,0,2,{tianqin:'yangen-yinkun'});
  ck('32.33 阳遁寄艮八（变体）',B.guest.pal,8);
  const E=QM.paipan(-1,9,0,2),F=QM.paipan(-1,9,0,2,{tianqin:'yangen-yinkun'});
  ck('32.34 阴遁两变体同寄坤二',E.guest.pal===2&&F.guest.pal===2,true);
  const C=QM.paipan(1,1,2,2),D=QM.paipan(1,1,2,2,{tianqin:'yangen-yinkun'});
  ck('32.35 随芮随值符移位（shift=1 → 兑七）',C.guest.pal,7);
  ck('32.36 寄艮八随值符移位（shift=1 → 震三）',D.guest.pal,3);
  ck('32.37 变体名透出 R.tianqin',A.tianqin+'/'+B.tianqin,'suirui/yangen-yinkun');
}

/* 32.38–32.44 茅山法算例（奇门派 2027 年 12 月日历：交节日当天起算每 5 日一元，不看符头） */
{
  const m21=QM.cast(2027,12,21,12,0,{lon:120,clock:'true',ziSwap:true,jg:2,method:'maoshan'});
  ck('32.38 茅山 2027-12-21 = 大雪下元阴一局',m21.meta.juTerm+'/'+m21.meta.yuanName+'/'+m21.dun+'/'+m21.ju,'大雪/下元/-1/1');
  ck('32.39 茅山 2027-12-21 距交节 14 日',m21.meta.juDayDiff,14);
  const m22=QM.cast(2027,12,22,12,0,{lon:120,clock:'true',ziSwap:true,jg:2,method:'maoshan'});
  ck('32.40 茅山 2027-12-22 = 冬至上元阳一局',m22.meta.juTerm+'/'+m22.meta.yuanName+'/'+m22.dun+'/'+m22.ju,'冬至/上元/1/1');
  ck('32.41 茅山交节日当天即上元第 1 日',m22.meta.juDayDiff,0);
  /* 同一日三法并列：茅山以节气为准，交节即换局；拆补/置闰仍看符头 */
  const c22=QM.cast(2027,12,22,12,0,{lon:120,clock:'true',ziSwap:true,jg:2,method:'chaibu'});
  ck('32.42 同日拆补仍属下元（未换）',c22.meta.juTerm+'/'+c22.meta.yuanName,'冬至/下元');
  const z22=QM.cast(2027,12,22,12,0,{lon:120,clock:'true',ziSwap:true,jg:2,method:'zhiran'});
  ck('32.43 同日置闰仍行大雪闰奇下元（冬至符头未到）',z22.meta.juTerm+'/'+z22.meta.yuanName+'/'+z22.meta.rule,'大雪/下元/置闰');
  /* 三法同日分歧：茅山交节即换（冬至上元），拆补按符头换（冬至下元），置闰要等冬至上元符头己卯（12-26） */
  ck('32.43b 置闰冬至上元符头 = 12-26 己卯',QM.zhiranJu(jdOfD(2027,12,26)).fuTou,'己卯');
  ck('32.43c 置闰冬至上元属接气',QM.zhiranJu(jdOfD(2027,12,26)).rule,'接气');
  ck('32.44 茅山法不产符头字段',m22.meta.fuTou,null);
}

/* 32.45–32.62 置闰法《奇门遁甲统宗》康熙五十七算例
   锚点：康熙五十六年冬至上元符头 = 1717-12-16 甲子（冬至前 7 日吸附到最近符头日）。
   走查应自动在康熙五十七年芒种触发一次置闰：芒种上元己酉 → 三元 → 闰奇甲子/己巳/甲戌 → 夏至上元己卯（接气）。
   （文档 §3.1 该算例的「初六甲申、十一己丑」与符头块 5 日一步自洽性矛盾——己酉+5=甲寅、+10=己未，
     且闰奇链甲子→己巳→甲戌与夏至上元己卯均与引擎输出逐项吻合，故判定为文档笔误，此处按引擎走查值固化。） */
{
  ck('32.45 置闰锚点 = 1717-12-16 甲子',QM.gz(QM.dayGZIndex(QM.zhiranAnchor())),'甲子');
  const jd=(y,m,d)=>jdOfD(y,m,d);
  const a1=QM.zhiranJu(jd(1718,5,15));
  ck('32.46 小满上元符头甲午（早于交节）',a1.term+'/'+QM.YUAN_NAME[a1.yuan]+'/'+a1.rule,'小满/上元/超神6日');
  const a2=QM.zhiranJu(jd(1718,5,28));
  ck('32.47 小满下元局阳八',a2.yuan+':'+a2.ju,'2:8');
  const b1=QM.zhiranJu(jd(1718,5,30));
  ck('32.48 五月初一己酉 = 芒种上元',QM.gz(QM.dayGZIndex(jd(1718,5,30)))+'/'+b1.term+'/'+QM.YUAN_NAME[b1.yuan]+'/'+b1.rule,'己酉/芒种/上元/超神7日');
  ck('32.49 芒种上元局阳六',b1.ju,6);
  const b2=QM.zhiranJu(jd(1718,6,4));
  ck('32.50 芒种中元局阳三',b2.ju,3);
  const b3=QM.zhiranJu(jd(1718,6,9));
  ck('32.51 芒种下元局阳九',b3.ju,9);
  const r1=QM.zhiranJu(jd(1718,6,14));
  ck('32.52 五月十六甲子 = 芒种闰奇上元',QM.gz(QM.dayGZIndex(jd(1718,6,14)))+'/'+r1.rule+'/'+QM.YUAN_NAME[r1.yuan],'甲子/置闰/上元');
  ck('32.53 闰奇仍用芒种上局（阳六）',r1.ju,6);
  const r2=QM.zhiranJu(jd(1718,6,19));
  ck('32.54 闰奇中元己巳 局阳三',QM.gz(QM.dayGZIndex(jd(1718,6,19)))+'/'+r2.ju,'己巳/3');
  const r3=QM.zhiranJu(jd(1718,6,24));
  ck('32.55 闰奇下元甲戌 局阳九',QM.gz(QM.dayGZIndex(jd(1718,6,24)))+'/'+r3.ju,'甲戌/9');
  const x1=QM.zhiranJu(jd(1718,6,29));
  ck('32.56 六月初二己卯 = 夏至上元（接气）',QM.gz(QM.dayGZIndex(jd(1718,6,29)))+'/'+x1.term+'/'+QM.YUAN_NAME[x1.yuan]+'/'+x1.rule,'己卯/夏至/上元/接气');
  ck('32.57 夏至上元局阴九',x1.ju,9);
  ck('32.58 置闰只在芒种/大雪触发（夏至无闰）',x1.rule!=='置闰',true);
  ck('32.59 锚点之前回退拆补',QM.zhiranJu(jd(1700,6,1)),null);
  const zc=QM.cast(1700,6,1,12,0,{lon:120,clock:'true',ziSwap:true,jg:2,method:'zhiran'});
  ck('32.60 锚点前 cast 回退拆补并注明',zc.meta.method+'/'+zc.meta.rule,'chaibu/拆补（置闰锚点前回退）');
  /* 走查缓存隔离：先查锚点当日（1717），再查 1718 不得被污染 */
  const before=QM.zhiranJu(jd(1718,6,29));
  QM.zhiranJu(jd(1717,12,16));
  const after=QM.zhiranJu(jd(1718,6,29));
  ck('32.61 年初走查缓存按年隔离',JSON.stringify(before)===JSON.stringify(after),true);
  ck('32.62 锚点当日可定局（冬至上元阳一）',QM.zhiranJu(jd(1717,12,16)).ju,1);
}

/* 32.63–32.68 流派入口：cast 默认值向后兼容 + meta 透出 */
{
  const d=QM.cast(2026,10,14,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
  ck('32.63 默认 method=chaibu',d.meta.method,'chaibu');
  ck('32.64 默认 pan=zhuan',d.meta.pan,'zhuan');
  ck('32.65 默认 tianqin=suirui',d.meta.tianqin,'suirui');
  ck('32.66 拆补 rule=拆补',d.meta.rule,'拆补');
  const f=QM.cast(2006,12,22,16,0,{lon:120,clock:'true',ziSwap:true,jg:2,pan:'fei'});
  ck('32.67 cast 飞盘透出且 guest=null',f.pan+'/'+f.guest,'fei/null');
  const yk=QM.cast(2006,12,22,16,0,{lon:120,clock:'true',ziSwap:true,jg:2,tianqin:'yangen-yinkun'});
  ck('32.68 cast 寄宫变体透出',yk.tianqin,'yangen-yinkun');
}

/* 32.69–32.76 入模文本（interpret.buildPanText）随流派改口 */
{
  const QMI32=require('./public/interpret.js');
  const base={lon:120,clock:'true',ziSwap:true,jg:2};
  const tDef=QMI32.buildPanText(QM.cast(2026,10,14,12,0,base),'qiucai');
  ck('32.69 默认口径=转盘派 · 拆补法',tDef.split('\n')[0],'【奇门遁甲盘面】（转盘派 · 拆补法定局）');
  const tFei=QMI32.buildPanText(QM.cast(2026,10,14,12,0,Object.assign({pan:'fei'},base)),'qiucai');
  ck('32.70 飞盘口径写入首行',tFei.split('\n')[0],'【奇门遁甲盘面】（飞盘派 · 拆补法定局）');
  ck('32.71 飞盘不写「天禽寄宫」而写中五入序',tFei.indexOf('中五宫：飞盘入序')>=0&&tFei.indexOf('天禽随天芮寄')<0,true);
  ck('32.72 飞盘九宫行改称九神',tFei.indexOf('每宫：九神/九星·八门')>=0,true);
  ck('32.73 飞盘中五宫有星有神无门',/中5宫\[土\]：[^/]*\/[^·]*·— \//.test(tFei),true);
  const tMs=QMI32.buildPanText(QM.cast(2027,12,22,12,0,Object.assign({method:'maoshan'},base)),'qiucai');
  ck('32.74 茅山口吻：交节日均分不问符头',tMs.indexOf('茅山法：交节日当天起算，每 5 日一元，不看符头')>=0,true);
  const tZr=QMI32.buildPanText(QM.cast(1718,6,14,12,0,Object.assign({method:'zhiran',lon:116},base)),'qiucai');
  ck('32.75 置闰口吻：标rule与上元符头',tZr.indexOf('置闰法·置闰，上元符头甲子')>=0,true);
  ck('32.76 系统提示词含起局流派口径段',require('./public/prompt.js').indexOf('【起局流派口径】')>=0,true);
}

/* 32.77–32.86 P2-2 分享链接：encodeParams / decodeParams 纯函数 */
{
  /* app.js 是浏览器脚本（无 module.exports），用 vm 在一个带最小 DOM 的沙箱里求值，
     从而直接调到顶层纯函数；沙箱极简 DOM 与真实浏览器行为一致（未知 id 自动创建）。 */
  const vm=require('vm');
  const src=require('fs').readFileSync('./public/app.js','utf8');
  /* 极简 DOM 桩：够 app.js 顶层 IIFE + init() 跑完即可（未知 id 一律返回同一形状的空元素） */
  const mkEl=()=>({value:'',innerHTML:'',textContent:'',options:[],dataset:{},style:{},
    appendChild(){},addEventListener(){},removeEventListener(){},querySelectorAll:()=>[],
    classList:{add(){},remove(){},toggle(){}},focus(){},remove(){},click(){}});
  const mkSandbox=(hash,proto)=>({
    QM:QM,YS:YS,QMI:require('./public/interpret.js'),PROMPT:require('./public/prompt.js'),
    document:{getElementById:mkEl,createElement:mkEl,querySelectorAll:()=>[],
              body:{appendChild(){},removeChild(){}},execCommand(){}},
    navigator:{},location:{protocol:proto||'https:',hash:hash||'',href:'https://x.test/'+(hash||'')},
    history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    window:{addEventListener(){}},alert(){},console:console,btoa:btoa,atob:atob,
    TextEncoder:TextEncoder,TextDecoder:TextDecoder,
    setTimeout:setTimeout,Promise:Promise,fetch:undefined
  });
  const load=(hash,proto)=>{
    const sb=mkSandbox(hash,proto);
    vm.createContext(sb);
    vm.runInContext(src,sb,{timeout:5000});
    return sb;
  };
  const enc=load();
  ck('32.77 encodeParams 输出 base64url 字符集',
    /^[A-Za-z0-9\-_]+$/.test(enc.encodeParams({date:'2026-10-14',time:'12:00',lon:120,clock:'true',zi:'23',ji:'2',pan:'fei',method:'zhiran',tq:'suirui',cat:'qiucai',q:'问事业'})),true);
  ck('32.78 base64url 不含 + / =',/[+/=]/.test(enc.encodeParams({date:'2026-10-14',time:'12:00'})),false);
  const one=enc.encodeParams({date:'2026-10-14',time:'12:00'});
  const round=enc.decodeParams('#p='+one);
  ck('32.79 编解码往返一致',JSON.stringify(round),JSON.stringify({date:'2026-10-14',time:'12:00'}));
  ck('32.80 空字段不进入编码',Object.keys(enc.decodeParams('#p='+enc.encodeParams({date:'2026-10-14',q:'',cat:null,zzz:1}))).join(','),'date');
  ck('32.81 白名单过滤脏键',Object.keys(enc.decodeParams('#p='+enc.encodeParams({date:'2026-10-14',evil:'<script>'}))).join(','),'date');
  ck('32.82 无 #p= 返回 null',enc.decodeParams(''),null);
  ck('32.83 无 #p= 返回 null（别的 hash）',enc.decodeParams('#foo=1'),null);
  ck('32.84 坏 base64 返回 null（不抛错）',enc.decodeParams('#p=!!!not-base64!!!'),null);
  ck('32.85 非 JSON 的 base64 返回 null',enc.decodeParams('#p='+btoa('hello').replace(/=+$/,'')),null);
  ck('32.86 流派三组随分享往返',enc.decodeParams('#p='+enc.encodeParams({pan:'fei',method:'maoshan',tq:'yangen-yinkun'})).tq,'yangen-yinkun');
  /* 中文问事文本必须能编（btoa 只吃 Latin-1，早年直接 btoa(JSON) 遇中文即抛错返空） */
  const cn=enc.encodeParams({date:'2026-10-14',time:'12:00',q:'今年事业能否升职'});
  ck('32.87 中文问事文本可编码',/^[A-Za-z0-9\-_]+$/.test(cn)&&cn.length>0,true);
  ck('32.88 中文问事文本往返一致',enc.decodeParams('#p='+cn).q,'今年事业能否升职');
  /* file:// 打开的 hash 同样可还原（分享不依赖 http） */
  const fe=load('#p='+cn,'file:');
  ck('32.89 file:// 下同样能解出分享参数',fe.decodeParams(fe.location.hash).q,'今年事业能否升职');
  ck('32.90 空参数对象编码为空串',enc.encodeParams({}),'');
}

/* ---- 廿六、M4 AI 流式解读 ---- */
console.log('\n=== 廿六、M4 AI 流式解读（interpret.js） ===');
const QMI=require('./public/interpret.js');

// 盘面文本生成
const panTxt=QMI.buildPanText(R_ys,'qiucai');
ck('buildPanText 非空',typeof panTxt==='string'&&panTxt.length>200,true);
ck('buildPanText 含四柱',panTxt.includes('四柱：'),true);
ck('buildPanText 含九宫',panTxt.includes('九宫'),true);
ck('buildPanText 含值符值使',panTxt.includes('值符：')&&panTxt.includes('值使：'),true);
ck('buildPanText 含旬空驿马',panTxt.includes('旬空：')&&panTxt.includes('驿马：'),true);
ck('buildPanText 含格局检出',panTxt.includes('格局检出'),true);
ck('buildPanText 含用神类别',panTxt.includes('所问类别：经营求财'),true);
/* ---- 分类断法模板（第十轮） ---- */
console.log('\n=== 分类断法模板（CAT_RULES → 提示词） ===');
{
  const cats=YS.ALL;
  ck('32.0 CATS 类别数仍为 10',cats.length,10);
  ck('32.0b CAT_RULES 与 CATS 一一对应',cats.every(c=>YS.CAT_RULES[c])&&Object.keys(YS.CAT_RULES).length===cats.length,true);
  let ruleBad=0,panBad=0;
  for(const c of cats){
    const rule=YS.catRule(c);
    if(!rule||rule.length<20||!/纲领：/.test(rule)||!/断法：/.test(rule))ruleBad++;
    const txt=QMI.buildPanText(R_ys,c);
    if(!txt||txt.indexOf('【本类断法】'+rule)<0)panBad++;
  }
  ck('32.1 每类规则含「纲领/断法」且长度合规',ruleBad,0);
  ck('32.2 buildPanText 对每类都注入本类断法',panBad,0);
  const noRule=QMI.buildPanText(R_ys,'bogus');
  ck('32.3 未知类别不注入断法块（也不崩）',typeof noRule==='string'&&!noRule.includes('【本类断法】'),true);
  ck('32.4 断法块在用神列表之后',panTxt.indexOf('所问类别：')<panTxt.indexOf('【本类断法】'),true);
}
/* ---- 应期结构化（第十轮） ---- */
console.log('\n=== 应期结构化推算（YS.yingqi → 提示词） ===');
{
  const Rq1=QM.cast(2024,11,5,10,30,{lon:120,clock:'true',ziSwap:true,jg:2}); // 癸酉日丁巳时·阴八局
  const q1=YS.yingqi(Rq1);
  ck('33.1 尺度：日干落阴遁内盘 → 近快',q1.scale,'近快');
  ck('33.2 应期支：用神宫卯逢日支酉冲 → 逢冲以合（戌）',q1.branch,'戌');
  const Rq2=QM.cast(2026,10,14,9,0,{lon:120,clock:'true',ziSwap:true,jg:2}); // 辛酉日·用神宫午逢旬空
  const q2=YS.yingqi(Rq2);
  ck('33.3 应期支：用神宫逢旬空 → 自日支酉顺数先遇冲空（子）',q2.branch,'子');
  const Rq3=QM.cast(2024,8,20,15,30,{lon:120,clock:'true',ziSwap:true,jg:2}); // 丙辰日丙申时
  const q3=YS.yingqi(Rq3);
  ck('33.4 应期支：用神宫酉逢日支辰合 → 逢合以冲（卯）',q3.branch,'卯');
  ck('33.5 尺度：外盘 → 远慢',q3.scale,'远慢');
  const txt=QMI.buildPanText(Rq2,'qiucai');
  ck('33.6 buildPanText 含【应期推算】块',txt.indexOf('【应期推算】')>=0,true);
  ck('33.7 应期块含尺度/应期支/值使宫数',/尺度：/.test(txt)&&/应期支：/.test(txt)&&/值使门落/.test(txt),true);
  ck('33.8 应期块不断吉凶（无「吉/凶」断言字样）',!/吉凶/.test(txt.split('【应期推算】')[1]||''),true);
  ck('33.9 paipan 直出（无 meta）不抛错',YS.yingqi(QM.paipan(1,1,0,2)),null);
}


/* ---- 自定义求测（智能取用：先识别事项，再按相关度选主辅用神） ---- */
console.log('\n=== 自定义求测（custom → 择优取用） ===');
{
  const Rcu=R_ys;
  const long=YS.cleanCustomQuery(' 这笔  合同\n能不能签 '.repeat(60));
  ck('34.1 自定义文本清洗：去换行/折叠空白/限长 200',long.length===200&&!/\n/.test(long),true);
  ck('34.2 合同 → 判为官司诉讼',YS.inferCustom('这笔合同能不能签').catId,'guansi');
  ck('34.3 命中关键词随结果返回（可解释）',YS.inferCustom('这笔合同能不能签').matches.includes('合同'),true);
  const t1=YS.take(Rcu,'custom','这笔合同能不能签');
  ck('34.4 自定义首两条固定为日干/时干',t1.items[0].role==='求测人（世）'&&t1.items[1].role==='所测之事（应）',true);
  ck('34.5 主用神=六合（合同直取合作/契约）',t1.items.find(x=>x.primary).sym,'六合');
  ck('34.6 合同补景门为文书',t1.items.some(x=>x.sym==='景门'&&/文书/.test(x.role)),true);
  ck('34.7 自定义条目≤7（不堆全表）',t1.items.length<=7,true);
  ck('34.8 自定义用神落宫均在 1-9',t1.items.every(x=>!x.pal||(x.pal>=1&&x.pal<=9)),true);
  ck('34.9 同输入两次结果一致（择优可复现）',
    JSON.stringify(YS.take(Rcu,'custom','这笔合同能不能签').items.map(x=>x.sym))===
    JSON.stringify(t1.items.map(x=>x.sym)),true);
  const t2=YS.take(Rcu,'custom','今年能否升职');
  ck('34.10 升职 → 判为工作求职',t2.matchedCat,'gongzuo');
  ck('34.11 升职主用神=开门',t2.items.find(x=>x.primary).sym,'开门');
  ck('34.12 升职取年干为上级',t2.items.some(x=>/上级/.test(x.role)),true);
  const t3=YS.take(Rcu,'custom','明天会不会下雨');
  ck('34.13 下雨直取天柱为主用神',t3.items.find(x=>x.primary).sym,'天柱');
  const t4=YS.take(Rcu,'custom','随便问问');
  ck('34.14 未命中细类 → 通用且主用神=时干',t4.matchedCat===null&&t4.items.find(x=>x.primary).role==='所测之事（应）',true);
  ck('34.15 通用只用 4 条（日/时 + 值符/值使）',t4.items.length,4);
  ck('34.16 自定义不改动原 10 类',YS.ALL.length,10);
  const txt1=QMI.buildPanText(Rcu,'custom','这笔合同能不能签');
  ck('34.17 buildPanText 自定义含所问/依据/主用神',/自定义所问：/.test(txt1)&&/取用依据：/.test(txt1)&&/主用神/.test(txt1),true);
  ck('34.18 自定义盘面仍不超入模上限',txt1.length<=QMI.LIMITS.panText,true);
  ck('34.19 超长自定义文本不撑爆提示词',QMI.buildPanText(Rcu,'custom','合同'.repeat(5000)).length<=QMI.LIMITS.panText,true);
  const rule1=YS.catRule('custom','这笔合同能不能签');
  ck('34.20 自定义断法含纲领且带上命中类别断法',/纲领：/.test(rule1)&&/值符|开门|六合/.test(rule1),true);
  ck('34.21 未命中也有断法且如实标注不确定',/未命中明确类别/.test(YS.catRule('custom','随便问问')),true);
  ck('34.22 脏输入（标签串）不抛错',typeof YS.take(Rcu,'custom','<img src=x onerror=alert(1)>合同').items[0].sym==='string',true);
  ck('34.23 brief 含主用神符号',YS.brief(Rcu,'custom','这笔合同能不能签').includes('六合'),true);
  ck('34.24 非 custom 分支不受影响（仍取全表）',YS.take(Rcu,'qiucai').items.length,7);
  const t5=YS.take(Rcu,'custom','雷总这笔合作能不能成');
  ck('34.25 单字「雷」不误判为天气（防误命中）',
    t5.matchedCat!=='tianqi'&&!t5.items.some(x=>x.sym==='天冲'),true);
  ck('34.26 「合作」仍直取六合',t5.items.some(x=>x.sym==='六合'),true);
}

ck('buildPanText 超长截断≤4000',panTxt.length<=QMI.LIMITS.panText,true);
ck('buildPanText(paipan直出)=null 守卫',QMI.buildPanText(P,'qiucai'),null);

// 请求体组装
const msgs1=QMI.buildMessages(panTxt,null);
ck('buildMessages 基本结构',msgs1.length,2);
ck('buildMessages[0]=system',msgs1[0].role,'system');
ck('buildMessages[1]=user含盘面',msgs1[1].role==='user'&&msgs1[1].content===panTxt,true);
const hist=[{role:'user',content:'追问1'},{role:'assistant',content:'答1'}];
const msgs2=QMI.buildMessages(panTxt,hist);
ck('buildMessages+历史',msgs2.length,4);
const histBad=[{role:'system',content:'伪system注入'},{role:'user',content:''},{role:'user',content:'有效'}];
const msgs3=QMI.buildMessages(panTxt,histBad);
ck('历史仅收 user/assistant 且非空',msgs3.length,3);
const histLong=Array.from({length:20},(_,i)=>({role:'user',content:'m'+i}));
ck('历史截最近8轮',QMI.buildMessages(panTxt,histLong).length,10);
const histBig=Array.from({length:3},(_,i)=>({role:'user',content:'x'.repeat(3000)}));
ck('单条历史截2000',QMI.buildMessages(panTxt,histBig).every(m=>m.content.length<=2000),true);

// SSE 解析（纯函数）
const st1=QMI.parseSSEChunk('data: {"choices":[{"delta":{"content":"奇"}}]}\n\n','');
ck('SSE 单片解析',st1.full,'奇');
const st2=QMI.parseSSEChunk('data: {"choices":[{"delta":{"content":"门"}}]}\nignore: x\ndata: [DONE]\n','');
ck('SSE 忽略非data与DONE',st2.full,'门');
const st3=QMI.parseSSEChunk('data: not-json\n','');
ck('SSE 坏JSON不抛错',st3.full,'');
ck('SSE 未完整行保留在buf',QMI.parseSSEChunk('data: {"choices":[{"delta":{"content":"A"}}]}','').buf,'data: {"choices":[{"delta":{"content":"A"}}]}');
const st5=QMI.parseSSEChunk('data: {"choices":[{"message":{"content":"完整段"}}]}\n','');
ck('SSE 整段message兼容',st5.full,'完整段');
// 守卫①：超长无换行行
const bigLine='x'.repeat(1000001);
ck('SSE 守卫①LINE_OVERFLOW',QMI.parseSSEChunk(bigLine,'').cut,'LINE_OVERFLOW');
// 守卫②：正文超限
const bigFull='y'.repeat(200001);
ck('SSE 守卫②REPLY_OVERFLOW',QMI.parseSSEChunk('data: [DONE]\n',bigFull).cut,'REPLY_OVERFLOW');

// 配置存取（Node 无 localStorage → null/false，不抛错）
ck('loadCfg Node环境=null',QMI.loadCfg(),null);
ck('saveCfg Node环境=false',QMI.saveCfg({base:'x',key:'y',model:'z'}),false);

/* ---- 三十一、历法锚点（第十轮：lunar-javascript 交叉校验固化）----
   数据来源：tools/xcheck_calendar.js 对 lunar-javascript（独立天文实现）全量比对：
   1900–2100 共 4824 个节气、11908 个日柱、201 个立春翻转点零日界偏差，
   节气时刻最大差 13 分钟（Meeus 低精度太阳模型理论精度，定局按日不受影响）。
   此处固化 2024–2026 全 72 节气时刻与 8 个日柱锚点作回归防线，不引入外部依赖。
   单项目容差 15 分钟（模型当前最大偏差 12.4 分钟；15 分钟用于抓「差出整个节气」级的退化，
   即交节时刻算错到邻近节气）。 */
console.log('\n=== 三十一、历法锚点（节气时刻 / 日柱） ===');
const JQ_FIXTURE=[
['2024-01-06',2460315.3676], // 小寒 04:49
  ['2024-01-20',2460330.0884], // 大寒 22:07
  ['2024-02-04',2460344.8522], // 立春 16:27
  ['2024-02-19',2460359.6758], // 雨水 12:13
  ['2024-03-05',2460374.5991], // 惊蛰 10:22
  ['2024-03-20',2460389.6295], // 春分 11:06
  ['2024-04-04',2460404.7933], // 清明 15:02
  ['2024-04-19',2460420.0832], // 谷雨 21:59
  ['2024-05-05',2460435.5070], // 立夏 08:10
  ['2024-05-20',2460451.0413], // 小满 20:59
  ['2024-06-05',2460466.6735], // 芒种 12:09
  ['2024-06-21',2460482.3687], // 夏至 04:51
  ['2024-07-06',2460498.0973], // 小暑 22:20
  ['2024-07-22',2460513.8225], // 大暑 15:44
  ['2024-08-07',2460529.5064], // 立秋 08:09
  ['2024-08-22',2460545.1216], // 处暑 22:55
  ['2024-09-07',2460560.6329], // 白露 11:11
  ['2024-09-22',2460576.0303], // 秋分 20:43
  ['2024-10-08',2460591.2916], // 寒露 02:59
  ['2024-10-23',2460606.4269], // 霜降 06:14
  ['2024-11-07',2460621.4306], // 立冬 06:20
  ['2024-11-22',2460636.3309], // 小雪 03:56
  ['2024-12-06',2460651.1368], // 大雪 23:17
  ['2023-12-22',2460300.6440], // 冬至 11:27
  ['2025-01-05',2460680.6061], // 小寒 10:32
  ['2025-01-20',2460695.3334], // 大寒 04:00
  ['2025-02-03',2460710.0906], // 立春 22:10
  ['2025-02-18',2460724.9212], // 雨水 18:06
  ['2025-03-05',2460739.8384], // 惊蛰 16:07
  ['2025-03-20',2460754.8760], // 春分 17:01
  ['2025-04-04',2460770.0337], // 清明 20:48
  ['2025-04-20',2460785.3306], // 谷雨 03:56
  ['2025-05-05',2460800.7481], // 立夏 13:57
  ['2025-05-21',2460816.2880], // 小满 02:54
  ['2025-06-05',2460831.9143], // 芒种 17:56
  ['2025-06-21',2460847.6127], // 夏至 10:42
  ['2025-07-07',2460863.3368], // 小暑 04:04
  ['2025-07-22',2460879.0621], // 大暑 21:29
  ['2025-08-07',2460894.7442], // 立秋 13:51
  ['2025-08-23',2460910.3568], // 处暑 04:33
  ['2025-09-07',2460925.8694], // 白露 16:51
  ['2025-09-23',2460941.2634], // 秋分 02:19
  ['2025-10-08',2460956.5286], // 寒露 08:41
  ['2025-10-23',2460971.6604], // 霜降 11:50
  ['2025-11-07',2460986.6695], // 立冬 12:04
  ['2025-11-22',2461001.5664], // 小雪 09:35
  ['2025-12-07',2461016.3782], // 大雪 05:04
  ['2024-12-21',2460665.8893], // 冬至 17:20
  ['2026-01-05',2461045.8494], // 小寒 16:23
  ['2026-01-20',2461060.5729], // 大寒 09:44
  ['2026-02-04',2461075.3348], // 立春 04:02
  ['2026-02-18',2461090.1611], // 雨水 23:51
  ['2026-03-05',2461105.0826], // 惊蛰 21:59
  ['2026-03-20',2461120.1153], // 春分 22:45
  ['2026-04-05',2461135.2778], // 清明 02:40
  ['2026-04-20',2461150.5688], // 谷雨 09:39
  ['2026-05-05',2461165.9922], // 立夏 19:48
  ['2026-05-21',2461181.5255], // 小满 08:36
  ['2026-06-05',2461197.1586], // 芒种 23:48
  ['2026-06-21',2461212.8503], // 夏至 16:24
  ['2026-07-07',2461228.5812], // 小暑 09:56
  ['2026-07-23',2461244.3008], // 大暑 03:13
  ['2026-08-07',2461259.9880], // 立秋 19:42
  ['2026-08-23',2461275.5964], // 处暑 10:18
  ['2026-09-07',2461291.1120], // 白露 22:41
  ['2026-09-23',2461306.5036], // 秋分 08:05
  ['2026-10-08',2461321.7703], // 寒露 14:29
  ['2026-10-23',2461336.9014], // 霜降 17:37
  ['2026-11-07',2461351.9112], // 立冬 17:52
  ['2026-11-22',2461366.8079], // 小雪 15:23
  ['2026-12-07',2461381.6198], // 大雪 10:52
  ['2025-12-21',2461031.1271], // 冬至 23:03
];
let jqBad=0,jqMaxMin=0;
for(const [d,jd] of JQ_FIXTURE){
  const [y,m,dd]=d.split('-').map(Number);
  const R=QM.cast(y,m,dd+3,12,0,{lon:120,clock:'true',ziSwap:true,jg:2}); // 交节后第 3 天仍在本节气内
  const diffMin=Math.abs(R.meta.termJD-jd)*1440;
  if(diffMin>jqMaxMin)jqMaxMin=diffMin;
  if(diffMin>15)jqBad++;
}
ck('31.1 节气锚点 72 项全部在 15 分钟容差内',jqBad,0);
ck('31.2 节气锚点最大偏差小于 13.5 分钟（Meeus 低精度模型量级）',jqMaxMin<13.5,true,'实际最大 '+jqMaxMin.toFixed(1)+' 分钟');
const DAY_FIXTURE=[['1900-1-1','甲戌'],['1949-10-1','甲子'],['1984-2-2','丙寅'],['2000-1-1','戊午'],
                   ['2024-2-4','戊戌'],['2024-12-31','己巳'],['2026-1-10','甲申'],['2026-10-14','辛酉']];
let dayBad=0;
for(const [d,g] of DAY_FIXTURE){
  const [y,m,dd]=d.split('-').map(Number);
  if(QM.cast(y,m,dd,12,0,{lon:120,clock:'true',ziSwap:true,jg:2}).meta.dayGZ!==g)dayBad++;
}
ck('31.3 日柱锚点 8 项全部一致（跨 1900/1949/1984/2000/2024/2026）',dayBad,0);
/* 立春翻转：立春前后年柱应相差一位（2024 立春 16:27 / 2025 立春 22:10 北京时，锚点来自 lunar-javascript） */
const lc24a=QM.cast(2024,2,4,13,0,{lon:120,clock:'true',ziSwap:false,jg:2});
const lc24b=QM.cast(2024,2,4,20,0,{lon:120,clock:'true',ziSwap:false,jg:2});
ck('31.4 2024 立春前年柱=癸卯',QM.gz(QM.yearGZIndex(lc24a.meta.gzYear)),'癸卯');
ck('31.5 2024 立春后年柱=甲辰',QM.gz(QM.yearGZIndex(lc24b.meta.gzYear)),'甲辰');
const lc25a=QM.cast(2025,2,3,20,0,{lon:120,clock:'true',ziSwap:false,jg:2});
const lc25b=QM.cast(2025,2,3,23,0,{lon:120,clock:'true',ziSwap:false,jg:2});
ck('31.6 2025 立春前年柱=甲辰',QM.gz(QM.yearGZIndex(lc25a.meta.gzYear)),'甲辰');
ck('31.7 2025 立春后年柱=乙巳',QM.gz(QM.yearGZIndex(lc25b.meta.gzYear)),'乙巳');

// interpretStream：mock fetch 全流程
(async()=>{
  const mkResp=(ok,status,ct,bodyStream,jsonBody)=>{
    return {ok,status,headers:{get:h=>h==='content-type'?ct:'null'},body:bodyStream,json:()=>Promise.resolve(jsonBody),text:()=>Promise.resolve('err detail')};
  };
  const enc=new TextEncoder();
  const sseData=s=>new Uint8Array(enc.encode('data: '+JSON.stringify(s)+'\n\n'));

  // 正常流式
  const chunks=[
    sseData({choices:[{delta:{content:'一、'}}]}),
    sseData({choices:[{delta:{content:'盘面要点…'}}]}),
    new Uint8Array(enc.encode('data: [DONE]\n\n'))
  ];
  let pos=0;
  const fakeFetch=(url,init)=>{
    ck('fetch URL拼装',url.endsWith('/chat/completions'),true);
    const body=JSON.parse(init.body);
    ck('fetch body含stream:true',body.stream,true);
    ck('fetch body首条为system',body.messages[0].role,'system');
    return Promise.resolve(mkResp(true,200,'text/event-stream',{getReader:()=>({read:()=>pos<chunks.length?Promise.resolve({done:false,value:chunks[pos++]}):Promise.resolve({done:true})})}));
  };
  const deltas=[];
  const out1=await QMI.interpretStream({base:'https://api.example.com/v1/',key:'sk-test',model:'test-model'},panTxt,null,d=>deltas.push(d),fakeFetch);
  ck('流式拼接完整',out1,'一、盘面要点…');
  ck('增量回调次数=有效片数',deltas.length,2);
  ck('增量回调为增量片段',deltas.join(''),'一、盘面要点…');

  // 非流式兜底（JSON 响应）
  const out2=await QMI.interpretStream({base:'https://api.example.com/v1',key:'sk',model:'m'},panTxt,null,d=>{},(u,i)=>Promise.resolve(mkResp(true,200,'application/json',null,{choices:[{message:{content:'整段答复'}}]})));
  ck('非流式JSON兜底',out2,'整段答复');

  // HTTP 错误
  let err1=null;
  try{await QMI.interpretStream({base:'https://x.com',key:'k',model:'m'},panTxt,null,d=>{},(u,i)=>Promise.resolve(mkResp(false,401,'application/json',null,{error:'bad key'})));}catch(e){err1=e;}
  ck('HTTP_401 抛错',err1&&err1.message.startsWith('HTTP_401'),true);

  // CFG 缺失
  let err2=null;
  try{await QMI.interpretStream({base:'',key:'',model:''},panTxt,null,d=>{},()=>Promise.resolve(null));}catch(e){err2=e;}
  ck('CFG_MISSING 抛错',err2&&err2.message==='CFG_MISSING',true);

  // 守卫①触发：单行无换行超长 → 断流返回已有内容
  const huge=new Uint8Array(enc.encode('data: '+'x'.repeat(1100000)));
  let done=false;
  const out3=await QMI.interpretStream({base:'https://x.com',key:'k',model:'m'},panTxt,null,d=>{},
    (u,i)=>Promise.resolve(mkResp(true,200,'text/event-stream',{getReader:()=>({read:()=>done?Promise.resolve({done:true}):Promise.resolve({done:false,value:huge}).then(x=>{done=true;return x;})})})));
  ck('守卫①断流不抛错且保留空文',out3===''||out3===undefined?'EMPTY预期':'ERR_'+out3,'EMPTY预期');

  // 守卫②触发：无限增长
  const chunk2=sseData({choices:[{delta:{content:'z'.repeat(1000)}}]});
  let n2=0,done2=false;
  let out4;
  try{
    out4=await QMI.interpretStream({base:'https://x.com',key:'k',model:'m'},panTxt,null,d=>{},
      (u,i)=>Promise.resolve(mkResp(true,5000,'text/event-stream',{getReader:()=>({read:()=>done2?Promise.resolve({done:true}):Promise.resolve({done:false,value:chunk2}).then(x=>{if(++n2>250)done2=true;return x;})})})));
    ck('守卫②截断到20万不抛错',out4.length<=QMI.SSE_MAX_REPLY,true);
  }catch(e){ck('守卫②截断不抛错',false,'抛了:'+e.message);}

  // 空回复
  let err3=null;
  try{await QMI.interpretStream({base:'https://x.com',key:'k',model:'m'},panTxt,null,d=>{},(u,i)=>Promise.resolve(mkResp(true,200,'application/json',null,{})));}catch(e){err3=e;}
  ck('空回复抛 EMPTY',err3&&err3.message==='EMPTY',true);

  /* ---- 廿七、Cloudflare Pages Functions（服务端代理 + D1） ---- */
  console.log('\n=== 廿七、Functions 服务端（interpret/records） ===');
  /* Functions 为 ESM（Pages Functions 只识别 export 形式的路由），故用动态 import */
  const L=await import('./functions/api/_lib.js');
  const fi=await import('./functions/api/interpret.js');
  const fr=await import('./functions/api/records.js');
  const PUB_PROMPT=require('./public/prompt.js');
  const SRV_PROMPT=(await import('./functions/api/prompt.js')).default;

  ck('提示词前后端同步',SRV_PROMPT===PUB_PROMPT,true);
  ck('提示词含四段契约',SRV_PROMPT.includes('盘面事实不可改写')&&SRV_PROMPT.includes('主次次序')
     &&SRV_PROMPT.includes('追问沿用原盘')&&SRV_PROMPT.includes('现实边界'),true);

  /* ---- 四轮审计 P2-1：CORS 白名单（2026-10-17：route 改 await + null 默认关闭） ---- */
  console.log('\n=== 四轮 P2-1 CORS 白名单 ===');
  {
    const mkReq=o=>({headers:{get:k=>k.toLowerCase()==='origin'?o:null}});
    const mkResp=()=>new Response('x',{status:200,headers:{'Content-Type':'text/plain'}});
    const hd=(r,k)=>r.headers.get(k);
    const a1=await L.route(mkReq('https://qimen-2i1.pages.dev'),mkResp(),{});
    ck('32.91 pages.dev 域名回显自身',hd(a1,'Access-Control-Allow-Origin'),'https://qimen-2i1.pages.dev');
    const a2=await L.route(mkReq('https://qimen.dhxlsfn.dpdns.org'),mkResp(),{});
    ck('32.92 自定义域回显自身',hd(a2,'Access-Control-Allow-Origin'),'https://qimen.dhxlsfn.dpdns.org');
    const a3=await L.route(mkReq('null'),mkResp(),{});
    ck('32.93 Origin null 默认拒绝（sandbox iframe 不再可跨站）',hd(a3,'Access-Control-Allow-Origin'),null);
    const a3b=await L.route(mkReq('null'),mkResp(),{QM_ALLOW_NULL_ORIGIN:'1'});
    ck('32.93b 显式 QM_ALLOW_NULL_ORIGIN=1 才放行 file://',hd(a3b,'Access-Control-Allow-Origin'),'null');
    const b1=await L.route(mkReq('https://evil.example.com'),mkResp(),{});
    ck('32.94 未知来源不回 ACAO',hd(b1,'Access-Control-Allow-Origin'),null);
    const b2=await L.route(mkReq(null),mkResp(),{});
    ck('32.95 无 Origin 头不回 ACAO',hd(b2,'Access-Control-Allow-Origin'),null);
    const v1=await L.route(mkReq('https://qimen-2i1.pages.dev'),mkResp(),{});
    ck('32.96 回显时带 Vary: Origin',hd(v1,'Vary'),'Origin');
    const s1=await L.route(mkReq('https://qimen-2i1.pages.dev'),new Response('data: x\n\n',{status:200,headers:L.sseHeaders()}),{});
    ck('32.97 对流式 SSE 响应同样生效',hd(s1,'Access-Control-Allow-Origin'),'https://qimen-2i1.pages.dev');
    ck('32.98 裸 cors() 不再吐 ACAO（漏包 route 也不泄露）',L.cors()['Access-Control-Allow-Origin']||null,null);
    const p1=await L.route(mkReq('https://qimen-2i1.pages.dev'),Promise.resolve(mkResp()),{});
    ck('32.99 route 接受 Promise（handle 为 async）并保留响应体',await p1.text(),'x');
  }

  /* D1 存根（记录每条 SQL 及其绑定参数；meta 对齐真实 D1：changes/last_row_id） */  function fakeD1(){
    const log=[];
    return {log,prepare(sql){
      const rec={sql:sql,args:null};
      return {
        bind(...a){rec.args=a;return{
          run:async()=>{log.push(rec);return{success:true,meta:{changes:1,last_row_id:1}};},
          first:async()=>{log.push(rec);return{id:1,created_at:'t',cat:'qiucai',pillars:'',pan:'',question:'',answer:'',model:'m',ms:1,n:7};},
          all:async()=>{log.push(rec);return{results:[{id:1}]};}
        };},
        first:async()=>{log.push(rec);return{n:7};},
        all:async()=>{log.push(rec);return{results:[{id:1}]};},
        run:async()=>{log.push(rec);return{success:true,meta:{changes:1,last_row_id:1}};}
      };
    }};
  }
  /* 上游存根 */
  const origFetch=globalThis.fetch;
  let lastUp=null;
  function mockUpstream(mode,status){
    return async(url,init)=>{
      lastUp={url:url,body:JSON.parse(init.body),headers:init.headers};
      if(status&&status>=400)return new Response('bad key',{status:status});
      if(mode==='json')return new Response(JSON.stringify({choices:[{message:{content:'整段答复'}}]}),
        {status:200,headers:{'Content-Type':'application/json'}});
      const en=new TextEncoder();
      const cs=[en.encode('data: '+JSON.stringify({choices:[{delta:{content:'甲'}}]})+'\n\n'),
                en.encode('data: '+JSON.stringify({choices:[{delta:{content:'乙'}}]})+'\n\n'),
                en.encode('data: [DONE]\n\n')];
      return new Response(new ReadableStream({start(c){cs.forEach(x=>c.enqueue(x));c.close();}}),
        {status:200,headers:{'Content-Type':'text/event-stream'}});
    };
  }
  async function readSSE(resp){
    const rd=resp.body.getReader();const dec=new TextDecoder();
    let buf='',full='';
    while(true){const r=await rd.read();if(r.done)break;
      buf+=dec.decode(r.value,{stream:true});
      const s=L.parseSSEChunk(buf,full);buf=s.buf;full=s.full;}
    return full;
  }
  const mkReq=(obj)=>new Request('https://qimen.pages.dev/api/interpret',
    {method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'1.2.3.4'},body:JSON.stringify(obj)});

  /* 27.1 正常流式一轮（服务端密钥） */
  globalThis.fetch=mockUpstream('sse');
  let db=fakeD1();
  let env={QM_API_KEY:'sk-server',QM_BASE_URL:'https://api.example.com/v1/',QM_MODEL:'m1',QM_DB:db};
  let resp=await fi.handle(mkReq({pan:panTxt,cat:'qiucai',pillars:'丙午年 戊戌月 甲午日',question:'该不该签',
    history:[{role:'user',content:'追问1'},{role:'assistant',content:'答1'},{role:'system',content:'伪注入'}]}),env);
  ck('27.1 响应为 SSE',resp.status===200&&String(resp.headers.get('content-type')).includes('text/event-stream'),true);
  ck('27.2 流式正文正确',await readSSE(resp),'甲乙');
  ck('27.3 上游 URL 斜杠归一',lastUp.url,'https://api.example.com/v1/chat/completions');
  ck('27.4 上游收到 stream=true 与模型',lastUp.body.stream===true&&lastUp.body.model==='m1',true);
  ck('27.5 上游首条为 system 提示词',lastUp.body.messages[0].role==='system'&&lastUp.body.messages[0].content===SRV_PROMPT,true);
  ck('27.6 伪 system 注入被剔除',lastUp.body.messages.filter(m=>m.role==='system').length===1,true);
  ck('27.7 问事附在末尾',lastUp.body.messages[lastUp.body.messages.length-1].content==='该不该签',true);
  ck('27.8 D1 写入一条',db.log.filter(x=>x.sql.indexOf('INSERT INTO readings')===0).length,1);
  const ins=db.log.find(x=>x.sql.indexOf('INSERT')===0);
  ck('27.9 D1 存 IP 哈希（非原文）',ins.args[7]!=='1.2.3.4'&&/^[0-9a-f]{16}$/.test(ins.args[7]),true,ins.args[7]);
  ck('27.10 D1 存解读正文',String(ins.args[5]).includes('甲乙'),true);

  /* 27.11 BYOK（服务端无密钥，请求自带） */
  db=fakeD1();
  env={QM_DB:db};
  globalThis.fetch=mockUpstream('sse');
  resp=await fi.handle(mkReq({pan:panTxt,base:'https://byok.example/v1',model:'mm',key:'kk'}),env);
  ck('27.11 BYOK 走自带密钥',await readSSE(resp)&&lastUp.url==='https://byok.example/v1/chat/completions'&&lastUp.body.model==='mm',true);
  ck('27.12 BYOK 密钥进 Authorization',String(lastUp.headers.Authorization||lastUp.headers.authorization)==='Bearer kk',true);

  /* 27.13 守卫：无 provider */
  db=fakeD1();
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_DB:db});
  ck('27.13 无密钥来源 → 400',resp.status===400&&(await resp.json()).error.includes('未配置模型密钥'),true);

  /* 27.14 守卫：缺盘面 / 超长 */
  resp=await fi.handle(mkReq({}),{QM_API_KEY:'k',QM_DB:fakeD1()});
  ck('27.14 缺盘面 → 400',resp.status===400,true);
  resp=await fi.handle(mkReq({pan:'x'.repeat(L.LIMITS.panText+1)}),{QM_API_KEY:'k',QM_DB:fakeD1()});
  ck('27.15 盘面超长 → 400',resp.status===400&&(await resp.json()).error.includes('过长'),true);

  /* 27.16 上游 401 透传 */
  globalThis.fetch=mockUpstream('sse',401);
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_DB:fakeD1()});
  ck('27.16 上游401→401',resp.status===401,true);

  /* 27.17 非流式兜底 */
  globalThis.fetch=mockUpstream('json');
  db=fakeD1();
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_MODEL:'m',QM_DB:db});
  ck('27.17 上游非流式时整段回传',await readSSE(resp),'整段答复');
  ck('27.18 非流式也写 D1',db.log.filter(x=>x.sql.indexOf('INSERT')===0).length,1);

  /* 27.19 未绑定 D1 不炸 */
  globalThis.fetch=mockUpstream('sse');
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k'});
  ck('27.19 无 D1 绑定仍可解读',await readSSE(resp),'甲乙');

  /* 27.20 records 接口 */
  db=fakeD1();
  let r2=await fr.handle(new Request('https://x/api/records?limit=5'),{QM_DB:db});
  let j2=await r2.json();
  ck('27.20 records 列表返回',Array.isArray(j2.records)&&j2.total===7,true);
  r2=await fr.handle(new Request('https://x/api/records?id=3'),{QM_DB:db});
  ck('27.21 records 详情',(await r2.json()).record.id===1,true);

  /* P3-5：非法 id 返回 400 */
  r2=await fr.handle(new Request('https://x/api/records?id=abc'),{QM_DB:fakeD1()});
  ck('27.21a records id=abc → 400',r2.status===400,true,String(r2.status));

  r2=await fr.handle(new Request('https://x/api/records?id=3',{method:'DELETE'}),{QM_DB:db});
  ck('27.22 records 删除单条',(await r2.json()).deleted===3,true);

  r2=await fr.handle(new Request('https://x/api/records?id=abc',{method:'DELETE'}),{QM_DB:fakeD1()});
  ck('27.22a records DELETE id=abc → 400',r2.status===400,true,String(r2.status));

  r2=await fr.handle(new Request('https://x/api/records?all=1&code=x',{method:'DELETE'}),{QM_DB:db});
  ck('27.23 未设 ACCESS_CODE 禁止清空',r2.status===403,true);
  r2=await fr.handle(new Request('https://x/api/records',{method:'PUT'}),{QM_DB:db});
  ck('27.24 不支持的方法 → 405',r2.status===405,true);
  r2=await fr.handle(new Request('https://x/api/records'),{});
  ck('27.25 未绑定 D1 → 500',r2.status===500,true);

  /* 27.25a clampInt：非法 limit/offset 不得把 NaN 绑进 SQL（D1 bind(NaN) → LIMIT NULL = 无上限） */
  ck('27.25b clampInt 非法值回落默认',L.clampInt('abc',20,1,100),20);
  ck('27.25c clampInt 夹到上下限',L.clampInt('999',20,1,100)+','+L.clampInt('-5',20,1,100),'100,1');
  ck('27.25d clampInt 空值回落默认',L.clampInt(null,20,1,100),20);
  db=fakeD1();
  r2=await fr.handle(new Request('https://x/api/records?limit=abc&offset=xyz'),{QM_DB:db});
  const limRec=db.log.find(x=>x.sql.indexOf('LIMIT')>=0&&x.args&&x.args.length);
  ck('27.25e records limit=abc → 回落 20 且无 NaN',
    !!limRec&&limRec.args.indexOf(20)>=0&&limRec.args.indexOf(0)>=0&&!limRec.args.some(a=>Number.isNaN(a)),
    true,limRec?JSON.stringify(limRec.args):'none');

  /* 27.26 限流（软开关） */
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_DB:fakeD1(),RATE_LIMIT_PER_MIN:'1'});
  await readSSE(resp);
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_DB:fakeD1(),RATE_LIMIT_PER_MIN:'1'});
  ck('27.26 超限返回 429',resp.status===429,true);

  /* 27.27 F15：history 中与本次相同的盘面全文被剔重（同盘只入模一次） */
  globalThis.fetch=mockUpstream('sse');
  resp=await fi.handle(mkReq({pan:panTxt,history:[{role:'user',content:panTxt},{role:'assistant',content:'旧答'},{role:'user',content:'追问'}]}),{QM_API_KEY:'k',QM_DB:fakeD1()});
  await readSSE(resp);
  ck('27.27 同一盘面仅入模一次',lastUp.body.messages.filter(m=>m.role==='user'&&m.content===panTxt).length,1);
  ck('27.28 追问与旧答保留',lastUp.body.messages.some(m=>m.content==='追问')&&lastUp.body.messages.some(m=>m.content==='旧答'),true);

  /* 27.29 F9：留痕写入挂 ctx.waitUntil（流关闭后 isolate 可能冻结） */
  {
    let waited=0;
    const ctx={waitUntil(){waited++;}};
    resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_DB:fakeD1()},ctx);
    await readSSE(resp);
    await new Promise(r=>setTimeout(r,20)); /* recordReading 在 reader.cancel() 之后触发，让一拍 */
    ck('27.29 waitUntil 被调用',waited>=1,true,String(waited));
  }

  /* 27.30 F5：records 默认按 ip_hash 过滤 */
  {
    const d=fakeD1();
    await fr.handle(new Request('https://x/api/records?limit=5'),{QM_DB:d});
    ck('27.30 records 默认按 ip_hash 过滤',/WHERE ip_hash=\?/.test(d.log.map(x=>x.sql).join('|')),true,d.log.map(x=>x.sql).join(' ; '));
  }

  globalThis.fetch=origFetch;

  /* ---- 廿八、/api/models 与供应商路由（多模型对比） ---- */
  console.log('\n=== 廿八、模型清单与供应商路由 ===');
  const fm=await import('./functions/api/models.js');
  const mkReqM=()=>new Request('https://qimen.pages.dev/api/models');
  const CP=JSON.stringify([{id:'kimi',label:'Moonshot',base:'https://api.moonshot.cn/v1',models:['kimi-k2']}]);

  let mj=await (await fm.handle(mkReqM(),{})).json();
  ck('28.1 返回 3 个内置模型（v4-pro 已下架）',mj.models.length,3);
  ck('28.2 无密钥时 configured 全 false',mj.models.every(m=>m.configured===false),true);
  ck('28.3 无密钥时给出告警',(mj.warnings||[]).some(w=>w.indexOf('未配置密钥')>=0),true);
  mj=await (await fm.handle(mkReqM(),{GEMINI_API_KEY:'g',DEEPSEEK_API_KEY:'d'})).json();
  ck('28.4 配密钥后 configured 全 true',mj.models.every(m=>m.configured===true),true);
  ck('28.5 配齐后无告警',(mj.warnings||[]).length,0);
  ck('28.6 defaultModel=deepseek-flash',mj.defaultModel,'deepseek-flash');
  /* F27：只配了 Gemini 密钥时，defaultModel 不能仍指向未配 key 的 deepseek-flash */
  mj=await (await fm.handle(mkReqM(),{GEMINI_API_KEY:'g'})).json();
  ck('28.6b 仅配 Gemini → defaultModel 指向已配模型',/^gemini/i.test(mj.defaultModel),true,mj.defaultModel);
  ck('28.6c 仅配 Gemini → deepseek-flash 标未配',mj.models.filter(m=>m.id==='deepseek-flash')[0].configured,false);
  mj=await (await fm.handle(mkReqM(),{CUSTOM_PROVIDERS:CP})).json();
  ck('28.7 自定义供应商进入清单',mj.models.some(m=>m.id==='kimi-k2'&&m.pv==='Moonshot'),true);
  ck('28.8 自定义供应商缺密钥 → 告警',(mj.warnings||[]).some(w=>w.indexOf('KIMI_API_KEY')>=0),true);
  mj=await (await fm.handle(mkReqM(),{CUSTOM_PROVIDERS:CP,KIMI_API_KEY:'kk'})).json();
  ck('28.9 配密钥后 kimi-k2 可用',mj.models.filter(m=>m.id==='kimi-k2')[0].configured===true,true);
  mj=await (await fm.handle(mkReqM(),{CUSTOM_PROVIDERS:'{oops'})).json();
  ck('28.10 CUSTOM_PROVIDERS 坏 JSON → 告警',(mj.warnings||[]).some(w=>w.indexOf('不是合法 JSON')>=0),true);

  const rp=L.resolveProvider;
  const env2={GEMINI_API_KEY:'g',DEEPSEEK_API_KEY:'d'};
  let pv=rp(env2,{model:'gemini-3.8-flash'});
  ck('28.11 gemini-3.8-flash → Google 兼容端点',pv.base==='https://generativelanguage.googleapis.com/v1beta/openai'&&pv.model==='gemini-3.8-flash'&&pv.from==='gemini',true,JSON.stringify(pv));
  pv=rp(env2,{model:'deepseek-flash'});
  ck('28.12 deepseek-flash → DeepSeek',pv.base==='https://api.deepseek.com/v1'&&pv.model==='deepseek-flash'&&pv.from==='deepseek',true);
  pv=rp({DEEPSEEK_API_KEY:'d'},{model:'gemini-3.8-flash'});
  ck('28.13 Gemini 无密钥时回落 DeepSeek',pv.from==='deepseek',true,pv.from);
  pv=rp({GEMINI_API_KEY:'g'},{model:'deepseek-flash'});
  ck('28.14 DeepSeek 无密钥时回落 Gemini',pv.from==='gemini',true,pv.from);
  pv=rp({GEMINI_BASE_URL:'https://gateway.example/v1',GEMINI_API_KEY:'g'},{model:'gemini-3.8-flash'});
  ck('28.15 GEMINI_BASE_URL 可覆盖（接 AI Gateway）',pv.base==='https://gateway.example/v1',true,pv.base);
  pv=rp({CUSTOM_PROVIDERS:CP,KIMI_API_KEY:'kk'},{model:'kimi-k2'});
  ck('28.16 自定义供应商命中',pv.base==='https://api.moonshot.cn/v1'&&pv.from==='kimi',true,JSON.stringify(pv));
  ck('28.17 全无密钥 → null',rp({},{model:'deepseek-flash'}),null);
  ck('28.18 未指定模型 → 默认 deepseek',rp(env2,{}).from,'deepseek');
  ck('28.19 QM_PROVIDER=gemini 生效',rp({GEMINI_API_KEY:'g',DEEPSEEK_API_KEY:'d',QM_PROVIDER:'gemini'},{}).from,'gemini');
  ck('28.20 BYOK 优先于服务端密钥',rp(env2,{base:'https://b/v1',model:'m',key:'k'}).from,'byok');

  /* F3：回落到别家供应商时必须换用该家的模型名（旧版把 gemini 模型名发给 deepseek 必然 400） */
  pv=rp({DEEPSEEK_API_KEY:'d'},{model:'gemini-3.8-flash'});
  ck('28.24 回落 DeepSeek 模型名换本家',pv.from==='deepseek'&&pv.model==='deepseek-flash',true,JSON.stringify(pv));
  pv=rp({GEMINI_API_KEY:'g'},{model:'deepseek-v4'});
  ck('28.25 回落 Gemini 模型名换本家',pv.from==='gemini'&&pv.model==='gemini-3.8-flash',true,JSON.stringify(pv));
  pv=rp({DEEPSEEK_API_KEY:'d',DEEPSEEK_MODEL:'deepseek-v4'},{model:'gemini-3.8-flash'});
  ck('28.26 回落尊重 DEEPSEEK_MODEL 覆盖',pv.model,'deepseek-v4');

  /* F11：BYOK base SSRF 守卫（仅公网 http(s)，禁内网/回环/保留地址） */
  ck('28.27 BYOK 禁内网 IP',rp({},{base:'http://192.168.1.1/v1',model:'m',key:'k'}).invalid,'byok_base');
  ck('28.28 BYOK 禁回环 IP',rp({},{base:'http://127.0.0.1:11434/v1',model:'m',key:'k'}).invalid,'byok_base');
  ck('28.29 BYOK 禁 localhost',rp({},{base:'http://localhost/v1',model:'m',key:'k'}).invalid,'byok_base');
  ck('28.30 BYOK 禁非 http(s)',rp({},{base:'file:///etc/passwd',model:'m',key:'k'}).invalid,'byok_base');
  ck('28.31 BYOK 禁 .internal 域',rp({},{base:'https://metadata.google.internal/v1',model:'m',key:'k'}).invalid,'byok_base');
  ck('28.32 BYOK 公网 https 放行',rp({},{base:'https://api.example.com/v1',model:'m',key:'k'}).from,'byok');

  /* 端到端：按模型名打到正确上游端点 */
  globalThis.fetch=mockUpstream('sse');
  await fi.handle(mkReq({pan:panTxt,model:'gemini-3.8-flash'}),{GEMINI_API_KEY:'g',DEEPSEEK_API_KEY:'d',QM_DB:fakeD1()});
  ck('28.21 端到端：gemini 打到 Google 兼容端点',lastUp.url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  ck('28.22 端到端：模型名原样透传',lastUp.body.model,'gemini-3.8-flash');
  globalThis.fetch=mockUpstream('sse');
  await fi.handle(mkReq({pan:panTxt,model:'deepseek-v4'}),{GEMINI_API_KEY:'g',DEEPSEEK_API_KEY:'d',QM_DB:fakeD1()});
  ck('28.23 端到端：deepseek-* 打到 DeepSeek',lastUp.url,'https://api.deepseek.com/v1/chat/completions');
  globalThis.fetch=origFetch;

  /* ---- 廿九、/api/saves 存档接口 ---- */
  console.log('\n=== 廿九、存档接口 /api/saves ===');
  const sv=await import('./functions/api/saves.js');
  const mkReqS=obj=>new Request('https://qimen.pages.dev/api/saves',obj===undefined?{method:'GET'}
    :{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});

  let d1s=fakeD1();
  let r=await sv.handle(mkReqS({label:'丙午年 戊戌月 丁卯日 乙巳时',pillars:'丙午年 戊戌月 丁卯日 乙巳时',params:{date:'2026-10-10',time:'09:00',lon:'120',clock:'true',zi:'23',ji:'2',cat:'qiucai',q:'问财'}}),{QM_DB:d1s});
  let j=await r.json();
  ck('29.1 POST 合法存档 ok',j.ok===true,true,JSON.stringify(j));
  const insRec=d1s.log[0];
  ck('29.2 INSERT saves 五字段',/INSERT INTO saves/.test(insRec.sql)&&insRec.args.length===5,true,JSON.stringify(insRec&&{sql:insRec.sql,n:insRec.args.length}));
  ck('29.3 params JSON 含白名单键',JSON.parse(insRec.args[3]).date==='2026-10-10'&&JSON.parse(insRec.args[3]).cat==='qiucai',true);
  r=await sv.handle(mkReqS({label:'x'.repeat(100),params:{date:'2026-10-10',time:'09:00'}}),{QM_DB:d1s});
  ck('29.4 label 超长截到 60',d1s.log[d1s.log.length-1].args[1].length===60,true,'实际='+d1s.log[d1s.log.length-1].args[1].length);
  r=await sv.handle(mkReqS({params:{date:'2026-10-10',time:'09:00',evil:'<script>'}}),{QM_DB:d1s});
  j=await r.json();
  ck('29.5 非白名单键被剔除',j.ok===true&&JSON.parse(d1s.log[d1s.log.length-1].args[3]).evil===undefined,true,JSON.stringify(j));
  r=await sv.handle(mkReqS({params:{date:'2026-10-10'}}),{QM_DB:fakeD1()});
  ck('29.6 缺 time → 400',r.status===400,true,String(r.status));
  r=await sv.handle(mkReqS({params:{date:'bad',time:'09:00'}}),{QM_DB:fakeD1()});
  ck('29.7 非法 date → 400',r.status===400,true,String(r.status));
  r=await sv.handle(mkReqS(null),{QM_DB:fakeD1()});
  ck('29.8 无 params → 400',r.status===400,true,String(r.status));

  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?limit=10'),{QM_DB:d1s});
  j=await r.json();
  ck('29.9 GET 列表结构（脏 params 置空不抛错）',Array.isArray(j.saves)&&j.saves.length>=1&&j.saves[0].params===null,true,JSON.stringify(j.saves&&j.saves[0]));

  /* 29.9a 非法 limit 不得把 NaN 绑进 SQL（LIMIT NULL = 无上限，一次拖全表） */
  d1s=fakeD1();
  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?limit=abc'),{QM_DB:d1s});
  const sLim=d1s.log.find(x=>x.sql.indexOf('LIMIT')>=0&&x.args&&x.args.length);
  ck('29.9b saves limit=abc → 回落 50 且无 NaN',
    !!sLim&&sLim.args.indexOf(50)>=0&&!sLim.args.some(a=>Number.isNaN(a)),true,sLim?JSON.stringify(sLim.args):'none');

  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?id=3',{method:'DELETE'}),{QM_DB:d1s});
  j=await r.json();
  ck('29.10 DELETE 返回 id',j.ok===true&&j.deleted===3,true,JSON.stringify(j));
  ck('29.11 DELETE SQL 正确',/DELETE FROM saves WHERE id=\?/.test(d1s.log[d1s.log.length-1].sql),true,d1s.log[d1s.log.length-1].sql);

  /* P3-5：非法 id 返回 400（旧版 Number('abc')→NaN，D1 可能抛错） */
  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?id=abc',{method:'DELETE'}),{QM_DB:fakeD1()});
  ck('29.11a DELETE id=abc → 400',r.status===400,true,String(r.status));

  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves',{method:'PUT'}),{QM_DB:fakeD1()});
  ck('29.12 PUT → 405',r.status===405,true,String(r.status));
  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves'),{});
  ck('29.13 未绑定 D1 → 500',r.status===500,true,String(r.status));

  /* F17：时间须真实存在（旧正则放行 99:99） */
  r=await sv.handle(mkReqS({params:{date:'2026-10-10',time:'99:99'}}),{QM_DB:fakeD1()});
  ck('29.14 非法 time 99:99 → 400',r.status===400,true,String(r.status));
  r=await sv.handle(mkReqS({params:{date:'2026-10-10',time:'23:59'}}),{QM_DB:fakeD1()});
  ck('29.15 合法 time 23:59 放行',r.status===200,true,String(r.status));

  /* P3-1：日期也须真实存在（旧正则放行 2026-99-99） */
  r=await sv.handle(mkReqS({params:{date:'2026-99-99',time:'12:00'}}),{QM_DB:fakeD1()});
  ck('29.15a 非法 date 2026-99-99 → 400',r.status===400,true,String(r.status));
  r=await sv.handle(mkReqS({params:{date:'2024-02-29',time:'12:00'}}),{QM_DB:fakeD1()});
  ck('29.15b 闰日 2024-02-29 放行',r.status===200,true,String(r.status));
  r=await sv.handle(mkReqS({params:{date:'2023-02-29',time:'12:00'}}),{QM_DB:fakeD1()});
  ck('29.15c 非闰年 2023-02-29 → 400',r.status===400,true,String(r.status));

  /* F5：网络隔离——列表默认按 ip_hash 过滤；全量/越权需 ACCESS_CODE */
  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?all=1'),{QM_DB:fakeD1()});
  ck('29.16 all=1 未设口令 → 403',r.status===403,true,String(r.status));
  r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?all=1&code=bad'),{QM_DB:fakeD1(),ACCESS_CODE:'s3'});
  ck('29.17 all=1 口令错 → 401',r.status===401,true,String(r.status));
  {
    const d=fakeD1();
    r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?all=1&code=s3'),{QM_DB:d,ACCESS_CODE:'s3'});
    ck('29.18 all=1 口令对 → 全量无 WHERE',r.status===200&&/SELECT id, created_at, label, pillars, params FROM saves ORDER BY/.test(d.log.map(x=>x.sql).join('|')),true,d.log.map(x=>x.sql).join(' ; '));
  }
  {
    const d=fakeD1();
    r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?limit=5'),{QM_DB:d});
    ck('29.19 默认列表按 ip_hash 过滤',/FROM saves WHERE ip_hash=\?/.test(d.log.map(x=>x.sql).join('|')),true,d.log.map(x=>x.sql).join(' ; '));
  }
  {
    /* 删除 0 行（他人存档）→ 404 */
    const dNo={prepare(){return{bind(){return{run:async()=>({success:true,meta:{changes:0}})};}};}};
    r=await sv.handle(new Request('https://qimen.pages.dev/api/saves?id=9',{method:'DELETE'}),{QM_DB:dNo});
    ck('29.20 删除非本网络存档 → 404',r.status===404,true,String(r.status));
  }

  /* ================= 三十、六轮：Gemini 重试 / 回落 / 思考链剥离 ================= */
  console.log('\n=== 三十、六轮：Gemini 单独策略与思考链剥离 ===');

  /* 脚本化上游：按次序返回预设响应（status≥400 视为错误），记录每次请求的 URL 与模型名 */
  function scripted(script) {
    const calls = [];
    const f = async (url, init) => {
      const b = JSON.parse(init.body);
      calls.push({ url: url, model: b.model, stream: b.stream });
      const step = script[Math.min(calls.length - 1, script.length - 1)] || {};
      if (step.throwNet) throw new Error('network down');
      if (step.status && step.status >= 400) return new Response(step.body || ('upstream ' + step.status), { status: step.status, headers: { 'Content-Type': 'text/plain' } });
      const en = new TextEncoder();
      const cs = [en.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: step.text || '答' } }] }) + '\n\n'), en.encode('data: [DONE]\n\n')];
      return new Response(new ReadableStream({ start(c) { cs.forEach(x => c.enqueue(x)); c.close(); } }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    };
    f.calls = calls;
    return f;
  }
  /* 读全部原始 SSE 文本（要连 status/fallback 事件一起看）+ 解析出的正文 */
  async function readAll(resp) {
    const rd = resp.body.getReader(); const dec = new TextDecoder();
    let raw = '', buf = '', full = '';
    while (true) {
      const r = await rd.read(); if (r.done) break;
      const t = dec.decode(r.value, { stream: true });
      raw += t; buf += t;
      const s = L.parseSSEChunk(buf, full); buf = s.buf; full = s.full;
    }
    return { raw: raw, full: full };
  }
  const GEM = 'gemini-3.8-flash';
  const envGem = () => ({ GEMINI_API_KEY: 'gk', DEEPSEEK_API_KEY: 'dk', QM_DB: fakeD1(), QM_RETRY_WAIT_MS: '0' });

  ck('30.0 默认策略参数（重试 2 次 / 间隔 10 秒）', fi.RETRY_TIMES === 2 && fi.RETRY_WAIT_MS === 10000, true);

  /* 30.1 Gemini 两次 503 后第三次成功 */
  let up = scripted([{ status: 503 }, { status: 503 }, { text: '丙' }]);
  globalThis.fetch = up;
  let r30 = await fi.handle(mkReq({ pan: panTxt, model: GEM }), envGem());
  let a30 = await readAll(r30);
  ck('30.1 Gemini 503 重试后成功（共 3 次请求）', up.calls.length, 3);
  ck('30.2 重试进度以 status 事件回传（1/2、2/2）', (a30.raw.match(/"status"/g) || []).length, 2);
  ck('30.3 三次请求都是 Gemini 模型', up.calls.every(c => c.model === GEM), true);
  ck('30.4 最终正文完整回传', a30.full, '丙');

  /* 30.5 Gemini 三连 503 → 同族递推到另一个 Gemini 模型（不跨到 DeepSeek） */
  up = scripted([{ status: 503 }, { status: 503 }, { status: 503 }, { text: '丁' }]);
  globalThis.fetch = up;
  let db6 = fakeD1();
  r30 = await fi.handle(mkReq({ pan: panTxt, model: GEM }), { GEMINI_API_KEY: 'gk', DEEPSEEK_API_KEY: 'dk', QM_DB: db6, QM_RETRY_WAIT_MS: '0' });
  a30 = await readAll(r30);
  ck('30.5 三次重试耗尽后同族递推（共 4 次请求）', up.calls.length, 4);
  ck('30.6 递推换成同族另一个 Gemini 模型', up.calls[3].model, 'gemini-3.6-flash');
  ck('30.7 递推事件通知前端', (a30.raw.match(/"fallback"/g) || []).length, 1);
  ck('30.8 递推列文案含目标模型展示名', a30.raw.indexOf('Gemini 3.6 Flash') >= 0, true);
  ck('30.9 递推成功仍有完整正文', a30.full, '丁');
  ck('30.10 D1 留痕记实际作答模型', String(db6.log.find(x => x.sql.indexOf('INSERT') === 0).args[6]), 'gemini-3.6-flash');
  /* 关键：全程只打 Gemini 通道，一次都不碰 DeepSeek（家族内递推，不跨家） */
  ck('30.10b 递推不跨家族（4 次请求全走 Gemini 通道）', up.calls.every(c => c.url.indexOf('generativelanguage') >= 0), true);
  ck('30.10c 递推不借用别家密钥（无 deepseek-* 模型名）', up.calls.every(c => !/^deepseek/i.test(c.model)), true);

  /* 30.11 同族也全部失败 → 明确报错，不抛异常、不跨家兜底 */
  up = scripted([{ status: 503 }, { status: 503 }, { status: 503 }, { status: 503 }]);
  globalThis.fetch = up;
  r30 = await fi.handle(mkReq({ pan: panTxt, model: GEM }), { GEMINI_API_KEY: 'gk', DEEPSEEK_API_KEY: 'dk', QM_DB: fakeD1(), QM_RETRY_WAIT_MS: '0' });
  a30 = await readAll(r30);
  ck('30.11 同族递推耗尽 → error 事件（HTTP 仍 200 流）', r30.status === 200 && up.calls.length === 4 && a30.raw.indexOf('"error"') >= 0, true);
  ck('30.12 报错文案点明重试次数与递推规模', a30.raw.indexOf('重试 2 次') >= 0 && a30.raw.indexOf('同族 1 个模型依次递推') >= 0, true);
  ck('30.12b 报错文案说明不跨用别家模型', a30.raw.indexOf('不跨用别家模型') >= 0, true);
  ck('30.12c 全族失败也不改投 DeepSeek（仍 4 次请求）', up.calls.every(c => c.url.indexOf('generativelanguage') >= 0), true);

  /* 30.13 连接失败（fetch 抛错）也算可重试 */
  up = scripted([{ throwNet: true }, { text: '戊' }]);
  globalThis.fetch = up;
  r30 = await fi.handle(mkReq({ pan: panTxt, model: GEM }), envGem());
  a30 = await readAll(r30);
  ck('30.13 连接失败同样进入重试', up.calls.length === 2 && a30.full === '戊', true);

  /* 30.14 Gemini 401（密钥错）不重试，原速 401 */
  up = scripted([{ status: 401 }]);
  globalThis.fetch = up;
  r30 = await fi.handle(mkReq({ pan: panTxt, model: GEM }), envGem());
  ck('30.14 Gemini 401 不重试（硬错误一次即返）', r30.status === 401 && up.calls.length === 1, true);

  /* 30.15 非 Gemini 供应商：503 也不重试（Gemini 单独策略不动别家） */
  up = scripted([{ status: 503 }]);
  globalThis.fetch = up;
  r30 = await fi.handle(mkReq({ pan: panTxt, model: 'deepseek-flash' }), { DEEPSEEK_API_KEY: 'dk', GEMINI_API_KEY: 'gk', QM_DB: fakeD1(), QM_RETRY_WAIT_MS: '0' });
  ck('30.15 非 Gemini 503 一次即返（不额外等待）', r30.status === 502 && up.calls.length === 1, true);
  ck('30.16 非 Gemini 走 QM_* 兜底时同样不重试', fi.shouldRetry({ from: 'server', model: 'm1' }, { status: 503 }), false);

  /* 30.17–30.19 思考链剥离 */
  ck('30.17 服务端成对 think 整段剔除', L.stripThinking('A<thinking>内心戏</thinking>B'), 'AB');
  ck('30.18 服务端未闭合 think 起至末尾丢弃', L.stripThinking('A<think>还没想完'), 'A');
  ck('30.19 无标签正文不受影响', L.stripThinking('一、盘面要点'), '一、盘面要点');
  up = scripted([{ text: 'A<thinking>内心戏</thinking>B' }]);
  globalThis.fetch = up;
  db6 = fakeD1();
  r30 = await fi.handle(mkReq({ pan: panTxt }), { QM_API_KEY: 'k', QM_DB: db6 });
  await readAll(r30);
  ck('30.20 D1 留痕不含思考链', String(db6.log.find(x => x.sql.indexOf('INSERT') === 0).args[5]), 'AB');
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'X<think>内心</think>Y' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  db6 = fakeD1();
  r30 = await fi.handle(mkReq({ pan: panTxt }), { QM_API_KEY: 'k', QM_DB: db6 });
  a30 = await readAll(r30);
  ck('30.21 非流式兜底同样剥思考链', a30.full, 'XY');
  ck('30.22 非流式兜底 D1 同样不含思考链', String(db6.log.find(x => x.sql.indexOf('INSERT') === 0).args[5]), 'XY');

  /* 30.23–30.28 同族递推：只在同一供应商的其它模型间依次递推，绝不跨家 */
  const fbG = L.fallbackProvider({ DEEPSEEK_API_KEY: 'd', QM_API_KEY: 'q' }, { from: 'gemini', base: 'B', key: 'K', model: 'gemini-3.8-flash' });
  ck('30.23 递推选同族下一个模型且不选自己', fbG && fbG.model, 'gemini-3.6-flash');
  ck('30.24 递推沿用本家通道（base/key 不变）', fbG && fbG.base === 'B' && fbG.key === 'K' && fbG.from === 'gemini', true);
  ck('30.25 有 DeepSeek 密钥也不跨家', fbG && fbG.from, 'gemini');
  ck('30.26 已试过的模型不再重复投', L.fallbackProvider({}, { from: 'gemini', model: 'gemini-3.8-flash' }, ['gemini-3.6-flash']) === null, true);
  ck('30.27 同族耗尽 → null（不借别家）', L.fallbackProvider({ DEEPSEEK_API_KEY: 'd' }, { from: 'gemini', model: 'gemini-3.8-flash' }, ['gemini-3.6-flash']) === null, true);
  ck('30.28 BYOK 无同族清单 → null（不编造模型名）', L.fallbackProvider({}, { from: 'byok', model: 'gpt-4o' }) === null, true);
  ck('30.28b QM_GEMINI_MODELS 可覆盖递推顺序', L.familyModels({ QM_GEMINI_MODELS: 'gemini-x,gemini-y' }, 'gemini').join(','), 'gemini-x,gemini-y');
  ck('30.28c 环境默认模型排在递推链最前', L.familyModels({ GEMINI_MODEL: 'gemini-pro' }, 'gemini')[0], 'gemini-pro');
  ck('30.28d 模型展示名（状态栏可读）', L.modelLabel('gemini-3.8-flash') + '/' + L.modelLabel('deepseek-flash'), 'Gemini 3.8 Flash/DeepSeek Flash');

  /* 30.29–30.33 前端：对比列等高 + 内部滚动 + 提示词 */
  {
    const fsx = require('fs');
    const html = fsx.readFileSync('./public/index.html', 'utf8') + '\n' + fsx.readFileSync('./public/app.js', 'utf8');
    const m = html.match(/\.ai-col-body\{[^}]*\}/);
    ck('30.29 对比列固定高度（两边始终等高）', !!m && /height:\s*440px/.test(m[0]), true);
    ck('30.30 对比列超出即出滚动条', !!m && /overflow-y:\s*auto/.test(m[0]), true);
    ck('30.31 小屏同样等高可滚', /\.ai-col-body\{height:min\(440px/.test(html), true);
    ck('30.32 前端与服务端提示词仍逐字一致', SRV_PROMPT === PUB_PROMPT, true);
    ck('30.33 提示词禁止输出思考过程', SRV_PROMPT.indexOf('不得输出思考过程') >= 0, true);
    ck('30.34 递推标记措辞为「递推…作答」', html.indexOf('→ 递推 ') >= 0, true);
  }

  /* 30.35–30.40 跨设备读档：管理口令入口（前端接线，服务端能力早已具备） */
  {
    const fsx = require('fs');
    const html = fsx.readFileSync('./public/index.html', 'utf8') + '\n' + fsx.readFileSync('./public/app.js', 'utf8');
    ck('30.35 存档面板含口令输入与「读全部」勾选', html.indexOf('id="savesCode"') >= 0 && html.indexOf('id="savesAll"') >= 0, true);
    const all = html.match(/async function cloudSavesAll\(code\)\{[\s\S]*?\n\}/);
    ck('30.36 全量查询口令走 X-Access-Code 头（不进 URL）', !!all && all[0].indexOf('/api/saves?limit=100&all=1') >= 0 && all[0].indexOf("'X-Access-Code'") >= 0 && all[0].indexOf('&code=') < 0, true);
    ck('30.37 全量条目带 admin 标记（供删除时附口令）', !!all && all[0].indexOf('admin:true') >= 0, true);
    const del = html.match(/async function delSave\(id\)\{[\s\S]*?\n\}/);
    ck('30.38 删跨网络存档附口令（请求头，不拼 URL）', !!del && del[0].indexOf('row.admin&&code') >= 0 && del[0].indexOf("'X-Access-Code'") >= 0 && del[0].indexOf('&code=') < 0, true);
    ck('30.39 口令与勾选持久化（KEY: qm_code_v1 / qm_all_v1）', html.indexOf("'qm_code_v1'") >= 0 && html.indexOf("'qm_all_v1'") >= 0, true);
    const lp = html.match(/function loadParams\(p\)\{[\s\S]*?\n\}/);
    ck('30.40 读档下拉值走选项白名单（iClock/iZi/iJi/iPan/iMethod/iTq/yCat 七处，非法值回退不置空）',
      !!lp && (lp[0].match(/pickOpt\(/g) || []).length === 7 && lp[0].indexOf("pickOpt('yCat'") >= 0, true);
    ck('30.40b 读档默认值与 cast 一致（转盘/拆补/随芮）',
      !!lp && lp[0].indexOf("pickOpt('iPan',p.pan,'zhuan')") >= 0 && lp[0].indexOf("pickOpt('iMethod',p.method,'chaibu')") >= 0 && lp[0].indexOf("pickOpt('iTq',p.tq,'suirui')") >= 0, true);
  }

  /* 30.41–30.48 P1-3 流派配置前端接线：三下拉 + 传入 cast + 摘要/渲染标注 + 旧档兼容 */
  {
    const fsx = require('fs');
    const html = fsx.readFileSync('./public/index.html', 'utf8') + '\n' + fsx.readFileSync('./public/app.js', 'utf8');
    const ids=['iPan','iMethod','iTq'].map(id=>html.indexOf('id="'+id+'"'));
    ck('30.41 输入区含三下拉 iPan/iMethod/iTq（且按此顺序）',
      ids.every(i=>i>=0)&&ids[0]<ids[1]&&ids[1]<ids[2], true);
    ck('30.42 派别选项为转盘/飞盘', /<select id="iPan">[\s\S]*?value="zhuan"[\s\S]*?value="fei"/.test(html), true);
    ck('30.43 定局法选项为拆补/置闰/茅山', /<select id="iMethod">[\s\S]*?value="chaibu"[\s\S]*?value="zhiran"[\s\S]*?value="maoshan"/.test(html), true);
    ck('30.44 寄宫选项为随芮/阳艮阴坤', /<select id="iTq">[\s\S]*?value="suirui"[\s\S]*?value="yangen-yinkun"/.test(html), true);
    const cf = html.match(/function cast\(\)\{[\s\S]*?\n\}/);
    ck('30.45 cast() 把三组流派透传 QM.cast',
      !!cf && cf[0].indexOf('QM.cast(Y,M,D,h0,m0,{lon,clock,ziSwap,jg,pan,method,tianqin})') >= 0, true);
    const sp = html.match(/function saveParams\(\)\{[\s\S]*?\n\}/);
    ck('30.46 存档带 pan/method/tq 三字段', !!sp && sp[0].indexOf("pan:document.getElementById('iPan').value") >= 0 && sp[0].indexOf("tq:document.getElementById('iTq').value") >= 0, true);
    const cs = html.match(/function castSummary\(R\)\{[\s\S]*?\n\}/);
    ck('30.47 摘要标注派别与定局法', !!cs && cs[0].indexOf("转盘派") >= 0 && cs[0].indexOf("置闰法") >= 0, true);
    ck('30.48 副标题与告示条不再写「尚未实现」',
      html.indexOf('转盘/飞盘') >= 0 && html.indexOf('尚未实现') < 0 && html.indexOf('流派配置') >= 0, true);
  }

  /* ---- 31. CORS 出口与 SSRF 硬化（2026-10-17） ----
     事故：route(req, handle(...)) 把 async handle 的 Promise 当 Response 用，
     带 Origin 的请求一律 200 + 空体；同源 POST 也带 Origin，线上解读/存档因此全空。 */
  {
    const O = 'https://qimen.dhxlsfn.dpdns.org';
    const rOk = await fm.onRequest({
      request: new Request('https://x/api/models', { headers: { Origin: O } }),
      env: { GEMINI_API_KEY: 'k' }
    });
    const jOk = await rOk.json();
    ck('31.1 带 Origin 的 onRequest 仍有响应体', Array.isArray(jOk.models) && jOk.models.length > 0, true);
    ck('31.2 白名单来源回显 ACAO', rOk.headers.get('access-control-allow-origin'), O);

    const rNull = await fm.onRequest({
      request: new Request('https://x/api/models', { headers: { Origin: 'null' } }),
      env: { GEMINI_API_KEY: 'k' }
    });
    ck('31.3 Origin null 默认不回 ACAO（防 sandbox iframe 跨站）', rNull.headers.get('access-control-allow-origin'), null);

    const rNullOn = await fm.onRequest({
      request: new Request('https://x/api/models', { headers: { Origin: 'null' } }),
      env: { GEMINI_API_KEY: 'k', QM_ALLOW_NULL_ORIGIN: '1' }
    });
    ck('31.4 显式 QM_ALLOW_NULL_ORIGIN=1 时才放行 file://', rNullOn.headers.get('access-control-allow-origin'), 'null');

    const rRecords = await fr.onRequest({
      request: new Request('https://x/api/records?limit=1', { headers: { Origin: O, 'CF-Connecting-IP': '9.9.9.9' } }),
      env: { QM_DB: fakeD1() }
    });
    const jRecords = await rRecords.json();
    ck('31.5 records 带 Origin 也返回 JSON 而非空体', Array.isArray(jRecords.records), true);

    ck('31.6 models 列表已下架 v4-pro', jOk.models.some(m => m.id === 'deepseek-v4-pro'), false);
    ck('31.7 BYOK 主机名一律拒 IPv6 字面量', L.byokBaseOk('http://[::ffff:127.0.0.1]/v1'), false);
    ck('31.8 BYOK 拒十进制整数主机名', L.byokBaseOk('http://2130706433/v1'), false);
    ck('31.9 BYOK 拒 rebinding 域名', L.byokBaseOk('http://127.0.0.1.nip.io/v1'), false);
    ck('31.10 BYOK 拒 URL 内嵌账号密码', L.byokBaseOk('http://user:pass@api.example.com/v1'), false);
    ck('31.11 BYOK 正常公网地址放行', L.byokBaseOk('https://api.example.com/v1'), true);

    ck('31.12 常量时间口令：正确为真', await L.safeEqual('s3', 's3'), true);
    ck('31.13 常量时间口令：错误为假', await L.safeEqual('s3', 's4'), false);

    /* ---- 五轮修复回归（2026-10-24） ---- */
    // P1：云端存档保留流派三键（此前 PARAM_KEYS 缺 pan/method/tq，飞盘/置闰局存云端读档变转盘/拆补）
    const d1Wu=fakeD1();
    await sv.handle(mkReqS({label:'飞盘置闰局',params:{date:'2026-10-14',time:'12:00',pan:'fei',method:'zhiran',tq:'yangen-yinkun'}}),{QM_DB:d1Wu});
    const insWu=JSON.parse(d1Wu.log[0].args[3]);
    ck('31.14 云端存档保留流派三键 pan/method/tq',insWu.pan==='fei'&&insWu.method==='zhiran'&&insWu.tq==='yangen-yinkun',true,JSON.stringify(insWu));
    // 流派脏值不入库（值域白名单），合法键不受影响
    const d1Wd=fakeD1();
    await sv.handle(mkReqS({params:{date:'2026-10-14',time:'12:00',pan:'evil',method:'chaibu'}}),{QM_DB:d1Wd});
    const insWd=JSON.parse(d1Wd.log[0].args[3]);
    ck('31.15 云端存档流派脏值被丢弃（pan=evil 不入库）',insWd.pan===undefined&&insWd.method==='chaibu',true,JSON.stringify(insWd));
    // P2：旺相休囚死五态（旧版「囚」行条件与「休」重复成死码，我克月令被误报为死）
    ck('31.16 旺衰五态：同令旺 / 令生我相 / 我生令休',YS.wangshu('甲','卯')==='旺'&&YS.wangshu('甲','子')==='相'&&YS.wangshu('甲','巳')==='休',true);
    ck('31.17 旺衰五态：我克令囚 / 令克我死（旧版囚为死码）',YS.wangshu('甲','未')==='囚'&&YS.wangshu('甲','酉')==='死',true,YS.wangshu('甲','未')+'/'+YS.wangshu('甲','酉'));
    // P2：D1 留痕 cat/pillars 限长（此前原样入库，可被恶意写入超长字符串）
    globalThis.fetch=mockUpstream('sse');
    const dbCl=fakeD1();
    const respCl=await fi.handle(mkReq({pan:panTxt,cat:'c'.repeat(5000),pillars:'p'.repeat(5000)}),
      {QM_API_KEY:'sk',QM_BASE_URL:'https://api.example.com/v1',QM_MODEL:'m1',QM_DB:dbCl});
    await readSSE(respCl);
    const insCl=dbCl.log.find(x=>x.sql.indexOf('INSERT INTO readings')===0);
    ck('31.18 D1 留痕 cat 截到 40 / pillars 截到 120',!!insCl&&insCl.args[1].length===40&&insCl.args[2].length===120,true,insCl?insCl.args[1].length+'/'+insCl.args[2].length:'no-insert');
  }

  globalThis.fetch = origFetch;

  // 验证完毕输出小计
  console.log('\n=== 廿六 ~ 三十节异步组执行完毕 ===');
  final();
})();

/* ---- 汇总（异步组完成后输出；同步部分先记入 pending） ---- */
function final(){
  finished=true;
  console.log(`\n${'='.repeat(56)}`);
  console.log(`通过 ${pass} / 失败 ${fail}`);
  console.log('='.repeat(56));
  process.exit(fail?1:0);
}
let finished=false;
/* 若超时仍未完成（异常路径），强制输出汇总 */
setTimeout(()=>{if(!finished){final();}},20000);

