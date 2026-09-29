/* Sanitized live HIRA snapshots: verify the pure clinic classification rules. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const raw = fs.readFileSync(path.join(__dirname, 'clinic-api-evidence-v377.json'), 'utf8').replace(/^\uFEFF/, '');
assert(!/\b(?:serviceKey|ykiho|HIRA_API_KEY)\b/i.test(raw), 'Fixture must omit credentials and institution identifiers');
const data = JSON.parse(raw);
const source = fs.readFileSync(path.join(__dirname, 'clinic_criteria_v377.js'), 'utf8');
const block = source.match(/\/\* CLINIC_CRITERIA_V377_START \*\/([\s\S]*?)\/\* CLINIC_CRITERIA_V377_END \*\//);
assert(block, 'Pure classification block exists');
const codes = { '정형외과': '05', '신경외과': '06', '마취통증의학과': '09', '재활의학과': '21' };
const context = vm.createContext({ HIRA_SPECIALTY_CODES: codes });
vm.runInContext(block[1], context);

const expected = {
  '(사)경찰공제회 강서적성의원': 'declared',
  '(의)미래의료재단리드림의원': 'excluded',
  '(의)성광의료재단 차움의원': 'excluded',
  '(의)일맥의료재단 강동더서울의원': 'excluded',
  '(재)이랜드재단 이랜드의원': 'declared',
  '365온(ON)가정의원': 'declared',
  '365웰의원': 'excluded',
  '365한국신통의원': 'declared',
  '210정형외과의원': 'excluded',
  '365답십리탑정형외과의원': 'competitor'
};

function asInput(fixture) {
  return {
    place: { name: fixture.clinicName, clinicCode: fixture.clinicCode, specialties: fixture.declaredSpecialties },
    evidence: {
      specialists: fixture.specialistRows,
      facilities: fixture.bedRows,
      specialistsComplete: fixture.completion.specialists.complete,
      facilitiesComplete: fixture.completion.facilities.complete,
      checkedAt: fixture.checkedAt
    }
  };
}

assert.equal(data.fixtures.length, Object.keys(expected).length);
const summary = { competitor: 0, declared: 0, excluded: 0 };
for (const fixture of data.fixtures) {
  for (const [kind, rows] of [
    ['specialists', fixture.specialistRows],
    ['facilities', fixture.bedRows],
    ['departments', fixture.declaredSpecialtyRows]
  ]) {
    const completion = fixture.completion[kind];
    assert.equal(completion.resultCode, '00', `${fixture.clinicName}: successful ${kind} response`);
    assert.equal(completion.complete, true);
    assert.equal(completion.totalCount, rows.length);
    assert.equal(completion.receivedRows, rows.length);
  }
  const { place, evidence } = asInput(fixture);
  const actual = context.scanClassifyClinic(place, evidence, Object.keys(codes));
  assert.equal(actual.status, expected[fixture.clinicName], fixture.clinicName);
  summary[actual.status]++;
}

// A real eligible clinic has 12 physical-therapy beds; these are not inpatient capacity.
const positive = data.fixtures.find(f => f.clinicName === '365답십리탑정형외과의원');
assert.equal(positive.bedRows[0].ptrmCnt, 12);
let { place, evidence } = asInput(positive);
assert.equal(context.scanClassifyClinic(place, evidence, Object.keys(codes)).specialistCount, 3);

// Incomplete or missing evidence cannot turn into confirmed zero.
assert.equal(context.scanClassifyClinic(place, { ...evidence, facilitiesComplete: false }, Object.keys(codes)).status, 'unverified');
assert.equal(context.scanClassifyClinic(place, { ...evidence, specialistsComplete: false }, Object.keys(codes)).status, 'unverified');
const missingBedEvidence = structuredClone(evidence);
delete missingBedEvidence.facilities[0].stdSickbdCnt;
assert.equal(context.scanClassifyClinic(place, missingBedEvidence, Object.keys(codes)).status, 'unverified');

// Successful empty specialist lists are evidence of zero reported specialists.
const noSpecialists = data.fixtures.find(f => f.clinicName === '365한국신통의원');
({ place, evidence } = asInput(noSpecialists));
assert.equal(evidence.specialists.length, 0);
assert.equal(context.scanClassifyClinic(place, evidence, Object.keys(codes)).specialistCount, 0);

console.log(JSON.stringify({ ok: true, observedAt: data.observedAt, liveFixtureCount: data.fixtures.length, statuses: summary, evidenceEdgeCases: 5 }));
