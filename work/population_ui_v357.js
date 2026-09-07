// Presentation only: sources retain their own dates, units and spatial scopes.
function scanRealtimeNumber(value){
  return value===undefined||value===null||String(value).trim()===''?null:scanNumber(value);
}
function scanDetailNumber(value,unit='명'){
  return value!==null&&value!==undefined&&Number.isFinite(value)?value.toLocaleString('ko-KR',{maximumFractionDigits:unit==='명'?0:1})+unit:'자료 없음';
}
function scanDetailMetric(label,value,note=''){
  return `<div class="scanMetric"><span>${scanEscapeHTML(label)}</span><b>${scanEscapeHTML(value)}</b><small>${scanEscapeHTML(note)}</small></div>`;
}
function scanDetailChartSection(id,title,note='',wide=false){
  return `<section${wide?' class="wide"':''}><h4>${scanEscapeHTML(title)}</h4><div class="scanChartBox"><canvas id="${id}" role="img" aria-label="${scanEscapeHTML(title)}"></canvas></div><span class="scanCaption">${scanEscapeHTML(note)}</span></section>`;
}
function scanRealtimeReport(data,candidate){
  if(!data)return `<div class="scanInsight warn">${scanIsSeoulCandidate(candidate)?'선택 반경 안의 서울 지정지점 실시간 자료가 없습니다. 좌측 패널에서 지정지점 선택과 조회 상태를 확인하세요.':'서울 밖 지역은 서울 지정지점 실시간 서비스의 제공 범위가 아닙니다. 아래 전국 방문인구와 SGIS 통계를 확인하세요.'}</div>`;
  const percent=v=>scanDetailNumber(v,'%');
  const rows=[['기준 시각','최소 추정(명)','최대 추정(명)','혼잡도'],[scanEscapeHTML(data.updateTime||'시각 미제공'),scanDetailNumber(data.min,''),scanDetailNumber(data.max,''),scanEscapeHTML(data.congestion)],...(data.forecast||[]).map(r=>[scanEscapeHTML(r.time)+' · 예측',scanDetailNumber(r.min,''),scanDetailNumber(r.max,''),scanEscapeHTML(r.congestion||'미제공')])];
  return `<div class="scanMetricHeading"><strong>${scanEscapeHTML(data.areaName)}</strong><span class="scanCongestion ${scanCongestionTone(data.congestion)}">${scanEscapeHTML(data.congestion)}</span></div><p>기준 ${scanEscapeHTML(data.updateTime||'시각 미제공')} · 후보지에서 ${scanFormatDistance(data.distance)}${data.replacement?' · 대체 데이터':''}</p><div class="scanMetricGrid">${scanDetailMetric('현재 추정 인구',scanFormatPopulationRange(data.min,data.max),'지정지점 전체 · 순간 추정 범위')}${scanDetailMetric('비상주 인구',percent(data.nonResidentRate),'현 시점 비상주 비율')}${scanDetailMetric('여성 / 남성',percent(data.femaleRate)+' / '+percent(data.maleRate),'현 시점 구성')}${scanDetailMetric('예측 제공',String((data.forecast||[]).length)+'개 시점','서울시가 제공한 예측')}</div>${data.message?'<div class="scanInsight">'+scanEscapeHTML(data.message)+'</div>':''}<div class="scanDetailGrid">${scanDetailChartSection('scanRealtimeForecastChart','시간별 인구 추정 범위','현재 추정과 이후 예측을 구분합니다. 음영은 최소~최대 범위이며 확정 인원이 아닙니다.',true)}${scanDetailChartSection('scanRealtimeAgeChart','연령대별 구성','서울시 제공 비율(%) · 70대 이상 포함')}${scanDetailChartSection('scanRealtimeGenderChart','성별 구성','서울시 제공 비율(%)')}${scanDetailChartSection('scanRealtimeResidentChart','상주·비상주 구성','서울시 제공 비율(%) · 관광공사 현지인/외지인 정의와 다릅니다.',true)}</div><details><summary class="scanCaption">현재·예측 수치표 보기</summary><div class="scanTableScroll">${scanReportTable(rows)}</div></details><p class="scanReportFoot">서울시 지정지점 전체 통계입니다. 선택 반경 안에 지정지점 중심이 있지만 반경 내 인구 합계가 아닙니다. 조회할 때마다 API가 제공한 현재·예측 값을 표시하며 과거 실측 추이로 해석하지 않습니다.</p>`;
}
function scanVisitorDetail(data){
  if(!data?.rows?.length)return '';
  const kinds=[...new Set(data.rows.map(r=>r.kind))],dates=[...new Set(data.rows.map(r=>r.date))].sort(),latest=dates.at(-1);
  const metrics=kinds.map(kind=>{const r=data.rows.find(r=>r.kind===kind&&r.date===latest);return scanDetailMetric(kind,scanDetailNumber(r?.value),latest.slice(0,4)+'.'+latest.slice(4,6)+'.'+latest.slice(6)+' · 시군구');}).join('');
  return `<div class="scanMetricGrid">${metrics}</div><div class="scanDetailGrid">${kinds.map((kind,i)=>scanDetailChartSection('scanVisitorTrend'+i,kind+' · 기준일 비교','최근 조회한 월말 일별값 · 월 합계가 아닙니다.')).join('')}</div>`;
}
function scanFloatingDetail(commerce){
  const f=commerce?.floating;if(!f?.breakdown)return '';
  return `<div class="scanMetricGrid">${scanDetailMetric('분기 유동인구',scanDetailNumber(f.total),'선택 공식상권 전체')}${scanDetailMetric('50대 이상 비중',scanDetailNumber(f.olderRate,'%'),'공식상권 연령 구성')}${scanDetailMetric('피크 시간대',f.peak?.[0]||'자료 없음','구간 길이가 서로 다름')}${scanDetailMetric('통계 기준',scanPeriodLabel(commerce.floatingPeriod),commerce.area.name)}</div><div class="scanDetailGrid">${scanDetailChartSection('scanFloatingTimeChart','시간대 흐름','분기 구간별 인구 · 구간별 시간 길이가 달라 시간당 밀도가 아닙니다.',true)}${scanDetailChartSection('scanFloatingDayChart','요일별 비교','분기 요일별 인구(명)')}${scanDetailChartSection('scanFloatingAgeChart','연령대별 비교','분기 연령대별 인구(명)')}</div>`;
}
function scanRenderPopulationDetails(result){
  $('scanRealtimeScope').innerHTML=scanRealtimeReport(result.population,result.candidate);
  if(result.population){
    const p=result.population,rows=[['구성 항목','비율'],['여성',scanDetailNumber(p.femaleRate,'%')],['남성',scanDetailNumber(p.maleRate,'%')],['상주',scanDetailNumber(p.residentRate,'%')],['비상주',scanDetailNumber(p.nonResidentRate,'%')],...[0,10,20,30,40,50,60,70].map(a=>[a===0?'10세 미만':a===70?'70대 이상':a+'대',scanDetailNumber(p.ages?.[a],'%')])];
    $('scanRealtimeScope').innerHTML+='<details><summary class="scanCaption">연령·성별·상주 구성 수치표 보기</summary>'+scanReportTable(rows)+'</details>';
  }
  if(result.sgis){
    const s=result.sgis;
    $('scanPopulationSummary').innerHTML+='<div class="scanCaption">'+scanEscapeHTML(s.year+'년 · '+s.regionName)+'</div>'+scanReportTable([['센서스 지표','값'],['총인구',scanDetailNumber(s.population)],['인구밀도',scanDetailNumber(s.density,'명/㎢')],['일반가구',scanDetailNumber(s.households,'가구')],['주택',scanDetailNumber(s.houses,'호')],['사업체',scanDetailNumber(s.businesses,'개')],['종사자',scanDetailNumber(s.employees)],['평균연령',scanDetailNumber(s.avgAge,'세')]]);
  }
  $('scanVisitorReport').innerHTML=scanVisitorDetail(result.visitors)+scanRenderVisitors(result.visitors);
  const commerce=result.commerce;
  $('scanFloatingReport').innerHTML=commerce?.floating?scanFloatingDetail(commerce)+scanRenderFloatingBreakdown(commerce.floating):'<div class="scanEmpty">해당 지역의 공식상권 유동인구 자료가 없습니다. 조회 오류 또는 제공 범위 밖일 수 있으며 0명을 뜻하지 않습니다.</div>';
}
function scanRenderPopulationDetailCharts(result){
  const base=()=>({responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:'명'}}}});
  const chart=(key,id,type,labels,datasets,options=base())=>scanReportChart(key,id,{type,data:{labels,datasets},options});
  const data=result.population;
  if(data){
    const forecast=[{time:(data.updateTime||'시각 미제공')+' (현재)',min:data.min,max:data.max},...(data.forecast||[]).map(r=>({...r,time:r.time+' (예측)'}))];
    const forecastOptions=base();forecastOptions.scales.x={ticks:{maxRotation:0,maxTicksLimit:6}};
    chart('realtimeForecast','scanRealtimeForecastChart','line',forecast.map(r=>r.time.replace(/^\d{4}-(\d{2})-(\d{2}) /,'$1.$2 ')),[{label:'최소 추정',data:forecast.map(r=>r.min),borderColor:'#0369a1',backgroundColor:'#0369a1',tension:0},{label:'최대 추정',data:forecast.map(r=>r.max),borderColor:'#6d28d9',backgroundColor:'rgba(109,40,217,.14)',fill:'-1',tension:0,borderDash:[6,4]}],forecastOptions);
    const percent=()=>{const o=base();o.scales.y={beginAtZero:true,max:100,title:{display:true,text:'%'}};return o;};
    const ageOptions=percent();ageOptions.scales.y.max=Math.min(100,Math.max(10,Math.ceil(Math.max(0,...Object.values(data.ages||{}).filter(Number.isFinite))*1.15/10)*10));
    chart('realtimeAge','scanRealtimeAgeChart','bar',[0,10,20,30,40,50,60,70].map(a=>a===0?'10세 미만':a===70?'70대 이상':a+'대'),[{label:'연령 비율(%)',data:[0,10,20,30,40,50,60,70].map(a=>data.ages?.[a]??null),backgroundColor:'#6d28d9'}],ageOptions);
    chart('realtimeGender','scanRealtimeGenderChart','doughnut',['여성 '+scanDetailNumber(data.femaleRate,'%'),'남성 '+scanDetailNumber(data.maleRate,'%')],[{label:'비율(%)',data:[data.femaleRate,data.maleRate],backgroundColor:['#be185d','#0369a1'],borderColor:'#fff',borderWidth:3}],{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'bottom'},datalabels:{display:false}}});
    chart('realtimeResident','scanRealtimeResidentChart','bar',['현재 구성'],[{label:'상주(%)',data:[data.residentRate],backgroundColor:'#047857'},{label:'비상주(%)',data:[data.nonResidentRate],backgroundColor:'#6d28d9'}],{...percent(),indexAxis:'y',scales:{x:{stacked:true,beginAtZero:true,max:100,title:{display:true,text:'%'}},y:{stacked:true,grid:{display:false}}}});
  }
  const rows=result.visitors?.rows||[],kinds=[...new Set(rows.map(r=>r.kind))];
  // Include missing dates as null, never connect through an absent observation.
  const dates=[...new Set([...rows.map(r=>r.date),...(result.visitors?.missingDates||[])])].sort();
  kinds.forEach((kind,i)=>chart('visitorTrend'+i,'scanVisitorTrend'+i,'line',dates.map(d=>d.slice(0,4)+'.'+d.slice(4,6)+'.'+d.slice(6)),[{label:kind+'(명)',data:dates.map(d=>rows.find(r=>r.kind===kind&&r.date===d)?.value??null),borderColor:['#0369a1','#6d28d9','#be185d'][i%3],backgroundColor:['#0369a11a','#6d28d91a','#be185d1a'][i%3],fill:true,tension:0,spanGaps:false}]));
  const f=result.commerce?.floating?.breakdown;
  if(f){
    [['Time','times','line','#0369a1'],['Day','days','bar','#6d28d9'],['Age','ages','bar','#be185d']].forEach(([key,field,type,color])=>{const values=f[field]||[];chart('floating'+key,'scanFloating'+key+'Chart',type,values.map(r=>r[0]),[{label:'유동인구(명)',data:values.map(r=>r[1]),borderColor:color,backgroundColor:type==='line'?color+'1a':color,fill:type==='line',tension:0,spanGaps:false}]);});
  }
}
