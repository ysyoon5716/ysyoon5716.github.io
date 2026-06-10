# CLAUDE.md

## Git commit / push 전 필수 단계

원격 이미지 URL(`![](https://...)` 또는 frontmatter `ogImage`)이 포함된 포스트를 작성/수정한 경우, **반드시 commit 전에 `npm run build`(또는 `pnpm build`)를 먼저 실행**한다.

빌드 시 `scripts/fetch-remote-images.ts`가 다음을 수행한다:

1. 원격 이미지를 `src/assets/images/{slug}-{idx}.{ext}` (또는 `{slug}-og.{ext}`)로 다운로드
2. 마크다운 파일의 URL을 `../../assets/images/...` 상대 경로로 in-place 치환

따라서 빌드를 먼저 실행해야 변경된 마크다운 파일과 새로 다운로드된 이미지가 함께 커밋된다. 빌드를 건너뛰고 commit/push하면 원격 URL 그대로 배포되어 Astro 이미지 최적화 파이프라인을 타지 않는다.
