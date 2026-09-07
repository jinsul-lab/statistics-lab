const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.5.5.html','utf8');
const c=vm.createContext({});
for(const name of ['scanCandidateRegion','scanIsSeoulCandidate','scanRegionalCoverage'])vm.runInContext(s.match(new RegExp('^function '+name+'\\([^]*?^}', 'm'))[0],c);
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('legal code takes precedence over ambiguous address',()=>assert.equal(c.scanCandidateRegion({legalCode:'2811010100',address:'서울 병원'}).name,'인천광역시'));
test('Seoul legal code works without address',()=>assert.equal(c.scanIsSeoulCandidate({legalCode:'1120010100'}),true));
test('Busan short address',()=>assert.equal(c.scanCandidateRegion({address:'부산 해운대구'}).name,'부산광역시'));
test('all current province codes',()=>{for(const code of ['11','26','27','28','29','30','31','36','41','43','44','46','47','48','50','51','52'])assert.equal(c.scanCandidateRegion({legalCode:code+'10101000'}).known,true);});
test('unknown address never guessed as Seoul',()=>assert.equal(c.scanCandidateRegion({address:'중앙로 1'}).known,false));
test('outside Seoul marked not offered',()=>assert.equal(c.scanRegionalCoverage({candidate:{address:'부산 해운대구'}})['서울 실시간'],'제공 지역 아님'));
test('unknown region marked separately',()=>assert.equal(c.scanRegionalCoverage({candidate:{}})['서울 실시간'],'지역 확인 필요'));
c.scanNearestSeoulHotspots=(a,n,r)=>{assert.equal(r,500);return []};c.scanNearestTradeAreas=()=>[];
test('chosen radius respected in coverage',()=>assert.equal(c.scanRegionalCoverage({candidate:{address:'서울 성동구'},radiusMeters:500})['서울 실시간'],'반경 내 지정지점 없음'));
test('partial commerce marked partial',()=>assert.equal(c.scanRegionalCoverage({candidate:{address:'서울 성동구'},radiusMeters:500,commerce:{apiConnected:true,apiPartial:true}})['서울 공식상권'],'일부 연결'));
test('empty commerce is not zero or connected',()=>assert.equal(c.scanRegionalCoverage({candidate:{address:'서울 성동구'},radiusMeters:500,commerce:{apiConnected:true,apiEmpty:true}})['서울 공식상권'],'자료 없음'));
console.log(count+' region tests passed.');
