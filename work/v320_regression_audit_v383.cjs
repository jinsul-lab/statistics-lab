// Forensic comparison of pinned releases. Public synthetic address strings only.
// This reproduces client control flow; it does not assert actual Kakao success rates.
const fs=require('fs'),cp=require('child_process'),vm=require('vm'),assert=require('assert/strict');
const base=cp.execFileSync('git',['show','5316202:jinsulmap/jinsulmap.html'],{encoding:'utf8',maxBuffer:3e6});
const old=cp.execFileSync('git',['show','020b3b1:JINSUL_MAP_v3.2.0.html'],{encoding:'utf8',maxBuffer:3e6});
const begin=base.indexOf('// Address import and diagnostics.'),end=base.indexOf('function parsePatients(',begin);
const helper=base.slice(begin,end);assert(begin>=0&&end>begin);
const ui={},log={requests:[],finalized:0,clusterAdds:0};
const c=vm.createContext({Map,Set,Date,Number,String,Promise,window:{},patients:[],patientLoadToken:1,$:id=>ui[id]||(ui[id]={}),setTimeout:(f,ms)=>setTimeout(f,Math.max(1,ms*.01)),clearTimeout,toast(){},clusterer:{clear(){},addMarker(){log.clusterAdds++;}},geocoder:{},kakao:{maps:{LatLng:class{constructor(y,x){this.y=y;this.x=x}},Marker:class{constructor(a){this.pos=a.position}},MarkerImage:class{},Size:class{},InfoWindow:class{},event:{addListener(){}},services:{Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT'}}}},toggleState:{new_only:true,new_conv:true,bit_90:true,old:true},REP_COLOR:{재진:'#000'},patientStatsEscape:String,patientTypeLabel:String,map:{},applyFilter(){log.finalized++;}});
ui.btnFit={click(){}};vm.runInContext(helper,c);
const synthetic=[
 ['spaced-lot','서울특별시 합성구 합성동 123-4',true],
 ['unspaced-lot','서울특별시 합성구 합성동123-4',false],
 ['lot-beonji-suffix','서울특별시 합성구 합성동 123-4번지',false],
 ['parenthesized-lot','서울특별시 합성구 합성동(123-4)',false],
 ['all-unspaced-lot','서울특별시합성구합성동123-4',false],
 ['spaced-road','서울특별시 합성구 합성로 123',true],
 ['unspaced-road','서울특별시 합성구 합성로123',true],
 ['broad-dong-only','서울특별시 합성구 합성동',false]
];
for(const [name,addr,expected] of synthetic)assert.equal(c.patientAddressQueries(addr).length>0,expected,name);
const oldPatientBlock=old.slice(old.indexOf('patients.forEach((p, i)'),old.indexOf('function applyFilter()',old.indexOf('patients.forEach((p, i)')));
assert(oldPatientBlock.includes('geocoder.addressSearch(p.addr, (res, status) => {'));
assert(!oldPatientBlock.includes('analyze_type'));
assert(oldPatientBlock.includes('clusterer.addMarker(p.marker)'));
assert(!helper.slice(helper.indexOf('function patientAttachGeo('),helper.indexOf('async function patientStartGeocoding(')).includes('clusterer.addMarker('));
const response={x:'127.01',y:'37.5',address:{region_1depth_name:'합성시',region_2depth_name:'합성구',region_3depth_h_name:'합성동'}};
(async()=>{
 let exactCalls=0,similarCalls=0;c.geocoder.addressSearch=(q,cb,options)=>{if(options?.analyze_type==='EXACT'){exactCalls++;cb([],'ZERO_RESULT');}else{similarCalls++;cb([response],'OK');}};
 const result=await c.patientResolveAddress('서울특별시 합성구 합성로 123',1);
 assert.equal(result.state,'unresolved');assert.equal(exactCalls,1);assert.equal(similarCalls,0);
 let pendingCallback;c.geocoder.addressSearch=(q,cb)=>{log.requests.push(q);if(q.endsWith(' 1'))cb([response],'OK');else pendingCallback=cb;};
 c.patients=[1,2].map(i=>({id:'SYN'+i,name:'합성',type:'재진',total:1,addr:'서울특별시 합성구 합성로 '+i}));
 const running=c.patientStartGeocoding(c.patients,1);await new Promise(r=>setTimeout(r,12));
 assert(c.patients[0].marker);assert.equal(log.finalized,0);assert.equal(log.clusterAdds,0);assert(pendingCallback);
 pendingCallback([response],'OK');await running;assert.equal(log.finalized,1);
 console.log(JSON.stringify({source:'pinned3.2.0(020b3b1) versus3.8.2(5316202)',synthetic:true,liveApi:false,formatCases:synthetic.length,validNumberedFormatsRejectedBeforeApi:4,exactOnlyNoFallback:true,successfulMarkerNotAddedUntilWholeBatch:true}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
