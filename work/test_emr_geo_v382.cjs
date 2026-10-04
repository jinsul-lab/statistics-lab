/* Latest application address/geography regression, synthetic API responses only. */
const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const html=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
const helperStart=html.indexOf('// Address import and diagnostics.'),helperEnd=html.indexOf('function parsePatients(',helperStart);
assert(helperStart>=0&&helperEnd>helperStart);
const helper=html.slice(helperStart,helperEnd);
function block(a,b){const s=html.indexOf('function '+a+'('),e=html.indexOf('function '+b+'(',s);assert(s>=0&&e>s);return html.slice(s,e);}
function lineFn(a){const line=html.split(/\r?\n/).find(s=>s.startsWith('function '+a+'('));assert(line);return line;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let assertions=0;const equal=(a,b,n)=>{assert.equal(a,b,n);assertions++;};
const deep=(a,b,n)=>{assert.deepEqual(a,b,n);assertions++;};
class LatLng{constructor(y,x){this.y=Number(y);this.x=Number(x);}getLat(){return this.y;}getLng(){return this.x;}}
class Polyline{setPath(p){this.p=p;}getLength(){return Math.abs(this.p[1].x-this.p[0].x)*1000;}}
class Marker{constructor(a){this.pos=a.position;this.onMap=false;}getMap(){return this.onMap?{}:null;}getPosition(){return this.pos;}}
function context(){
 const ui={},log={calls:[],status:[],finalized:0,fit:0};
 const c=vm.createContext({console,Map,Set,Date,Number,String,Promise,window:{},patients:[],patientLoadToken:1,$:id=>ui[id]||(ui[id]={}),setTimeout:(f,ms)=>ms===0?0:setTimeout(f,Math.max(1,ms*.01)),clearTimeout,toast:()=>{},clusterer:{clear(){}},geocoder:{},kakao:{maps:{LatLng,Polyline,Marker,MarkerImage:class{},Size:class{},InfoWindow:class{},services:{Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT',ERROR:'ERROR'}},event:{addListener(){}}}},toggleState:{all:true,new_only:true,new_conv:true,bit_90:true,old:true},REP_COLOR:{},patientStatsEscape:x=>String(x),patientTypeLabel:x=>x,applyFilter:()=>log.finalized++,drawingManager:{getData:()=>({circle:[]})},circles:[],map:{}});
 ui.btnFit={click:()=>log.fit++};
 vm.runInContext(helper+'\n'+html.slice(html.indexOf('function calcAgeFromRow('),html.indexOf('// ENTER on hospital input'))+lineFn('patientNewFlag')+'\n'+block('parsePatients','applyFilter')+block('patientAnalysisCircles','buildVisiblePatients')+block('buildVisiblePatients','pct')+lineFn('countInCircle'),c);
 c.patientRenderImportMapping=()=>{};
 return {c,ui,log};
}
const region={region_1depth_name:'합성시',region_2depth_name:'합성구',region_3depth_h_name:'합성동',region_3depth_name:'합성법정동'};
const result=(distance,extra={})=>({x:127+distance/1000,y:35,address:region,...extra});
(async()=>{
 // Direct status and ambiguity classification. No hospital or patient identities are real.
 const {c,ui}=context();
 equal((await c.patientResolveAddress('',1)).state,'missing');
 equal((await c.patientResolveAddress('경기도 합성시 합성동',1)).state,'insufficient');
 c.geocoder.addressSearch=(q,cb)=>cb([],'ZERO_RESULT');
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'unresolved');
 let errorCalls=0;c.geocoder.addressSearch=(q,cb)=>{errorCalls++;cb([],'ERROR');};
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'failed');equal(errorCalls,2,'One retry for API error.');
 let timeoutCalls=0;c.geocoder.addressSearch=()=>{timeoutCalls++;};
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'failed');equal(timeoutCalls,2,'Timeout exits after one retry.');
 c.geocoder.addressSearch=(q,cb)=>cb([result(100),result(900)],'OK');
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'ambiguous');
 c.geocoder.addressSearch=(q,cb)=>cb([result(100)],'OK',{totalCount:2});
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'ambiguous','Truncated candidate response is ambiguous.');
 c.geocoder.addressSearch=(q,cb)=>cb([result(100),result(100)],'OK');
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'resolved','Same-coordinate duplicate representations do not create false ambiguity.');
 c.geocoder.addressSearch=(q,cb)=>cb([{x:'NaN',y:35}], 'OK');
 equal((await c.patientResolveAddress('경기도 합성시 합성로 1',1)).state,'unresolved','Invalid-only coordinates do not create a marker.');
 const roadOnly={x:127.2,y:35,road_address:{region_1depth_name:'합성시',region_2depth_name:'합성구',region_3depth_name:'도로법정동'}};
 c.geocoder.addressSearch=(q,cb)=>cb([roadOnly],'OK');
 const road=await c.patientResolveAddress('경기도 합성시 합성로 1',1);
 equal(road.state,'resolved');equal(road.dong,'합성시 합성구 도로법정동 (법정동)');equal(road.basis,'법정동');
 c.geocoder.coord2RegionCode=(x,y,cb)=>cb([{region_type:'H',region_1depth_name:'합성시',region_2depth_name:'합성구',region_3depth_name:'행정동'}],'OK');
 const administrative=await c.patientResolveAddress('경기도 합성시 합성로 1',1);
 equal(administrative.dong,'합성시 합성구 행정동');equal(administrative.basis,'행정동');
 // Stale callback is cancelled; late success following timeout cannot change settled failure.
 let callback;c.geocoder.addressSearch=(q,cb)=>{callback=cb;};
 const cancelled=c.patientGeoRequest('addressSearch',['경기도 합성시 합성로 1'],1,500);
 c.patientLoadToken=2;callback([result(100)],'OK');equal((await cancelled).state,'cancelled');
 c.patientLoadToken=1;const timed=c.patientGeoRequest('addressSearch',['경기도 합성시 합성로 1'],1,200);
 const timedResult=await timed;equal(timedResult.state,'failed');callback([result(100)],'OK');equal(timedResult.state,'failed');
 // Bounded ordinary requests and duplicate raw-address sharing across patients.
 const group=context();let active=0,maxActive=0,normalCalls=0;
 group.c.geocoder.addressSearch=(q,cb)=>{normalCalls++;active++;maxActive=Math.max(maxActive,active);setTimeout(()=>{active--;cb([result(100)],'OK');},12);};
 const grouped=Array.from({length:8},(_,i)=>({id:'S'+i,name:'합성',type:'재진',total:1,addr:'경기도 합성시 합성로 '+(i%4+1)}));
 group.c.patients=grouped;await group.c.patientStartGeocoding(grouped,1);
 equal(normalCalls,4);equal(maxActive,3);equal(grouped.filter(p=>p.geoState==='resolved').length,8);equal(group.log.finalized,1);
 // Failed row while other workers pending must not expose token-cancelling retry.
 const partial=context();partial.c.patients=[1,2,3].map(i=>({id:'P'+i,name:'합성',type:'재진',total:1,addr:'경기도 합성시 합성로 '+i}));
 partial.c.geocoder.addressSearch=(q,cb)=>q.endsWith(' 1')?cb([],'ERROR'):setTimeout(()=>cb([result(100)],'OK'),40);
 const partialRun=partial.c.patientStartGeocoding(partial.c.patients,1);await sleep(15);
 assert(partial.c.patients.some(p=>p.geoState==='failed'));assert(partial.c.patients.some(p=>p.geoState==='pending'));assertions+=2;
 equal(partial.ui.patientAddressRetry.disabled,true,'Retry disabled until pending workers settle.');await partialRun;
 equal(partial.ui.patientAddressRetry.disabled,false,'Retry is available after failed batch completes.');
 // Superseded batch callbacks may settle, but cannot attach stale markers/finalize new import.
 const stale=context(),oldPatients=[{id:'OLD',name:'합성',type:'재진',total:1,addr:'경기도 합성시 합성로 1'}];let oldCallback;
 stale.c.patients=oldPatients;stale.c.geocoder.addressSearch=(q,cb)=>{oldCallback=cb;};const oldRun=stale.c.patientStartGeocoding(oldPatients,1);
 await sleep(1);stale.c.patientLoadToken=2;const newPatients=[{id:'NEW',name:'합성',type:'재진',total:1,addr:'경기도 합성시 합성로 2'}];stale.c.patients=newPatients;
 stale.c.geocoder.addressSearch=(q,cb)=>cb([result(100)],'OK');await stale.c.patientStartGeocoding(newPatients,2);oldCallback([result(900)],'OK');await oldRun;
 equal(oldPatients[0].marker,undefined);equal(newPatients[0].geoState,'resolved');equal(stale.log.finalized,1);
 // Independent eight-person / fourteen-record oracle reused from the forensic audit.
 const fixture=context();const addresses={A:'경기도 합성시 정상가로 1',B:'경기도 합성시 정상나로 2',C:'경기도 합성시 정상다로 3',D:'',E:'경기도 합성시 검색없음로 5',F:'경기도 합성시 오류로 6',G:'경기도 합성시 무응답로 7',H:'경기도 합성시 도로객체로 8'};
 const people=[['A',1,'Y'],['B',2,'Y'],['C',2,'Y'],['D',3,''],['E',2,'Y'],['F',1,'Y'],['G',2,'Y'],['H',1,'']];
 const rows=[['차트번호','주소','성명','신규','구분']];for(const [id,n,isNew] of people)for(let i=0;i<n;i++)rows.push([id,addresses[id],'합성'+id,i===0?isNew:'','']);
 fixture.c.parsePatients(rows);equal(fixture.c.patients.length,8);equal(fixture.c.patients.reduce((s,p)=>s+p.total,0),14);
 let blankCalls=0;fixture.c.geocoder.addressSearch=(q,cb)=>{
  if(!q)blankCalls++;
  const id=Object.keys(addresses).find(k=>addresses[k]===q);
  if(['A','B','C'].includes(id))cb([result({A:100,B:400,C:1500}[id])],'OK');
  else if(id==='H')cb([roadOnly],'OK');else if(id==='E')cb([],'ZERO_RESULT');else if(id==='F')cb([],'ERROR');
 };
 await fixture.c.patientStartGeocoding(fixture.c.patients,fixture.c.patientLoadToken);
 equal(blankCalls,0);equal(fixture.log.finalized,1,'No-callback case cannot prevent complete batch settlement.');
 const coverage=fixture.c.patientAddressCoverage(fixture.c.patients);
 deep([coverage.total,coverage.resolved,coverage.missing,coverage.pending,coverage.unresolved,coverage.failed],[8,4,1,0,1,2]);
 fixture.c.circles=[{circle:{getPosition:()=>new LatLng(35,127),getRadius:()=>1000}}];
 const inside=fixture.c.buildVisiblePatients();deep(Array.from(inside,p=>p.id),['A','B','H']);
 const note=fixture.c.patientAddressStatisticsNote();assert(note.includes('8명 기준'));assert(note.includes('좌표 확인 4'));assert(note.includes('좌표 미확인 4명 제외'));assertions+=3;
 equal(fixture.c.countInCircle(fixture.c.circles[0].circle),3,'Hidden individual markers do not affect count.');
 fixture.c.patients.forEach(p=>{if(p.marker)p.marker.onMap=true;});equal(fixture.c.countInCircle(fixture.c.circles[0].circle),3);
 fixture.c.toggleState.old=false;equal(fixture.c.countInCircle(fixture.c.circles[0].circle),2,'Clinical type filter changes count.');
 const selected=fixture.c.patients.filter(fixture.c.patientTypeSelected);equal(selected.length,6);
 assert(fixture.c.patientAddressStatisticsNote().includes('6명 기준'));assertions++;
 // Retry-only is permitted for failed/not-found/ambiguous, retains resolved and missing records.
 const retry=context();retry.c.patients=[{id:'R',name:'합성',type:'재진',total:1,addr:'경기도 합성시 합성로 1',geoState:'failed'},{id:'M',addr:'',geoState:'missing'},{id:'K',addr:'경기도 합성시 합성로 2',geoState:'resolved',latlng:new LatLng(35,127.1)}];
 let retries=0;retry.c.geocoder.addressSearch=(q,cb)=>{retries++;cb([result(100)],'OK');};await retry.c.patientStartGeocoding(retry.c.patients,1,true);
 equal(retries,1);deep(Array.from(retry.c.patients,p=>p.geoState),['resolved','missing','resolved']);
 const blank=context();blank.c.patients=[{id:'EMPTY',name:'합성',addr:'',type:'재진',total:1}];blank.c.geocoder.addressSearch=()=>{throw Error('Blank address must never call API.');};await blank.c.patientStartGeocoding(blank.c.patients,1);
 equal(blank.c.patients[0].geoState,'missing');equal(blank.log.finalized,1);equal(blank.log.fit,0);
 console.log('PASS latest inline geography helpers: '+assertions+' assertions; 3 ordinary concurrent requests, raw-address dedup, missing/notfound/error/timeout/retry/stale, ambiguity, road/legal/admin fallback, 8people/14records oracle, coverage-before-radius and marker-independent circle count.');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
