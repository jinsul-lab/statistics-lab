# Facilities independent audit — v3.8.0 working copy

Scope: senior centers/cooling shelters, welfare keyword search, HIRA clinic classification, partial/missing/zero states, bounds, reset and asynchronous cancellation. Local source and synthetic tests only; no live API or browser verification in this reviewer. No patient files read. Root owns HTML/browser and final integration.

## Findings

### P2: HIRA rows with missing coordinates disappear without a completeness warning

Location: `scanFetchHiraSpecialty`, current line 5708 onward (line numbers may shift while root edits).

Actual function reproduction: `node work/facilities_audit_repro_v380.cjs` injects one synthetic clinic with empty XPos/YPos at the API boundary. Observed `sourceRows:1, returnedRows:0, metadataKeys:[]`. The coordinate filter silently removes the row; the competition aggregator then has neither an API error nor a missing-coordinate count. An all-missing response can therefore propagate a normal zero displayed result. This does not prove a currently deployed API response has such a row.

Fix: preserve invalid/missing-coordinate counts across specialty fetch, merge and facility result; mark coverage incomplete and say those institutions cannot be placed. Do not fabricate coordinates or count unlocated institutions within the radius. Deduplicate missing institution identities where possible across selected specialty calls.

### P2: exported bed count is a maximum of source fields, not established total

Location: `scanClassifyClinic` positive inpatient branch, `facilitySourceColumns` field `입원 병상(개)` (current line 2878).

The classifier deliberately uses Math.max over aggregate/component inpatient fields. Existing criterion test explicitly verifies the aggregate and component fields must not be summed. That avoids double counting, but the exported number has an unqualified count label. The selected largest field alone is not demonstrated to be the total for all inpatient types. Classification is unaffected: beds no longer gate competition.

Fix: retain current eligibility and avoid blindly summing. Prefer `입원 병상 확인` with `보유 확인 / 0개 확인 / 미확인`; alternatively identify the exported number as the maximum of reported fields and preserve raw fields for review. Exact totals need a verified source-field definition.

### P2 caveat: positive specialist subtotal with another selected specialty unknown

Location: `scanClassifyClinic` specialistCount assignment (current line 5633), numeric specialist displays/exports.

Existing test confirms input 05=1 and selected 06=null returns competitor, specialistCount=1 and specialty06=null. Eligibility is correct, but the total presentation can read as exactly one despite an unknown component. Preserve eligibility; label the displayed count `확인된 최소 1명` or carry a completeness marker when selected specialty counts include null. No real institution assertion is made.

## Verification

- Seoul official shelter client: 12 tests pass, including complete paging, no-data vs failure, bounds, incomplete page rejection, cache and invalid-coordinate counts.
- Shelter helpers: 39 checks pass.
- Clinic criterion v3.7.8: 159 checks pass, including selected four specialties, beds do not exclude clinics, unknown specialists do not become zero, and non-clinic exclusion.
- Clinic integration v3.7.8: 69 checks pass.
- Senior search current: 204 checks pass after fixture-only addition of banner reset helper mocks.
- Patient competition v3.7.7 regression: 32 checks pass and its nested senior204 checks pass. Script name is historical; it reads the already-patched current HTML.
- Initial senior/patient runs failed from missing `renderBannerInspector` in the mock, not demonstrated runtime error. `work/test_senior_current.cjs` now stubs both banner reset UI functions; no HTML edits by reviewer.

Read-only source review confirms: keyword errors/timeouts and truncation are surfaced, official Seoul coverage is separate from nationwide absence, auxiliary contacts are opt-in and explicitly labeled, reset increments the request token, and in-flight results check that token before rendering. Official and HIRA bounds are validated; clinic search refuses viewports requiring over 5km radius. Senior records preserve cross-source duplicates and disclose that possibility.

## Hypothetical persona review

These are simulated perspectives, not interviews or observations of real users.

- **현장조사자:** source links, reported operating details, auxiliary labels, and reset cancellation support visit planning. A search miss cannot establish no facility; Seoul-only official supplement and Kakao keyword limits remain material. Browser readability, actual opening hours and nationwide coverage require separate evidence.
- **운영관리자:** clinic classification follows the user criterion (clinic-level, selected relevant specialist, beds unrestricted; HIRA department-only declarations separate). Reusing exports needs the missing-coordinate and exact-count caveats above; counts from mixed provider facility records must not be treated as a deduplicated census.

Assessment: share with caveats within this inspected scope. No P0/P1 defect demonstrated. Live API coverage and rendered browser behavior belong to the lead's separate verification.

## Root final repair verification

좌표 제외 건수와 부분 조회 경고를 연결했고 work/test_io_coverage_v380.cjs로 전체실패와 부분결측 구분을 검증했다. 병상 출력명을 항목 최대 참고값으로 바꾸고 부분 전문의 숫자를 최소 인원으로 표시했다. 기존 분류159/통합69/시설204/환자경쟁32 회귀 통과. 실제 서울·시흥 표본 결과는 jinsulmap/REVIEW_v3.8.0.md에 기록.
