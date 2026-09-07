const scanSiteScopeRenderBase=scanSiteRender;
scanSiteRender=function(){
  scanSiteScopeRenderBase();const d=scanSite.active;if(!d)return;
  const label=document.createElement('label');label.className='siteExclude';
  label.innerHTML='<span>경쟁의원 범위</span><select id="siteClinicScope"><option value="pain">통증 유관 4개 과</option><option value="all">타과 포함 · 의원 전체 조회</option></select><small id="siteScopeStatus">유관과: 정형외과·마취통증의학과·신경외과·재활의학과. 의원급 기준이며 치과·한의원·병원급은 별도입니다.</small>';
  $('siteExclude').parentElement.after(label);const select=$('siteClinicScope');select.value=d.competitionMode||'pain';select.disabled=!scanSite.result;
  select.onchange=async()=>{
    const result=scanSite.result,wanted=select.value;if(!result)return;
    if(wanted==='all'&&!result.siteAllHira){
      select.disabled=true;$('siteScopeStatus').textContent='반경 내 타과 포함 의원 조회 중…';
      try{const places=await scanFetchHiraSpecialty(null,result.candidate,result.radiusMeters);
        if(d!==scanSite.active||result!==scanSite.result)return;
        const known=new Map((result.hira?.places||[]).map(p=>[p.ykiho,p]));
        result.siteAllHira={places:places.map(p=>({...p,specialties:known.get(p.ykiho)?.specialties||['진료과 미분류']})),unavailable:false};
      }catch(error){if(d===scanSite.active){select.value=d.competitionMode||'pain';select.disabled=false;$('siteScopeStatus').textContent='전체 의원 조회 실패: '+scanApiErrorMessage(error);}return;}
    }
    if(d!==scanSite.active||result!==scanSite.result)return;
    d.competitionMode=wanted;d.snapshot=scanSiteSnapshot(result,d);scanSiteRender();
  };
};
