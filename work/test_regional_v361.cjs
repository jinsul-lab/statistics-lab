const fs=require('fs'),vm=require('vm'),a=require('assert/strict');
const html=fs.readFileSync('jinsulmap/JINSUL_MAP_v3.6.1.html','utf8');
const c=vm.createContext({scanSiteEscape:s=>String(s??'').replaceAll('<','&lt;'),scanIsSeoulCandidate:p=>p.address.startsWith('서울'),scanDetailMetric:(...v)=>v.join(' '),scanReportTable:v=>JSON.stringify(v)});
vm.runInContext(fs.readFileSync('work/regional_v361.js','utf8'),c);
let n=0;function test(name,f){f();console.log('PASS '+name);n++}
for(const [v,w] of [['101','101호'],['101호','101호'],['101호호','101호'],['B101','B101호'],['제101호','제101호'],['1층 일부','1층 일부'],['',''],['101호 일부','101호 일부']])test('unit '+v,()=>a.equal(c.scanUnitLabel(v),w));
const r={candidate:{address:'경기도 부천시'},radiusMeters:800,hira:{places:[{name:'의원',distance:12,address:'중동'}],specialties:[{name:'정형외과',count:1}]}};
test('non Seoul shows data and exact radius',()=>{const s=c.scanClinicRegional(r);a.ok(s.includes('800m')&&s.includes('정형외과')&&s.includes('의원')&&s.includes('1곳'))});
test('no official data does not imply zero',()=>{const s=c.scanClinicRegional({...r,hira:null});a.ok(s.includes('조회 불가'));a.ok(!s.includes('공식 고유 의원 0곳'))});
test('partial specialty failure explicit',()=>a.ok(c.scanClinicRegional({...r,hira:{...r.hira,specialties:[{name:'통증',error:true}]}}).includes('일부 진료과 조회 실패')));
test('Seoul without area reason',()=>a.ok(c.scanClinicRegional({...r,candidate:{address:'서울 강남구'}}).includes('공식상권 중심점이 없어')));
test('escape names',()=>a.ok(!c.scanClinicRegional({...r,candidate:{address:'<script>'}}).includes('<script>')));
test('syntax',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1])});
test('both unit display paths fixed',()=>{a.ok(!html.includes("unit.unit+'호'"));a.ok(!html.includes("u.unit+'호'"));a.ok(html.includes('scanClinicRegional(result)'))});
console.log(n+' tests passed');

