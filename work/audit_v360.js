function scanKnownBuildingCount(row,keys){
  const values=keys.map(k=>scanSiteNum(row[k]));
  return values.some(v=>v===null||v<0)?null:values.reduce((a,b)=>a+b,0);
}
function scanBuildingCountLabel(n){return n===null||n===undefined?'미제공':Number(n).toLocaleString('ko-KR')+'대';}
function scanSiteMergeEvidence(facts,draft){
  const merged=new Map();for(const r of [...facts,...(draft.clinicFacts||[]),...(draft.registryFacts||[])])merged.set(JSON.stringify([r.name,r.value,r.scope,r.source,r.when]),r);return [...merged.values()];
}
const scanSiteSnapshotBeforeAudit=scanSiteSnapshot;
scanSiteSnapshot=function(result,draft){const snapshot=scanSiteSnapshotBeforeAudit(result,draft);snapshot.facts=scanSiteMergeEvidence(snapshot.facts,draft);return snapshot;};
const scanSiteCompetitionBeforeAudit=scanSiteRenderCompetition;
scanSiteRenderCompetition=function(){const more=$('siteCollectMore');scanSiteCompetitionBeforeAudit();if(more)$('siteHiraDetail')?.before(more);};
function scanRegistryAcceptPage(data,state){
  if(!Number.isInteger(data.total)||data.total<0)throw Error('대장 전체 건수 확인 불가');
  if(state.total!==null&&state.total!==data.total)throw Error('조회 도중 대장 건수가 변경되어 재조회 필요');
  state.total=data.total;
  for(const row of data.rows){
    // rnum is the source's row number. An identical source row must not be counted twice.
    const identity=JSON.stringify(Object.keys(row).sort().map(k=>[k,row[k]]));
    if(state.seen.has(identity))throw Error('대장 중복 행 수신 · 면적 합산을 중단했습니다.');state.seen.add(identity);
  }
  state.count+=data.rows.length;if(state.count>state.total)throw Error('대장 수신 건수가 전체 건수를 초과했습니다.');
}
const scanSiteRenderBeforeAudit=scanSiteRender;
scanSiteRender=function(){scanSiteRenderBeforeAudit();const draft=scanSite.active;if(!draft)return;
  document.querySelectorAll('[data-site-field]').forEach(el=>{const previous=el.oninput;el.oninput=()=>{const areaSource=draft.autoFields?.area;previous();el.parentElement.querySelector('small.scanCaption')?.remove();
    if(['unit','area'].includes(el.dataset.siteField)){
      if(el.dataset.siteField==='unit'&&areaSource?.source.includes('전유공용면적')&&draft.fields.area===areaSource.value){draft.fields.area='';delete draft.autoFields.area;const area=document.querySelector('[data-site-field="area"]');if(area){area.value='';area.parentElement.querySelector('small.scanCaption')?.remove();}scanSiteStatus('호실을 변경해 이전 호실의 자동 면적을 비웠습니다. 새 호실 면적을 확인하세요.');}
      draft.registryFacts=(draft.registryFacts||[]).filter(r=>r.name!=='대장 선택 호실');
      draft.snapshot.facts=draft.snapshot.facts.filter(r=>r.name!=='대장 선택 호실');
      scanSitePreview();
    }
  };});
};
