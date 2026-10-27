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
/* 星 → 宫（天盘找，天禽随芮；飞盘中五入序，故 p=5 也参与搜索） */
function starPal(R,s){for(let p=1;p<=9;p++){if(p===5&&R.pan!=='fei')continue;if(R.tianStar[p]===s)return p;}return null;}
/* 神 → 宫（飞盘九神含中五，故 p=5 也参与搜索） */
function godPal(R,g){for(let p=1;p<=9;p++){if(p===5&&R.pan!=='fei')continue;if(R.god[p]===g)return p;}return null;}

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

/* ---------- 第十轮：分类断法模板（与 CATS 同源，buildPanText 注入提示词） ----------
   口径：纲领（用神分工）→ 断法（生克路线）→ 常见格局（与 engine 检出的克应表同名）。
   每条只写盘面可验证的结构，不写与现代学科交叉的断言（疾病/财法另受【现实边界】约束）。 */
const CAT_RULES={
  qiucai:'纲领：甲子戊为资本，生门为财源利息，时干为财货，值符为货主债主，六合为中介。'+
    '断法：首重生门与日干宫之生克——生门生助日干宫则财可求，生门克日干宫、落空亡或门迫则求财费力。'+
    '资本看戊（戊加戊「青龙会」主聚，庚加戊防破财），行情看值符旺衰；应期参值使宫数。',
  gongzuo:'纲领：开门为文职单位，杜门为武职，值符为顶头上司，年干为上级领导，月干为同事。'+
    '断法：开门生助日干宫则求职有望；开门克日干、落空亡或门迫则难成。'+
    '升迁看值符与年干生克，同僚关系看月干与日干宫；伏吟反吟主迟变。',
  hunyin:'纲领：乙奇为女方，庚为男方，六合为媒婚，丙为男之第三者，丁为女之第三者。'+
    '断法：乙庚生合则婚有可成，相克相刑则生变；六合生助乙庚为有媒有成。'+
    '现第三者（丙/丁）生克乙庚宫位以定其影响；成婚快慢参值使与内外盘。',
  jibing:'纲领：天芮为病星（落宫定部位），天心为医药，乙奇为中医，死门主危重，日干为患者。'+
    '断法：天芮与天心/乙奇的生克定医缘有无，天芮克日干宫则病势偏重；'+
    '落宫部位按八卦取象（坎耳肾、艮背手、震足肝、巽胆股、离目心、坤腹胃、兑口肺、乾首肠）。'+
    '注意：本类断语仅供参考，须提示及时就医，不得写成医学诊断。',
  guansi:'纲领：值符为原告，时干为被告，开门为法官，惊门为律师，景门为诉状文书，六合为证据。'+
    '断法：值符宫与时干宫的生克定主客之势；开门生助何方，则法官倾向于何方。'+
    '惊门旺相则辩有词，景门逢空亡则文书有失；六合为证据，空则证据不足。',
  chuxing:'纲领：日干为出行人，九天主远行，景门为道路，伤门为车船，时干为所往之地。'+
    '断法：日干宫生合时干宫（所往）则出行顺利；伤门、景门受克或逢空亡则道路车船有碍。'+
    '临九天主远、九地主迟；马星动与冲马星为期。',
  shiwu:'纲领：日干为失主，时干为失物，玄武为盗贼，天蓬为大盗。'+
    '断法：先分盗与非盗——玄武、天蓬生克时干宫以断；'+
    '时干落宫定失物所在（以宫位方位与门上盘取象），时干逢空亡则物难寻，得冲空填实之期可待。',
  tianqi:'纲领：天英主晴，天柱主雨，天蓬主水雨，天辅主风，天冲主雷，景门亦主晴。'+
    '断法：以当值星与月令旺衰定晴雨主次——水星（蓬）旺相则雨，火星（英）旺相则晴，'+
    '天冲主雷、天辅主风并参。天气为短期之占，应期以日时为尺度，远事不以天气断。',
  fangdichan:'纲领：生门为房屋，死门为地皮宅基，值符为物主或贷款方，时干为房产，日干为买卖方。'+
    '断法：生门生助日干宫则宅可求；死门受克注意地脉与纠纷；'+
    '涉贷款看值符与日干生克；交易快慢参值使宫数与内外盘。',
  kaocha:'纲领：天辅为学府考场，值符为主考官，景门为试卷，丁奇为文章，日干为考生。'+
    '断法：天辅生助日干宫则学有所遇；丁奇（文章）旺相而不逢空亡则文有力；'+
    '景门为试卷，逢空亡或门迫防疏漏；录取看值符与日干宫生克。'
};
/* ---------- 自定义求测：先识别事项，再按相关度选主辅用神 ----------
   「择优」只优化取用相关性，绝不按落宫吉凶倒推选哪个符号。
   关键词仅来自下列规则表，匹配依据可解释、可测试；未命中时退回日干/时干纲领。 */
const CUSTOM_RULES={
  qiucai:['求财','财运','生意','经营','投资','股票','基金','赚钱','回款','欠款','讨债','债务','贷款','开店','订单'],
  gongzuo:['工作','求职','跳槽','升职','升迁','调动','面试','入职','离职','事业','单位','同事','领导','裁员','任免'],
  hunyin:['婚姻','恋爱','感情','复合','分手','结婚','相亲','对象','配偶','夫妻','桃花'],
  jibing:['疾病','病情','身体','健康','手术','医院','医生','治疗','康复','医药'],
  guansi:['官司','诉讼','起诉','法院','仲裁','律师','纠纷','合同','签约','协议'],
  chuxing:['出行','远行','旅行','旅游','出差','搬家','搬迁','回国','航班','路途'],
  shiwu:['失物','丢失','找回','遗失','被盗','偷窃','偷走','落在哪'],
  tianqi:['天气','下雨','降雨','晴天','台风','下雪','暴雨','刮风','打雷'],
  fangdichan:['房产','买房','卖房','房屋','房子','楼盘','宅基','地皮','风水','租房'],
  kaocha:['考试','升学','考研','考公','录取','学校','学业','论文','证书','文章']
};
/* 具体问法优先于大类默认顺序：直接点名的对象先进入候选。 */
const CUSTOM_FOCUS=[
  {keys:['签约','合同','协议','合作'],items:[
    {t:'神',s:'六合',role:'合作/契约'},{t:'门',s:'景门',role:'合同/文书'}]},
  {keys:['升职','升迁','调动','任免'],items:[
    {t:'门',s:'开门',role:'职位/单位'},{t:'值符',role:'主管/决策方'},{t:'gan年',role:'上级领导'}]},
  {keys:['论文','文章','文书','作品'],items:[
    {t:'gan自',s:'丁',role:'文章/文书'},{t:'门',s:'景门',role:'文书/卷面'}]},
  {keys:['欠款','讨债','回款','债务'],items:[
    {t:'值符',role:'债主/债务方'},{t:'gan戊',role:'资金/资本'}]},
  {keys:['手术','治疗','医生','医药','康复'],items:[
    {t:'星',s:'天心',role:'医药/治疗'},{t:'gan自',s:'乙',role:'中医/药'}]},
  {keys:['被盗','偷窃','偷走'],items:[
    {t:'神',s:'玄武',role:'盗贼'},{t:'星',s:'天蓬',role:'赃物/大盗'}]},
  {keys:['下雨','降雨','暴雨'],items:[{t:'星',s:'天柱',role:'降雨'},{t:'星',s:'天蓬',role:'水雨'}]},
  /* 单字“晴/雷”会误命中（如「雷总」「晴」同形词），只收成词写法。 */
  {keys:['晴天','天晴','放晴','晴不晴'],items:[{t:'星',s:'天英',role:'晴/火'},{t:'门',s:'景门',role:'晴'}]},
  {keys:['刮风','风势','大风'],items:[{t:'星',s:'天辅',role:'风'}]},
  {keys:['打雷','雷雨','雷阵雨','雷声'],items:[{t:'星',s:'天冲',role:'雷'}]}
];
/* 各大类的主证优先序；未列出的符号仍可作为辅证，不因盘中吉凶被添删。 */
const CUSTOM_PRIMARY={
  qiucai:['门|生门','gan戊|','gan时|'],gongzuo:['门|开门','值符|','gan年|'],
  hunyin:['神|六合','gan自|乙','gan自|庚'],jibing:['星|天芮','星|天心','gan自|乙'],
  guansi:['值符|','gan时|','门|开门','门|景门'],chuxing:['gan时|','神|九天','门|伤门','门|景门'],
  shiwu:['gan时|','神|玄武'],tianqi:['星|天英','星|天柱','星|天蓬'],
  fangdichan:['门|生门','门|死门','gan时|'],kaocha:['星|天辅','门|景门','gan自|丁']
};
function cleanCustomQuery(q){
  return String(q||'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,200);
}
function customKey(it){return it.t+'|'+(it.s||'');}
function inferCustom(q){
  const query=cleanCustomQuery(q);
  let best={catId:null,score:0,matches:[],longest:0};
  for(const catId of Object.keys(CUSTOM_RULES)){
    const matches=CUSTOM_RULES[catId].filter(k=>query.includes(k));
    const score=matches.reduce((n,k)=>n+2+Math.min(k.length,4),0);
    const longest=matches.reduce((n,k)=>Math.max(n,k.length),0);
    if(score>best.score||(score===best.score&&score>0&&longest>best.longest))
      best={catId,score,matches,longest};
  }
  return best;
}
function catRule(id,customQuery){
  if(id!=='custom')return CAT_RULES[id]||'';
  const inf=inferCustom(customQuery);
  const base='纲领：自定义求测以日干为求测人、时干为所测事，按事项相关度确定主辅用神，不得按落宫吉凶倒推选取。'+
    '断法：先核主用神与日干宫的生克、旺衰、空亡及格局，再以辅用神补足人、事、物与应期；主辅结论冲突时回到具体所问，不作唯吉取舍。';
  if(!inf.catId)return base+' 本题未命中明确类别，仅按通用纲领取象，并说明不确定处。';
  return base+' 本题依据“'+inf.matches.join('、')+'”判为'+CATS[inf.catId].name+'。'+CAT_RULES[inf.catId];
}

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

/* 自定义求测：固定人/事两轴，最多再取 5 个高相关符号，避免全表堆砌。 */
function takeCustom(R,q){
  const query=cleanCustomQuery(q),py=pillars(R),inf=inferCustom(query);
  const fixed=[
    {it:{t:'gan日',role:'求测人（世）'},why:'通用纲领：日干为求测人'},
    {it:{t:'gan时',role:'所测之事（应）'},why:'通用纲领：时干为所测事',primary:!inf.catId}
  ];
  const candidates=[],seen=new Set(fixed.map(x=>customKey(x.it)));
  let order=0;
  function add(it,rank,why){
    const key=customKey(it);
    if(seen.has(key))return;
    seen.add(key);candidates.push({it,rank,why,order:order++});
  }
  /* 直接命中的具体对象权重最高。 */
  for(const focus of CUSTOM_FOCUS){
    const hits=focus.keys.filter(k=>query.includes(k));
    if(!hits.length)continue;
    const hit=hits.slice().sort((a,b)=>b.length-a.length)[0];
    focus.items.forEach((it,i)=>add(it,100-i,'问题直指“'+hit+'”，优先取'+it.role));
  }
  if(inf.catId){
    const cat=CATS[inf.catId],preferred=CUSTOM_PRIMARY[inf.catId]||[];
    cat.ys.forEach((it,i)=>{
      const pri=preferred.indexOf(customKey(it));
      const rank=pri>=0?70-pri:40-i;
      add(it,rank,(pri>=0?'主证':'辅证')+'：按'+cat.name+'取'+it.role);
    });
  }else{
    add({t:'值符',role:'主导/趋势'},50,'未命中细类，以值符辅看主导趋势');
    add({t:'值使',role:'执行/应期'},49,'未命中细类，以值使辅看执行与应期');
  }
  candidates.sort((a,b)=>(b.rank-a.rank)||(a.order-b.order));
  const chosen=candidates.slice(0,5);
  if(inf.catId&&chosen.length)chosen[0].primary=true;
  const items=fixed.concat(chosen).map(c=>Object.assign(resolve(R,c.it,py),{
    why:c.why,primary:!!c.primary
  }));
  const primary=items.find(x=>x.primary)||items[1];
  const name='自定义求测 · '+(inf.catId?CATS[inf.catId].name:'通用');
  const reason=inf.catId
    ?'命中“'+inf.matches.join('、')+'”→ '+CATS[inf.catId].name+'；主取'+primary.sym+'（'+primary.role+'）'
    :'未命中明确细类，主取时干为所测事，值符/值使为辅';
  return{name,query,matchedCat:inf.catId,matches:inf.matches,reason,items};
}

/* 取某类别全部用神；custom 走可解释的择优分支。 */
function take(R,catId,customQuery){
  if(catId==='custom')return takeCustom(R,customQuery);
  const cat=CATS[catId];
  if(!cat)return null;
  const py=pillars(R);
  return{name:cat.name,items:cat.ys.map(function(it){return resolve(R,it,py);})};
}

/* 简版：前 3 条用神一句话 */
function brief(R,catId,customQuery){
  const t=take(R,catId,customQuery);
  if(!t)return null;
  return t.items.slice(0,3).map(function(x){
    return x.sym+'('+x.role.slice(0,4)+')@'+(x.pal?x.pal+'宫':'—')+' '+x.rel;
  }).join(' · ');
}

/* ---------- 第十轮：应期结构化推算 ----------
   口径（《奇门法窍·论应期》+ 易德轩程序化步骤，两源一致；README 第十轮有出处）：
   ① 尺度：反吟近快、伏吟远慢；否则内盘（阳 1/8/3/4、阴 9/2/7/6）近快（日/时），
      外盘或四维宫远慢（月/年）
   ② 应期支按优先级：空亡（填实/冲空，自起局日支顺数先遇为应）＞马星（马动/冲马）＞
      刑冲（逢冲以合、逢合以冲）＞墓库（日干入墓取冲墓）＞三合虚位（日时三合缺支透出）＞
      旺衰（日干于月令旺相 → 当令为速应；休囚 → 待生扶为迟应）
   ③ 值使落宫数 = 事期约数
   只输出结构化线索不断吉凶；与盘面事实一并交模型，不得改写盘面。 */
const DZ12=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const CHONG={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
const HE={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'};
const SANHE={'申':'水','子':'水','辰':'水','寅':'火','午':'火','戌':'火','巳':'金','酉':'金','丑':'金','亥':'木','卯':'木','未':'木'};
const WX_ZHI={寅:'木',卯:'木',巳:'火',午:'火',申:'金',酉:'金',亥:'水',子:'水',辰:'土',戌:'土',丑:'土',未:'土'};
const WX_GAN={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const MU_OF={甲:'未',乙:'戌',丙:'戌',丁:'丑',戊:'戌',己:'丑',庚:'丑',辛:'辰',壬:'辰',癸:'未'};
const TERM_MONTH={'立春':1,'雨水':1,'惊蛰':2,'春分':2,'清明':3,'谷雨':3,'立夏':4,'小满':4,'芒种':5,'夏至':5,
  '小暑':6,'大暑':6,'立秋':7,'处暑':7,'白露':8,'秋分':8,'寒露':9,'霜降':9,'立冬':10,'小雪':10,'大雪':11,'冬至':11,'小寒':12,'大寒':12};
const INNER={1:[1,8,3,4],2:[9,2,7,6]};
const MONTH_ZHI=['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
function distDZ(from,to){return (DZ12.indexOf(to)-DZ12.indexOf(from)+12)%12;}
function wangshu(gan,monthZhi){
  const g=WX_GAN[gan]||'土',mw=WX_ZHI[monthZhi];
  if(g===mw)return'旺';          // 同令者旺
  if(SHENG[mw]===g)return'相';   // 令生我者相
  if(SHENG[g]===mw)return'休';   // 我生令者休
  /* 五轮（2026-10-24）：旧版此行误写为 SHENG[g]===mw（与「休」同条件），永不触发——
     「我克月令=囚」被并进「死」，应期依据文案把囚误标为死 */
  if(ke(g,mw))return'囚';        // 我克令者囚
  return'死';                    // 令克我者死
}
function yingqi(R){
  const m=R.meta;if(!m)return null;
  let pal=R.luo&&R.luo.dayPal;
  if(!pal)return null;
  if(pal===5&&R.pan!=='fei')pal=(R.guest&&R.guest.pal)||2;  /* 中宫按寄宫取地支（飞盘中五即中五，不寄） */
  const palZhi=Object.keys(QM.ZHI_PAL).filter(z=>QM.ZHI_PAL[z]===pal);
  const dayGZ=m.dayGZ||QM.gz(m.dayIdx||0);
  const dayStem=dayGZ[0],dayZhi=dayGZ[1];
  const hourZhi=(m.hourGZ||QM.gz(m.hourIdx||0))[1];
  /* ① 尺度（伏吟/反吟取自 geju 检出，非另起炉灶） */
  const gj=R.geju||[];
  const hasYin=gj.some(x=>x.t==='伏吟反吟'&&x.txt.indexOf('伏吟')>=0);
  const hasFan=gj.some(x=>x.t==='伏吟反吟'&&x.txt.indexOf('反吟')>=0);
  const inner=INNER[R.dun]||INNER[1];
  const inPal=inner.indexOf(pal)>=0;
  const isSiwei=[2,4,6,8].indexOf(pal)>=0;
  let scale,scaleWhy;
  if(hasFan){scale='近快';scaleWhy='反吟局，事多速应';}
  else if(hasYin){scale='远慢';scaleWhy='伏吟局，事多迟应';}
  else if(inPal){scale='近快';scaleWhy='用神落'+(R.dun===1?'阳':'阴')+'遁内盘（'+inner.join('、')+'宫）';}
  else{scale='远慢';scaleWhy='用神落外盘'+(isSiwei?'（四维宫亦主慢）':'');}
  /* ② 应期支（优先级链，先遇为应） */
  let branch='',basis='';
  const kong=(R.kong&&R.kong.hour&&R.kong.hour.zhi)||[];
  const emptyHere=palZhi.filter(z=>kong.indexOf(z)>=0);
  if(emptyHere.length){
    const cands=[];
    emptyHere.forEach(z=>{cands.push({z:z,k:'填实'});cands.push({z:CHONG[z],k:'冲空'});});
    cands.sort((a,b)=>distDZ(dayZhi,a.z)-distDZ(dayZhi,b.z));
    branch=cands[0].z;
    basis='用神宫逢旬空（'+emptyHere.join('、')+'），自起局日支'+dayZhi+'顺数，先遇'+cands[0].k+'之'+cands[0].z+'为应';
  }else{
    /* 时家奇门以时支定马（《应期》诸本口径） */
    const maZhi=QM.maXingZhi(DZ12.indexOf(hourZhi));
    if(palZhi.indexOf(maZhi)>=0){
      const dMa=distDZ(dayZhi,maZhi),dCh=distDZ(dayZhi,CHONG[maZhi]);
      if(dCh<dMa){branch=CHONG[maZhi];basis='用神宫临马星（'+maZhi+'），自'+dayZhi+'顺数先遇冲马之'+CHONG[maZhi];}
      else{branch=maZhi;basis='用神宫临马星（'+maZhi+'），自'+dayZhi+'顺数先遇马动之'+maZhi;}
    }else{
      const hit=palZhi.find(z=>CHONG[z]===dayZhi||CHONG[z]===hourZhi);
      const hitHe=palZhi.find(z=>HE[z]===dayZhi||HE[z]===hourZhi);
      if(hit){branch=HE[hit];basis='用神宫'+hit+'逢冲（'+CHONG[hit]+'），逢冲以合为应';}
      else if(hitHe){branch=CHONG[hitHe];basis='用神宫'+hitHe+'逢合（'+HE[hitHe]+'），逢合以冲为应';}
      else{
        const mu=MU_OF[dayStem];
        if(mu&&palZhi.indexOf(mu)>=0){branch=CHONG[mu];basis='日干'+dayStem+'入墓于'+mu+'宫，以冲墓之'+CHONG[mu]+'为应';}
        else{
          let done=false;
          if(SANHE[dayZhi]&&SANHE[dayZhi]===SANHE[hourZhi]){
            const need=DZ12.filter(z=>SANHE[z]===SANHE[dayZhi]&&z!==dayZhi&&z!==hourZhi);
            if(need.length===1){branch=need[0];basis='日支'+dayZhi+'时支'+hourZhi+'三合（'+SANHE[dayZhi]+'局）缺'+need[0]+'，待虚位透出';done=true;}
          }
          if(!done){
            const monthZhi=MONTH_ZHI[(TERM_MONTH[m.term]||1)%12];
            const ws=wangshu(dayStem,monthZhi);
            if(ws==='旺'||ws==='相'){branch=monthZhi;basis='日干'+dayStem+'（'+WX_GAN[dayStem]+'）于'+monthZhi+'月'+ws+'，以当令之月为应（速）';}
            else{const shengZhi=DZ12.find(z=>WX_ZHI[z]===SHENG[WX_GAN[dayStem]]);branch=shengZhi;basis='日干'+dayStem+'于'+monthZhi+'月'+ws+'，待得生扶（'+shengZhi+'）转旺为应（迟）';}
          }
        }
      }
    }
  }
  /* ③ 值使宫数 */
  const zs=(typeof R.zsLuo==='number')?R.zsLuo:null;
  return {pal,palZhi,scale,scaleWhy,scaleUnit:scale==='近快'?'日/时':'月/年',branch,basis,valueShi:zs,dayZhi,hourZhi};
}

const ALL=Object.keys(CATS);

return{CATS,CAT_RULES,ALL,take,takeCustom,inferCustom,cleanCustomQuery,brief,relToDay,ganPal,doorPal,starPal,godPal,pillars,catRule,yingqi,wangshu};
});
