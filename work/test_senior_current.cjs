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
  setTimeout, clearTimeout, URL,
  kakao:{maps:{services:{Status:{OK:'OK', ZERO_RESULT:'ZERO_RESULT', ERROR:'ERROR'}}}},
  places:{keywordSearch(keyword, cb, options){ calls++; callback = cb; }}
};
vm.createContext(ctx);
vm.runInContext(source + '\nthis.helpers={seniorFacilityKind,seniorPlaceIdentity,seniorComplexAddressKey,selectSeniorSearchResults,keywordSearchAllEnhanced,SENIOR_DIRECT_KEYWORDS,SENIOR_AUXILIARY_KEYWORDS};', ctx);
const h = ctx.helpers;
let checks = 0;
function check(value, expected, message){ assert.deepEqual(JSON.parse(JSON.stringify(value)), expected, message); checks++; }
const p = (id, name, address='경기도 시흥시 정왕대로 74', more={}) => ({id,place_name:name,road_address_name:address,address_name:'경기도 시흥시 정왕동 1',x:'126.7',y:'37.3',...more});
const handlerStart=html.indexOf('function facilityWithinBounds(');
const handlerEnd=html.indexOf("document.querySelectorAll('.search-btn').forEach",handlerStart);
assert.ok(handlerStart>=0 && handlerEnd>handlerStart,'actual facility scan/route/export handlers located');
const handlerSource=html.slice(handlerStart,handlerEnd);
function makeApp(reply, options={}){
  const elements=new Map();
  // Minimal DOM fixture: mirror the dynamically inserted comparison input's value.
  const decodeAttribute=value=>String(value||'').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const element=id=>{
    if(!elements.has(id)){
      const node={checked:false,disabled:false,innerText:'',value:'',style:{}};
      let markup='';
      Object.defineProperty(node,'innerHTML',{get:()=>markup,set:value=>{
        markup=String(value);
        if(id==='facilitySourceResults'){
          const input=markup.match(/<input\s+id="facilityCompareQuery"[^>]*\svalue="([^"]*)"/);
          element('facilityCompareQuery').value=input?decodeAttribute(input[1]):'';
        }
      }});
      elements.set(id,node);
    }
    return elements.get(id);
  };
  const calls=[],exports=[],toasts=[],allMarkers=[],allOverlays=[],officialCalls=[],regionCalls=[];
  const eventHandlers=new Map();
  const addListener=(target,type,handler)=>{
    if(!eventHandlers.has(target))eventHandlers.set(target,new Map());
    const handlers=eventHandlers.get(target);
    if(!handlers.has(type))handlers.set(type,new Set());
    handlers.get(type).add(handler);
  };
  const removeListener=(target,type,handler)=>eventHandlers.get(target)?.get(type)?.delete(handler);
  const emit=(target,type,...args)=>{for(const handler of [...(eventHandlers.get(target)?.get(type)||[])])handler(...args);};
  const buttons=(options.targets||['senior']).map(target=>({dataset:{target},active:true,classList:{remove(){buttons.find(b=>b.dataset.target===target).active=false;}}}));
  class LatLng {constructor(y,x){this.y=Number(y);this.x=Number(x);}getLat(){return this.y;}getLng(){return this.x;}}
  class Drawable {constructor(props={}){Object.assign(this,props);this.props=props;}setMap(value){this.map=value;}}
  class Marker extends Drawable {constructor(props){super(props);allMarkers.push(this);}getPosition(){return this.position;}}
  class Overlay extends Drawable {constructor(props){super(props);allOverlays.push(this);}}
  class Polyline extends Drawable {getLength(){return 100;}}
  class Bounds {constructor(sw=new LatLng(37.25,126.65),ne=new LatLng(37.35,126.75)){this.sw=sw;this.ne=ne;}extend(){}getSouthWest(){return this.sw;}getNorthEast(){return this.ne;}}
  let viewport=new Bounds();
  const setViewport=(south,west,north,east)=>{viewport=new Bounds(new LatLng(south,west),new LatLng(north,east));};
  const sandbox={
    $,console,Date,encodeURIComponent,URL,
    setTimeout:(fn,ms)=>setTimeout(fn,ms===700?1:ms===4000&&options.regionTimeoutMs?options.regionTimeoutMs:ms),clearTimeout,
    document:{querySelectorAll(){return buttons.filter(b=>b.active);}},
    map:{getBounds:()=>viewport,setBounds(){}},
    searchBtns:buttons,
    targetMarkers:{senior:[],welfare:[],ortho:[],banner:[],recommend:[]},
    targetOverlays:{senior:[],welfare:[],ortho:[],banner:[],recommend:[]},
    routeLines:[],routeMarkers:[],searchedData:[],lastRoute:[],
    SVG_MARKERS:{senior:'senior-icon',welfare:'welfare-icon',ortho:'ortho-icon',banner:'banner-icon'},
    scanEscapeHTML:value=>String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
    toast:message=>toasts.push(message),
    myHospitalMarker:{getPosition:()=>new LatLng(37.3,126.7)},
    drawBannerLayerForBounds:options.drawBanner||(()=>Promise.resolve()),
    fetchSeoulOfficialShelters:bounds=>{officialCalls.push(bounds);return options.fetchOfficial?options.fetchOfficial(bounds):Promise.resolve({places:[],status:'out-of-coverage',matched:0});},
    geocoder:options.geocoder===false?undefined:{coord2RegionCode(x,y,cb){
      regionCalls.push({x,y});
      if(options.regionReply)return options.regionReply(x,y,cb);
      cb([{region_type:'B',region_1depth_name:'경기도',region_2depth_name:'시흥시'}],'OK');
    }},
    startBannerAuto:()=>{sandbox.bannerStarts++;},bannerStarts:0,
    clearBannerLayerOnly(){},stopBannerAuto(){},
    // Banner UI is outside this facility fixture; reset still invokes its cleanup.
    renderBannerInspector(){},bannerStatus(){},
    places:{keywordSearch(keyword,cb,query){calls.push(keyword);reply(keyword,cb,query);}},
    kakao:{maps:{LatLng,LatLngBounds:Bounds,Marker,CustomOverlay:Overlay,Polyline,
      Size:class{constructor(w,h){this.width=w;this.height=h;}},
      MarkerImage:class{constructor(src,size){this.src=src;this.size=size;}},
      services:{Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT',ERROR:'ERROR'}},
      event:{addListener,removeListener}
    }},
    XLSX:{utils:{book_new:()=>({}),json_to_sheet:rows=>{exports.push(rows);return rows;},book_append_sheet(){}},writeFile(){}},
  };
  function $(id){return element(id);}
  vm.createContext(sandbox);
  vm.runInContext(source+'\n'+handlerSource,sandbox);
  return {sandbox,element,calls,exports,toasts,allMarkers,allOverlays,buttons,officialCalls,regionCalls,emit,setViewport};
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
  check(app.exports.at(-1).every(row=>row['구분']==='경로당·노인정'),true,'facility export retains specific facility classification');
  check(app.exports.at(-1).every(row=>row['출처']==='카카오 장소 검색'&&row['지도 대조']==='대조 미확인'),true,'facility export does not assert NAVER confirmation');
  app.element('seniorAuxSearch').checked=true;
  await app.element('btnSearch').onclick();
  check(app.calls.slice(-7),['경로당','노인정','마을회관','무더위쉼터','관리사무소','관리실','경비실'],'opt-in enables only explicit auxiliary keywords');
  check(app.sandbox.searchedData.filter(row=>row.seniorKind==='auxiliary').map(row=>row.id),['kakao:g2'],'matching direct complex suppresses its auxiliary, other area retained');
  check(app.allOverlays.some(overlay=>overlay.content.includes('[보조 문의처]')),true,'auxiliary map labels visibly distinguished');
  check(/보조 문의처\s+1건/.test(app.element('searchStatus').innerText),true,'status separates auxiliary record count');
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
  check(app.sandbox.searchedData.map(row=>row.id),['kakao:d1'],'partial response stays visible in real scan');
  check(app.element('searchStatus').innerText.includes('경로당 조회 실패/시간 초과'),true,'partial result warning names failed query');

  // Actual handler integration with a mocked official-data network boundary.
  // Coordinates and metadata below are synthetic and are not operational source assertions.
  const officialPlace=p('d1','시민도서관','서울특별시 성동구 왕십리로 1',{
    sourceProvider:'official',officialShelter:true,sourceRecordId:'d1',
    sourceUrl:'https://data.seoul.go.kr/',recordDate:'2026-06-01',retrievedAt:'2026-09-29T00:00:00Z',
    operatingHours:'평일 09:00~18:00'
  });
  const officialReply=places=>({places,status:'complete',matched:places.length,invalidCoordinateCount:0});
  const kakaoSourcePlace=p('529000628','무더위,한파쉼터 부산이동(플랫폼)노동자지원센터해운대센터','부산 해운대구 구남로29번길 38',{
    place_url:'http://place.map.kakao.com/529000628'
  });
  app=makeApp((keyword,cb)=>{
    const rows=keyword==='경로당'?[d1]:keyword==='무더위쉼터'?[kakaoSourcePlace]:[];
    cb(rows,rows.length?'OK':'ZERO_RESULT',{totalCount:rows.length,hasNextPage:false});
  },{fetchOfficial:async()=>officialReply([officialPlace])});
  await app.element('btnSearch').onclick();
  check(app.officialCalls.length,1,'one official request supplements the senior scan');
  check(app.sandbox.searchedData.map(row=>row.id),['kakao:d1','kakao:529000628','official:d1'],'same provider-local ID remains distinct across sources');
  const officialRow=app.sandbox.searchedData.find(row=>row.sourceProvider==='official');
  const coolingRow=app.sandbox.searchedData.find(row=>row.id==='kakao:529000628');
  check(officialRow.facilityType,'냉방쉼터','official library survives the name classifier without a shelter keyword');
  check(officialRow.isSeniorFacility,null,'official shelter designation does not imply senior facility');
  check(coolingRow.isSeniorFacility,null,'combined-prefix worker shelter does not imply senior facility');
  check(officialRow.sourceUrl,officialPlace.sourceUrl);
  check(officialRow.recordDate,'2026-06-01');
  check(officialRow.retrievedAt,'2026-09-29T00:00:00Z');
  check(officialRow.sourceRefs.length,1,'official source evidence survives normalization');
  check(officialRow.comparisonStatus,'대조 미확인');
  check(coolingRow.mapLinks.kakao,'https://place.map.kakao.com/529000628','known provider ID opens the actual place');
  check(decodeURIComponent(coolingRow.mapLinks.naver).includes('구남로29번길'),false,'map search avoids appending full street address');
  check(app.element('facilitySourceResults').hidden,false,'source panel appears for senior records');
  check(app.element('facilitySourceResults').innerHTML.includes('네이버 검색 결과와의 일치 여부는 아직 확인하지 않았습니다.'),true,'UI does not claim unperformed browser comparison');
  check(app.element('facilitySourceResults').innerHTML.includes('출처의 같은 시설이 중복될 수 있습니다'),true,'cross-source duplicate risk disclosed');
  check(app.allOverlays.some(overlay=>overlay.content.includes('[공식 쉼터]')),true,'official marker labels are explicit');
  app.element('btnExportExcel').onclick();
  const officialExport=app.exports.at(-1).find(row=>row['시설명']===officialPlace.place_name);
  const kakaoExport=app.exports.at(-1).find(row=>row['시설명']===kakaoSourcePlace.place_name);
  check(officialExport['구분'],'냉방쉼터');
  check(officialExport['출처'],'서울 열린데이터광장');
  check(officialExport['지정 구분'],'공공자료 지정');
  check(officialExport['자료 기준'],'2026-06-01');
  check(officialExport['조회 시각'],'2026-09-29T00:00:00Z');
  check(officialExport['운영 안내'],'평일 09:00~18:00');
  check(officialExport['원문'],officialPlace.sourceUrl);
  check(officialExport['지도 대조'],'대조 미확인');
  check(kakaoExport['원문'],kakaoSourcePlace.place_url);
  check(kakaoExport['자료 기준'],'미제공','retrieval date cannot masquerade as source freshness');
  check(kakaoExport['네이버 확인'],coolingRow.mapLinks.naver);
  check(kakaoExport['카카오 확인'],coolingRow.mapLinks.kakao);
  app.element('btnRouteOpt').onclick();
  check(app.sandbox.lastRoute.find(row=>row.sourceProvider==='official').sourceUrl,officialPlace.sourceUrl,'route preserves official evidence');
  app.element('btnExportRoute').onclick();
  const officialRouteExport=app.exports.at(-1).find(row=>row['시설명']===officialPlace.place_name);
  for(const key of ['출처','지정 구분','자료 기준','조회 시각','운영 안내','원문','지도 대조','네이버 확인','카카오 확인'])check(officialRouteExport[key],officialExport[key],'route export retains '+key);

  app=makeApp(replySuccess,{fetchOfficial:async()=>{throw Error('synthetic upstream failure');}});
  await app.element('btnSearch').onclick();
  check(app.sandbox.searchedData.length,3,'official failure does not discard successful Kakao results');
  check(app.element('searchStatus').innerText.includes('서울 공식 쉼터 조회 실패'),true,'official failure explicitly shown');
  check(app.element('btnSearch').disabled,false,'button restored on official source failure');
  app=makeApp((keyword,cb)=>cb([],'ZERO_RESULT'),{fetchOfficial:async()=>officialReply([])});
  await app.element('btnSearch').onclick();
  check(app.sandbox.searchedData.length,0,'successful empty source remains empty');
  check(app.element('searchStatus').innerText.includes('서울 공식 지정 0건'),true,'successful empty official coverage differs from unsupported region');
  check(app.element('searchStatus').innerText.includes('조회 실패'),false,'empty is not source failure');
  check(app.element('facilitySourceResults').hidden,false,'API zero still offers direct map-web comparison');
  check(app.element('facilityCompareQuery').value,'경기도 시흥시 무더위쉼터','empty-result map links use the viewport center district');
  check(app.element('facilityNaverSearch').hidden,false,'NAVER web link remains available with zero API results');
  check(app.element('facilityKakaoSearch').hidden,false,'Kakao web link remains available with zero API results');
  check(app.element('facilityNaverSearch').href,'https://map.naver.com/p/search/'+encodeURIComponent('경기도 시흥시 무더위쉼터'));
  check(app.element('facilityKakaoSearch').href,'https://map.kakao.com/?q='+encodeURIComponent('경기도 시흥시 무더위쉼터'));
  check(app.element('facilitySourceResults').innerHTML.includes('현재 지도 범위와 다릅니다'),true,'district web-search scope is not presented as viewport results');
  check(app.regionCalls.map(({x,y})=>[Number(x.toFixed(3)),Number(y.toFixed(3))]),[[126.7,37.3]],'region geocoder uses viewport center');
  app.element('facilityCompareQuery').value='대전광역시 서구 무더위쉼터';
  app.element('facilityCompareQuery').oninput();
  check(app.element('facilityNaverSearch').href,'https://map.naver.com/p/search/'+encodeURIComponent('대전광역시 서구 무더위쉼터'),'editing region immediately updates NAVER link');
  check(app.element('facilityKakaoSearch').href,'https://map.kakao.com/?q='+encodeURIComponent('대전광역시 서구 무더위쉼터'),'editing region immediately updates Kakao link');
  app.element('facilityCompareQuery').value='   ';
  app.element('facilityCompareQuery').oninput();
  check(app.element('facilityNaverSearch').hidden,true,'empty comparison query hides NAVER link');
  check(app.element('facilityKakaoSearch').hidden,true,'empty comparison query hides Kakao link');

  const emptyPlaces=(keyword,cb)=>cb([],'ZERO_RESULT');
  app=makeApp(emptyPlaces,{regionReply:(x,y,cb)=>cb([
    {region_type:'H',region_1depth_name:'경기도',region_2depth_name:'행정 테스트시'},
    {region_type:'B',region_1depth_name:'서울특별시',region_2depth_name:'성동구'}
  ],'OK')});
  await app.element('btnSearch').onclick();
  check(app.element('facilityCompareQuery').value,'서울특별시 성동구 무더위쉼터','legal district row is preferred over fallback geocoder row');
  app=makeApp(emptyPlaces,{regionReply:(x,y,cb)=>cb([{region_type:'H',region_1depth_name:'부산광역시',region_2depth_name:'해운대구'}],'OK')});
  await app.element('btnSearch').onclick();
  check(app.element('facilityCompareQuery').value,'부산광역시 해운대구 무더위쉼터','first valid row works if legal district entry unavailable');
  for(const regionOptions of [
    {regionReply:(x,y,cb)=>cb([],'ERROR')},
    {regionReply:(x,y,cb)=>cb([],'OK')},
    {regionReply:()=>{throw Error('synthetic geocoder failure');}},
    {geocoder:false}
  ]){
    app=makeApp(emptyPlaces,regionOptions);
    await app.element('btnSearch').onclick();
    check(app.element('facilitySourceResults').hidden,false,'failed or missing geocoder retains editable web search');
    check(app.element('facilityCompareQuery').value,'','failed region lookup does not invent or reuse a district');
    check(app.element('facilityNaverSearch').hidden,true,'unknown district has no misleading search URL');
    check(app.element('facilitySourceResults').innerHTML.includes('지역명 확인 실패'),true,'failed lookup prompts region input');
    check(app.element('btnSearch').disabled,false,'geocoder fallback restores scan button');
  }
  let delayedRegion;
  app=makeApp(emptyPlaces,{regionTimeoutMs:8,regionReply:(x,y,cb)=>{delayedRegion=cb;}});
  await app.element('btnSearch').onclick();
  check(app.element('facilityCompareQuery').value,'','region timeout resolves to an editable blank query');
  check(app.element('btnSearch').disabled,false,'region timeout cannot hang the facility scan');
  app.element('facilityCompareQuery').value='경기도 용인시 처인구 무더위쉼터';
  app.element('facilityCompareQuery').oninput();
  delayedRegion([{region_type:'B',region_1depth_name:'서울특별시',region_2depth_name:'성동구'}],'OK');
  await tick();
  check(app.element('facilityCompareQuery').value,'경기도 용인시 처인구 무더위쉼터','callback after timeout cannot overwrite manual query');
  check(app.element('facilityNaverSearch').href,'https://map.naver.com/p/search/'+encodeURIComponent('경기도 용인시 처인구 무더위쉼터'),'late geocoder does not change manual NAVER URL');

  let pendingRegion;
  app=makeApp(replySuccess,{regionReply:(x,y,cb)=>{pendingRegion=cb;}});
  const canceledRegionRun=app.element('btnSearch').onclick();
  await tick();
  app.element('btnResetSearch').onclick();
  pendingRegion([{region_type:'B',region_1depth_name:'서울특별시',region_2depth_name:'성동구'}],'OK');
  await canceledRegionRun;
  check(app.element('facilitySourceResults').hidden,true,'late region lookup cannot reopen a reset source panel');
  check(app.element('searchStatus').innerText,'대기','late region lookup preserves reset status');
  check(app.sandbox.searchedData.length,0,'reset still clears facilities while geocoder is pending');
  check(app.allMarkers.every(marker=>marker.map===null),true,'reset clears markers created before geocoder completed');
  const pendingRegions=[];
  app=makeApp(emptyPlaces,{regionReply:(x,y,cb)=>pendingRegions.push(cb)});
  const oldRegionRun=app.element('btnSearch').onclick();
  await tick();
  app.element('btnResetSearch').onclick();
  app.buttons.forEach(button=>button.active=true);
  const currentRegionRun=app.element('btnSearch').onclick();
  await tick();
  pendingRegions[0]([{region_type:'B',region_1depth_name:'서울특별시',region_2depth_name:'성동구'}],'OK');
  await oldRegionRun;
  check(app.element('btnSearch').disabled,true,'old geocoder completion cannot enable a newer scan');
  check(app.element('facilitySourceResults').hidden,true,'old geocoder result cannot render the wrong region');
  pendingRegions[1]([{region_type:'B',region_1depth_name:'대전광역시',region_2depth_name:'서구'}],'OK');
  await currentRegionRun;
  check(app.element('facilityCompareQuery').value,'대전광역시 서구 무더위쉼터','newest geocoder response controls the web-search district');
  check(app.element('btnSearch').disabled,false);
  app=makeApp(emptyPlaces,{targets:['welfare']});
  await app.element('btnSearch').onclick();
  check(app.regionCalls.length,0,'non-senior scan does not add an unrelated region request');
  check(app.officialCalls.length,0,'non-senior scan does not request cooling shelter data');
  check(app.element('facilitySourceResults').hidden,true,'shelter comparison panel stays hidden for other facility types');
  app=makeApp((keyword,cb)=>{
    const rows=keyword==='경로당'?[d1,p('outside','다른 지역 경로당','',{x:'127.1',y:'37.5'}),p('missing','좌표 미상 경로당','',{x:'',y:''})]:[];
    cb(rows,rows.length?'OK':'ZERO_RESULT',{totalCount:rows.length,hasNextPage:false});
  });
  await app.element('btnSearch').onclick();
  check(app.sandbox.searchedData.map(row=>row.id),['kakao:d1'],'actual viewport filter excludes remote and coordinate-missing provider results');

  let releaseOfficial;
  app=makeApp(replySuccess,{fetchOfficial:()=>new Promise(resolve=>{releaseOfficial=resolve;})});
  let pendingOfficialRun=app.element('btnSearch').onclick();
  await tick();
  check(app.calls.length,4,'Kakao keywords complete while official source is pending');
  app.element('btnResetSearch').onclick();
  releaseOfficial(officialReply([officialPlace]));
  await pendingOfficialRun;
  check(app.sandbox.searchedData.length,0,'late official result cannot restore reset facilities');
  check(app.element('searchStatus').innerText,'대기','late official completion preserves reset status');
  check(app.element('facilitySourceResults').hidden,true,'late official completion cannot reopen source panel');
  check(app.allMarkers.length,0,'no stale markers created after reset');

  const officialReleases=[];
  app=makeApp((keyword,cb)=>cb([],'ZERO_RESULT'),{fetchOfficial:()=>new Promise(resolve=>officialReleases.push(resolve))});
  pendingOfficialRun=app.element('btnSearch').onclick();
  await tick();
  app.element('btnResetSearch').onclick();
  app.buttons.forEach(button=>button.active=true);
  const newOfficialRun=app.element('btnSearch').onclick();
  await tick();
  officialReleases[0](officialReply([officialPlace]));
  await pendingOfficialRun;
  check(app.element('btnSearch').disabled,true,'stale official completion cannot enable a newer active scan');
  check(app.sandbox.searchedData.length,0,'stale official rows excluded while newer scan waits');
  officialReleases[1](officialReply([{...officialPlace,id:'new',sourceRecordId:'new',place_name:'새 시민센터'}]));
  await newOfficialRun;
  check(app.sandbox.searchedData.map(row=>row.id),['official:new'],'new official request wins over previous response');
  check(app.element('btnSearch').disabled,false);

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
  check(app.sandbox.searchedData.map(row=>row.id),['kakao:d2'],'new request wins after old request canceled');
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

  // Dense results preserve markers while revealing labels only on demand.
  // Eighty synthetic sites arrive across four queries rather than pretending one API page is exhaustive.
  const densePlaces=Array.from({length:80},(_,i)=>p('dense-'+i,'밀집'+i+' 경로당','경기도 시흥시 정왕대로 '+(i+1),{
    x:String(126.68+i*.0005),y:'37.3'
  }));
  const denseKeywords=['경로당','노인정','마을회관','무더위쉼터'];
  app=makeApp((keyword,cb)=>{
    const index=denseKeywords.indexOf(keyword),rows=index<0?[]:densePlaces.slice(index*20,index*20+20);
    cb(rows,rows.length?'OK':'ZERO_RESULT',{totalCount:rows.length,hasNextPage:false});
  });
  await app.element('btnSearch').onclick();
  const facilityLabels=app.allOverlays.filter(label=>label.facilityPosition);
  const facilityMarkers=app.sandbox.targetMarkers.senior.slice();
  const visibleLabels=()=>facilityLabels.filter(label=>label.map===app.sandbox.map);
  check(app.sandbox.searchedData.length,80,'dense-label behavior does not drop data records');
  check(facilityMarkers.length,80,'dense-label behavior retains all markers');
  check(facilityMarkers.every(marker=>marker.map===app.sandbox.map),true,'dense map still shows every facility icon');
  check(facilityLabels.length,80,'each facility label gets position metadata');
  check(visibleLabels().length,0,'80 visible sites do not automatically cover the map with labels');
  app.emit(facilityMarkers[0],'mouseover');
  check(visibleLabels().map(label=>facilityLabels.indexOf(label)),[0],'hover reveals exactly the focused dense label');
  app.emit(facilityMarkers[0],'mouseout');
  check(visibleLabels().length,0,'mouseout hides an unpinned dense label');
  app.emit(facilityMarkers[1],'click');
  check(facilityLabels[1].facilityPinned,true,'click pins selected facility label');
  app.emit(facilityMarkers[1],'mouseout');
  check(visibleLabels().map(label=>facilityLabels.indexOf(label)),[1],'pinned label survives mouseout');
  app.emit(facilityMarkers[2],'mouseover');
  check(visibleLabels().length,2,'hover may coexist with one pinned label');
  app.emit(facilityMarkers[2],'mouseout');
  app.emit(facilityMarkers[3],'click');
  check(visibleLabels().map(label=>facilityLabels.indexOf(label)),[3],'clicking another marker transfers the single pinned label');
  check(facilityLabels[1].facilityPinned,false,'prior pinned label clears');
  app.emit(facilityMarkers[3],'click');
  check(visibleLabels().length,0,'clicking selected marker toggles pinned label off');

  // Counts are for the current viewport across facility groups; non-facility overlays stay untouched.
  const otherOverlay=new app.sandbox.kakao.maps.CustomOverlay({map:app.sandbox.map});
  app.sandbox.targetOverlays.banner.push(otherOverlay);
  app.sandbox.targetOverlays.welfare.push(...app.sandbox.targetOverlays.senior.splice(60));
  app.sandbox.refreshFacilityLabels();
  check(visibleLabels().length,0,'50-label limit counts labels across all facility groups');
  check(otherOverlay.map===app.sandbox.map,true,'facility label policy does not hide unrelated banner overlays');
  app.setViewport(37.29,126.6799,37.31,126.6846);
  app.sandbox.refreshFacilityLabels();
  check(visibleLabels().length,10,'zooming to ten sites displays all ten labels');
  check(visibleLabels().every(label=>facilityLabels.slice(0,10).includes(label)),true,'labels outside the viewport are hidden');
  app.emit(facilityMarkers[79],'mouseover');
  check(visibleLabels().length,10,'even a queued hover cannot show an offscreen label');
  app.emit(facilityMarkers[79],'mouseout');
  app.emit(facilityMarkers[61],'click');
  check(facilityLabels[61].map,null,'pinned label outside the viewport remains hidden');
  app.emit(facilityMarkers[61],'click');
  app.setViewport(37.29,126.6799,37.31,126.7046);
  app.sandbox.refreshFacilityLabels();
  check(visibleLabels().length,50,'exactly fifty in-view labels are displayed');
  app.setViewport(37.29,126.6799,37.31,126.7051);
  app.sandbox.refreshFacilityLabels();
  check(visibleLabels().length,0,'fifty-one in-view labels activates sparse labels');
  app.emit(facilityMarkers[10],'click');
  check(visibleLabels().map(label=>facilityLabels.indexOf(label)),[10],'one selected label remains available in the dense viewport');
  app.element('btnResetSearch').onclick();
  check(facilityLabels.every(label=>label.map===null),true,'reset removes every dense or pinned label');
  app.emit(facilityMarkers[10],'mouseover');
  app.emit(facilityMarkers[10],'click');
  app.sandbox.refreshFacilityLabels();
  check(facilityLabels.every(label=>label.map===null),true,'late marker events cannot resurrect labels from cleared results');
  check(app.sandbox.searchedData.length,0,'label callbacks cannot restore cleared records');
  check((html.match(/kakao\.maps\.event\.addListener\(map,\s*['"]idle['"],\s*refreshFacilityLabels\)/g)||[]).length,1,'map idle installs one label refresh listener');

  console.log(JSON.stringify({ok:true,checks,source:'release HTML',liveApi:false}));
})().catch(error=>{console.error(error);process.exitCode=1;});
