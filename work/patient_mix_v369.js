const patientMixAges=['0~19','20~29','30~39','40~49','50~59','60~69','70+','미상'];
let patientMixCharts=[];
function patientMixData(patients){
  const ages=patientMixAges.map(name=>({name,count:0,visits:0})),regions=new Map();let visits=0;
  for(const p of patients){
    const age=patientMixAges.indexOf(bucketAge(p.age)),dong=String(p.dong||'').trim()||'미상';
    const v=Number.isFinite(Number(p.total))&&Number(p.total)>=0?Number(p.total):0;
    ages[age].count++;ages[age].visits+=v;visits+=v;
    if(!regions.has(dong))regions.set(dong,{name:dong,count:0,visits:0,ages:Array(8).fill(0)});
    const r=regions.get(dong);r.count++;r.visits+=v;r.ages[age]++;
  }
  const all=[...regions.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ko'));
  const top=all.slice(0,10),rest=all.slice(10);
  if(rest.length)top.push(rest.reduce((r,x)=>({name:r.name,count:r.count+x.count,visits:r.visits+x.visits,ages:r.ages.map((v,i)=>v+x.ages[i])}),{name:'그 외 '+rest.length+'개 동 (합산)',count:0,visits:0,ages:Array(8).fill(0)}));
  let pc=0,vc=0;const cumulative=top.map(r=>{pc+=r.count;vc+=r.visits;return {...r,patientPct:patients.length?100*pc/patients.length:0,visitPct:visits?100*vc/visits:null}});
  return {ages,regions:top,cumulative,count:patients.length,visits,regionCount:all.length};
}
function renderPatientMix(){
  const host=$('patientMixBody');if(!host)return;
  patientMixCharts.forEach(c=>{try{c.destroy()}catch{}});patientMixCharts=[];
  const d=patientMixData(window.__lastStatsVisible||[]),e=patientStatsEscape;
  if(!d.count){host.innerHTML='<p class="patientMixNotice">현재 필터에 해당하는 환자가 없습니다. 환자 유형·반경을 확인하세요.</p>';return;}
  const rowMode=$('patientMixMode')?.value==='share';
  const max=Math.max(1,...d.regions.flatMap(r=>r.ages));
  const num=n=>n.toLocaleString('ko-KR'),percent=(n,total)=>total?(n/total*100).toFixed(1)+'%':'—';
  host.innerHTML='<p class="patientMixNotice">현재 필터 · '+num(d.count)+'명 / '+num(d.visits)+'회 / '+d.regionCount+'개 동. 환자 수 상위 10개 동과 나머지 합산을 표시합니다. 미상도 집계에 포함합니다.</p>'+
    '<section class="patientMixCard"><h3>지역 × 연령대</h3><p>'+(rowMode?'각 동의 전체 환자 중 해당 연령 비율입니다. 색이 진할수록 동 내 비중이 큽니다.':'각 칸은 환자 수입니다. 색이 진할수록 인원이 많습니다.')+' 숫자와 색을 함께 확인하세요.</p><div class="patientMixScroll"><table class="miniTable patientHeat"><thead><tr><th>행정동</th>'+patientMixAges.map(x=>'<th>'+x+'</th>').join('')+'<th>합계</th></tr></thead><tbody>'+d.regions.map(r=>'<tr><th>'+e(r.name)+'</th>'+r.ages.map(n=>{const ratio=rowMode?n/r.count:n/max;return '<td style="background:hsl(215 78% '+(97-ratio*62)+'%);color:'+(ratio>.55?'#fff':'#17335a')+'" title="'+n+'명 / '+r.count+'명">'+(rowMode?percent(n,r.count):num(n))+'</td>';}).join('')+'<td>'+num(r.count)+'명</td></tr>').join('')+'</tbody></table></div></section>'+
    '<section class="patientMixCard"><h3>연령별 환자 비중 · 내원 기여</h3><p>파랑은 전체 환자 중 비중, 청록은 전체 내원 중 비중입니다. 내원 비중이 높아도 질환·수익성을 뜻하지 않습니다.</p><div class="patientMixChart"><canvas id="patientMixAgeChart" aria-label="연령별 환자와 내원 비중 비교"></canvas></div><div class="patientMixScroll"><table class="miniTable"><thead><tr><th>연령</th><th>환자</th><th>환자 비중</th><th>내원</th><th>내원 비중</th><th>1인 평균</th></tr></thead><tbody>'+d.ages.map(r=>'<tr><th>'+r.name+'</th><td>'+num(r.count)+'명</td><td>'+percent(r.count,d.count)+'</td><td>'+num(r.visits)+'회</td><td>'+percent(r.visits,d.visits)+'</td><td>'+(r.count?(r.visits/r.count).toFixed(2)+'회':'—')+'</td></tr>').join('')+'</tbody></table></div></section>'+
    '<section class="patientMixCard"><h3>지역별 누적 기여도</h3><p>환자 수가 많은 동 순서로 누적합니다. 두 곡선 모두 같은 지역 순서이며 시간 변화 그래프가 아닙니다. 마지막 합산 구간도 전체 분모에 포함합니다.</p><div class="patientMixChart"><canvas id="patientMixCumulativeChart" aria-label="지역 순위별 환자와 내원 누적 비중"></canvas></div><div class="patientMixScroll"><table class="miniTable"><thead><tr><th>행정동</th><th>환자</th><th>내원</th><th>누적 환자</th><th>누적 내원</th></tr></thead><tbody>'+d.cumulative.map(r=>'<tr><th>'+e(r.name)+'</th><td>'+num(r.count)+'명</td><td>'+num(r.visits)+'회</td><td>'+r.patientPct.toFixed(1)+'%</td><td>'+(r.visitPct===null?'—':r.visitPct.toFixed(1)+'%')+'</td></tr>').join('')+'</tbody></table></div></section>';
  if(typeof Chart==='undefined'){host.insertAdjacentHTML('afterbegin','<p class="patientMixNotice">차트 연결 실패 · 히트맵과 수치표는 확인할 수 있습니다.</p>');return;}
  const options={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+Number(c.raw).toFixed(1)+'%'}}},scales:{y:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%'}},x:{grid:{display:false}}}};
  patientMixCharts.push(new Chart($('patientMixAgeChart'),{type:'bar',data:{labels:patientMixAges,datasets:[{label:'환자 비중',data:d.ages.map(r=>r.count/d.count*100),backgroundColor:'#2563eb',borderRadius:5},{label:'내원 비중',data:d.ages.map(r=>d.visits?r.visits/d.visits*100:null),backgroundColor:'#0d9488',borderRadius:5}]},options:{...options,scales:{...options.scales,y:{beginAtZero:true,ticks:{callback:v=>v+'%'}}}}}));
  patientMixCharts.push(new Chart($('patientMixCumulativeChart'),{type:'line',data:{labels:d.cumulative.map(r=>r.name),datasets:[{label:'누적 환자',data:d.cumulative.map(r=>r.patientPct),borderColor:'#2563eb',backgroundColor:'#2563eb',tension:0,pointRadius:4},{label:'누적 내원',data:d.cumulative.map(r=>r.visitPct),borderColor:'#0d9488',backgroundColor:'#0d9488',borderDash:[6,4],tension:0,pointRadius:4}]},options}));
}
const patientMixRenderBase=maybeRenderExtraStats;
maybeRenderExtraStats=function(id){patientMixRenderBase(id);if(id==='tabPatientMix')renderPatientMix();};
document.getElementById('patientMixMode')?.addEventListener('change',renderPatientMix);
