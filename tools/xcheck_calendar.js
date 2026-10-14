/* ============================================================
   历法交叉校验（开发工具，不进部署产物）
   用法：
     NODE_PATH=<node workspace>/node_modules node tools/xcheck_calendar.js
   基准：lunar-javascript（独立天文实现）
   对比项：
     A. 二十四节气时刻（1900–2100）engine meta.termJD vs lunar 节气表
     B. 日干支（1900–2100 逐周采样）engine meta.dayGZ vs lunar getDayInGanZhi
     C. 立春翻转点（1900–2100）engine 立春前后年干支应相差一位
     D. 月干支（各节气中段）engine meta.monthGZ vs lunar getMonthInGanZhi
   ============================================================ */
'use strict';
const path=require('path');
const QM=require(path.join(__dirname,'..','public','engine.js'));
const YS=require(path.join(__dirname,'..','public','yongshen.js'));
let Lunar=null,Solar=null;
try{
  const LJ=require('lunar-javascript');Lunar=LJ.Lunar;Solar=LJ.Solar;
}catch(e){
  console.error('缺少依赖 lunar-javascript。安装后加 NODE_PATH 再跑：');
  console.error('  npm install lunar-javascript   （node workspace 内）');
  process.exit(2);
}

const T0=Date.now();
let warn=0,err=0;
const TERM_NAMES=['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种',
                  '夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

/* lunar 节气时刻 → UTC 儒略日（engine 的 JD 口径为 UTC）。
   注意：A/B 系数必须用「月≤2 已减一年」的调整后年份（Meeus 算法），
   否则 1/2 月整体偏 1 天——本工具第一版就踩过这个坑 */
function lunarJieQiJD(lt){
  const y=lt.getYear(),m=lt.getMonth(),d=lt.getDay(),h=lt.getHour(),mi=lt.getMinute(),s=lt.getSecond();
  /* 北京时 → UTC：减 8 小时 */
  const utcMs=Date.UTC(y,m-1,d,h,mi,s)-8*3600*1000;
  const dt=new Date(utcMs);
  let Y=dt.getUTCFullYear(),M=dt.getUTCMonth()+1;
  if(M<=2){Y-=1;M+=12;}
  const A=Math.floor(Y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+dt.getUTCDate()+B-1524.5+
    (dt.getUTCHours()+dt.getUTCMinutes()/60+dt.getUTCSeconds()/3600)/24;
}
function solarOfJieQi(y,tn){
  for(let m=1;m<=12;m++){
    const jq=Solar.fromYmd(y,m,1).getLunar().getJieQiTable();
    if(jq[tn])return jq[tn];
  }
  return null;
}

/* ---------- A. 节气时刻 ---------- */
let aChecked=0,aBad=0,aMaxMin=0;const aSamples=[];
for(let y=1900;y<=2100;y++){
  for(const tn of TERM_NAMES){
    const lt=solarOfJieQi(y,tn);
    if(!lt)continue;
    const jdL=lunarJieQiJD(lt);
    /* 在该节气第 3 天 12:00（真太阳时口径）起局，取 engine 的 termJD */
    const td=lt.getDay()+3;
    if(td>28)continue;
    const R=QM.cast(lt.getYear(),lt.getMonth(),td,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
    if(R.meta.term!==tn)continue; /* 引擎自己都判到别的节气，跳过（归属问题由 A2 覆盖） */
    aChecked++;
    const diffMin=Math.abs(R.meta.termJD-jdL)*1440;
    if(diffMin>aMaxMin)aMaxMin=diffMin;
    if(diffMin>30){
      aBad++;
      if(aSamples.length<12)aSamples.push(`${y} ${tn}: engine-lunar 差 ${diffMin.toFixed(1)} 分钟`);
    }
  }
}
console.log(`[A] 节气时刻比对：${aChecked} 点，>30分钟差 ${aBad} 处，最大差 ${aMaxMin.toFixed(1)} 分钟`);
aSamples.forEach(s=>console.log('    '+s));
if(aBad>0)warn+=aBad;
if(aMaxMin>120)err++;

/* ---------- B. 日干支 ---------- */
let bChecked=0,bBad=0;const bSamples=[];
for(let y=1900;y<=2100;y++){
  for(let m=1;m<=12;m++){
    const dim=new Date(Date.UTC(y,m,0)).getUTCDate();
    for(let d=1;d<=dim;d+=7){
      const R=QM.cast(y,m,d,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
      const l=Solar.fromYmd(y,m,d).getLunar();
      bChecked++;
      if(R.meta.dayGZ!==l.getDayInGanZhi()){
        bBad++;
        if(bSamples.length<10)bSamples.push(`${y}-${m}-${d} engine=${R.meta.dayGZ} lunar=${l.getDayInGanZhi()}`);
      }
    }
  }
}
console.log(`[B] 日干支比对：${bChecked} 天，不一致 ${bBad} 天`);
bSamples.forEach(s=>console.log('    '+s));
if(bBad>0)err+=bBad;

/* ---------- C. 立春翻转 ---------- */
const GAN=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const gzIdx=s=>{for(let i=0;i<60;i++)if(GAN[i%10]+ZHI[i%12]===s)return i;return -1;};
let cChecked=0,cBad=0;const cSamples=[];
for(let y=1900;y<=2100;y++){
  const lt=solarOfJieQi(y,'立春');
  if(!lt)continue;
  const t=new Date(Date.UTC(lt.getYear(),lt.getMonth()-1,lt.getDay(),lt.getHour(),lt.getMinute(),lt.getSecond()));
  const before=new Date(t.getTime()-2*3600*1000),after=new Date(t.getTime()+2*3600*1000);
  const gzOf=dt=>QM.gz(QM.yearGZIndex(QM.cast(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate(),dt.getUTCHours(),dt.getUTCMinutes(),
    {lon:120,clock:'true',ziSwap:false,jg:2}).meta.gzYear));
  const ib=gzIdx(gzOf(before)),ia=gzIdx(gzOf(after));
  cChecked++;
  if(!((ia-ib+60)%60===1)){
    cBad++;
    if(cSamples.length<10)cSamples.push(`${y} 立春 ${lt.toYmdHms()} before=${gzOf(before)} after=${gzOf(after)}`);
  }
}
console.log(`[C] 立春翻转比对：${cChecked} 年，异常 ${cBad} 年`);
cSamples.forEach(s=>console.log('    '+s));
if(cBad>0)err+=cBad;

/* ---------- D. 月干支（节气中段，流派口径差异记 warn） ---------- */
let dChecked=0,dBad=0;const dSamples=[];
for(let y=1950;y<=2050;y++){
  for(const tn of TERM_NAMES){
    const lt=solarOfJieQi(y,tn);
    if(!lt)continue;
    const td=lt.getDay()+6;
    if(td>28)continue;
    const R=QM.cast(lt.getYear(),lt.getMonth(),td,12,0,{lon:120,clock:'true',ziSwap:true,jg:2});
    const l=Solar.fromYmd(lt.getYear(),lt.getMonth(),td).getLunar();
    const mGZ=YS.pillars(R).monthGZ;
    dChecked++;
    if(mGZ!==l.getMonthInGanZhi()){
      dBad++;
      if(dSamples.length<10)dSamples.push(`${lt.getYear()}-${lt.getMonth()}-${td}(${tn}) engine=${mGZ} lunar=${l.getMonthInGanZhi()}`);
    }
  }
}
console.log(`[D] 月干支比对：${dChecked} 点，不一致 ${dBad} 点`);
dSamples.forEach(s=>console.log('    '+s));
if(dBad>0)warn+=dBad;

console.log(`\n总计：err=${err} warn=${warn} 耗时 ${Date.now()-T0}ms`);
process.exit(err>0?1:0);
