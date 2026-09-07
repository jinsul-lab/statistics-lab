const fs=require('fs'),vm=require('vm'),a=require('node:assert/strict');
const h=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.7.html','utf8');
const fn=name=>{const m=h.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}','m'));a.ok(m,name);return m[0];};
let callback,opts,timer;const c=vm.createContext({Date,scanState:{requestToken:1},setTimeout:f=>(timer=f,1),clearTimeout:()=>{},kakao:{maps:{services:{Status:{OK:'OK',ZERO_RESULT:'ZERO'},SortBy:{DISTANCE:'distance'}}}},places:{keywordSearch:(k,cb,o)=>{callback=cb;opts=o},categorySearch:(k,cb,o)=>{callback=cb;opts=o}}});
vm.runInContext(fn('scanSearchAllPages'),c);let count=0;async function test(name,f){await f();count++;console.log('PASS '+name)}
(async()=>{
vm.runInContext(fn('scanNumber'),c);
await test('missing numeric data is not zero',()=>{for(const v of [null,undefined,'','  '])a.equal(c.scanNumber(v),null);a.equal(c.scanNumber('0'),0);a.equal(c.scanNumber('1,234'),1234)});
await test('hospital category applied only to competition keyword search',async()=>{const p=c.scanSearchAllPages('keyword','정형외과',{},1000,1);a.equal(opts.category_group_code,'HP8');callback([],'ZERO');a.equal((await p).error,false);const q=c.scanSearchAllPages('category','SW8',{},1000,1);a.equal(opts.category_group_code,undefined);callback([],'ZERO');await q});
await test('no callback terminates as error, not real zero',async()=>{const p=c.scanSearchAllPages('keyword','x',{},1000,1);timer();const r=await p;a.equal(r.error,true);a.equal(r.places.length,0);callback([{id:'late'}],'OK',{});a.equal(r.places.length,0)});
await test('partial timeout retains rows and reports partial failure',async()=>{const p=c.scanSearchAllPages('keyword','x',{},1000,1);callback([{id:1}],'OK',{hasNextPage:true,nextPage:()=>{}});timer();const r=await p;a.equal(r.error,true);a.equal(r.truncated,true);a.equal(r.places.length,1)});
await test('multi-page complete results retained',async()=>{const p=c.scanSearchAllPages('keyword','x',{},1000,1);callback([{id:1}],'OK',{hasNextPage:true,nextPage:()=>callback([{id:2}],'OK',{hasNextPage:false,totalCount:2})});const r=await p;a.equal(r.places.length,2);a.equal(r.truncated,false)});
await test('reported total larger than received is incomplete',async()=>{const p=c.scanSearchAllPages('keyword','x',{},1000,1);callback([{id:1}],'OK',{hasNextPage:false,totalCount:3});a.equal((await p).truncated,true)});
await test('cancelled token is not shown as network error',async()=>{const p=c.scanSearchAllPages('keyword','x',{},1000,1);c.scanState.requestToken=2;timer();a.equal((await p).cancelled,true);c.scanState.requestToken=1});
// Use original draft helpers then the final generated validator, not a duplicate implementation.
vm.runInContext(fs.readFileSync('work/site_v359.js','utf8'),c);vm.runInContext(fn('scanSiteValidDraft'),c);
const raw={schema:'jinsul-site-1',key:'fixture',competitionMode:'all',fields:{unit:'101호',rent:'0'},photos:{exterior:'data:image/png;base64,AAAA'},checks:['양호'],snapshot:{candidate:{name:'병원',address:'경기 시흥시',lat:37,lng:127,placeUrl:'https://place.kakao.com/123'},createdAt:'2026-09-01T00:00:00Z',facts:[{name:'면적',value:'30',scope:'101호',source:'건축물대장',when:'2026'}],competition:{rows:[{name:'의원',phone:'031-123-4567',specialties:['정형외과'],doctorCount:null}]}}};
await test('JSON round trip preserves unit, photo, source and contact',()=>{const d=c.scanSiteValidDraft(JSON.parse(JSON.stringify(raw)));a.equal(d.fields.unit,'101호');a.equal(d.photos.exterior,raw.photos.exterior);a.equal(d.snapshot.competition.rows[0].phone,'031-123-4567');a.equal(d.snapshot.facts[0].source,'건축물대장');a.equal(d.snapshot.candidate.placeUrl,'https://place.kakao.com/123');a.equal(d.competitionMode,'all');a.equal(d.checks[0],'양호');a.equal(d.fields.rent,'0');a.equal(d.snapshot.competition.rows[0].doctorCount,null)});
await test('unsafe imported place link removed',()=>{a.equal(c.scanSiteValidDraft({...raw,snapshot:{...raw.snapshot,candidate:{...raw.snapshot.candidate,placeUrl:'javascript:alert(1)'}}}).snapshot.candidate.placeUrl,'')});
await test('legacy documents without link still load',()=>{const d=JSON.parse(JSON.stringify(raw));delete d.snapshot.candidate.placeUrl;a.equal(c.scanSiteValidDraft(d).snapshot.candidate.placeUrl,'')});
vm.runInContext(fs.readFileSync('work/quality_v367.js','utf8'),c);
await test('freshness reflects query age in Korean timezone',()=>{const text=c.scanSiteFreshness(raw,Date.parse('2026-09-08T00:00:00Z'));a.ok(text.includes('7일 전'));a.ok(text.includes('한국시간'));a.ok(text.includes('원자료 기준일'))});
await test('missing query date does not claim freshness',()=>a.ok(c.scanSiteFreshness({snapshot:{}}).includes('미확인')));
await test('patient upload and map tool code unchanged',()=>{const old=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.6.html','utf8');a.equal(h.slice(h.indexOf('function scanNormalizePlace'),h.indexOf('function scanRenderResult')),old.slice(old.indexOf('function scanNormalizePlace'),old.indexOf('function scanRenderResult')));a.ok(!h.includes('id="aiDrawer"'))});
await test('all final inline scripts parse',()=>{for(const m of h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1])});
console.log(count+' quality checks passed (fixtures; no live API)');
})().catch(e=>{console.error(e);process.exitCode=1});
