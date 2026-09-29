const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('C:/Users/withe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const html=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
 const styles=[...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('');
 const a=html.indexOf('function seniorFacilityDetails('),b=html.indexOf('\nfunction seniorNormalizedText',a);
 const c=html.indexOf('function facilityWithinBounds('),d=html.indexOf('\nlet facilitySearchRequestToken=',c);
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:420,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/Paperlogy-*.woff2',route=>route.fulfill({path:'work/paperlogy-'+({'4Regular':'regular','6SemiBold':'semibold','8ExtraBold':'extrabold'}[route.request().url().match(/Paperlogy-(.+)\.woff2/)[1]])+'.woff2',contentType:'font/woff2'}));
 await page.setContent(styles+'<main style="width:100%;max-width:400px;padding:14px;margin:auto"><h2>시설 검색 출처</h2><div id="facilitySourceResults"></div></main>');
 await page.addScriptTag({content:`const $=id=>document.getElementById(id);const scanEscapeHTML=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');let searchedData=[];`+html.slice(a,b)+html.slice(c,d)});
 await page.evaluate(()=>{searchedData=[{place_name:'응봉동주민센터',road_address_name:'서울특별시 성동구 독서당로 424 (응봉동)',sourceProvider:'official',officialShelter:true,sourceUrl:'https://data.seoul.go.kr/dataList/OA-21065/S/1/datasetView.do?tab=A',recordDate:'2026',x:'127.03',y:'37.55'}, {place_name:'무더위,한파쉼터 부산이동(플랫폼)노동자지원센터해운대센터',road_address_name:'부산 해운대구 구남로29번길 38',id:'529000628',x:'129.16',y:'35.16'}, {place_name:'<img src=x onerror=alert(1)> 경비실',road_address_name:'경기 시흥시 정왕대로 74',id:'aux',x:'126.7',y:'37.3'}].map(p=>({...facilitySourceRecord(p),operatingHours:p.officialShelter?'기본 월,화,수,목,금 09:00–18:00':''}));renderFacilitySources();});
 await page.evaluate(()=>renderFacilitySources('경기 시흥시',true));
 await page.locator('summary').click();
 for(const width of [420,340]){await page.setViewportSize({width,height:850});await page.evaluate(()=>document.fonts.ready);const layout=await page.locator('#facilitySourceResults').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,html:el.innerHTML}));assert.equal(layout.overflow,false);assert.equal(await page.locator('.facility-source-card img').count(),0);await page.screenshot({path:'work/shelter-source-ui-'+width+'-v375.png'});}
 const text=await page.locator('#facilitySourceResults').innerText();assert.ok(text.includes('네이버 검색 결과와의 일치 여부는 아직 확인하지 않았습니다'));assert.ok(text.includes('서울 공식 지정'));assert.ok(text.includes('냉방쉼터'));assert.ok(text.includes('관리·경비 문의처'));
 const links=await page.locator('nav a').evaluateAll(nodes=>nodes.map(a=>({href:a.href,rel:a.rel,target:a.target})));assert.ok(links.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.href.startsWith('https:')));assert.equal(links.filter(a=>a.href.includes('map.naver.com')).length,4);assert.ok(links.some(a=>a.href==='https://place.map.kakao.com/529000628'));
 await page.getByLabel('쉼터 지도 대조 검색어').fill('서울 성동구 무더위쉼터');assert.ok((await page.locator('#facilityNaverSearch').getAttribute('href')).includes(encodeURIComponent('서울 성동구')));
 await page.evaluate(()=>{searchedData=[];renderFacilitySources('경기 시흥시',true)});assert.equal(await page.locator('#facilityNaverSearch').isVisible(),true);
 await page.evaluate(()=>renderFacilitySources('',false));assert.equal(await page.locator('#facilitySourceResults').isVisible(),false);assert.deepEqual(errors,[]);await browser.close();console.log('PASS release UI: 420/340px, source labels, safe links, exact Kakao place, escaping, region query editing, empty-result web links, reset');
})().catch(e=>{console.error(e);process.exitCode=1});
