/* Pre-fix v3.8.1 forensic reproduction. Synthetic records only; no network calls.
   Reads pinned tracked HEAD instead of any concurrently edited worktree HTML. */
const assert=require('assert/strict'),vm=require('vm'),cp=require('child_process');
const h=cp.execFileSync('git',['show','a5dee1f:jinsulmap/jinsulmap.html'],{encoding:'utf8',maxBuffer:6e6});
assert(h.includes('v3.8.1'),'Run against v3.8.1 to reproduce the audited baseline.');
function block(a,b){const s=h.indexOf('function '+a+'('),e=h.indexOf('function '+b+'(',s);assert(s>=0&&e>s);return h.slice(s,e);}
function fn(a){const s=h.indexOf('function '+a+'(');assert(s>=0);return h.slice(s,h.indexOf('\n}',s)+2);}
const ui={},timers=[],callbacks=[],messages=[];
let fit=0,finalized=0;
class LatLng{constructor(y,x){this.y=Number(y);this.x=Number(x);}getLat(){return this.y;}getLng(){return this.x;}}
class Polyline{setPath(p){this.p=p;}getLength(){return Math.abs(this.p[1].x-this.p[0].x);}}
class Marker{constructor(a){this.pos=a.position;this.onMap=false;}getMap(){return this.onMap?{}:null;}getPosition(){return this.pos;}}
const c=vm.createContext({console,Map,Date,window:{},patients:[],patientLoadToken:0,$:id=>ui[id]||(ui[id]={}),toast:m=>messages.push(m),setTimeout:f=>timers.push(f),clusterer:{clear(){},addMarker(){}},geocoder:{addressSearch:(q,cb)=>callbacks.push({q,cb})},kakao:{maps:{LatLng,Polyline,Marker,MarkerImage:class{},Size:class{},InfoWindow:class{},services:{Status:{OK:'OK'}},event:{addListener(){}}}},toggleState:{all:true,new_only:true,new_conv:true,bit_90:true,old:true},REP_COLOR:{},patientStatsEscape:x=>String(x),patientTypeLabel:x=>x,applyFilter:()=>finalized++,drawingManager:{getData:()=>({circle:[]})},circles:[]});
ui.btnFit={click:()=>fit++};
vm.runInContext(fn('calcAgeFromRow')+fn('patientNewFlag')+block('parsePatients','applyFilter')+block('patientAnalysisCircles','buildVisiblePatients')+block('buildVisiblePatients','pct'),c);
// The later block also binds btnStats; it is not invoked. No real patient addresses.
const people=[['A','VALID_A',1,'Y'],['B','VALID_B',2,'Y'],['C','VALID_C',2,'Y'],['D','',3,''],['E','ZERO_RESULT',2,'Y'],['F','ERROR',1,'Y'],['G','NO_CALLBACK',2,'Y'],['H','ROAD_ONLY',1,'']];
const rows=[['차트번호','주소','성명','신규','구분']];
for(const [id,addr,n,isNew] of people)for(let i=0;i<n;i++)rows.push([id,addr,'합성'+id,i===0?isNew:'','']);
c.parsePatients(rows);timers.splice(0).forEach(f=>f());
assert.equal(c.patients.length,8);assert.equal(c.patients.reduce((s,p)=>s+p.total,0),14);
assert.equal(callbacks.length,8);assert(callbacks.some(x=>x.q===''),'Baseline sends an empty address to API.');
const distances={VALID_A:100,VALID_B:400,VALID_C:1500,ROAD_ONLY:200};
for(const {q,cb} of callbacks){
  if(q==='NO_CALLBACK')continue;
  if(Object.hasOwn(distances,q)){
    const region={region_1depth_name:'합성시',region_2depth_name:'합성구',region_3depth_h_name:'합성동'};
    cb([{x:distances[q],y:0,...(q==='ROAD_ONLY'?{road_address:region}:{address:region})}],'OK');
  }else cb([],q==='ERROR'?'ERROR':'ZERO_RESULT');
}
assert.equal(finalized,0,'One absent callback prevents loading completion permanently.');
assert.equal(fit,0);
assert.equal(c.patients.find(p=>p.id==='H').dong,'미상','Road-only successful result loses regional fields.');
assert(c.patients.find(p=>p.id==='H').latlng);
const regionUnknown=c.patients.filter(p=>!p.dong||p.dong==='미상').length;
assert.equal(regionUnknown,5,'Source blank, not found, error, pending and road-only merge in one unknown bucket.');
const full=c.buildVisiblePatients();assert.equal(full.length,8);
c.circles=[{circle:{getPosition:()=>new LatLng(0,0),getRadius:()=>1000}}];
const inside=c.buildVisiblePatients();assert.deepEqual(Array.from(inside,p=>p.id),['A','B','H']);
assert.equal(inside.filter(p=>!p.latlng).length,0,'Visible-only coverage falsely reports no unknown-coordinate patients.');
const independentlyKnown=c.patients.filter(p=>p.latlng);assert.equal(independentlyKnown.length,4);
assert.equal(independentlyKnown.length/full.length*100,50);
assert.equal(inside.length/independentlyKnown.length*100,75);
assert.equal(inside.length/full.length*100,37.5);
vm.runInContext(fn('countInCircle'),c);
const circle=c.circles[0].circle;
assert.equal(c.countInCircle(circle),0,'Rendering membership controls baseline radius count.');
c.patients.forEach(p=>{if(p.marker)p.marker.onMap=true;});
assert.equal(c.countInCircle(circle),3,'The same coordinates count3 after only marker rendering changes.');
const ordered=independentlyKnown.map(p=>p.latlng.x).sort((a,b)=>a-b);
const independentMean=ordered.reduce((s,x)=>s+x,0)/ordered.length;
const independentMedian=(ordered[1]+ordered[2])/2;
assert.equal(independentMean,550);assert.equal(independentMedian,300);
console.log('REPRODUCED v3.8.1 defects: conflated missing/not-found/error/pending/road-only region; stuck completion; visible-only unknown=0; rendering-dependent circle count.');
console.log('Independent synthetic oracle:8 people/14 records;locatable4/8=50%;radius inside3;outside1;unlocatable4;inside share3/4=75% of known vs3/8=37.5% of upload;mean550m,median300m.');
