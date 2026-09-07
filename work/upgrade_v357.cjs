const fs=require('fs');
let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.6.html','utf8').replace(/\r\n/g,'\n');
function replace(a,b){if(!s.includes(a))throw Error('Missing replacement target');s=s.replace(a,b);}
s=s.replaceAll('3.5.6','3.5.7');
s=s.replace(/<span style="color:var\((--c-[\w]+)\)">● ([^<]+)<\/span>/g,'<span style="color:#172b49"><span style="color:var($1)" aria-hidden="true">●</span> $2</span>');
replace("datalabels: { color:'white', font:{weight:'bold'} }", "datalabels: { color:'#172b49', backgroundColor:'rgba(255,255,255,.94)', borderRadius:4, padding:4, font:{weight:'bold'} }");
replace('if(!patients.length) return toast("데이터 없음"); $(\'statsModal\').style.display = \'flex\';','if(!patients.length){ if(scanState.result)return scanOpenReport(scanState.result,"population"); return toast("환자 업로드 또는 상권 스캔을 먼저 실행해주세요."); } $(\'statsModal\').style.display = \'flex\';');
replace('</style>',fs.readFileSync('work/ui_v357.css','utf8')+'\n</style>');
replace('function scanOpenReport(result=scanState.result){','function scanOpenReport(result=scanState.result,initialTab="overview"){');
replace("scanSwitchReportTab('overview');modal.style.display='flex';",'scanRenderPopulationDetails(result);scanSwitchReportTab(initialTab);modal.style.display=\'flex\';');
replace('  scanRenderRoneChart(result);\n}', '  scanRenderRoneChart(result);\n  scanRenderPopulationDetailCharts(result);\n}');
// Accept CRLF source too; prior target uses normalized LF below.
replace('function scanRenderRoneChart(result){',fs.readFileSync('work/population_ui_v357.js','utf8')+'\nfunction scanRenderRoneChart(result){');
replace('<h3>실시간 인구 적용 범위</h3>','<h3>실시간 인구 · 현재와 예측</h3>');
// Put the realtime source first in the population pane.
const realtime='<div class="scanReportCard wide"><h3>실시간 인구 · 현재와 예측</h3><div id="scanRealtimeScope"></div></div>';
replace(realtime,'');
replace('<section class="scanReportPane" data-scan-report-pane="population">\n    <div class="scanReportGrid">','<section class="scanReportPane" data-scan-report-pane="population">\n    <div class="scanReportGrid">'+realtime);
replace("config.options.animation={duration:550};","config.options.animation={duration:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches?0:400};\n  config.options.color='#334155';\n  for(const axis of Object.values(config.options.scales||{})){axis.ticks={...axis.ticks,color:'#465971',font:{size:13}};axis.title={...axis.title,color:'#334155',font:{size:13}};}\n  if(config.options.plugins?.legend)config.options.plugins.legend.labels={...config.options.plugins.legend.labels,color:'#334155',font:{size:13},padding:18};");
// Preserve missing demographic rates in newly detailed charts.
replace('ages[age] = scanNumber(row?.[`PPLTN_RATE_${age}`]) || 0','ages[age] = scanNumber(row?.[`PPLTN_RATE_${age}`])');
const normalization=s.match(/^function scanNormalizePopulation\([^]*?^}/m)[0];
replace(normalization,normalization.replaceAll('scanNumber(', 'scanRealtimeNumber('));
replace('<button class="tabBtn" onclick="switchTab(\'tabRadius\')">거리/반경</button>','<button class="tabBtn" onclick="switchTab(\'tabRadius\')">거리/반경</button>\n<button class="tabBtn" onclick="switchTab(\'tabLocalPopulation\')">지역·실시간 인구</button>');
replace('<div class="tabPane" id="tabType" style="display:block;">','<div class="tabPane" id="tabLocalPopulation"><div class="scanStatBridge"><h3>검색 후보지의 지역·실시간 인구 통계</h3><p>상권 스캔에서 검색한 주소의 서울 지정지점 실시간 인구, 전국 방문인구, 공식상권 유동인구, SGIS 배후 인구를 함께 확인합니다. 각 자료의 기준 시점과 공간 범위를 구분해 표시합니다.</p><button class="btn primary" type="button" onclick="scanOpenReport(scanState.result,\'population\')">인구 상세 통계 열기</button><p>먼저 상권 스캔에서 주소를 검색해주세요. 환자 업로드 통계와 별도로 제공됩니다.</p></div></div>\n<div class="tabPane" id="tabType" style="display:block;">');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.7.html',s);
console.log('Generated v3.5.7');
