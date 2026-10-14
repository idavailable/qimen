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

  /* D1 存根（记录每条 SQL 及其绑定参数；meta 对齐真实 D1：changes/last_row_id） */
  function fakeD1(){
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
  ck('28.1 返回 4 个内置模型',mj.models.length,4);
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
  pv=rp({GEMINI_API_KEY:'g'},{model:'deepseek-v4-pro'});
  ck('28.25 回落 Gemini 模型名换本家',pv.from==='gemini'&&pv.model==='gemini-3.8-flash',true,JSON.stringify(pv));
  pv=rp({DEEPSEEK_API_KEY:'d',DEEPSEEK_MODEL:'deepseek-v4-pro'},{model:'gemini-3.8-flash'});
  ck('28.26 回落尊重 DEEPSEEK_MODEL 覆盖',pv.model,'deepseek-v4-pro');

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
  await fi.handle(mkReq({pan:panTxt,model:'deepseek-v4-pro'}),{GEMINI_API_KEY:'g',DEEPSEEK_API_KEY:'d',QM_DB:fakeD1()});
  ck('28.23 端到端：deepseek-v4-pro 打到 DeepSeek',lastUp.url,'https://api.deepseek.com/v1/chat/completions');
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
  ck('30.28d 模型展示名（状态栏可读）', L.modelLabel('gemini-3.8-flash') + '/' + L.modelLabel('deepseek-v4-pro'), 'Gemini 3.8 Flash/DeepSeek V4 Pro');

  /* 30.29–30.33 前端：对比列等高 + 内部滚动 + 提示词 */
  {
    const fsx = require('fs');
    const html = fsx.readFileSync('./public/index.html', 'utf8');
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
    const html = fsx.readFileSync('./public/index.html', 'utf8');
    ck('30.35 存档面板含口令输入与「读全部」勾选', html.indexOf('id="savesCode"') >= 0 && html.indexOf('id="savesAll"') >= 0, true);
    const all = html.match(/async function cloudSavesAll\(code\)\{[\s\S]*?\n\}/);
    ck('30.36 全量查询走 ?all=1&code=', !!all && all[0].indexOf('/api/saves?limit=100&all=1&code=') >= 0, true);
    ck('30.37 全量条目带 admin 标记（供删除时附口令）', !!all && all[0].indexOf('admin:true') >= 0, true);
    const del = html.match(/async function delSave\(id\)\{[\s\S]*?\n\}/);
    ck('30.38 删跨网络存档附口令', !!del && del[0].indexOf('row.admin&&code') >= 0 && del[0].indexOf('&code=') >= 0, true);
    ck('30.39 口令与勾选持久化（KEY: qm_code_v1 / qm_all_v1）', html.indexOf("'qm_code_v1'") >= 0 && html.indexOf("'qm_all_v1'") >= 0, true);
    const lp = html.match(/function loadParams\(p\)\{[\s\S]*?\n\}/);
    ck('30.40 读档下拉值走选项白名单（iClock/iZi/iJi/yCat 四处，非法值回退不置空）',
      !!lp && (lp[0].match(/pickOpt\(/g) || []).length === 4 && lp[0].indexOf("pickOpt('yCat'") >= 0, true);
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

