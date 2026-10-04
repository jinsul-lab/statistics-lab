// Address import and diagnostics. Raw patient data stays in this page's memory.
function patientHeaderKey(value){return String(value??'').replace(/[\s_\-()[\]{}\uFEFF]/g,'').toLowerCase();}
function patientIdColumn(head){const keys=head.map(patientHeaderKey);return keys.findIndex(k=>['차트번호','환자번호','환자id','chartid','patientid','id','차트','등록번호','환자등록번호','고유번호','수진자번호','환자코드'].includes(k));}
function patientAddressSchema(head){
  const keys=head.map(patientHeaderKey),excluded=k=>/직장|회사|사업장|보호자|병원|우편번호|청구|발송/.test(k);
  const priority=['환자주소','거주주소','자택주소','주민등록주소','도로명주소','기본주소','주소1','주소','지번주소','도로명','지번','address','address1'];
  const bases=keys.map((k,i)=>({k,i,rank:priority.indexOf(k)})).filter(x=>!excluded(x.k)&&(x.rank>=0||/^(환자|거주|자택)?주소(기본|도로명|지번)$/.test(x.k))).sort((a,b)=>(a.rank<0?99:a.rank)-(b.rank<0?99:b.rank)).map(x=>x.i);
  const find=list=>keys.findIndex(k=>list.includes(k));
  return {bases,detail:find(['상세주소','주소2','주소상세','세부주소','나머지주소','상세','address2']),number:find(['건물번호','번지','지번번호']),sido:find(['시도','시도명','광역시도']),sigungu:find(['시군구','시군구명','시구군']),dong:find(['읍면동','읍면동명','동읍면']),head};
}
function patientFindHeader(rows){
  let idOnly=-1;
  for(let i=0;i<Math.min(rows.length,100);i++){const head=rows[i]||[];if(patientIdColumn(head)<0)continue;if(idOnly<0)idOnly=i;const schema=patientAddressSchema(head);if(schema.bases.length||schema.sido>=0||schema.sigungu>=0)return i;}
  return idOnly;
}
function patientAddressText(value){const s=String(value??'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();return /^(?:-|미상|미확인|없음|unknown|null|undefined|n\/a|0)$/i.test(s)?'':s;}
function patientRowAddress(row,schema,override){
  const bases=override?.base>=0?[override.base]:schema.bases;
  const base=bases.map(i=>patientAddressText(row[i])).find(Boolean)||'';
  const detailIndex=override?.detail!==undefined?override.detail:schema.detail;
  const detail=detailIndex>=0?patientAddressText(row[detailIndex]):'';
  const prefix=[schema.sido,schema.sigungu,schema.dong].filter(i=>i>=0).map(i=>patientAddressText(row[i])).filter(Boolean);
  const detailFull=patientAddressQueries(detail).length>0&&/^(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)/.test(detail);
  let address=detailFull&&!patientAddressQueries(base).length?detail:base;
  const number=schema.number>=0?patientAddressText(row[schema.number]):'';
  if(address&&number&&!patientAddressQueries(address).length)address+=' '+number;
  const equivalents=value=>value.replace(/^서울(?:시|특별시)?(?=\s|$)/,'서울특별시').replace(/^경기(?:도)?(?=\s|$)/,'경기도').replace(/^(부산|대구|인천|광주|대전|울산)(?:시|광역시)?(?=\s|$)/,'$1광역시');
  for(let i=prefix.length-1;i>=0;i--){const part=prefix[i];if(!equivalents(address).includes(equivalents(part)))address=part+(address?' '+address:'');}
  if(address&&detail&&!detailFull&&!address.includes(detail))address+=' '+detail;
  return address;
}
function patientAddressQueries(raw){
  let q=patientAddressText(raw).replace(/^\s*(?:\(\s*\d{5,6}\s*\)|\[\s*\d{5,6}\s*\]|\d{3}-\d{3}|\d{5})\s*/, '').replace(/,/g,' ').replace(/\s+/g,' ').trim();
  const aliases={'서울시':'서울특별시','서울':'서울특별시','경기':'경기도','부산':'부산광역시','대구':'대구광역시','인천':'인천광역시','광주':'광주광역시','대전':'대전광역시','울산':'울산광역시','세종':'세종특별자치시','충북':'충청북도','충남':'충청남도','전남':'전라남도','경북':'경상북도','경남':'경상남도','전북':'전북특별자치도','강원':'강원특별자치도','제주':'제주특별자치도'};
  q=q.replace(/^([^ ]+)\s/,(_,name)=>(aliases[name]||name)+' ');
  q=q.replace(/([가-힣]+(?:대로|로|길))(?=\d)/g,'$1 ');
  const noBracket=q.replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/\s+/g,' ').trim();
  const building=noBracket.match(/^(.+?(?:대로|로|길)\s*\d+(?:-\d+)?)(?=\s|$)/)?.[1]||noBracket.match(/^(.+?(?:동|읍|면|리|가)\s+(?:산\s*)?\d+(?:-\d+)?)(?=\s|$)/)?.[1];
  return building?[...new Set([q,noBracket,building].filter(Boolean))].slice(0,3):[];
}
function patientTypeSelected(p){const key=p.type==='신환 (1회만)'?'new_only':p.type==='신환 ▶ 재진 전환'?'new_conv':p.type==='90일초'?'bit_90':'old';return !!toggleState[key];}
function patientAddressCoverage(rows){
  const counts={resolved:0,missing:0,pending:0,failed:0,unresolved:0,ambiguous:0,insufficient:0};let regionUnknown=0,conflicts=0;
  for(const p of rows){const state=p.geoState||(p.latlng?'resolved':p.addr?'unresolved':'missing');counts[state]=(counts[state]||0)+1;if(p.latlng&&!p.dong)regionUnknown++;if(p.addressConflict)conflicts++;}
  return {total:rows.length,...counts,regionUnknown,conflicts};
}
function patientAddressCoverageText(rows){const c=patientAddressCoverage(rows);return '주소 변환 '+c.total+'명 기준 · 좌표 확인 '+c.resolved+' · 원주소 없음 '+c.missing+' · 처리 중 '+c.pending+' · 검색 불일치 '+c.unresolved+' · 조회 실패 '+c.failed+' · 다중 후보 '+c.ambiguous+' · 번지/건물번호 부족 '+c.insufficient+' · 동 미확인 '+c.regionUnknown+(c.conflicts?' · 서로 다른 원주소 '+c.conflicts:'')+'명';}
function patientRenderAddressStatus(){
  const node=$('patientAddressStatus');if(!node)return;node.textContent=patientAddressCoverageText(patients);
  const retry=$('patientAddressRetry');if(retry)retry.disabled=patients.some(p=>p.geoState==='pending')||!patients.some(p=>['failed','unresolved','ambiguous'].includes(p.geoState));
}
function patientRenderImportMapping(rows,headIdx,schema,override){
  const node=$('patientImportMapping');if(!node)return;
  node.replaceChildren();const caption=document.createElement('p');caption.textContent='주소 열 자동 인식: '+(schema.bases.map(i=>schema.head[i]).join(' / ')||'지역 분리 열 또는 주소 열 없음')+' · 상세: '+(schema.detail>=0?schema.head[schema.detail]:'없음')+'. 의사랑·비트의 실제 내보내기 열을 확인하세요.';node.append(caption);
  const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='주소 열을 직접 지정';detail.append(summary);
  const selects=[];for(const [labelText,selected] of [['기본 주소',override?.base??schema.bases[0]??-1],['상세 주소',override?.detail??schema.detail]]){const label=document.createElement('label'),select=document.createElement('select');label.append(document.createTextNode(labelText));const empty=document.createElement('option');empty.value='-1';empty.textContent=labelText==='기본 주소'?'자동 선택':'사용 안 함';select.append(empty);schema.head.forEach((title,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=(i+1)+'. '+String(title||'제목 없음');select.append(option);});select.value=String(selected);label.append(select);detail.append(label);selects.push(select);}
  const button=document.createElement('button');button.type='button';button.className='btn outline';button.textContent='지정한 주소 열로 다시 분석';button.onclick=()=>parsePatients(rows,{base:Number(selects[0].value),detail:Number(selects[1].value)});detail.append(button);node.append(detail);
}
function patientGeoRequest(method,args,token,timeout=8000){return new Promise(resolve=>{
  let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>finish({state:'failed',reason:'응답 시간 초과'}),timeout);
  try{geocoder[method](...args,(rows,status,pagination)=>{if(token!==patientLoadToken)return finish({state:'cancelled'});if(status===kakao.maps.services.Status.OK)finish({state:'ok',rows,pagination});else if(status===kakao.maps.services.Status.ZERO_RESULT)finish({state:'unresolved'});else finish({state:'failed',reason:'API 오류'});},method==='addressSearch'?{size:30,analyze_type:'EXACT'}:undefined);}catch{finish({state:'failed',reason:'주소 API 호출 오류'});}
});}
async function patientResolveAddress(raw,token){
  const queries=patientAddressQueries(raw);if(!patientAddressText(raw))return {state:'missing'};if(!queries.length)return {state:'insufficient'};
  for(const query of queries){let response=await patientGeoRequest('addressSearch',[query],token);if(response.state==='failed'){await new Promise(r=>setTimeout(r,600));if(token!==patientLoadToken)return {state:'cancelled'};response=await patientGeoRequest('addressSearch',[query],token);}if(response.state==='cancelled'||response.state==='failed')return response;if(response.state!=='ok')continue;
    const records=response.rows||[],valid=records.filter(r=>!['REGION','ROAD'].includes(r.address_type)&&Number.isFinite(Number(r.x))&&Number.isFinite(Number(r.y))&&Number(r.x)>=124&&Number(r.x)<=132&&Number(r.y)>=32&&Number(r.y)<=39.9);
    if(!valid.length)continue;
    const locations=new Set(valid.map(r=>Number(r.x).toFixed(5)+','+Number(r.y).toFixed(5)));
    if(locations.size>1||response.pagination?.totalCount>records.length)return {state:'ambiguous'};
    const found=valid[0],a=found.address||{},road=found.road_address||{};let dong=a.region_3depth_h_name?[a.region_1depth_name,a.region_2depth_name,a.region_3depth_h_name].filter(Boolean).join(' '):'',basis=dong?'행정동':'';
    if(!dong&&typeof geocoder.coord2RegionCode==='function'){const region=await patientGeoRequest('coord2RegionCode',[Number(found.x),Number(found.y)],token);if(region.state==='cancelled')return region;const h=(region.rows||[]).find(r=>r.region_type==='H');if(h){dong=[h.region_1depth_name,h.region_2depth_name,h.region_3depth_name].filter(Boolean).join(' ');basis='행정동';}}
    if(!dong){const source=a.region_3depth_name?a:road;if(source.region_3depth_name){dong=[source.region_1depth_name,source.region_2depth_name,source.region_3depth_name].filter(Boolean).join(' ')+' (법정동)';basis='법정동';}}
    return {state:'resolved',lat:Number(found.y),lng:Number(found.x),dong,basis,query};
  }return {state:'unresolved'};
}
function patientAttachGeo(p,result){
  p.geoState=result.state;p.geoReason=result.reason||'';if(result.state!=='resolved')return;
  p.latlng=new kakao.maps.LatLng(result.lat,result.lng);p.dong=result.dong||'';p.dongBasis=result.basis;p.geocodedQuery=result.query;
  const color=REP_COLOR[p.type],svg='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="6" fill="'+color+'" stroke="white" stroke-width="1"/></svg>';
  p.marker=new kakao.maps.Marker({position:p.latlng,image:new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(14,14))});
  const iw=new kakao.maps.InfoWindow({content:'<div style="padding:5px;font-size:12px"><b>'+patientStatsEscape(p.id)+' '+patientStatsEscape(p.name)+'</b><br>'+patientTypeLabel(p.type)+'<br>기록 '+p.total+'건</div>',removable:true});kakao.maps.event.addListener(p.marker,'click',()=>iw.open(map,p.marker));
}
async function patientStartGeocoding(rows,token,retryOnly=false){
  const grouped=new Map();for(const p of rows){if(retryOnly&&!['failed','unresolved','ambiguous'].includes(p.geoState))continue;const key=patientAddressText(p.addr);p.geoState=key?'pending':'missing';if(!key)continue;if(!patientAddressQueries(key).length){p.geoState='insufficient';continue;}if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p);}
  patientRenderAddressStatus();const jobs=[...grouped],workers=[];let cursor=0,nextStart=0;
  for(let i=0;i<Math.min(3,jobs.length);i++)workers.push((async()=>{while(cursor<jobs.length&&token===patientLoadToken){const [address,people]=jobs[cursor++],delay=Math.max(0,nextStart-Date.now());nextStart=Math.max(nextStart,Date.now())+150;if(delay)await new Promise(r=>setTimeout(r,delay));if(token!==patientLoadToken)return;const result=await patientResolveAddress(address,token);if(token!==patientLoadToken)return;people.forEach(p=>patientAttachGeo(p,result));patientRenderAddressStatus();}})());
  await Promise.all(workers);if(token!==patientLoadToken)return;applyFilter();if(rows.some(p=>p.latlng))$('btnFit').click();patientRenderAddressStatus();toast('주소 처리 완료 · 미확인 사유를 확인하세요.');
}
function patientAddressStatisticsNote(){
  const population=patients.filter(patientTypeSelected),hasRadius=patientAnalysisCircles().length>0;
  return patientAddressCoverageText(population)+(hasRadius?' · 반경 분석에서 좌표 미확인 '+population.filter(p=>!p.latlng).length+'명 제외. 이 환자들을 반경 밖으로 판단하지 않습니다.':'')+' · 지역 통계는 행정동 우선, 법정동 대체는 이름에 표시합니다.';
}
