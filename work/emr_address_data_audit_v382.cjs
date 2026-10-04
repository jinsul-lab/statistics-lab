// Independent v3.8.1 baseline repro. Synthetic records only; no network or patient data.
// Run: node work/emr_address_data_audit_v382.cjs
// The pinned revision intentionally keeps the before-fix evidence reproducible.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const baseline='a5dee1f';
const html=cp.execFileSync('git',['show',baseline+':jinsulmap/jinsulmap.html'],{encoding:'utf8',maxBuffer:3000000});
function block(name,next){const a=html.indexOf('function '+name+'('),b=html.indexOf('function '+next+'(',a);assert(a>=0&&b>a);return html.slice(a,b);}
const ageStart=html.indexOf('function calcAgeFromRow('),ageEnd=html.indexOf('// ENTER on hospital input',ageStart);
function parse(rows){const ui={},messages=[],timers=[];const c=vm.createContext({Map,Date,window:{},patients:[],patientLoadToken:0,$:id=>ui[id]||(ui[id]={}),toast:m=>messages.push(m),clusterer:{clear(){}},setTimeout:f=>timers.push(f)});vm.runInContext(html.slice(ageStart,ageEnd)+block('patientNewFlag','applyFilter'),c);c.parsePatients(rows);return {patients:Array.from(c.patients,p=>({id:p.id,name:p.name,addr:p.addr,total:p.total})),messages};}
const fixtures=[
  {id:'metadata-before-header',rows:[['보고서 안내','병원 주소: 서울특별시 성동구'],['차트번호','주소','성명'],['S01','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients.length===0&&r.messages.some(m=>m.includes('고유번호')),wanted:'recognize actual patient header instead of report metadata'},
  {id:'detail-before-base',rows:[['차트번호','상세주소','환자주소','성명'],['S01','101동 101호','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients[0].addr==='101동 101호',wanted:'main patient address used; detail never queried alone'},
  {id:'split-address',rows:[['차트번호','주소1','주소2','성명'],['S01','서울특별시 성동구','왕십리로 320','합성A']],bad:r=>r.patients[0].addr==='서울특별시 성동구',wanted:'address parts combined without dropping street and number'},
  {id:'empty-road-valid-jibun',rows:[['차트번호','도로명주소','지번주소','성명'],['S01','','서울특별시 성동구 하왕십리동 966-1','합성A']],bad:r=>r.patients[0].addr==='',wanted:'alternative explicit patient address tried per row'},
  {id:'duplicate-address-column',rows:[['차트번호','주소','주소','성명'],['S01','','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients[0].addr==='',wanted:'duplicate address headers surfaced and viable source retained'},
  {id:'postal-column-first',rows:[['차트번호','주소우편번호','주소','성명'],['S01','04706','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients[0].addr==='04706',wanted:'postal codes excluded from geocode query fields'},
  {id:'employer-column-first',rows:[['차트번호','직장주소','환자주소','성명'],['S01','경기도 시흥시 정왕대로 210','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients[0].addr==='경기도 시흥시 정왕대로 210',wanted:'workplace/guardian/contact address not silently selected as residence'},
  {id:'parts-without-address-label',rows:[['차트번호','시도','시군구','도로명','건물번호','성명'],['S01','서울특별시','성동구','왕십리로','320','합성A']],bad:r=>r.patients.length===0,wanted:'recognize explicit administrative/street part headers'},
  {id:'later-placeholder-recovery',rows:[['차트번호','주소','성명'],['S01','미상','합성A'],['S01','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients[0].addr==='미상'&&r.patients[0].total===2,wanted:'placeholder values treated as missing and later valid address recovered'},
  {id:'conflicting-nonempty-addresses',rows:[['차트번호','주소','성명'],['S01','서울특별시 성동구 왕십리로 320','합성A'],['S01','경기도 시흥시 정왕대로 210','합성A']],bad:r=>r.patients[0].addr==='서울특별시 성동구 왕십리로 320'&&!('addressConflict' in r.patients[0]),wanted:'both addresses preserved and conflict signalled; date policy not guessed'},
  {id:'english-header',rows:[['Patient ID','Address','Name'],['S01','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients.length===0,wanted:'normalized explicit English aliases supported'},
  {id:'header-after-20-rows',rows:[...Array.from({length:21},()=>['보고서 설명']),['차트번호','주소','성명'],['S01','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients.length===0,wanted:'scan enough rows or report bounded-header limitation'},
  {id:'name-identifier-collision',rows:[['환자번호','주소','성명'],['S01','서울특별시 성동구 왕십리로 320','합성A']],bad:r=>r.patients[0].name==='S01',wanted:'identifier header must not be accepted as patient name'},
];
const results=fixtures.map(f=>{const actual=parse(f.rows);assert(f.bad(actual),'baseline no longer reproduces '+f.id);return {id:f.id,baselineDefectConfirmed:true,wanted:f.wanted,rows:f.rows.length-1};});
assert(html.includes('workbook.Sheets[workbook.SheetNames[0]]'),'first-sheet baseline check');
assert(html.includes('sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1})'),'raw conversion baseline check');
console.log(JSON.stringify({baseline,fixtureKind:'synthetic',confirmedDefects:results.length,staticObservations:['only first workbook sheet is considered','sheet_to_json omits raw:false, so formatted identifier text is not requested'],results},null,2));
