const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let h=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.2.html','utf8').replaceAll('3.6.2','3.6.3');
const marker='const scanRegistryRenderBase=scanSiteRender;';
// Install after all existing renderer wrappers, before the following reporting helpers.
const anchor='function scanRegistryUnitCompare(';
// Function declarations can be referenced by the report before the wrapper runs.
h=h.replace(anchor,fs.readFileSync('work/online_v363.js','utf8')+'\n'+anchor);
const old="+'<h3>현장 체크 · 정형외과 / 통증 / 재활</h3>'";
// Actual sheet uses the heading within a larger literal.
const target="<h3>현장 체크 · 정형외과 / 통증 / 재활</h3>";
assert.ok(h.includes(target));
h=h.replace(target,"'+scanSiteOnlineReview(d)+'<h3>외관 참고 · 로드뷰 원문</h3>'+scanSiteStreetLinks(c)+'<p>현장사진 아님 · 촬영일 및 최신 여부는 제공사 원문에서 확인</p><h3>추가 확인 · 정형외과 / 통증 / 재활</h3>");
h=h.replace(anchor,fs.readFileSync('work/scope_v363.js','utf8')+'\n'+anchor);
h=h.replace('function scanSiteCompetition(result,exclude=true){','function scanSiteCompetition(result,exclude=true,draft=scanSite.active){\n  if(draft?.competitionMode===\'all\'&&result.siteAllHira)result={...result,hira:result.siteAllHira};');
h=h.replace('scanSiteCompetition(result,draft.exclude)','scanSiteCompetition(result,draft.exclude,draft)');
h=h.replace("const payload = await scanFetchApiDocument(`${HIRA_HOSPITAL_API_BASE}?${params}`,18000);", "if(specialty===null)params.delete('dgsbjtCd');\n  const payload = await scanFetchApiDocument(`${HIRA_HOSPITAL_API_BASE}?${params}`,18000);\n  if(specialty===null){const data=scanApiEnvelope(payload);if(!Number.isInteger(data.total)||data.total>1000||data.rows.length!==data.total)throw Error('전체 의원 응답 일부 누락 또는 조회 상한 초과');}");
h=h.replace('specialties:[specialty],placeUrl',"specialties:[specialty||'진료과 미분류'],placeUrl");
h=h.replace("return {schema:'jinsul-site-1',key:raw.key.slice(0,180),fields", "return {schema:'jinsul-site-1',competitionMode:raw.competitionMode==='all'?'all':'pain',key:raw.key.slice(0,180),fields");
h=h.replace('scanSite.result=result;scanSite.active=draft;',"if(draft.competitionMode==='all'&&!result.siteAllHira)draft.competitionMode='pain';scanSite.result=result;scanSite.active=draft;");
h=h.replace("<h3>경쟁의원 검토</h3>","<h3>경쟁의원 검토</h3>");
h=h.replace("function scanSiteCompetitionHTML(d){", "function scanSiteCompetitionHTML(d){");
// Include the chosen scope in the printable evidence section.
h=h.replace("<h3>온라인 사전 확인 · 수집 근거</h3>","<h3>온라인 사전 확인 · 수집 근거</h3><p>경쟁의원 범위: '+(d.competitionMode==='all'?'타과 포함 의원 전체':'통증 유관 4개 과')+'</p>");
for(const m of h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.6.3.html',h);
fs.writeFileSync('jinsulmap/index.html',fs.readFileSync('jinsulmap/index.html','utf8').replaceAll('3.6.2','3.6.3'));
console.log('v3.6.3 generated; inline syntax passed');
