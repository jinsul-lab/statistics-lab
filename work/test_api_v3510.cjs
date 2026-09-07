const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.10.html','utf8');
const prior=fs.readFileSync('JINSUL_MAP_v3.5.1.html','utf8');
const results=[];
function context(names,extra={}){
  const c=vm.createContext({console,URLSearchParams,URL,AbortController,setTimeout,clearTimeout,Document:class Document{},...extra});
  vm.runInContext(fs.readFileSync('work/site_v359.js','utf8'),c);
  if(names.includes('scanResolveCandidate')) names=[...names,'scanResolveCandidateBase'];
  for(const name of names){const m=source.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm'));assert.ok(m,name);vm.runInContext(m[0],c);}
  c.document={getElementById:()=>null};
  vm.runInContext(fs.readFileSync("work/network_v355.js","utf8"),c);
  let fetchImpl=c.fetch;Object.defineProperty(c,"fetch",{configurable:true,get:()=>async(...args)=>{const r=await fetchImpl(...args);if(r&&!r.text&&r.json)r.text=async()=>JSON.stringify(await r.json());return r;},set:v=>{fetchImpl=v}});
  return c;
}
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
(async()=>{
await test('All inline JavaScript compiles',()=>{for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/\bsrc\s*=/.test(m[1])&&m[2].trim())new vm.Script(m[2]);}});
const ids=h=>[...h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]);
await test('All 212 original static IDs preserved; no duplicates',()=>{assert.equal(ids(prior).length,212);assert.equal(new Set(ids(source)).size,ids(source).length);assert.ok(ids(prior).every(id=>ids(source).includes(id)));});
await test('All original named functions preserved',()=>{const names=s=>[...s.matchAll(/\bfunction\s+([\w$]+)\s*\(/g)].map(m=>m[1]);assert.ok(names(prior).every(n=>names(source).includes(n)));});
await test('Existing credentials, SDK libraries and R-ONE endpoint preserved',()=>{
  const config=s=>[...s.matchAll(/const\s+(\w*(?:KEY|SECRET|API_BASE|PROXY_API))\s*=\s*(['"])(.*?)\2/g)].map(m=>m[0]);
  assert.deepEqual(config(source),config(prior));
  const scripts=s=>[...s.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(scripts(source),scripts(prior));
});
const c=context(['scanNumber','scanApiCodeError','scanApiErrorMessage','scanApiEnvelope','scanRoneEnvelope','scanMedian','scanFetchRealty','scanRequestText','scanFetchWithTimeout','scanSeoulRequest','scanFetchSeoulCommerceRows'],{SEOUL_API_BASES:['https://example.test'],SEOUL_COMMERCE_API_KEY:'fixture',location:{protocol:'https:'}});
await test('Public API JSON array response',()=>{assert.equal(c.scanApiEnvelope({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:[{a:1}]}}}}).rows.length,1);});
await test('Public API single-item response',()=>{assert.equal(c.scanApiEnvelope({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:{a:1}}}}}).rows[0].a,1);});
await test('SDSC header.code failure is not a zero result',()=>{assert.throws(()=>c.scanApiEnvelope({header:{code:'30'},body:{}}),/30/);});
await test('Empty public response is rejected',()=>{assert.throws(()=>c.scanApiEnvelope({}),/구조/);});
await test('Valid zero count is retained',()=>{assert.equal(c.scanApiEnvelope({response:{header:{resultCode:'00'},body:{totalCount:0,items:''}}}).rows.length,0);});
await test('R-ONE top-level error is rejected',()=>{assert.throws(()=>c.scanRoneEnvelope({RESULT:{CODE:'ERROR-300',MESSAGE:'secret'}}),/ERROR-300/);});
await test('R-ONE proxy error does not leak upstream text',()=>{assert.throws(()=>c.scanRoneEnvelope({error:'secret'}),e=>!e.message.includes('secret'));});
await test('Valid R-ONE table parsed',()=>{assert.equal(c.scanRoneEnvelope({SttsApiTblData:[{head:[{list_total_count:1},{RESULT:{CODE:'INFO-000'}}]},{row:[{DTA_VAL:2}]}]}).rows.length,1);});
c.scanMonthKeys=()=>['202601','202602'];
await test('Trade LAWD_CD uses legal code, not SGIS code',async()=>{const calls=[];c.scanFetchTradeMonth=async(d,m)=>{calls.push(d);return []};const r=await c.scanFetchRealty({legCode:'2824510100',sggCode:'23070'});assert.equal(r.district,'28245');assert.ok(calls.every(d=>d==='28245'));});
await test('Trade does not substitute SGIS code for missing legal code',async()=>{await assert.rejects(c.scanFetchRealty({sggCode:'23070'}),/법정동/);});
await test('All trade months failing rejects instead of zero success',async()=>{c.scanFetchTradeMonth=async()=>{throw Error('fixture unavailable')};await assert.rejects(c.scanFetchRealty({legCode:'2824510100'}),/unavailable/);});
await test('Partial trade failure leaves a gap, not zero, in series',async()=>{c.scanFetchTradeMonth=async(d,m)=>{if(m==='202601')throw Error('failure');return [{month:m,amount:100,area:20}]};const r=await c.scanFetchRealty({legCode:'2824510100'});assert.equal(r.periods[0].count,null);assert.equal(r.periods[1].count,1);assert.equal(r.failedMonths,1);});
await test('HTTP failure retains status without request URL',async()=>{c.fetch=async()=>({ok:false,status:403});await assert.rejects(c.scanRequestText('https://example.test/?key=secret'),e=>e.message.includes('403')&&!e.message.includes('secret'));});
await test('Network failure is not diagnosed as unapproved key',async()=>{c.fetch=async()=>{const e=Error('Failed to fetch');e.name='TypeError';throw e};await assert.rejects(c.scanRequestText('https://example.test'),/CORS/);});
await test('Timeout has a distinct user-facing message',async()=>{c.fetch=async()=>{const e=Error();e.name='AbortError';throw e};await assert.rejects(c.scanRequestText('https://example.test'),/대기시간/);});
await test('Invalid JSON body cannot leak contents',async()=>{c.fetch=async()=>({ok:true,text:async()=>'secret malformed'});await assert.rejects(c.scanFetchWithTimeout('https://example.test'),e=>e.message.includes('JSON')&&!e.message.includes('secret'));});
await test('Seoul unknown schema rejected',async()=>{c.fetch=async()=>({ok:true,json:async()=>({})});await assert.rejects(c.scanFetchSeoulCommerceRows('fixture',1,5),/구조/);});
await test('Seoul explicit no-data response accepted',async()=>{c.fetch=async()=>({ok:true,json:async()=>({RESULT:{CODE:'INFO-200'}})});assert.equal((await c.scanFetchSeoulCommerceRows('fixture',1,5)).total,0);});
const k=context(['scanCompleteCandidate','scanResolveCandidate'],{kakao:{maps:{services:{Status:{OK:'OK'}}}},geocoder:{addressSearch:(q,cb)=>cb([],'ZERO'),coord2Address:(x,y,cb)=>cb([{address:{main_address_no:'123',sub_address_no:'4',mountain_yn:'N'}}],'OK'),coord2RegionCode:(x,y,cb)=>cb([{region_type:'H',code:'2824561000'},{region_type:'B',code:'2824510100',region_1depth_name:'인천광역시',region_2depth_name:'계양구'}],'OK')},places:{keywordSearch:(q,cb)=>cb([{place_name:'fixture clinic',address_name:'인천 계양구',x:'126.7',y:'37.5'}],'OK')}});
await test('Keyword candidate obtains B legal code and parcel separately',async()=>{const r=await k.scanResolveCandidate('fixture clinic');assert.equal(r.legalCode,'2824510100');assert.equal(r.jibunMain,'123');assert.equal(r.jibunSub,'4');});
await test('Region-code failure still returns usable map candidate',async()=>{k.geocoder.coord2RegionCode=(x,y,cb)=>cb([],'ERROR');const r=await k.scanResolveCandidate('fixture clinic');assert.equal(r.name,'fixture clinic');assert.ok(!r.legalCode);});
await test('Property loading starts separately and is awaited',()=>{assert.match(source,/const propertyPromise=scanPrepareProperty/);assert.match(source,/Promise\.allSettled\(\[propertyPromise,sgisPromise/);const f=source.match(/^async function scanPrepareSgis\([^]*?^}/m)[0];assert.ok(!f.includes('scanPrepareProperty'));});
const p=context(['scanPrepareProperty','scanApiErrorMessage'],{scanState:{requestToken:1,propertyRequestToken:0},scanResetPropertyUI:()=>{},scanFetchBuilding:async()=>{throw Error('building failure')},scanFetchRealty:async()=>{throw Error('trade failure')},scanFetchRone:async()=>({selectedScope:'인천'}),scanRenderProperty:()=>{}});
await test('R-ONE survives building and trade failures',async()=>{const r=await p.scanPrepareProperty({}, {},1);assert.equal(r.rone.selectedScope,'인천');assert.equal(r.building,null);assert.equal(p.scanState.realtyError,'trade failure');});
await test('Late property response cannot overwrite a new candidate',async()=>{p.scanState.requestToken=2;assert.equal(await p.scanPrepareProperty({}, {},1),null);});
const d=context(['scanFetchHiraDetails'],{scanState:{hiraDetailCache:new Map()},HIRA_API_KEY:'fixture',HIRA_DETAIL_API_BASE:'https://example.test',scanHiraRows:p=>p,scanFetchApiDocument:async()=>{throw Error('failure')}});
await test('Failed HIRA detail cache is evicted and can retry',async()=>{await assert.rejects(d.scanFetchHiraDetails('fixture'));await Promise.resolve();assert.equal(d.scanState.hiraDetailCache.size,0);d.scanFetchApiDocument=async()=>[{field:'ok'}];assert.equal((await d.scanFetchHiraDetails('fixture')).detail.field,'ok');});
const commerceBody={innerHTML:''};
const sc=context(['scanLoadCommerce','scanApiErrorMessage'],{scanState:{commerceCandidates:[{code:'fixture'}],requestToken:1,commerceRequestToken:0},$:()=>commerceBody,scanFloatingRows:async()=>{throw Error('floating failure')},scanStoreRows:async()=>{throw Error('stores failure')},scanBuildCommerceData:()=>({stores:{count:0,open:0,close:0}}),scanRenderCommerce:()=>{}});
await test('Failed Seoul store request remains unavailable, not zero stores',async()=>{const r=await sc.scanLoadCommerce('fixture',1);assert.equal(r.stores.count,null);assert.equal(r.apiConnected,false);});
await test('Partial Seoul result preserves available floating data',async()=>{sc.scanFloatingRows=async()=>[{fixture:true}];const r=await sc.scanLoadCommerce('fixture',1);assert.equal(r.apiConnected,true);assert.equal(r.stores.count,null);});
const rc=context(['scanFetchRoneRows'],{scanState:{roneTableCache:new Map()},scanFetchRonePage:async()=>({total:0,rows:[]})});
await test('Empty R-ONE result is evicted rather than cached permanently',async()=>{await assert.rejects(rc.scanFetchRoneRows({id:'fixture'}),/자료/);await Promise.resolve();assert.equal(rc.scanState.roneTableCache.size,0);});
const geo=context(['scanHaversineMeters','scanCandidateRegion','scanIsSeoulCandidate','scanNearestSeoulHotspots','scanWgs84ToWtm','scanNearestTradeAreas']);
for(const name of ['SEOUL_REALTIME_HOTSPOTS','SEOUL_TRADE_AREAS'])vm.runInContext(source.match(new RegExp('const '+name+' = [^]*?;'))[0],geo);
// Coordinates from the HIRA public hospital page's directions link, not a live API test.
const wangsimni={name:'왕십리본정형외과의원',address:'서울특별시 성동구 왕십리로 320',lat:37.5623492,lng:127.0343485};
let wangsimniResult;
await test('Wangsimni clinic: Seoul hotspot and trade-area selection at 1 km',()=>{
  const hotspots=geo.scanNearestSeoulHotspots(wangsimni,5,1000),areas=geo.scanNearestTradeAreas(wangsimni,5,1000);
  assert.equal(hotspots[0].name,'왕십리역');assert.ok(areas.length>0);assert.ok(areas.every(a=>a.distance<=1000));
  wangsimniResult={candidate:wangsimni,radiusMeters:1000,hotspots:hotspots.map(a=>({name:a.name,distanceMeters:Math.round(a.distance)})),areas:areas.map(a=>({name:a.name,distanceMeters:Math.round(a.distance)})),testType:'Local geographic selection using embedded reference data; live API responses not tested'};
});
await test('Wangsimni clinic: a smaller radius excludes out-of-radius hotspots',()=>{assert.equal(geo.scanNearestSeoulHotspots(wangsimni,5,100).length,0);});
await test('Address search retains local names for R-ONE automatic matching',async()=>{
  k.geocoder.addressSearch=(q,cb)=>cb([{x:'126.7',y:'37.5',address:{address_name:'인천 계양구 계산동',b_code:'2824510100',main_address_no:'123',region_1depth_name:'인천',region_2depth_name:'계양구',region_3depth_name:'계산동'}}],'OK');
  const candidate=await k.scanResolveCandidate('fixture address');assert.equal(candidate.admName,'계산동');
  const r=context(['scanRoneGeoCore','scanRoneSidoName','scanPickRoneScope']);
  assert.equal(r.scanPickRoneScope(['전국','인천','인천>계양계산','서울>왕십리'],{sidoName:candidate.sidoName,sggName:candidate.sggName,admName:candidate.admName},candidate).name,'인천>계양계산');
});
fs.writeFileSync('work/wangsimni-test-results-v3510.json',JSON.stringify(wangsimniResult,null,2));
console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,total:results.length,failures:results.filter(r=>r.status==='FAIL'),wangsimni:wangsimniResult},null,2));
fs.writeFileSync('work/api-test-results-v3510.json',JSON.stringify({executedAt:new Date().toISOString(),type:'Offline regression; stubbed API responses, not live service validation',results},null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})();

