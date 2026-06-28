# /vault-review

최근 자동 캡처된 메모리 노트를 검토하고 필요 없는 항목을 삭제합니다.

## 실행

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/review.mjs" --days 7
```

노트 ID를 확인한 후, 삭제하려면:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/forget.mjs" <id>
```

## 사용법

1. `/vault-review` 명령 실행 시 최근 7일 캡처 노트 목록 표시
2. 삭제할 노트 ID 지목 → `forget.mjs <id>` 로 `.trash/` 이동 (복구 가능)
3. 인덱스 자동 재빌드
