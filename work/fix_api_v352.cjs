const fs=require('fs');
let h=fs.readFileSync('JINSUL_MAP_v3.5.1.html','utf8').replace(/\r\n/g,'\n');
function replace(a,b){a=a.replace(/\r\n/g,'\n');b=b.replace(/\r\n/g,'\n');if(!h.includes(a))throw Error('Missing edit anchor: '+a.slice(0,60));h=h.replace(a,b);}
function fn(name,source){const re=new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm');if(!re.test(h))throw Error(name);h=h.replace(re,()=>source);}
h=h.replaceAll('v3.5.1','v3.5.2');
// coord2Address supplies the parcel, coord2RegionCode supplies the legal code.
replace('function scanResolveCandidate(query){',`async function scanCompleteCandidate(candidate){
  if(/^\\d{10}$/.test(String(candidate.legalCode||'')))return candidate;
  if(typeof geocoder.coord2RegionCode!=='function')return candidate;
  return new Promise(resolve=>{
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);resolve(candidate);};
    const timer=setTimeout(finish,10000);
    try{geocoder.coord2RegionCode(candidate.lng,candidate.lat,(rows,status)=>{
      if(finished)return;
      const legal=status===kakao.maps.services.Status.OK?rows?.find(row=>row.region_type==='B'):null;
      if(legal&&/^\\d{10}$/.test(String(legal.code||''))){
        candidate.legalCode=String(legal.code);
        candidate.sidoName=legal.region_1depth_name||'';
        candidate.sggName=legal.region_2depth_name||'';
        candidate.admName=legal.region_3depth_name||'';
      }
      finish();
    });}catch{finish();}
  });
}

function scanResolveCandidate(query){`);
replace('resolve(candidate);\r\n            });','resolve(scanCompleteCandidate(candidate));\r\n            });');
replace('}else resolve(candidate);','}else resolve(scanCompleteCandidate(candidate));');
// Run property APIs independently of SGIS authentication and census.
replace('    if(marketToken===scanState.requestToken)await scanPrepareProperty(region,candidate,marketToken);','');
replace("      const legal=String(candidate?.legalCode||'');\r\n      if(/^\\d{10}$/.test(legal))await scanPrepareProperty({legCode:legal,sggCode:legal.slice(0,5),jibunMain:candidate.jibunMain,jibunSub:candidate.jibunSub,mountain:candidate.mountain},candidate,marketToken);",'');
replace('    const sgisPromise=scanPrepareSgis(candidate,token);',`    const propertyPromise=scanPrepareProperty({legCode:candidate.legalCode,jibunMain:candidate.jibunMain,jibunSub:candidate.jibunSub,mountain:candidate.mountain,sidoName:candidate.sidoName,sggName:candidate.sggName,admName:candidate.admName},candidate,token);
    const sgisPromise=scanPrepareSgis(candidate,token);`);
replace('Promise.allSettled([sgisPromise,populationPromise,commercePromise,radiusCommercePromise])','Promise.allSettled([propertyPromise,sgisPromise,populationPromise,commercePromise,radiusCommercePromise])');
replace("const district=String(region?.sggCode||region?.admCode?.slice(0,5)||'');if(!/^\\d{5}$/.test(district))return null;", "const legal=String(region?.legCode||'');if(!/^\\d{10}$/.test(legal))throw new Error('후보지의 법정동 코드를 확인하지 못해 실거래 조회를 생략했습니다.');\n  const district=legal.slice(0,5);");
replace("  const rows=settled.flatMap(entry=>entry.status==='fulfilled'?entry.value:[]);", "  if(settled.every(entry=>entry.status==='rejected'))throw settled[0].reason;\n  const rows=settled.flatMap(entry=>entry.status==='fulfilled'?entry.value:[]);");
replace("const periods=months.map(month=>{const items=rows.filter(row=>row.month===month);return{month,count:items.length,medianAmount:scanMedian(items.map(item=>item.amount)),medianArea:scanMedian(items.map(item=>item.area))};});", "const periods=months.map((month,index)=>{const items=rows.filter(row=>row.month===month);const failed=settled[index].status==='rejected';return{month,count:failed?null:items.length,failed,medianAmount:scanMedian(items.map(item=>item.amount)),medianArea:scanMedian(items.map(item=>item.area))};});");
replace('const parcel=scanParcelParams(region);if(!parcel)return null;',"const parcel=scanParcelParams(region);if(!parcel)throw new Error('후보지의 법정동·지번을 확인하지 못해 건축물대장 조회를 생략했습니다.');");
// Do not expose upstream message text, which can echo a request or credential.
replace('async function scanFetchWithTimeout(url,timeoutMs=15000){',`function scanApiCodeError(code){
  const safe=String(code||'UNKNOWN').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);
  const labels={'03':'조건에 맞는 자료가 없습니다.','05':'제공기관 응답이 지연되고 있습니다.','10':'조회 조건을 확인해야 합니다.','12':'API 경로를 확인해야 합니다.','20':'API 접근 권한 오류입니다.','22':'일일 호출 한도를 초과했습니다.','23':'초당 호출 한도를 초과했습니다.','30':'API 인증정보가 거부되었습니다.','31':'API 이용기간 오류입니다.'};
  return new Error((labels[safe]||'공식 API가 오류를 반환했습니다.')+' (코드 '+safe+')');
}

function scanApiErrorMessage(error){
  if(error?.name==='AbortError'||error?.name==='TimeoutError')return '응답 대기시간을 초과했습니다. 잠시 후 다시 스캔해주세요.';
  if(error?.name==='TypeError')return '브라우저에서 API 응답을 받지 못했습니다. 네트워크·CORS·HTTPS 연결을 확인해야 합니다.';
  return String(error?.message||'API 조회에 실패했습니다.').replace(/https?:\\/\\/[^\\s<>]+/g,'[요청 주소]').replace(/[A-Za-z0-9_%+=/-]{20,}/g,'[숨김]').slice(0,240);
}

async function scanRequestText(url,timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{cache:'no-store',mode:'cors',signal:controller.signal});
    if(!response.ok)throw new Error('API HTTP 응답 오류 ('+response.status+')');
    return await response.text();
  }catch(error){throw new Error(scanApiErrorMessage(error));}
  finally{clearTimeout(timer);}
}

async function scanFetchWithTimeout(url,timeoutMs=15000){`);
fn('scanFetchWithTimeout',`async function scanFetchWithTimeout(url,timeoutMs=15000){
  const text=await scanRequestText(url,timeoutMs);
  try{return JSON.parse(text);}catch{throw new Error('API 응답이 JSON 형식이 아닙니다.');}
}`);
fn('scanFetchApiDocument',`async function scanFetchApiDocument(url,timeoutMs=15000){
  return scanParseApiText(await scanRequestText(url,timeoutMs));
}`);
replace("if(source.startsWith('{')||source.startsWith('['))return JSON.parse(source);", "if(source.startsWith('{')||source.startsWith('[')){try{return JSON.parse(source);}catch{throw new Error('API JSON 응답을 해석하지 못했습니다.');}}");
replace("if(code&&!['00','000','INFO-000'].includes(code))throw new Error(message||`공식 API 조회 실패 (${code})`);", "if(code&&!['0','00','000','INFO-000'].includes(code))throw scanApiCodeError(code);\n    if(!payload.querySelector('body')&&!code)throw new Error('공식 API XML 응답 구조를 확인하지 못했습니다.');");
replace("const code=String(header.resultCode??header.RESULT_CODE??payload?.RESULT?.CODE??'');", "const code=String(header.resultCode??header.RESULT_CODE??header.code??payload?.RESULT?.CODE??'');");
replace("if(code&&!['00','000','INFO-000'].includes(code))throw new Error(message||`공식 API 조회 실패 (${code})`);", "if(code&&!['0','00','000','INFO-000'].includes(code))throw scanApiCodeError(code);\n  if(!root.body&&!payload?.body)throw new Error('공식 API JSON 응답 구조를 확인하지 못했습니다.');");
// Top-level R-ONE errors previously became an empty successful table.
replace("const result=head.find(item=>item?.RESULT)?.RESULT||{};", "const result=head.find(item=>item?.RESULT)?.RESULT||payload?.RESULT||{};\n  if(payload?.error)throw new Error('R-ONE 프록시가 오류를 반환했습니다.');");
replace("if(code&&!['00','000','INFO-000'].includes(code))throw new Error(result.MESSAGE||`R-ONE 조회 실패 (${code})`);", "if(code&&!['00','000','INFO-000'].includes(code))throw scanApiCodeError(code);\n  if(!blocks.length)throw new Error('R-ONE 통계 응답 구조를 확인하지 못했습니다.');");
replace("  const scopes=[...new Set(Object.values(rows).flat().map", "  if(Object.values(rows).some(items=>!items.length))throw new Error('R-ONE 임대지표 자료가 비어 있습니다.');\n  const scopes=[...new Set(Object.values(rows).flat().map");
// Keep cause information in each panel instead of implying a lack of approval.
replace("scanState.roneError='';\n  const empty=$('scanPropertyEmpty')", "scanState.roneError='';scanState.buildingError='';scanState.realtyError='';\n  const empty=$('scanPropertyEmpty')");
replace("scanState.roneError=roneResult.status==='rejected'?String(roneResult.reason?.message||'프록시 조회 실패'):'';", "scanState.roneError=roneResult.status==='rejected'?scanApiErrorMessage(roneResult.reason):'';\n  scanState.buildingError=buildingResult.status==='rejected'?scanApiErrorMessage(buildingResult.reason):'';\n  scanState.realtyError=realtyResult.status==='rejected'?scanApiErrorMessage(realtyResult.reason):'';");
replace('후보지의 법정동·지번을 확정하지 못했거나 해당 필지의 표제부가 없어 건축물대장을 연결하지 못했습니다.', "${scanEscapeHTML(scanState.buildingError||'해당 필지의 건축물 표제부 자료가 없습니다.')}");
replace('최근 상업·업무용 매매 실거래를 불러오지 못했습니다.</div>', "최근 상업·업무용 매매 실거래를 불러오지 못했습니다. ${scanEscapeHTML(scanState.realtyError||'')}</div>");
replace("${error?.name==='AbortError'?'공식 API 응답이 지연되고 있습니다.':'API 승인·네트워크 상태를 확인해주세요.'}", '${scanApiErrorMessage(error)}');
replace('specialtyResults.push({name,count:places.length,error:failed});',"specialtyResults.push({name,count:places.length,error:failed,errorMessage:failed?scanApiErrorMessage(entry.reason):''});");
replace("${item.error?'공식 API 조회 실패':'공식 신고'}", "${item.error?scanEscapeHTML(item.errorMessage||'공식 API 조회 실패'):'공식 신고'}");
// A wholly failed details call must not be cached as an empty success.
replace("})).then(entries=>({detail:","})).then(entries=>{if(entries.every(entry=>entry.status==='rejected'))throw entries[0].reason;return {detail:");
replace("partial:entries.some(entry=>entry.status==='rejected')}));", "partial:entries.some(entry=>entry.status==='rejected')};});");
replace("  promise.catch(()=>scanState.hiraDetailCache.delete(ykiho));", "  promise.then(data=>{if(data.partial)scanState.hiraDetailCache.delete(ykiho);},()=>scanState.hiraDetailCache.delete(ykiho));");
// Reject unexpected Seoul response shapes instead of presenting no-data success.
replace("const resultCode = payload?.RESULT?.['RESULT.CODE'];", "const resultCode = payload?.RESULT?.['RESULT.CODE']||payload?.RESULT?.CODE;");
replace("if(resultCode && resultCode !== 'INFO-000') throw new Error('서울시 API 조회 실패');", "if(resultCode && resultCode !== 'INFO-000') throw scanApiCodeError(resultCode);");
replace("if(code&&code!=='INFO-000')throw new Error('서울시 상권 API 조회 실패');", "if(code==='INFO-200')return {rows:[],total:0};\n      if(code&&code!=='INFO-000')throw scanApiCodeError(code);\n      if(!block||!Array.isArray(block.row))throw new Error('서울시 상권 응답 구조를 확인하지 못했습니다.');");
replace('서울시 공개 API 상태 또는 브라우저의 외부 API 허용 여부를 확인해주세요.', '${scanEscapeHTML(scanApiErrorMessage(error))}');
replace("if(floatingResult.status==='rejected')notices.push('유동인구 조회에 실패했습니다.');", "if(floatingResult.status==='rejected')notices.push('유동인구: '+scanApiErrorMessage(floatingResult.reason));");
replace("if(storeResult.status==='rejected')notices.push('점포 조회에 실패했습니다.');", "if(storeResult.status==='rejected')notices.push('점포: '+scanApiErrorMessage(storeResult.reason));");
replace('  scanState.commerce=data;if(scanState.result)scanState.result.commerce=data;', "  data.apiConnected=floatingResult.status==='fulfilled'||storeResult.status==='fulfilled';\n  if(storeResult.status==='rejected')data.stores={count:null,open:null,close:null};\n  scanState.commerce=data;if(scanState.result)scanState.result.commerce=data;");
replace('${stores.count.toLocaleString()}곳','${stores.count===null?\'조회 불가\':stores.count.toLocaleString()+\'곳\'}');
replace('${stores.open.toLocaleString()} / ${stores.close.toLocaleString()}곳',"${stores.open===null||stores.close===null?'조회 불가':stores.open.toLocaleString()+' / '+stores.close.toLocaleString()+'곳'}");
replace("['서울 공식상권',Boolean(result.commerce)","['서울 공식상권',Boolean(result.commerce?.apiConnected)");
replace('    const first=await scanFetchRonePage(table.id,table.itemId,1);','    const first=await scanFetchRonePage(table.id,table.itemId,1);\n    if(!first.rows.length)throw new Error(\'R-ONE 통계표에 조회 가능한 자료가 없습니다.\');');
replace("placeUrl:'',legalCode:String(item.address?.b_code||''),", "placeUrl:'',sidoName:String(item.address?.region_1depth_name||''),sggName:String(item.address?.region_2depth_name||''),admName:String(item.address?.region_3depth_name||''),legalCode:String(item.address?.b_code||''),");
fs.writeFileSync('JINSUL_MAP_v3.5.2.html',h);
console.log('Created JINSUL_MAP_v3.5.2.html');
