// Synthetic SheetJS formatting/coercion repro with the exact pinned app library.
// Downloads public library in memory; sends no patient data and saves no workbook.
const vm=require('vm'),assert=require('assert/strict');
(async()=>{
 const url='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
 const res=await fetch(url);if(!res.ok)throw Error('Pinned library download failed: '+res.status);
 const module={exports:{}};vm.runInNewContext(await res.text(),{module,exports:module.exports,Buffer,Uint8Array,ArrayBuffer,console,require},{timeout:15000});
 const XLSX=module.exports;assert.equal(XLSX.version,'0.18.5');
 const ws=XLSX.utils.aoa_to_sheet([['차트번호','주소','성명'],[123,'서울특별시 성동구 왕십리로 320','합성A']]);
 ws.A2.z='000000';delete ws.A2.w;
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'환자자료');
 const roundtrip=XLSX.read(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}),{type:'buffer'});
 const raw=XLSX.utils.sheet_to_json(roundtrip.Sheets['환자자료'],{header:1});
 const formatted=XLSX.utils.sheet_to_json(roundtrip.Sheets['환자자료'],{header:1,raw:false,defval:''});
 assert.equal(raw[1][0],123);assert.equal(formatted[1][0],'000123');
 const csv='차트번호,주소,성명\n000123,서울특별시 성동구 왕십리로 320,합성A\n';
 const defaultCsv=XLSX.read(csv,{type:'string'}),textCsv=XLSX.read(csv,{type:'string',raw:true});
 const csvDefault=XLSX.utils.sheet_to_json(defaultCsv.Sheets[defaultCsv.SheetNames[0]],{header:1});
 const csvText=XLSX.utils.sheet_to_json(textCsv.Sheets[textCsv.SheetNames[0]],{header:1});
 assert.equal(csvDefault[1][0],123);assert.equal(csvText[1][0],'000123');
 const utf16=Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from('차트번호\t주소\t성명\r\nS01\t서울특별시 성동구 왕십리로 320\t합성A\r\n','utf16le')]);
 let oldDecoded;try{oldDecoded=new TextDecoder('utf-8',{fatal:true}).decode(utf16);}catch{oldDecoded=new TextDecoder('euc-kr').decode(utf16);}
 assert(!oldDecoded.includes('주소'));assert(new TextDecoder('utf-16le').decode(utf16).includes('주소'));
 console.log('PASS pinned SheetJS0.18.5: XLSX formatted ID000123 -> raw123; raw:false preserves000123. CSV default read000123 ->123; read raw:true preserves000123. Current UTF8/CP949-only CSV decoding destroys a synthetic UTF16LE BOM TSV header; BOM-aware UTF16 decoder preserves it. Synthetic only.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
