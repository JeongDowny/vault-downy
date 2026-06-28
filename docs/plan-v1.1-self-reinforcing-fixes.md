# vault-downyu v1.1 — 자기강화 루프 차단 + 계측 (수정 계획)

> 4-에이전트 비판으로 발견된 코드 실버그 수정. TDD(node --test). 대부분 1~수줄. 기존 27 테스트 유지.

**배경:** 현재 코드가 (a) 모든 노트 `origin: user-originated` 하드코딩, (b) HEADER 가 "라벨 가중 낮다"고 거짓 주입(실제 가중 0), (c) extract 가 "일반화" 강제, (d) verbatim(구체성 앵커) 인출 안 함 → 자기강화 루프가 이미 작동. + 계측 0 이라 "신호 보고 결정" 불가.

**커밋:** author `git -c user.name='jeongdaun' -c user.email='developer@enternext.co.kr'`. 의미단위.

---

### Task 1: provenance — 결정론적 origin (transcript turn 인접성)

**Files:** `lib/transcript.mjs`, `lib/gate.mjs`(또는 새 `lib/origin.mjs`), `lib/candidates.mjs` 호출부, `hooks/capture.mjs`, `lib/consolidate.mjs`, `test/origin.test.mjs`

**설계(코사인/LLM 아님, 결정론):**
- `transcript.mjs` 에 추가: `lastTurnPair(path) -> { user: string, prevAssistant: string }` — 마지막 user 발화 + 그 직전 assistant 발화 텍스트. (기존 `_userTexts` 와 별개로 role 순서 보존 파싱)
- 새 `lib/origin.mjs`:
  ```javascript
  function tokens(s){ return new Set(s.toLowerCase().split(/\s+/).filter(w=>w.length>1)); }
  function jaccard(a,b){ const A=tokens(a),B=tokens(b); if(!A.size||!B.size) return 0;
    let inter=0; for(const x of A) if(B.has(x)) inter++; return inter/(A.size+B.size-inter); }
  // 직전 assistant 제안을 단순 수락한 발화면 model-proposed-approved
  export function classifyOrigin(userText, prevAssistant){
    if(!prevAssistant) return "user-originated";
    const ov = jaccard(userText, prevAssistant);
    const short = userText.trim().length < 60;
    if(ov > 0.5 || (short && ov > 0.3)) return "model-proposed-approved";
    return "user-originated";
  }
  ```
- `capture.mjs`: `lastTurnPair` 로 user+prevAssistant 얻어 `classifyOrigin` → candidate 에 `originHint` 저장. (gate 는 user 텍스트로 그대로)
- `consolidate.mjs`: 하드코딩 `origin: user-originated` 제거 → 배치 origin = `recs.some(r=>r.originHint==="user-originated") ? "user-originated" : "model-proposed-approved"` (이번 배치에 내가 발원한 게 하나라도 있으면 user, 전부 수락이면 approved). 노트 frontmatter 에 그 값.

**테스트(`test/origin.test.mjs`):** classifyOrigin — (prevAssistant 없음→user), (긴 user 독립발화→user), (짧고 직전제안과 겹침 큼→approved). + capture 가 originHint 저장, consolidate 가 배치규칙으로 origin 세팅.

- [ ] 테스트 작성 → 실패 → 구현 → 통과 → 커밋 `"feat(origin): 결정론적 turn-인접성 provenance(하드코딩 제거)"`

---

### Task 2: HEADER 정직화 + 실제 origin 가중

**Files:** `lib/config.mjs`, `lib/retrieve.mjs`, `test/retrieve.test.mjs`

- `config.mjs`: `export const ORIGIN_WEIGHT = { "user-originated":1.0, "model-proposed-approved":0.85, "model-only":0.7 };`
- `retrieve.mjs rank()`: scope 강등 후 `m.score *= (ORIGIN_WEIGHT[m.origin] ?? 1.0)` 추가 → HEADER 의 "가중 낮다"가 실제가 됨. (mild — 묻지 않고 nudge)
- HEADER 문구 유지(이제 참).
- index meta 에 `origin` 은 이미 있음(rebuild meta 확인 — 있음).

**테스트:** 동일 코사인 두 노트 중 model-proposed-approved 가 user-originated 보다 낮은 score.

- [ ] TDD → 커밋 `"feat(retrieve): origin 실제 가중(HEADER 정직화)"`

---

### Task 3: extract "일반화 강제" → 구체 보존

**Files:** `lib/extract.mjs`, `test/extract.test.mjs`(프롬프트 변경이라 동작테스트는 모킹 유지)

- `extract.mjs` 프롬프트 gist 지시 변경:
  - 기존: `gist(문제프레이밍 한 줄, 일반화)`
  - 변경: `gist(문제 상황은 유사 문제가 매칭되도록 일반화하되, 사용자 고유의 결정·근거·고유명사·구체 맥락은 보존)`
- verbatim 지시 유지(원문 발췌, 재작성 금지).

**테스트:** 기존 extract 테스트(모킹 응답 파싱)가 깨지지 않는지만 확인(프롬프트 문자열 변경은 로직 무관).

- [ ] 프롬프트 수정 → 기존 테스트 green → 커밋 `"feat(extract): 일반화 강제 제거, 구체 보존 지시"`

---

### Task 4: verbatim 스니펫 인출 주입

**Files:** `lib/index.mjs`(rebuild meta 에 verbatim 추가), `lib/retrieve.mjs`(formatInjection), `test/retrieve.test.mjs`

- `index.mjs rebuild`: meta entry 에 `verbatim: n.verbatim` 추가.
- `retrieve.mjs formatInjection`: 각 노트 라인에 verbatim 짧은 발췌 포함:
  ```javascript
  const vb = (m.verbatim||"").replace(/\s+/g," ").slice(0,120);
  const line = `- [${label}·${m.created||""}·${(m.score??0).toFixed(2)}] ${m.gist||""}` + (vb?`\n    ↳ "${vb}"`:"");
  ```
  토큰 예산(`approxTokens`)에 verbatim 포함해 계산.

**테스트:** formatInjection 출력에 verbatim 발췌(`↳`) 포함. 예산 초과 시 잘림.

- [ ] TDD → 커밋 `"feat(retrieve): verbatim 스니펫 주입(내 원문이 Claude에 닿게)"`

---

### Task 5: 계측 — retrieval/capture 로그 + content_hash

**Files:** 새 `lib/metrics.mjs`, `hooks/inject.mjs`, `lib/consolidate.mjs`, `test/metrics.test.mjs`

- `lib/metrics.mjs`: `logRetrieval(rec)` → `.derived/retrieval.jsonl` append(try/catch, fail-silent). `logCapture(rec)` → `.derived/capture.jsonl`.
- `inject.mjs`: 주입 직전 `logRetrieval({ts, corpus_size:meta.length, candidates: top5 [{id,score}], injected_ids})`. (query 원문 대신 길이/해시 — 프라이버시. 간단히 생략 가능)
- `consolidate.mjs`: 노트 frontmatter 에 `content_hash: sha256(gist+verbatim).slice(0,16)` 추가. index meta 에도 `content_hash`. 그리고 `logCapture({ts, session, written: [...ids], dedup_skipped: n})`.

**테스트:** logRetrieval/logCapture 가 jsonl append, 디렉터리 자동생성, 예외 안 남(경로 권한 등). content_hash 가 frontmatter 에 들어감.

- [ ] TDD → 커밋 `"feat(metrics): 인출·캡처 로그 + content_hash(나중 리뷰 데이터 보존)"`

---

### Task 6: bi-temporal lite — recency tie-break + superseded 제외

**Files:** `lib/index.mjs`(meta 에 valid_until/superseded_by), `lib/retrieve.mjs`(rank), `test/retrieve.test.mjs`

- `index.mjs rebuild` meta: `valid_until: n.validUntil ?? null, superseded_by: n.supersededBy ?? null` 추가.
- `retrieve.mjs rank`: 점수 계산 전 필터 —
  ```javascript
  const today = new Date().toISOString().slice(0,10);
  // superseded 또는 만료 제외
  if(m.superseded_by) skip;
  if(m.valid_until && String(m.valid_until).slice(0,10) < today) skip;
  ```
  정렬: score 동률 근사 시 created 최신 우선(2차 키). 구현: `scored.sort((a,b)=> b.score-a.score || String(b.created).localeCompare(String(a.created)))`.

**테스트:** superseded_by 있는 노트는 결과서 제외. created 최신이 동점서 위.

- [ ] TDD → 커밋 `"feat(retrieve): superseded/만료 제외 + recency tie-break"`

---

### Task 7: /vault-review + forget(kill) + session-start 노트수 표시

**Files:** `commands/vault-review.md`, `scripts/review.mjs`, `scripts/forget.mjs`, `hooks/session-start.mjs`, `test/forget.test.mjs`

- `scripts/review.mjs`: 최근 N일(기본 7) 생성 노트(frontmatter created 기준) 나열 — id·created·origin·gist 출력. (인자 `--days N`)
- `scripts/forget.mjs <id>`: 해당 노트 파일 `.trash/` 로 이동(rm 아님, 복구가능) → 인덱스 재빌드. ADD-only 의 kill 경로.
- `commands/vault-review.md`: `node "${CLAUDE_PLUGIN_ROOT}/scripts/review.mjs"` 실행해 최근 노트 보여주고, 사용자가 지목하면 `forget.mjs <id>` 로 정리하라는 프롬프트.
- `session-start.mjs`: 기존 백필 메시지에 노트 수 한 줄 추가 — `[memory] 노트 N개. /vault-review 로 최근 항목 검토 가능.` (백필 없을 때도 노트 많으면 1줄)

**테스트(`test/forget.test.mjs`):** forget 이 노트를 .trash 로 옮기고 notes 에서 사라짐. review 가 최근 노트만 반환.

- [ ] TDD → 커밋 `"feat: /vault-review + forget(kill 경로) + session-start 노트수"`

---

### Task 8: 전체 검증 + 인덱스 재빌드

- [ ] `node --test` 전체 green
- [ ] 독립 훅 4개 exit 0 재확인
- [ ] `node scripts/build-index.mjs` 로 실제 vault(160노트) 재빌드 — 새 meta 필드(verbatim/content_hash/valid_until/superseded_by/origin) 반영. (실 Ollama)
- [ ] 커밋 `"chore: v1.1 인덱스 재빌드(새 meta 필드)"`

## 범위 밖(계속 미룸)
content-hash 증분 로직 · quarantine · 증류·망각 · sparse+rerank · 클라우드폴백 · 풀 자동 모순탐지. dedup 임계 튜닝·gate 1인칭 필수화는 기각(데이터/한국어 주어생략).
