/* Synthetic Kakao keyword callbacks and real release helper logic; no live API. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.resolve(__dirname, '../jinsulmap/jinsulmap.html'), 'utf8');
const start = html.indexOf("const SENIOR_DIRECT_KEYWORDS =");
const end = start < 0 ? -1 : html.indexOf('\nfunction dedupPlacesByDistance', start);
assert.ok(start >= 0 && end > start, 'facility helpers must exist in the released single HTML');
const source = html.slice(start, end);
let callback;
let calls = 0;
const ctx = {
  setTimeout, clearTimeout,
  kakao:{maps:{services:{Status:{OK:'OK', ZERO_RESULT:'ZERO_RESULT', ERROR:'ERROR'}}}},
  places:{keywordSearch(keyword, cb, options){ calls++; callback = cb; }}
};
vm.createContext(ctx);
vm.runInContext(source + '\nthis.helpers={seniorFacilityKind,seniorPlaceIdentity,seniorComplexAddressKey,selectSeniorSearchResults,keywordSearchAllEnhanced,SENIOR_DIRECT_KEYWORDS,SENIOR_AUXILIARY_KEYWORDS};', ctx);
const h = ctx.helpers;
let checks = 0;
function check(value, expected, message){ assert.deepEqual(JSON.parse(JSON.stringify(value)), expected, message); checks++; }
const p = (id, name, address='경기도 시흥시 정왕대로 74', more={}) => ({id,place_name:name,road_address_name:address,address_name:'경기도 시흥시 정왕동 1',x:'126.7',y:'37.3',...more});
const handlerStart=html.indexOf('let facilitySearchRequestToken=');
const handlerEnd=html.indexOf("const uploadBox = $('uploadBox');",handlerStart);
assert.ok(handlerStart>=0 && handlerEnd>handlerStart,'actual facility scan/route/export handlers located');
const handlerSource=html.slice(handlerStart,handlerEnd);
function makeApp(reply, options={}){
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{checked:false,disabled:false,innerText:'',innerHTML:'',value:'',style:{}});return elements.get(id);};
  const calls=[],exports=[],toasts=[],allMarkers=[],allOverlays=[];
  const buttons=(options.targets||['senior']).map(target=>({dataset:{target},active:true,classList:{remove(){buttons.find(b=>b.dataset.target===target).active=false;}}}));
  class LatLng {constructor(y,x){this.y=Number(y);this.x=Number(x);}getLat(){return this.y;}getLng(){return this.x;}}
  class Drawable {constructor(props={}){Object.assign(this,props);this.props=props;}setMap(value){this.map=value;}}
  class Marker extends Drawable {constructor(props){super(props);allMarkers.push(this);}getPosition(){return this.position;}}
  class Overlay extends Drawable {constructor(props){super(props);allOverlays.push(this);}}
  class Polyline extends Drawable {getLength(){return 100;}}
  class Bounds {extend(){}}
  const sandbox={
    $,console,Date,encodeURIComponent,
    setTimeout:(fn,ms)=>setTimeout(fn,ms===700?1:ms),clearTimeout,
    document:{querySelectorAll(){return buttons.filter(b=>b.active);}},
    map:{getBounds:()=>({}),setBounds(){}},
    searchBtns:buttons,
    targetMarkers:{senior:[],welfare:[],ortho:[],banner:[],recommend:[]},
    targetOverlays:{senior:[],welfare:[],ortho:[],banner:[],recommend:[]},
    routeLines:[],routeMarkers:[],searchedData:[],lastRoute:[],
    SVG_MARKERS:{senior:'senior-icon',welfare:'welfare-icon',ortho:'ortho-icon',banner:'banner-icon'},
    scanEscapeHTML:value=>String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
    toast:message=>toasts.push(message),
    myHospitalMarker:{getPosition:()=>new LatLng(37.3,126.7)},
    drawBannerLayerForBounds:options.drawBanner||(()=>Promise.resolve()),
    startBannerAuto:()=>{sandbox.bannerStarts++;},bannerStarts:0,
    clearBannerLayerOnly(){},stopBannerAuto(){},
    places:{keywordSearch(keyword,cb,query){calls.push(keyword);reply(keyword,cb,query);}},
    kakao:{maps:{LatLng,LatLngBounds:Bounds,Marker,CustomOverlay:Overlay,Polyline,
      Size:class{constructor(w,h){this.width=w;this.height=h;}},
      MarkerImage:class{constructor(src,size){this.src=src;this.size=size;}},
      services:{Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT',ERROR:'ERROR'}},
      event:{addListener(){},removeListener(){}}
    }},
    XLSX:{utils:{book_new:()=>({}),json_to_sheet:rows=>{exports.push(rows);return rows;},book_append_sheet(){}},writeFile(){}},
  };
  function $(id){return element(id);}
  vm.createContext(sandbox);
  vm.runInContext(source+'\n'+handlerSource,sandbox);
  return {sandbox,element,calls,exports,toasts,allMarkers,allOverlays,buttons};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
(async () => {
  check([...h.SENIOR_DIRECT_KEYWORDS], ['경로당','노인정','마을회관','무더위쉼터'], '노인정 included');
  for(const name of ['한일아파트 경로당','정왕 노인정','마을회관','무더위 쉼터']) check(h.seniorFacilityKind(p('x',name)), 'direct');
  check(h.seniorFacilityKind(p('x','한일아파트 경비실')), 'auxiliary');
  check(h.seniorFacilityKind(p('x','경로당식당','',{category_name:'음식점 > 한식'})), 'unclassified', 'unrelated businesses with the keyword in their name are not facilities');
  check(h.seniorFacilityKind(p('x','아파트입구',{},{category_name:'서비스 > 경비실'})), 'auxiliary');
  check(h.seniorFacilityKind(p('x','한일아파트')), 'unclassified');
  const d1=p('d1','한일아파트 경로당');
  const d2=p('d2','한일아파트 제2경로당');
  const sameNameOtherCity=p('d3','한일아파트 경로당','서울특별시 성동구 왕십리로 1');
  const guard=p('g1','한일아파트 경비실');
  const mgmt=p('m1','한일아파트 관리사무소');
  const distant=p('g2','한일아파트 경비실','서울특별시 강남구 강남대로 1');
  let result=h.selectSeniorSearchResults([d1,d1,d2,sameNameOtherCity,guard,distant]);
  check(result.directCount,3,'distinct actual sites kept; same ID removed');
  check(result.auxiliaryCount,0,'auxiliary opt-in is off by default');
  result=h.selectSeniorSearchResults([d1,d2,sameNameOtherCity,guard,distant],true);
  check(result.directCount,3,'multiple 경로당 in one complex remain');
  check(result.auxiliaryCount,1,'different-city same-named complex retained as explicit auxiliary');
  check(result.places.find(x=>x.id==='g2').seniorKind,'auxiliary');
  check(result.places.find(x=>x.id==='g2').seniorLabel,'관리·경비 문의처 · 노인시설 여부 미확인');
  result=h.selectSeniorSearchResults([guard,mgmt],true);
  check(result.places.map(x=>x.id),['m1'],'same address and complex prefer management over guards');
  const unknownAddress=p('g3','한일아파트 경비실','');
  result=h.selectSeniorSearchResults([d1,unknownAddress],true);
  check(result.auxiliaryCount,1,'no reliable road address must not suppress');
  result=h.selectSeniorSearchResults([d1,p('g4','관리사무소')],true);
  check(result.auxiliaryCount,1,'address without matching complex name must not suppress');
  check(h.seniorComplexAddressKey(p('a','한일아파트1단지 경로당'))===h.seniorComplexAddressKey(p('b','한일아파트2단지 경비실')),false,'different numbered complexes remain separate');
  check(h.seniorPlaceIdentity(p('', '동일 이름', '주소1'))===h.seniorPlaceIdentity(p('', '동일 이름', '주소2')),false,'missing IDs do not merge across addresses');
  result=h.selectSeniorSearchResults([p('z','검색어와 무관한 음식점')]);
  check(result.places.length,0,'unclassified keyword result excluded');
  check(result.excludedCount,1);
  let promise=h.keywordSearchAllEnhanced('노인정',{});
  callback([], 'ZERO_RESULT');
  let rows=await promise;
  check(rows.searchMeta.status,'ZERO_RESULT');
  check(rows.searchMeta.incomplete,false);
  promise=h.keywordSearchAllEnhanced('경로당',{});
  callback([], 'ERROR');
  rows=await promise;
  check(rows.searchMeta.status,'ERROR');
  check(rows.searchFailed,true);
  check(rows.searchMeta.incomplete,true,'request failure is not zero facilities');
  promise=h.keywordSearchAllEnhanced('경로당',{});
  callback([d1],'OK',{totalCount:2,hasNextPage:true,nextPage(){ callback([d2],'OK',{totalCount:2,hasNextPage:false}); }});
  rows=await promise;
  check(rows.length,2,'all pages collected');
  check(rows.searchMeta.incomplete,false);
  promise=h.keywordSearchAllEnhanced('경로당',{});
  callback([d1],'OK',{totalCount:10,hasNextPage:false});
  rows=await promise;
  check(rows.searchMeta.truncated,true,'result cap is disclosed');
  check(rows.truncated,true);
  promise=h.keywordSearchAllEnhanced('경로당',{});
  callback([d1],'OK',{totalCount:2,hasNextPage:true,nextPage(){ callback([], 'ERROR'); }});
  rows=await promise;
  check(rows.length,1,'partial useful result preserved');
  check(rows.searchMeta.status,'PARTIAL_ERROR');
  promise=h.keywordSearchAllEnhanced('경로당',{}, {timeoutMs:5});
  const lateCallback=callback;
  rows=await promise;
  check(rows.searchMeta.status,'TIMEOUT');
  lateCallback([d1],'OK',{hasNextPage:false});
  check(rows.length,0,'late response cannot mutate completed search');

  // Exercise real UI handlers using synthetic SDK callbacks, DOM and export sinks.
  const escapedPlace=p('html','<b>검증</b> 경로당');
  const replySuccess=(keyword,cb)=>{
    const data=keyword==='경로당'?[d1,d2,escapedPlace]:keyword==='노인정'?[d1]:keyword==='경비실'?[guard,distant]:[];
    cb(data,data.length?'OK':'ZERO_RESULT',{totalCount:data.length,hasNextPage:false});
  };
  let app=makeApp(replySuccess);
  app.sandbox.lastRoute=[{name:'previous route'}];
  app.element('tblRoute').innerHTML='previous route';
  await app.element('btnSearch').onclick();
  check(app.calls,['경로당','노인정','마을회관','무더위쉼터'],'default scan excludes auxiliary API queries');
  check(app.sandbox.searchedData.length,3,'direct facilities retained, duplicate IDs removed');
  check(app.sandbox.searchedData.every(row=>row.seniorKind==='direct'),true);
  check(app.element('btnSearch').disabled,false,'scan button restored after success');
  check(app.sandbox.lastRoute.length,0,'rescan invalidates previous route export data');
  check(app.element('tblRoute').innerHTML,'','rescan clears old route table');
  check(app.allOverlays.some(overlay=>overlay.content.includes('&lt;b&gt;검증&lt;/b&gt;')),true,'map labels escape place markup');
  check(app.element('searchStatus').innerText.includes('조회 실패'),false,'normal zero-result keyword is not a failure');
  app.element('btnExportExcel').onclick();
  check(app.exports.at(-1).every(row=>row['구분']==='경로당·노인정·회관·쉼터 검색 결과'),true,'facility export retains source classification');
  app.element('seniorAuxSearch').checked=true;
  await app.element('btnSearch').onclick();
  check(app.calls.slice(-7),['경로당','노인정','마을회관','무더위쉼터','관리사무소','관리실','경비실'],'opt-in enables only explicit auxiliary keywords');
  check(app.sandbox.searchedData.filter(row=>row.seniorKind==='auxiliary').map(row=>row.id),['g2'],'matching direct complex suppresses its auxiliary, other area retained');
  check(app.allOverlays.some(overlay=>overlay.content.includes('[보조 문의처]')),true,'auxiliary map labels visibly distinguished');
  check(app.element('searchStatus').innerText.includes('보조 문의처 1곳'),true,'status separates auxiliary count');
  app.element('btnExportExcel').onclick();
  check(app.exports.at(-1).find(row=>row['시설명']===distant.place_name&&row['구분'].includes('미확인'))['구분'],'관리·경비 문의처 · 노인시설 여부 미확인');
  app.element('btnRouteOpt').onclick();
  check(app.sandbox.lastRoute.some(row=>row.seniorKind==='auxiliary'),true,'route retains auxiliary metadata');
  check(app.element('tblRoute').innerHTML.includes('[보조 문의처]'),true,'route UI shows auxiliary status');
  check(app.element('tblRoute').innerHTML.includes('&lt;b&gt;검증&lt;/b&gt;'),true,'route UI escapes place markup');
  app.element('btnExportRoute').onclick();
  check(app.exports.at(-1).some(row=>row['구분']==='관리·경비 문의처 · 노인시설 여부 미확인'),true,'route export labels auxiliary contacts');
  app.element('btnResetSearch').onclick();
  check(app.sandbox.searchedData.length,0);
  check(app.sandbox.lastRoute.length,0,'reset invalidates old route exports');
  check(app.element('tblRoute').innerHTML,'');
  check(app.element('searchStatus').innerText,'대기');
  check(app.allMarkers.every(marker=>marker.map===null),true,'reset removes all search markers');

  app=makeApp((keyword,cb)=>cb([],'ZERO_RESULT'));
  await app.element('btnSearch').onclick();
  check(app.element('searchStatus').innerText.includes('조회 실패'),false,'fully empty success remains distinguishable from failure');
  check(app.sandbox.searchedData.length,0);
  app=makeApp((keyword,cb)=>cb([],'ERROR'));
  await app.element('btnSearch').onclick();
  check(app.element('searchStatus').innerText.includes('조회 실패/시간 초과'),true,'error status is visible instead of silently treating failure as zero');
  check(app.element('btnSearch').disabled,false,'scan button restored on SDK error');
  app=makeApp((keyword,cb)=>{
    if(keyword==='경로당')cb([d1],'OK',{totalCount:2,hasNextPage:true,nextPage(){cb([],'ERROR');}});
    else cb([],'ZERO_RESULT');
  });
  await app.element('btnSearch').onclick();
  check(app.sandbox.searchedData.map(row=>row.id),['d1'],'partial response stays visible in real scan');
  check(app.element('searchStatus').innerText.includes('경로당 조회 실패/시간 초과'),true,'partial result warning names failed query');

  // A pending request cannot repopulate the map or alter the status after reset.
  let heldCallback;
  app=makeApp((keyword,cb)=>{heldCallback=cb;});
  let running=app.element('btnSearch').onclick();
  await tick();
  check(app.calls.length,1,'first query pending');
  app.element('btnResetSearch').onclick();
  heldCallback([d1],'OK',{totalCount:1,hasNextPage:false});
  await running;
  check(app.calls.length,1,'canceled scan does not request later keywords');
  check(app.sandbox.searchedData.length,0,'late callback does not restore stale facilities');
  check(app.element('searchStatus').innerText,'대기','late callback preserves reset status');
  check(app.element('btnSearch').disabled,false);

  // The older canceled handler must not enable the button of a newer scan.
  const held=[];
  app=makeApp((keyword,cb)=>{held.push(cb);});
  running=app.element('btnSearch').onclick();
  await tick();
  app.element('btnResetSearch').onclick();
  app.buttons.forEach(button=>button.active=true);
  const nextRunning=app.element('btnSearch').onclick();
  await tick();
  held[0]([d1],'OK',{hasNextPage:false,totalCount:1});
  await running;
  check(app.element('btnSearch').disabled,true,'stale finally cannot enable active new scan button');
  held[1]([d2],'OK',{hasNextPage:false,totalCount:1});
  for(let index=2;index<5;index++){await tick();held[index]([],'ZERO_RESULT');}
  await nextRunning;
  check(app.sandbox.searchedData.map(row=>row.id),['d2'],'new request wins after old request canceled');
  check(app.element('btnSearch').disabled,false);

  let releaseBanner;
  app=makeApp(()=>{}, {targets:['banner'],drawBanner:()=>new Promise(resolve=>{releaseBanner=resolve;})});
  running=app.element('btnSearch').onclick();
  await tick();
  app.element('btnResetSearch').onclick();
  releaseBanner();
  await running;
  check(app.sandbox.bannerStarts,0,'canceled banner scan cannot restart automatic drawing');
  check(app.element('searchStatus').innerText,'대기','late banner completion does not overwrite reset status');

  console.log(JSON.stringify({ok:true,checks,source:'release HTML',liveApi:false}));
})().catch(error=>{console.error(error);process.exitCode=1;});
