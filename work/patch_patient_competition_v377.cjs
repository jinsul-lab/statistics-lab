/* Patient facility search integration only. Applies in memory unless --write is explicit. */
const fs = require('node:fs');
const path = require('node:path');

const helpers = String.raw`
function facilityCompetitionSearchScope(bounds){
  const sw=bounds?.getSouthWest(),ne=bounds?.getNorthEast();
  const south=Number(sw?.getLat()),west=Number(sw?.getLng()),north=Number(ne?.getLat()),east=Number(ne?.getLng());
  if(![south,west,north,east].every(Number.isFinite)||south>north||west>east||south< -90||north>90||west< -180||east>180)throw Error('경쟁의원 검색 범위를 확인하지 못했습니다. 지도를 다시 선택하세요.');
  const candidate={lat:(south+north)/2,lng:(west+east)/2};
  const radius=Math.max(1,Math.ceil(Math.max(...[[south,west],[south,east],[north,west],[north,east]].map(([lat,lng])=>scanHaversineMeters(candidate.lat,candidate.lng,lat,lng)))));
  if(radius>5000)throw Error('경쟁의원 검색은 지도 전체를 덮는 반경이 5km 이내여야 합니다. 지도를 확대해 다시 검색하세요.');
  return {candidate,radius};
}
function facilityVerifiedClinicPlace(place){
  const a=place?.competitionAssessment;
  if(a?.status!=='competitor')return null;
  const lat=place.lat,lng=place.lng;
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
  const sourceRecordId=String(place.ykiho||place.id||'');
  if(!sourceRecordId)return null;
  const sourceUrl='https://www.data.go.kr/data/15001698/openapi.do';
  return {...place,id:sourceRecordId,place_name:String(place.name||''),road_address_name:String(place.address||''),address_name:String(place.address||''),x:String(lng),y:String(lat),
    sourceProvider:'hira',sourceRecordId,sourceUrl,officialSourceUrl:sourceUrl,recordDate:'',retrievedAt:a.checkedAt||'',
    facilityType:'경쟁의원',designationStatus:'4개 유관과 전문의 · 입원 병상 없음 확인',competitionAssessment:{...a,specialistCounts:{...(a.specialistCounts||{})},matchedSpecialties:[...(a.matchedSpecialties||[])]},
    sourceRefs:[{provider:'hira',recordId:sourceRecordId,sourceUrl,recordDate:'',retrievedAt:a.checkedAt||'',criteriaVersion:a.criteriaVersion||''}]};
}
async function facilityFetchCompetition(bounds,isCurrent){
  const scope=facilityCompetitionSearchScope(bounds);
  const data=await scanFetchHiraCompetition(SCAN_SPECIALTY_ORDER,scope.candidate,scope.radius,0,isCurrent);
  if(!isCurrent()||!data)return {cancelled:true};
  const within=rows=>(rows||[]).filter(p=>facilityWithinBounds({x:p.lng,y:p.lat},bounds));
  const places=within(data.competitors).map(facilityVerifiedClinicPlace).filter(Boolean);
  return {places,unavailable:!!data.unavailable,partial:!!data.partial||!!data.errorLabels?.length,
    declaredCount:within(data.declared).length,unverifiedCount:within(data.unverified).length,excludedCount:within(data.excluded).length};
}
`;

function applyPatientCompetitionPatch(input){
  let html=input;
  const replace=(before,after)=>{
    const count=html.split(before).length-1;
    if(count!==1)throw Error('Expected one patient patch anchor, found '+count+': '+before.slice(0,110));
    html=html.replace(before,after);
  };
  replace('function facilityWithinBounds(place,bounds){',helpers+'\nfunction facilityWithinBounds(place,bounds){');
  replace("else if (t === 'ortho') { k = ['정형외과','통증의학과','재활의학과','신경외과']; imageSrc = SVG_MARKERS.ortho; }","else if (t === 'ortho') { imageSrc = SVG_MARKERS.ortho; }");
  replace('    let rawResults = []; for(const kw of k){',String.raw`    let rawResults = [];
    if(t === 'ortho'){
      $('searchStatus').innerText='경쟁의원 전문의·입원 병상 확인 중…';
      try{
        const result=await facilityFetchCompetition(bounds,()=>requestToken===facilitySearchRequestToken);
        if(result.cancelled||requestToken!==facilitySearchRequestToken)return;
        rawResults=result.places;
        if(result.unavailable)searchIssues.push('경쟁의원 심평원 조회 불가 · 0곳을 의미하지 않음');
        else searchNotes.push('확인된 경쟁의원 '+rawResults.length+'곳 · 심평원 신고의원 '+result.declaredCount+'곳 · 판정 미확인 '+result.unverifiedCount+'곳'+(result.excludedCount?' · 조건 제외 '+result.excludedCount+'곳':''));
        if(result.partial)searchIssues.push('경쟁의원 일부 조회 실패 · 확인된 결과만 표시');
        if(result.unverifiedCount)searchIssues.push('전문의·입원 병상 미확인 기관은 경쟁의원 수에 포함하지 않음');
      }catch(error){
        if(requestToken!==facilitySearchRequestToken)return;
        searchIssues.push(error?.message||'경쟁의원 조회 실패 · 0곳을 의미하지 않음');
      }
    }
    for(const kw of k){`);
  replace("${p.sourceProvider==='official'?'[공식 쉼터] ':p.seniorKind==='auxiliary'?'[보조 문의처] ':''}","${p.sourceProvider==='hira'?'[경쟁의원] ':p.sourceProvider==='official'?'[공식 쉼터] ':p.seniorKind==='auxiliary'?'[보조 문의처] ':''}");
  replace("    sourceFacilityType:provider==='official'?String(p.facilityType||''):'',sourceFacilitySubtype:provider==='official'?String(p.facilitySubtype||''):'',",String.raw`    sourceFacilityType:['official','hira'].includes(provider)?String(p.facilityType||''):'',sourceFacilitySubtype:provider==='official'?String(p.facilitySubtype||''):'',
    ...(provider==='hira'?{facilityType:'경쟁의원',designationStatus:String(p.designationStatus||''),competitionAssessment:p.competitionAssessment?{...p.competitionAssessment,specialistCounts:{...(p.competitionAssessment.specialistCounts||{})},matchedSpecialties:[...(p.competitionAssessment.matchedSpecialties||[])]}:null}:{}),`);
  replace("return {'출처':p.sourceProvider==='official'?'서울 열린데이터광장':'카카오 장소 검색','지정 구분':p.designationStatus||'',","return {'출처':p.sourceProvider==='hira'?'건강보험심사평가원':p.sourceProvider==='official'?'서울 열린데이터광장':'카카오 장소 검색','지정 구분':p.designationStatus||'',");
  replace("    '카카오 확인':p.mapLinks?.kakao||''};",String.raw`    '카카오 확인':p.mapLinks?.kakao||'',
    ...(p.sourceProvider==='hira'?{'경쟁 판정':p.competitionAssessment?.status==='competitor'?'경쟁의원':'미확인','분류 기준':p.competitionAssessment?.criteriaVersion||'미확인',
      '확인 진료과':(p.competitionAssessment?.matchedSpecialties||[]).join(', '),'유관과 전문의(명)':p.competitionAssessment?.specialistCount??'미확인',
      '입원 병상(개)':p.competitionAssessment?.bedCount??'미확인','판정 근거':p.competitionAssessment?.reason||'',
      '판정 확인 시각':p.competitionAssessment?.checkedAt||'','심평원 기관 식별자':p.sourceRecordId||''}:{} )};`);
  replace("(p.type === 'ortho') ? '경쟁병원'", "(p.type === 'ortho') ? '경쟁의원'");
  replace("(r.type === 'ortho') ? '경쟁병원'", "(r.type === 'ortho') ? '경쟁의원'");
  const orthoButtons=html.match(/<div class="search-btn" data-target="ortho">[\s\S]*?<\/div>/g)||[];
  if(orthoButtons.length!==1||!orthoButtons[0].includes('<span>경쟁병원</span>'))throw Error('Patient ortho button anchor changed.');
  replace(orthoButtons[0],orthoButtons[0].replace('<span>경쟁병원</span>','<span>경쟁의원</span>'));
  replace('현재 지도 범위 · 카카오 키워드별 최대 45건. 서울 공식자료는 별도 전체 페이지 조회 후 지도 범위로 필터합니다.', '현재 지도 범위 · 쉼터·복지관은 카카오 키워드별 최대 45건. 경쟁의원은 4개 유관과 전문의·입원 병상 없음이 확인된 의원이며, 지도 전체를 덮는 조회 반경이 5km 이내일 때 조회합니다. 서울 공식자료는 별도 전체 페이지 조회 후 지도 범위로 필터합니다.');
  return html;
}

module.exports={applyPatientCompetitionPatch,helpers};
if(require.main===module){
  if(process.argv[2]!=='--write')throw Error('Explicit --write required; otherwise import applyPatientCompetitionPatch for in-memory validation.');
  const target=path.resolve(process.argv[3]||path.join(__dirname,'../jinsulmap/jinsulmap.html'));
  const input=fs.readFileSync(target,'utf8');
  const output=applyPatientCompetitionPatch(input);
  fs.writeFileSync(target,output);
  console.log('Applied patient competition integration.');
}
