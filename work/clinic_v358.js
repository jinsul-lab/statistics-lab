const scanClinicKinds={'CS200006':'일반의원','CS200007':'치과의원','CS200008':'한의원'};
const scanClinic={token:0,key:'',industry:'CS200006',data:null,busy:false,salesCache:new Map()};
function scanClinicNumber(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  return scanNumber(value);
}
function scanClinicFind(rows,area,period,industry){
  const matches=rows.filter(r=>String(r.TRDAR_CD)===String(area)&&String(r.STDR_YYQU_CD)===String(period)&&String(r.SVC_INDUTY_CD)===industry);
  if(matches.length>1)throw new Error('동일 상권·분기·업종의 중복 자료가 있어 합산하지 않았습니다.');
  return matches[0]||null;
}
function scanClinicStore(row){
  if(!row)return null;
  return {total:scanClinicNumber(row.SIMILR_INDUTY_STOR_CO),general:scanClinicNumber(row.STOR_CO),franchise:scanClinicNumber(row.FRC_STOR_CO),open:scanClinicNumber(row.OPBIZ_STOR_CO),close:scanClinicNumber(row.CLSBIZ_STOR_CO),openRate:scanClinicNumber(row.OPBIZ_RT),closeRate:scanClinicNumber(row.CLSBIZ_RT)};
}
function scanClinicBreakdown(row,items){
  return items.map(([label,key])=>[label,scanClinicNumber(row?.[key])]);
}
function scanClinicSales(row){
  if(!row)return null;
  return {amount:scanClinicNumber(row.THSMON_SELNG_AMT),count:scanClinicNumber(row.THSMON_SELNG_CO),
    days:scanClinicBreakdown(row,[['월','MON_SELNG_AMT'],['화','TUES_SELNG_AMT'],['수','WED_SELNG_AMT'],['목','THUR_SELNG_AMT'],['금','FRI_SELNG_AMT'],['토','SAT_SELNG_AMT'],['일','SUN_SELNG_AMT']]),
    times:scanClinicBreakdown(row,[['00~06시','TMZON_00_06_SELNG_AMT'],['06~11시','TMZON_06_11_SELNG_AMT'],['11~14시','TMZON_11_14_SELNG_AMT'],['14~17시','TMZON_14_17_SELNG_AMT'],['17~21시','TMZON_17_21_SELNG_AMT'],['21~24시','TMZON_21_24_SELNG_AMT']]),
    ages:scanClinicBreakdown(row,[['10대','AGRDE_10_SELNG_AMT'],['20대','AGRDE_20_SELNG_AMT'],['30대','AGRDE_30_SELNG_AMT'],['40대','AGRDE_40_SELNG_AMT'],['50대','AGRDE_50_SELNG_AMT'],['60대 이상','AGRDE_60_ABOVE_SELNG_AMT']]),
    gender:scanClinicBreakdown(row,[['남성','ML_SELNG_AMT'],['여성','FML_SELNG_AMT']])};
}
async function scanClinicSalesPage(period,start,end){
  const raw=await scanNetworkRequest('https://jinsul-seoul-proxy.yms0127.workers.dev/seoul',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'VwsmTrdarSelngQq',key:SEOUL_COMMERCE_API_KEY,start,end,tail:period,clinicOnly:true}),cache:'no-store'},30000);
  let payload;try{payload=JSON.parse(raw);}catch{throw new Error('의원 매출 응답 형식 오류');}
  if(payload.error)throw new Error('서울 매출 중계 요청에 실패했습니다.');
  const block=payload.VwsmTrdarSelngQq,code=block?.RESULT?.CODE||payload.RESULT?.CODE;
  if(code==='INFO-200')return {rows:[],total:0,sourceCount:0};
  if(code&&code!=='INFO-000')throw scanApiCodeError(code);
  if(!block?.clinic_filtered||!Array.isArray(block.row))throw new Error('서울 의원 매출 중계 업데이트가 필요합니다.');
  const total=Number(block.list_total_count),sourceCount=Number(block.source_page_count);
  if(!Number.isInteger(total)||total<0||total>50000||sourceCount!==Math.max(0,Math.min(end,total)-start+1))throw new Error('의원 매출 원본 페이지가 누락되어 결과를 표시하지 않았습니다.');
  if(block.row.some(r=>String(r.STDR_YYQU_CD)!==period||!scanClinicKinds[String(r.SVC_INDUTY_CD)]))throw new Error('의원 매출의 분기·업종 조건이 일치하지 않습니다.');
  return {rows:block.row,total,sourceCount};
}
async function scanClinicSalesQuarter(period,onProgress=()=>{},isCurrent=()=>true){
  const cached=scanClinic.salesCache.get(period);
  if(cached){onProgress('저장된 의원 매출을 불러왔습니다.');return cached;}
  const first=await scanClinicSalesPage(period,1,1000),rows=[...first.rows];
  const pages=Math.ceil(first.total/1000);let done=1;
  onProgress('의원 매출 '+Math.min(done,pages)+' / '+pages+'페이지');
  // Two pages at a time, independent of the main scan. Do not show incomplete city data.
  for(let start=1001;start<=first.total;start+=2000){
    if(!isCurrent())throw new Error('후보지 변경으로 의원 매출 조회를 중단했습니다.');
    const starts=[start,start+1000].filter(n=>n<=first.total);
    const results=await Promise.allSettled(starts.map(n=>scanClinicSalesPage(period,n,Math.min(n+999,first.total))));
    for(const r of results){if(r.status==='rejected')throw r.reason;if(r.value.total!==first.total)throw new Error('조회 중 매출 원본 건수가 변경되었습니다. 다시 조회해주세요.');rows.push(...r.value.rows);done++;}
    onProgress('의원 매출 '+done+' / '+pages+'페이지');
  }
  scanClinic.salesCache.set(period,rows);return rows;
}
function scanClinicStatus(message){
  const node=$('scanClinicStatus');if(node)node.textContent=message;
}
function scanClinicControls(result){
  const areas=scanState.commerceCandidates||[];
  const selected=scanClinic.data?.area?.code||result.commerce?.area?.code||areas[0]?.code;
  $('scanClinicControls').innerHTML='<label>서울 공식상권 <select id="scanClinicArea" class="scanSelect" aria-label="의원 분석 공식상권">'+areas.map(a=>'<option value="'+scanEscapeHTML(a.code)+'"'+(a.code===selected?' selected':'')+'>'+scanEscapeHTML(a.name)+' · '+scanFormatDistance(a.distance)+'</option>').join('')+'</select></label><label>의원 업종 <select id="scanClinicIndustry" class="scanSelect" aria-label="의원 분석 업종">'+Object.entries(scanClinicKinds).map(([code,name])=>'<option value="'+code+'"'+(code===scanClinic.industry?' selected':'')+'>'+name+'</option>').join('')+'</select></label><button class="btn outline" id="scanClinicRetry" type="button">다시 조회</button>';
  $('scanClinicArea').onchange=()=>scanEnsureClinic(result,true);
  $('scanClinicIndustry').onchange=e=>{scanClinic.industry=e.target.value;scanRenderClinic();};
  $('scanClinicRetry').onclick=()=>scanEnsureClinic(result,true);
}
async function scanEnsureClinic(result=scanState.result,force=false){
  if(!result||!$('scanClinicBody'))return;
  const areas=scanState.commerceCandidates||[];
  if(!scanIsSeoulCandidate(result.candidate)||!areas.length){scanClinic.token++;scanClinic.key='';scanClinic.busy=false;scanClinic.data=null;$('scanClinicControls').innerHTML='';$('scanClinicBody').innerHTML='<div class="scanInsight">서울시 의원 업종 통계는 선택 반경 안에 공식상권 중심점이 있는 서울 후보지에 제공됩니다. 전국 진료과별 의원은 기존 심평원 분석을 이용하세요.</div>';scanClinicStatus('제공 범위 밖');return;}
  const code=force?$('scanClinicArea')?.value:result.commerce?.area?.code;
  const area=areas.find(a=>a.code===code)||areas[0];
  const key=[scanState.requestToken,area.code].join(':');
  if(!force&&scanClinic.key===key){scanRenderClinic();return;}
  const token=++scanClinic.token,requestToken=scanState.requestToken;
  scanClinic.key=key;scanClinic.busy=true;scanClinic.data={area,periods:scanSeoulQuarters(),stores:{},salesRows:null,salesPeriod:null,salesError:'',errors:[]};
  scanClinicControls(result);scanClinicStatus('의원 점포·개폐업 자료를 불러오는 중입니다.');scanRenderClinic();
  const current=()=>token===scanClinic.token&&requestToken===scanState.requestToken;
  const data=scanClinic.data;
  try{
    const responses=await Promise.allSettled(data.periods.map(async period=>{const r=await scanFetchSeoulCommerceRows('VwsmTrdarStorQq',1,1000,period+'/'+area.code);if(r.total>1000||r.rows.length!==r.total||r.rows.some(row=>String(row.TRDAR_CD)!==area.code||String(row.STDR_YYQU_CD)!==period))throw new Error('점포 자료의 범위 또는 페이지가 일치하지 않습니다.');return r.rows;}));
    if(!current())return;
    responses.forEach((r,i)=>{data.stores[data.periods[i]]=r.status==='fulfilled'?r.value:null;if(r.status==='rejected')data.errors.push(scanPeriodLabel(data.periods[i])+' 점포 조회 실패');});
    data.salesPeriod=data.periods.find(p=>data.stores[p]?.length)||data.periods[0];
    scanRenderClinic();
    data.salesRows=await scanClinicSalesQuarter(data.salesPeriod,message=>{if(current())scanClinicStatus(message+' · 지도와 다른 통계는 계속 사용할 수 있습니다.');},current);
  }catch(error){if(current())data.salesError=scanApiErrorMessage(error);}
  finally{if(current()){scanClinic.busy=false;scanRenderClinic();scanClinicStatus(data.salesError?'점포 표시 완료 · 매출 조회 실패. 다시 조회할 수 있습니다.':'의원 업종 분석 완료 · '+scanPeriodLabel(data.salesPeriod));}}
}
function scanRenderClinic(){
  const d=scanClinic.data;if(!d)return;
  Object.keys(scanReportCharts).filter(key=>key.startsWith('clinic')).forEach(key=>{try{scanReportCharts[key].destroy();}catch{}delete scanReportCharts[key];});
  const kind=scanClinic.industry,period=d.salesPeriod||d.periods[0];
  let store,sales,series;
  try{store=scanClinicStore(scanClinicFind(d.stores[period]||[],d.area.code,period,kind));sales=scanClinicSales(scanClinicFind(d.salesRows||[],d.area.code,period,kind));series=[...d.periods].reverse().map(p=>({period:p,...scanClinicStore(scanClinicFind(d.stores[p]||[],d.area.code,p,kind))}));}catch(e){$('scanClinicBody').textContent=e.message;return;}
  const money=v=>v===null||v===undefined?'자료 없음':scanFormatKrw(v);
  const previous=series.find(r=>r.period===d.periods[d.periods.indexOf(period)+1]);
  const change=store?.total!==null&&store?.total!==undefined&&previous?.total!==null&&previous?.total!==undefined?store.total-previous.total:null;
  const metrics=scanDetailMetric('의원 점포 수',scanDetailNumber(store?.total,'곳'),'서울 '+scanClinicKinds[kind]+' 업종 전체')+scanDetailMetric('개업 / 폐업',scanDetailNumber(store?.open,'곳')+' / '+scanDetailNumber(store?.close,'곳'),scanPeriodLabel(period))+scanDetailMetric('전분기 점포 수 변화',change===null?'자료 없음':(change>0?'+':'')+change+'곳','같은 상권·업종·연속 분기 비교')+scanDetailMetric('추정매출 원본 금액',money(sales?.amount),scanPeriodLabel(period)+' · 서울시 추정매출');
  const basicRows=[['분기','전체 점포','개업','폐업','개업률','폐업률'],...series.map(r=>[scanPeriodLabel(r.period),scanDetailNumber(r.total,'곳'),scanDetailNumber(r.open,'곳'),scanDetailNumber(r.close,'곳'),scanDetailNumber(r.openRate,'%'),scanDetailNumber(r.closeRate,'%')])];
  $('scanClinicBody').innerHTML='<div class="scanMetricHeading"><strong>'+scanEscapeHTML(d.area.name)+' · '+scanClinicKinds[kind]+'</strong><span class="scanCaption">'+scanPeriodLabel(period)+' · 공식상권 전체</span></div><div class="scanMetricGrid">'+metrics+'</div><div class="scanInsight">일반의원은 서울시의 업종 분류입니다. 정형외과·신경외과 등 진료과별 매출이나 심평원 의원 수와 동일하지 않습니다. 선택 반경 합산·개별 병원 매출·건강보험 청구액으로 해석하지 마세요.</div>'+(d.errors.length?'<div class="scanInsight warn">'+scanEscapeHTML(d.errors.join(' · '))+'</div>':'')+'<div class="scanDetailGrid">'+scanDetailChartSection('scanClinicStoreTrend','최근 4분기 의원 수','전체 점포 수 · 미제공 분기는 선을 연결하지 않습니다.')+scanDetailChartSection('scanClinicOpenClose','개업·폐업 비교','서울시 원본 개업/폐업 건수')+'</div><div class="scanTableScroll">'+scanReportTable(basicRows)+'</div>'+(sales?'<div class="scanDetailGrid">'+scanDetailChartSection('scanClinicSalesDays','요일별 추정매출','만원 · 선택 업종·공식상권')+scanDetailChartSection('scanClinicSalesTimes','시간대별 추정매출','만원 · 각 시간대 길이가 다릅니다.')+scanDetailChartSection('scanClinicSalesAges','결제 연령대별 추정매출','만원 · 환자의 나이가 아닌 결제자 기준')+scanDetailChartSection('scanClinicSalesGender','성별 추정매출 구성','공개된 성별 금액 기준')+'</div><details><summary class="scanCaption">요일·시간대·연령·성별 금액 수치표</summary><div class="scanTableScroll">'+scanReportTable([['항목','원본 금액(원)'],['전체 추정매출',sales.amount],...sales.days,...sales.times,...sales.ages,...sales.gender].map((r,i)=>i?[r[0],scanDetailNumber(r[1],'원')]:r))+'</div></details><p class="scanReportFoot">기준 분기 '+scanPeriodLabel(period)+' · 매출 원본 필드명은 당월_매출_금액입니다. 월평균이나 연매출로 임의 환산하지 않습니다. 결제 건수 '+scanDetailNumber(sales.count,'건')+'은 고유 환자 수가 아닙니다. 연령·성별 합계는 전체 금액과 다를 수 있습니다.</p>':'<div class="scanEmpty">'+(scanClinic.busy?'의원 매출 상세를 불러오는 중입니다.':d.salesError?scanEscapeHTML(d.salesError):'선택 상권·업종·분기의 공개 매출 행이 없습니다. 0원으로 처리하지 않습니다.')+'</div>')+'<div class="scanReportFoot">출처: 서울특별시·서울신용보증재단 · <a href="https://data.seoul.go.kr/dataList/OA-15577/A/1/datasetView.do" target="_blank" rel="noopener">점포 공개 데이터</a> · <a href="https://data.seoul.go.kr/dataList/OA-15572/A/1/datasetView.do" target="_blank" rel="noopener">추정매출 공개 데이터</a> · <a href="https://golmok.seoul.go.kr/owner/owner.do" target="_blank" rel="noopener">서울시 분석서비스</a><br>원본 사이트의 보행권역/다각형과 본 앱의 공식상권은 공간 기준이 달라 수치가 다를 수 있습니다. 생존율·평균 영업기간은 현재 연결하지 않았습니다. 탐색 점수에는 반영하지 않습니다.</div>';
  const options={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}};
  const chart=(key,id,type,labels,datasets,o=options)=>scanReportChart(key,id,{type,data:{labels,datasets},options:structuredClone(o)});
  chart('clinicStores','scanClinicStoreTrend','line',series.map(r=>scanPeriodLabel(r.period)),[{label:'전체 의원(곳)',data:series.map(r=>r.total??null),borderColor:'#0369a1',backgroundColor:'#0369a11a',fill:true,spanGaps:false,tension:0}]);
  chart('clinicOpenClose','scanClinicOpenClose','bar',series.map(r=>scanPeriodLabel(r.period)),[{label:'개업(곳)',data:series.map(r=>r.open??null),backgroundColor:'#047857'},{label:'폐업(곳)',data:series.map(r=>r.close??null),backgroundColor:'#be185d'}]);
  if(sales){for(const [field,id,title,color] of [['days','Days','요일','#0369a1'],['times','Times','시간대','#6d28d9'],['ages','Ages','연령대','#be185d']])chart('clinic'+id,'scanClinicSales'+id,'bar',sales[field].map(r=>r[0]),[{label:title+' 추정매출(만원)',data:sales[field].map(r=>r[1]===null?null:r[1]/10000),backgroundColor:color}]);chart('clinicGender','scanClinicSalesGender','doughnut',sales.gender.map(r=>r[0]+' '+money(r[1])),[{data:sales.gender.map(r=>r[1]),backgroundColor:['#0369a1','#be185d']}],{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'},datalabels:{display:false}}});}
}
