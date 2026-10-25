/* Release-function regression tests. Synthetic records only; no API or personal data. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
function fn(name){const start=h.indexOf('function '+name+'(');assert(start>=0,name);const e=h.indexOf('\n',start),line=h.slice(start,e).trimEnd();return line.endsWith('}')?line:h.slice(start,h.indexOf('\n}',e)+2);}
const line=prefix=>{const s=h.split(/\r?\n/).find(v=>v.startsWith(prefix));assert(s,prefix);return s;};
const nodes=new Map(),charts=new Map();
const node=()=>({innerHTML:'',textContent:'',children:[],prepend(x){this.children.unshift(x)},querySelectorAll:()=>[]});
const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const c=vm.createContext({Date,Map,Set,Math,Number,$,document:{querySelectorAll:()=>[],createElement:node},scanEscapeHTML:escape,scanSite:{active:null,result:null},scanSiteFacts:()=>[],scanSiteClinicFact:()=>null,scanFormatHiraDate:v=>v||'미확인',scanKakaoMapUrl:()=>'https://map.kakao.com/',scanSiteStreetLinks:()=>'로드뷰 원문',scanSiteOnlineReview:()=>'',scanReportChart:(key,id,config)=>charts.set(key,config),scanSiteClinicHTML:()=>''});
const names=['scanClinicCount','scanSiteNum','scanSiteText','scanSiteEscape','scanSiteBudget','scanSiteMoney','scanSiteAssessment','scanSiteSameClinic','scanSiteCompetition','scanSiteCompetitionTitle','scanSiteSnapshot','scanSiteValidDraft','scanSiteDiagram','scanSiteSheet','scanSiteCompetitionHTML','scanSiteRenderCompetition','scanSiteDocument'];
const exportCss=h.slice(h.indexOf('const scanSiteExportCSS=`'),h.indexOf('// Public hospital enrichment.',h.indexOf('const scanSiteExportCSS=`')));
vm.runInContext([line('const SCAN_CLINIC_CRITERIA_VERSION='),line('const HIRA_SPECIALTY_CODES ='),line('const scanSiteFields='),line('const scanSiteChecks='),exportCss,...names.map(fn),line('const scanSiteValidBeforeEnrich='),line('scanSiteValidDraft=function(raw){const d=scanSiteValidBeforeEnrich'),line('const scanRegistryValidBase='),line('scanSiteValidDraft=function(raw){const d=scanRegistryValidBase')].join('\n'),c);
const clone=o=>JSON.parse(JSON.stringify(o));
const clinic=(name,distance,lat=37.5,lng=127)=>({name,distance,lat,lng,specialties:['정형외과'],competitionAssessment:{criteriaVersion:'specialist-clinic-v2',status:'competitor',matchedSpecialties:['정형외과'],specialistCount:1,specialistCounts:{'정형외과':1},bedCount:null}});
const result={candidate:{name:'합성 후보지',address:'공개 테스트 주소',lat:37.5,lng:127},createdAt:'2026-10-25T01:00:00Z',radiusMeters:1000,specialties:[{name:'정형외과'}],hira:{competitors:[],places:[],declared:[],unverified:[],excluded:[],errorLabels:[]},facilities:{}};
const draft=snapshot=>({schema:'jinsul-site-1',key:'synthetic-v384',fields:{title:'합성 입지자료'},photos:{},exclude:false,checks:[],snapshot});
let count=0;function test(name,run){run();count++;console.log('PASS '+name);}
test('partial-only facility status survives snapshot, JSON round trip and exported sheet',()=>{
  const r={...result,facilities:{parking:{label:'주차장',count:2,partial:true,truncated:false,nearest:{name:'합성 주차장',lat:37.5,lng:127,distance:null}}}};
  const s=c.scanSiteSnapshot(r,{exclude:false});assert.equal(s.facilities[0].partial,true);
  const d=c.scanSiteValidDraft(clone(draft(s)));assert.equal(d.snapshot.facilities[0].partial,true);assert.equal(d.snapshot.facilities[0].count,2);
  const html=c.scanSiteDocument(d);assert(html.includes('2곳 · 검색 일부 결과'));assert(html.includes('합성 주차장 거리 미확인'));assert(!html.includes('합성 주차장 0m'));
});
test('truncated, failed and confirmed zero facilities remain distinct',()=>{
  const facilities={a:{label:'약국',count:3,truncated:true},b:{label:'주차장',count:0,error:true},c:{label:'지하철역',count:0,error:false}};
  const s=c.scanSiteSnapshot({...result,facilities},{exclude:false});assert.equal(s.facilities[0].partial,true);assert.equal(s.facilities[1].count,null);assert.equal(s.facilities[2].count,0);
  const d=c.scanSiteValidDraft(clone(draft(s))),html=c.scanSiteSheet(d);assert(html.includes('3곳 · 검색 일부 결과'));assert(html.includes('조회 실패'));assert(html.includes('<th>지하철역</th><td>0곳</td>'));
});
test('missing and invalid distances do not enter the nearest bin; real zero remains eligible',()=>{
  const distances=[null,undefined,NaN,-1,Infinity,0,250,251,500,501,1000,1001];
  const r={...result,hira:{...result.hira,competitors:distances.map((x,i)=>clinic('합성 의원 '+i,x))}};
  const comp=c.scanSiteCompetition(r,false);assert.deepEqual(clone(comp.bins.map(b=>b.count)),[2,2,2,1]);assert.equal(comp.rows.length,12);
});
test('saved null distances display as unknown and chart discloses exclusion',()=>{
  const s=c.scanSiteSnapshot({...result,hira:{...result.hira,competitors:[clinic('거리 미확인 의원',null),clinic('0m 확인 의원',0),clinic('500m 확인 의원',500)]}},{exclude:false});
  const d=c.scanSiteValidDraft(clone(draft(s)));const html=c.scanSiteCompetitionHTML(d);assert(html.includes('거리 미확인</td>'));assert(html.includes('0m</td>'));assert(html.includes('500m</td>'));
  c.scanSite.active=d;c.scanSiteRenderCompetition();assert.deepEqual(clone(charts.get('siteDistance').data.datasets[0].data),[1,1,0,0]);assert($('siteCompetitionBody').children[0].textContent.includes('거리 확인 2곳 · 거리 미확인 1곳'));
});
test('all-unknown distance chart is missing data; complete empty cohort is real zero',()=>{
  const s=c.scanSiteSnapshot({...result,hira:{...result.hira,competitors:[clinic('미확인 의원',null)]}},{exclude:false});
  c.scanSite.active=c.scanSiteValidDraft(clone(draft(s)));c.scanSiteRenderCompetition();assert.deepEqual(clone(charts.get('siteDistance').data.datasets[0].data),[null,null,null,null]);
  c.scanSite.active=c.scanSiteValidDraft(clone(draft(c.scanSiteSnapshot(result,{exclude:false}))));c.scanSiteRenderCompetition();assert.deepEqual(clone(charts.get('siteDistance').data.datasets[0].data),[0,0,0,0]);
});
test('diagram numbers remain tied to table rows when coordinates are missing',()=>{
  const rows=[clinic('좌표 없음',10,null,null),clinic('두번째 의원',20),clinic('세번째 의원',30,37.501,127.001)];
  const s=c.scanSiteSnapshot({...result,hira:{...result.hira,competitors:rows}},{exclude:false}),html=c.scanSiteDiagram(s);
  assert(!html.includes('font-size="8">1</text>'));assert(html.includes('font-size="8">2</text>'));assert(html.includes('font-size="8">3</text>'));
  const table=c.scanSiteCompetitionHTML(draft(s));assert(table.includes('<td>2</td><td>두번째 의원'));assert(table.includes('<td>3</td><td>세번째 의원'));
});
test('diagram keeps the same 18-row limit as its table reference',()=>{
  const rows=Array.from({length:20},(_,i)=>clinic('합성 의원 '+i,10+i,i===0?null:37.5,i===0?null:127));
  const s=c.scanSiteSnapshot({...result,hira:{...result.hira,competitors:rows}},{exclude:false}),html=c.scanSiteDiagram(s);assert(html.includes('font-size="8">18</text>'));assert(!html.includes('font-size="8">19</text>'));assert.equal((html.match(/font-size="8">/g)||[]).length,17);
});
test('HTML render escapes arbitrary labels while preserving distance meaning',()=>{
  const s=c.scanSiteSnapshot({...result,hira:{...result.hira,competitors:[clinic('<img onerror=bad>',null)]}},{exclude:false}),html=c.scanSiteCompetitionHTML(draft(s));assert(html.includes('&lt;img onerror=bad&gt;'));assert(!html.includes('<img onerror'));assert(html.includes('거리 미확인'));
});
console.log(count+' site/report regression checks passed (synthetic fixtures; no live API).');
if(process.argv.includes('--render'))(async()=>{
  const {chromium}=require('C:/Users/withe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{const file={'4Regular':'regular','6SemiBold':'semibold','8ExtraBold':'extrabold'}[route.request().url().match(/Paperlogy-(.+)\.woff2/)?.[1]];return file?route.fulfill({path:'work/paperlogy-'+file+'.woff2',contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'}}):route.abort();});
    const s=c.scanSiteSnapshot({...result,hira:{...result.hira,competitors:[clinic('좌표·거리 미확인 의원',null,null,null),clinic('확인 의원',500,37.502,127.003)]},facilities:{parking:{label:'주차장',count:2,partial:true,nearest:{name:'합성 주차장',lat:37.5,lng:127,distance:null}}}},{exclude:false});
    const d=c.scanSiteValidDraft(draft(s));d.fields.notes='합성 시험 자료입니다.\n실제 환자·병원·임대 조건을 포함하지 않습니다.';
    await page.setContent(c.scanSiteDocument(d));await page.evaluate(()=>document.fonts.ready);
    for(const [width,height] of [[1280,900],[768,1024],[375,812]]){
      await page.setViewportSize({width,height});
      const size=await page.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}));assert(size.scroll<=size.view+1,'report overflow at '+width);
      assert((await page.locator('main').innerText()).includes('거리 미확인'));assert((await page.locator('main').innerText()).includes('검색 일부 결과'));
    }
    await page.setViewportSize({width:794,height:1123});await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.printTools').isVisible(),false);assert.equal(await page.locator('.siteSheetGrid').evaluate(el=>getComputedStyle(el).display),'grid');
    const printSize=await page.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}));assert(printSize.scroll<=printSize.view+1,'A4 print-width overflow');assert.deepEqual(errors,[]);
    await page.screenshot({path:'work/site-report-v384-print-preview.png',fullPage:true});
    console.log('PASS rendered synthetic report: desktop/tablet/375px, A4 print CSS, partial/unknown labels, no overflow or page errors');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
