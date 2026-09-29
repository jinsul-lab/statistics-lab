/*
 * Synthetic regression tests for the criteria actually embedded in the release HTML.
 * No service keys, real provider identifiers, network calls, or claims of live API verification.
 * Run from any directory: node work/test_clinic_criteria_v377.cjs
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const releasePath = path.resolve(__dirname, '../jinsulmap/jinsulmap.html');
const html = fs.readFileSync(releasePath, 'utf8');
const startMarker = '/* CLINIC_CRITERIA_V377_START */';
const endMarker = '/* CLINIC_CRITERIA_V377_END */';
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start, 'release HTML must contain the integrated v3.7.7 criteria block');
assert.equal(html.indexOf(startMarker, start + startMarker.length), -1, 'criteria block must not be duplicated');
const context = vm.createContext({
  HIRA_SPECIALTY_CODES: { '정형외과': '05', '신경외과': '06', '마취통증의학과': '09', '재활의학과': '21' }
});
vm.runInContext(html.slice(start + startMarker.length, end), context, { filename: releasePath });
assert.equal(typeof context.scanClassifyClinic, 'function', 'test the release classifier, not a copied implementation');

const selected = ['정형외과', '신경외과', '마취통증의학과', '재활의학과'];
const departments = [
  ['05', '정형외과'], ['06', '신경외과'], ['09', '마취통증의학과'], ['21', '재활의학과']
];
// Official getEqpInfo2.8 inpatient fields. Treatment/therapy beds are separate below.
const inpatientFields = [
  'permSbdCnt', 'hghrSickbdCnt', 'stdSickbdCnt', 'aduChldSprmCnt',
  'chldSprmCnt', 'nbySprmCnt', 'psydeptClsHigSbdCnt', 'psydeptClsGnlSbdCnt',
  'psydeptOpenHigSbdCnt', 'psydeptOpenGnlSbdCnt', 'isnrSbdCnt', 'anvirTrrmSbdCnt', 'dtrmSbdCnt'
];
const checkedAt = '2026-09-30T03:00:00.000Z';
const place = {
  id: 'synthetic-clinic', ykiho: 'synthetic-ykiho', place_name: '합성정형외과의원',
  clinicCode: '31', clinicType: '의원', specialties: selected.slice()
};
const zeroBeds = () => Object.fromEntries(inpatientFields.map(field => [field, '0']));
const specialist = (code = '05', count = '1', name = departments.find(row => row[0] === code)?.[1] || '내과') =>
  ({ dgsbjtCd: code, dgsbjtCdNm: name, dtlSdrCnt: count });
const zeroSpecialists = () => departments.map(([code, name]) => specialist(code, '0', name));
const evidence = (overrides = {}) => ({
  specialists: [specialist()], facilities: [zeroBeds()],
  specialistsComplete: true, facilitiesComplete: true, checkedAt, ...overrides
});
const toPlain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const test = (name, run) => {
  try { run(); checks++; }
  catch (error) { error.message = name + ': ' + error.message; error.stack = name + '\n' + error.stack; throw error; }
};
const classify = (record = place, proof = evidence(), chosen = selected) =>
  toPlain(context.scanClassifyClinic(record, proof, chosen));
const expectStatus = (proof, status, chosen = selected, record = place) => {
  const result = classify(record, proof, chosen);
  assert.equal(result.status, status);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.trim(), 'classification needs a reviewable reason');
  return result;
};
const isUnknownCount = value => assert.equal(value, null, 'unknown must remain null, not zero');

test('a selected specialist and all explicit inpatient zeros qualify', () => {
  const result = expectStatus(evidence(), 'competitor');
  assert.equal(result.specialistCount, 1);
  assert.equal(result.specialistCounts['정형외과'], 1);
  assert.deepEqual(result.matchedSpecialties, ['정형외과']);
  assert.equal(result.bedCount, 0);
  assert.equal(result.checkedAt, checkedAt);
  assert.ok(result.criteriaVersion, 'criteria version must accompany persisted assessments');
});

for (const [code, name] of departments) {
  test('each default specialty independently qualifies: ' + name, () => {
    const result = expectStatus(evidence({ specialists: [specialist(code, '2', name)] }), 'competitor');
    assert.equal(result.specialistCount, 2);
    assert.equal(result.specialistCounts[name], 2);
    assert.deepEqual(result.matchedSpecialties, [name]);
  });
}

test('selected subset controls specialist qualification and totals', () => {
  const proof = evidence({ specialists: [specialist('05', '7'), specialist('06', '2')] });
  const result = expectStatus(proof, 'competitor', ['신경외과']);
  assert.equal(result.specialistCount, 2, 'unselected orthopedic specialists must not inflate chosen count');
  assert.deepEqual(result.matchedSpecialties, ['신경외과']);
});

test('an explicit zero in the selected specialty does not borrow unselected specialists', () => {
  const proof = evidence({ specialists: [specialist('05', '0'), specialist('06', '9')] });
  const result = expectStatus(proof, 'declared', ['정형외과']);
  assert.equal(result.specialistCount, 0);
  assert.deepEqual(result.matchedSpecialties, []);
});

test('a different specialty cannot qualify a declared target department', () => {
  const result = expectStatus(evidence({ specialists: [specialist('01', '8', '내과')] }), 'declared', ['정형외과']);
  assert.equal(result.specialistCount, 0);
  assert.deepEqual(result.matchedSpecialties, []);
});

test('target-looking department label cannot override a different official department code', () => {
  const result = expectStatus(evidence({ specialists: [specialist('01', '8', '정형외과')] }), 'declared', ['정형외과']);
  assert.equal(result.specialistCount, 0);
  assert.deepEqual(result.matchedSpecialties, []);
});

test('all selected explicit zeros remain declared rather than competitors', () => {
  const result = expectStatus(evidence({ specialists: zeroSpecialists() }), 'declared');
  assert.equal(result.specialistCount, 0);
  for (const name of selected) assert.equal(result.specialistCounts[name], 0);
});

test('unknown selected specialty prevents declared classification even when another declared specialty is zero', () => {
  const result = expectStatus(evidence({ specialists: [specialist('05', '0'), specialist('06', null)] }),
    'unverified', ['정형외과', '신경외과'], { ...place, specialties: ['정형외과'] });
  isUnknownCount(result.specialistCount);
});

test('a verified complete list with zero reported target specialists remains declared', () => {
  const result = expectStatus(evidence({ specialists: [specialist('05', '0')] }), 'declared');
  assert.equal(result.specialistCount, 0);
  assert.equal(result.specialistCounts['신경외과'], 0);
});

test('one verified positive may qualify while another selected count is unknown', () => {
  const result = expectStatus(evidence({ specialists: [specialist('05', '1'), specialist('06', null)] }), 'competitor');
  assert.equal(result.specialistCount, 1);
  isUnknownCount(result.specialistCounts['신경외과']);
});

test('generic doctor counts are not specialist evidence', () => {
  const result = expectStatus(evidence({ specialists: [{ dgsbjtCd: '05', dgsbjtCdNm: '정형외과', dgsbjtPrSdrCnt: '10' }] }), 'unverified', ['정형외과']);
  isUnknownCount(result.specialistCount);
});

for (const value of [undefined, null, '', ' ', '-', 'unknown', 'NaN', 'Infinity', -1, '-1', 1.5, '1.5', true, false, [], [1], {}]) {
  test('invalid specialist count is unknown: ' + String(value), () => {
    const result = expectStatus(evidence({ specialists: [{ ...specialist('05'), dtlSdrCnt: value }] }), 'unverified', ['정형외과']);
    isUnknownCount(result.specialistCount);
  });
}

test('numeric zero stays distinguishable from missing specialist count', () => {
  const result = expectStatus(evidence({ specialists: [specialist('05', 0)] }), 'declared', ['정형외과']);
  assert.equal(result.specialistCount, 0);
});

test('whitespace around an official integer is harmless', () => {
  assert.equal(expectStatus(evidence({ specialists: [specialist('05', ' 2 ')] }), 'competitor', ['정형외과']).specialistCount, 2);
});

test('verified complete empty specialist response means zero reported specialists', () => {
  const result = expectStatus(evidence({ specialists: [] }), 'declared');
  assert.equal(result.specialistCount, 0);
});

test('empty specialist response without endpoint completion cannot infer absence', () => {
  const result = expectStatus(evidence({ specialists: [], specialistsComplete: false }), 'unverified');
  isUnknownCount(result.specialistCount);
});

test('missing specialist response is unknown', () => {
  const result = expectStatus(evidence({ specialists: undefined }), 'unverified');
  isUnknownCount(result.specialistCount);
});

for (const rows of [null, {}, 'bad response', [null], [undefined], [{}]]) {
  test('malformed specialist response is unknown rather than an empty successful list: ' + JSON.stringify(rows), () => {
    const result = expectStatus(evidence({ specialists: rows }), 'unverified');
    isUnknownCount(result.specialistCount);
  });
}

for (const [code, name] of departments) {
  test('numeric specialty code normalizes to the official two-digit code: ' + code, () => {
    const result = expectStatus(evidence({ specialists: [specialist(Number(code), '1', name)] }), 'competitor', [name]);
    assert.equal(result.specialistCounts[name], 1);
  });
}

test('failed specialist endpoint cannot use an apparently positive partial result', () => {
  const result = expectStatus(evidence({ specialistsComplete: false }), 'unverified');
  assert.notEqual(result.status, 'competitor');
});

test('missing completion evidence is not a successful specialist endpoint', () => {
  expectStatus(evidence({ specialistsComplete: undefined }), 'unverified');
});

test('repeated identical specialty rows count one reported value', () => {
  const row = specialist('05', '2');
  const result = expectStatus(evidence({ specialists: [row, { ...row }, specialist('06', '1')] }), 'competitor');
  assert.equal(result.specialistCount, 3, 'duplicate reported totals must not be summed');
  assert.equal(result.specialistCounts['정형외과'], 2);
});

test('conflicting duplicate specialty counts cannot fabricate a definite specialist count', () => {
  const result = expectStatus(evidence({ specialists: [specialist('05', '0'), specialist('05', '2')] }), 'unverified', ['정형외과']);
  isUnknownCount(result.specialistCount);
});

for (const field of inpatientFields) {
  test('positive inpatient field excludes: ' + field, () => {
    const result = expectStatus(evidence({ facilities: [{ ...zeroBeds(), [field]: '1' }] }), 'excluded');
    assert.ok(result.bedCount > 0, 'positive inpatient evidence must remain inspectable');
  });
  test('missing inpatient field does not certify zero: ' + field, () => {
    const beds = zeroBeds(); delete beds[field];
    const result = expectStatus(evidence({ facilities: [beds] }), 'unverified');
    isUnknownCount(result.bedCount);
  });
}

test('a positive inpatient count excludes even when the rest of the fields are missing', () => {
  expectStatus(evidence({ facilities: [{ stdSickbdCnt: '4' }] }), 'excluded');
});

test('positive inpatient evidence excludes despite endpoint incompleteness', () => {
  expectStatus(evidence({ facilities: [{ stdSickbdCnt: '4' }], facilitiesComplete: false, specialistsComplete: false }), 'excluded');
});

test('aggregate and component bed fields must not be summed together', () => {
  const result = expectStatus(evidence({ facilities: [{ ...zeroBeds(), permSbdCnt: '3', stdSickbdCnt: '3' }] }), 'excluded');
  assert.equal(result.bedCount, 3);
});

test('permit bed zero alone cannot infer all inpatient categories are absent', () => {
  const result = expectStatus(evidence({ facilities: [{ permSbdCnt: '0' }] }), 'unverified');
  isUnknownCount(result.bedCount);
});

for (const field of ['ptrmCnt', 'soprmCnt', 'emymCnt', 'partumCnt']) {
  test('treatment-area beds do not exclude a zero-inpatient clinic: ' + field, () => {
    const result = expectStatus(evidence({ facilities: [{ ...zeroBeds(), [field]: '10' }] }), 'competitor');
    assert.equal(result.bedCount, 0);
  });
}

for (const value of [undefined, null, '', ' ', '-', 'unknown', 'NaN', 'Infinity', -1, '-1', 1.5, '1.5', true, false, [], [0], {}]) {
  test('invalid inpatient count is unknown: ' + String(value), () => {
    const result = expectStatus(evidence({ facilities: [{ ...zeroBeds(), stdSickbdCnt: value }] }), 'unverified');
    isUnknownCount(result.bedCount);
  });
}

test('empty facility response does not prove no beds', () => {
  const result = expectStatus(evidence({ facilities: [] }), 'unverified');
  isUnknownCount(result.bedCount);
});

test('missing facility response does not prove no beds', () => {
  const result = expectStatus(evidence({ facilities: undefined }), 'unverified');
  isUnknownCount(result.bedCount);
});

for (const rows of [null, {}, 'bad response', [null], [undefined], [{}]]) {
  test('malformed facility response remains unknown: ' + JSON.stringify(rows), () => {
    const result = expectStatus(evidence({ facilities: rows }), 'unverified');
    isUnknownCount(result.bedCount);
  });
}

test('multiple zero facility rows do not fabricate one complete facility record', () => {
  const result = expectStatus(evidence({ facilities: [zeroBeds(), zeroBeds()] }), 'unverified');
  isUnknownCount(result.bedCount);
});

test('failed facility endpoint cannot confirm cached-looking zero counts', () => {
  const result = expectStatus(evidence({ facilitiesComplete: false }), 'unverified');
  isUnknownCount(result.bedCount);
});

test('zero specialists alone cannot produce a declared cohort without known zero inpatient beds', () => {
  expectStatus(evidence({ specialists: zeroSpecialists(), facilities: [], facilitiesComplete: false }), 'unverified');
});

test('missing completion evidence is not a successful facility endpoint', () => {
  expectStatus(evidence({ facilitiesComplete: undefined }), 'unverified');
});

test('identical facility rows do not double a reported inpatient total', () => {
  const beds = { ...zeroBeds(), stdSickbdCnt: '3' };
  const result = expectStatus(evidence({ facilities: [beds, { ...beds }] }), 'excluded');
  assert.equal(result.bedCount, 3);
});

test('conflicting facility rows preserve positive exclusion evidence', () => {
  expectStatus(evidence({ facilities: [zeroBeds(), { ...zeroBeds(), stdSickbdCnt: '3' }] }), 'excluded');
});

for (const code of ['01', '11', '21', '28', '41', '51', '61']) {
  test('known non-clinic type excludes despite clinic-like name: ' + code, () => {
    expectStatus(evidence(), 'excluded', selected, { ...place, clinicCode: code, place_name: '합성정형외과의원' });
  });
}

test('a known non-clinic is excluded even when both endpoints fail', () => {
  expectStatus(evidence({ specialistsComplete: false, facilitiesComplete: false }), 'excluded', selected, { ...place, clinicCode: '21' });
});

test('a clinic name and text label cannot replace a missing official type code', () => {
  expectStatus(evidence(), 'unverified', selected, { ...place, clinicCode: undefined });
});

test('numeric official clinic code is accepted', () => {
  expectStatus(evidence(), 'competitor', selected, { ...place, clinicCode: 31 });
});

test('no selected specialty cannot become a competitor', () => {
  const result = classify(place, evidence(), []);
  assert.notEqual(result.status, 'competitor');
  assert.deepEqual(result.matchedSpecialties, []);
});

test('absence of all official detail evidence remains unverified', () => {
  const result = expectStatus({}, 'unverified');
  isUnknownCount(result.specialistCount);
  isUnknownCount(result.bedCount);
});

test('declared specialty and a reassuring clinic name cannot invent specialist evidence', () => {
  expectStatus(evidence({ specialists: [], specialistsComplete: false }), 'unverified', ['정형외과'], { ...place, place_name: '정형외과전문의의원' });
});

test('classification does not mutate place, selected options, or evidence', () => {
  const record = toPlain(place), proof = evidence({ specialists: zeroSpecialists() }), chosen = selected.slice();
  const before = JSON.stringify([record, proof, chosen]);
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  [record, proof, chosen].forEach(freeze);
  classify(record, proof, chosen);
  assert.equal(JSON.stringify([record, proof, chosen]), before);
});

// Exercise the integrated fetch/completion boundary with synthetic API envelopes.
// Reuse the release parser, but replace the network transport before calling it.
function releaseFunction(name) {
  const normal = html.replace(/\r\n/g, '\n');
  const begin = normal.indexOf('function ' + name + '(');
  assert.ok(begin >= 0, 'missing release function ' + name);
  const finish = normal.indexOf('\n}\n', begin);
  assert.ok(finish > begin, 'missing release function end ' + name);
  return (normal.slice(Math.max(0, begin - 6), begin) === 'async ' ? 'async ' : '') + normal.slice(begin, finish + 2);
}
function fetchContext() {
  const ctx = vm.createContext({
    URLSearchParams,
    Document: class SyntheticDocument {},
    HIRA_API_KEY: 'synthetic-fixture',
    HIRA_DETAIL_API_BASE: 'https://synthetic.invalid/detail',
    HIRA_SPECIALTY_CODES: context.HIRA_SPECIALTY_CODES
  });
  vm.runInContext(html.slice(start + startMarker.length, end) + '\nconst scanClinicEvidenceCache = new Map();\n' +
    ['scanNumber', 'scanApiCodeError', 'scanApiEnvelope', 'scanFetchHiraCompleteRows', 'scanFetchClinicEvidence', 'scanAssessClinics', 'scanClinicCohort', 'scanCompetitionStatus'].map(releaseFunction).join('\n'), ctx);
  return ctx;
}
const envelope = (totalCount, rows = []) => ({ response: {
  header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
  body: { totalCount, items: rows.length ? { item: rows } : '' }
} });
const asyncTest = async (name, run) => {
  try { await run(); checks++; }
  catch (error) { error.message = name + ': ' + error.message; error.stack = name + '\n' + error.stack; throw error; }
};

async function testFetchBoundary() {
  await asyncTest('complete empty API response is distinct from a failed lookup', async () => {
    const ctx = fetchContext();
    ctx.scanFetchApiDocument = async () => envelope(0);
    assert.deepEqual(toPlain(await ctx.scanFetchHiraCompleteRows('https://synthetic.invalid', {})), []);
  });

  await asyncTest('all pages must agree with the reported total before becoming complete', async () => {
    const ctx = fetchContext(), pages = [];
    ctx.scanFetchApiDocument = async url => {
      const page = Number(new URL(url).searchParams.get('pageNo')); pages.push(page);
      return envelope(2, [specialist(page === 1 ? '05' : '06')]);
    };
    const rows = await ctx.scanFetchHiraCompleteRows('https://synthetic.invalid', {});
    assert.deepEqual(pages, [1, 2]);
    assert.equal(rows.length, 2);
  });

  for (const [name, responses] of [
    ['missing totalCount', [envelope(undefined)]],
    ['invalid totalCount', [envelope('unknown')]],
    ['changed totalCount', [envelope(2, [specialist('05')]), envelope(3, [specialist('06')])]],
    ['duplicate page', [envelope(2, [specialist('05')]), envelope(2, [specialist('05')])]],
    ['truncated empty page', [envelope(2, [specialist('05')]), envelope(2)]],
    ['too many rows', [envelope(1, [specialist('05'), specialist('06')])]],
    ['missing body', [{ response: { header: { resultCode: '00' } } }]],
    ['missing success header', [{ response: { body: { totalCount: 0, items: '' } } }]],
    ['API service error', [{ response: { header: { resultCode: '30' }, body: { totalCount: 0, items: '' } } }]]
  ]) {
    await asyncTest(name + ' cannot become a verified empty response', async () => {
      const ctx = fetchContext(); let index = 0;
      ctx.scanFetchApiDocument = async () => responses[Math.min(index++, responses.length - 1)];
      await assert.rejects(ctx.scanFetchHiraCompleteRows('https://synthetic.invalid', {}));
    });
  }

  await asyncTest('page limit does not silently accept a partial result', async () => {
    const ctx = fetchContext(); let calls = 0;
    ctx.scanFetchApiDocument = async () => envelope(21, [{ dgsbjtCd: String(++calls), dtlSdrCnt: '1' }]);
    await assert.rejects(ctx.scanFetchHiraCompleteRows('https://synthetic.invalid', {}));
    assert.equal(calls, 20);
  });

  await asyncTest('cancellation before fetching makes no API request', async () => {
    const ctx = fetchContext(); let calls = 0;
    ctx.scanFetchApiDocument = async () => { calls++; return envelope(0); };
    await assert.rejects(ctx.scanFetchHiraCompleteRows('https://synthetic.invalid', {}, () => false));
    assert.equal(calls, 0);
  });

  await asyncTest('failed endpoint is incomplete and is retried instead of cached as zero', async () => {
    const ctx = fetchContext(); let calls = 0, fail = true;
    ctx.scanFetchApiDocument = async url => {
      calls++;
      if (url.includes('getSpcSbjtSdrInfo2.8')) {
        if (fail) throw new Error('Synthetic network failure');
        return envelope(1, [specialist()]);
      }
      return envelope(1, [zeroBeds()]);
    };
    const partial = await ctx.scanFetchClinicEvidence('synthetic-clinic-retry');
    assert.equal(partial.specialistsComplete, false);
    assert.equal(partial.facilitiesComplete, true);
    assert.equal(ctx.scanClassifyClinic(place, partial, selected).status, 'unverified');
    fail = false;
    const retried = await ctx.scanFetchClinicEvidence('synthetic-clinic-retry');
    assert.equal(calls, 4);
    assert.equal(retried.specialistsComplete, true);
    assert.equal(ctx.scanClassifyClinic(place, retried, selected).status, 'competitor');
  });

  await asyncTest('successful detail fetch is reused across selected-specialty changes', async () => {
    const ctx = fetchContext(); let calls = 0;
    ctx.scanFetchApiDocument = async url => {
      calls++;
      return url.includes('getSpcSbjtSdrInfo2.8') ? envelope(1, [specialist()]) : envelope(1, [zeroBeds()]);
    };
    const first = await ctx.scanFetchClinicEvidence('synthetic-clinic-cache');
    const second = await ctx.scanFetchClinicEvidence('synthetic-clinic-cache');
    assert.equal(calls, 2);
    assert.equal(first.checkedAt, second.checkedAt);
    assert.equal(ctx.scanClassifyClinic(place, second, ['정형외과']).status, 'competitor');
    assert.equal(ctx.scanClassifyClinic(place, second, ['신경외과']).status, 'declared');
  });

  await asyncTest('stale detail completion does not overwrite the current place assessment', async () => {
    const ctx = fetchContext(); let current = true, release;
    ctx.scanFetchClinicEvidence = () => new Promise(resolve => { release = resolve; });
    const record = { ...place, competitionAssessment: { status: 'previous-fixture' } };
    const pending = ctx.scanAssessClinics([record], selected, () => current);
    assert.equal(typeof release, 'function');
    current = false; release(evidence()); await pending;
    assert.equal(record.competitionAssessment.status, 'previous-fixture');
  });

  await asyncTest('scan assessment keeps successful clinics, failed clinics, and missing identifiers separate', async () => {
    const ctx = fetchContext(), progress = [];
    ctx.scanFetchApiDocument = async url => {
      const parsed = new URL(url);
      if (parsed.searchParams.get('ykiho') === 'synthetic-failed' && url.includes('getSpcSbjtSdrInfo2.8')) throw new Error('Synthetic endpoint failure');
      return url.includes('getSpcSbjtSdrInfo2.8') ? envelope(1, [specialist()]) : envelope(1, [zeroBeds()]);
    };
    const records = [
      { ...place, ykiho: 'synthetic-complete' },
      { ...place, ykiho: 'synthetic-failed' },
      { ...place, ykiho: '' }
    ];
    await ctx.scanAssessClinics(records, selected, () => true, (done, total) => progress.push([done, total]));
    assert.deepEqual(records.map(row => row.competitionAssessment.status), ['competitor', 'unverified', 'unverified']);
    assert.deepEqual(progress.map(row => row[0]).sort((a, b) => a - b), [1, 2, 3]);
    assert.ok(progress.every(row => row[1] === 3));
    const cohorts = ctx.scanClinicCohort({ places: records });
    assert.equal(cohorts.competitors.length, 1);
    assert.equal(cohorts.unverified.length, 2);
    assert.match(ctx.scanCompetitionStatus({ hira: cohorts, competitors: cohorts.competitors }), /일부 미확인/);
  });

  await asyncTest('detail enrichment uses bounded concurrency and completes every clinic', async () => {
    const ctx = fetchContext(); let active = 0, maximum = 0, calls = 0;
    ctx.scanFetchApiDocument = async url => {
      active++; calls++; maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return url.includes('getSpcSbjtSdrInfo2.8') ? envelope(1, [specialist()]) : envelope(1, [zeroBeds()]);
    };
    const records = Array.from({ length: 10 }, (_, index) => ({ ...place, ykiho: 'synthetic-concurrency-' + index }));
    await ctx.scanAssessClinics(records, selected);
    assert.equal(calls, 20);
    assert.ok(maximum > 1 && maximum <= 6, 'three concurrent clinics allow at most six simultaneous detail requests');
    assert.ok(records.every(row => row.competitionAssessment.status === 'competitor'));
  });

  await asyncTest('cohorts do not combine competitors with declarations, exclusions, or unknowns', async () => {
    const ctx = fetchContext();
    const records = ['competitor', 'declared', 'unverified', 'excluded'].map(status => ({ ...place, competitionAssessment: { status } }));
    records.push({ ...place });
    const cohorts = ctx.scanClinicCohort({ places: records });
    assert.equal(cohorts.competitors.length, 1);
    assert.equal(cohorts.declared.length, 1);
    assert.equal(cohorts.excluded.length, 1);
    assert.equal(cohorts.unverified.length, 2);
    assert.ok(cohorts.criteriaVersion);
    assert.equal(ctx.scanCompetitionStatus({ hira: { unavailable: true }, competitors: [] }), '조회 불가');
    assert.match(ctx.scanCompetitionStatus({ hira: { unverified: [{}] }, competitors: [] }), /확인된 0곳.*일부 미확인/);
    assert.match(ctx.scanCompetitionStatus({ hira: { errorLabels: ['synthetic incomplete department'] }, competitors: [] }), /일부 미확인/);
  });
}

testFetchBoundary().then(() => {
  console.log(JSON.stringify({ ok: true, checks, source: 'release HTML v3.7.7 criteria and fetch functions', synthetic: true, liveApi: false }));
}).catch(error => { console.error(error); process.exitCode = 1; });
