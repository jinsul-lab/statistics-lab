const fs=require('fs');
let h=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.0.html','utf8').replaceAll('3.6.0','3.6.1');
h=h.replace("unit.unit+'호'","scanUnitLabel(unit.unit)").replace("u.unit+'호'","scanUnitLabel(u.unit)");
const old="$('scanClinicBody').innerHTML='<div class=\"scanInsight\">서울시 의원 업종 통계는 선택 반경 안에 공식상권 중심점이 있는 서울 후보지에 제공됩니다. 전국 진료과별 의원은 기존 심평원 분석을 이용하세요.</div>';scanClinicStatus('제공 범위 밖');";
if(!h.includes(old))throw Error('Missing regional branch');
h=h.replace(old,"$('scanClinicBody').innerHTML=scanClinicRegional(result);scanClinicStatus(result.hira&&!result.hira.unavailable?'전국 공식 의원 현황':'공식 의원 조회 확인 필요');");
h=h.replace('function scanRegistryParcel(',fs.readFileSync('work/regional_v361.js','utf8')+'\nfunction scanRegistryParcel(');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.6.1.html',h);
fs.writeFileSync('jinsulmap/index.html',fs.readFileSync('jinsulmap/index.html','utf8').replaceAll('3.6.0','3.6.1'));
