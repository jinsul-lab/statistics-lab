function scanSiteOnlineReview(d){
  const e=scanSiteEscape,s=d.snapshot,f=s.facts||[];
  const groups=[
    ['주차',/건물 전체 주차/,'진입·회차·무료시간은 관리실 확인 필요'],
    ['승강기',/^승강기$/,'크기·혼잡·정전 대응은 별도 확인 필요'],
    ['용도·건물',/^(주용도|사용승인|건물명)$|^대장 층별/,'층별 용도는 개설 허가 또는 해당 호실 적합성 확정이 아님'],
    ['임대면적',/^대장 선택 호실$/,'호실 전체 전유면적. 임대 범위·관리비·원상복구는 계약자료 확인 필요'],
    ['보행·배후 수요',/주거 인구|종사자|추정인구|분기 유동인구|방문자/,'통계의 공간 범위를 확인하세요. 시간대별 현장 관찰과 구분']
  ];
  const rows=groups.map(([label,re,note])=>{const facts=f.filter(x=>re.test(x.name));return '<tr><th>'+e(label)+'</th><td>'+(facts.length?facts.map(x=>e(x.name)+': '+e(x.value)+'<br><small>'+e(x.scope)+' · '+e(x.source)+' · '+e(x.when)+'</small>').join('<br>'):'온라인 근거 미확보')+'</td><td>'+e(note)+'</td></tr>';});
  const facilities=(s.facilities||[]).map(x=>e(x.name)+': '+(x.error?'조회 실패':x.count==null?'미제공':e(x.count)+'곳')+(x.nearest?' · '+e(x.nearest.name)+' '+(Number.isFinite(x.nearest.distance)?Math.round(x.nearest.distance)+'m':'거리 미제공'):'')+(x.partial?' · 일부 검색 결과':'')).join('<br>');
  rows.push('<tr><th>주변 접근 시설</th><td>'+(facilities||'온라인 근거 미확보')+'</td><td>카카오 검색 · 후보 반경 '+e(s.radius)+'m. 횡단보도·무장애 경로·건물 내 입점 여부는 별도 확인</td></tr>');
  return '<h3>온라인 사전 확인 · 수집 근거</h3><p>조회값과 확인이 필요한 조건을 나누어 표시합니다. 아래 자료가 있어도 현장 체크를 자동으로 양호 처리하지 않습니다.</p><table><thead><tr><th>항목</th><th>확보 자료 · 범위·출처</th><th>추가 확인</th></tr></thead><tbody>'+rows.join('')+'</tbody></table><p>입구 턱·간판은 로드뷰로 외관을 참고할 수 있습니다. 실내 동선·방음·하중·전력·급배수·영상장비 차폐·업종 제한은 도면·관리규약·관리자 및 관련 전문가 확인이 필요합니다.</p>';
}
function scanSiteStreetLinks(c){
  const e=scanSiteEscape,q=encodeURIComponent(c.address||c.name||'');
  return '<a target="_blank" rel="noopener" href="https://map.kakao.com/link/roadview/'+Number(c.lat)+','+Number(c.lng)+'">카카오 로드뷰 원문 ↗</a> · <a target="_blank" rel="noopener" href="https://map.naver.com/p/search/'+q+'">네이버 지도에서 거리뷰 비교 ↗</a>';
}
const scanSiteOnlineRenderBase=scanSiteRender;
scanSiteRender=function(){
  scanSiteOnlineRenderBase();const d=scanSite.active;if(!d)return;
  const box=document.createElement('section');box.className='siteClinicBox';box.id='siteStreetReference';
  box.innerHTML='<h3>외관 참고 · 카카오 로드뷰</h3><p>현장 촬영 사진과 구분됩니다. 촬영일은 원문 화면에서 확인하세요. 네이버·카카오 중 최신이라는 판정은 아직 자동 제공하지 않습니다.</p>'+scanSiteStreetLinks(d.snapshot.candidate)+'<p><button class="btn outline" id="siteStreetLoad">후보지 로드뷰 보기</button></p><div id="siteStreetStatus" role="status"></div><div id="siteStreetViewer" style="height:360px;display:none"></div><p>로드뷰는 대화형 참고 화면이며 PDF·저장 HTML에 사진으로 자동 복제되지 않습니다. 출력 자료에는 원문 링크가 포함됩니다.</p>';
  $('siteStatus').after(box);
  $('siteStreetLoad').onclick=()=>{
    const status=$('siteStreetStatus'),node=$('siteStreetViewer'),c=d.snapshot.candidate;
    if(c.searchScope){status.textContent='지역 대표지점입니다. 구체적인 후보 건물 주소를 먼저 선택하세요.';return;}
    if(!Number.isFinite(c.lat)||!Number.isFinite(c.lng)){status.textContent='후보지 좌표가 없습니다.';return;}
    status.textContent='후보지 주변 100m 로드뷰 조회 중…';
    const timer=setTimeout(()=>{if(box.isConnected)status.textContent='로드뷰 응답 지연. 원문 링크를 이용하거나 다시 조회하세요.';},15000);
    try{new kakao.maps.RoadviewClient().getNearestPanoId(new kakao.maps.LatLng(c.lat,c.lng),100,id=>{
      clearTimeout(timer);if(!box.isConnected||scanSite.active!==d)return;
      if(!id){status.textContent='100m 이내 제공 로드뷰가 없습니다. 원문 지도에서 주변 도로를 확인하세요.';return;}
      node.style.display='block';node.innerHTML='';const viewer=new kakao.maps.Roadview(node);
      viewer.setPanoId(id,new kakao.maps.LatLng(c.lat,c.lng));
      status.textContent='카카오 제공 주변 도로 지점 · 촬영 시점과 실제 건물 입구를 대조하세요.';
    });}catch(error){clearTimeout(timer);status.textContent='로드뷰 연결 실패. 원문 링크에서 확인하세요.';}
  };
};
