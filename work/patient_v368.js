function patientStatsEscape(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function patientStatsOverview(rows){
  const host=$('patientStatsOverview');if(!host)return;
  const types=Object.keys(REP_COLOR),counts=types.map(t=>rows.filter(p=>p.type===t).length),visits=types.map(t=>rows.filter(p=>p.type===t).reduce((s,p)=>s+safeNum(p.total),0));
  const total=visits.reduce((a,b)=>a+b,0);
  host.innerHTML='<div class="patientKpis"><div>분석 환자<b>'+rows.length.toLocaleString()+'명</b></div><div>총 내원<b>'+total.toLocaleString()+'회</b></div><div>1인 평균 내원<b>'+(rows.length?(total/rows.length).toFixed(2)+'회':'자료 없음')+'</b></div><div>연령 미상<b>'+rows.filter(p=>bucketAge(p.age)==='미상').length+'명</b></div></div><h3>환자 유형별 내원 기여</h3><p>현재 유형·반경 필터 기준 · 환자 수와 내원 횟수를 구분합니다.</p>'+types.map((t,i)=>'<div class="patientContribution"><span>'+patientStatsEscape(t)+'</span><div><i style="width:'+(total?visits[i]/total*100:0)+'%;background:'+REP_COLOR[t]+'"></i></div><b>'+visits[i].toLocaleString()+'회 · '+counts[i]+'명</b></div>').join('');
}
function patientScatterDetails(rows){
  const host=$('patientScatterDetails');if(!host)return;
  const eligible=rows.filter(r=>!getExcludeUnknownValue()||r.dong!=='미상');
  const usable=eligible.filter(r=>r.total>0&&r.n+r.conv>0&&(!getMinSampleToggle()||r.n+r.conv>=5));
  host.innerHTML='<p role="status">'+(!getShowScatter()?'스캐터 표시가 꺼져 있습니다. ':usable.length?'표시 가능한 '+usable.length+'개 동 / '+eligible.length+'개 동. ':'현재 표본 조건에 맞는 동이 없습니다. 최소 표본 필터를 해제하거나 다른 환자 범위를 선택하세요. ')+(usable.length&&usable.length<8?'동 수가 적어 분포의 경향을 단정하기 어렵습니다. ':'')+'전환 분모는 신환(1회)+전환 환자이며, 분모가 없는 동은 제외합니다.</p><table class="miniTable"><thead><tr><th>행정동</th><th>전환 표본</th><th>전환률</th><th>평균 내원</th><th>환자 수</th></tr></thead><tbody>'+usable.map(r=>'<tr><td>'+patientStatsEscape(r.dong)+'</td><td>'+(r.n+r.conv)+'명</td><td>'+pct(r.conv,r.n+r.conv)+'%</td><td>'+(r.sumVisits/r.total).toFixed(2)+'회</td><td>'+r.total+'명</td></tr>').join('')+'</tbody></table>';
}
const patientRenderOriginal=maybeRenderExtraStats;
maybeRenderExtraStats=function(id){
  const note=$('patientStatsStatus');if(note)note.textContent=window.__lastStatsVisible?.length?'현재 선택한 환자 유형·반경 기준입니다.':'현재 필터에 해당하는 환자가 없습니다. 필터를 확인하세요.';
  if(id==='tabValue')patientScatterDetails(window.__lastStatsDongRows||[]);
  try{patientRenderOriginal(id);}catch(e){if(note)note.textContent='일부 그래프를 표시하지 못했습니다. '+(typeof Chart==='undefined'?'차트 라이브러리 연결을 확인하고 다시 열어주세요.':'표의 수치를 확인하고 통계 창을 다시 열어주세요.');console.error(e);}
};
