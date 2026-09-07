const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let h=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.6.html','utf8').replaceAll('3.6.6','3.6.7');
function swap(a,b){assert.ok(h.includes(a),'Missing replacement: '+a.slice(0,60));h=h.replace(a,b);}
swap('function scanNumber(value){','function scanNumber(value){\n  if(value===null||value===undefined||String(value).trim()===\'\')return null;');
swap('let finished = false;\n    const done', 'let finished = false;\n    let watchdog;\n    const done');
swap('finished = true;\n      resolve({ places:collected','finished = true;\n      clearTimeout(watchdog);\n      resolve({ places:collected');
swap('const callback = (data,status,pagination)=>{\n      if(token', 'const armTimeout=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>done(token!==scanState.requestToken?{cancelled:true}:{error:true,truncated:collected.length>0}),30000);};\n    const callback = (data,status,pagination)=>{\n      if(finished)return;\n      if(token');
swap('pages < 45){\n          pagination.nextPage();','pages < 45){\n          armTimeout();\n          pagination.nextPage();');
swap('done({ truncated: pages >= 45 });','done({ truncated: !!pagination?.hasNextPage || Number(pagination?.totalCount)>collected.length });');
swap("const options = { location:center, radius, sort:kakao.maps.services.SortBy.DISTANCE };", "const options = { location:center, radius, sort:kakao.maps.services.SortBy.DISTANCE };\n    if(method==='keyword')options.category_group_code='HP8';\n    armTimeout();");
swap('검색된 개수</b>입니다.','검색된 개수</b>입니다. 경쟁 검색은 병원 분류(HP8)의 키워드 결과이며 신고 진료과·전문의 수와 다릅니다.');
// Preserve contact and actual place links across JSON/browser storage round trips.
swap('address:candidate.address,lat:candidate.lat','address:candidate.address,placeUrl:candidate.placeUrl||\'\',lat:candidate.lat');
swap('address:scanSiteText(c.address),lat:c.lat','address:scanSiteText(c.address),placeUrl:/^https?:\\/\\/place\\.kakao\\.com\\/\\d+(?:[/?#]|$)/i.test(c.placeUrl||\'\')?scanSiteText(c.placeUrl):\'\',lat:c.lat');
swap('name:scanSiteText(r.name),address:scanSiteText(r.address),lat:scanSiteNum(r.lat)','name:scanSiteText(r.name),address:scanSiteText(r.address),phone:scanSiteText(r.phone),lat:scanSiteNum(r.lat)');
const pos=h.lastIndexOf('</script>');h=h.slice(0,pos)+fs.readFileSync('work/quality_v367.js','utf8')+'\n'+h.slice(pos);
for(const m of h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.6.7.html',h);
fs.writeFileSync('jinsulmap/index.html',fs.readFileSync('jinsulmap/index.html','utf8').replaceAll('3.6.6','3.6.7'));
console.log('Generated v3.6.7; inline syntax passed');

