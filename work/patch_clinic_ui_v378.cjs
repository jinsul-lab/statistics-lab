/* Scoped v3.7.8 clinic classification UI patch. Does not change classification helpers.
 * Default is a dry run. --write updates the single current HTML after every match passes.
 */
const fs=require('fs');
const path=require('path');
const replacements=[
  ['경쟁의원은 4개 유관과 전문의·입원 병상 없음이 확인된 의원이며,','경쟁의원은 4개 유관과 전문의 신고가 확인된 의원급 기관이며 입원 병상 유무와 관계없이 포함합니다.'],
  ['직선거리 기준입니다. 경쟁병원은 선택 과 전문의 신고 1명 이상·의원급·입원 병상 0개가 확인된 곳입니다. 실제 상주 여부는 별도 확인이 필요하며, 미확인 기관은 집계에서 제외합니다.','직선거리 기준입니다. 경쟁병원은 의원급이며 선택 과 전문의 신고가 1명 이상인 곳입니다. 입원 병상 유무와 관계없이 포함합니다. 전문의 미확인도 진료과목 신고가 있으면 심평원 신고의원으로 표시하며, 실제 상주 여부는 별도 확인이 필요합니다.'],
  ['붉은색은 대상 전문의 신고·의원급·입원 병상 0개가 확인된 경쟁병원입니다. 청록색은 해당 과 전문의 신고 0명인 심평원 신고의원입니다. 미확인은 목록에서 별도 확인하며 두 분류에 중복 표시하지 않습니다.','붉은색은 선택 과 전문의 신고 1명 이상인 의원급 경쟁병원입니다. 청록색은 선택 진료과목은 신고했지만 해당 전문의가 0명 또는 미확인인 심평원 신고의원입니다. 입원 병상은 제외 조건이 아니며 두 분류에 중복 표시하지 않습니다.'],
  ["designationStatus:'4개 유관과 전문의 · 입원 병상 없음 확인'","designationStatus:'의원급 · 4개 유관과 전문의 신고 확인 · 입원 병상 제한 없음'"],
  ["'경쟁의원 전문의·입원 병상 확인 중…'","'경쟁의원 종별·전문의 신고 확인 중…'"],
  ["'전문의·입원 병상 미확인 기관은 경쟁의원 수에 포함하지 않음'","'기관 종별·진료과 확인 필요 자료는 경쟁의원 수에 포함하지 않음'"],
  ["'전문의·입원 병상 확인 중 '","'의원 종별·전문의 신고 확인 중 '"],
  ["['입원·종별 제외',h.excluded.length]","['의원 외 종별 제외',h.excluded.length]"],
  ["$('scanHiraSpecialties').innerHTML='<p class=\"scanNote\">신고의원은 선택 과 진료과목은 있으나 해당 과 전문의 신고가 0명이고, 입원 병상 0개가 확인된 곳입니다. 조회 실패·자료 누락은 확인 필요로 분리합니다.</p>';","$('scanHiraSpecialties').innerHTML='<p class=\"scanNote\">신고의원은 선택 진료과목을 신고했지만 해당 과 전문의가 0명 또는 미확인인 의원입니다. 전문의 미확인 '+h.declared.filter(p=>p.competitionAssessment?.specialistCount==null).length+'곳은 0명으로 단정하지 않습니다. 입원 병상 유무와 관계없이 표시하며, 기관 종별·진료과 자체가 확인되지 않으면 분류 확인 필요로 분리합니다.</p>';"],
  ['분류 확인 필요 · 전문의·병상 검증 전 자료입니다.','분류 확인 필요 · 의원 종별·전문의 신고 검증 전 자료입니다.'],
  ['조건을 모두 확인한 경쟁병원은 없습니다. 전문의·병상 미확인 목록과 조회 상태를 확인하세요.','확인된 경쟁병원은 없습니다. 심평원 신고의원 목록의 전문의 미확인 상태와 조회 결과를 확인하세요.'],
  ['이전 기준으로 저장된 신고기관 목록입니다. 전문의·병상 조건을 검증한 경쟁병원 목록이 아니며, 현재 기준으로 보려면 다시 스캔하세요.','이전 분류 기준으로 저장된 목록입니다. 병상 제외 등 과거 조건으로 누락된 의원이 있을 수 있으므로 현재 기준으로 보려면 다시 스캔하세요.'],
  ['전체 의원 참고 목록입니다. 대상 전문의·입원 병상 조건을 적용한 경쟁병원 수에 포함하지 않습니다.','전체 의원 참고 목록입니다. 선택 과 전문의 신고를 확인한 경쟁병원 수와 구분합니다.'],
  ['선택 과 전문의 신고 1명 이상·의원급·입원 병상 0개 확인. 실제 상주 여부는 별도 확인이 필요합니다.','의원급·선택 과 전문의 신고 1명 이상. 입원 병상은 참고 정보이며 유무와 관계없이 포함합니다. 실제 상주 여부는 별도 확인이 필요합니다.'],
  [' · 병상/종별 제외 ',' · 의원 외 종별 제외 '],
  ['경쟁병원 · 전문의·무입원 확인','경쟁병원 · 의원급·전문의 신고 확인'],
  ['경쟁병원은 스캔에서 선택한 유관과 전문의 신고·의원급·입원 병상 0개가 확인된 곳입니다. 전체 의원 참고 목록은 경쟁병원 집계에 포함하지 않습니다.','경쟁병원은 스캔에서 선택한 유관과 전문의 신고가 확인된 의원급 기관입니다. 입원 병상 유무와 관계없이 포함하며, 전체 의원 참고 목록과 구분합니다.'],
  ['곳을 전문의·병상 조건으로 분류했습니다.','곳을 의원 종별·선택 과 전문의 신고로 분류했습니다.'],
  ['<small>해당 과 전문의 신고 0명</small>','<small>진료과목 신고 · 전문의 0명/미확인</small>'],
  ['partial:!!source?.errorLabels?.length||(!reference&&!!source?.unverified?.length),unverifiedCount:source?.unverified?.length||0,','partial:!!source?.errorLabels?.length||(!reference&&(!!source?.unverified?.length||(source?.declared||[]).some(p=>p.competitionAssessment?.specialistCount==null))),unverifiedCount:source?.unverified?.length||0,specialistUnverifiedCount:(source?.declared||[]).filter(p=>p.competitionAssessment?.specialistCount==null).length,'],
  ['unverifiedCount:scanClinicCount(comp.unverifiedCount),excludedClinicalCount:','unverifiedCount:scanClinicCount(comp.unverifiedCount),specialistUnverifiedCount:scanClinicCount(comp.specialistUnverifiedCount),excludedClinicalCount:'],
  ["' · 분류 미확인 '+(c.unverifiedCount||0)+'곳 · 의원 외 종별 제외 '","' · 분류 미확인 '+(c.unverifiedCount||0)+'곳 · 전문의 미확인 신고의원 '+(c.specialistUnverifiedCount||0)+'곳 · 의원 외 종별 제외 '"],
  ['return {places,unavailable:!!data.unavailable,partial:!!data.partial||!!data.errorLabels?.length,','return {places,unavailable:!!data.unavailable,partial:!!data.partial||!!data.errorLabels?.length||within(data.declared).some(p=>p.competitionAssessment?.specialistCount==null),'],
  ['declaredCount:within(data.declared).length,unverifiedCount:within(data.unverified).length,excludedCount:','declaredCount:within(data.declared).length,unverifiedCount:within(data.unverified).length,specialistUnverifiedCount:within(data.declared).filter(p=>p.competitionAssessment?.specialistCount==null).length,excludedCount:'],
  ["'곳 · 판정 미확인 '+result.unverifiedCount+'곳'","'곳 (전문의 미확인 '+(result.specialistUnverifiedCount||0)+'곳) · 판정 미확인 '+result.unverifiedCount+'곳'"],
  ["'경쟁의원 일부 조회 실패 · 확인된 결과만 표시'","'경쟁의원 일부 조회 실패·전문의 미확인 · 확인된 결과만 표시'"],
];
function patch(source){
  let html=source;
  for(const [from,to] of replacements){
    const count=html.split(from).length-1;
    if(count===0&&html.includes(to))continue;
    if(count!==1)throw Error('Expected one match ('+count+'): '+from.slice(0,100));
    html=html.replace(from,to);
  }
  return html;
}
module.exports={patch,replacements};
if(require.main===module){
  const filename=path.join(__dirname,'../jinsulmap/jinsulmap.html');
  const source=fs.readFileSync(filename,'utf8'),updated=patch(source);
  if(process.argv.includes('--write'))fs.writeFileSync(filename,updated,'utf8');
  process.stdout.write(JSON.stringify({checks:replacements.length,changed:source!==updated,written:process.argv.includes('--write')})+'\n');
}
