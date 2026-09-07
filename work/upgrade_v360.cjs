const fs=require('fs');let s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.11.html','utf8').replaceAll('3.5.11','3.6.0');
function replace(a,b){if(!s.includes(a))throw Error('Missing anchor '+a.slice(0,90));s=s.replace(a,b);}
replace('<div class="brand">JINSUL MAP v3.6.0</div>','<div class="brand">JINSUL MAP</div>');
replace('function scanReportScores(result){',fs.readFileSync('work/audit_v360.js','utf8')+'\nfunction scanReportScores(result){');
replace("const parking=['indrMechUtcnt','oudrMechUtcnt','indrAutoUtcnt','oudrAutoUtcnt'].reduce((sum,key)=>sum+(scanNumber(row[key])||0),0);","const parking=scanKnownBuildingCount(row,['indrMechUtcnt','oudrMechUtcnt','indrAutoUtcnt','oudrAutoUtcnt']);");
replace("elevators:(scanNumber(scanPick(row,'rideUseElvtCnt'))||0)+(scanNumber(scanPick(row,'emgenUseElvtCnt'))||0)","elevators:scanKnownBuildingCount(row,['rideUseElvtCnt','emgenUseElvtCnt'])");
for(const name of ['b.parking','b.elevators','item.building.parking'])s=s.replaceAll('${'+name+'.toLocaleString()}대','${scanBuildingCountLabel('+name+')}');
replace("['건물 전체 주차',b.parking+'대'],['승강기',b.elevators+'대']","['건물 전체 주차',scanBuildingCountLabel(b.parking)],['승강기',scanBuildingCountLabel(b.elevators)]");
replace('const rows=[];let total=null;\n  for(let page=1;page<=10;page++){','const rows=[];let total=null;const pageState={total:null,count:0,seen:new Set()};\n  for(let page=1;page<=10;page++){');
replace("if(total!==null&&total!==data.total)throw Error('조회 도중 대장 건수가 변경되어 재조회 필요');total=data.total;","scanRegistryAcceptPage(data,pageState);total=data.total;");
// Existing zeroes with complete source fields remain meaningful actual zeroes.
s=s.replace('Number.isFinite(b.parking)&&b.parking>0','Number.isFinite(b.parking)&&b.parking>=0').replace('Number.isFinite(b.elevators)&&b.elevators>0','Number.isFinite(b.elevators)&&b.elevators>=0');
fs.writeFileSync('jinsulmap/JINSUL_MAP_v3.6.0.html',s);console.log('Generated v3.6.0');
