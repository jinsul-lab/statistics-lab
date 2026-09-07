const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.9.html','utf8').replaceAll('3.5.9','3.5.10');
function replace(a,b){if(!s.includes(a))throw Error('Missing anchor '+a.slice(0,70));s=s.replace(a,b);}
replace('name:p.name,address:p.address,lat:p.lat,lng:p.lng,distance:p.distance,doctorCount:p.doctorCount,establishedDate:p.establishedDate,specialties:p.specialties,ykiho:p.ykiho','name:p.name,address:p.address,phone:p.phone,lat:p.lat,lng:p.lng,distance:p.distance,doctorCount:p.doctorCount,establishedDate:p.establishedDate,specialties:p.specialties,ykiho:p.ykiho');
replace('function scanReportScores(result){',fs.readFileSync('work/enrich_v3510.js','utf8')+'\nfunction scanReportScores(result){');
replace('const data=await scanFetchHiraDetails(place.ykiho);','const data=await scanFetchClinicEnriched(place);');
replace('scanState.infoWindow.setContent(scanHiraInfoHTML(place,data));','scanState.infoWindow.setContent(\'<div style="width:360px;max-height:480px;overflow:auto;padding:12px;background:white;color:#172b49;font-size:12px">\'+scanClinicEnrichedHTML(place,data)+\'</div>\');');
replace('금액 단위: 원. 미입력은 0원이 아닙니다. 임대조건은 직접 확인한 값으로 작성하세요.','공개 건물·기관 정보는 자동 반영합니다. 금액 단위: 원. 미입력은 0원이 아닙니다. 호실별 임대조건·면적은 공개 확인값이 없으면 미입력으로 남깁니다.');
replace('임대조건 · 사용자 확인값','임대조건 · 자동 조회 및 현장 확인값');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.5.10.html',s);console.log('Generated v3.5.10');
