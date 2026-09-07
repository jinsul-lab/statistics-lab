const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.4.html','utf8').replaceAll('3.5.4','3.5.5');
function fn(name,code){const r=new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm');if(!r.test(s))throw Error(name);s=s.replace(r,()=>code);}
const transport=fs.readFileSync('work/network_v355.js','utf8');
s=s.replace('const coverage=scanRegionalCoverage(result);',"const coverage=scanRegionalCoverage(result);if(result.hira?.specialties?.some(item=>item.error)&&!result.hira?.unavailable)coverage['심평원 의원']='일부 연결';");
s=s.replace('async function scanRequestText(',fs.readFileSync('work/visitors_v355.js','utf8')+'\nasync function scanRequestText(');
s=s.replace('const hiraPromise=scanFetchHiraCompetition','const visitorsPromise=scanPrepareVisitors(candidate,token);\n    const hiraPromise=scanFetchHiraCompetition');
s=s.replace('populationPromise,commercePromise,radiusCommercePromise]);','populationPromise,commercePromise,radiusCommercePromise,visitorsPromise]);');
s=s.replace('population:scanState.population,','population:scanState.population,\n      visitors:scanState.visitors,');
s=s.replace('<div class="scanReportCard wide"><h3>실시간 인구 적용 범위</h3>','<div class="scanReportCard wide"><h3>전국 방문인구 · 시군구</h3><div id="scanVisitorReport"></div></div><div class="scanReportCard wide"><h3>공식상권 유동인구 상세</h3><div id="scanFloatingReport"></div></div><div class="scanReportCard wide"><h3>실시간 인구 적용 범위</h3>');
s=s.replace("$('scanReportInsights').innerHTML=scanReportInsights(result,scoreData);","$('scanVisitorReport').innerHTML=scanRenderVisitors(result.visitors);$('scanFloatingReport').innerHTML=result.commerce?.floating?scanRenderFloatingBreakdown(result.commerce.floating):'<div class=\"scanEmpty\">해당 지역의 공식상권 유동인구 자료가 없습니다.</div>';\n  $('scanReportInsights').innerHTML=scanReportInsights(result,scoreData);");
s=s.replace('async function scanRequestText(',transport+'\nasync function scanRequestText(');
fn('scanRequestText',`async function scanRequestText(url,timeoutMs=15000){
  return scanNetworkRequest(url,{cache:'no-store',mode:'cors'},timeoutMs);
}`);
fn('scanSeoulRequest',`async function scanSeoulRequest(service,key,start,end,tail=''){
  if(location.protocol==='file:')throw new Error('로컬 파일에서는 서울 API를 사용할 수 없습니다. 최신 온라인 버전으로 열어주세요. [v3.5.5]');
  const text=await scanNetworkRequest('https://jinsul-seoul-proxy.yms0127.workers.dev/seoul',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,key,start,end,tail:decodeURIComponent(tail)}),cache:'no-store'},22000);
  let payload;try{payload=JSON.parse(text);}catch{throw new Error('서울 API JSON 응답 형식 오류');}
  if(payload?.error)throw new Error('서울 중계 요청 처리 실패');return payload;
}`);
s=s.replace("function scanAbortActive(message=''){", "function scanAbortActive(message=''){\n  scanCancelNetwork();");
s=s.replace('scanState.isScanning = true;', 'scanState.isScanning = true;\n  scanNetwork.metrics=[];scanRenderNetwork();');
s=s.replace('<div id="scanReportCoverage"></div>','<div id="scanReportCoverage"></div><details class="scanNetworkPanel"><summary>API 응답 시간 · 재시도 진단</summary><div id="scanNetworkReport"></div></details>');
s=s.replace("$('scanReportInsights').innerHTML=scanReportInsights(result,scoreData);","$('scanReportInsights').innerHTML=scanReportInsights(result,scoreData);scanRenderNetwork();");
s=s.replace('data:sgis?[sgis.population,sgis.households,sgis.employees,sgis.businesses]:[0,0,0,0]','data:sgis?[sgis.population,sgis.households,sgis.employees,sgis.businesses]:[null,null,null,null]');
s=s.replace("scanReportCharts[key]=new Chart(canvas,config);",`config.options=config.options||{};
  config.options.animation={duration:550};
  config.options.plugins={...config.options.plugins,tooltip:{backgroundColor:'#10203b',padding:13,cornerRadius:12,titleColor:'#a5f3fc',bodyColor:'#f8fafc'}};
  for(const ds of config.data?.datasets||[]){ds.borderRadius=ds.borderRadius??7;ds.pointRadius=3;ds.pointHoverRadius=6;ds.borderWidth=ds.borderWidth??2;}
  scanReportCharts[key]=new Chart(canvas,config);`);
s=s.replace('</style>',fs.readFileSync('work/design_v355.css','utf8')+'\n</style>');
s=s.replace('function scanRenderFloatingBreakdown(',fs.readFileSync('work/charts_v355.js','utf8')+'\nfunction scanRenderFloatingBreakdown(');
fn('scanRenderFloatingBreakdown',`function scanRenderFloatingBreakdown(f){
  if(!f?.breakdown)return '';
  return '<details class="scanCommerceFoot scanDetailCharts" open><summary>유동인구 시간대·요일·연령 상세</summary><div class="scanVisualGrid">'+scanVisualBars('시간대 흐름',f.breakdown.times,'cyan')+scanVisualBars('요일 비교',f.breakdown.days,'violet')+scanVisualBars('연령 분포',f.breakdown.ages,'rose')+'</div><p>분기 공식상권 단위 · 표시된 항목 합계 대비 비중. 시간대별 구간 길이가 달라 시간당 밀도와는 다릅니다.</p><a href="https://golmok.seoul.go.kr/owner/owner.do" target="_blank" rel="noopener noreferrer">서울시 상권분석서비스에서 비교 ↗</a></details>';
}`);
s=s.replace("result.commerce?.floating?scanRenderFloatingBreakdown(result.commerce.floating)","result.commerce?.floating?'<div class=\"scanInsight\">'+scanEscapeHTML(result.commerce.area.name)+' · '+scanEscapeHTML(scanPeriodLabel(result.commerce.floatingPeriod))+' · 공식 상권 전체 통계</div>'+scanRenderFloatingBreakdown(result.commerce.floating)");
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.5.html',s);
fs.writeFileSync('jinsulmap/index.html',fs.readFileSync('jinsulmap/index.html','utf8').replaceAll('3.5.4','3.5.5'));
