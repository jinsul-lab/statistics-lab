const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
function block(name,next){const a=h.indexOf('function '+name+'('),b=h.indexOf('function '+next+'(',a);assert(a>=0&&b>a);return h.slice(a,b);}
function fn(name){const a=h.indexOf('function '+name+'(');return h.slice(a,h.indexOf('\n}',a)+2);}
const ui={};const c=vm.createContext({console,Map,Date,window:{},patients:[],patientLoadToken:0,$:id=>ui[id]||(ui[id]={}),toast:()=>{},clusterer:{clear(){}},setTimeout:()=>{},patientNewFlag:undefined});
vm.runInContext(fn('calcAgeFromRow')+'\n'+fn('patientNewFlag')+'\n'+block('parsePatients','applyFilter'),c);
const rows=[['번호','차트번호','주소','성명','신규','구분','나이'],[1,'A','테스트','가','N','재진','-1'],[2,'A','테스트','가','0','재진',''],[3,'B','테스트','나','Y','신환','6개월'],[4,'B','테스트','나','','재진','6개월'],[5,'C','테스트','다','아니오','재진','30']];
c.parsePatients(rows);assert.equal(c.patients.length,3);assert.equal(c.patients.find(p=>p.id==='A').type,'재진');assert.equal(c.patients.find(p=>p.id==='B').total,2);assert.equal(c.patients.find(p=>p.id==='C').type,'재진');assert.equal(c.calcAgeFromRow('-1',null),null);assert.equal(c.calcAgeFromRow('6개월',null),0);assert.equal(c.calcAgeFromRow('만 54세',null),54);assert.equal(c.calcAgeFromRow('69세6개월',null),69);assert.equal(c.calcAgeFromRow('미상123',null),null);
console.log('PASS exact patient identifier, explicit false flags, source record grouping, age boundaries');
const timers=[],callbacks=[];let finished=0;c.setTimeout=f=>timers.push(f);c.geocoder={addressSearch:(addr,cb)=>callbacks.push(cb)};c.kakao={maps:{services:{Status:{OK:'OK'}}}};c.applyFilter=()=>finished++;ui.btnFit={click(){}};
c.parsePatients(rows);timers.splice(0).forEach(f=>f());callbacks[2]([], 'FAIL');assert.equal(finished,0);callbacks[0]([], 'FAIL');assert.equal(finished,0);callbacks[1]([], 'FAIL');assert.equal(finished,1);
c.parsePatients(rows);timers.splice(0).forEach(f=>f());const stale=callbacks.slice(3);c.parsePatients(rows);stale.forEach(cb=>cb([], 'FAIL'));assert.equal(finished,1);
console.log('PASS out-of-order geocoding completion and stale upload callback cancellation');
const {chromium}=require('C:/Users/withe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const body=h.slice(h.indexOf('<div class="modalBack" id="statsModal">'),h.indexOf('<script>',h.indexOf('id="statsModal"')));
await page.setContent('<html><head>'+[...h.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('')+'</head><body><button id="btnStats">통계</button><button id="btnClear"></button>'+body+'</body></html>');
await page.addScriptTag({content:fs.readFileSync('work/chart-test.umd.js','utf8')});await page.addScriptTag({content:fs.readFileSync('work/chart-test-labels.js','utf8')});
const stats=block('bucketAge','scanEscapeHTML'); // trim at scan section marker below
const statsEnd=h.indexOf('/* ===========================   [상권 스캔',h.indexOf('function bucketAge('));
const decl=h.match(/let chartObj1[^;]+;/)[0];
await page.addScriptTag({content:`const $=id=>document.getElementById(id);${decl} const REP_COLOR={"신환 (1회만)":"#ff0000","신환 ▶ 재진 전환":"#00c853","90일초":"#ffd400","재진":"#228be6"};let patients=[],myHospitalMarker=null,circles=[];let patientLoadToken=0;const drawingManager={getData:()=>({circle:[]})},toggleState={new_only:true,new_conv:true,bit_90:true,old:true},scanState={};const toast=()=>{};window.kakao={maps:{LatLng:function(y,x){this.y=y;this.x=x;},Polyline:class{setPath(p){this.p=p;}getLength(){return Math.abs(this.p[1].x-this.p[0].x);}}}};`+h.slice(h.indexOf('function bucketAge('),statsEnd)+'\n'+h.slice(h.indexOf('function patientTypeLabel('),h.indexOf('function patientNewFlag('))+'\n'+h.slice(h.indexOf('function patientStatsEscape('),h.lastIndexOf('</script>'))});
await page.evaluate(()=>{
 patients=[{type:'신환 (1회만)',total:1,age:20,dong:'A',latlng:{x:100}},{type:'신환 ▶ 재진 전환',total:9,age:20,dong:'A',latlng:{x:500}},{type:'재진',total:2,age:40,dong:'B',latlng:{x:1000}},{type:'재진',total:2,age:40,dong:'B',latlng:{x:3000}}];
 $('chkMinSample').checked=false;$('btnStats').click();switchTab('tabValue');
});
let av=await page.locator('#tblAvgVisits').innerText();assert(av.includes('5.00'));assert(av.includes('2.00'));assert.equal(await page.locator('#tblConvRank tr').count(),1);assert((await page.locator('#tblConvRank').innerText()).includes('50.0%'));
await page.evaluate(()=>switchTab('tabDong'));assert.deepEqual(await page.evaluate(()=>chartObjDong.data.datasets[0].data),[2,0]);
await page.evaluate(()=>{circles=[{circle:{getPosition:()=>({x:0}),getRadius:()=>500}}]});assert.equal(await page.evaluate(()=>buildVisiblePatients().length),2);
await page.evaluate(()=>{circles=[];myHospitalMarker={getPosition:()=>({x:0})};renderDistanceCharts(patients)});assert.deepEqual(await page.evaluate(()=>chartObjDistHist.data.datasets[0].data),[1,1,1,0,1]);
assert((await page.locator('#tblDistConv').innerText()).includes('0.00x'));
await page.evaluate(()=>renderDistanceCharts([]));assert((await page.locator('#distSummary').innerText()).includes('0명'));assert((await page.locator('#distSummary').innerText()).includes('자료 없음'));assert.deepEqual(await page.evaluate(()=>chartObjDistCoverage.data.datasets[0].data),[null,null,null,null,null]);
await page.evaluate(()=>renderAgeRetentionCharts([{type:'재진',age:40,total:1}]));assert((await page.locator('#ageRetentionSummary').innerText()).includes('—'));assert(!((await page.locator('#tblAgeRetention').innerText()).includes('0.00x')));
await page.evaluate(()=>{renderRegionCharts([])});assert((await page.locator('#txtParetoSummary').innerText()).includes('0명'));
await page.evaluate(()=>{renderVisitTab([])});assert(!((await page.locator('#tblVisit').innerText()).includes('100%')));assert((await page.locator('#tblVisitImpact').innerText()).includes('—'));
await page.evaluate(()=>{$('btnStats').click();switchTab('tabValue')});await page.waitForTimeout(600);await page.locator('#tabValue').scrollIntoViewIfNeeded();await page.screenshot({path:'work/audit-patient-desktop-v371.png'});
await page.setViewportSize({width:768,height:1024});await page.evaluate(()=>switchTab('tabType'));await page.locator('#statsModal .modalBody').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'work/audit-patient-tablet-v371.png'});
assert.deepEqual(errors,[]);await browser.close();console.log('PASS raw average, conversion denominator, chart/selector agreement, manual radius, distance boundaries, zero/missing, desktop/tablet');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
