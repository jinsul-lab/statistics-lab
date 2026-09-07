const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.8.html','utf8').replace(/\r\n/g,'\n').replaceAll('3.5.8','3.5.9');
function replace(a,b){if(!s.includes(a))throw Error('Missing anchor '+a.slice(0,80));s=s.replace(a,b);}
replace('</style>',fs.readFileSync('work/site_v359.css','utf8')+'\n</style>');
replace('<button class="scanReportTab" type="button" data-scan-report-tab="clinic">의원 업종</button>','<button class="scanReportTab" type="button" data-scan-report-tab="clinic">의원 업종</button><button class="scanReportTab" type="button" data-scan-report-tab="site">입지자료·임장</button>');
replace('<section class="scanReportPane" data-scan-report-pane="clinic">','<section class="scanReportPane" data-scan-report-pane="site"><div id="scanSiteBody"></div></section>\n<section class="scanReportPane" data-scan-report-pane="clinic">');
replace('function scanReportScores(result){',fs.readFileSync('work/site_v359.js','utf8')+'\nfunction scanReportScores(result){');
replace("if(name==='clinic')scanEnsureClinic();","if(name==='clinic')scanEnsureClinic();\n  if(name==='site')scanSiteOpen();");
replace('function scanResolveCandidate(query){','async function scanResolveCandidate(query){\n  const candidate=await scanResolveCandidateBase(query);\n  if(scanSiteRegionQuery(query)){candidate.searchScope=\'regional\';candidate.searchQuery=query;candidate.jibunMain=\'\';candidate.jibunSub=\'\';}\n  return candidate;\n}\nfunction scanResolveCandidateBase(query){');
replace("$('scanScoreRing').style.setProperty('--score',scoreData.total);","if(result.candidate.searchScope)$('scanReportSubtitle').textContent+=' · 지역 대표지점 주변 / 지역 전체 아님';\n  $('scanScoreRing').style.setProperty('--score',scoreData.total);");
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.9.html',s);console.log('Generated v3.5.9');
