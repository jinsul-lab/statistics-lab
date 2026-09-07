// Public hospital enrichment. Never infer opening hours from missing data.
const scanEnrichCache=new Map();
let scanEgenApprovalError=false;
function scanClinicIdentity(p,r){
  const norm=s=>String(s||'').replace(/[\s()·.,-]/g,'');
  if(norm(p.name)!==norm(r.dutyName))return false;
  const phone=s=>String(s||'').replace(/\D/g,'');
  const a=phone(p.phone),b=phone(r.dutyTel1);
  if(a&&b)return a===b;
  const address=s=>norm(s).replace(/^경기도/,'경기').replace(/^서울특별시/,'서울').split('층')[0];
  if(p.address&&r.dutyAddr&&address(p.address)===address(r.dutyAddr))return true;
  const lat=Number(r.wgs84Lat),lng=Number(r.wgs84Lon);
  if(!lat||!lng||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return false;
  return Math.hypot((lat-p.lat)*111320,(lng-p.lng)*111320*Math.cos(p.lat*Math.PI/180))<100;
}
function scanClinicTime(raw){
  const s=String(raw??'').trim().replace(':','');if(!/^\d{3,4}$/.test(s))return '';
  const t=s.padStart(4,'0'),h=Number(t.slice(0,2)),m=Number(t.slice(2));
  return h<=24&&m<60&&(h<24||m===0)?t.slice(0,2)+':'+t.slice(2):'';
}
function scanClinicHours(hira,egen){
  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun','Holiday'].map((day,i)=>{
    let start=scanClinicTime(hira['trmt'+day+'Start']),end=scanClinicTime(hira['trmt'+day+'End']),source='심평원';
    // Do not mix a start from one provider with an end from another.
    if(!(start&&end)&&scanClinicTime(egen['dutyTime'+(i+1)+'s'])&&scanClinicTime(egen['dutyTime'+(i+1)+'c'])){
      start=scanClinicTime(egen['dutyTime'+(i+1)+'s']);end=scanClinicTime(egen['dutyTime'+(i+1)+'c']);source='국립중앙의료원';
    }
    return {day:['월','화','수','목','금','토','일','공휴일'][i],value:start||end?(start||'미제공')+' ~ '+(end||'미제공'):'미제공 · 휴진 여부 미확인',source:start||end?source:'공개자료 없음'};
  });
}
async function scanFetchEgen(place){
  if(scanEgenApprovalError)throw Error('국립중앙의료원 API 활용승인 확인 필요');
  const params=new URLSearchParams({serviceKey:PUBLIC_DATA_API_KEY,QN:place.name,pageNo:'1',numOfRows:'100'});
  let payload;try{payload=await scanFetchApiDocument('https://apis.data.go.kr/B552657/HsptlAsembySearchService/getHsptlMdcncListInfoInqire?'+params,30000);}catch(error){if(error.httpStatus===403){scanEgenApprovalError=true;throw Error('국립중앙의료원 API HTTP 403 · 활용승인 및 인증키 확인 필요');}throw error;}
  const data=scanApiEnvelope(payload),matches=data.rows.filter(r=>scanClinicIdentity(place,r));
  if(matches.length!==1)throw Error(matches.length?'동일 의료기관을 하나로 확정하지 못함':'전화·주소가 일치하는 의료기관 자료 없음');
  return matches[0];
}
async function scanFetchClinicEnriched(place){
  const key=[place.ykiho,place.name,place.address,place.phone].join('|');
  const cached=scanEnrichCache.get(key);if(cached&&cached.expires>Date.now())return cached.promise;
  const pending=Promise.allSettled([place.ykiho?scanFetchHiraDetails(place.ykiho):Promise.reject(Error('심평원 기관번호 없음')),scanFetchEgen(place)]).then(([h,e])=>{
    const hira=h.status==='fulfilled'?h.value:{detail:{},departments:[],specialists:[],partial:true};
    const egen=e.status==='fulfilled'?e.value:{};
    return {hira,egen,hours:scanClinicHours(hira.detail||{},egen),checkedAt:new Date().toISOString(),errors:[h.status==='rejected'?'심평원: '+scanApiErrorMessage(h.reason):hira.partial?'심평원 일부 상세 조회 실패':'',e.status==='rejected'?'국립중앙의료원: '+scanApiErrorMessage(e.reason):''].filter(Boolean)};
  });
  scanEnrichCache.set(key,{promise:pending,expires:Date.now()+1800000});pending.then(d=>{if(d.errors.length)scanEnrichCache.delete(key);},()=>scanEnrichCache.delete(key));return pending;
}
function scanClinicEnrichedHTML(place,data){
  const e=scanSiteEscape,d=data.hira.detail||{},g=data.egen;
  const departments=data.hira.departments.map(r=>r.dgsbjtCdNm).filter(Boolean);
  const specialists=data.hira.specialists.map(r=>{const count=r.dtlSdrCnt??r.dgsbjtPrSdrCnt??r.spcSbjtSdrCnt??r.sdrCnt;return (r.dgsbjtCdNm||r.spcSbjtCdNm||'전문과목')+' '+(count!==undefined&&count!==''?count+'명':'인원 미제공');}).join(', ');
  const rows=[['주소',g.dutyAddr||place.address,'기관 공개 주소'],['전화',g.dutyTel1||place.phone,'국립중앙의료원 / 심평원'],['신고 진료과',departments.join(', ')||(place.specialties||[]).join(', '),'심평원'],['전문의',specialists,'심평원'],['평일 점심',d.lunchWeek,'심평원'],['토요일 점심',d.lunchSat,'심평원'],['일요일 휴진 안내',d.noTrmtSun,'심평원'],['공휴일 휴진 안내',d.noTrmtHoli,'심평원'],['주차',d.parkQty!==undefined&&d.parkQty!==''?d.parkQty+'대 · '+(d.parkEtc||'배정·무료시간 미제공'):d.parkEtc,'심평원'],['오시는 길',g.dutyMapimg,'국립중앙의료원'],['기관 안내',g.dutyInf||g.dutyEtc,'국립중앙의료원']];
  const query=encodeURIComponent(place.name+' '+(place.address||''));
  return '<div class="siteClinicBox"><h4>'+e(place.name)+'</h4><table><thead><tr><th>요일</th><th>진료시간</th><th>출처</th></tr></thead><tbody>'+data.hours.map(r=>'<tr><th>'+e(r.day)+'</th><td>'+e(r.value)+'</td><td>'+e(r.source)+'</td></tr>').join('')+'</tbody></table><table>'+rows.map(([k,v,s])=>'<tr><th>'+e(k)+'</th><td>'+e(v||'공개자료 미제공')+'</td><td>'+e(s)+'</td></tr>').join('')+'</table><p class="siteFine">조회 '+e(data.checkedAt)+' · 등록 진료시간이며 당일 접수 마감·휴무 변경은 병원 확인이 필요합니다.</p>'+data.errors.map(s=>'<p class="siteWarning">'+e(s)+'</p>').join('')+'<a target="_blank" rel="noopener" href="https://map.naver.com/p/search/'+query+'">네이버 지도에서 최신 안내 확인 ↗</a> · <a target="_blank" rel="noopener" href="'+e(scanKakaoMapUrl(place))+'">카카오맵 ↗</a></div>';
}
async function scanSiteDetail(index){
  if(!scanSite.result)return;const draft=scanSite.active,token=++scanSite.detailToken,p=scanSiteCompetition(scanSite.result,draft.exclude).rows[index],node=$('siteHiraDetail');if(!p)return;
  node.textContent=p.name+' · 심평원·국립중앙의료원 자동 조회 중…';
  try{const data=await scanFetchClinicEnriched(p);if(token!==scanSite.detailToken||draft!==scanSite.active)return;node.innerHTML=scanClinicEnrichedHTML(p,data);scanSiteRememberClinic(draft,p,data);}catch(err){if(token===scanSite.detailToken&&draft===scanSite.active)node.textContent=scanApiErrorMessage(err);}
}
function scanSiteRememberClinic(draft,place,data){
  const name='진료시간 · '+place.name;
  const fact={name,value:data.hours.map(r=>r.day+' '+r.value).join(' / '),scope:place.address,when:'조회 '+data.checkedAt,source:[...new Set(data.hours.filter(r=>r.source!=='공개자료 없음').map(r=>r.source))].join(' / ')||'공개자료 없음'};
  fact.value+=' · 전화 '+(data.egen.dutyTel1||place.phone||'미제공')+' · 신고 진료과 '+(data.hira.departments.map(r=>r.dgsbjtCdNm).filter(Boolean).join(', ')||(place.specialties||[]).join(', ')||'미제공');
  if(data.errors.length)fact.value+=' · '+data.errors.join(' / ');
  draft.clinicFacts=draft.clinicFacts||[];draft.clinicFacts=draft.clinicFacts.filter(r=>r.name!==name);draft.clinicFacts.push(fact);
  draft.snapshot.facts=draft.snapshot.facts.filter(r=>r.name!==name);draft.snapshot.facts.push(fact);if(draft===scanSite.active)scanSitePreview();
}
function scanSiteAutoFill(draft,result){
  draft.autoFields=draft.autoFields||{};
  const put=(key,value,source)=>{if(!value||String(draft.fields[key]||'').trim())return;draft.fields[key]=value;draft.autoFields[key]={value,source,checkedAt:result.createdAt||new Date().toISOString()};};
  const b=result.building;
  if(b&&!result.candidate.searchScope){
    if(Number.isFinite(b.parking)&&b.parking>0)put('parking','건물 전체 '+b.parking+'대 · 임차인 배정·무료시간 미확인','건축물대장');
    if(Number.isFinite(b.elevators)&&b.elevators>0)put('elevator','건물 전체 '+b.elevators+'대 · 휠체어 동선 미확인','건축물대장');
  }
  // A nearby competitor is not the candidate landlord/contact.
  const target=(result.hira?.places||[]).filter(p=>scanSiteSameClinic(p,result.candidate));
  if(target.length===1&&target[0].phone)put('contact',target[0].phone+' · 현재 의원 대표전화(중개인 아님)','심평원');
}
const scanSiteOpenBeforeEnrich=scanSiteOpen;
scanSiteOpen=function(){const r=scanState.result;if(!r)return;const key=scanSiteKey(r);let d=scanSite.drafts.get(key)||scanSiteReadSaved().find(x=>x.key===key);if(!d)d={schema:'jinsul-site-1',key,fields:{title:r.candidate.name+' 입지자료'},photos:{},exclude:true,checks:scanSiteChecks.map(()=>'미확인')};scanSiteAutoFill(d,r);scanSite.drafts.set(key,d);scanSiteOpenBeforeEnrich();for(const fact of d.clinicFacts||[])if(!d.snapshot.facts.some(x=>x.name===fact.name))d.snapshot.facts.push(fact);scanSitePreview();if(!d.autoCollected){d.autoCollected=true;scanSiteCollect(d,5);}};
async function scanSiteCollect(d,limit){
  if(!scanSite.result)return;const result=scanSite.result,rows=scanSiteCompetition(result,d.exclude).rows.slice(0,limit);let done=0;
  for(const p of rows){if(d!==scanSite.active||result!==scanSite.result)break;scanSiteStatus('병원 상세 자동 수집 '+done+'/'+rows.length+' · 심평원 / 국립중앙의료원');try{const data=await scanFetchClinicEnriched(p);if(result!==scanSite.result)break;scanSiteRememberClinic(d,p,data);}catch{}done++;}
  if(d===scanSite.active)scanSiteStatus('병원 상세 자동 수집 '+done+'/'+rows.length+' · 결과·미제공·조회 실패는 공식 자료 표에 기록했습니다.');
}
const scanSiteRenderBeforeEnrich=scanSiteRender;
scanSiteRender=function(){scanSiteRenderBeforeEnrich();const d=scanSite.active;if(!d)return;
  document.querySelectorAll('[data-site-field]').forEach(el=>{const k=el.dataset.siteField,a=d.autoFields?.[k];if(a&&a.value===d.fields[k]){const label=document.createElement('small');label.className='scanCaption';label.textContent='자동 반영 · '+a.source+' · '+a.checkedAt.slice(0,10);el.parentElement.appendChild(label);}const previous=el.oninput;el.oninput=()=>{if(d.autoFields)delete d.autoFields[k];previous();};});
  const box=$('siteHiraDetail');if(box&&scanSite.result){const btn=document.createElement('button');btn.className='btn outline';btn.textContent='경쟁의원 상세 더 수집 / 재조회 (최대 20곳)';box.before(btn);btn.onclick=async()=>{btn.disabled=true;scanEgenApprovalError=false;await scanSiteCollect(d,20);btn.disabled=false;};}
};
const scanSiteValidBeforeEnrich=scanSiteValidDraft;
scanSiteValidDraft=function(raw){const d=scanSiteValidBeforeEnrich(raw);d.autoFields={};for(const [k] of scanSiteFields){const a=raw.autoFields?.[k];if(a&&String(a.value)===d.fields[k])d.autoFields[k]={value:d.fields[k],source:scanSiteText(a.source),checkedAt:scanSiteText(a.checkedAt)};}d.clinicFacts=d.snapshot.facts.filter(r=>r.name.startsWith('진료시간 · '));return d;};
const scanSiteSheetBeforeEnrich=scanSiteSheet;
scanSiteSheet=function(d){const list=Object.entries(d.autoFields||{}).filter(([k,a])=>a.value===d.fields[k]);return scanSiteSheetBeforeEnrich(d)+(list.length?'<p class="siteFine">자동 반영 출처: '+list.map(([k,a])=>scanSiteEscape(scanSiteFields.find(r=>r[0]===k)?.[1]||k)+' — '+scanSiteEscape(a.source)+' ('+scanSiteEscape(a.checkedAt.slice(0,10))+')').join(' · ')+'</p>':'');};
