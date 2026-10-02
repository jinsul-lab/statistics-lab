# 현재 기준 · JINSUL MAP 3.8.1

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
작업 체크아웃: ../statistics-lab-banner-release
5가상 페르소나 검토·개선: jinsulmap/PERSONAS_v3.8.1.md
비교 조회 상태, CSV 한글 해석, 제외행/초기화, PDF 안내, 태블릿 개선. Worker 변경 없음.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.8.0

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
작업 체크아웃: ../statistics-lab-banner-release (codex/banner-v379; 기존 원격 main 기반)

- 환자 ID·빈값·연령 분모 수정, 게시대 묶음/상세, 조회 결측 안내, 태블릿·지도 줌 충돌 수정.
- 상세 검증과5가상 페르소나: jinsulmap/REVIEW_v3.8.0.md. 전체 무결함 판정 아님.
- Worker·API Secret 변경 없음. API 우선/CSV 대체 유지.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.9

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html

- 현수막게시대 CSV 7,305건 복구, 공식 API 8,331건 연결. API 실패 시 CSV 대체 및 상태 표시.
- 별도 jinsul-banner-proxy Worker 배포, BANNER_API_KEY Secret 설정. 키 TXT는 저장소에 넣지 않음.
- 검사와 제공 범위: jinsulmap/BANNER_RESTORE_v3.7.9.md. 기존 의원 분류 유지.
- GitHub/Pages 배포 결과는 검증 보고서에 기록.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.8

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/WANGSIMNI_CLINICS_REVIEW_v3.7.8.md

- 사용자 재확정 기준: 의원급이면 입원 병상 유무와 관계없이 포함. 선택한 4개 과 전문의 신고가 확인되면 경쟁병원, 진료과목 신고만 확인되면 심평원 신고의원. 전문의 0명/미확인 구분.
- 병원·종합병원·상급종합병원 등 의원 외 종별은 계속 제외. 입원 병상은 참고 정보로만 유지.
- 왕십리로320 실제 주소 검색·1km·4개 과 전체 선택: 경쟁12·신고14. 서울마취통증의학과67m, 자세본재활의학과971m 모두 경쟁 목록 확인. 과거 자세본 누락의 당시 반경/필터는 미확인.
- 상권/환자 시설/입지자료/저장 기준과 문구 갱신, 전문의 미확인 신고의원을 삭제하지 않고 일부 미확인 상태 보존.
- GitHub ce8b9ad 업로드·Pages 배포 성공. 공개 사이트 재스캔도 경쟁12·신고14 및 두 의원67m/971m 확인. Worker 변경 없음.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.7

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/CLINIC_CRITERIA_REVIEW_v3.7.7.md

- 경쟁의원: 의원 종별 31, 선택한 정형외과·신경외과·마취통증의학과·재활의학과 전문의 신고 1명 이상, 입원 병상 0 확인을 모두 충족.
- 해당 전문의 신고 0인 진료과 신고 의원은 심평원 신고의원으로 분리. 입원 병상 보유·의원 외 종별은 제외하고 자료 누락/조회 실패는 분류 확인 필요로 표시.
- 상권 지도·통계·환자 화면 시설 검색·입지자료·저장/출력에 같은 기준 적용. 카카오 이름 검색은 참고 목록으로 유지.
- 실제 전문의/병상 API 10기관 표본과 정왕대로210 반경500m 브라우저 스캔 확인: 경쟁3·신고3·입원 병상 제외5·미확인0. 이 결과는 조회 당시 해당 범위의 결과임.
- 분류148·환자 시설32·통합49 및 기존 시설204개 모의 검사, 실제 API 표본·지도 UI·환자 통계·마커 회귀 통과. 실제 상주 여부는 API로 확인 불가.
- GitHub e243af5 업로드·Pages 배포 성공. 운영 브라우저에서 3.7.7·경쟁병원/심평원 신고의원 필터·판정 기준 표시 확인. Worker 및 Secret 변경 없음.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.6

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/CLINIC_SOURCE_REVIEW_v3.7.6.md

- 카카오 검색 / 심평원 신고자료 모두 선택 진료과의 경쟁 후보로 표기. 정보 출처와 경쟁 여부를 혼동시키던 명칭 수정.
- 상세창의 진료과·전문의 해석 안내, 동일 기관 중복 가능 및 합산 금지 안내. 기존 집계·색상·좌표 유지.
- 상세창 반응형·비동기 동작, 마커 렌더, 기존 경쟁 분석·인라인 구문 검사 통과. 병원 API 전수 재조회는 미수행.
- 전국 쉼터는 행정안전부_무더위쉼터 별도 이용신청 필요. 서울 연결 유지.
- GitHub 220427a 업로드 및 Pages 배포 성공. 운영 브라우저에서 3.7.6과 새 출처 필터 확인. Worker 변경 없음.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.5

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/SHELTER_REVIEW_v3.7.5.md

- 5개 시군구 네이버·카카오 실제 브라우저 대조: 양쪽 웹에는 쉼터 목록이 있으나 동일 검색어 공개 API는 0~1건. 웹 표시 건수는 공식 시설 수가 아님.
- 서울 공식 4,092건 전체 페이지·CORS 실검증, 지도범위 자동 보완 및 출처·운영안내 보존. 전국 공식 API는 별도키 필요.
- 복합 쉼터명 누락 수정, API 0건에도 중심 시군구 웹 검색 제공, 관리·경비실은 선택 보조 유지.
- 274개 모의검사·출처 UI·기존 환자/분석 회귀 통과. 실제 브라우저·API 결과와 모의검증을 보고서에 구분.
- 넓은 범위의 시설명 과밀 표시를 수정: 50개 초과 시 선택/호버 라벨, 확대 시 자동 표시.
- 서울 Worker 1.0.5 및 GitHub Pages v3.7.5 배포 확인. 단일 HTML 고정 주소 사용.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.4

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/MAP_SEARCH_REVIEW_v3.7.4.md

- 시설 마커 6색·그림 범례, 지도 안 병원 상세 패널·스크롤·겹침 수정.
- 경로당·노인정·쉼터 기본 검색, 관리·경비실 선택 보조 검색 및 정확한 내보내기 분류.
- 74개 검색 통합 검사와 반응형 패널·기존 통계 회귀 통과. 정왕대로74 주변 실제 SDK 조회 확인.
- 경비실 대체는 API 정책상 의무가 아님. 전국 전수 시설/API/PDF 검증은 미수행.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.3

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/MARKER_REVIEW_v3.7.3.md

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.2

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html
상세: jinsulmap/CHART_REVIEW_v3.7.2.md

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.1

기준 파일: jinsulmap/jinsulmap.html
고정 URL: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html

## 3.7.1 · 분석 정의·계산 검토 (2026-09-29)
- 환자 고유번호·신환 부정표기·나이·동명지역·수동반경·비동기 완료 수정.
- 원평균/선택지표 일치, 빈 결과·0분모·실패 null, 차트 장애 수치표 수정.
- 기록 수/반복기록 비율로 명칭 정리하고 임의 입지 종합점수 제거.
- 실제 원본·전체 API·PDF 재검증은 미수행. ANALYSIS_REVIEW_v3.7.1.md 참고.

아래는 과거 기록입니다.

# 현재 기준 · JINSUL MAP 3.7.0

고정 실행 주소: https://jinsul-lab.github.io/statistics-lab/jinsulmap/jinsulmap.html

## 3.7.0 · 고정 주소와 지표 해석 수정 (2026-09-29)
- 기준 앱: jinsulmap/jinsulmap.html. 내부 버전 3.7.0. index.html은 고정 주소로 이동.
- 경쟁 여유/저밀도 점수 및 경쟁 밀도에 따른 긍정·부정 색상을 제거. 근거 없는 18곳/㎢ 임계값을 종합 점수에서도 제외.
- 검색 병원 총수, 500m·1km 이내 수, 최단 직선거리, 진료과별 검색 결과 표시. 반경 밖과 거리 미확인을 0건으로 취급하지 않음.
- 상권 활력→상가 밀도, 생활 동선→주변 시설 수 등 실제 측정 범위에 맞게 명칭·설명 정리. 나머지 참고 점수는 개원 적합성/매출 예측이 아님을 명시.
- 환자 구성 히트맵·연령별 환자/내원 기여·지역별 누적 기여 그래프 포함.
- 기존 버전 HTML 27개 제거 (Git 이력 보존). 미배포 v3.6.9도 고정 앱으로 통합.
- 검증: test_competition_current.cjs, test_patient_current.cjs 통과. 합성 환자 데이터/실제 Chart.js 사용. 외부 API 전체 재검증은 수행하지 않음.

아래는 과거 작업 기록이며 현재 기준 파일을 의미하지 않는다.

# JINSUL MAP 현재 작업 상태

기록일: 2026-09-07

## 기준 파일
- 현재 로컬 버전: `3.6.0`
- 다음 작업 기준: `jinsulmap/JINSUL_MAP_v3.6.0.html`
- 기존 루트 사본: `JINSUL_MAP_v3.5.2.html`. 이전 작업에서 함께 업로드한 사본이며, 별도의 개발 기준으로 사용하지 않는다.
- 상세 검증: `jinsulmap/SITE_VERIFICATION_v3.5.9.md`
- 실행 주소: https://jinsul-lab.github.io/statistics-lab/jinsulmap/

## 검증과 저장소 상태
- v3.5.10: 병원 상세 보완·입지 자동 입력. 로컬/모의92개 통과. 국립중앙의료원 API 실제 HTTP403/코드30으로 활용승인 확인 대기. 포털 사용자 로그인 필요. ENRICH_VERIFICATION_v3.5.10.md 참조.
- v3.5.9: 입지자료·임장 작성, 저장/백업/독립HTML/A4, 경쟁의원 비교·매출 참고, 지역 검색 범위 구분. 로컬/모의92개 통과. 부천 샘플A4 PDF3페이지 검수. 용인시 대표지점 스캔에서 SGIS 코드-1 미연결 확인. 최종 앱 업로드 `f483cc195cee62c6346f462def229dd2de1276b6`. 구체 주소 백옥대로1142에서는 SGIS30,877명·심평원14곳·상가2,703곳 수신 확인. 상세 입지 검증 보고서 참조.
- v3.5.8: 서울 의원 업종별 점포·개폐업·매출 6종 차트. 로컬/모의86개 통과, 운영 일반의원24·치과6·한의원5 및 매출 표시 확인. 서울 Worker1.0.4 `3e4ea740` Active. 최종 업로드 `2a3553439b800854ca09eb8f5c08322543af42cc`, 최신 Pages 경로의 v3.5.8 이동·지도 초기화 확인. 상세 의원 검증 보고서 참조.
- v3.5.7: 대비·팝업 크기·인구 통계 차트 개선. 로컬/모의 57개 통과. 왕십리 실제 실시간·예측·방문인구·분기상권·SGIS 표시 확인. 최종 앱 업로드 `9bf69e1ffb2463eeb6c5495a5f6a40fd70550b65`, Pages 최종 필터 글자색 확인. 상세 UI 보고서 참조.
- v3.5.6: 관광공사 활용승인 확인, 기존 키와 일치. 승인 후 0000 응답을 오류로 판정하던 관광공사 전용 해석 수정. 로컬/모의 44개 통과. 서울 성동구·부산 해운대구 6월/7월 말일 실제 수신 확인. 상세 v3.5.6 보고서 참조.
- v3.5.5 최종 앱 원격 커밋 `af920e5faa2509e8a08931fabe2b3ce57064eed8`, 로컬 앱 커밋 `924a261`. 명령줄 네트워크 제한으로 GitHub 앱을 통해 업로드했다. 로컬/원격 이력이 다르므로 강제 push 금지.
- 최종 3열 차트 운영 화면 검수 완료. v3.5.5 당시 관광공사 승인 대기였으며 v3.5.6에서 승인·실제 수신 확인 완료.
- v3.5.5: API 동시성·30초/45초 재시도·취소·응답시간 진단, 전국 방문자 API 연결 코드, 차트 개선. 운영 왕십리 심평원 최대 23.1초 수신으로 기존 18초 제한 문제 확인. 관광공사 API는 HTTP 403으로 활용승인 확인 필요; 전국 수신 성공은 아직 아님. 상세 v3.5.5 보고서 참조.
- v3.5.4: 서울 자동 재시도·실패 캐시 제거·최신 분기 자동 선택·유동인구 세부 표시. 로컬/모의 검증 66개 통과. 앱 업로드 `37d404a92c1fb5aaf9bce4a1c845ae9ef38cefe2`. 운영 검증은 v3.5.4 보고서 참조.
- v3.5.3: 지역 판별·서울 HTTPS 중계·지역별 자료 상태 개선. 상세 검증은 `jinsulmap/API_VERIFICATION_v3.5.3.md`.
- v3.5.3 로컬/모의 검증 56개 통과. 서울 Worker 최종 `37bade34` Active 확인. 운영 사이트에서 서울 실시간 인구·분기 유동인구·점포 수신 확인.
- v3.5.3 GitHub 앱을 통해 `main` 업로드 완료: `260bdc6d276439a68ab260e70efb357e406abfe6`. 원격 HTML blob `09c312b96819af3be87e7683cda659b64a3e25fb` 재조회 확인.
- 새 실행 주소: https://jinsul-lab.github.io/statistics-lab/jinsulmap/JINSUL_MAP_v3.5.3.html . Pages 배포 및 서울·부산 실제 스캔 확인 완료. 상세 결과는 v3.5.3 검증 보고서에 기록.
- 전국 SGIS·반경 상가·R-ONE의 화면 수신 확인. 서울 Worker의 미지원 `redirect: 'error'`를 `manual`로 수정하여 HTTP 504를 해결했다. 왕십리역 실시간 18,000~20,000명, 행당시장상점가 분기 유동인구 855,133명·점포 323곳을 화면에서 확인했다. 기준 시점과 범위는 검증 보고서 참조.
- 로컬 앱 커밋은 `fec2233`이다. 명령줄 GitHub:443 연결 실패로 GitHub 앱을 사용하여 원격 커밋을 따로 생성했다. 로컬과 원격 커밋 ID가 다르므로 다음 Git 동기화 시 원격 상태를 먼저 확인하고 강제 push하지 않는다.
- 앱 업로드 커밋: `1a7cdad` — `Fix JINSUL MAP v3.5.2 API handling`.
- GitHub push 성공은 사용자의 PowerShell 결과와 로컬 원격 추적 상태로 확인했다.
- 코드 검증 34개 통과. 실제 함수와 모의 응답을 사용한 로컬 검증이며 운영 API 전체 성공을 의미하지 않는다.
- 왕십리본정형외과의원 1km 반경에서 왕십리역 실시간 인구 지정지점 및 주변 공식 상권 선택을 로컬 계산으로 확인했다.
- 테스트 실행: 저장소 루트에서 `node work/test_api_v352.cjs`.
- 기존 작업·검증 스크립트는 루트의 v3.5.1/v3.5.2 파일을 참조한다. 다음 HTML 수정 시 기준 경로에 맞게 스크립트를 정리하고 검증해야 한다.

## R-ONE 프록시
- 운영 요청 주소: https://jinsul-rone-proxy.yms0127.workers.dev/rone
- 사용자의 통신 시험에서 404와 CORS 헤더 부재가 확인됐다.
- HTML 저장소 변경이 R-ONE Worker 자동 배포를 실행한 이력이 확인됐다.
- 사용자가 이전 정상 이력의 `7d3de591` 버전으로 복구했으며, 당시 화면에서 운영 트래픽 100%를 확인했다.
- 이후 Worker Settings에서 Git 연결을 직접 해제했고, Git repository 항목이 `Connect`로 바뀐 것을 확인했다.
- 이 연결 해제는 해당 Worker의 자동 배포를 중단한 것이며, GitHub 저장소나 Pages 배포를 삭제한 것이 아니다.
- 복구 이후 실제 임대료·공실률·투자수익률 수신 성공은 아직 확인하지 못했다.

## 남은 확인
- GitHub Pages 실행 주소에서 왕십리본정형외과 / 1km 스캔 후 실제 R-ONE 및 다른 API 응답을 확인한다.
- `file://`로 열린 로컬 HTML의 오류와 배포 주소의 오류를 구분한다.
- 실행 환경의 외부 네트워크 제한으로 발생한 실패를 사용자 API 미승인으로 단정하지 않는다.
- 전국 버스정류장 API는 현재 앱에 통합되지 않았다. 연결 실패 항목과 구분한다.

## 이번 문서 정리
- `AGENTS.md`에 합의된 보존·오류 수정·검증·배포 규칙을 기록했다.
- 현재 상태와 변경 이력을 각각 `HANDOFF.md`, `CHANGELOG.md`로 분리했다.
- 문서 변경만 있으므로 앱 버전은 유지한다.

## v3.5.10 업로드
- 최종 앱 d44ec149e72d5bef7540d138ec4c816b1685c46a. Pages 로딩 및 백옥대로1142 실제 스캔 확인.
- 남은 작업: 공공데이터포털 사용자 로그인 후 전국 병의원 찾기 API 활용승인/키 확인, 실제 진료시간 재검증.

## v3.5.11 최신 상태
- 층별·전유공용면적 추가조회와 호실 선택 반영. 로컬/모의105개 통과. REGISTRY_VERIFICATION_v3.5.11.md 참조.
- 국립중앙의료원 승인 완료 후 실제200/00 및 용인서울본 운영시간 앱 표시 확인. 이전 승인 대기 기록은 해결됨.
- 실제 임대 호실의 가격/공실은 아직 미확인. 메디게이트 샘플 링크 요청 중.

- v3.5.11 최종 앱 d6b7fabf307dba9dc1e229c6f49dc8573a772e32. 최종 HTML 실제 대장 수신·화면 표시 검증 완료. 교차확인 문서 outputs/부천_신흥로197_입지자료_교차확인.md.

## v3.6.0 최신 작업
- 한 자리 x.x.x 자리올림 규칙 적용. 출처 스냅샷 보존·주차/승강기 미제공 구분·대장 중복 감지·호실 변경 시 자동 면적 정합성 수정.
- 로컬/모의124개 통과. 상세 자체 점검과 다음 개발 항목은 jinsulmap/AUDIT_v3.6.0.md.

## v3.6.1 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.1.html. 서울 외 의원 현황 및 호실 표기 수정.
- 139건 로컬/모의 검사 통과. 전국 매출 데이터 신규 연결은 아님.

## v3.6.2 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.2.html. 호실 자연 정렬 적용. work/upgrade_v362.cjs 재현·검증.

## v3.6.3 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.3.html. 온라인 사전 확인·로드뷰·의원 범위 선택 통합.
- 실데이터 부천 유관21/전체102곳 확인. 로드뷰 렌더링 확인. PDF 이미지화·네이버 최신일 자동 비교는 남은 항목.

## v3.6.4 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.4.html. 지도·AI UX 개선. Cloudflare 키/결제 변경 없음.

## v3.6.5 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.5.html. 유료 AI 제거. 심평원 집계는 의원급/신고 진료과/선택 직선반경 기준 유지.

## v3.6.6 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.6.html. 링크 및 사진 칸 로드뷰 연결. PDF 래스터 사진 삽입은 미구현.

## v3.6.7 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.7.html. 검색 응답 대기 제한, 병원 분류 조건, 누락 숫자 처리, 저장 링크·전화번호 보존, 조회일 안내.
- 101개 로컬/모의 검사 통과. 시흥·서울 실스캔 및 시흥 입지자료 저장·복원 확인. 상세: jinsulmap/AUDIT_v3.6.7.md.
- 로드뷰 자동 PDF 이미지화, 모바일 실기기 검증은 남아 있음. D:\Codex 이동은 아직 하지 않았으며 이번 작업은 기존 C: 저장소에서 수행.

## v3.6.8 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.8.html. 환자 통계 스캐터 중단 오류(sortedVip 변수 범위) 수정. 내원 기여/요약 지표/스캐터 수치표 추가.
- 합성 환자 80명으로 실제 Chart.js 및 Edge headless에서 통계 탭 실행 확인. 환자 원본 업로드 파일 검증은 수행하지 않음. work/test_patient_v368.cjs 참조.
- A4 입지자료 배치·로드뷰 PDF 처리·Worker·환자 업로드/분류 및 마커 규칙은 변경하지 않음.

## v3.6.9 최신 기준
- jinsulmap/JINSUL_MAP_v3.6.9.html. 환자 구성·기여 탭: 지역×연령 히트맵, 연령별 환자/내원 비중, 지역별 누적 기여도.
- 현재 유형·반경 필터 사용. 상위 10개 동 + 나머지 합산, 미상 포함. 방문 날짜를 저장하지 않아 시계열/재방문 코호트는 추가하지 않음.
- work/test_patient_v369.cjs: 합성 80명/240회/8개 동, 14개 동 합산, 0 분모, 미상, 기존 통계 회귀 및 768×1024 화면 렌더링 검증. 실제 환자 원본 미검증.

최신 배포 검증: 1849ca6 이후 Pages v3.8.0, 공개 API 게시대8331건/현화면143건/묶음14개 확인. 상세 보고서 참고.

