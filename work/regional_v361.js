function scanUnitLabel(value){
  const s=String(value??'').trim();
  if(!s)return '';
  if(/호(?:\s*호)+$/.test(s))return s.replace(/(?:\s*호)+$/,'호');
  return /호$/.test(s)?s:/^[A-Za-z가-힣]?\d+[A-Za-z]?(?:-\d+)?$/.test(s)?s+'호':s;
}
function scanClinicRegional(result){
  const e=scanSiteEscape,h=result.hira,ok=!!h&&!h.unavailable;
  const partial=!!h?.errorLabels?.length||!!h?.specialties?.some(s=>s.error);
  const places=ok?h.places||[]:[];
  const note=scanIsSeoulCandidate(result.candidate)?'선택 반경에 서울 공식상권 중심점이 없어 해당 상권의 추정매출·개폐업 통계는 제공되지 않습니다.':'서울시 추정매출·개폐업 자료는 이 지역을 포함하지 않습니다.';
  const rows=(h?.specialties||[]).map(s=>[e(s.name),!ok||s.error?'조회 실패':s.count==null?'미제공':e(s.count)+'곳']);
  const near=places.filter(p=>Number.isFinite(p.distance)).sort((a,b)=>a.distance-b.distance).slice(0,15);
  return '<div class="scanInsight">'+e(result.candidate.address||result.candidate.name)+' · 선택 반경 '+e(result.radiusMeters)+'m · 심평원 공식 의원 현황</div>'+
    '<div class="scanDetailMetrics">'+scanDetailMetric('공식 고유 의원',ok?places.length+'곳':'조회 불가',partial?'일부 진료과 조회 실패 · 확인된 결과':'선택 진료과 중복 기관 제거')+'</div>'+
    (rows.length?scanReportTable([['선택 진료과','공식 의원 수'],...rows]):'<p class="scanEmpty">진료과별 자료를 확보하지 못했습니다. 0곳을 의미하지 않습니다.</p>')+
    (near.length?'<h4>가까운 의원 · 최대 15곳</h4>'+scanReportTable([['의원','거리','주소'],...near.map(p=>[e(p.name),Math.round(p.distance)+'m',e(p.address||'주소 미제공')])]):'')+
    '<p class="scanCaption">출처: 건강보험심사평가원 · 이번 스캔 조회 결과. 진료과별 수는 동일 의원이 중복될 수 있습니다.</p><div class="scanInsight">'+note+' 전국 경쟁의원 현황은 위에 표시하며, 의원별 실제 매출 또는 전국 추정매출로 환산하지 않습니다.</div>';
}

