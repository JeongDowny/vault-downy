---
description: 특정 주제로 과거 메모리를 온디맨드 검색
argument-hint: <검색어>
---
사용자가 찾는 주제: $ARGUMENTS
이 주제로 `node "${CLAUDE_PLUGIN_ROOT}/hooks/inject.mjs"` 에 `{"prompt":"$ARGUMENTS","cwd":"."}` 를 stdin 으로 줘서(Bash) 관련 과거 메모리를 가져와 요약 제시하라.
