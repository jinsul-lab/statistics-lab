import assert from 'node:assert/strict';
import worker from '../workers/seoul/worker.mjs';
const origin='https://jinsul-lab.github.io';
const body={service:'citydata_ppltn',key:'fixturekey123456',start:1,end:5,tail:'왕십리역'};
const request=(data=body,headers={Origin:origin})=>new Request('https://fixture/seoul',{method:'POST',headers,body:JSON.stringify(data)});
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS '+name);}
await test('health',async()=>{const r=await worker.fetch(new Request('https://fixture/health'));assert.equal(r.status,200);assert.equal((await r.json()).version,'1.0.5');});
await test('preflight',async()=>{const r=await worker.fetch(new Request('https://fixture/seoul',{method:'OPTIONS',headers:{Origin:origin}}));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);});
await test('unapproved origin',async()=>assert.equal((await worker.fetch(request(body,{Origin:'https://evil.test'}))).status,403));
await test('unsupported service',async()=>assert.equal((await worker.fetch(request({...body,service:'https://evil.test'}))).status,400));
await test('invalid quarter',async()=>assert.equal((await worker.fetch(request({...body,service:'VwsmTrdarStorQq',tail:'20265'}))).status,400));
await test('upstream success and key redaction',async()=>{globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual');assert.ok(url.startsWith('http://openapi.seoul.go.kr:8088/'));return Response.json({data:[1],echo:body.key});};const r=await worker.fetch(request());assert.equal(r.status,200);assert.ok(!(await r.text()).includes(body.key));});
await test('1000 row page accepted',async()=>assert.equal((await worker.fetch(request({...body,service:'VwsmTrdarFlpopQq',start:1,end:1000,tail:'20261'}))).status,200));
await test('overlarge page rejected',async()=>assert.equal((await worker.fetch(request({...body,service:'VwsmTrdarFlpopQq',start:1,end:1001,tail:'20261'}))).status,400));
await test('upstream HTTP error with CORS',async()=>{globalThis.fetch=async()=>new Response('',{status:503});const r=await worker.fetch(request());assert.equal(r.status,502);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);});
await test('upstream code preserved',async()=>{globalThis.fetch=async()=>Response.json({RESULT:{CODE:'INFO-200'}});assert.equal((await (await worker.fetch(request())).json()).RESULT.CODE,'INFO-200');});
await test('invalid JSON rejected',async()=>{globalThis.fetch=async()=>new Response('<html>error</html>');assert.equal((await worker.fetch(request())).status,502);});
await test('transport diagnostics redact credentials',async()=>{globalThis.fetch=async()=>{throw Error('connection failed '+body.key)};const r=await worker.fetch(request());assert.equal(r.status,504);assert.ok(!(await r.text()).includes(body.key));});
await test('clinic filter validates flag and service',async()=>{assert.equal((await worker.fetch(request({...body,clinicOnly:true}))).status,400);assert.equal((await worker.fetch(request({...body,clinicOnly:'true'}))).status,400);});
await test('clinic filter preserves original page count',async()=>{const service='VwsmTrdarSelngQq';globalThis.fetch=async()=>Response.json({[service]:{list_total_count:4,row:['CS200006','CS200007','CS200008','CS100001'].map(SVC_INDUTY_CD=>({SVC_INDUTY_CD}))}});const r=await worker.fetch(request({...body,service,tail:'20262',clinicOnly:true}));const b=(await r.json())[service];assert.equal(b.row.length,3);assert.equal(b.source_page_count,4);assert.equal(b.list_total_count,4);assert.equal(b.clinic_filtered,true);});
await test('unfiltered sales retains all rows',async()=>{const service='VwsmTrdarSelngQq';const b=(await (await worker.fetch(request({...body,service,tail:'20262'}))).json())[service];assert.equal(b.row.length,4);assert.equal(b.clinic_filtered,undefined);});
await test('official shelters preserve source fields and page total',async()=>{
  const service='TbGtnHwcwP';
  const row={YEAR:'2026',AREA_CD:'1129071500',R_AREA_NM:'공식 쉼터 검증용',R_DETL_ADD:'서울특별시 성북구 검증로 1',LON:'127.0370580',LAT:'37.6041180',FACILITY_TYPE1:'특정계층이용시설',FACILITY_TYPE2:'회원이용시설',OPR_DAYS:'월,화,수,목,금',OPR_START_TIME:'09:00',OPR_END_TIME:'18:00',RMRK:''};
  globalThis.fetch=async(url,options)=>{assert.equal(url,'http://openapi.seoul.go.kr:8088/'+body.key+'/json/'+service+'/1001/2000/');assert.equal(options.redirect,'manual');return Response.json({[service]:{list_total_count:4092,RESULT:{CODE:'INFO-000'},row:[row]}});};
  const r=await worker.fetch(request({...body,service,start:1001,end:2000,tail:''}));
  assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
  const b=(await r.json())[service];assert.equal(b.list_total_count,4092);assert.deepEqual(b.row,[row]);assert.equal(b.clinic_filtered,undefined);
});
await test('official shelters accept omitted tail on first page',async()=>{
  globalThis.fetch=async(url)=>{assert.ok(url.endsWith('/TbGtnHwcwP/1/1000/'));return Response.json({TbGtnHwcwP:{list_total_count:0,row:[]}});};
  const {tail,...data}=body;
  assert.equal((await worker.fetch(request({...data,service:'TbGtnHwcwP',end:1000}))).status,200);
});
await test('official shelters reject unsupported filters before network',async()=>{
  globalThis.fetch=async()=>{throw Error('must not call upstream');};
  for(const tail of ['성동구','20261','11200','../citydata_ppltn','https://evil.test',' '])assert.equal((await worker.fetch(request({...body,service:'TbGtnHwcwP',tail}))).status,400);
  assert.equal((await worker.fetch(request({...body,service:'TbGtnHwcwP',tail:'',clinicOnly:true}))).status,400);
  assert.equal((await worker.fetch(request({...body,service:'TbGtnHwcwP',tail:'',end:1001}))).status,400);
});
await test('official shelters retain CORS and redaction on upstream failure',async()=>{
  globalThis.fetch=async()=>{throw new DOMException('timeout '+body.key,'TimeoutError');};
  const r=await worker.fetch(request({...body,service:'TbGtnHwcwP',tail:''}));
  assert.equal(r.status,504);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.ok(!(await r.text()).includes(body.key));
});
console.log(count+' Worker mock tests passed; no live API requests.');
