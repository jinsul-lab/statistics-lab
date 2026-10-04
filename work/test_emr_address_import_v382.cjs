// Regression audit of the actual current HTML helpers. Synthetic records only.
// No address API calls; pinned public SheetJS download is used for file-format tests.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
const failures=[];let passed=0;
function check(name,fn){try{fn();passed++;}catch(e){failures.push({name,error:e.message});}}
function node(tag='div'){return {tagName:tag,children:[],value:'',textContent:'',style:{},append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},setAttribute(){},addEventListener(){},click(){this.onclick?.();}};}
function context(XLSX){const ui={},messages=[],timers=[];const c=vm.createContext({Map,Date,Uint8Array,ArrayBuffer,TextDecoder,window:{},patients:[],$:id=>ui[id]||(ui[id]=node()),toast:m=>messages.push(m),clusterer:{clear(){}},setTimeout:f=>timers.push(f),clearTimeout(){},document:{createElement:node,createTextNode:text=>({textContent:text})},XLSX,FileReader:class{readAsArrayBuffer(file){this.onload({target:{result:file.bytes}});}}});const a=html.indexOf('function calcAgeFromRow('),b=html.indexOf('// ENTER on hospital input',a);const first=html.indexOf('let patientFileReadToken=0;'),end=html.indexOf('function applyFilter(',first);assert(a>=0&&b>a&&first>=0&&end>first);vm.runInContext(html.slice(a,b)+html.slice(first,end),c);return {c,ui,messages,timers};}
function parse(rows,override){const fixture=context();fixture.c.parsePatients(rows,override);return fixture;}
function first(rows,override){return parse(rows,override).c.patients[0];}
const full='서울특별시 성동구 왕십리로 320';
check('metadata-before-header',()=>assert.equal(first([['병원 주소: 서울특별시 성동구'],['차트번호','주소','성명'],['S01',full,'합성A']]).addr,full));
check('detail-before-base',()=>assert.equal(first([['차트번호','상세주소','환자주소','성명'],['S01','101동 101호',full,'합성A']]).addr,full+' 101동 101호'));
check('split-address',()=>assert.equal(first([['차트번호','주소1','주소2','성명'],['S01','서울특별시 성동구','왕십리로 320','합성A']]).addr,full));
check('empty-road-valid-jibun',()=>assert.equal(first([['차트번호','도로명주소','지번주소'],['S01','','서울특별시 성동구 하왕십리동 966-1']]).addr,'서울특별시 성동구 하왕십리동 966-1'));
check('duplicate-address-column',()=>assert.equal(first([['차트번호','주소','주소'],['S01','',full]]).addr,full));
check('postal-column-excluded',()=>assert.equal(first([['차트번호','주소우편번호','주소'],['S01','04706',full]]).addr,full));
check('workplace-column-excluded',()=>assert.equal(first([['차트번호','직장주소','환자주소'],['S01','경기도 시흥시 정왕대로 210',full]]).addr,full));
check('guardian-column-excluded',()=>assert.equal(first([['차트번호','보호자주소','환자주소'],['S01','경기도 시흥시 정왕대로 210',full]]).addr,full));
check('parts-with-building-number',()=>assert.equal(first([['차트번호','시도','시군구','도로명','건물번호'],['S01','서울특별시','성동구','왕십리로','320']]).addr,full));
check('placeholder-then-valid',()=>{const p=first([['차트번호','주소'],['S01','미상'],['S01',full]]);assert.equal(p.addr,full);assert.equal(p.total,2);assert(!p.addressConflict);});
check('conflicting-address-preserved',()=>{const p=first([['차트번호','주소'],['S01',full],['S01','경기도 시흥시 정왕대로 210']]);assert.equal(p.addr,full);assert.equal(p.addressConflict,true);assert.equal(p.rawAddresses.length,2);assert.equal(p.total,2);});
check('english-header',()=>{const p=first([['Patient ID','Address','Name'],['S01',full,'합성A']]);assert.equal(p.addr,full);assert.equal(p.name,'합성A');});
check('header-after-20-rows',()=>assert.equal(first([...Array.from({length:21},()=>['안내']),['차트번호','주소'],['S01',full]]).addr,full));
check('name-identifier-collision',()=>assert.equal(first([['환자번호','주소','성명'],['S01',full,'합성A']]).name,'합성A'));
check('numeric-identifier-zero',()=>assert.equal(first([['환자번호','주소'],[0,full]]).id,'0'));
check('direct-address-override',()=>{const rows=[['차트번호','주소','주소','상세주소'],['S01','경기도 시흥시 정왕대로 210',full,'101호']];assert.equal(first(rows,{base:2,detail:-1}).addr,full);});
check('override-select-keeps-records',()=>{const rows=[['차트번호','주소','별도주소'],['S01','',full],['S01','',full]];const f=parse(rows);const details=f.ui.patientImportMapping.children.find(x=>x.tagName==='details');const labels=details.children.filter(x=>x.tagName==='label');labels[0].children.find(x=>x.tagName==='select').value='2';labels[1].children.find(x=>x.tagName==='select').value='-1';details.children.find(x=>x.tagName==='button').click();assert.equal(f.c.patients[0].addr,full);assert.equal(f.c.patients[0].total,2);assert.equal(f.c.window.patientImportQuality.repeatedRows,1);});
check('province-alias-does-not-double-prefix',()=>assert.equal(first([['차트번호','시도','주소'],['S01','서울시',full]]).addr,full));
check('detail-never-alone',()=>{const p=first([['차트번호','상세주소'],['S01','101동 101호']]);assert.equal(p.addr,'');assert.equal(p.geoState,'missing');});
check('full-address-in-second-part-with-empty-first',()=>assert.equal(first([['차트번호','주소1','주소2'],['S01','',full]]).addr,full));
check('full-address-second-part-does-not-repeat-first-prefix',()=>assert.equal(first([['차트번호','주소1','주소2'],['S01','서울특별시 성동구',full]]).addr,full));
check('coverage-state-sum',()=>{const c=context().c,r=c.patientAddressCoverage([{geoState:'resolved',latlng:{}},{geoState:'missing'},{geoState:'failed'},{geoState:'ambiguous'},{geoState:'insufficient'}]);assert.equal(r.total,5);assert.equal(r.resolved+r.missing+r.failed+r.ambiguous+r.insufficient,5);});
(async()=>{
 const res=await fetch('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');if(!res.ok)throw Error('Pinned library download failed');const module={exports:{}};vm.runInNewContext(await res.text(),{module,exports:module.exports,Buffer,Uint8Array,ArrayBuffer,console,require},{timeout:15000});const XLSX=module.exports;
 async function process(bytes,name){const f=context(XLSX);await f.c.processFile({name,bytes});return f;}
 const ws=XLSX.utils.aoa_to_sheet([['차트번호','주소','성명'],[123,full,'합성A'],['123','경기도 시흥시 정왕대로 210','합성B']]);ws.A2.z='000000';delete ws.A2.w;
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['병원 주소: 안내'],['요약 정보']]),'안내');XLSX.utils.book_append_sheet(wb,ws,'환자자료');
 const xlsx=await process(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}),'synthetic.xlsx');
 check('xlsx-real-process-formatted-id-and-second-sheet',()=>{assert.deepEqual(Array.from(xlsx.c.patients,p=>p.id),['000123','123']);assert.equal(xlsx.c.window.patientImportQuality.sheetName,'환자자료');});
 const csv=await process(Buffer.from('차트번호,주소,성명\r\n000123,'+full+',합성A\r\n123,경기도 시흥시 정왕대로 210,합성B\r\n','utf8'),'synthetic.csv');
 check('csv-real-process-leading-zero',()=>assert.deepEqual(Array.from(csv.c.patients,p=>p.id),['000123','123']));
 const wbSummary=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wbSummary,XLSX.utils.aoa_to_sheet([['차트번호','집계'],['S01','요약']]),'번호요약');XLSX.utils.book_append_sheet(wbSummary,ws,'환자자료');const summary=await process(XLSX.write(wbSummary,{bookType:'xlsx',type:'buffer'}),'synthetic-summary.xlsx');
 check('prefer-full-patient-sheet-over-id-only-summary',()=>assert.equal(summary.c.window.patientImportQuality.sheetName,'환자자료'));
 const text='차트번호\t주소\t성명\r\n000123\t'+full+'\t합성A\r\n';const utf16=await process(Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(text,'utf16le')]),'synthetic-utf16.tsv');
 check('utf16le-bom-tsv-real-process',()=>assert.equal(utf16.c.patients[0]?.addr,full));
 const utf16bePayload=Buffer.from(text,'utf16le').swap16();const utf16be=await process(Buffer.concat([Buffer.from([0xfe,0xff]),utf16bePayload]),'synthetic-utf16be.tsv');
 check('utf16be-bom-tsv-real-process',()=>assert.equal(utf16be.c.patients[0]?.addr,full));
 check('source-sheet-name-recorded-without-source-values',()=>{assert.equal(xlsx.c.window.patientImportQuality.sheetName,'환자자료');assert.equal(xlsx.c.window.patientImportQuality.sourceRows,2);assert.equal(xlsx.c.window.patientImportQuality.acceptedRows,2);assert(!JSON.stringify(xlsx.c.window.patientImportQuality).includes(full));});
 console.log(JSON.stringify({fixtureKind:'synthetic',passed,failed:failures.length,failures},null,2));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
