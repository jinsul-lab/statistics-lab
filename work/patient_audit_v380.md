# Patient analysis independent audit — v3.8.0 review snapshot

Scope: current working HTML, read-only review of parser and statistical computations. No actual patient data, geocoding, external upload or browser sessions. Evidence: `work/patient_audit_v380.cjs`, executed successfully on 2026-10-02. The script intentionally asserts the observed pre-fix failures; update these assertions if root repairs them.

## Independent reference fixture

Seven source records represent A twice (both same date), B once, C once, and D three times. A/B have new flags, C has 90-day source label, D has neither. Expected and observed: four unique people, seven records; classifications repeat-new=1, single-new=1,90-day=1,existing=1; new repeat ratio1/(1+1)=50%; twenties2/4=50% people and3/7=42.857% records; unknown-age1/4=25% people and3/7 records. Top region A accounts for50% people,42.857% records; cumulative totals100%. The same-day records are counted separately as expressly disclosed; no chronological revisit claim is supported.

## Demonstrated findings

1. P1 — parser accepts unrelated identifier columns (HTML~3172–3175). Headers `전화번호,주소,성명` with two differently named people sharing a phone produce one patient with two records. Generic `/차트|번호|ID/` fallback treats phone or resident number as patient key. Reject nonpatient columns; use approved exact patient/chart identifiers or explicit mapping. Do not silently reinterpret telephone/insurance/resident IDs.
2. P2 — numeric zero ID excluded (~3179). Chart IDs0 and1 yield one patient. Replace truthiness check with null/undefined/trim-empty validation.
3. P2 — missing/unknown new flags become affirmative (~3166). `신규=미상` becomes a single-new patient. Explicit unknown representations should remain unknown/nonaffirmative, with a visible import quality warning; preserve recognized positive source formats.
4. P2 — impossible birth date accepted (~1865). `990231-1******` yields age27 instead of unknown. Validate exact Gregorian date and recognized century marker before age derivation. Fixture uses synthetic masked data only.
5. P2 — blank first address suppresses later valid address (~3183). Same patient first has blank address, next record has valid address; final address stays blank, excluding the patient from distance statistics. Fill blank initial address from a later nonempty value; conflicting nonempty addresses need an explicit rule and warning.
6. P2 — age table denominator and empty total (~3531–3535). One age20 plus one unknown renders age20 as100%, while total row is2/100%; known-only denominator exists only in canvas accessibility label. Empty filter renders total0/100%. Preserve known-only calculation if intended but visibly label denominator, separate unknown counts, and show undefined percentage as em dash. VM Chart stub confirms chart counts equal known-age table counts.
7. P2 wording — distance baseline (~4224–4226 vs1290) derives overall repeat rate solely from coordinate-known patients, whereas general notice says current-filter entire baseline. This can change Lift when unknown-coordinate patients have different classifications. Explain coordinate-known denominator in distance panel; do not imply it includes every filtered patient.

## Confirmed boundaries and limits

Parser groups by trimmed string ID, gives90-label precedence over new, counts source rows instead of distinct dates, and uses source age before resident-derived age. These match its visible method description. Patient-mix proportions, unknown bucket inclusion, and cumulative arithmetic match the independent fixture. Chart binding inspected with a stub only, not live visual rendering. Workbook byte decoding (XLSX/CSV encoding), actual vendor export formats, geocoder completion, browser layout, real API data, and address accuracy not independently exercised here. Existing browser tests were read but not launched because root owns browser testing. No shared HTML modifications were made.

## Post-fix verification

Root repaired findings1–6 in the shared HTML. `work/patient_audit_v380.cjs` now contains passing regression assertions for those fixes plus the independent arithmetic fixture. The final source was tested with `node work/patient_audit_v380.cjs`: exit0. `node work/test_patient_current.cjs` also completed exit0 using real Chart.js in headless Edge: all statistical tabs, scatter(4points), heatmap/count-share mode, age contribution, cumulative totals, top10+other, unknown ages, zero denominator, tablet viewport, empty filter refresh, sample warning, and missing chart library cache. Browser page/console errors were empty. This supersedes the earlier statement that no browser tests were launched. The remaining limits are actual vendor XLSX/CSV bytes, real geocoder/API execution, real addresses and clinical interpretation. Findings above preserve the original reproduction trail rather than indicating those fixed defects remain open.

Root final: 거리 분모 안내를 좌표 확인 환자로 수정했고 실제 합성 CSV 업로드4명/7건과 태블릿 연령 표3명 확인/1명 미상으로 확인했다. 파일 읽기 순서·오류는 work/test_io_coverage_v380.cjs 통과.
