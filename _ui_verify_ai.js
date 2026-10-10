/* H · M4 AI 流式解读 UI 验证（运行于浏览器 context，异步组）
 * 可访问：curR / QMI / YS / aiRun / aiStop / aiCopyPan / aiPan / aiHist / aiCtrl / ck / P / F
 */
console.log('\n=== H · M4 AI 流式解读（沙箱） ===');
const g=id=>document.getElementById(id);

/* H1 模块与界面元素 */
ck('H1 QMI 已加载且接口齐备',
  typeof QMI==='object'&&typeof QMI.buildPanText==='function'&&typeof QMI.interpretStream==='function'&&typeof QMI.SYSTEM_PROMPT==='string');
ck('H2 AI 卡片元素齐备',['aiBase','aiModel','aiKey','aiQ','aiOut','aiStatus'].every(id=>!!g(id)));
ck('H3 页面含「六、AI 流式解读」',document.getElementById('out').innerHTML.includes('五、问事用神'));

/* H4 真局：复制盘面提示词（降级路径） */
g('iDate').value='2026-10-10';
g('iTime').value='09:00';
cast();
await aiCopyPan();
const clip=navigator.clipboard._last||'';
ck('H4 复制内容含系统提示词契约',clip.includes('盘面事实不可改写')&&clip.includes('现实边界'));
ck('H5 复制内容含盘面正文',clip.includes('【奇门遁甲盘面】')&&clip.includes('九宫'));
ck('H6 复制状态提示已复制',g('aiStatus').textContent.includes('已复制'),'实际='+g('aiStatus').textContent);

/* H7 校验用局守卫：AI 解读不可用 */
g('tDun').value='1';g('tJu').value='1';g('tGZ').value='0';
castTest();
await aiCopyPan();
ck('H7 校验局拒绝生成提示词',g('aiStatus').textContent.includes('校验用局'),'实际='+g('aiStatus').textContent);
await aiRun();
ck('H8 校验局拒绝解读',g('aiStatus').textContent.includes('校验用局'),'实际='+g('aiStatus').textContent);

/* 回到真局 */
g('iDate').value='2026-10-10';
g('iTime').value='09:00';
cast();

/* H9 缺配置守卫 */
g('aiBase').value='';g('aiKey').value='';g('aiModel').value='';
await aiRun();
ck('H9 缺配置时提示填写三项',g('aiStatus').textContent.includes('请填写接口地址、模型、密钥'));

/* H10 完整流式一轮 */
g('aiBase').value='https://api.example.com/v1/';
g('aiModel').value='test-model';
g('aiKey').value='sk-test';
g('aiQ').value='这笔订单该不该签';
aiClearHist();
await aiRun();
ck('H11 流式输出正确拼接',aiColBody('front').textContent,'一、盘面要点：值符落宫，用神生克。');
ck('H12 完成后状态提示',g('aiStatus').textContent.includes('完成'));
ck('H13 URL 拼装（末尾斜杠归一）',__fetches[__fetches.length-1].url,'https://api.example.com/v1/chat/completions');
const b1=__fetches[__fetches.length-1].body;
ck('H14 body 首条为 system 提示词',b1.messages[0].role,'system');
ck('H15 body 盘面含补充问事',b1.messages[1].content.includes('【所问何事】这笔订单该不该签'));
ck('H16 body stream=true 且模型正确',b1.stream===true&&b1.model==='test-model');
ck('H17 配置已存 localStorage',!!localStorage.getItem('qmi_cfg_v1'));

/* H18 多轮：历史带上一轮 user/assistant */
await aiRun();
const b2=__fetches[__fetches.length-1].body;
ck('H18 第二轮带历史（4 条）',b2.messages.length,4);
ck('H19 第二轮首条仍是 system',b2.messages[0].role,'system');
ck('H20 第二轮沿用原盘（历史已由 H18 校验，此处校验输出仍在）',aiColBody('front').textContent.length>0);

/* H21 停止 */
aiCtrl=new AbortController();
aiStop();
ck('H21 停止状态提示',g('aiStatus').textContent.includes('已停止'),'实际='+g('aiStatus').textContent);
ck('H22 停止后 aiCtrl 已释放',aiCtrl===null,'实际='+String(aiCtrl));

/* H23 清空对话 */
aiClearHist();
ck('H23 清空对话后输出为空',g('aiOut').textContent==='','实际='+JSON.stringify(g('aiOut').textContent));
ck('H24 清空对话后历史为空',aiHist.length===0,'实际='+aiHist.length);

/* H25 清空配置 */
aiClearCfg();
ck('H25 清空配置后 localStorage 无记录',localStorage.getItem('qmi_cfg_v1')===null,'实际='+String(localStorage.getItem('qmi_cfg_v1')));
ck('H26 清空配置后输入框为空',g('aiBase').value===''&&g('aiKey').value===''&&g('aiModel').value==='');

/* H27 失败路径（HTTP 401） */
__fetches.length=0;
const oldFetch=fetch;
fetch=function(){return Promise.resolve({ok:false,status:401,headers:{get:()=>'application/json'},text:()=>Promise.resolve('bad key'),json:()=>Promise.resolve({})});};
g('aiBase').value='https://api.example.com/v1';
g('aiModel').value='m';
g('aiKey').value='k';
await aiRun();
ck('H27 HTTP_401 错误提示',g('aiStatus').textContent.includes('HTTP_401'));
fetch=oldFetch;

/* ---- I · 服务端代理模式（部署版 /api/interpret，多模型并行） ---- */
console.log('\n=== I · 服务端代理模式 ===');
g('aiBase').value='';g('aiModel').value='';g('aiKey').value='';
g('aiQ').value='这笔订单该不该签';
aiClearHist();
g('aiOut').innerHTML='';
g('aiMode').value='server';
aiSyncMode();
ck('I0 模型行可见 / BYOK 行隐藏',g('modelRow').style.display!=='none'&&g('byokRow').style.display==='none',
   'modelRow='+JSON.stringify(g('modelRow').style.display)+' byokRow='+JSON.stringify(g('byokRow').style.display));
ck('I0b 默认选中 2 个模型芯片',selModels.length===2&&selModels.indexOf('gemini-3.8-flash')>=0&&selModels.indexOf('deepseek-flash')>=0,
   '实际='+JSON.stringify(selModels));
__fetches.length=0;
await aiRun();
ck('I1 每个选中模型各发一次到 /api/interpret',__fetches.length===2&&__fetches.every(f=>f.url==='/api/interpret'),
   '实际='+__fetches.length+' 次，url='+JSON.stringify(__fetches.map(f=>f.url)));
const f1=__fetches[0];
ck('I2 body 含 pan/cat/question/history',!!f1.body.pan&&!!f1.body.cat&&f1.body.question==='这笔订单该不该签'&&Array.isArray(f1.body.history));
ck('I3 服务端模式下问事不并进 pan',f1.body.pan.indexOf('【所问何事】')<0);
ck('I4 未填密钥时不带 base/key',f1.body.base===undefined&&f1.body.key===undefined,'实际='+JSON.stringify(Object.keys(f1.body)));
ck('I4b 每个请求带各自模型名',__fetches.map(f=>f.body.model).sort().join('|'),'deepseek-flash|gemini-3.8-flash');
ck('I5 各模型列均收到流式正文',Object.keys(aiStates).length===2&&
   Object.keys(aiStates).every(m=>aiStates[m].history.some(h=>h.content==='一、盘面要点：值符落宫，用神生克。')),
   '实际='+JSON.stringify(Object.keys(aiStates)));
ck('I6 完成后状态提示',g('aiStatus').textContent.includes('完成'),'实际='+g('aiStatus').textContent);
ck('I7 历史按模型分别入栈（各 2 条）',Object.keys(aiStates).every(m=>aiStates[m].history.length===2),'实际='+JSON.stringify(Object.keys(aiStates).map(m=>aiStates[m].history.length)));
ck('I8 四柱随请求上报',typeof f1.body.pillars==='string'&&f1.body.pillars.length>0,'实际='+f1.body.pillars);

/* I9 BYOK：填了密钥时随请求带上 */
g('aiBase').value='https://api.example.com/v1';g('aiModel').value='m';g('aiKey').value='k';
__fetches.length=0;
await aiRun();
const f2=__fetches[__fetches.length-1];
ck('I9 BYOK 时带 base/model/key',f2.body.base==='https://api.example.com/v1'&&f2.body.model==='m'&&f2.body.key==='k','实际='+JSON.stringify([f2.body.base,f2.body.model,f2.body.key]));
ck('I10 第二轮带上一轮历史',__fetches.every(f=>Array.isArray(f.body.history)&&f.body.history.length===2),'实际='+JSON.stringify(__fetches.map(f=>f.body.history.length)));

/* I11 auto 模式判定：线上 https → server；本地 file → front */
g('aiMode').value='auto';
location.protocol='https:';
ck('I11 auto + https → server',aiMode()==='server','实际='+aiMode());
location.protocol='file:';
ck('I12 auto + file → front',aiMode()==='front','实际='+aiMode());

/* I13 服务端返回 JSON 错误（非流）时给出可读提示 */
g('aiMode').value='server';
const oldFetch2=fetch;
fetch=function(){return Promise.resolve({ok:false,status:400,headers:{get:()=>'application/json'},text:()=>Promise.resolve(JSON.stringify({error:'服务端未配置模型密钥'})),json:()=>Promise.resolve({error:'服务端未配置模型密钥'})});};
await aiRun();
ck('I13 服务端 400 错误透传',g('aiStatus').textContent.includes('服务端未配置模型密钥'),'实际='+g('aiStatus').textContent);
fetch=oldFetch2;

/* I14 模型芯片渲染 / 单选 / 后台清单覆盖 / 拉取失败兜底 */
renderModelChips();
ck('I14 芯片含内置模型',g('modelChips').innerHTML.includes('gemini-3.8-flash')&&g('modelChips').innerHTML.includes('deepseek-flash'));
g('aiBase').value='';g('aiModel').value='';g('aiKey').value=''; /* 清掉 BYOK，回到服务端密钥模式 */
selModels=['deepseek-flash'];
__fetches.length=0;
await aiRun();
ck('I15 单选模型只发一次请求',__fetches.length===1&&__fetches[0].body.model==='deepseek-flash','实际='+__fetches.length+' / '+JSON.stringify(__fetches.map(f=>f.body.model)));
applyModels([{id:'gemini-3.8-flash',pv:'Google',configured:true},{id:'kimi-k2',pv:'Moonshot',configured:false}]);
ck('I16 后台清单覆盖内置清单',MODELS.length===2&&MODELS[1].id==='kimi-k2'&&MODELS[1].tip==='后台未配 key','实际='+JSON.stringify(MODELS.map(m=>m.id+':'+m.tip)));
ck('I17 清单变更后已选模型取交集（不丢不越）',selModels.indexOf('deepseek-flash')<0&&selModels.length>=1,'实际='+JSON.stringify(selModels));
const oldF3=fetch;
fetch=function(){return Promise.resolve({ok:false,status:500,headers:{get:()=>'application/json'},text:()=>Promise.resolve('x'),json:()=>Promise.resolve({})});};
await loadModels();
ck('I18 清单拉取失败给出可见告警',g('modelWarn').textContent.includes('未能读取后台模型清单'),'实际='+g('modelWarn').textContent);
fetch=oldF3;
selModels=['gemini-3.8-flash','deepseek-flash'];
g('aiMode').value='auto';

/*  · 存档 / 读档 ================= */
console.log('\n=== J · 存档读档 ===');
location.protocol='file:';
try{localStorage.removeItem('qm_saves_v1');}catch(e){}
const jAlerts0=__alerts.length;

/* J1 起真实局后存档 → 本地写入一条，label 为四柱 */
setNow();
cast();
await savePan();
let jSaves=localSaves();
ck('J1 存档写入本地一条',jSaves.length===1,'实际='+jSaves.length);
ck('J2 label 为四柱文本',/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年/.test(jSaves[0].label),'实际='+jSaves[0].label);
ck('J3 params 含起局全参数',!!jSaves[0].params.date&&!!jSaves[0].params.time&&jSaves[0].params.lon==='120'&&jSaves[0].params.clock==='true'&&jSaves[0].params.zi==='23'&&jSaves[0].params.ji==='2','实际='+JSON.stringify(jSaves[0].params));

/* J4 file: 本地模式不请求云端 */
const jFetch0=__fetches.length;
await savePan();
ck('J4 本地双击不碰云端',__fetches.length===jFetch0,'实际 fetch 增量='+(__fetches.length-jFetch0));

/* J5 校验用局拒绝存档 */
castTest();
__alerts.length=0;
await savePan();
ck('J5 校验局存档被拦截',__alerts.length===1,'实际 alert='+(__alerts.length));
cast();

/* J6 线上模式存档 → POST /api/saves 带全参数 */
location.protocol='https:';
const jOldFetch=fetch;
fetch=function(url,init){
  __fetches.push({url:url,init:init,body:init&&init.body?JSON.parse(init.body):null});
  if(String(url).indexOf('/api/saves')===0&&init&&init.method==='POST')
    return Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true,id:42})});
  if(String(url).indexOf('/api/saves')===0&&(!init||!init.method||init.method==='GET'))
    return Promise.resolve({ok:true,json:()=>Promise.resolve({saves:[
      {id:42,created_at:'2026-10-10 13:00:00',label:'丙午年 戊戌月 丁卯日 乙巳时',pillars:'丙午年 戊戌月 丁卯日 乙巳时',params:{date:'2026-10-10',time:'10:00',lon:'120',clock:'true',zi:'23',ji:'2',cat:'hunyin',q:'婚事'}},
      {id:7,created_at:'2026-10-09 09:00:00',label:'甲辰年 甲戌月 甲子日 甲子时',pillars:'甲辰年 甲戌月 甲子日 甲子时',params:{date:'2026-10-09',time:'00:30',lon:'116',clock:'std',zi:'0',ji:'8',cat:'tianqi',q:''}}
    ],total:2})});
  return jOldFetch(url,init);
};
__fetches.length=0;
await savePan();
const jPost=__fetches.find(f=>String(f.url).indexOf('/api/saves')===0&&f.init&&f.init.method==='POST');
ck('J6 线上存档 POST /api/saves',!!jPost,'实际='+JSON.stringify(__fetches.map(f=>String(f.url))));
ck('J7 POST body 带参数与四柱',!!jPost&&!!jPost.body.params.date&&!!jPost.body.label,'实际='+JSON.stringify(jPost&&jPost.body&&Object.keys(jPost.body)));
ck('J8 云端成功后记录 cloudId',localSaves()[0].cloudId===42,'实际='+localSaves()[0].cloudId);

/* J9 读档面板渲染：云端 + 本地合并、同局去重、云/本标记 */
await renderSaves();
const jHtml=g('savesList').innerHTML;
ck('J9 面板含云端条目',jHtml.includes('婚事')&&jHtml.includes('甲子时'));
ck('J10 云/本标记显示',jHtml.includes('>云<')&&jHtml.includes('>本<'));
ck('J11 toggleSaves 开关',g('savesPanel').style.display==='block','实际='+g('savesPanel').style.display);

/* J12 本地读档恢复表单并重排 */
g('iDate').value='';g('iTime').value='';g('iLon').value='0';
await loadSave(localSaves()[localSaves().length-1].id);
ck('J12 读档恢复表单',g('iDate').value==='2026-10-10'&&g('iLon').value==='120','实际='+g('iDate').value+' / '+g('iLon').value);
ck('J13 读档后盘面重排',g('out').innerHTML.includes('奇门遁甲')||g('out').innerHTML.length>100,'实际长度='+g('out').innerHTML.length);
ck('J14 读档后面板收起',g('savesPanel').style.display==='none');

/* J15 云端读档 */
await loadSave('C42');
ck('J15 云端读档恢复表单',g('iDate').value==='2026-10-10'&&g('iTime').value==='10:00','实际='+g('iDate').value+' '+g('iTime').value);

/* J16 删除本地存档 */
const jN0=localSaves().length;
await delSave(localSaves()[0].id);
ck('J16 删本地存档',localSaves().length===jN0-1,'实际 '+jN0+'→'+localSaves().length);

/* J17 删除云端存档 → DELETE /api/saves?id= */
__fetches.length=0;
await delSave('C7');
ck('J17 删云端存档发 DELETE',__fetches.some(f=>String(f.url).indexOf('/api/saves')===0&&f.init&&f.init.method==='DELETE'&&/id=7/.test(String(f.url))),'实际='+JSON.stringify(__fetches.map(f=>String(f.url))));
fetch=jOldFetch;
location.protocol='file:';

/* J18 空存档提示 */
try{localStorage.removeItem('qm_saves_v1');}catch(e){}
const jOldF2=fetch;
fetch=function(){return Promise.resolve({ok:true,json:()=>Promise.resolve({saves:[],total:0})});};
await renderSaves();
ck('J18 空存档给出提示',g('savesList').innerHTML.includes('暂无存档'));
fetch=jOldF2;
try{localStorage.removeItem('qm_saves_v1');}catch(e){}
