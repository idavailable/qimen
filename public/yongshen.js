/* 奇门遁甲 · M3 用神取法（v1 决策框架）
 * 依据：88s1《奇门断事取用神法》· 易德轩 · 月星堂《取用神法大全》· 郭旭民《奇门分析判断主要方法》
 * 纲领：日干=求测人（世），时干=所测之事（应），年干=长辈/上级，月干=同辈/同事
 * 落宫生克：横向比较一律按【落宫地盘五行】论
 * 浏览器：window.YS；Node：module.exports */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));
  else root.YS=factory(root.QM);
})(typeof self!=='undefined'?self:this,function(QM){

const {PAL,ke}=QM;
const GAN=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const SHENG={'金':'水','水':'木','木':'火','火':'土','土':'金'};
function sheng(a,b){return SHENG[a]===b;}

/* 天干 → 地盘宫（甲遁六仪后找）
 * xunIdx：该干所在柱的六十甲子序（日干传日柱序、时干传时柱序、年干传年柱序、月干传月柱序）。
 * 甲按【本柱旬】遁六仪——与 engine.js R.luo.dayDun（日柱旬）/ hourDun（时柱旬）口径一致；
 * 若一律用时柱旬，甲日用神表「求测人落Z宫」会与盘面文字「日干甲（遁X）落Y宫」给出两个答案。
 * 缺省 xunIdx 时退化为时柱序（paipan 直出模式只有时柱）。 */
function ganPal(R,g,xunIdx){
  let s=g;
  if(s==='甲'){
    let xi=xunIdx;
    if(typeof xi!=='number')xi=(R.meta?R.meta.hourIdx:R.hourIdx);
    if(xi===undefined||xi===null)return 5; // paipan 直出守卫
    s=QM.XUN_YI[QM.gz(xi-(xi%10))];
  }
  for(let p=1;p<=9;p++){if(R.di[p]===s)return p;}
  return 5;
}
/* 门 → 宫 */
function doorPal(R,d){for(let p=1;p<=9;p++){if(p!==5&&R.door[p]===d)return p;}return null;}
/* 星 → 宫（天盘找，天禽随芮） */
function starPal(R,s){for(let p=1;p<=9;p++){if(p!==5&&R.tianStar[p]===s)return p;}return null;}
/* 神 → 宫 */
function godPal(R,g){for(let p=1;p<=9;p++){if(p!==5&&R.god[p]===g)return p;}return null;}

/* 四柱干（年/月/日/时） */
function pillars(R){
  const m=R.meta;
  if(!m)return{year:'?',month:'?',day:'?',hour:'?'}; // paipan 直出守卫
  const dayStem=m.dayGZ?m.dayGZ[0]:GAN[(m.dayIdx||0)%10];
  const hourStem=m.hourGZ?m.hourGZ[0]:GAN[0];
  // 年干：1984=甲子锚点
  /* F2 + F21：干支年以立春为界。优先用 engine 给出的 meta.gzYear；
     兜底（老存档/无 meta）按立春真实时刻比较 jdUTC，再退化为「1 月或小寒/大寒 → 上一年」。 */
  const gzY=(typeof m.gzYear==='number')?m.gzYear:
    ((typeof m.jdUTC==='number'&&typeof m.liChunJD==='number')?(m.jdUTC>=m.liChunJD?m.ly:m.ly-1):
     ((m.lm===1||m.term==='小寒'||m.term==='大寒')?m.ly-1:m.ly));
  const yIdx=QM.yearGZIndex(gzY);
  const yearStem=GAN[yIdx%10];
  // 月干：五虎遁（年上起月），节气→月数（寅=1…丑=12）
  /* 节气→月份（寅=1…丑=12），每两节气同属一月 */
  const TM={'立春':1,'雨水':1,'惊蛰':2,'春分':2,'清明':3,'谷雨':3,
    '立夏':4,'小满':4,'芒种':5,'夏至':5,'小暑':6,'大暑':6,
    '立秋':7,'处暑':7,'白露':8,'秋分':8,'寒露':9,'霜降':9,
    '立冬':10,'小雪':10,'大雪':11,'冬至':11,'小寒':12,'大寒':12};
  const mNum=TM[m.term]||1;
  const yNum=yIdx%10;
  const mStem=GAN[((yNum%5)*2+2+(mNum-1))%10];
  /* 完整干支（存档标签等展示用；只加字段，不改动原有四干字段） */
  const ZHI12=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  /* 各柱六十甲子序：日干/时干/年干/月干为甲时按本柱旬遁六仪用 */
  const dayIdx=(typeof m.dayIdx==='number')?m.dayIdx:null;
  const hourIdx=(typeof m.hourIdx==='number')?m.hourIdx:
    ((typeof R.hourIdx==='number')?R.hourIdx:null);
  // 月柱序：五虎遁月干与节气月支求中国剩余定理解（i%10=月干, i%12=月支）
  const mStemIdx=((yNum%5)*2+2+(mNum-1))%10;
  let monthIdx=null;
  for(let i=0;i<60;i++){if(i%10===mStemIdx&&i%12===(mNum+1)%12){monthIdx=i;break;}}
  return{year:yearStem,month:mStem,day:dayStem,hour:hourStem,
         yearGZ:QM.gz(yIdx),monthGZ:mStem+ZHI12[(mNum+1)%12],
         dayGZ:m.dayGZ||'?',hourGZ:m.hourGZ||'?',
         yearIdx:yIdx,monthIdx,dayIdx,hourIdx};
}

/* 落宫盘面速写 */
function palDesc(R,p){
  if(!p||p<1||p>9)return{txt:'未找到'};
  let s=PAL[p].gua+p+'宫('+PAL[p].wx+'·'+PAL[p].dir+')';
  if(p!==5)s+=' '+R.god[p]+'/'+R.tianStar[p]+'/'+R.door[p];
  else s+=' 中宫';
  if(R.kong&&R.kong.hour&&R.kong.hour.pal&&R.kong.hour.pal.includes(p))s+=' [旬空]';
  return{txt:s};
}

/* 与日干宫的生克（按落宫五行）；dayXunIdx 为日柱六十甲子序（甲日按日柱旬遁干） */
function relToDay(R,p,dayStem,dayXunIdx){
  if(!p)return{rel:'—'};
  const dp=ganPal(R,dayStem,dayXunIdx);
  if(p===dp)return{rel:'自身'};
  const w=PAL[p].wx,wd=PAL[dp].wx;
  if(w===wd)return{rel:'比和'};
  if(ke(w,wd))return{rel:'克日干'};
  if(ke(wd,w))return{rel:'日干克'};
  if(sheng(w,wd))return{rel:'生日干'};
  if(sheng(wd,w))return{rel:'被日干生'};
  return{rel:'—'};
}

/* ---------- 类别用神表 ----------
 * t: gan日|gan时|gan年|gan月|gan戊|gan自|门|星|神|值符|值使
 * s: 具体符号（门名/星名/神名/干名） */
const CATS={
  qiucai:{name:'经营求财',ys:[
    {t:'gan日',role:'求测人（世）'},
    {t:'gan时',role:'财货/所测之事（应）'},
    {t:'gan戊',role:'资本'},
    {t:'门',s:'生门',role:'利息/财星'},
    {t:'值符',role:'货主/行情/债主'},
    {t:'值使',role:'购货人/应期'},
    {t:'神',s:'六合',role:'经纪人/中介'}]},
  gongzuo:{name:'工作求职',ys:[
    {t:'gan日',role:'求测人'},
    {t:'门',s:'开门',role:'文职/单位'},
    {t:'门',s:'杜门',role:'武职'},
    {t:'值符',role:'顶头上司'},
    {t:'gan年',role:'上级领导'},
    {t:'gan月',role:'同事'}]},
  hunyin:{name:'恋爱婚姻',ys:[
    {t:'gan自',s:'乙',role:'女方'},
    {t:'gan自',s:'庚',role:'男方'},
    {t:'神',s:'六合',role:'媒人/婚姻'},
    {t:'gan自',s:'丙',role:'第三者（男）'},
    {t:'gan自',s:'丁',role:'第三者（女）'}]},
  jibing:{name:'疾病',ys:[
    {t:'gan日',role:'患者'},
    {t:'星',s:'天芮',role:'病星（落宫定部位）'},
    {t:'星',s:'天心',role:'医药/西医'},
    {t:'gan自',s:'乙',role:'中医'},
    {t:'门',s:'死门',role:'病情（危重则看）'}]},
  guansi:{name:'官司诉讼',ys:[
    {t:'gan日',role:'求测人'},
    {t:'值符',role:'原告'},
    {t:'gan时',role:'被告'},
    {t:'门',s:'开门',role:'法官'},
    {t:'门',s:'惊门',role:'律师/口舌'},
    {t:'门',s:'景门',role:'诉状/文书'},
    {t:'神',s:'六合',role:'证据/证人'}]},
  chuxing:{name:'出行远行',ys:[
    {t:'gan日',role:'出行人'},
    {t:'神',s:'九天',role:'远行/航线'},
    {t:'门',s:'景门',role:'道路'},
    {t:'门',s:'伤门',role:'车船'},
    {t:'gan时',role:'所往之地/事'}]},
  shiwu:{name:'失物',ys:[
    {t:'gan日',role:'失主'},
    {t:'gan时',role:'失物'},
    {t:'神',s:'玄武',role:'盗贼'},
    {t:'星',s:'天蓬',role:'赃物/大盗'}]},
  tianqi:{name:'天气',ys:[
    {t:'星',s:'天英',role:'晴/火'},
    {t:'星',s:'天柱',role:'雨'},
    {t:'星',s:'天蓬',role:'水雨'},
    {t:'星',s:'天辅',role:'风'},
    {t:'星',s:'天冲',role:'雷'},
    {t:'门',s:'景门',role:'晴'}]},
  fangdichan:{name:'买卖房产',ys:[
    {t:'gan日',role:'买/卖主'},
    {t:'门',s:'生门',role:'房屋'},
    {t:'门',s:'死门',role:'地皮/宅基'},
    {t:'值符',role:'物主/银行'},
    {t:'gan时',role:'房/地产'}]},
  kaocha:{name:'考试升学',ys:[
    {t:'gan日',role:'考生'},
    {t:'星',s:'天辅',role:'考试院'},
    {t:'值符',role:'主考官'},
    {t:'门',s:'景门',role:'试卷'},
    {t:'gan自',s:'丁',role:'文章'}]}
};

/* 解析单条用神 → 落宫 + 与日干关系 */
function resolve(R,it,py){
  let pal=null,sym='';
  switch(it.t){
    case 'gan日':sym=py.day;pal=ganPal(R,py.day,py.dayIdx);break;
    case 'gan时':sym=py.hour;pal=ganPal(R,py.hour,py.hourIdx);break;
    case 'gan年':sym=py.year;pal=ganPal(R,py.year,py.yearIdx);break;
    case 'gan月':sym=py.month;pal=ganPal(R,py.month,py.monthIdx);break;
    case 'gan戊':sym='戊(甲子)';pal=ganPal(R,'戊');break;
    case 'gan自':sym=it.s;pal=ganPal(R,it.s);break;
    case '门':sym=it.s;pal=doorPal(R,it.s);break;
    case '星':sym=it.s;pal=starPal(R,it.s);break;
    case '神':sym=it.s;pal=godPal(R,it.s);break;
    case '值符':sym=R.zfStar||'值符';pal=R.zfTo;break;
    case '值使':sym=R.zsDoor||'值使';pal=R.zsLuo;break;
    default:sym=it.s||'';pal=null;
  }
  const d=palDesc(R,pal);
  const rl=relToDay(R,pal,py.day,py.dayIdx);
  return{sym,role:it.role,pal,desc:d.txt,rel:rl.rel};
}

/* 取某类别全部用神 */
function take(R,catId){
  const cat=CATS[catId];
  if(!cat)return null;
  const py=pillars(R);
  return{name:cat.name,items:cat.ys.map(function(it){return resolve(R,it,py);})};
}

/* 简版：前 3 条用神一句话 */
function brief(R,catId){
  const t=take(R,catId);
  if(!t)return null;
  return t.items.slice(0,3).map(function(x){
    return x.sym+'('+x.role.slice(0,4)+')@'+(x.pal?x.pal+'宫':'—')+' '+x.rel;
  }).join(' · ');
}

const ALL=Object.keys(CATS);

return{CATS,ALL,take,brief,relToDay,ganPal,doorPal,starPal,godPal,pillars};
});
