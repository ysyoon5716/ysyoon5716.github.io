---
title: SkySat Tasking 촬영 기회 시각화
description: Planet Skysat 군집 위성 신청 지역을 언제 촬영할 수 있을지 시각화한 데모
pubDatetime: 2026-06-10T00:00:00
tags:
  - remote-sensing
---
## 1. 서론
Planet Skysat 군집 위성이 신청 지역을 언제 촬영할 수 있을지 시각화한 데모

## 2. 방법
### 2.1. 궤도 전파
- TLE 준비
	- CelesTrak에서 Planet 그룹의 위성 TLE 다운로드 ([url](https://celestrak.org/NORAD/elements/gp.php?GROUP=planet&FORMAT=tle))
	- TLE 파싱 및 skysat 위성 필터링
	- 6시간 캐싱으로 네트워크 반복 호출 방지
- `sgp4.api.Satrec.twoline2rv`로 TLE에서 satrec 객체 생성
- `[start, end]` 구간을 `step_seconds` 간격으로 샘플링하여 `Satrec.sgp4(jd, fr)`로 TEME 위치/속도 벡터 추정
- TEME → (GMST 회전) → ECEF → 구형지구 가정으로 lat/lon/alt 변환하여 저장


### 2.2. 백엔드
- FastAPI 기반 서버
- Open Meteo API `forecast` 엔드포인트로 특정 시공간의 `cloud_cover` 검색
- `POST /api/access`에서 `{lat, lon, duration_hours, max_off_nadir_deg, step_seconds, start?}`를 받아 SkySat 위성 궤도 전파 결과 제공
	- 위성 별 촬영 가능한 시간 범위, 최소 off-nadir와 그에 해당하는 시간, 위성의 전체 trajectory, cloud_cover 응답
	- 위성 - 지구 중심 - 타겟으로 삼각형 정의 후 tangent (off-nadir) 각도 계산
	- 타겟의 지심각이 위성과 지구의 접점의 지심각 보다 크다면 타겟을 볼 수 없기 때문에 off-nadir를 90도로 반환

### 2.3. 프론트엔드
- Next.js 기반 웹 어플리케이션
- Leaflet 라이브러리로 Open Street Map 렌더링
- 궤도 전파 요청
	- `useMapEvents`로 지도 클릭을 받아 `{lat, lon}` 타깃 상태로 저장
	- 우측 패널에서 Off-nadir 임계값, 전파 기간, 시간 분해능 조정
	- 계산 실행 클릭으로 `/api/access` API 호출
- 결과 시각화
	- 위성의 전체 trajectory를 Polyline으로 시각화
		- ±180° 경도 기준으로 Polyline을 여러 segment로 분리함으로써 antimeridian seam 문제 해결
	- Swath 폴리곤 시각화
		- 사용자가 선택한 위성이 임계값 미만의 off-nadir로 볼 수 있는 지표면의 polygon 계산



## 3. 결과
![](https://ysyoon-obsidian-images.s3.ap-northeast-2.amazonaws.com/2026061019565094.png)