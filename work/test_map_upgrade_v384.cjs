/* v3.8.4 map regression tests. Synthetic callbacks only; no network or patient data. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
const slice=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);assert(start>=0&&end>start,`source boundary ${a}`);return html.slice(start,end);};
let checks=0;const check=(value,expected,message)=>{assert.deepEqual(JSON.parse(JSON.stringify(value)),expected,message);checks++;};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function hospitalFixture({timeout=8000}={}){
  const nodes=new Map(),calls=[],messages=[],markers=[];
  const node=()=>({style:{},children:[],textContent:'',value:'',disabled:false,attributes:{},setAttribute(name,value){this.attributes[name]=value;},click(){this.onclick?.();},append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);},replaceChildren(...items){this.children=items;}});
  const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  const ctx={$,setTimeout:(f,ms)=>setTimeout(f,ms===8000?timeout:ms),clearTimeout,toast:m=>messages.push(m),console,document:{createElement:node},MY_HOSPITAL_IMG:'test',myHospitalMarker:null,map:{panTo(){}},
    places:{keywordSearch:(q,cb)=>calls.push({type:'place',q,cb})},geocoder:{addressSearch:(q,cb)=>calls.push({type:'address',q,cb})},
    kakao:{maps:{services:{Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT'}},LatLng:class{constructor(y,x){this.x=x;this.y=y;}},Size:class{},MarkerImage:class{},Marker:class{constructor(props){Object.assign(this,props);markers.push(this);}setMap(map){this.map=map;}}}}};
  vm.createContext(ctx);vm.runInContext(slice('let hospitalSearchRequestToken=','\nconst searchBtns ='),ctx);
  return {ctx,$,calls,messages,markers};
}
function bannerFixture(){
  const calls=[],statuses=[],inspectors=[],listeners=[],removed=[],cleared=[],created=[];
  let active=true;const map={getLevel:()=>4};
  class LatLng{constructor(lat,lng){this.lat=lat;this.lng=lng;}getLat(){return this.lat;}getLng(){return this.lng;}}
  const bounds={id:'old',contain:()=>true,getSouthWest:()=>new LatLng(37,126),getNorthEast:()=>new LatLng(38,127)};
  map.getBounds=()=>bounds;
  const ctx={Math,console:{log(){}},setTimeout,clearTimeout:t=>{cleared.push(t);clearTimeout(t);},window:{map},map,
    isBannerActive:()=>active,loadBannerPoints:()=>new Promise(resolve=>calls.push(resolve)),targetMarkers:{banner:[]},targetOverlays:{banner:[]},searchedData:[],getBannerMax:()=>2000,
    renderBannerInspector:points=>inspectors.push(points.map(p=>p.id)),showBannerDetail(){},bannerResultStatus(){},bannerStatus:s=>statuses.push(s),toast(){},bannerDataInfo:{source:'공식 API',error:''},
    document:{getElementById:()=>({clientWidth:800,clientHeight:600,scrollIntoView(){}})},
    kakao:{maps:{LatLng,Size:class{},Point:class{},MarkerImage:class{},Marker:class{constructor(props){Object.assign(this,props);created.push(this);}setMap(map){this.map=map;}},event:{addListener:(...a)=>listeners.push(a),removeListener:(...a)=>removed.push(a)}}}};
  vm.createContext(ctx);vm.runInContext(slice('function groupBannerPoints(','\nlet bannerVisiblePoints=')+slice('  const sampleGrid =','  let __bannerIdleHandler =')+slice('  let __bannerIdleHandler =','  // 버튼 클릭 로직: banner는 레이어처럼 자동 갱신'),ctx);
  vm.runInContext('this.start=startBannerAuto;this.stop=stopBannerAuto;',ctx);
  return {ctx,calls,statuses,inspectors,listeners,removed,cleared,created,bounds,setActive:value=>active=value};
}
const publicPlace={place_name:'공개주소 테스트',address_name:'서울특별시 중구 세종대로 110',x:'126.978',y:'37.566'};
const publicBanner={id:'fixture',title:'공개 게시대 테스트',addr:'테스트 주소',lat:37.5,lng:126.5,date:'2026-01-22'};
(async()=>{
  let f=hospitalFixture();f.$('myHospitalInput').value='공개주소';let run=f.$('btnSetHospital').onclick();
  check(f.$('btnSetHospital').disabled,true,'search visibly enters busy state');
  f.calls[0].cb([publicPlace],'OK');f.calls[1].cb([{address_name:publicPlace.address_name,x:'126.978',y:'37.566',address:null,road_address:null},null,{address_name:'invalid',x:'',y:''}],'OK');await run;
  check(f.$('hospitalResults').children.length,2,'address-null response remains usable and invalid coordinates excluded');
  check(f.$('hospitalListModal').style.display,'flex','valid result list opens');
  check(f.$('btnSetHospital').disabled,false,'search restores button');
  check(f.$('btnSetHospital').textContent,'설정','search restores button label');
  f.$('hospitalResults').children[0].onclick();check(f.markers.length,1,'result selection sets hospital marker');
  check(f.$('hospitalListModal').style.display,'none','selection closes search modal');
  const keyboardResult=f.$('hospitalResults').children[0];let prevented=0;
  check(keyboardResult.tabIndex,0,'hospital result is keyboard focusable');
  check(keyboardResult.attributes.role,'button','hospital result announces its action');
  check(keyboardResult.attributes['aria-label'],publicPlace.place_name+' · '+publicPlace.address_name+' 선택','accessible name contains place and address');
  f.$('hospitalListModal').style.display='flex';keyboardResult.onkeydown({key:'Enter',preventDefault(){prevented++;}});
  check(f.markers.length,2,'Enter selects the focused hospital');check(f.$('hospitalListModal').style.display,'none','Enter closes result modal');
  f.$('hospitalListModal').style.display='flex';keyboardResult.onkeydown({key:' ',preventDefault(){prevented++;}});
  check(f.markers.length,3,'Space selects the focused hospital');check(prevented,2,'activation prevents default page scrolling');
  keyboardResult.onkeydown({key:' ',repeat:true,preventDefault(){prevented++;}});keyboardResult.onkeydown({key:'ArrowDown',preventDefault(){prevented++;}});
  check(f.markers.length,3,'held activation and navigation keys cannot repeat selection');check(prevented,3,'ordinary navigation key remains unblocked');

  f=hospitalFixture();f.$('myHospitalInput').value='이전 요청';const old=f.$('btnSetHospital').onclick();f.$('btnClearHospital').onclick();f.$('myHospitalInput').value='새 요청';run=f.$('btnSetHospital').onclick();
  f.calls[0].cb([publicPlace],'OK');f.calls[1].cb([],'ZERO_RESULT');await old;
  check(f.$('btnSetHospital').disabled,true,'old completion cannot enable current search');
  check(f.$('hospitalListModal').style.display,'none','cleared result cannot reopen modal');
  f.calls[2].cb([{...publicPlace,place_name:'새 결과'}],'OK');f.calls[3].cb([],'ZERO_RESULT');await run;
  check(f.$('hospitalResults').children[0].children[0].textContent,'새 결과','latest search wins');

  f=hospitalFixture({timeout:8});f.$('myHospitalInput').value='응답 지연';run=f.$('btnSetHospital').onclick();f.calls[0].cb([publicPlace],'OK');await run;
  check(f.$('hospitalResults').children.length,1,'one stalled source still shows verified source');
  check(f.messages.some(m=>m.includes('일부 검색 응답')),true,'partial results labelled');
  f.calls[1].cb([{...publicPlace,place_name:'늦은 결과'}],'OK');await tick();check(f.$('hospitalResults').children.length,1,'callback after timeout cannot append stale result');
  f=hospitalFixture({timeout:8});f.$('myHospitalInput').value='연결 실패';await f.$('btnSetHospital').onclick();
  check(f.messages.some(m=>m.includes('응답을 받지 못했습니다')),true,'connection failure differs from zero results');
  check(f.$('btnSetHospital').disabled,false,'both-source timeout restores button');
  f=hospitalFixture();f.$('myHospitalInput').value='결과 없음';run=f.$('btnSetHospital').onclick();f.calls.forEach(c=>c.cb([],'ZERO_RESULT'));await run;
  check(f.messages[0].startsWith('검색 결과가 없습니다'),true,'genuine zero is explicit');
  f.ctx.showHospitalList([{...publicPlace,place_name:'<img src=x onerror=alert(1)>'},{...publicPlace,y:'37.567'},{...publicPlace}]);
  check(f.$('hospitalResults').children.length,3,'different latitude is not incorrectly deduplicated');
  check(f.$('hospitalResults').children[0].children[0].textContent,'<img src=x onerror=alert(1)>','provider text stays text, not HTML');

  let b=bannerFixture();run=b.ctx.drawBannerLayerForBounds(b.bounds,()=>true);b.setActive(false);b.calls[0]([publicBanner]);await run;
  check(b.created.length,0,'OFF rejects a pending scan even when external callback says current');
  b.ctx.start();check(b.listeners.length,0,'late ON handler cannot attach after OFF');
  b=bannerFixture();const first=b.ctx.drawBannerLayerForBounds(b.bounds);const second=b.ctx.drawBannerLayerForBounds({...b.bounds,id:'new'});b.calls[1]([{...publicBanner,id:'new'}]);await second;b.calls[0]([{...publicBanner,id:'old'}]);await first;
  check(b.ctx.searchedData.map(p=>p.id),['new'],'old bounds cannot replace newer markers');
  check(b.inspectors.at(-1),['new'],'old bounds cannot replace inspector');
  check(b.ctx.searchedData[0].sourceStatus,'공식 API 조회 완료','banner record retains API status');
  b=bannerFixture();run=b.ctx.drawBannerLayerForBounds(b.bounds);b.ctx.stop();b.calls[0]([publicBanner]);await run;
  check(b.created.length,0,'reset invalidates pending banner draw');
  check(b.cleared.length,1,'stop clears debounce even without attached idle listener');
  b=bannerFixture();b.ctx.start();check(b.listeners.length,1,'active layer attaches one idle handler');b.ctx.start();check(b.listeners.length,1,'repeated start does not duplicate idle handler');b.ctx.stop();check(b.removed.length,1,'stop detaches idle handler');
  b=bannerFixture();b.ctx.bannerDataInfo={source:'보관 CSV (파일명 2026-01-22)',error:'API HTTP 504'};run=b.ctx.drawBannerLayerForBounds(b.bounds);b.calls[0]([publicBanner]);await run;
  check(b.ctx.searchedData[0].sourceStatus,'API 미연결 · 보관자료 사용','fallback record does not masquerade as live API');
  run=b.ctx.drawBannerLayerForBounds(b.bounds);b.ctx.bannerDataInfo.error='API·보관 CSV 모두 조회 실패';b.calls[1](null);await run;
  check(b.ctx.searchedData.length,0,'failed refresh clears stale map records');check(b.inspectors.at(-1),[],'failed refresh clears stale inspector');check(b.statuses.at(-1).includes('모두 조회 실패'),true,'failed refresh status is explicit');

  const c=vm.createContext({});vm.runInContext(slice('function facilitySourceColumns(','function renderFacilitySources('),c);
  check(c.facilitySourceColumns({type:'banner',source:'공식 API',dataDate:'2026-01-22',sourceStatus:'공식 API 조회 완료'}),{'출처':'공식 API','자료 기준':'2026-01-22','조회 상태':'공식 API 조회 완료'},'facility export retains banner provenance');
  check(c.facilitySourceColumns({type:'banner'}),{'출처':'자료 미제공','자료 기준':'미제공','조회 상태':'미확인'},'old banner record is not invented as current API');
  check(c.facilitySourceColumns({type:'welfare'}),{},'unrelated source columns unchanged');
  assert.match(html,/\$\('btnResetSearch'\)\.onclick\s*=\s*\(\)\s*=>\s*\{\s*stopBannerAuto\(\)/);checks++;
  console.log(JSON.stringify({ok:true,checks,scope:'hospital search + banner lifecycle/provenance',liveApi:false}));
})().catch(error=>{console.error(error);process.exitCode=1;});
