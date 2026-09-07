const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.7.html','utf8').replace(/\r\n/g,'\n').replaceAll('3.5.7','3.5.8');
function replace(a,b){if(!s.includes(a))throw Error('Replacement target not found');s=s.replace(a,b)}
replace('</style>', '#scanClinicControls{display:flex;flex-wrap:wrap;gap:14px;align-items:end;margin:0 0 18px}#scanClinicControls label{flex:1;min-width:180px;color:#334155;font-size:14px}#scanClinicControls select{display:block;width:100%;margin-top:6px}#scanClinicControls button{width:auto}#scanClinicStatus{padding:12px 16px;background:#eaf2ff;color:#243b68;border-radius:12px;margin-bottom:18px;font-size:14px}\n</style>');
replace('<button class="scanReportTab" type="button" data-scan-report-tab="market">반경 상권</button>','<button class="scanReportTab" type="button" data-scan-report-tab="market">반경 상권</button>\n<button class="scanReportTab" type="button" data-scan-report-tab="clinic">의원 업종</button>');
replace('<section class="scanReportPane" data-scan-report-pane="market">','<section class="scanReportPane" data-scan-report-pane="clinic"><div class="scanReportCard"><h3>의원 업종 · 점포와 추정매출</h3><div id="scanClinicControls"></div><div id="scanClinicStatus" role="status" aria-live="polite"></div><div id="scanClinicBody"></div></div></section>\n<section class="scanReportPane" data-scan-report-pane="market">');
replace('function scanReportScores(result){',fs.readFileSync('work/clinic_v358.js','utf8')+'\nfunction scanReportScores(result){');
replace('function scanSwitchReportTab(name){','function scanSwitchReportTab(name){\n  if(name===\'clinic\')scanEnsureClinic();');
// Invalidates asynchronous clinic updates when a new candidate starts, without adding API work to the main scan.
replace('async function runMarketScan(){','async function runMarketScan(){\n  scanClinic.token++;scanClinic.key=\'\';scanClinic.busy=false;');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.8.html',s);console.log('Generated v3.5.8');
