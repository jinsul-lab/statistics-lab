let aiActiveController=null;
function aiFriendlyError(status,message){
  if(status===429&&/credit|prepay|billing|quota.*exceed/i.test(message))return 'API 잔액 또는 사용 한도가 부족합니다. 선택한 공급자의 API 결제·한도를 확인한 뒤 다시 실행하세요.';
  if(status===429)return '호출이 몰려 일시 제한되었습니다. 잠시 후 다시 실행하세요.';
  if(status===401)return 'API 인증에 실패했습니다. Worker에 등록된 해당 공급자의 키를 확인하세요.';
  if(status===403)return 'API 접근이 거부되었습니다. 허용된 사이트 주소와 API 권한을 확인하세요.';
  if(status>=500)return 'AI 제공 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 실행하세요.';
  return 'AI 요청 실패 ('+status+'): '+String(message).slice(0,250);
}
proxyCallJSON=async function(base,payload){
  const controller=aiActiveController||new AbortController();let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},45000);
  try{
    const response=await fetch(String(base).trim().replace(/\/+$/,''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw Error('AI 프록시 응답 형식이 올바르지 않습니다.');}
    if(!response.ok)throw Error(aiFriendlyError(response.status,data.error?.message||data.error||data.message||''));
    return data;
  }catch(error){if(controller.signal.aborted)throw Error(timedOut?'45초 응답 대기시간을 초과했습니다. 다시 실행할 수 있습니다.':'요청을 취소했습니다.');if(error instanceof TypeError)throw Error('AI 서버 연결 실패. 네트워크와 Worker 허용 주소를 확인하세요.');throw error;}
  finally{clearTimeout(timer);}
};
const runAIBeforeUX=runAI;
runAI=async function(){
  if(aiActiveController)return;
  aiActiveController=new AbortController();const button=$('btnRunAI');button.disabled=true;button.textContent='AI 응답 대기 중…';
  let cancel=$('btnCancelAI');if(!cancel){cancel=document.createElement('button');cancel.id='btnCancelAI';cancel.className='btn outline';button.after(cancel);}cancel.hidden=false;cancel.textContent='요청 취소';cancel.onclick=()=>{aiActiveController?.abort();cancel.disabled=true;};cancel.disabled=false;
  try{await runAIBeforeUX();}finally{aiActiveController=null;button.disabled=false;button.textContent='AI 전략 생성';cancel.hidden=true;}
};
function mapUXInstall(){
  if($('mapToolStatus'))return;
  const paths={btnCadastral:'M3 3h7v7H3z M14 3h7v12h-7z M3 14h7v7H3z M14 19h7',btnTraffic:'M8 2h8v20H8z M12 6h.01 M12 12h.01 M12 18h.01',btnBike:'M5 17m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M19 17m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M5 17l5-9 5 9H5 M9 5h4 M15 4h3l1 13',btnRoadview:'M12 3a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M7 21l2-9h6l2 9 M9 15h6',btnRadius:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 12h9 M12 10v4',btnDist:'M3 17L17 3l4 4L7 21z M8 12l3 3 M12 8l3 3',btnArea:'M4 4h16v16H4z M4 4l16 16',btnPoint:'M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14z M12 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6',btnClearTools:'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7'};
  const labels={btnCadastral:'지적',btnTraffic:'교통',btnBike:'자전거',btnRoadview:'로드뷰',btnRadius:'반경',btnDist:'거리',btnArea:'면적',btnPoint:'포인트',btnClearTools:'도형 삭제'};
  const cancel=()=>{deactivateDrawTools();roadviewMode=false;map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);$('btnRoadview').classList.remove('active');sync();};
  const panel=document.createElement('div');panel.id='mapToolStatus';panel.innerHTML='<span id="mapToolHint">지도를 이동하거나 도구를 선택하세요</span><button id="mapToolFinish">완료</button><button id="mapToolCancel">취소</button><details><summary>내 도형 관리</summary><select id="mapShapeSelect" aria-label="삭제할 도형"></select><button id="mapShapeDelete">선택 삭제</button></details>';
  $('map').parentElement.append(panel);
  function shapes(){return [...circles.map((o,i)=>({label:'반경 '+(i+1),remove:()=>{o.circle.setMap(null);o.polyline.setMap(null);o.overlay.setMap(null);circles.splice(i,1);}})),...(window.__areaPolys||[]).map((o,i)=>({label:'면적 '+(i+1),remove:()=>{o.poly.setMap(null);o.overlay.setMap(null);window.__areaPolys.splice(i,1);}})),...distMeasurements.map((o,i)=>({label:'거리 '+(i+1),remove:()=>{o.line.setMap(null);o.overlay.setMap(null);distMeasurements.splice(i,1);}})),...promoPoints.map((o,i)=>({label:'포인트 '+(i+1),remove:()=>{o.setMap(null);promoPoints.splice(i,1);}}))];}
  function sync(){
    for(const id in paths)if(id!=='btnClearTools')$(id).setAttribute('aria-pressed',String($(id).classList.contains('active')));
    const active=['btnRadius','btnDist','btnArea','btnPoint','btnRoadview'].find(id=>$(id).classList.contains('active'));
    $('mapToolHint').textContent=active?labels[active]+': '+(active==='btnRadius'?'중심과 끝점을 차례로 클릭':active==='btnRoadview'?'파란 도로를 클릭':active==='btnPoint'?'지도 클릭으로 추가':'지점 클릭 후 완료')+' · Esc 취소':'지도를 이동하거나 도구를 선택하세요';
    $('mapToolFinish').hidden=!['btnDist','btnArea'].includes(active);$('mapToolCancel').hidden=!active;
    const list=shapes();$('mapShapeSelect').innerHTML=list.length?list.map((o,i)=>'<option value="'+i+'">'+o.label+'</option>').join(''):'<option value="">도형 없음</option>';
  }
  for(const id in paths){const b=$(id);const before=b.onclick;b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[id]+'"/></svg><span class="lbl">'+labels[id]+'</span>';b.title=labels[id];b.setAttribute('aria-label',labels[id]);
    if(id!=='btnClearTools')b.onclick=function(e){const on=b.classList.contains('active');if(on&&['btnRadius','btnDist','btnArea','btnPoint','btnRoadview'].includes(id))cancel();else before.call(this,e);sync();};
  }
  $('btnClearTools').onclick=()=>{cancel();while(shapes().length)shapes()[0].remove();sync();toast('측정 도형과 지정 포인트를 삭제했습니다.');};
  $('mapShapeDelete').onclick=()=>{const value=$('mapShapeSelect').value;if(value!=='')shapes()[Number(value)]?.remove();sync();};
  $('mapToolCancel').onclick=cancel;
  $('mapToolFinish').onclick=()=>{
    if($('btnDist').classList.contains('active')){if(!distDrawing||distPathData.length<2)return toast('두 지점을 먼저 선택하세요.');distLine.setPath(distPathData);distOverlay.setPosition(distPathData[distPathData.length-1]);distOverlay.setContent(getTimeHTML(Math.round(distLine.getLength())));distOverlay.setMap(map);kakao.maps.event.trigger(map,'rightclick',{latLng:distPathData[distPathData.length-1]});}
    else if($('btnArea').classList.contains('active')){if(!areaDrawing||areaPath.length<3)return toast('세 지점을 먼저 선택하세요.');kakao.maps.event.trigger(map,'rightclick',{latLng:areaPath[areaPath.length-1]});}sync();
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))cancel();});
  ['click','rightclick'].forEach(name=>kakao.maps.event.addListener(map,name,()=>setTimeout(sync,0)));
  $('btnMapSky').textContent='위성';$('btnMapTopo').textContent='위성+라벨';
  sync();
}
const setupToolbarBeforeUX=setupToolbar;
setupToolbar=function(){setupToolbarBeforeUX();mapUXInstall();};
if(typeof map!=='undefined'&&map)mapUXInstall();
if($('btnRunAI'))$('btnRunAI').onclick=runAI;

