const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('C:/Users/withe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8'),styles=[...h.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('');
 const slice=(a,b)=>h.slice(h.indexOf(a),h.indexOf(b,h.indexOf(a)));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/Paperlogy-*.woff2',route=>route.fulfill({path:'work/paperlogy-'+({'4Regular':'regular','6SemiBold':'semibold','8ExtraBold':'extrabold'}[route.request().url().match(/Paperlogy-(.+)\.woff2/)[1]])+'.woff2',contentType:'font/woff2'}));
 await page.setContent(styles+'<div class="app"><aside style="width:360px;flex-shrink:0;background:#f4f7fa;padding:24px">합성 데이터 · 상세 패널 검증</aside><div class="mapArea"><div id="map" style="background:#dde6eb"><div id="highMarker" style="position:absolute;top:160px;left:80px;width:100px;height:100px;background:orange;z-index:400000"></div></div><div class="map-controls-container"><div class="map-type-group">지도 · 위성</div><div class="vertical-toolbar" style="height:550px">지도 도구</div></div></div></div>');
 await page.addScriptTag({content:`const scanState={hiraDetailRequestToken:0,markerImages:{}};const scanEscapeHTML=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;');const scanSiteEscape=scanEscapeHTML;const scanPlaceSearchQuery=p=>p.name;const scanKakaoMapUrl=()=> 'https://map.kakao.com';const scanHiraInfoHTML=()=>'<p>조회 중</p>';let resolves=[];const scanFetchClinicEnriched=()=>new Promise(r=>resolves.push(r));`+h.match(/const SCAN_LAYER_CONFIG\s*=\s*\{[\s\S]*?\n\};/)[0]+slice('const SCAN_MARKER_ICONS=','function scanOpenPlaceInfo')+slice('function scanClinicSourceExplanation(','function scanWgs84ToWtm')+slice('function scanClinicEnrichedHTML(','async function scanSiteDetail(')});
 const data={hira:{detail:{lunchWeek:'12:30~14:00'},departments:[{dgsbjtCdNm:'정형외과'},{dgsbjtCdNm:'마취통증의학과'}],specialists:[]},egen:{dutyAddr:'경기도 시흥시 중심상가로 146, 2·3·4층 (정왕동, 한일프라자)',dutyTel1:'031-000-0000'},hours:['월','화','수','목','금','토','일','공휴일'].map(day=>({day,value:'미제공 · 휴진 여부 미확인',source:'공개자료 없음'})),checkedAt:'검증 시점',errors:[]};
 await page.evaluate(data=>{window.fixture=data;window.place={name:'검증 정형외과의원',address:'경기도 시흥시',specialties:['정형외과']};scanShowPlacePanel(place,'hira',scanClinicPanelHTML(place,data))},data);
 assert.match(await page.locator('.scanPlacePanel').innerText(),/경쟁 후보 · 심평원 신고자료/);
 assert.match(await page.locator('.scanClinicSourceNote').innerText(),/경쟁 후보 · 정형외과/);
 assert.match(await page.locator('.scanClinicSourceNote').innerText(),/신고된 진료과/);
 await page.evaluate(()=>document.fonts.ready);
 for(const [width,height,name] of [[1280,900,'desktop'],[1024,768,'tablet'],[768,1024,'narrow']]){
  await page.setViewportSize({width,height});const layout=await page.evaluate(()=>{const p=document.querySelector('.scanPlacePanel'),b=document.querySelector('.scanPlaceBody'),t=document.querySelector('.vertical-toolbar'),r=p.getBoundingClientRect(),tr=t.getBoundingClientRect();return {top:r.top,bottom:r.bottom,right:r.right,toolLeft:tr.left,overflow:b.scrollWidth>b.clientWidth+1,scroll:b.scrollHeight>b.clientHeight,front:document.elementFromPoint(r.left+80,r.top+120)?.closest('.scanPlacePanel')!==null}});
  assert.ok(layout.top>=0&&layout.bottom<=height);assert.ok(layout.right<layout.toolLeft);assert.equal(layout.overflow,false);assert.equal(layout.scroll,true);assert.equal(layout.front,true);await page.screenshot({path:'work/map-panel-'+name+'-v374.png'});
 }
 await page.keyboard.press('Escape');assert.equal(await page.locator('.scanPlacePanel').count(),0);
 await page.evaluate(()=>{scanOpenHiraInfo(place);scanShowPlacePanel({...place,name:'다른 약국'},'pharmacy','<p>약국 정보</p>');resolves.shift()(fixture)});await page.waitForTimeout(20);assert.ok((await page.locator('.scanPlacePanel').innerText()).includes('약국 정보'));assert.ok(!(await page.locator('.scanPlacePanel').innerText()).includes('진료시간'));
 await page.evaluate(()=>{scanOpenHiraInfo(place);document.querySelector('.scanPlaceClose').click();resolves.shift()(fixture)});await page.waitForTimeout(20);assert.equal(await page.locator('.scanPlacePanel').count(),0);
 await page.evaluate(()=>{scanOpenHiraInfo(place);resolves.shift()(fixture)});await page.waitForTimeout(20);
 assert.equal(await page.locator('.scanClinicSourceNote').count(),1);assert.match(await page.locator('.scanClinicSourceNote').innerText(),/경쟁 후보 · 정형외과/);
 await page.evaluate(()=>scanShowPlacePanel(place,'competitor','<p>카카오 결과</p>'));
 assert.match(await page.locator('.scanPlacePanel').innerText(),/경쟁 후보 · 카카오 검색/);assert.match(await page.locator('.scanClinicSourceNote').innerText(),/키워드 검색/);
 await page.evaluate(()=>scanShowPlacePanel(place,'pharmacy','<p>약국 정보</p>'));assert.equal(await page.locator('.scanClinicSourceNote').count(),0);
 const colors=await page.evaluate(()=>Object.values(SCAN_LAYER_CONFIG).map(x=>x.color));assert.equal(new Set(colors).size,6);assert.deepEqual(errors,[]);await browser.close();console.log('PASS responsive panel, tool separation, marker stacking, scroll, Escape, stale requests, six distinct colors, clinic source labels and async persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
