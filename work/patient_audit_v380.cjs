const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const h=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
function block(a,b){return h.slice(h.indexOf('function '+a+'('),h.indexOf('function '+b+'(',h.indexOf('function '+a+'(')));}
const ui={},messages=[],timers=[];
const c=vm.createContext({console,Map,Date,window:{},patients:[],patientLoadToken:0,$:id=>['patientImportMapping','patientAddressStatus','patientAddressRetry'].includes(id)?null:ui[id]||(ui[id]={}),toast:m=>messages.push(m),clusterer:{clear(){}},setTimeout:f=>timers.push(f)});
vm.runInContext(h.slice(h.indexOf('function calcAgeFromRow('),h.indexOf('// ENTER on hospital input'))+block('patientNewFlag','applyFilter')+block('bucketAge','patientAnalysisCircles')+'const patientMixAges=["0~19","20~29","30~39","40~49","50~59","60~69","70+","미상"];'+block('patientMixData','renderPatientMix'),c);
const fixture=[['차트번호','주소','성명','신규','구분','나이','진료일'],['A','지역A','가','Y','','20','2025-01-01'],['A','지역A','가','','재진','20','2025-01-01'],['B','지역A','나','Y','','29','2025-01-01'],['C','지역B','다','','90일초','40','2025-01-01'],['D','','라','','재진','','2025-01-01'],['D','','라','','재진','','2025-01-02'],['D','','라','','재진','','2025-01-03']];
c.parsePatients(fixture);
assert.deepEqual(Array.from(c.patients,p=>[p.id,p.total,p.type]),[['A',2,'신환 ▶ 재진 전환'],['B',1,'신환 (1회만)'],['C',1,'90일초'],['D',3,'재진']]);
// Independent fixture: 4 people, 7 source rows; same-date A still counts twice by the disclosed rule.
c.patients.forEach(p=>p.dong=p.addr||'미상');
const d=c.patientMixData(c.patients);
assert.equal(d.count,4);assert.equal(d.visits,7);assert.equal(d.ages[1].count,2);assert.equal(d.ages[1].visits,3);assert.equal(d.ages[3].count,1);assert.equal(d.ages[7].count,1);assert.equal(d.ages[7].visits,3);assert.equal(d.cumulative[0].patientPct,50);assert.equal(d.cumulative[0].visitPct,300/7);assert.equal(d.cumulative.at(-1).visitPct,100);
console.log('PASS independent fixture: 4 unique people / 7 records; new repeat 1/2=50%; age20s 2/4=50%, records3/7=42.857%; unknown age1/4=25%, records3/7; final cumulative100%');
c.patients=[];c.parsePatients([['전화번호','주소','성명'],['010-0000-0000','가','사람A'],['010-0000-0000','나','사람B']]);
assert.equal(c.patients.length,0);assert(messages.at(-1).includes('고유번호'));
c.parsePatients([['차트번호','주소','성명'],[0,'가','사람A'],[1,'나','사람B']]);assert.equal(c.patients.length,2);
c.parsePatients([['차트번호','주소','성명','신규'],['A','가','가','미상']]);assert.equal(c.patients[0].type,'재진');
assert.equal(c.calcAgeFromRow(null,'990231-1******'),null);
c.parsePatients([['차트번호','주소','성명'],['A','','가'],['A','유효주소','가']]);assert.equal(c.patients[0].addr,'유효주소');
console.log('PASS parser rejects unrelated IDs, preserves numeric ID0, handles unknown new flag, rejects impossible birth date, fills later valid address');
// Chart binding checked with an in-memory Chart constructor; no browser or network.
c.document={getElementById:id=>ui[id]||(ui[id]={setAttribute(){}})};
c.Chart=class{constructor(el,config){this.data=config.data;this.options=config.options;}destroy(){}};
c.chartObjAge=null;
vm.runInContext(block('pct','safeNum')+block('renderAgeDistribution','getVisitAgeFilter'),c);
c.renderAgeDistribution([{age:20},{age:null}]);assert.deepEqual(Array.from(c.chartObjAge.data.datasets[0].data),[0,1,0,0,0,0,0]);assert(ui.tblAge.innerHTML.includes('<td>20~29</td><td>1</td><td>100.0%</td>'));assert(!ui.tblAge.innerHTML.includes('<td>합계</td><td>2</td><td>100%</td>'));assert(ui.tblAge.innerHTML.includes('연령 확인')); 
c.renderAgeDistribution([]);assert(!ui.tblAge.innerHTML.includes('<td>합계</td><td>0</td><td>100%</td>'));console.log('PASS age distribution empty total has no false100%; known-age denominator visible; chart counts agree with table.');
