/* CLINIC_CRITERIA_V377_START */
const SCAN_CLINIC_CRITERIA_VERSION='specialist-clinic-v2';
const SCAN_INPATIENT_FIELDS=['permSbdCnt','hghrSickbdCnt','stdSickbdCnt','aduChldSprmCnt','chldSprmCnt','nbySprmCnt','psydeptClsHigSbdCnt','psydeptClsGnlSbdCnt','psydeptOpenHigSbdCnt','psydeptOpenGnlSbdCnt','isnrSbdCnt','anvirTrrmSbdCnt','dtrmSbdCnt'];
function scanClinicCount(value){
  if(!['string','number'].includes(typeof value)||!/^\d+$/.test(String(value).trim()))return null;
  const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
}
function scanClassifyClinic(place,evidence={},selected=Object.keys(HIRA_SPECIALTY_CODES)){
  const names=[...new Set(selected)].filter(n=>HIRA_SPECIALTY_CODES[n]);
  const assessment={status:'unverified',reason:'전문의 확인 필요',specialistCount:null,specialistCounts:{},matchedSpecialties:[],bedCount:null,checkedAt:evidence.checkedAt||'',criteriaVersion:SCAN_CLINIC_CRITERIA_VERSION};
  const done=(status,reason)=>({...assessment,status,reason});
  if(String(place.clinicCode||'')!=='31')return done(place.clinicCode?'excluded':'unverified',place.clinicCode?'의원급 외 의료기관 제외':'의료기관 종별 미확인');
  const facilities=Array.isArray(evidence.facilities)?evidence.facilities:[];
  // Inpatient capacity is informational; it does not determine competition for clinic-level institutions.
  if(facilities.some(r=>r&&typeof r==='object'&&SCAN_INPATIENT_FIELDS.some(k=>(scanClinicCount(r[k])??0)>0))){
    assessment.bedCount=Math.max(...facilities.flatMap(r=>SCAN_INPATIENT_FIELDS.map(k=>scanClinicCount(r?.[k])||0)));

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
  if(assessment.matchedSpecialties.length)return done('competitor','선택 과 전문의 신고 1명 이상 · 의원급');
  const declared=names.filter(n=>(place.specialties||[]).includes(n));
  if(declared.length)return done('declared',names.every(n=>assessment.specialistCounts[n]===0)?'선택 과 진료과목 신고 · 해당 과 전문의 신고 0명':'선택 과 진료과목 신고 · 해당 과 전문의 수 미확인');
  return done('unverified','선택 과 전문의 수 미확인 · 경쟁병원 집계 제외');
}
function scanClinicAssessmentLabel(place){
  return {competitor:'경쟁병원',declared:'심평원 신고의원',unverified:'분류 확인 필요',excluded:'분석 대상 제외'}[place.competitionAssessment?.status]||'분류 확인 필요';
}
/* CLINIC_CRITERIA_V377_END */
