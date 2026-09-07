const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const src=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.4.html','utf8');
const c=vm.createContext({Date,AbortController,TypeError,location:{protocol:'https:'},setTimeout:(fn,ms)=>ms===600?setTimeout(fn,0):setTimeout(fn,ms),clearTimeout,scanState:{commerceStoreCache:new Map()},scanNumber:v=>Number(v)});
for(const name of ['scanSeoulRequest','scanSeoulQuarters','scanFloatingRows','scanStoreRows','scanFloatingBreakdown','scanRenderFloatingBreakdown'])vm.runInContext(src.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}','m'))[0],c);
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
await test('quarter rollover',()=>assert.equal(c.scanSeoulQuarters(new Date(2026,0,5))[0],'20254'));
await test('last complete quarter',()=>assert.equal(c.scanSeoulQuarters(new Date(2026,8,7))[0],'20262'));
await test('transient network failure retries once',async()=>{let n=0;c.fetch=async()=>{if(++n===1)throw new TypeError('offline');return {ok:true,json:async()=>({ok:true})}};assert.equal((await c.scanSeoulRequest('s','k',1,1)).ok,true);assert.equal(n,2);});
await test('403 is not retried',async()=>{let n=0;c.fetch=async()=>{n++;return {ok:false,status:403}};await assert.rejects(c.scanSeoulRequest('s','k',1,1),/403/);assert.equal(n,1);});
await test('local file gets actionable error',async()=>{c.location.protocol='file:';await assert.rejects(c.scanSeoulRequest('s','k',1,1),/온라인/);c.location.protocol='https:';});
await test('failed store promise evicted for next scan',async()=>{c.scanFetchSeoulCommerceRows=async()=>{throw Error('failure')};await assert.rejects(c.scanStoreRows('3130066'));assert.equal(c.scanState.commerceStoreCache.size,0);});
await test('empty quarter falls back and records real period',async()=>{let calls=0;c.scanSeoulQuarters=()=>['20262','20261'];c.scanFetchSeoulCommerceRows=async()=>++calls===1?{rows:[],total:0}:{rows:[{STOR_CO:2}],total:1};const rows=await c.scanStoreRows('3130066');assert.equal(rows.period,'20261');assert.equal(calls,2);});
await test('transport failure does not masquerade as no-data fallback',async()=>{let n=0;c.scanFetchSeoulCommerceRows=async()=>{n++;throw Error('network')};await assert.rejects(c.scanFloatingRows(true));assert.equal(n,1);});
await test('missing detailed metric stays missing',()=>{const b=c.scanFloatingBreakdown({MON_FLPOP_CO:0});assert.equal(b.days[0][1],0);assert.equal(b.days[1][1],null);assert.equal(b.times[0][1],null);});
await test('partial detail renders missing label',()=>{const out=c.scanRenderFloatingBreakdown({breakdown:c.scanFloatingBreakdown({MON_FLPOP_CO:10})});assert.ok(out.includes('자료 없음'));assert.ok(out.includes('100.0%'));});
console.log(passed+' Seoul recovery tests passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
