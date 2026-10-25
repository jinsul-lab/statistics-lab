// Offline rendered regression: real inline app + Chart.js, synthetic coordinates only.
const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('C:/Users/withe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
  const body=h.slice(h.indexOf('<div class="modalBack" id="statsModal">'),h.indexOf('<script>',h.indexOf('id="statsModal"')));
  const stats=h.slice(h.indexOf('function bucketAge('),h.indexOf('/* ===========================   [상권 스캔',h.indexOf('function bucketAge(')));
  const helpers=h.slice(h.indexOf('// Address import and diagnostics.'),h.indexOf('function parsePatients('));
  const scripts=['work/chart-test.umd.js','work/chart-test-labels.js'].map(p=>'<script>'+fs.readFileSync(p,'utf8')+'</script>').join('');
  const decl=h.match(/let chartObj1[^;]+;/)[0],browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.abort());
  await page.setContent('<html><head>'+scripts+[...h.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')+'</head><body><button id="btnStats">통계</button><button id="btnClear">초기화</button><span id="statTotalUsers"></span><span id="statTotalVisits"></span><div id="patientImportMapping"></div><p id="patientAddressStatus"></p><button id="patientAddressRetry"></button>'+body+'</body></html>');
  await page.addScriptTag({content:`const $=id=>document.getElementById(id);${decl}
  const REP_COLOR={"신환 (1회만)":"#ff0000","신환 ▶ 재진 전환":"#00c853","90일초":"#ffd400","재진":"#228be6"};let patients=[],patientLoadToken=1,patientFileReadToken=1,myHospitalMarker=null;
  const toggleState={new_only:true,new_conv:true,bit_90:true,old:true},drawingManager={getData:()=>({circle:[]})},scanState={},toast=()=>{},clusterer={clear(){}};
  const kakao={maps:{LatLng:class{constructor(y,x){this.y=y;this.x=x;}},Polyline:class{setPath(p){this.p=p;}getLength(){return Math.hypot(this.p[1].x-this.p[0].x,this.p[1].y-this.p[0].y)*1000;}}}};
  const circles=[{circle:{getPosition:()=>new kakao.maps.LatLng(35,127),getRadius:()=>100}}];
  `+helpers+'\n'+stats+'\n'+h.slice(h.indexOf('function patientTypeLabel('),h.indexOf('function patientNewFlag('))+'\n'+h.slice(h.indexOf('function patientStatsEscape('),h.lastIndexOf('</script>'))});
  await page.evaluate(()=>{
    patients=[{id:'S1',type:'재진',age:35,total:3,dong:'합성동',latlng:new kakao.maps.LatLng(35,127.05),geoState:'resolved'},{id:'S2',type:'신환 (1회만)',age:45,total:1,dong:'',latlng:null,geoState:'pending'}];
    $('btnStats').click();switchTab('tabPatientMix');
  });
  assert.equal(await page.evaluate(()=>window.__lastStatsVisible.length),1);
  await page.evaluate(()=>{patients[1].latlng=new kakao.maps.LatLng(35,127.06);patients[1].dong='합성동';patients[1].geoState='resolved';for(let i=0;i<40;i++)patientRefreshProgress(patientLoadToken);});
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(()=>window.__lastStatsVisible.length),2);
  assert.equal(await page.locator('#statTotalUsers').innerText(),'2');
  assert.equal(await page.locator('#statTotalVisits').innerText(),'4');
  assert.equal(await page.evaluate(()=>getActiveStatsTabId()),'tabPatientMix');
  assert.equal(await page.locator('#patientMixAgeChart').isVisible(),true);
  assert.equal(await page.evaluate(()=>patientMixCharts.length),2);
  // Change a filter while the pending refresh exists: the latest choice must win.
  await page.evaluate(()=>{patientRefreshProgress(patientLoadToken);toggleState.old=false;});
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(()=>window.__lastStatsVisible.length),1);
  assert.equal(await page.locator('#statTotalVisits').innerText(),'1');
  assert.equal(await page.evaluate(()=>getActiveStatsTabId()),'tabPatientMix');
  await page.evaluate(()=>{patientRefreshProgress(patientLoadToken);$('btnClear').click();});
  await page.waitForTimeout(900);
  assert.equal(await page.locator('#statsModal').isVisible(),false);
  assert.equal(await page.evaluate(()=>patients.length),0);
  assert.equal(await page.evaluate(()=>window.__lastStatsVisible.length),0);
  assert.equal(await page.evaluate(()=>window.patientProgressRefresh),null);
  assert.deepEqual(errors,[]);
  await browser.close();console.log('PASS rendered patient progress: real Chart.js, preserved active tab, updated counts/charts, changed filter wins, reset cancels refresh and closes modal; synthetic offline only.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
