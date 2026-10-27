/* M3 UI 集成 · 沙箱内验证脚本（运行于浏览器 context，curR/YS/QM/cast/renderYongshen 均可见） */
let P=0,F=0;
function ck(name,cond,detail){
  if(cond){P++;console.log('✅ '+name);}
  else{F++;console.log('❌ '+name+(detail?(' | '+detail):''));}
}

/* ---------- A. 浏览器全局模型 ---------- */
ck('A1 window 即全局',window===self&&typeof window.QM==='object'&&typeof window.YS==='object');
ck('A2 加载顺序：YS 已绑定',typeof YS==='object'&&typeof YS.take==='function');
ck('A3 全局函数齐备',typeof cast==='function'&&typeof render==='function'&&typeof renderYongshen==='function'&&typeof castTest==='function');
ck('A4 初始化：tGZ 60 项',document.getElementById('tGZ').children.length===60);
ck('A5 setNow 已填表',!!document.getElementById('iDate').value&&!!document.getElementById('iTime').value);
ck('A6 init 自动起局',document.getElementById('out').innerHTML.length>500);

/* ---------- B. cast() 指定 2026-10-10 09:00 ---------- */
document.getElementById('iDate').value='2026-10-10';
document.getElementById('iTime').value='09:00';
cast();
ck('B1 curR 已更新',curR&&curR.meta&&!curR.meta.test);
ck('B2 定局与 Node 一致',curR.dun===__ref.dun&&curR.ju===__ref.ju,'实际='+curR.dun+'/'+curR.ju);
ck('B3 日干支一致',curR.meta.dayGZ===__ref.dayGZ,'实际='+curR.meta.dayGZ);
ck('B4 时干支一致',curR.meta.hourGZ===__ref.hourGZ,'实际='+curR.meta.hourGZ);
ck('B5 节气一致',curR.meta.term===__ref.term,'实际='+curR.meta.term);
ck('B6 值符/值使落宫一致',curR.zfTo===__ref.zfTo&&curR.zsLuo===__ref.zsLuo);
(function(){
  let ok=true;
  for(let p=1;p<=9;p++){if(curR.di[p]!==__ref.di[p]||curR.tian[p]!==__ref.tian[p]||curR.door[p]!==__ref.door[p]||curR.god[p]!==__ref.god[p])ok=false;}
  ck('B7 九宫四盘逐字节一致',ok);
})();

/* ---------- C. 用神区联动（render 已自动调用） ---------- */
const out=document.getElementById('out').innerHTML;
ck('C1 用神卡片已渲染',out.includes('五、问事用神')&&out.includes('id="yCat"'));
ck('C2 ysName 非空',document.getElementById('ysName').textContent.length>5,'实际='+document.getElementById('ysName').textContent);
ck('C3 ysBody 有 7 行（求财）',document.getElementById('ysBody').innerHTML.split('<tr>').length-1===7);
ck('C4 ysBrief 非空',document.getElementById('ysBrief').textContent.length>5);
ck('C5 含日干=求测人',document.getElementById('ysName').textContent.includes('日干'));

/* ---------- D. 类别切换联动 ---------- */
(function(){
  const cats=YS.ALL;let allOk=true,rowsOk=true;
  for(const c of cats){
    document.getElementById('yCat').value=c;
    renderYongshen(curR);
    const t=YS.take(curR,c);
    const rows=document.getElementById('ysBody').innerHTML.split('<tr>').length-1;
    if(!t||t.items.length!==rows)allOk=false;
    if(rows<1)rowsOk=false;
  }
  ck('D1 10 类切换行数与 take 一致',allOk&&rowsOk);
  document.getElementById('yCat').value='jibing';
  renderYongshen(curR);
  ck('D2 疾病类含天芮',document.getElementById('ysBody').innerHTML.includes('天芮'));
  document.getElementById('yCat').value='hunyin';
  renderYongshen(curR);
  ck('D3 婚姻类含乙庚',document.getElementById('ysBody').innerHTML.includes('乙')&&document.getElementById('ysBody').innerHTML.includes('庚'));
  document.getElementById('yCat').value='qiucai';
  renderYongshen(curR);
})();

/* ---------- D2. 自定义求测（智能取用，界面层） ---------- */
(function(){
  const g=id=>document.getElementById(id);
  g('aiQ').value='这笔合同能不能签';
  g('yCat').value='custom';
  renderYongshen(curR);
  ck('D4 自定义框出现且同步 aiQ',g('yCustomWrap').style.display!=='none'&&g('yCustom').value==='这笔合同能不能签',
     '实际='+g('yCustom').value);
  const t=YS.take(curR,'custom','这笔合同能不能签');
  const rows=document.getElementById('ysBody').innerHTML.split('<tr>').length-1;
  ck('D5 自定义行数与 take 一致',rows===t.items.length,'实际='+rows+'/'+t.items.length);
  ck('D6 主用神=六合并有「主」标记',
     document.getElementById('ysBody').innerHTML.includes('六合')&&document.getElementById('ysBody').innerHTML.includes('>主<'),
     '实际='+document.getElementById('ysBody').innerHTML.slice(0,160));
  ck('D7 速览带取用依据',document.getElementById('ysBrief').textContent.includes('命中'),
     '实际='+document.getElementById('ysBrief').textContent);
  /* AI 区改问事 → 自定义框同步（两处同一份文本，不各存一份） */
  g('aiQ').value='今年能否升职';syncCustomQuestion('今年能否升职');
  ck('D8 aiQ 改动同步自定义框并改主用神',
     g('yCustom').value==='今年能否升职'&&document.getElementById('ysBody').innerHTML.includes('开门'),
     '实际='+g('yCustom').value);
  /* 切回固定类别：自定义框隐藏，行数回到该类别全表 */
  g('yCat').value='qiucai';renderYongshen(curR);
  ck('D9 切回固定类别隐藏自定义框',g('yCustomWrap').style.display==='none'&&
     document.getElementById('ysBody').innerHTML.split('<tr>').length-1===7,
     '实际='+g('yCustomWrap').style.display);
  g('aiQ').value='';
})();

/* ---------- E. castTest 守卫（校验用局无日时干支，用神区不可用） ----------
   paipan 直出无 meta；castTest 以 {test:true,...} 渲染，curR=R 本身。
   renderYongshen 守卫 `!R.meta||R.meta.test` 对无 meta 的局同样短路。 */
document.getElementById('tDun').value='1';
document.getElementById('tJu').value='1';
document.getElementById('tGZ').value='0'; // 甲子时
castTest();
ck('E1 校验局渲染成功',document.getElementById('out').innerHTML.includes('校验用局'));
ck('E2 castTest 局无 meta（直出路径）',curR.meta===undefined);
ck('E3 用神区不重绘（ysBody 保留上次）',document.getElementById('ysBody').innerHTML.split('<tr>').length-1===7);
(function(){
  let ok=true;try{renderYongshen(curR);}catch(e){ok=false;}
  ck('E4 renderYongshen 对 test 局不抛错',ok);
})();
/* 另测：手工构造 meta.test=true 的局，守卫第二条路径也应短路 */
(function(){
  let ok=true;
  try{renderYongshen({meta:{test:true}});}catch(e){ok=false;}
  ck('E5 meta.test=true 路径也不抛错',ok);
})();

/* ---------- F. 空输入守卫 ---------- */
(function(){
  const keep=document.getElementById('iDate').value;
  document.getElementById('iDate').value='';
  let ok=true;try{cast();}catch(e){ok=false;}
  ck('F1 空日期不抛错且有 alert',ok&&__alerts.length>0);
  document.getElementById('iDate').value=keep;
  cast();
})();

/* ---------- G. 异常输入 ---------- */
(function(){
  const keep=document.getElementById('iTime').value;
  document.getElementById('iTime').value='';
  let ok=true;try{cast();}catch(e){ok=false;}
  ck('G1 空时间不抛错且有 alert',ok&&__alerts.length>=2);
  document.getElementById('iTime').value=keep;
  cast();
})();

__passes=P;__fails=F;
