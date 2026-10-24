// Real source stays in memory. Output contains aggregate counts/schema only.
// This file never transmits patient rows/addresses or writes data snapshots.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const input=process.argv[2]||'C:/Users/withe/Desktop/경로토탈.xls';
const html=fs.readFileSync('jinsulmap/jinsulmap.html','utf8');
function element(tag='div'){return {tagName:tag,children:[],value:'',textContent:'',style:{},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v},setAttribute(){},addEventListener(){},click(){this.onclick?.()}};}
async function main(){
 const library=await fetch('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');if(!library.ok)throw Error('library');
 const mod={exports:{}};vm.runInNewContext(await library.text(),{module:mod,exports:mod.exports,Buffer,Uint8Array,ArrayBuffer,require,console},{timeout:15000});const XLSX=mod.exports;
 const bytes=fs.readFileSync(input);let workbook;try{workbook=XLSX.read(bytes,{type:'buffer'});}catch{throw Error('workbook-read');}
 const ui={},timers=[],notices=[];let geocoderCalls=0;
 const c=vm.createContext({Map,Set,Date,Uint8Array,ArrayBuffer,TextDecoder,window:{},patients:[],$:id=>ui[id]||(ui[id]=element()),toast:m=>notices.push(m),geocoder:{addressSearch(){geocoderCalls++;throw Error('disabled')},coord2RegionCode(){geocoderCalls++;throw Error('disabled')}},clusterer:{clear(){}},setTimeout:f=>timers.push(f),clearTimeout(){},document:{createElement:element,createTextNode:text=>({textContent:text})},XLSX,FileReader:class{readAsArrayBuffer(file){this.onload({target:{result:file.bytes}})}}});
 const ageStart=html.indexOf('function calcAgeFromRow('),ageEnd=html.indexOf('// ENTER on hospital input',ageStart),start=html.indexOf('let patientFileReadToken=0;'),end=html.indexOf('function applyFilter(',start);vm.runInContext(html.slice(ageStart,ageEnd)+html.slice(start,end),c);
 const sheets=workbook.SheetNames.map(name=>({name,rows:XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,raw:false,defval:''})}));
 const accepted=sheets.filter(s=>c.patientFindHeader(s.rows)>=0);const selected=accepted.find(s=>{const schema=c.patientAddressSchema(s.rows[c.patientFindHeader(s.rows)]||[]);return schema.bases.length||schema.sido>=0||schema.sigungu>=0})||accepted[0];
 const output={scope:'real local workbook; no geocoder/network patient requests',checkedAt:new Date().toISOString(),appTitle:html.match(/<title>([^<]*)<\/title>/)?.[1],appCodeSha256:crypto.createHash('sha256').update(html).digest('hex'),sheetjs:XLSX.version,fileBytes:bytes.length,containerMagic:bytes.subarray(0,8).toString('hex'),sheetCount:sheets.length,sheetRows:sheets.map(s=>s.rows.length)};
 if(!selected){output.selected=false;console.log(JSON.stringify(output,null,2));return;}
 const hi=c.patientFindHeader(selected.rows),head=selected.rows[hi],schema=c.patientAddressSchema(head);c.parsePatients(selected.rows);
 const patients=Array.from(c.patients),hasAddress=patients.filter(p=>String(p.addr||'').trim()),queries=patients.filter(p=>c.patientAddressQueries(p.addr).length),rejected=hasAddress.filter(p=>!c.patientAddressQueries(p.addr).length);
 output.selectedIndex=sheets.indexOf(selected);output.headerRow=hi+1;output.headers=head.map(v=>String(v));output.addressBaseIndices=Array.from(schema.bases);output.detailIndex=schema.detail;output.rawNonemptyDataRows=selected.rows.slice(hi+1).filter(r=>r.some(v=>String(v??'').trim())).length;
 const quality=c.window.patientImportQuality;output.quality={sourceRows:quality?.sourceRows,acceptedRows:quality?.acceptedRows,missingIdRows:quality?.missingIdRows,headerRows:quality?.headerRows,repeatedRows:quality?.repeatedRows};
 output.people={total:patients.length,addressPresent:hasAddress.length,addressMissing:patients.length-hasAddress.length,queryEligible:queries.length,rejectedBeforeApi:rejected.length,rejectedFractionOfAddressPresent:hasAddress.length?rejected.length/hasAddress.length:null,conflictingAddresses:patients.filter(p=>p.addressConflict).length,uniqueRawAddresses:new Set(hasAddress.map(p=>p.addr)).size,uniqueEligibleRawAddresses:new Set(queries.map(p=>p.addr)).size};
 output.queryVariantCounts=Object.fromEntries([1,2,3].map(n=>[n,queries.filter(p=>c.patientAddressQueries(p.addr).length===n).length]));
 output.queryQueueMinimumStartSpacingSeconds=Math.max(0,output.people.uniqueEligibleRawAddresses-1)*0.15;
 const count=f=>rejected.filter(p=>f(String(p.addr))).length;output.rejectedShape={containsDigit:count(s=>/\d/.test(s)),noDigit:count(s=>!/\d/.test(s)),roadWithoutRecognizedBuilding:count(s=>/(대로|로|길)/.test(s)),hasDong:count(s=>/(동|읍|면|리|가)/.test(s)),trailingNumber:count(s=>/\d(?:-\d+)?\s*$/.test(s)),hasPostalPrefix:count(s=>/^\s*[\[(]?\d{5,6}/.test(s)),containsComma:count(s=>s.includes(',')),containsHyphen:count(s=>s.includes('-')),containsParen:count(s=>/[()]/.test(s)),noWhitespace:count(s=>!/\s/.test(s)),endsAdministrativeDong:count(s=>/(?:동|읍|면|리)\s*$/.test(s))};
 const directCount=patients.length,directRecords=patients.reduce((sum,p)=>sum+p.total,0);await c.processFile({name:'local.xls',bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
 output.actualProcessFilePath={people:c.patients.length,records:c.patients.reduce((sum,p)=>sum+p.total,0),sameCounts:c.patients.length===directCount&&c.patients.reduce((sum,p)=>sum+p.total,0)===directRecords,geocoderCalls,scheduledButNotExecuted:timers.length};
 console.log(JSON.stringify(output,null,2));
}
main().catch(e=>{console.error('Audit failure: '+e.name);process.exitCode=1});
