---
title: MuJoCo Franka Panda Pick-and-Place 데모
description: MuJoCo 환경에서 Franka Emika Panda가 클릭한 위치로 박스를 pick and place 하는 데모
pubDatetime: 2026-06-03T00:00:00
slug: mujoco-franka-panda-pick-and-place-demo
tags:
  - robotics
---
## 1. 서론
MuJoCo 환경에서 Franka Emika Panda가 클릭한 위치로 박스를 pick and place 하는 데모


## 2. 방법
### 2.1. 빌드
- `MjSpec`으로 `panda`와 `scene` 로드 후 attach.
- `panda`의 TCP(Tool Center Point) 정의

### 2.2. 클릭
- GLFW로 마우스 클릭 이벤트 탐지
- `mjv_select`를 통해 2D 윈도우 좌표를 ray casting하여 3D 좌표로 변환
- 3D 좌표를 2D 바닥 평면으로 투영
- 로봇 작업 반경으로 clamping


### 2.3. 제어
- 관절 가동 범위 지정
- 정밀제어(pick/place)와 이동제어(transit)에 tolerance 차등 부여
- Damped Least-Squares(DLS) 기반 Inverse Kinematics로 목표 위치에 대한 관절 값 추정
- 관절당 1.0 rad/s 속도 제한을 적용하여 해당 step의 목표 위치를 `data.ctrl`에 저장
- `mujoco.mj_step` 호출
- 안정적인 그리핑을 위해 holding 중에 TCP의 위치와 hand body의 rotation으로 박스 포즈 정의 (magnetic hand)


## 3. 결과

![](https://youtu.be/TDiBkQF_EPg)


