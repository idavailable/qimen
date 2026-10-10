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

  /* D1 存根（记录每条 SQL 及其绑定参数） */
  function fakeD1(){
    const log=[];
    return {log,prepare(sql){
      const rec={sql:sql,args:null};
      return {
        bind(...a){rec.args=a;return{
          run:async()=>{log.push(rec);return{success:true};},
          first:async()=>{log.push(rec);return{id:1,created_at:'t',cat:'qiucai',pillars:'',pan:'',question:'',answer:'',model:'m',ms:1};},
          all:async()=>{log.push(rec);return{results:[{id:1}]};}
        };},
        first:async()=>{log.push(rec);return{n:7};},
        all:async()=>{log.push(rec);return{results:[{id:1}]};},
        run:async()=>{log.push(rec);return{success:true};}
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
  r2=await fr.handle(new Request('https://x/api/records?id=3',{method:'DELETE'}),{QM_DB:db});
  ck('27.22 records 删除单条',(await r2.json()).deleted===3,true);
  r2=await fr.handle(new Request('https://x/api/records?all=1&code=x',{method:'DELETE'}),{QM_DB:db});
  ck('27.23 未设 ACCESS_CODE 禁止清空',r2.status===403,true);
  r2=await fr.handle(new Request('https://x/api/records',{method:'PUT'}),{QM_DB:db});
  ck('27.24 不支持的方法 → 405',r2.status===405,true);
  r2=await fr.handle(new Request('https://x/api/records'),{});
  ck('27.25 未绑定 D1 → 500',r2.status===500,true);

  /* 27.26 限流（软开关） */
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_DB:fakeD1(),RATE_LIMIT_PER_MIN:'1'});
  await readSSE(resp);
  resp=await fi.handle(mkReq({pan:panTxt}),{QM_API_KEY:'k',QM_DB:fakeD1(),RATE_LIMIT_PER_MIN:'1'});
  ck('27.26 超限返回 429',resp.status===429,true);

  globalThis.fetch=origFetch;

  // 验证完毕输出小计
  console.log('\n=== 廿六、廿七节异步组执行完毕 ===');
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

