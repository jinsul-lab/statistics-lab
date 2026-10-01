// Banner data helpers: API first, versioned CSV fallback. No public credential.
let bannerLoadPromise=null,bannerCacheUntil=0,bannerDataInfo={source:'',error:''};
function bannerStatus(message){const el=document.getElementById('bannerDataStatus');if(el)el.textContent=message;}
function parseBannerCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(c===','&&!quoted){row.push(cell);cell='';}
 else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV 따옴표 형식 오류');
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 const head=rows.shift();if(!head||!head.includes('위도')||!head.includes('경도'))throw new Error('CSV 좌표 항목 없음');
 return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h.trim(),r[i]||''])));
}
function normalizeBannerRows(rows){
 const points=[],seen=new Set();let invalid=0,duplicates=0;
 for(const r of rows){const v=(a,b)=>String(r[a]??r[b]??'').trim();const lat=Number(v('lat','위도')),lng=Number(v('lot','경도'));
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<32||lat>39.9||lng<124||lng>132){invalid++;continue;}
 const code=v('bbsNm','게시대명'),position=v('bbsPstnNm','게시대위치명'),provider=v('insttCode','제공기관코드');
 const id=[provider,code,position,lat,lng].join('|');if(seen.has(id)){duplicates++;continue;}seen.add(id);
 points.push({type:'banner',id,lat,lng,title:position?(code?position+' · '+code:position):(code||'현수막 게시대'),addr:v('lctnRoadNm','소재지도로명주소')||v('lctnLotnoAddr','소재지지번주소'),phone:v('mngInstTelno','관리기관전화번호'),manager:v('mngInstNm','관리기관명'),date:v('dataCrtrYmd','데이터기준일자'),size:v('bbsSpcfct','현수막규격'),faces:v('bbsCnt','게시면수'),fee:v('pstgAmt','부착금액')});
 }return {points,invalid,duplicates,received:rows.length};
}
async function fetchBannerPage(page){
 const res=await fetch('https://jinsul-banner-proxy.yms0127.workers.dev/banner?page='+page,{signal:AbortSignal.timeout(23000)});
 if(!res.ok)throw new Error('API HTTP '+res.status);const data=await res.json();
 if(!data.ok||data.page!==page||!Array.isArray(data.items)||!Number.isInteger(data.totalCount)||data.totalCount<0||data.totalCount>100000||data.numOfRows!==1000)throw new Error('API 응답 형식 오류');return data;
}
async function fetchAllBannerRows(){
 const first=await fetchBannerPage(1),pages=Math.ceil(first.totalCount/1000),rows=[...first.items],seenPages=new Set([JSON.stringify(first.items)]);
 for(let page=2;page<=pages;page+=3){const batch=await Promise.all(Array.from({length:Math.min(3,pages-page+1)},(_,i)=>fetchBannerPage(page+i)));
 for(const data of batch){if(data.totalCount!==first.totalCount)throw new Error('조회 중 전체 건수 변경');const fingerprint=JSON.stringify(data.items);if(data.items.length&&seenPages.has(fingerprint))throw new Error('API 페이지 중복');seenPages.add(fingerprint);rows.push(...data.items);}}
 if(rows.length!==first.totalCount)throw new Error('API 일부 자료 누락');return rows;
}
async function loadBannerPoints(){
 if(bannerPointsCache&&Date.now()<bannerCacheUntil)return bannerPointsCache;
 if(bannerLoadPromise)return bannerLoadPromise;
 bannerStatus('현수막게시대 · 공식 API 조회 중…');
 bannerLoadPromise=(async()=>{let rows,source,error='';
 try{rows=await fetchAllBannerRows();source='공식 API';}
 catch(e){error=e.message;try{const res=await fetch(new URL('./banner_2026-01-22.csv',location.href),{signal:AbortSignal.timeout(20000)});if(!res.ok)throw new Error('CSV HTTP '+res.status);const buf=await res.arrayBuffer();let text=new TextDecoder('utf-8').decode(buf);if(text.includes('\uFFFD'))text=new TextDecoder('euc-kr').decode(buf);rows=parseBannerCsv(text);source='보관 CSV (파일명 2026-01-22)';}catch{bannerDataInfo={source:'',error:'API·보관 CSV 모두 조회 실패'};bannerStatus('현수막게시대 · API·보관 CSV 모두 조회 실패. 다시 선택하면 재시도합니다.');return null;}}
 const result=normalizeBannerRows(rows);if(rows.length&&!result.points.length){bannerDataInfo={source,error:'유효 좌표 없음'};bannerStatus('현수막게시대 · 자료에 유효한 좌표가 없습니다.');return null;}
 const dates=[...new Set(result.points.map(p=>p.date).filter(Boolean))].sort();bannerDataInfo={...result,points:undefined,source,error,dateRange:dates.length?dates[0]+' ~ '+dates[dates.length-1]:'미제공'};bannerPointsCache=result.points;bannerCacheUntil=Date.now()+(error?60000:3600000);window.__bannerAllRows=result.points;window.__bannerDataInfo=bannerDataInfo;return result.points;
 })();try{return await bannerLoadPromise;}finally{bannerLoadPromise=null;}
}
function bannerResultStatus(inBounds,shown){const d=bannerDataInfo;bannerStatus('현수막게시대 · '+d.source+(d.error?' · API 미연결, 보관자료 사용':'')+' · 전체 좌표 '+(bannerPointsCache?.length||0).toLocaleString()+'건 · 지도 범위 '+inBounds+'건 / 표시 '+shown+'건'+(d.invalid?' · 좌표 누락·오류 '+d.invalid+'건 제외':'')+(d.duplicates?' · 중복 '+d.duplicates+'건 제외':'')+' · 자료 기준일 '+d.dateRange+' · 기관별 제공 범위·기준일이 달라 미표시가 시설 부재를 뜻하지 않습니다.');}
