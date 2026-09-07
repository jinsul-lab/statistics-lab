# 서울 전용 API 중계

`worker.mjs`는 JINSUL MAP의 서울 실시간 인구·상권 유동인구·점포·추정매출 네 서비스를 중계한다. R-ONE Worker와 분리하여 수동 배포했다.

- `GET /health`: 서비스·버전 확인.
- `POST /seoul`: `{service,key,start,end,tail}` JSON. 인증값은 문서·소스·로그에 기록하지 않는다.
- 허용 Origin: GitHub Pages `https://jinsul-lab.github.io` 및 로컬 5500 포트 두 주소.
- 사용자 페이지부터 Worker까지 HTTPS, 서울시 원본은 HTTP 8088 경로. 임의 외부 URL 중계 불가.
- 최종 운영 버전: 2026-09-07 Cloudflare `3e4ea740 (Active) Latest`, 서비스 1.0.4.
- 추정매출 요청에 `clinicOnly: true`를 지정하면 일반의원·치과의원·한의원 행만 반환한다. `list_total_count`는 원본 전체 건수, `source_page_count`는 필터 이전 페이지 행 수로 보존하며 `clinic_filtered: true`를 표시한다. 다른 서비스의 응답은 변경하지 않는다.
- 매출 API는 상권 경로 필터가 적용되지 않는 것을 실제 확인했다. 클라이언트가 분기 전체 페이지를 확인하고 상권·분기·업종을 정확히 선택해야 한다. 일부 페이지만 가져와 완전한 분석으로 표시하지 않는다.
- Workers에서는 `redirect: 'error'`가 지원되지 않으므로 `manual`을 사용한다. 3xx는 HTTP 오류로 처리하여 임의 리디렉션에 인증값을 전달하지 않는다.
- 테스트: `node work/test_seoul_worker.mjs` (모의 응답).

HTML 저장소 루트 전체를 이 Worker에 자동 배포하도록 연결하지 않는다. 전국 유동인구를 제공하는 API가 아니며 서울 밖에서는 전국 SGIS·상가 데이터를 별도로 표시한다.
