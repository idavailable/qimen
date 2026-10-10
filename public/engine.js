/* ============================================================
   奇门遁甲起局引擎 · engine.js
   时家奇门 / 转盘派 / 拆补法定局
   浏览器与 Node 双环境可用
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) root.QM=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){

/* ---------- 基础数据 ---------- */
const TG=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DZ=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const PAL={
  1:{gua:'坎',dir:'北',  wx:'水',star:'天蓬',door:'休门'},
  2:{gua:'坤',dir:'西南',wx:'土',star:'天芮',door:'死门'},
  3:{gua:'震',dir:'东',  wx:'木',star:'天冲',door:'伤门'},
  4:{gua:'巽',dir:'东南',wx:'木',star:'天辅',door:'杜门'},
  5:{gua:'中',dir:'中宫',wx:'土',star:'天禽',door:'—'},
  6:{gua:'乾',dir:'西北',wx:'金',star:'天心',door:'开门'},
  7:{gua:'兑',dir:'西',  wx:'金',star:'天柱',door:'惊门'},
  8:{gua:'艮',dir:'东北',wx:'土',star:'天任',door:'生门'},
  9:{gua:'离',dir:'南',  wx:'火',star:'天英',door:'景门'}
};

const RING=[1,8,3,4,9,2,7,6];           // 顺时针八宫：北→东北→东→东南→南→西南→西→西北
const DOORS=RING.map(p=>PAL[p].door);    // 休 生 伤 杜 景 死 惊 开
const GRID=[4,9,2,3,5,7,8,1,6];          // 界面九宫格（南下北上）
const YIBU=['戊','己','庚','辛','壬','癸','丁','丙','乙']; // 六仪+三奇 布盘序
const GODS=['值符','螣蛇','太阴','六合','白虎','玄武','九地','九天'];
const XUN_YI={'甲子':'戊','甲戌':'己','甲申':'庚','甲午':'辛','甲辰':'壬','甲寅':'癸'};
const DOOR_WX={'休门':'水','生门':'土','伤门':'木','杜门':'木','景门':'火','死门':'土','惊门':'金','开门':'金'};
const STAR_WX={'天蓬':'水','天芮':'土','天冲':'木','天辅':'木','天禽':'土','天心':'金','天柱':'金','天任':'土','天英':'火'};
const TG_WX={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
const KE={木:'土',土:'水',水:'火',火:'金',金:'木'};
const ke=(a,b)=>KE[a]===b;

const TERMS=[
  ['小寒',285,1,6],['大寒',300,1,20],['立春',315,2,4],['雨水',330,2,19],['惊蛰',345,3,6],['春分',0,3,21],
  ['清明',15,4,5],['谷雨',30,4,20],['立夏',45,5,6],['小满',60,5,21],['芒种',75,6,6],['夏至',90,6,21],
  ['小暑',105,7,7],['大暑',120,7,23],['立秋',135,8,7],['处暑',150,8,23],['白露',165,9,8],['秋分',180,9,23],
  ['寒露',195,10,8],['霜降',210,10,23],['立冬',225,11,7],['小雪',240,11,22],['大雪',255,12,7],['冬至',270,12,22]
];

const JU={
  '冬至':[1,7,4],'小寒':[2,8,5],'大寒':[3,9,6],'立春':[8,5,2],'雨水':[9,6,3],'惊蛰':[1,7,4],
  '春分':[3,9,6],'清明':[4,1,7],'谷雨':[5,2,8],'立夏':[4,1,7],'小满':[5,2,8],'芒种':[6,3,9],
  '夏至':[9,3,6],'小暑':[8,2,5],'大暑':[7,1,4],'立秋':[2,5,8],'处暑':[1,4,7],'白露':[9,3,6],
  '秋分':[7,1,4],'寒露':[6,9,3],'霜降':[5,8,2],'立冬':[6,9,3],'小雪':[5,8,2],'大雪':[4,7,1]
};
const YANG_TERMS=new Set(['冬至','小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种']);

/* ---------- 天文历法 ---------- */
function toJD(y,m,d,h,mi,s){
  if(m<=2){y-=1;m+=12;}
  const A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+(h+mi/60+(s||0)/3600)/24;
}
function jdToUTC(jd){return new Date(Math.round((jd-2440587.5)*86400000));}

function sunLon(jd){
  const T=(jd-2451545.0)/36525;
  const L0=280.46646+36000.76983*T+0.0003032*T*T;
  const Mr=(357.52911+35999.05029*T-0.0001537*T*T)*Math.PI/180;
  const C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(Mr)
        +(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  const om=(125.04-1934.136*T)*Math.PI/180;
  const app=L0+C-0.00569-0.00478*Math.sin(om);
  return ((app%360)+360)%360;
}
function findLon(deg,guess){
  let jd=guess;
  for(let i=0;i<80;i++){
    let diff=deg-sunLon(jd);
    while(diff>180)diff-=360; while(diff<-180)diff+=360;
    if(Math.abs(diff)<1e-6)break;
    jd+=diff*1.0146;
  }
  return jd;
}
function eqOfTime(jd){
  const T=(jd-2451545.0)/36525;
  const L0=(280.46646+36000.76983*T+0.0003032*T*T)*Math.PI/180;
  const M=(357.52911+35999.05029*T-0.0001537*T*T)*Math.PI/180;
  const e=0.016708634-0.000042037*T;
  const eps=(23.4392911-0.0130042*T)*Math.PI/180;
  const y=Math.tan(eps/2)**2;
  return (y*Math.sin(2*L0)-2*e*Math.sin(M)+4*e*y*Math.sin(M)*Math.cos(2*L0)
        -0.5*y*y*Math.sin(4*L0)-1.25*e*e*Math.sin(2*M))*180/Math.PI*4;
}
function termsOfYear(y){
  return TERMS.map(t=>({name:t[0],lon:t[1],jd:findLon(t[1],toJD(y,t[2],t[3],0,0,0))}));
}

/* ---------- 干支 ---------- */
// 日干支序（0=甲子）。锚点：1949-10-01=甲子日（JDN 2433191）
function dayGZIndex(jdn){return ((jdn+49)%60+60)%60;}
function gz(i){return TG[i%10]+DZ[i%12];}
function hourZhi(h,mi){return Math.floor(((h+1)%24+(mi||0)/60)/2)%12;}
function hourTG(dayTG,zhi){return ((dayTG%5)*2+zhi)%10;}
function hourIdxOf(dayTG,zhi){
  const ht=hourTG(dayTG,zhi);
  for(let i=0;i<60;i++) if(i%10===ht&&i%12===zhi) return i;
  return -1;
}

/* ---------- 空亡 / 驿马 / 年干支 / 落宫 ---------- */
const ZHI_PAL={子:1,丑:8,寅:8,卯:3,辰:4,巳:4,午:9,未:2,申:2,酉:7,戌:6,亥:6};
// 旬空：旬首地支前二支（本旬未覆盖之支）。甲子旬空戌亥…甲寅旬空子丑
function xunKongZhi(xunStartIdx){const z=xunStartIdx%12;return [DZ[(z-2+12)%12],DZ[(z-1+12)%12]];}
function xunKongPal(xunStartIdx){return [...new Set(xunKongZhi(xunStartIdx).map(z=>ZHI_PAL[z]))];}
// 驿马（三合局马星）：申子辰→寅，寅午戌→申，巳酉丑→亥，亥卯未→巳
function maXingZhi(z){
  if([8,0,4].includes(z))return '寅';
  if([2,6,10].includes(z))return '申';
  if([5,9,1].includes(z))return '亥';
  if([11,3,7].includes(z))return '巳';
  return '寅';
}
function maXingPal(z){return ZHI_PAL[maXingZhi(z)];}
function yearGZIndex(y){return ((y-1984)%60+60)%60;}
// 甲遁六仪：甲随旬首遁于对应六仪
function dunGan(gan,xunStart){return gan==='甲'?XUN_YI[gz(xunStart)]:gan;}

/* ---------- 定局（拆补法） ---------- */
function findFuTou(dayIdx){
  for(let b=0;b<5;b++){
    const i=((dayIdx-b)%60+60)%60;
    if(i%10===0||i%10===5) return {idx:i,back:b};
  }
}
const YUAN_NAME=['上元','中元','下元'];
function yuanOf(dz){
  if([0,3,6,9].includes(dz))return 0;
  if([2,5,8,11].includes(dz))return 1;
  return 2;
}

/* ---------- 飞宫 ---------- */
function fly(start,steps,forward){
  let p=start;
  for(let i=0;i<steps;i++) p = forward ? (p%9)+1 : ((p-2+9)%9)+1;
  return p;
}
const ringIdx=p=>RING.indexOf(p);

/* ============================================================
   排盘核心
   入参: dun(1阳/-1阴) ju(1-9) hourIdx(时干支序) jg(中宫寄) zfOverride?
   ============================================================ */
function paipan(dun,ju,hourIdx,jg){
  jg=jg||2;
  const forward=dun===1;
  const di={};
  for(let i=0;i<9;i++){
    const p=forward?((ju-1+i)%9)+1:(((ju-1-i)%9)+9)%9+1;
    di[p]=YIBU[i];
  }
  const ganToPal={};
  for(let p=1;p<=9;p++) ganToPal[di[p]]=p;

  const xunStart=hourIdx-(hourIdx%10);
  const xunName=gz(xunStart);
  const xunYi=XUN_YI[xunName];
  const hourGan=TG[hourIdx%10];
  const hourZhi=DZ[hourIdx%12];
  const n=(hourIdx%10)+1;

  // 值符（星）原宫 = 旬首六仪地盘宫；值使（门）同宫
  const zfPal=ganToPal[xunYi];
  const zfStar=PAL[zfPal].star;                    // 中宫则为天禽
  const zfFrom=(zfPal===5)?2:zfPal;                // 天禽恒随天芮，自坤二宫起转
  const zsDoor=(zfPal===5)?PAL[jg].door:PAL[zfPal].door;

  // 天盘：值符加时干（甲遁六仪）
  const effGan=(hourGan==='甲')?xunYi:hourGan;
  let tGanPal=ganToPal[effGan];
  const zfTo=(tGanPal===5)?jg:tGanPal;             // 时干入中宫，寄于 jg 宫
  const shift=((ringIdx(zfTo)-ringIdx(zfFrom))%8+8)%8;

  const tian={},tianStar={};
  for(let i=0;i<8;i++){
    const fromP=RING[((i-shift)%8+8)%8];
    tian[RING[i]]=di[fromP];
    tianStar[RING[i]]=PAL[fromP].star;
  }
  tian[5]=di[5]; tianStar[5]='天禽';
  // 天禽恒随天芮：中宫干【寄】于天芮所临之宫的天盘（并存并显，不替换主干）
  const guestPal=RING[(ringIdx(2)+shift)%8];
  const guest={pal:guestPal,gan:di[5],star:'天禽',isZF:zfPal===5};

  // 八门：值使自原宫按洛书飞 n-1 步（中宫亦计一步），落宫后随转
  let zsLuo=fly(zfFrom,n-1,forward);
  if(zsLuo===5) zsLuo=jg;
  const doorShift=((ringIdx(zsLuo)-ringIdx(zfFrom))%8+8)%8;
  const door={};
  for(let i=0;i<8;i++) door[RING[i]]=DOORS[((i-doorShift)%8+8)%8];
  door[5]='—';

  // 八神：值符神起于值符落宫，阳顺阴逆
  const god={};
  const gStart=ringIdx(zfTo);
  for(let i=0;i<8;i++){
    const pos=forward?(gStart+i)%8:((gStart-i)%8+8)%8;
    god[RING[pos]]=GODS[i];
  }
  god[5]='—';

  const R={dun,ju,forward,di,tian,tianStar,door,god,guest,
          zfPal,zfStar,zfFrom,zfTo,zsDoor,zsPal:zfFrom,zsLuo,doorShift,shift,n,
          xunStart,xunName,xunYi,hourGan,hourZhi,hourIdx,jg,jiGuest:di[5],tGanPal,
          kong:{hour:{zhi:xunKongZhi(xunStart),pal:xunKongPal(xunStart)}}};
  R.geju=geju(R);
  return R;
}

/* ============================================================
   M2 · 格局库
   输出 {t:吉|凶|中, cat:分类, pal:宫位|null, txt:说明}
   ============================================================ */
const OPP={1:9,9:1,2:8,8:2,3:7,7:3,4:6,6:4};
const JI_MEN=['开门','休门','生门'];
const SAN_QI=['乙','丙','丁'];
const LIU_YI=['戊','己','庚','辛','壬','癸'];

/* ---- 十干克应（天盘干 + 地盘干，九干九干共 81 格）----
   格式 '天盘+地盘': [格局名, 吉凶, 断语]  */
const KEYING={
  /* 戊 */
  '戊乙':['青龙合灵','中','门吉事吉，门凶事凶，得贵人扶助'],
  '戊丙':['青龙返首','吉','大吉大利，谋为顺遂；若逢墓迫击刑，吉事成凶'],
  '戊丁':['青龙耀明','吉','谒贵求名、上书上表皆利；若值墓迫，惹是招非'],
  '戊戊':['青龙伏吟','中','凡事闭塞阻滞，宜安分静守'],
  '戊己':['贵人入狱','凶','公私皆不利，谋为受阻'],
  '戊庚':['值符飞宫','凶','吉事不吉，凶事更凶，主迁移变动'],
  '戊辛':['青龙折足','凶','吉门尚可谋为，凶门主招灾失财、足疾折伤'],
  '戊壬':['青龙入天牢','凶','阴阳事皆不利，投资亏本'],
  '戊癸':['青龙华盖','中','吉门招福，凶门多乖，事有合绊'],
  /* 乙 */
  '乙乙':['日奇伏吟','中','不宜谒贵求名，只可安分守身'],
  '乙丙':['奇仪顺遂','吉','吉事迁官进职，凶事夫妻离别'],
  '乙丁':['奇仪相佐','吉','最利文书考试，百事可为'],
  '乙戊':['利阴害阳','凶','门逢凶迫，破财伤人，不利公开行事'],
  '乙己':['日奇入墓','凶','被土暗昧，门凶事凶；得开门为地遁有救'],
  '乙庚':['日奇被刑','凶','争讼财产，夫妻怀私'],
  '乙辛':['青龙逃走','凶','人亡财破，奴仆拐带，六畜皆伤'],
  '乙壬':['日奇入地','凶','尊卑悖乱，官讼是非，有人谋害'],
  '乙癸':['日奇地网','中','遁迹隐形、躲灾避难则吉，进取则凶'],
  /* 丙 */
  '丙乙':['日月并行','吉','阴阳得位，公私谋为皆吉'],
  '丙丙':['月奇悖师','凶','文书逼迫，破耗遗失'],
  '丙丁':['月奇朱雀','吉','贵人文书吉利，常人平静；得生门为天遁'],
  '丙戊':['飞鸟跌穴','吉','吉从天降，不劳而获；若逢迫墓击刑，减吉至凶'],
  '丙己':['火悖入刑','凶','囚人刑杖，文书不行；吉门得吉，凶门转凶'],
  '丙庚':['荧入太白','凶','门户破败，盗贼耗失，贼病皆去'],
  '丙辛':['月奇相合','吉','凶象被合，谋事成就，病人不凶'],
  '丙壬':['火入天罗','凶','为客不利，是非颇多'],
  '丙癸':['月奇地网','凶','暗昧不明，阴人害事，灾祸频生'],
  /* 丁 */
  '丁乙':['玉女奇生','吉','加官进禄，婚姻财喜，利于文章'],
  '丁丙':['星随月转','吉','贵人越级高升，常人乐中生悲'],
  '丁丁':['星奇伏吟','吉','文书即至，喜事遂心'],
  '丁戊':['青龙转光','吉','官人升迁，常人威昌，利婚求学'],
  '丁己':['火入勾陈','凶','奸私仇冤，事因女人，谋为不利'],
  '丁庚':['文书阻隔','凶','消息不通，行人必归'],
  '丁辛':['朱雀入狱','凶','罪人释囚，官人失位，牢狱之灾'],
  '丁壬':['五神互合','吉','凡事能成，贵人思诏，讼狱公平'],
  '丁癸':['朱雀投江','凶','文书口舌，音信沉溺，官府词讼'],
  /* 己 */
  '己乙':['地户逢星','凶','墓神不明，宜遁迹隐形，前途渺茫'],
  '己丙':['火悖地户','凶','阳人冤冤相害，阴人必致淫污'],
  '己丁':['朱雀入墓','中','文状词讼，先曲后直，拨云见日'],
  '己戊':['犬遇青龙','中','门吉谋望遂意，门凶枉劳心机'],
  '己己':['地户逢鬼','凶','病者必死，百事不遂，不可谋为'],
  '己庚':['刑格反名','凶','谋为徒劳，先动不利，谨防谋害'],
  '己辛':['游魂入墓','凶','人鬼相侵，鬼魅作祟，凡事谨慎'],
  '己壬':['地网高张','凶','尊卑悖乱，官讼是非'],
  '己癸':['地刑玄武','凶','阴人病灾，奸私暗昧'],
  /* 庚 */
  '庚乙':['太白逢星','中','退吉进凶，谋为不利'],
  '庚丙':['白入荧','凶','贼必来，门户破财，凶信将至'],
  '庚丁':['亭亭之格','凶','官事忧疑，私匿不正'],
  '庚戊':['天乙伏宫','凶','谋为不利，主换地方'],
  '庚己':['官符刑格','凶','官讼刑狱，谋为不利'],
  '庚庚':['太白同宫','凶','官灾横祸，兄弟雷攻'],
  '庚辛':['白虎干格','凶','远行道路伤折，车马堕毁'],
  '庚壬':['上格','凶','远得失迷道路，男女音信难通'],
  '庚癸':['大格','凶','行人至，官司止；生产母子俱伤'],
  /* 辛 */
  '辛乙':['白虎猖狂','凶','人亡财失，六畜皆伤'],
  '辛丙':['干合悖师','中','门吉事吉，门凶事凶'],
  '辛丁':['狱神得奇','吉','囚人获释，官人加爵'],
  '辛戊':['困龙被伤','凶','官讼屈抑，守分犹可'],
  '辛己':['入狱自刑','凶','幽暗不明，奴仆背主'],
  '辛庚':['白虎出力','凶','主客相残，刀刃相交'],
  '辛辛':['伏吟天庭','凶','公废私就，讼狱自罹'],
  '辛壬':['凶蛇入狱','凶','两男争女，讼狱不息，先动失理'],
  '辛癸':['天牢华盖','凶','日月失明，误入天网'],
  /* 壬 */
  '壬乙':['小蛇日奇','吉','大贵，利求名求财'],
  '壬丙':['水蛇入火','凶','官灾刑狱，水火相战'],
  '壬丁':['干合蛇刑','吉','贵人恩诏，讼狱公平'],
  '壬戊':['小蛇化龙','吉','男人发达，女人产婴童'],
  '壬己':['反吟蛇刑','凶','官讼败诉，顺守可吉'],
  '壬庚':['太白擒蛇','中','刑狱公平，立部施策'],
  '壬辛':['腾蛇相缠','凶','纵得吉门，亦难安宁'],
  '壬壬':['蛇入地罗','凶','外人缠绕内事索索，吉门吉星庶免蹉跎'],
  '壬癸':['幼女奸淫','凶','家有丑声，门吉星凶反祸福隆'],
  /* 癸 */
  '癸乙':['华盖逢星','吉','贵人禄位，常人平安'],
  '癸丙':['华盖悖师','凶','贵贱逢之皆不利，文书口舌'],
  '癸丁':['螣蛇夭矫','凶','文书官讼，火焚难逃'],
  '癸戊':['天乙会合','吉','求财婚姻，吉人赞助成合'],
  '癸己':['华盖地户','中','男女音信皆阻，躲灾避难为吉'],
  '癸庚':['太白入网','凶','以暴力争讼，自罹罪责'],
  '癸辛':['网盖天牢','凶','主病讼，囚人受刑'],
  '癸壬':['复见螣蛇','凶','嫁娶重婚，各相欺瞒'],
  '癸癸':['天网四张','凶','不可举动，百事皆凶']
};

/* ---- 三奇应克（天盘三奇临九宫吉凶）----
   底本同上：乙丙丁到乾坎艮震巽离坤兑各宫之名 */
const SANYING={
  6:{'乙':['玉兔入天门','吉'],'丙':['天成天权','凶'],'丁':['火到天门','吉']},
  1:{'乙':['玉兔投泉','吉'],'丙':['丙火烧壬','吉'],'丁':['朱雀投江','吉']},
  8:{'乙':['玉兔步贵宫','吉'],'丙':['凤入丹山','吉'],'丁':['玉女乘云','吉']},
  3:{'乙':['日出扶桑','吉'],'丙':['月入雷门','吉'],'丁':['最明','吉']},
  4:{'乙':['玉兔乘风','吉'],'丙':['火起风行','吉'],'丁':['美女留神','吉']},
  9:{'乙':['玉兔当阳','吉'],'丙':['月照端门','吉'],'丁':['乘龙万里','吉']},
  2:{'乙':['玉兔入坤中','吉'],'丙':['子居母舍','吉'],'丁':['玉女游地户','吉']},
  7:{'乙':['玉女受制','中'],'丙':['凤凰折翅','凶'],'丁':['丁奇入兑','中']}
};

/* ---- 三奇入墓 / 六仪击刑（依墓库、三刑方位）----
   入墓：乙木墓未→坤二；丙火墓戌→乾六；丁火墓丑→艮八
   击刑：戊(甲子)刑卯→震三；己(甲戌)刑未→坤二；庚(甲申)刑寅→艮八；
         辛(甲午)刑午→离九；壬(甲辰)刑辰→巽四；癸(甲寅)刑巳→巽四 */
const QI_MU={'乙':2,'丙':6,'丁':8};
const YI_JI_XING={'戊':3,'己':2,'庚':8,'辛':9,'壬':4,'癸':4};

/* ---- 格局识别主函数 ---- */
function geju(R,dayGan){
  const out=[];
  const push=(t,cat,pal,txt)=>out.push({t,cat,pal,txt});
  const pn=p=>`${PAL[p].gua}${p}宫`;

  /* ① 九遁 + 十干克应 + 击刑入墓门迫（逐宫） */
  for(let p=1;p<=9;p++){
    if(p===5)continue;
    const sky=R.tian[p],ea=R.di[p],d=R.door[p],gd=R.god[p];

    // 九遁（吉格，优先于泛用"吉门合奇"）
    let dun=null;
    if(d==='生门'&&sky==='丙'&&ea==='丁')dun='天遁（生门+丙奇+地盘丁）';
    else if(d==='开门'&&sky==='乙'&&ea==='己')dun='地遁（开门+乙奇+地盘己）';
    else if(d==='休门'&&sky==='丁'&&gd==='太阴')dun='人遁（休门+丁奇+太阴）';
    else if(d==='生门'&&sky==='丙'&&gd==='九天')dun='神遁（生门+丙奇+九天）';
    else if(gd==='九地'&&sky==='丁'&&(d==='杜门'||d==='开门'))dun=`鬼遁（${d}+丁奇+九地）`;
    else if(sky==='乙'&&JI_MEN.includes(d)){
      if(p===4)dun='风遁（乙奇临巽四宫+吉门）';
      else if(p===8&&ea==='辛'&&(d==='休门'||d==='生门'))dun='虎遁（乙奇+辛临艮八宫+休/生）';
      else if(ea==='辛')dun='云遁（乙奇+地盘辛+吉门）';
      else if(p===1||ea==='癸')dun='龙遁（乙奇临坎宫/地盘癸+吉门）';
    }
    if(!dun&&sky==='庚'&&d==='开门'&&p===7)dun='虎遁（庚+开门临兑七宫）';
    if(dun)push('吉','九遁',p,dun);

    // 十干克应
    const k=KEYING[sky+ea];
    if(k)push(k[1],'十干克应',p,`${sky}加${ea} ${k[0]} —— ${k[2]}`);

    // 三奇应克（乙丙丁临九宫之名）
    const sy=SANYING[p]&&SANYING[p][sky];
    if(sy)push(sy[1],'三奇临宫',p,`${sky}奇临${PAL[p].gua}${p}宫 ${sy[0]}`);

    // 泛用吉门合奇（九遁已命中则不再重复）
    if(!dun&&JI_MEN.includes(d)&&SAN_QI.includes(sky))
      push('吉','三奇吉门',p,`${d}合${sky}奇`);

    // 三奇入墓
    if(QI_MU[sky]===p)push('凶','入墓击刑',p,`三奇入墓（${sky}奇墓于${pn(p)}）`);
    // 六仪击刑
    if(YI_JI_XING[sky]===p)push('凶','入墓击刑',p,`六仪击刑（${sky}刑于${pn(p)}）`);
    // 门迫（门克宫）
    if(d&&d!=='—'&&ke(DOOR_WX[d],PAL[p].wx))push('凶','门宫生克',p,`门迫（${d}克${pn(p)}）`);
    else if(d&&d!=='—'&&ke(PAL[p].wx,DOOR_WX[d]))push('中','门宫生克',p,`门受制（${pn(p)}克${d}）`);
  }

  /* ② 伏吟 / 反吟（全盘统计，避免逐宫刷屏） */
  let fStar=0,fDoor=0,fGan=0,yStar=0,yDoor=0,yGan=0;
  for(let p=1;p<=9;p++){
    if(p===5)continue;
    if(R.tianStar[p]===PAL[p].star)fStar++;
    if(R.door[p]===PAL[p].door)fDoor++;
    if(R.tian[p]===R.di[p])fGan++;
    if(R.tianStar[p]===PAL[OPP[p]].star)yStar++;
    if(R.door[p]===PAL[OPP[p]].door)yDoor++;
    if(R.tian[p]===R.di[OPP[p]])yGan++;
  }
  if(fStar===8)push('凶','伏吟反吟',null,'九星伏吟（全盘归本位）· 宜静守不宜谋动');
  else if(fStar>=4)push('中','伏吟反吟',null,`九星伏吟 ${fStar}/8 宫`);
  if(fDoor===8)push('凶','伏吟反吟',null,'八门伏吟（全盘归本位）· 事体迟滞');
  else if(fDoor>=4)push('中','伏吟反吟',null,`八门伏吟 ${fDoor}/8 宫`);
  if(fGan===8)push('凶','伏吟反吟',null,'天地盘伏吟（十干皆归本位）');
  if(yStar===8)push('凶','伏吟反吟',null,'九星反吟（全盘落对宫）· 事多反覆');
  else if(yStar>=4)push('中','伏吟反吟',null,`九星反吟 ${yStar}/8 宫`);
  if(yDoor===8)push('凶','伏吟反吟',null,'八门反吟（全盘落对宫）');
  else if(yDoor>=4)push('中','伏吟反吟',null,`八门反吟 ${yDoor}/8 宫`);

  /* ③ 三奇得使：天盘三奇所在之宫，其门恰为值使门 */
  for(let p=1;p<=9;p++){
    if(p===5)continue;
    if(SAN_QI.includes(R.tian[p])&&R.door[p]===R.zsDoor)
      push('吉','三奇得使',p,`三奇得使（${R.tian[p]}奇+值使${R.zsDoor}于${pn(p)}）`);
  }

  /* ④ 玉女守门：值使门所落之宫，地盘为丁奇 */
  if(R.di[R.zsLuo]==='丁')
    push('吉','玉女守门',R.zsLuo,`玉女守门（值使${R.zsDoor}落${pn(R.zsLuo)}，地盘得丁奇）· 利宴会婚姻喜庆`);

  /* ⑤ 三奇贵人升殿（通行说法） */
  const SD={'乙':3,'丙':4,'丁':9};
  for(let p=1;p<=9;p++){
    if(p===5)continue;
    const sky=R.tian[p];
    if(SD[sky]===p)push('吉','三奇升殿',p,`三奇贵人升殿（${sky}奇临${pn(p)}本殿）`);
  }

  /* ⑥ 五不遇时（需日干，仅真实起局有） */
  if(dayGan&&ke(TG_WX[R.hourGan],TG_WX[dayGan]))
    push('凶','五不遇时',null,`五不遇时（时干${R.hourGan}克日干${dayGan}）· 凡谋不利`);

  /* 排序：吉 → 中 → 凶，同类按宫位 */
  const ORD={'吉':0,'中':1,'凶':2};
  out.sort((a,b)=>(ORD[a.t]-ORD[b.t])||(a.cat<b.cat?-1:a.cat>b.cat?1:0)||((a.pal||0)-(b.pal||0)));
  return out;
}

/* ============================================================
   完整起局：公历时间 → 盘
   opts: {lon, clock:'std'|'local'|'true', ziSwap:bool, jg}
   ============================================================ */
function cast(y,mo,d,h,mi,opts){
  opts=opts||{};
  const lon=opts.lon!==undefined?opts.lon:120;
  const clock=opts.clock||'true';
  const ziSwap=opts.ziSwap!==false;
  const jg=opts.jg||2;

  const jdUTC=toJD(y,mo,d,h-8,mi,0);
  const lonCorr=(lon-120)*4;
  const eot=eqOfTime(jdUTC);
  let corrMin=0;
  if(clock==='local')corrMin=lonCorr;
  else if(clock==='true')corrMin=lonCorr+eot;
  const jdAdj=jdUTC+corrMin/1440;

  // 当地太阳时（仍按 UTC+8 钟面记数）
  const dLoc=jdToUTC(jdAdj+8/24);
  const ly=dLoc.getUTCFullYear(),lm=dLoc.getUTCMonth()+1,ld=dLoc.getUTCDate();
  const lh=dLoc.getUTCHours(),lmi=dLoc.getUTCMinutes();

  // 日干支（23点换日）
  const dayShift=(ziSwap&&lh>=23)?1:0;
  const jdn=Math.floor(toJD(ly,lm,ld,0,0,0)+dayShift+0.5);
  const dayIdx=dayGZIndex(jdn);

  // 时干支
  const zhi=hourZhi(lh,lmi);
  const hourIdx=hourIdxOf(dayIdx%10,zhi);

  // 节气（jdAdj 前最近一个）
  let list=[];
  for(const yy of [ly-1,ly,ly+1]) list=list.concat(termsOfYear(yy));
  list.sort((a,b)=>a.jd-b.jd);
  let cur=null,next=null;
  for(const t of list){ if(t.jd<=jdAdj)cur=t; else if(!next)next=t; }

  // 拆补定局
  const ft=findFuTou(dayIdx);
  const yuan=yuanOf(ft.idx%12);
  const isYang=YANG_TERMS.has(cur.name);
  const dun=isYang?1:-1;
  const ju=JU[cur.name][yuan];

  const R=paipan(dun,ju,hourIdx,jg);
  R.meta={jdUTC,jdAdj,corrMin,lonCorr,eot,ly,lm,ld,lh,lmi,lon,clock,ziSwap,jg,
          dayGZ:gz(dayIdx),hourGZ:gz(hourIdx),dayIdx,hourIdx,
          term:cur.name,termJD:cur.jd,nextTerm:next?next.name:null,nextJD:next?next.jd:null,
          fuTou:gz(ft.idx),fuTouBack:ft.back,yuan,yuanName:YUAN_NAME[yuan]};
  // 年干支 / 空亡 / 驿马 / 落宫
  const yearIdx=yearGZIndex(ly);
  const dayXun=dayIdx-(dayIdx%10);
  const dayG=TG[dayIdx%10];
  const dayDun=dunGan(dayG,dayXun);
  const hourDun=dunGan(R.hourGan,R.xunStart);
  const palOfDi=g=>{for(let p=1;p<=9;p++)if(R.di[p]===g)return p;return null;};
  R.nian={gan:TG[yearIdx%10],zhi:DZ[yearIdx%12],idx:yearIdx};
  R.kong.day={zhi:xunKongZhi(dayXun),pal:xunKongPal(dayXun)};
  R.ma={day:{zhi:maXingZhi(dayIdx%12),pal:maXingPal(dayIdx%12)},
        year:{zhi:maXingZhi(yearIdx%12),pal:maXingPal(yearIdx%12)}};
  R.luo={dayGan:dayG,dayDun,dayPal:palOfDi(dayDun),
         hourGan:R.hourGan,hourDun,hourPal:palOfDi(hourDun)};
  R.geju=geju(R,dayG);
  return R;
}

return {TG,DZ,PAL,RING,DOORS,GRID,YIBU,GODS,JU,YANG_TERMS,YUAN_NAME,TERMS,
        toJD,jdToUTC,sunLon,findLon,eqOfTime,termsOfYear,
        dayGZIndex,gz,hourZhi,hourTG,hourIdxOf,
        findFuTou,yuanOf,fly,ringIdx,paipan,geju,cast,ke,
        DOOR_WX,STAR_WX,TG_WX,XUN_YI,
        ZHI_PAL,xunKongZhi,xunKongPal,maXingZhi,maXingPal,yearGZIndex,dunGan,
        KEYING,SANYING,QI_MU,YI_JI_XING,OPP,JI_MEN,SAN_QI};
});
