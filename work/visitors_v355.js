const scanVisitorCache=new Map();

function scanVisitorDates(now=new Date()){
  // Monthly endpoints are not offered: compare three month-end daily observations.
  return Array.from({length:3},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-i,0);return String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');});
}

async function scanVisitorDay(day){
  if(scanVisitorCache.has(day))return scanVisitorCache.get(day);
  const promise=(async()=>{
    const rows=[];let total=1;
    for(let page=1;rows.length<total;page++){
      if(page>5)throw new Error('전국 방문자 자료 조회 한도를 초과했습니다.');
      const query=new URLSearchParams({serviceKey:PUBLIC_DATA_API_KEY,MobileOS:'ETC',MobileApp:'JINSULMAP',numOfRows:'1000',pageNo:String(page),startYmd:day,endYmd:day,_type:'json'});
      const data=scanApiEnvelope(await scanFetchApiDocument('https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList?'+query,30000));
      total=data.total;rows.push(...data.rows);
      if(!data.rows.length&&rows.length<total)throw new Error('전국 방문자 자료 일부 페이지가 누락되었습니다.');
    }
    return rows;
  })();
  scanVisitorCache.set(day,promise);promise.catch(()=>{if(scanVisitorCache.get(day)===promise)scanVisitorCache.delete(day);});return promise;
}

function scanVisitorSelect(rows,candidate,day){
  const code=String(candidate.legalCode||'').slice(0,5);
  if(!/^\d{5}$/.test(code))return [];
  return rows.filter(r=>String(r.signguCode)===code&&String(r.baseYmd)===day).map(r=>({date:day,region:String(r.signguNm||''),kind:String(r.touDivNm||r.touDivCd||'방문자'),value:r.touNum===undefined||r.touNum===null||String(r.touNum).trim()===''?null:scanNumber(r.touNum)}));
}

async function scanPrepareVisitors(candidate,token){
  scanState.visitors={status:'loading',rows:[],region:candidate.sggName||''};
  if(!/^\d{5}/.test(String(candidate.legalCode||''))){scanState.visitors={status:'unknown',rows:[],message:'검색 주소의 법정 시군구 코드가 필요합니다.'};return;}
  const rows=[],errors=[];
  for(const day of scanVisitorDates()){
    try{rows.push(...scanVisitorSelect(await scanVisitorDay(day),candidate,day));}
    catch(e){errors.push(scanApiErrorMessage(e));break;}
    if(token!==scanState.requestToken)return;
  }
  if(token!==scanState.requestToken)return;
  scanState.visitors={status:errors.length?(rows.length?'partial':'error'):rows.length?'connected':'empty',rows,region:candidate.sggName||'',message:errors.join(' ')};
}

function scanRenderVisitors(data){
  if(!data)return '<div class="scanEmpty">전국 방문인구 미조회</div>';
  const note='<p class="scanReportFoot">한국관광공사 · 시군구별 이동통신 기반 일별 방문자. 최근 3개월 말일 비교이며 월 합계·실시간·선택 반경 인구가 아닙니다. 일상생활권 밖 방문 기준으로 거주·통근·통학 인구와 다릅니다. 지역·날짜 간 임의 합산하지 않습니다. <a href="https://www.data.go.kr/data/15101972/openapi.do" target="_blank" rel="noopener noreferrer">공식 자료 및 활용신청 ↗</a></p>';
  if(!data.rows.length)return '<div class="scanInsight warn">'+scanEscapeHTML(data.message||(data.status==='empty'?'조회한 세 기준일에 해당 시군구 자료가 없습니다. 0명이 아닙니다.':'방문인구를 조회하는 중입니다.'))+'</div><p>인증·접근 권한 오류라면 관광공사 지역별 방문자수 서비스의 활용 승인이 필요합니다.</p>'+note;
  const kinds=[...new Set(data.rows.map(r=>r.kind))];
  return '<div class="scanVisitorHeading"><span>시군구 방문 흐름</span><h3>'+scanEscapeHTML(data.rows[0].region||data.region)+'</h3></div>'+kinds.map(kind=>scanVisualBars(kind,data.rows.filter(r=>r.kind===kind).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>[r.date.slice(0,4)+'.'+r.date.slice(4,6)+'.'+r.date.slice(6),r.value]),'violet')).join('')+(data.message?'<p>'+scanEscapeHTML(data.message)+'</p>':'')+note;
}
