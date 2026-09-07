const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.3.html','utf8').replaceAll('3.5.3','3.5.4');
function fn(name,code){const re=new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm');if(!re.test(s))throw Error(name);s=s.replace(re,()=>code);}
fn('scanSeoulRequest',`async function scanSeoulRequest(service,key,start,end,tail=''){
  if(location.protocol==='file:')throw new Error('로컬 파일에서는 서울 API를 사용할 수 없습니다. 상단의 최신 온라인 버전으로 열어주세요. [v3.5.4]');
  for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),22000);
    try{
      const response=await fetch('https://jinsul-seoul-proxy.yms0127.workers.dev/seoul',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,key,start,end,tail:decodeURIComponent(tail)}),cache:'no-store',signal:controller.signal});
      if(!response.ok){const error=new Error('서울 중계 HTTP '+response.status+' [v3.5.4]');error.retryable=response.status===429||response.status>=500;throw error;}
      const payload=await response.json();if(payload?.error)throw new Error('서울 중계 요청 처리 실패 [v3.5.4]');return payload;
    }catch(error){
      const transient=error.retryable||error.name==='TypeError'||error.name==='AbortError';
      if(transient&&attempt===0){await new Promise(resolve=>setTimeout(resolve,600));continue;}
      if(error.name==='AbortError')throw new Error('서울 API 응답 시간 초과 · 자동 재시도 1회 완료 [v3.5.4]');
      if(error.name==='TypeError')throw new Error('서울 중계 연결 실패 · 자동 재시도 1회 완료. 최신 온라인 주소와 네트워크를 확인하세요. [v3.5.4]');
      throw error;
    }finally{clearTimeout(timeout);}
  }
}`);
fn('scanFloatingRows',`function scanSeoulQuarters(now=new Date()){
  const current=now.getFullYear()*4+Math.floor(now.getMonth()/3);
  return Array.from({length:4},(_,i)=>{const q=current-1-i;return String(Math.floor(q/4))+String(q%4+1);});
}

async function scanFloatingRows(force=false){
  if(force)scanState.commerceFloatingPromise=null;
  if(!scanState.commerceFloatingPromise){
    const promise=(async()=>{
      for(const period of scanSeoulQuarters()){
        const first=await scanFetchSeoulCommerceRows('VwsmTrdarFlpopQq',1,1000,period);
        if(!first.rows.length)continue;
        if(first.total>10000)throw new Error('서울 유동인구 자료가 조회 한도를 초과했습니다.');
        const rows=[...first.rows];
        for(let start=1001;start<=first.total;start+=1000){const page=await scanFetchSeoulCommerceRows('VwsmTrdarFlpopQq',start,Math.min(start+999,first.total),period);rows.push(...page.rows);}
        if(rows.length<first.total)throw new Error('서울 유동인구 일부 페이지가 누락됐습니다. 다시 조회해주세요.');
        rows.period=period;return rows;
      }
      return [];
    })();
    scanState.commerceFloatingPromise=promise;
    promise.catch(()=>{if(scanState.commerceFloatingPromise===promise)scanState.commerceFloatingPromise=null;});
  }
  return scanState.commerceFloatingPromise;
}`);
fn('scanStoreRows',`async function scanStoreRows(code,force=false){
  if(force)scanState.commerceStoreCache.delete(code);
  if(scanState.commerceStoreCache.has(code))return scanState.commerceStoreCache.get(code);
  const promise=(async()=>{
    for(const period of scanSeoulQuarters()){
      const result=await scanFetchSeoulCommerceRows('VwsmTrdarStorQq',1,1000,period+'/'+encodeURIComponent(code));
      if(result.total>1000)throw new Error('선택 상권의 점포 자료가 조회 한도를 초과했습니다.');
      if(result.rows.length){result.rows.period=period;return result.rows;}
    }
    return [];
  })();
  scanState.commerceStoreCache.set(code,promise);
  promise.catch(()=>{if(scanState.commerceStoreCache.get(code)===promise)scanState.commerceStoreCache.delete(code);});
  return promise;
}`);
s=s.replace('floatingPeriod:SEOUL_COMMERCE_FLOATING_PERIOD,storePeriod:SEOUL_COMMERCE_STORE_PERIOD','floatingPeriod:floatingRows.period||\'자료 없음\',storePeriod:storeRows.period||\'자료 없음\'');
s=s.replace('peak:times[0],male:',"peak:times.some(v=>v[1]>0)?times[0]:['자료 없음',null],breakdown:scanFloatingBreakdown(f),male:");
const insert=`function scanFloatingBreakdown(row){
  const read=(label,key)=>[label,row?.[key]===undefined||row?.[key]===null||String(row[key]).trim()===''?null:scanNumber(row[key])];
  return {
    times:[['00~06시','TMZON_00_06_FLPOP_CO'],['06~11시','TMZON_06_11_FLPOP_CO'],['11~14시','TMZON_11_14_FLPOP_CO'],['14~17시','TMZON_14_17_FLPOP_CO'],['17~21시','TMZON_17_21_FLPOP_CO'],['21~24시','TMZON_21_24_FLPOP_CO']].map(v=>read(...v)),
    days:[['월','MON_FLPOP_CO'],['화','TUES_FLPOP_CO'],['수','WED_FLPOP_CO'],['목','THUR_FLPOP_CO'],['금','FRI_FLPOP_CO'],['토','SAT_FLPOP_CO'],['일','SUN_FLPOP_CO']].map(v=>read(...v)),
    ages:[['10대','AGRDE_10_FLPOP_CO'],['20대','AGRDE_20_FLPOP_CO'],['30대','AGRDE_30_FLPOP_CO'],['40대','AGRDE_40_FLPOP_CO'],['50대','AGRDE_50_FLPOP_CO'],['60대 이상','AGRDE_60_ABOVE_FLPOP_CO']].map(v=>read(...v))
  };
}

function scanRenderFloatingBreakdown(f){
  if(!f?.breakdown)return '';
  const group=(title,rows)=>{
    const available=rows.filter(v=>v[1]!==null);if(!available.length)return '<p>'+title+': 세부 자료 없음</p>';
    const total=available.reduce((sum,v)=>sum+v[1],0);
    return '<h4>'+title+'</h4>'+rows.map(([label,value])=>'<div style="display:flex;gap:8px;align-items:center;margin:5px 0"><span style="width:65px">'+label+'</span><meter style="flex:1" min="0" max="'+(total||1)+'" value="'+(value||0)+'"></meter><span>'+(value===null?'자료 없음':Math.round(value).toLocaleString()+'명'+(total?' · '+(value/total*100).toFixed(1)+'%':''))+'</span></div>').join('');
  };
  return '<details class="scanCommerceFoot"><summary>유동인구 시간대·요일·연령 상세</summary>'+group('시간대',f.breakdown.times)+group('요일',f.breakdown.days)+group('연령대',f.breakdown.ages)+'<p>표시된 항목 합계 대비 비중입니다. 분기 공식상권 단위이며 실시간·보행 반경 인구와 다릅니다.</p><a href="https://golmok.seoul.go.kr/owner/owner.do" target="_blank" rel="noopener noreferrer">서울시 상권분석서비스에서 비교</a></details>';
}

`;
s=s.replace('function scanBuildCommerceData(',insert+'function scanBuildCommerceData(');
s=s.replace("${notices.length?`<div class=\"scanLimitNote\"", "${scanRenderFloatingBreakdown(f)}${notices.length?`<div class=\"scanLimitNote\"");
s=s.replace('검색은 버튼을 누를 때만 실행됩니다.', '검색은 버튼을 누를 때만 실행됩니다. <a href="https://jinsul-lab.github.io/statistics-lab/jinsulmap/">최신 온라인 버전</a>');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.4.html',s);
const landing='<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=JINSUL_MAP_v3.5.4.html"><title>JINSUL MAP 최신 버전</title><a href="JINSUL_MAP_v3.5.4.html">최신 JINSUL MAP 실행</a></html>';
fs.writeFileSync('jinsulmap/index.html',landing);
console.log('Created v3.5.4 and stable entrypoint');
