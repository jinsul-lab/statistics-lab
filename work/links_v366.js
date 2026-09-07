function scanPlaceSearchQuery(p){
  const name=String(p.name||'').trim(),address=String(p.address||'').trim();
  const city=address.split(/\s+/).find(x=>/(시|군|구)$/.test(x)&&!/(특별시|광역시)$/.test(x))||'';
  return name&&/(의원|병원|약국)/.test(name)?[city,name].filter(Boolean).join(' '):address||name;
}
scanKakaoMapUrl=function(p){
  const url=String(p.placeUrl||'').replace(/^http:/,'https:');
  if(/^https:\/\/place\.kakao\.com\/\d+(?:[/?#]|$)/i.test(url))return url;
  return 'https://map.kakao.com/link/search/'+encodeURIComponent(scanPlaceSearchQuery(p));
};
const sitePhotoPanos=new Map();
const sitePhotoPreviewBase=scanSitePreview;
scanSitePreview=function(){
  sitePhotoPreviewBase();const d=scanSite.active;if(!d||d.photos.exterior)return;
  const root=$('sitePreview'),slot=root?.querySelector('.sitePhotoEmpty'),c=d.snapshot.candidate;
  if(!slot||c.searchScope||!Number.isFinite(c.lat)||!Number.isFinite(c.lng))return;
  slot.style.display='block';slot.style.height='300px';slot.textContent='외관 참고 로드뷰를 불러오는 중…';
  const key=c.lat+','+c.lng;
  if(!sitePhotoPanos.has(key))sitePhotoPanos.set(key,new Promise(resolve=>{
    const timer=setTimeout(()=>resolve(null),15000);
    try{new kakao.maps.RoadviewClient().getNearestPanoId(new kakao.maps.LatLng(c.lat,c.lng),100,id=>{clearTimeout(timer);resolve(id||null);});}catch{clearTimeout(timer);resolve(null);}
  }));
  sitePhotoPanos.get(key).then(id=>{
    if(!slot.isConnected||scanSite.active!==d)return;
    if(!id){sitePhotoPanos.delete(key);slot.innerHTML='주변 100m 로드뷰를 확보하지 못했습니다.<br>'+scanSiteStreetLinks(c);return;}
    slot.textContent='';const viewer=new kakao.maps.Roadview(slot);viewer.setPanoId(id,new kakao.maps.LatLng(c.lat,c.lng));
    const caption=document.createElement('p');caption.className='siteFine';caption.textContent='카카오 로드뷰 · 건물 외관 참고(호실 내부 사진 아님). 촬영일은 원문에서 확인. 인쇄·저장본은 원문 링크로 제공.';slot.after(caption);
  });
};
