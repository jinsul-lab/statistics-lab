# 서울 전용 API 중계

`worker.mjs`는 JINSUL MAP의 서울 실시간 인구·상권 유동인구·점포 세 서비스만 중계한다. R-ONE Worker와 분리하여 수동 배포했다.

- `GET /health`: 서비스·버전 확인.
- `POST /seoul`: `{service,key,start,end,tail}` JSON. 인증값은 문서·소스·로그에 기록하지 않는다.
- 허용 Origin: GitHub Pages `https://jinsul-lab.github.io` 및 로컬 5500 포트 두 주소.
- 사용자 페이지부터 Worker까지 HTTPS, 서울시 원본은 HTTP 8088 경로. 임의 외부 URL 중계 불가.
- 최종 운영 버전: 2026-09-07 Cloudflare `37bade34 (Active) Latest`, 서비스 1.0.2. 서울 실제 데이터 수신 확인.
- Workers에서는 `redirect: 'error'`가 지원되지 않으므로 `manual`을 사용한다. 3xx는 HTTP 오류로 처리하여 임의 리디렉션에 인증값을 전달하지 않는다.
- 테스트: `node work/test_seoul_worker.mjs` (모의 응답).

HTML 저장소 루트 전체를 이 Worker에 자동 배포하도록 연결하지 않는다. 전국 유동인구를 제공하는 API가 아니며 서울 밖에서는 전국 SGIS·상가 데이터를 별도로 표시한다.
