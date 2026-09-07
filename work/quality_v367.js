function scanSiteFreshness(d,now=Date.now()){
  const stamp=d.snapshot?.createdAt, time=Date.parse(stamp||'');
  if(!Number.isFinite(time))return '조회 시점 미확인 · 주소를 다시 스캔해 자료를 확인하세요.';
  const days=Math.max(0,Math.floor((now-time)/86400000));
  return '자료 조회: '+new Date(time).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' (한국시간) · '+days+'일 전. 원자료 기준일은 항목별 출처를 확인하세요. 운영시간·임대조건은 현재 상태와 다를 수 있습니다.';
}
const scanSiteSheetBeforeQuality=scanSiteSheet;
scanSiteSheet=function(d){return scanSiteSheetBeforeQuality(d).replace('</header>','</header><p class="siteWarning">'+scanSiteEscape(scanSiteFreshness(d))+'</p>');};
