/* Re-evaluate sanitized prior live API snapshots against the v3.7.8 HTML rule.
 * These are recorded observations, not new live requests at test execution time.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const raw=fs.readFileSync(path.join(__dirname,'clinic-api-evidence-v377.json'),'utf8').replace(/^\uFEFF/,'');
assert(!/\b(?:serviceKey|ykiho|HIRA_API_KEY)\b/i.test(raw),'Fixtures must omit credentials and institution identifiers');
const data=JSON.parse(raw),html=fs.readFileSync(path.resolve(__dirname,'../jinsulmap/jinsulmap.html'),'utf8');
const block=html.match(/\/\* CLINIC_CRITERIA_V37[78]_START \*\/([\s\S]*?)\/\* CLINIC_CRITERIA_V37[78]_END \*\//);
assert(block,'Release classifier block exists');
const codes={'정형외과':'05','신경외과':'06','마취통증의학과':'09','재활의학과':'21'},context=vm.createContext({HIRA_SPECIALTY_CODES:codes});
vm.runInContext(block[1],context);
assert.equal(vm.runInContext('SCAN_CLINIC_CRITERIA_VERSION',context),'specialist-clinic-v2');
const expected={
  '(사)경찰공제회 강서적성의원':'declared',
  '(의)미래의료재단리드림의원':'declared',
  '(의)성광의료재단 차움의원':'competitor',
  '(의)일맥의료재단 강동더서울의원':'competitor',
  '(재)이랜드재단 이랜드의원':'declared',
  '365온(ON)가정의원':'declared',
  '365웰의원':'declared',
  '365한국신통의원':'declared',
  '210정형외과의원':'competitor',
  '365답십리탑정형외과의원':'competitor'
};
function asInput(fixture){return{place:{name:fixture.clinicName,clinicCode:fixture.clinicCode,specialties:fixture.declaredSpecialties},evidence:{specialists:fixture.specialistRows,facilities:fixture.bedRows,specialistsComplete:fixture.completion.specialists.complete,facilitiesComplete:fixture.completion.facilities.complete,checkedAt:fixture.checkedAt}};}
assert.equal(data.fixtures.length,Object.keys(expected).length);
const summary={competitor:0,declared:0,excluded:0},bedInvarianceChecks=[];
for(const fixture of data.fixtures){
  for(const [kind,rows] of [['specialists',fixture.specialistRows],['facilities',fixture.bedRows],['departments',fixture.declaredSpecialtyRows]]){
    const completion=fixture.completion[kind];assert.equal(completion.resultCode,'00');assert.equal(completion.complete,true);assert.equal(completion.totalCount,rows.length);assert.equal(completion.receivedRows,rows.length);
  }
  const {place,evidence}=asInput(fixture),actual=context.scanClassifyClinic(place,evidence,Object.keys(codes));
  assert.equal(actual.status,expected[fixture.clinicName],fixture.clinicName);summary[actual.status]++;
  for(const override of [{facilities:[],facilitiesComplete:false},{facilities:[],facilitiesComplete:true},{facilities:undefined,facilitiesComplete:false}]){
    const changed=context.scanClassifyClinic(place,{...evidence,...override},Object.keys(codes));
    assert.equal(changed.status,actual.status,fixture.clinicName+': facility availability must not affect eligibility');
    assert.equal(changed.specialistCount,actual.specialistCount);assert.equal(changed.bedCount,null);bedInvarianceChecks.push(1);
  }
  const failed=context.scanClassifyClinic(place,{...evidence,specialistsComplete:false},Object.keys(codes));
  assert.equal(failed.status,'declared',fixture.clinicName+': valid declaration stays visible during specialist outage');
  assert.equal(failed.specialistCount,null);assert.match(failed.reason,/미확인|확인 필요/);
}
assert.deepEqual(summary,{competitor:4,declared:6,excluded:0});
const positive=data.fixtures.find(f=>f.clinicName==='365답십리탑정형외과의원');
assert.equal(positive.bedRows[0].ptrmCnt,12);
let {place,evidence}=asInput(positive);
assert.equal(context.scanClassifyClinic(place,evidence,Object.keys(codes)).specialistCount,3);
const withInpatient=data.fixtures.find(f=>f.clinicName==='210정형외과의원');
({place,evidence}=asInput(withInpatient));
assert.equal(context.scanClassifyClinic(place,evidence,Object.keys(codes)).bedCount,9);
assert.equal(context.scanClassifyClinic(place,evidence,Object.keys(codes)).specialistCount,2);
console.log(JSON.stringify({ok:true,observedAt:data.observedAt,recordedLiveFixtureCount:data.fixtures.length,statuses:summary,bedInvarianceChecks:bedInvarianceChecks.length,specialistFailureChecks:data.fixtures.length,newLiveApiRequests:false}));
