---
title: Triton으로 Kernel Fusion 해보기
description: Triton을 사용해서 LayerNorm + GELU 커널을 융합해 보자
pubDatetime: 2026-06-08T00:00:00
tags: gpu
---
## 1. 서론

Kernel Fusion은 여러 개의 연산(커널)을 하나의 큰 연산으로 묶어서 한 번에 실행하는 최적화 기술이다. 중간 결과를 HBM에 저장하면서 생기는 병목을 제거함으로써 연산 속도가 빨라지고 메모리가 줄어든다.

이 글에서는 Python 문법으로 고성능 커널을 작성할 수 있는 Triton을 사용해서 LayerNorm + GELU 커널을 융합하여 성능 개선을 확인해보고자 한다.


## 2. 방법
### 2.1. 전체 파이프라인
1. reduction(평균,분산)을 효율적으로 하기 위해 한 행을 하나의 프로그램으로 할당
2. Dimension 보다 같거나 큰 2의 거듭제곱으로 프로그램의 Block Size 정의
3. Block Size에 따라 병렬 실행 할 warp 수 선택
4. 프로그램별 fused kernel 실행

### 2.2. Fused Kernel
1. program_id(grid index) 선택
2. 인덱스에 해당하는 데이터 pointer 계산 후 데이터 로드
3. 유효 데이터 masking 적용
4. LayerNorm 통계 계산 및 affine 변환
5. GELU (tanh 근사 방법) 적용
6. 결과를 HBM에 저장


## 3. 결과
PyTorch Eager, `torch.compile` 방법과 속도/메모리 비교 진행

- 속도: Eager/Compile 대비 약 2배 속도 향상
- 메모리: Eager 대비 peak memory 50% 절약


![](https://ysyoon-obsidian-images.s3.ap-northeast-2.amazonaws.com/2026060811132206.png)
![](https://ysyoon-obsidian-images.s3.ap-northeast-2.amazonaws.com/2026060811154492.png)