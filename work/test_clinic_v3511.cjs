const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.11.html','utf8');
const code=html.slice(html.indexOf('const scanClinicKinds='),html.indexOf('function scanReportScores('));
const c=vm.createContext({scanNumber:Number,SEOUL_COMMERCE_API_KEY:'fixturekey123456',scanApiCodeError:code=>Error(code)});vm.runInContext(code,c);
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
const row=(area='3130066',period='20262',industry='CS200006')=>({TRDAR_CD:area,STDR_YYQU_CD:period,SVC_INDUTY_CD:industry,THSMON_SELNG_AMT:120000,MON_SELNG_AMT:0});
const page=(total,sourceCount,rows=[row()])=>JSON.stringify({VwsmTrdarSelngQq:{RESULT:{CODE:'INFO-000'},list_total_count:total,source_page_count:sourceCount,clinic_filtered:true,row:rows}});
(async()=>{
await test('exact area quarter and clinic category',()=>{const r=row();assert.equal(c.scanClinicFind([row('other'),row('3130066','20261'),row('3130066','20262','CS200007'),r],'3130066','20262','CS200006'),r);});
await test('duplicate rows are never added',()=>assert.throws(()=>c.scanClinicFind([row(),row()],'3130066','20262','CS200006'),/중복/));
await test('missing row is not zero',()=>assert.equal(c.scanClinicFind([],'3130066','20262','CS200006'),null));
await test('zero versus absent measures',()=>{assert.equal(c.scanClinicNumber(''),null);assert.equal(c.scanClinicNumber(null),null);assert.equal(c.scanClinicNumber(0),0);assert.equal(c.scanClinicSales(row()).days[0][1],0);assert.equal(c.scanClinicSales(row()).days[1][1],null);});
await test('store total uses published total',()=>assert.equal(c.scanClinicStore({SIMILR_INDUTY_STOR_CO:24,STOR_CO:23,FRC_STOR_CO:1}).total,24));
await test('unfiltered proxy response rejected',async()=>{c.scanNetworkRequest=async()=>JSON.stringify({VwsmTrdarSelngQq:{row:[]}});await assert.rejects(c.scanClinicSalesPage('20262',1,1000),/업데이트/);});
await test('short source page rejected',async()=>{c.scanNetworkRequest=async()=>page(1000,999);await assert.rejects(c.scanClinicSalesPage('20262',1,1000),/누락/);});
await test('wrong quarter rejected',async()=>{c.scanNetworkRequest=async()=>page(1,1,[row('3130066','20261')]);await assert.rejects(c.scanClinicSalesPage('20262',1,1000),/분기/);});
await test('wrong industry rejected',async()=>{c.scanNetworkRequest=async()=>page(1,1,[row('3130066','20262','CS100001')]);await assert.rejects(c.scanClinicSalesPage('20262',1,1000),/업종/);});
await test('all pages and success cache',async()=>{let calls=0;c.scanNetworkRequest=async(u,o)=>{calls++;const q=JSON.parse(o.body);assert.equal(q.clinicOnly,true);return page(2100,q.start===2001?100:1000,[row(String(q.start))]);};const r=await c.scanClinicSalesQuarter('20262');assert.equal(r.length,3);await c.scanClinicSalesQuarter('20262');assert.equal(calls,3);});
await test('failed pages never cached',async()=>{vm.runInContext('scanClinic.salesCache.clear()',c);c.scanNetworkRequest=async(u,o)=>{const q=JSON.parse(o.body);if(q.start>1)throw Error('timeout');return page(2000,1000);};await assert.rejects(c.scanClinicSalesQuarter('20262'),/timeout/);assert.equal(vm.runInContext('scanClinic.salesCache.size',c),0);});
await test('changed total rejected',async()=>{c.scanNetworkRequest=async(u,o)=>{const q=JSON.parse(o.body);return q.start===1?page(2000,1000):page(2001,1000);};await assert.rejects(c.scanClinicSalesQuarter('20262'),/변경/);});
await test('candidate change cancels more batches',async()=>{let calls=0;c.scanNetworkRequest=async()=>{calls++;return page(2000,1000)};await assert.rejects(c.scanClinicSalesQuarter('20262',()=>{},()=>false),/중단/);assert.equal(calls,1);});
await test('official no-data yields empty complete result',async()=>{c.scanNetworkRequest=async()=>JSON.stringify({RESULT:{CODE:'INFO-200'}});assert.equal((await c.scanClinicSalesQuarter('20262')).length,0);});
console.log(count+' clinic mock checks passed; no live API requests.');
})().catch(e=>{console.error(e);process.exitCode=1});
