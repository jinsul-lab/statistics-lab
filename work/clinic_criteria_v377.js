/* CLINIC_CRITERIA_V377_START */
const SCAN_CLINIC_CRITERIA_VERSION='specialist-no-inpatient-v1';
const SCAN_INPATIENT_FIELDS=['permSbdCnt','hghrSickbdCnt','stdSickbdCnt','aduChldSprmCnt','chldSprmCnt','nbySprmCnt','psydeptClsHigSbdCnt','psydeptClsGnlSbdCnt','psydeptOpenHigSbdCnt','psydeptOpenGnlSbdCnt','isnrSbdCnt','anvirTrrmSbdCnt','dtrmSbdCnt'];
function scanClinicCount(value){
  if(!['string','number'].includes(typeof value)||!/^\d+$/.test(String(value).trim()))return null;
  const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
}
function scanClassifyClinic(place,evidence={},selected=Object.keys(HIRA_SPECIALTY_CODES)){
  const names=[...new Set(selected)].filter(n=>HIRA_SPECIALTY_CODES[n]);
  const assessment={status:'unverified',reason:'전문의·입원 병상 확인 필요',specialistCount:null,specialistCounts:{},matchedSpecialties:[],bedCount:null,checkedAt:evidence.checkedAt||'',criteriaVersion:SCAN_CLINIC_CRITERIA_VERSION};
  const done=(status,reason)=>({...assessment,status,reason});
  if(String(place.clinicCode||'')!=='31')return done(place.clinicCode?'excluded':'unverified',place.clinicCode?'의원급 외 의료기관 제외':'의료기관 종별 미확인');
  const facilities=Array.isArray(evidence.facilities)?evidence.facilities:[];
  // Any reported inpatient capacity excludes the clinic. Treatment/recovery equipment is not inpatient capacity.
  if(facilities.some(r=>r&&typeof r==='object'&&SCAN_INPATIENT_FIELDS.some(k=>(scanClinicCount(r[k])??0)>0))){
    assessment.bedCount=Math.max(...facilities.flatMap(r=>SCAN_INPATIENT_FIELDS.map(k=>scanClinicCount(r?.[k])||0)));
    return done('excluded','입원 병상 신고 · 분석 대상 제외');
  }
  const bedsKnown=evidence.facilitiesComplete===true&&facilities.length===1&&!!facilities[0]&&SCAN_INPATIENT_FIELDS.every(k=>scanClinicCount(facilities[0][k])===0);
  if(bedsKnown)assessment.bedCount=0;
  const byCode=new Map();let malformed=!Array.isArray(evidence.specialists);
  for(const row of Array.isArray(evidence.specialists)?evidence.specialists:[]){
    if(!row||typeof row!=='object'){malformed=true;continue;}
    const rawCode=String(row.dgsbjtCd??'').trim(),code=rawCode.padStart(2,'0'),value=scanClinicCount(row.dtlSdrCnt);
    if(!/^\d{1,2}$/.test(rawCode)){malformed=true;continue;}
    if(!byCode.has(code))byCode.set(code,value);else if(byCode.get(code)!==value)byCode.set(code,null);
  }
  for(const name of names)assessment.specialistCounts[name]=evidence.specialistsComplete===true&&!malformed?(byCode.has(HIRA_SPECIALTY_CODES[name])?byCode.get(HIRA_SPECIALTY_CODES[name]):0):null;
  assessment.matchedSpecialties=names.filter(n=>assessment.specialistCounts[n]>0);
  const knownTotal=names.reduce((sum,n)=>sum+(assessment.specialistCounts[n]||0),0);
  assessment.specialistCount=names.length&&names.every(n=>assessment.specialistCounts[n]!==null)?knownTotal:knownTotal>0?knownTotal:null;
  if(!bedsKnown)return done('unverified','입원 병상 자료 미확인 · 경쟁병원 집계 제외');
  if(assessment.matchedSpecialties.length)return done('competitor','선택 과 전문의 신고 1명 이상 · 의원급 · 입원 병상 0');
  const declared=names.filter(n=>(place.specialties||[]).includes(n));
  if(evidence.specialistsComplete===true&&declared.length&&names.every(n=>assessment.specialistCounts[n]===0))return done('declared','선택 과 진료과목 신고 · 해당 과 전문의 신고 0명');
  return done('unverified','선택 과 전문의 수 미확인 · 경쟁병원 집계 제외');
}
function scanClinicAssessmentLabel(place){
  return {competitor:'경쟁병원',declared:'심평원 신고의원',unverified:'분류 확인 필요',excluded:'분석 대상 제외'}[place.competitionAssessment?.status]||'분류 확인 필요';
}
/* CLINIC_CRITERIA_V377_END */

const scanClinicEvidenceCache=new Map();
async function scanFetchHiraCompleteRows(base,query,isCurrent=()=>true){
  let expected=null;const rows=[],seen=new Set();
  for(let page=1;page<=20;page++){
    if(!isCurrent())throw Error('이전 의원 조회 취소');
    const params=new URLSearchParams({serviceKey:HIRA_API_KEY,_type:'xml',numOfRows:'1000',...query,pageNo:String(page)});
    const payload=await scanFetchApiDocument(base+'?'+params,20000),data=scanApiEnvelope(payload);
    if(!['0','00','000','INFO-000'].includes(String(data.code).trim()))throw Error('심평원 조회 성공 여부 미확인');
    const total=scanClinicCount(payload instanceof Document?payload.querySelector('totalCount')?.textContent:(payload?.response?.body||payload?.body)?.totalCount);
    if(total===null||expected!==null&&total!==expected)throw Error('심평원 전체 건수 미확인 또는 조회 중 변경');
    expected=total;
    for(const row of data.rows){const key=JSON.stringify(row);if(seen.has(key))throw Error('심평원 페이지 중복 응답');seen.add(key);rows.push(row);}
    if(rows.length===total)return rows;
    if(rows.length>total||!data.rows.length)throw Error('심평원 응답 일부 누락');
  }
  throw Error('심평원 페이지 조회 상한 초과 · 전체 확인 불가');
}
async function scanFetchClinicEvidence(ykiho,isCurrent=()=>true){
  const cached=scanClinicEvidenceCache.get(ykiho);
  if(cached&&Date.now()-cached.at<10*60*1000)return cached.promise;
  const promise=Promise.allSettled(['getSpcSbjtSdrInfo2.8','getEqpInfo2.8'].map(path=>scanFetchHiraCompleteRows(HIRA_DETAIL_API_BASE+'/'+path,{ykiho},isCurrent))).then(entries=>({
    specialists:entries[0].status==='fulfilled'?entries[0].value:[],facilities:entries[1].status==='fulfilled'?entries[1].value:[],
    specialistsComplete:entries[0].status==='fulfilled',facilitiesComplete:entries[1].status==='fulfilled',checkedAt:new Date().toISOString()
  }));
  const item={at:Date.now(),promise};scanClinicEvidenceCache.set(ykiho,item);
  promise.then(data=>{if((!data.specialistsComplete||!data.facilitiesComplete)&&scanClinicEvidenceCache.get(ykiho)===item)scanClinicEvidenceCache.delete(ykiho);});
  return promise;
}
async function scanAssessClinics(places,selected,isCurrent=()=>true,onProgress=()=>{}){
  let index=0,done=0;
  await Promise.all(Array.from({length:Math.min(3,places.length)},async()=>{
    while(isCurrent()){
      const p=places[index++];if(!p)return;
      let evidence={};try{if(p.ykiho)evidence=await scanFetchClinicEvidence(p.ykiho,isCurrent);}catch{}
      if(!isCurrent())return;
      p.competitionAssessment=scanClassifyClinic(p,evidence,selected);done++;onProgress(done,places.length);
    }
  }));
  return places;
}
function scanClinicCohort(hira){
  const empty={competitors:[],declared:[],unverified:[],excluded:[],criteriaVersion:SCAN_CLINIC_CRITERIA_VERSION};
  for(const p of hira?.places||[]){const key={competitor:'competitors',declared:'declared',unverified:'unverified',excluded:'excluded'}[p.competitionAssessment?.status]||'unverified';empty[key].push(p);}
  return empty;
}
function scanCompetitionStatus(result){
  if(!result.hira||result.hira.unavailable)return '조회 불가';
  const uncertain=(result.hira.unverified||[]).length,partial=!!result.hira.errorLabels?.length;
  return uncertain||partial?'확인된 '+result.competitors.length+'곳 · 일부 미확인':result.competitors.length+'곳';
}
function scanClinicCriteriaNote(result){
  const h=result?.hira,e=scanEscapeHTML;
  return '<div class="scanClinicSourceNote"><b>경쟁병원 선정 기준</b><p>선택한 정형외과·신경외과·마취통증의학과·재활의학과 전문의 신고 1명 이상, 의원급, 입원 병상 0개가 확인된 기관입니다. 신고자료 기준이며 실제 상주·당일 근무는 별도 확인이 필요합니다. 병상 있는 의원도 이번 분석에서는 제외합니다.</p><p>'+e(!h||h.unavailable?'심평원 조회 실패 · 경쟁병원 수 확인 불가':'경쟁 '+(h?.competitors?.length||0)+'곳 · 심평원 신고의원 '+(h?.declared?.length||0)+'곳 · 확인 필요 '+(h?.unverified?.length||0)+'곳 · 제외 '+(h?.excluded?.length||0)+'곳')+'</p></div>';
}
