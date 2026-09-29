const fs=require('fs'),{chromium}=require('C:/Users/withe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
const body=h.slice(h.indexOf('<div class="modalBack" id="statsModal">'),h.indexOf('<script>',h.indexOf('id="statsModal"')));
const stats=h.slice(h.indexOf('function bucketAge('),h.indexOf('/* ===========================   [상권 스캔',h.indexOf('function bucketAge(')));
const scripts=['work/chart-test.umd.js','work/chart-test-labels.js'].map(p=>'<script>'+fs.readFileSync(p,'utf8')+'</script>').join('');
const decl=h.match(/let chartObj1[^;]+;/)[0];
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
// Font transport is checked separately; keep analytical rendering deterministic offline.
await page.route('**/Paperlogy-*.woff2',route=>{const name=route.request().url().match(/Paperlogy-(.+)\.woff2/)[1];const file={'4Regular':'regular','6SemiBold':'semibold','8ExtraBold':'extrabold'}[name];return route.fulfill({path:'work/paperlogy-'+file+'.woff2',contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'}})});
await page.setContent('<html><head>'+scripts+[...h.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')+'</head><body><button id="btnStats">Stats</button><button id="btnClear"></button>'+body+'</body></html>',{waitUntil:'load'});
await page.addScriptTag({content:h.match(/<script id="chartTypography372">([\s\S]*?)<\/script>/)[1]});
await page.evaluate(()=>document.fonts.ready);
if(!await page.evaluate(()=>document.fonts.check('400 14px Paperlogy')&&Chart.defaults.font.family.includes('Paperlogy')))throw Error('Paperlogy not loaded');
await page.addScriptTag({content:`const $=id=>document.getElementById(id);${decl} const REP_COLOR={"신환 (1회만)":"#ff0000","신환 ▶ 재진 전환":"#00c853","90일초":"#ffd400","재진":"#228be6"};let patients=[],myHospitalMarker=null;const drawingManager={getData:()=>({circle:[]})},toggleState={new_only:true,new_conv:true,bit_90:true,old:true},scanState={};const toast=()=>{};`+stats+'\n'+h.slice(h.indexOf('function patientTypeLabel('),h.indexOf('function patientNewFlag('))+'\n'+h.slice(h.indexOf('function patientStatsEscape('),h.lastIndexOf('</script>'))});
await page.evaluate(()=>{if(typeof Chart==='undefined'){window.Chart=class{constructor(el,c){this.data=c.data;this.options=c.options;this.destroy=()=>{};this.resize=()=>{}}};window.ChartDataLabels={};}patients=Array.from({length:80},(_,i)=>({type:['신환 (1회만)','신환 ▶ 재진 전환','90일초','재진'][i%4],total:i%5+1,age:20+i%60,dong:'검증동'+i%8}));$('btnStats').click()});
// Final app functions already loaded.
await page.waitForTimeout(100);
for(const id of ['tabDong','tabAge','tabVisit','tabRegion','tabValue','tabRadius']){await page.evaluate(id=>switchTab(id),id);await page.waitForTimeout(100);console.log(id,await page.locator('#'+id+' tbody tr').count());}
console.log('ERRORS',JSON.stringify(errors));console.log('SCATTER',await page.evaluate(()=>chartObjValueScatter?.data.datasets[0].data.length));
const assert=require('assert/strict');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>chartObjValueScatter.data.datasets[0].data.length),4);
await page.evaluate(()=>switchTab('tabPatientMix'));await page.waitForTimeout(1000);
const mix=await page.evaluate(()=>patientMixData(window.__lastStatsVisible));assert.equal(mix.count,80);assert.equal(mix.visits,240);assert.equal(mix.ages.reduce((s,r)=>s+r.count,0),80);assert.equal(mix.cumulative.at(-1).patientPct,100);assert.equal(mix.cumulative.at(-1).visitPct,100);
await page.locator('#tabPatientMix').scrollIntoViewIfNeeded();await page.screenshot({path:'work/patient-mix-v369.png'});
await page.selectOption('#patientMixMode','share');assert.ok((await page.locator('.patientHeat').innerText()).includes('%'));assert.equal(await page.locator('#patientMixAgeChart').isVisible(),true);
const edge=await page.evaluate(()=>patientMixData(Array.from({length:14},(_,i)=>({dong:i===0?'':('동'+i),age:i===0?null:40,total:i}))));assert.equal(edge.regions.length,11);assert.equal(edge.regions.reduce((s,r)=>s+r.count,0),14);assert.equal(edge.ages.at(-1).count,1);assert.equal(edge.cumulative.at(-1).visitPct,100);
assert.equal(await page.evaluate(()=>patientMixData([{age:20,total:0}]).cumulative[0].visitPct),null);
await page.setViewportSize({width:768,height:1024});await page.locator('#tabPatientMix').scrollIntoViewIfNeeded();await page.screenshot({path:'work/patient-mix-tablet-v369.png'});await page.setViewportSize({width:1280,height:900});
console.log('PASS heatmap, age contribution, cumulative totals, top10+other, unknown, zero denominator, tablet render');
await page.waitForTimeout(1100);await page.locator('#patientMixAgeChart').scrollIntoViewIfNeeded();await page.screenshot({path:'work/patient-mix-age-v369.png'});
await page.locator('#patientMixCumulativeChart').scrollIntoViewIfNeeded();await page.screenshot({path:'work/patient-mix-cumulative-v369.png'});
await page.evaluate(()=>switchTab('tabValue'));await page.waitForTimeout(1200);
await page.locator('#scatterWrap').scrollIntoViewIfNeeded();await page.screenshot({path:'work/patient-scatter-v368.png'});
await page.evaluate(()=>switchTab('tabType'));await page.locator('#patientStatsOverview').scrollIntoViewIfNeeded();await page.waitForTimeout(800);await page.screenshot({path:'work/patient-overview-v368.png'});
await page.evaluate(()=>switchTab('tabValue'));
await page.evaluate(()=>{$('chkMinSample').checked=false;$('chkMinSample').dispatchEvent(new Event('change'))});assert.equal(await page.evaluate(()=>chartObjValueScatter.data.datasets[0].data.length),4);
await page.evaluate(()=>{$('chkShowScatter').checked=false;$('chkShowScatter').dispatchEvent(new Event('change'))});assert.equal(await page.locator('#scatterWrap').isVisible(),false);
await page.evaluate(()=>{$('chkShowScatter').checked=true;$('chkShowScatter').dispatchEvent(new Event('change'))});assert.equal(await page.locator('#scatterWrap').isVisible(),true);
await page.evaluate(()=>{patients=[{type:'신환 (1회만)',total:1,age:'',dong:'소표본'}];$('chkMinSample').checked=true;$('btnStats').click();switchTab('tabValue')});assert.ok((await page.locator('#patientScatterDetails').innerText()).includes('조건에 맞는 동이 없습니다'));assert.equal(await page.evaluate(()=>bucketAge('')),'미상');
await page.evaluate(()=>{toggleState.new_only=false;$('btnStats').click();switchTab('tabDong')});assert.equal(await page.locator('#tblDong tr').count(),0);assert.equal(await page.evaluate(()=>window.__lastStatsVisible.length),0);
await page.evaluate(()=>{toggleState.new_only=true;window.Chart=undefined;$('btnStats').click()});assert.equal(await page.evaluate(()=>window.__lastStatsVisible.length),1);assert.ok((await page.locator('#tblSummary').innerText()).includes('합계'));
console.log('PASS real Chart.js: all tabs, scatter, filters, sample notice, blank age, empty refresh, missing library cache');
await browser.close();
})().catch(e=>{console.error(e.message);process.exitCode=1});






