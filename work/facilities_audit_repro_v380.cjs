// Synthetic audit evidence only. No network, patient records, or credentials.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../jinsulmap/jinsulmap.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'(');if(start<0)throw Error(name);return html.slice(start,html.indexOf('\n}',start)+2);}
const context=vm.createContext({URLSearchParams,HIRA_API_KEY:'synthetic',HIRA_HOSPITAL_API_BASE:'https://example.invalid',HIRA_SPECIALTY_CODES:{'정형외과':'05'},scanFetchHiraCompleteRows:async()=>[{ykiho:'synthetic-missing-coordinates',yadmNm:'합성 의원',clCd:'31',YPos:'',XPos:''}]});
vm.runInContext(['scanNumber','scanPick','scanHaversineMeters'].map(fn).join('\n')+'\nasync '+fn('scanFetchHiraSpecialty'),context);
(async()=>{const rows=await context.scanFetchHiraSpecialty('정형외과',{lat:37.5,lng:127},1000);require('node:assert/strict').equal(rows.missingCoordinates,1);console.log(JSON.stringify({synthetic:true,liveAPI:false,sourceRows:1,returnedRows:rows.length,metadataKeys:Object.keys(rows).filter(k=>!/^\d+$/.test(k))}));})();
