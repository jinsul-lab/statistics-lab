// Actual inline helpers, synthetic records only. No external API or private files.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
function part(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i,a);return html.slice(i,j);}
const helper=part('// Address import and diagnostics.','function parsePatients(');
const geography=part('function patientAnalysisCircles(','function pct(');
const fit=html.split(/\r?\n/).find(x=>x.startsWith("$('btnFit').onclick ="));
const reset=html.split(/\r?\n/).find(x=>x.startsWith("$('btnClear').onclick ="));
const checks=[];async function check(name,fn){try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message});}}
class LatLng{constructor(y,x){this.y=y;this.x=x;}getLat(){return this.y;}getLng(){return this.x;}}
class Bounds{constructor(){this.points=[];}extend(p){this.points.push(p);}}
class Polyline{setPath(path){this.path=path;}getLength(){return Math.hypot(this.path[1].x-this.path[0].x,this.path[1].y-this.path[0].y)*1000;}}
function make(){
  const ui={},timers=new Map(),log={stats:0,bounds:[],messages:[],clears:0};let seq=0;
  const c=vm.createContext({console,Map,Set,Date,Promise,Number,String,window:{},patients:[],patientLoadToken:7,patientFileReadToken:2,geocoder:{},REP_COLOR:{},patientStatsEscape:String,
    $:id=>ui[id]||(ui[id]={style:{display:'none'},innerText:'',textContent:'',click(){this.onclick?.();},replaceChildren(){this.cleared=true;}}),
    setTimeout:(f,ms)=>{timers.set(++seq,{f,ms});return seq;},clearTimeout:id=>timers.delete(id),
    toggleState:{new_only:true,new_conv:true,bit_90:true,old:true},drawingManager:{getData:()=>({circle:[]})},circles:[],
    kakao:{maps:{LatLng,LatLngBounds:Bounds,Polyline,services:{Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT'}}}},
    map:{setBounds:b=>log.bounds.push(b)},clusterer:{clear(){log.clears++;},addMarkers(){}},toast:m=>log.messages.push(m),applyFilter(){},
  });
  vm.runInContext(helper+'\n'+geography+'\n'+fit+'\n'+reset,c);
  ui.btnStats={click(){log.stats++;}};
  const flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(t=>t.f());};
  return {c,ui,log,timers,flush};
}
function person(id,x,total=1,type='재진'){return {id,addr:'합성 주소',type,total,geoState:x===null?'pending':'resolved',latlng:x===null?null:new LatLng(35,x),dong:x===null?'':'합성동'};}
const circle={circle:{getPosition:()=>new LatLng(35,127),getRadius:()=>100}};
(async()=>{
  await check('filtered-counts-refresh-before-address-batch-completion',()=>{const f=make();f.c.circles=[circle];f.c.patients=[person('S1',127.05,3),person('S2',null,9),person('S3',127.3,4)];f.c.patientRefreshProgress(7);assert.equal(f.ui.statTotalUsers,undefined);f.flush();assert.equal(f.ui.statTotalUsers.innerText,'1');assert.equal(f.ui.statTotalVisits.innerText,'3');assert.equal(f.c.patients[1].geoState,'pending');});
  await check('radius-with-no-resolved-coordinates-starts-at-zero',()=>{const f=make();f.c.circles=[circle];f.c.patients=[person('S1',null,9)];f.c.patientUpdateVisibleCounts();assert.equal(f.ui.statTotalUsers.innerText,'0');assert.equal(f.ui.statTotalVisits.innerText,'0');});
  await check('no-radius-keeps-unlocated-patients-in-overall-total',()=>{const f=make();f.c.patients=[person('S1',127.05,3),person('S2',null,9)];f.c.patientUpdateVisibleCounts();assert.equal(f.ui.statTotalUsers.innerText,'2');assert.equal(f.ui.statTotalVisits.innerText,'12');});
  await check('current-type-selection-applies-at-refresh-time',()=>{const f=make();f.c.patients=[person('S1',127.05,3),person('S2',127.06,9,'신환 (1회만)')];f.c.patientRefreshProgress(7);f.c.toggleState.old=false;f.flush();assert.equal(f.ui.statTotalUsers.innerText,'1');assert.equal(f.ui.statTotalVisits.innerText,'9');});
  await check('burst-of-address-results-schedules-only-one-render',()=>{const f=make();for(let i=0;i<40;i++)f.c.patientRefreshProgress(7);assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].ms,750);f.ui.statsModal={style:{display:'flex'}};f.flush();assert.equal(f.log.stats,1);});
  await check('closed-statistics-window-is-not-opened-by-progress',()=>{const f=make();f.c.patientRefreshProgress(7);f.flush();assert.equal(f.log.stats,0);});
  await check('superseded-progress-cannot-reopen-statistics-or-change-counts',()=>{const f=make();f.ui.statsModal={style:{display:'flex'}};f.c.patientRefreshProgress(7);f.c.patientLoadToken=8;f.flush();assert.equal(f.log.stats,0);assert.equal(f.ui.statTotalUsers,undefined);});
  await check('cancelled-refresh-leaves-no-pending-callback',()=>{const f=make();f.c.patientRefreshProgress(7);f.c.patientCancelProgressRefresh();assert.equal(f.timers.size,0);assert.equal(f.c.window.patientProgressRefresh,null);});
  await check('new-batch-replaces-old-pending-refresh',()=>{const f=make();f.c.patientRefreshProgress(7);f.c.patientLoadToken=8;f.c.patientRefreshProgress(8);assert.equal(f.timers.size,1);assert.equal(f.c.window.patientProgressRefresh.token,8);f.flush();assert.equal(f.ui.statTotalUsers.innerText,'0');});
  await check('fit-uses-only-current-radius-and-type-with-resolved-coordinates',()=>{const f=make();f.c.circles=[circle];f.c.toggleState.new_only=false;const inside=person('S1',127.05);f.c.patients=[inside,person('S2',127.4),person('S3',127.06,1,'신환 (1회만)'),person('S4',null)];f.ui.btnFit.click();assert.equal(f.log.bounds.length,1);assert.deepEqual(f.log.bounds[0].points,[inside.latlng]);});
  await check('fit-works-with-geographic-coordinate-before-marker-created',()=>{const f=make();const p=person('S1',127.05);assert.equal(p.marker,undefined);f.c.patients=[p];f.ui.btnFit.click();assert.deepEqual(f.log.bounds[0].points,[p.latlng]);});
  await check('empty-filter-does-not-send-empty-bounds-to-sdk',()=>{const f=make();f.c.patients=[person('S1',null)];f.ui.btnFit.click();assert.equal(f.log.bounds.length,0);assert.equal(f.log.messages.length,1);});
  await check('reset-closes-statistics-and-clears-data-and-queued-refresh',()=>{const f=make();f.ui.statsModal={style:{display:'flex'}};f.c.patients=[person('S1',127.05,8)];f.c.window.__lastStatsVisible=f.c.patients;f.c.window.__lastStatsDongRows=[{total:1}];f.c.patientRefreshProgress(7);f.ui.btnClear.click();assert.equal(f.c.patientLoadToken,8);assert.equal(f.c.patientFileReadToken,3);assert.equal(f.c.patients.length,0);assert.equal(f.c.window.__lastStatsVisible.length,0);assert.equal(f.c.window.__lastStatsDongRows.length,0);assert.equal(f.ui.statsModal.style.display,'none');assert.equal(f.ui.statTotalUsers.innerText,0);assert.equal(f.timers.size,0);assert.equal(f.log.clears,1);});
  await check('stale-start-does-not-mutate-new-upload-address-states',async()=>{const f=make();const p=person('NEW',127.05,4);f.c.patients=[p];await f.c.patientStartGeocoding(f.c.patients,6);assert.equal(p.geoState,'resolved');assert.equal(f.ui.statTotalUsers,undefined);assert.equal(f.timers.size,0);});
  const failed=checks.filter(x=>!x.ok);console.log(JSON.stringify({synthetic:true,liveApi:false,source:'actual inline HTML',passed:checks.length-failed.length,failed:failed.length,failures:failed},null,2));if(failed.length)process.exitCode=1;
})();
