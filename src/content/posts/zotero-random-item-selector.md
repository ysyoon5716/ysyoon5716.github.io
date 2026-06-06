---
title: Zotero에서 랜덤 아이템 선택하는 플러그인 개발
description: Zotero에서 전체 라이브러리나 컬렉션에서 랜덤하게 아이템을 선택하는 플러그인 개발
pubDatetime: 2026-06-06T00:00:00+09:00
slug: zotero-random-item-selector
tags:
  - software
---
## 1. 서론
Zotero에서 전체 라이브러리나 컬렉션에서 랜덤하게 아이템을 선택하는 플러그인 개발

## 2. 방법
### 2.1. 메뉴 추가
- 창 선택
	- 플러그인이 켜질 때(`startup`) 이미 떠 있는 메인 창 전부를 순회(`Zotero.getMainWindows())`)
	- 플러그인이 켜진 이후 새로 열리는 메인 창 선택(`onMainWindowLoad`)
- `menuItem` 삽입
	- `doc.getElementById("zotero-collectionmenu")`에 `doc.createXULElement("menuitem")` 요소 `menu.appendChild`
- 조건부 숨김: Trash, Group Library, Saved Search 등 불필요한 화면에서는 숨겨지도록 `EventListener` 추가

### 2.2. 랜덤 아이템 선택
- 우클릭한 행 확인: `zp.collectionsView.selectedTreeRow`
- 아이템 목록 조회
	- My Library: `Zotero.Items.getAll(libraryID, true)`
	- Collection: `row.ref.getChildItems(true, false)`
- Top-level 필터: `it.isTopLevelItem()` (자식 PDF/노트 제외, 부모 문서만)
- 균등 랜덤 선택: `Math.floor(Math.random() * candidates.length)`
- 스크롤 이동: 선택된 아이템이 중앙에 오도록 스크롤 이동

## 3. 결과
![](https://youtu.be/bsfDqAoooaE)