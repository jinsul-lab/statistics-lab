const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
function fn(name){const start=h.indexOf('function '+name+'(');assert(start>=0);return h.slice(start,h.indexOf('\n}\n',start)+2);}
const c=vm.createContext({scanEscapeHTML:x=>String(x),scanClamp:x=>Math.max(0,Math.min(100,x))});
vm.runInContext(fn('scanReportScores')+'\n'+fn('scanReportInsights'),c);
const r={radiusMeters:5000,competitors:Array.from({length:20},(_,i)=>({distance:100+i*100})),density:20/(Math.PI*25),specialties:[{name:'정형외과',count:20}],facilities:{},population:{}};
const scores=c.scanReportScores(r);assert(!scores.scores.some(s=>s.key==='competition'));
assert.equal(scores.total,c.scanReportScores({...r,density:20}).total);
let output=c.scanReportInsights(r,scores);assert(output.includes('500m 이내 5곳'));assert(output.includes('1km 이내 10곳'));assert(output.includes('최단 직선거리 100m'));assert(!output.includes('scanInsight good'));
output=c.scanReportInsights({...r,radiusMeters:300},scores);assert(output.includes('500m 이내 검색 반경 밖'));
output=c.scanReportInsights({...r,competitors:[{distance:null}]},scores);assert(output.includes('거리 미확인 제외'));assert(output.includes('최단 직선거리 확인 자료 없음'));
for(const m of h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
assert(!h.includes('경쟁병원 저밀도'));assert(!h.includes('상권 활력'));assert(h.includes('tabPatientMix'));
console.log('PASS competition score exclusion, density independence, radius boundaries, missing distance, neutral wording, inline syntax, patient mix');
