const fs=require('fs');
const file='jinsulmap/JINSUL_MAP_v3.5.3.html';
let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.2.html','utf8').replaceAll('3.5.2','3.5.3');
function replaceFunction(name,body){const re=new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm');if(!re.test(s))throw Error(name);s=s.replace(re,()=>body);}
replaceFunction('scanIsSeoulCandidate',`function scanCandidateRegion(candidate){
  const names={'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도','51':'강원특별자치도','52':'전북특별자치도'};
  const code=String(candidate?.legalCode||'').slice(0,2);
  if(names[code])return {name:names[code],isSeoul:code==='11',known:true};
  const text=String(candidate?.sidoName||candidate?.address||'').trim();
  const aliases={'서울':'서울특별시','부산':'부산광역시','대구':'대구광역시','인천':'인천광역시','광주':'광주광역시','대전':'대전광역시','울산':'울산광역시','세종':'세종특별자치시','경기':'경기도','강원':'강원특별자치도','충북':'충청북도','충남':'충청남도','전북':'전북특별자치도','전남':'전라남도','경북':'경상북도','경남':'경상남도','제주':'제주특별자치도'};
  const first=text.split(/\\s+/)[0];
  const name=Object.values(names).find(n=>n===first)||aliases[first]||({'강원도':'강원특별자치도','전라북도':'전북특별자치도'}[first]);
  return {name:name||'지역 확인 필요',isSeoul:name==='서울특별시',known:Boolean(name)};
}

function scanIsSeoulCandidate(candidate){
  return scanCandidateRegion(candidate).isSeoul;
}

async function scanSeoulRequest(service,key,start,end,tail=''){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),22000);
  try{
    const response=await fetch('https://jinsul-seoul-proxy.yms0127.workers.dev/seoul',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,key,start,end,tail:decodeURIComponent(tail)}),cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('서울 API 중계 응답 오류 (HTTP '+response.status+')');
    const payload=await response.json();
    if(payload?.error)throw new Error('서울 API 중계 요청을 처리하지 못했습니다.');
    return payload;
  }catch(error){
    if(error.name==='AbortError')throw new Error('서울 API 응답 대기시간을 초과했습니다.');
    if(error instanceof TypeError)throw new Error('서울 API 중계 서버에 연결할 수 없습니다. HTTPS 접속 주소와 중계 서버 상태를 확인하세요.');
    throw error;
  }finally{clearTimeout(timeout);}
}`);
replaceFunction('scanFetchSeoulPopulation',`async function scanFetchSeoulPopulation(hotspot){
  const payload=await scanSeoulRequest('citydata_ppltn',SEOUL_REALTIME_API_KEY,1,5,hotspot.name);
  const resultCode=payload?.RESULT?.['RESULT.CODE']||payload?.RESULT?.CODE;
  if(resultCode&&resultCode!=='INFO-000')throw scanApiCodeError(resultCode);
  const rows=payload?.['SeoulRtd.citydata_ppltn'];
  if(!Array.isArray(rows)||!rows.length)throw new Error('실시간 인구 데이터 없음');
  return scanNormalizePopulation(rows[0],hotspot);
}`);
replaceFunction('scanFetchSeoulCommerceRows',`async function scanFetchSeoulCommerceRows(service,start,end,tail=''){
  const payload=await scanSeoulRequest(service,SEOUL_COMMERCE_API_KEY,start,end,tail);
  const block=payload?.[service];
  const code=String(block?.RESULT?.CODE||payload?.RESULT?.CODE||'');
  if(code==='INFO-200')return {rows:[],total:0};
  if(code&&code!=='INFO-000')throw scanApiCodeError(code);
  if(!block||!Array.isArray(block.row))throw new Error('서울시 상권 응답 구조를 확인하지 못했습니다.');
  return {rows:block.row,total:Number(block.list_total_count||0)};
}`);
s=s.replace("data.apiConnected=floatingResult.status==='fulfilled'||storeResult.status==='fulfilled';",`data.apiConnected=floatingResult.status==='fulfilled'||storeResult.status==='fulfilled';
  data.apiPartial=floatingResult.status==='rejected'||storeResult.status==='rejected';
  data.apiEmpty=floatingResult.status==='fulfilled'&&storeResult.status==='fulfilled'&&!data.floating&&!storeResult.value.length;
  if(storeResult.status==='fulfilled'&&!storeResult.value.length){data.stores={count:null,open:null,close:null};notices.push('선택 분기의 점포 자료가 없습니다. 실제 0곳을 의미하지 않습니다.');}`);
const old="  $('scanReportCoverage').innerHTML=scanReportTable([['데이터','상태','공간 기준'],...statuses.map(([name,ok,scope])=>[name,ok?'<b style=\"color:#047857\">연결</b>':'<span style=\"color:#94a3b8\">미연결</span>',scope])]);";
if(!s.includes(old))throw Error('coverage target missing');
s=s.replace(old,`  const region=scanCandidateRegion(result.candidate);
  const regionLabel=scanEscapeHTML([region.name,result.candidate?.sggName,result.candidate?.admName].filter(Boolean).join(' '));
  const coverage=scanRegionalCoverage(result);
  $('scanReportCoverage').innerHTML='<div class="scanLimitNote" style="display:block">검색 지역: '+regionLabel+' · SGIS는 기준연도 행정구역 인구, 상가는 선택 반경 내 업소입니다. 실시간 인구·분기 유동인구와 구분해서 확인하세요.</div>'+scanReportTable([['데이터','상태','공간 기준'],...statuses.map(([name,ok,scope])=>[name,coverage[name]|| (ok?'연결':'조회 불가'),scope])]);`);
s=s.replace('function scanIsSeoulCandidate(candidate){',`function scanRegionalCoverage(result){
  const region=scanCandidateRegion(result.candidate);
  if(!region.known)return {'서울 실시간':'지역 확인 필요','서울 공식상권':'지역 확인 필요'};
  if(!region.isSeoul)return {'서울 실시간':'제공 지역 아님','서울 공식상권':'제공 지역 아님'};
  const radius=Number(result.radiusMeters)||1000;
  return {'서울 실시간':result.population?'연결':scanNearestSeoulHotspots(result.candidate,1,radius).length?'조회 불가 / 자료 없음':'반경 내 지정지점 없음','서울 공식상권':result.commerce?.apiEmpty?'자료 없음':result.commerce?.apiConnected?(result.commerce.apiPartial?'일부 연결':'연결'):scanNearestTradeAreas(result.candidate,1,radius).length?'조회 불가':'반경 내 중심점 없음'};
}

function scanIsSeoulCandidate(candidate){`);
s=s.replace('스캔 완료 · 카카오 경쟁','스캔 완료 · ${scanCandidateRegion(candidate).name} · 카카오 경쟁');
fs.writeFileSync(file,s);
console.log('Created '+file);
