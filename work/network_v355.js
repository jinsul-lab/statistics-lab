const scanNetwork={active:new Map(),controllers:new Set(),metrics:[],generation:0};

function scanApiFamily(url){
  const u=new URL(url);
  if(u.hostname.includes('seoul-proxy'))return '서울 인구·상권';
  if(u.hostname.includes('rone-proxy'))return 'R-ONE';
  if(u.hostname.includes('sgis'))return 'SGIS';
  if(/hospInfo|HospInfo|hospDetail|hospDtl|medicInst/i.test(u.pathname))return '심평원';
  if(/B551011/.test(u.pathname))return '전국 방문인구';
  if(/B553077/.test(u.pathname))return '전국 상가';
  if(/Bld|bld|HUB/.test(u.pathname))return '건축물대장';
  if(/RTMS|Trade/.test(u.pathname))return '실거래';
  return '공식 API';
}

function scanCancelNetwork(){
  scanNetwork.generation++;for(const c of scanNetwork.controllers)c.abort();
}

function scanRenderNetwork(){
  const holder=document.getElementById('scanNetworkReport');if(!holder)return;
  const groups=new Map();
  for(const m of scanNetwork.metrics){const a=groups.get(m.family)||[];a.push(m);groups.set(m.family,a);}
  holder.innerHTML='<p>전송·본문 수신 기준입니다. HTTP 성공과 실제 자료 유무는 각 항목에서 별도로 확인하세요.</p>'+scanReportTable([['API','요청','수신','실패','재시도','최대 응답','대기','최근 오류'],...[...groups].map(([name,a])=>[name,a.length,a.filter(x=>x.status==='수신').length,a.filter(x=>x.status!=='수신').length,a.filter(x=>x.attempt>1).length,(Math.max(...a.map(x=>x.ms))/1000).toFixed(1)+'초',(Math.max(...a.map(x=>x.queueMs))/1000).toFixed(1)+'초',a.filter(x=>x.status!=='수신').at(-1)?.status||'없음'])]);
}

async function scanNetworkRequest(url,options={},timeoutMs=15000){
  const family=scanApiFamily(url),generation=scanNetwork.generation;
  const cancelled=()=>{const e=new Error('검색이 변경되어 이전 요청을 취소했습니다.');e.name='CancelledError';return e;};
  const queuedAt=Date.now();
  while((scanNetwork.active.get(family)||0)>=2){if(generation!==scanNetwork.generation)throw cancelled();await new Promise(r=>setTimeout(r,80));}
  if(generation!==scanNetwork.generation)throw cancelled();
  scanNetwork.active.set(family,(scanNetwork.active.get(family)||0)+1);
  const queueMs=Date.now()-queuedAt;
  try{
    for(let attempt=1;attempt<=2;attempt++){
      if(generation!==scanNetwork.generation)throw cancelled();
      const controller=new AbortController();scanNetwork.controllers.add(controller);
      const budget=Math.max(timeoutMs,attempt===1?30000:45000),started=Date.now();
      const timer=setTimeout(()=>controller.abort(),budget);let status='오류';
      try{
        const response=await fetch(url,{...options,signal:controller.signal});
        if(!response.ok){const e=new Error('API HTTP 응답 오류 ('+response.status+')');e.retryable=response.status===408||response.status===429||response.status>=500;e.httpStatus=response.status;throw e;}
        const text=await response.text();
        let upstreamCode='';
        try{const p=JSON.parse(text);upstreamCode=String(p?.response?.header?.resultCode??p?.header?.resultCode??'');}catch{upstreamCode=text.match(/<(?:resultCode|returnReasonCode)>\s*(05|23)\s*<\//)?.[1]||'';}
        if(['05','23'].includes(upstreamCode)){const e=new Error('제공기관 응답 지연 또는 초당 호출 제한 (코드 '+upstreamCode+')');e.retryable=true;throw e;}
        if(generation!==scanNetwork.generation)throw cancelled();
        status='수신';return text;
      }catch(error){
        if(generation!==scanNetwork.generation){status='취소';throw cancelled();}
        status=error.name==='AbortError'?'시간 초과':error.name==='TypeError'?'네트워크/CORS':error.httpStatus?'HTTP '+error.httpStatus:'오류';
        const retry=error.retryable||error.name==='AbortError'||error.name==='TypeError';
        if(!(retry&&attempt===1))throw new Error(scanApiErrorMessage(error)+(attempt>1?' · 자동 재시도 1회 완료':''));
      }finally{
        clearTimeout(timer);scanNetwork.controllers.delete(controller);
        if(generation===scanNetwork.generation){scanNetwork.metrics.push({family,attempt,ms:Date.now()-started,queueMs,status});if(scanNetwork.metrics.length>200)scanNetwork.metrics.shift();scanRenderNetwork();}
      }
      await new Promise(r=>setTimeout(r,900));
    }
  }finally{scanNetwork.active.set(family,Math.max(0,(scanNetwork.active.get(family)||1)-1));}
}
