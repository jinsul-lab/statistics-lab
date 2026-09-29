/*
 * v3.7.8 current-release classification regression. All inputs are synthetic.
 * Inpatient evidence is optional descriptive information, never an eligibility gate.
 * Run: node work/test_clinic_criteria_v378.cjs
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const releasePath=path.resolve(__dirname,'../jinsulmap/jinsulmap.html');
const html=fs.readFileSync(releasePath,'utf8').replace(/\r\n/g,'\n');
const block=html.match(/\/\* CLINIC_CRITERIA_V37[78]_START \*\/([\s\S]*?)\/\* CLINIC_CRITERIA_V37[78]_END \*\//);
assert(block,'Current HTML must contain one classification block');
assert.equal((html.match(/CLINIC_CRITERIA_V37[78]_START/g)||[]).length,1);
const codes={'정형외과':'05','신경외과':'06','마취통증의학과':'09','재활의학과':'21'};
const selected=Object.keys(codes),checkedAt='2026-09-30T03:00:00.000Z';
const ctx=vm.createContext({HIRA_SPECIALTY_CODES:codes});
vm.runInContext(block[1],ctx,{filename:releasePath});
assert.equal(vm.runInContext('SCAN_CLINIC_CRITERIA_VERSION',ctx),'specialist-clinic-v2','Saved assessments must distinguish the revised rule');
const plain=value=>JSON.parse(JSON.stringify(value));
const inpatientFields=['permSbdCnt','hghrSickbdCnt','stdSickbdCnt','aduChldSprmCnt','chldSprmCnt','nbySprmCnt','psydeptClsHigSbdCnt','psydeptClsGnlSbdCnt','psydeptOpenHigSbdCnt','psydeptOpenGnlSbdCnt','isnrSbdCnt','anvirTrrmSbdCnt','dtrmSbdCnt'];
const place={id:'synthetic-clinic',ykiho:'synthetic-ykiho',place_name:'합성정형외과의원',clinicCode:'31',clinicType:'의원',specialties:selected.slice()};
const zeroBeds=()=>Object.fromEntries(inpatientFields.map(field=>[field,'0']));
const specialist=(code='05',count='1',name=Object.keys(codes).find(n=>codes[n]===String(code))||'내과')=>({dgsbjtCd:code,dgsbjtCdNm:name,dtlSdrCnt:count});
const evidence=(override={})=>({specialists:[specialist()],facilities:[zeroBeds()],specialistsComplete:true,facilitiesComplete:true,checkedAt,...override});
let checks=0;
function test(name,run){try{run();checks++;}catch(error){error.message=name+': '+error.message;throw error;}}
async function asyncTest(name,run){try{await run();checks++;}catch(error){error.message=name+': '+error.message;throw error;}}
const classify=(proof=evidence(),chosen=selected,record=place)=>plain(ctx.scanClassifyClinic(record,proof,chosen));
function expect(proof,status,chosen=selected,record=place){const result=classify(proof,chosen,record);assert.equal(result.status,status);assert.ok(result.reason.trim());assert.equal(result.criteriaVersion,'specialist-clinic-v2');return result;}
function unknownDeclared(proof,chosen=selected,record=place){const result=expect(proof,'declared',chosen,record);assert.equal(result.specialistCount,null,'Unknown is not zero');assert.match(result.reason,/미확인|확인 필요/);return result;}

test('a clinic with a selected reported specialist is a competitor',()=>{const r=expect(evidence(),'competitor');assert.equal(r.specialistCount,1);assert.deepEqual(r.matchedSpecialties,['정형외과']);assert.equal(r.checkedAt,checkedAt);});
for(const [name,code] of Object.entries(codes))test('each selected specialty independently qualifies: '+name,()=>{const r=expect(evidence({specialists:[specialist(code,'2',name)]}),'competitor');assert.equal(r.specialistCount,2);assert.deepEqual(r.matchedSpecialties,[name]);});
test('selection limits the specialist count',()=>{const r=expect(evidence({specialists:[specialist('05','7'),specialist('06','2')]}),'competitor',['신경외과']);assert.equal(r.specialistCount,2);assert.deepEqual(r.matchedSpecialties,['신경외과']);});
test('a selected zero cannot borrow another specialty',()=>{const r=expect(evidence({specialists:[specialist('05','0'),specialist('06','9')]}),'declared',['정형외과']);assert.equal(r.specialistCount,0);});
test('unselected specialty alone stays declared',()=>{assert.equal(expect(evidence({specialists:[specialist('01','8','내과')]}),'declared').specialistCount,0);});
test('code takes precedence over misleading display name',()=>{assert.equal(expect(evidence({specialists:[specialist('01','8','정형외과')]}),'declared').specialistCount,0);});
test('complete empty specialist response is confirmed zero',()=>{assert.equal(expect(evidence({specialists:[]}),'declared').specialistCount,0);});
test('zero and unknown are distinct within the declared group',()=>{const r=unknownDeclared(evidence({specialists:[specialist('05','0'),specialist('06',null)]}),['정형외과','신경외과'],{...place,specialties:['정형외과']});assert.equal(r.specialistCounts['정형외과'],0);assert.equal(r.specialistCounts['신경외과'],null);});
test('a known positive remains enough with another unknown selected count',()=>{const r=expect(evidence({specialists:[specialist('05','1'),specialist('06',null)]}),'competitor');assert.equal(r.specialistCount,1);assert.equal(r.specialistCounts['신경외과'],null);});
test('generic physician count is not specialist evidence',()=>unknownDeclared(evidence({specialists:[{dgsbjtCd:'05',dgsbjtPrSdrCnt:'10'}]}),['정형외과']));
for(const value of [undefined,null,'',' ','-','unknown','NaN','Infinity',-1,'-1',1.5,'1.5',true,false,[],[1],{}])test('invalid specialist count remains unconfirmed: '+String(value),()=>unknownDeclared(evidence({specialists:[{...specialist('05'),dtlSdrCnt:value}]}),['정형외과']));
test('numeric specialist zero remains known zero',()=>{assert.equal(expect(evidence({specialists:[specialist('05',0)]}),'declared',['정형외과']).specialistCount,0);});
test('integer whitespace is accepted',()=>{assert.equal(expect(evidence({specialists:[specialist('05',' 2 ')]}),'competitor').specialistCount,2);});
for(const rows of [undefined,null,{},'bad response',[null],[undefined],[{}]])test('malformed specialist response retains valid department declaration: '+JSON.stringify(rows),()=>unknownDeclared(evidence({specialists:rows})));
for(const [name,code] of Object.entries(codes))test('numeric department code normalizes: '+code,()=>{assert.equal(expect(evidence({specialists:[specialist(Number(code),'1',name)]}),'competitor',[name]).specialistCounts[name],1);});
for(const complete of [false,undefined,null])test('incomplete specialist response cannot confirm specialists: '+String(complete),()=>unknownDeclared(evidence({specialistsComplete:complete})));
test('duplicate identical specialty counts are not added',()=>{const row=specialist('05','2');assert.equal(expect(evidence({specialists:[row,{...row},specialist('06','1')]}),'competitor').specialistCount,3);});
test('conflicting counts remain unknown but declaration is preserved',()=>unknownDeclared(evidence({specialists:[specialist('05','0'),specialist('05','2')]}),['정형외과']));

for(const field of inpatientFields){
  test('positive inpatient field is descriptive only: '+field,()=>{const r=expect(evidence({facilities:[{...zeroBeds(),[field]:'4'}]}),'competitor');assert.equal(r.specialistCount,1);assert.equal(r.bedCount,4);});
  test('missing inpatient field never removes a verified clinic: '+field,()=>{const beds=zeroBeds();delete beds[field];const r=expect(evidence({facilities:[beds]}),'competitor');assert.equal(r.bedCount,null);});
  test('a declared clinic with positive inpatient field stays declared: '+field,()=>{const r=expect(evidence({specialists:[],facilities:[{...zeroBeds(),[field]:'4'}]}),'declared');assert.equal(r.specialistCount,0);});
}
test('aggregate and component inpatient fields are not summed',()=>{assert.equal(expect(evidence({facilities:[{...zeroBeds(),permSbdCnt:'3',stdSickbdCnt:'3'}]}),'competitor').bedCount,3);});
for(const field of ['ptrmCnt','soprmCnt','emymCnt','partumCnt'])test('treatment beds remain outside inpatient totals: '+field,()=>{assert.equal(expect(evidence({facilities:[{...zeroBeds(),[field]:'10'}]}),'competitor').bedCount,0);});
for(const value of [undefined,null,'',' ','-','unknown','NaN','Infinity',-1,'-1',1.5,'1.5',true,false,[],[0],{}])test('invalid bed value is unknown but clinic still qualifies: '+String(value),()=>{const r=expect(evidence({facilities:[{...zeroBeds(),stdSickbdCnt:value}]}),'competitor');assert.equal(r.bedCount,null);});
for(const rows of [[],undefined,null,{},'bad response',[null],[undefined],[{}],[zeroBeds(),zeroBeds()]])test('missing or malformed facilities do not affect eligibility: '+JSON.stringify(rows),()=>{const r=expect(evidence({facilities:rows}),'competitor');assert.equal(r.bedCount,null);});
for(const complete of [false,undefined,null])test('failed facility endpoint does not affect either cohort: '+String(complete),()=>{const proof=evidence({facilitiesComplete:complete});const r=expect(proof,'competitor');assert.equal(r.bedCount,null);assert.equal(expect({...proof,specialists:[]},'declared').specialistCount,0);});
test('both detail failures preserve a valid clinic department declaration',()=>{const r=unknownDeclared({});assert.equal(r.bedCount,null);});
test('partial positive beds do not override an unknown specialist declaration',()=>unknownDeclared(evidence({specialistsComplete:false,facilitiesComplete:false,facilities:[{stdSickbdCnt:'4'}]})));

for(const code of ['01','11','21','28','41','51','61'])test('non-clinic type is excluded despite specialist and misleading name: '+code,()=>expect(evidence(),'excluded',selected,{...place,clinicCode:code,place_name:'합성정형외과의원'}));
test('non-clinic type excludes during detail outage',()=>expect({},'excluded',selected,{...place,clinicCode:'21'}));
for(const code of [undefined,null,''])test('unknown institution type stays unverified: '+String(code),()=>expect(evidence(),'unverified',selected,{...place,clinicCode:code}));
test('numeric clinic code is accepted',()=>expect(evidence(),'competitor',selected,{...place,clinicCode:31}));
test('no selected specialty does not become a competitor',()=>{assert.notEqual(classify(evidence(),[]).status,'competitor');});
test('no matching declaration or selected specialist stays unverified',()=>expect(evidence({specialists:[]}), 'unverified',selected,{...place,specialties:['내과']}));
test('specialist outage cannot invent a missing department declaration',()=>expect({},'unverified',selected,{...place,specialties:[]}));
test('a reassuring name never manufactures specialist confirmation',()=>unknownDeclared(evidence({specialists:[],specialistsComplete:false}),['정형외과'],{...place,place_name:'정형외과전문의의원'}));
test('classification has no input mutations',()=>{const record=plain(place),proof=evidence({specialists:[]}),chosen=selected.slice(),before=JSON.stringify([record,proof,chosen]);const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};[record,proof,chosen].forEach(freeze);classify(proof,chosen,record);assert.equal(JSON.stringify([record,proof,chosen]),before);});

function releaseFunction(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);const end=html.indexOf('\n}\n',start);assert.ok(end>start,name);return(html.slice(Math.max(0,start-6),start)==='async '?'async ':'')+html.slice(start,end+2);}
function fetchContext(){const c=vm.createContext({URLSearchParams,Document:class SyntheticDocument{},HIRA_API_KEY:'synthetic-fixture',HIRA_DETAIL_API_BASE:'https://synthetic.invalid/detail',HIRA_SPECIALTY_CODES:codes});vm.runInContext(block[1]+'\nconst scanClinicEvidenceCache=new Map();\n'+['scanNumber','scanApiCodeError','scanApiEnvelope','scanFetchHiraCompleteRows','scanFetchClinicEvidence','scanAssessClinics','scanClinicCohort','scanCompetitionStatus'].map(releaseFunction).join('\n'),c);return c;}
const envelope=(totalCount,rows=[])=>({response:{header:{resultCode:'00',resultMsg:'NORMAL SERVICE.'},body:{totalCount,items:rows.length?{item:rows}:''}}});
async function fetchTests(){
  await asyncTest('successful empty API response is distinguishable from failure',async()=>{const c=fetchContext();c.scanFetchApiDocument=async()=>envelope(0);assert.deepEqual(plain(await c.scanFetchHiraCompleteRows('https://synthetic.invalid',{})),[]);});
  await asyncTest('pagination completion is checked',async()=>{const c=fetchContext(),pages=[];c.scanFetchApiDocument=async url=>{const page=Number(new URL(url).searchParams.get('pageNo'));pages.push(page);return envelope(2,[specialist(page===1?'05':'06')]);};assert.equal((await c.scanFetchHiraCompleteRows('https://synthetic.invalid',{})).length,2);assert.deepEqual(pages,[1,2]);});
  for(const [name,responses] of [
    ['missing total',[envelope(undefined)]],['invalid total',[envelope('unknown')]],['changed total',[envelope(2,[specialist('05')]),envelope(3,[specialist('06')])]],
    ['duplicate page',[envelope(2,[specialist('05')]),envelope(2,[specialist('05')])]],['truncated empty page',[envelope(2,[specialist('05')]),envelope(2)]],
    ['too many rows',[envelope(1,[specialist('05'),specialist('06')])]],['missing body',[{response:{header:{resultCode:'00'}}}]],
    ['missing success code',[{response:{body:{totalCount:0,items:''}}}]],['service error',[{response:{header:{resultCode:'30'},body:{totalCount:0,items:''}}}]]
  ])await asyncTest(name+' does not become confirmed zero',async()=>{const c=fetchContext();let i=0;c.scanFetchApiDocument=async()=>responses[Math.min(i++,responses.length-1)];await assert.rejects(c.scanFetchHiraCompleteRows('https://synthetic.invalid',{}));});
  await asyncTest('page limit never silently accepts a partial list',async()=>{const c=fetchContext();let calls=0;c.scanFetchApiDocument=async()=>envelope(21,[{dgsbjtCd:String(++calls),dtlSdrCnt:'1'}]);await assert.rejects(c.scanFetchHiraCompleteRows('https://synthetic.invalid',{}));assert.equal(calls,20);});
  await asyncTest('cancellation makes no unnecessary API request',async()=>{const c=fetchContext();let calls=0;c.scanFetchApiDocument=async()=>{calls++;return envelope(0);};await assert.rejects(c.scanFetchHiraCompleteRows('https://synthetic.invalid',{},()=>false));assert.equal(calls,0);});
  await asyncTest('failed specialist endpoint retains declaration and retries',async()=>{const c=fetchContext();let calls=0,fail=true;c.scanFetchApiDocument=async url=>{calls++;if(url.includes('getSpcSbjtSdrInfo2.8')){if(fail)throw Error('Synthetic failure');return envelope(1,[specialist()]);}return envelope(1,[zeroBeds()]);};const partial=await c.scanFetchClinicEvidence('synthetic-retry');assert.equal(partial.specialistsComplete,false);const r=c.scanClassifyClinic(place,partial,selected);assert.equal(r.status,'declared');assert.equal(r.specialistCount,null);assert.match(r.reason,/미확인|확인 필요/);fail=false;const retried=await c.scanFetchClinicEvidence('synthetic-retry');assert.equal(calls,4);assert.equal(c.scanClassifyClinic(place,retried,selected).status,'competitor');});
  await asyncTest('failed facilities do not remove specialist-confirmed competitors',async()=>{const c=fetchContext();c.scanFetchApiDocument=async url=>{if(url.includes('getEqpInfo2.8'))throw Error('Synthetic facility outage');return envelope(1,[specialist()]);};const proof=await c.scanFetchClinicEvidence('synthetic-bed-failure');assert.equal(proof.facilitiesComplete,false);const r=c.scanClassifyClinic(place,proof,selected);assert.equal(r.status,'competitor');assert.equal(r.bedCount,null);});
  await asyncTest('successful details reuse cache across selected departments',async()=>{const c=fetchContext();let calls=0;c.scanFetchApiDocument=async url=>{calls++;return url.includes('getSpcSbjtSdrInfo2.8')?envelope(1,[specialist()]):envelope(1,[zeroBeds()]);};const first=await c.scanFetchClinicEvidence('synthetic-cache'),second=await c.scanFetchClinicEvidence('synthetic-cache');assert.equal(calls,2);assert.equal(first.checkedAt,second.checkedAt);assert.equal(c.scanClassifyClinic(place,second,['정형외과']).status,'competitor');assert.equal(c.scanClassifyClinic(place,second,['신경외과']).status,'declared');});
  await asyncTest('stale async evidence cannot overwrite the current assessment',async()=>{const c=fetchContext();let current=true,release;c.scanFetchClinicEvidence=()=>new Promise(resolve=>{release=resolve;});const record={...place,competitionAssessment:{status:'previous-fixture'}};const pending=c.scanAssessClinics([record],selected,()=>current);current=false;release(evidence());await pending;assert.equal(record.competitionAssessment.status,'previous-fixture');});
  await asyncTest('scan retains declaration during failure and missing identifier',async()=>{const c=fetchContext();c.scanFetchApiDocument=async url=>{if(new URL(url).searchParams.get('ykiho')==='synthetic-failed'&&url.includes('getSpcSbjtSdrInfo2.8'))throw Error('Synthetic failure');return url.includes('getSpcSbjtSdrInfo2.8')?envelope(1,[specialist()]):envelope(1,[zeroBeds()]);};const records=[{...place,ykiho:'synthetic-success'},{...place,ykiho:'synthetic-failed'},{...place,ykiho:''}],progress=[];await c.scanAssessClinics(records,selected,()=>true,(done,total)=>progress.push([done,total]));assert.deepEqual(records.map(r=>r.competitionAssessment.status),['competitor','declared','declared']);assert.deepEqual(records.map(r=>r.competitionAssessment.specialistCount),[1,null,null]);assert.deepEqual(progress.map(r=>r[0]).sort((a,b)=>a-b),[1,2,3]);const cohort=c.scanClinicCohort({places:records});assert.equal(cohort.competitors.length,1);assert.equal(cohort.declared.length,2);assert.match(c.scanCompetitionStatus({hira:cohort,competitors:cohort.competitors}),/일부 미확인|전문의.*미확인|확인 필요/,'Unknown specialists must qualify the competition total even though rows stay visible as declared');});
  await asyncTest('detail enrichment concurrency stays bounded',async()=>{const c=fetchContext();let active=0,max=0,calls=0;c.scanFetchApiDocument=async url=>{active++;calls++;max=Math.max(max,active);await Promise.resolve();active--;return url.includes('getSpcSbjtSdrInfo2.8')?envelope(1,[specialist()]):envelope(1,[zeroBeds()]);};const records=Array.from({length:10},(_,i)=>({...place,ykiho:'synthetic-concurrency-'+i}));await c.scanAssessClinics(records,selected);assert.equal(calls,20);assert.ok(max>1&&max<=6);assert.ok(records.every(r=>r.competitionAssessment.status==='competitor'));});
}
fetchTests().then(()=>console.log(JSON.stringify({ok:true,checks,source:'release HTML v3.7.8 classifier and fetch functions',synthetic:true,liveApi:false}))).catch(error=>{console.error(error);process.exitCode=1;});
