# vault-downyu — Claude Code 개인 장기 메모리 플러그인

Claude Code 세션의 결정·교훈·선호를 자동으로 캡처하고, 새 작업 시작 시 유사한 과거 경험을 자동 인출해 주입하는 로컬 메모리 플러그인입니다. Ollama(로컬 LLM)만으로 동작하며, 외부 API·클라우드 의존성이 없습니다.

---

## 요구사항

- **Node.js 18+** (ESM, global fetch 필요)
- **Ollama** — [ollama.ai](https://ollama.ai) 설치 후:
  ```bash
  ollama pull bge-m3        # 임베딩 모델
  ollama pull qwen2.5:7b    # 추출 모델
  ```
- **Git** — vault 디렉터리 자동 커밋에 사용(선택, 없어도 동작)

---

## 설치

### 1. Vault 디렉터리 준비

```bash
mkdir -p ~/vault-downyu/notes
```

기존 `~/vault-downyu/` 가 있으면 그대로 사용합니다(노트 포맷 호환).

### 2. 플러그인 설치

Claude Code에서:
```
/plugin install <이 repo URL 또는 로컬 경로>
```

또는 로컬 경로로 직접 테스트:
```bash
# settings.json 의 plugins 항목에 추가
```

### 3. 초기 인덱스 빌드 (기존 노트가 있으면)

```
/vault-reindex
```

---

## 커스텀 환경변수 (선택)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `VAULT_DOWNYU_VAULT` | `~/vault-downyu` | vault 루트 경로 |
| `VAULT_DOWNYU_OLLAMA_URL` | `http://localhost:11434` | Ollama 서버 URL |
| `VAULT_DOWNYU_EMBED_MODEL` | `bge-m3` | 임베딩 모델 |
| `VAULT_DOWNYU_EXTRACT_MODEL` | `qwen2.5:7b` | 추출 모델 |
| `VAULT_DOWNYU_TOP_K` | `3` | 인출 결과 수 |

---

## 동작 방식

### 자동 인출 (UserPromptSubmit)

사용자가 프롬프트를 입력할 때마다:
1. 프롬프트를 `bge-m3`로 임베딩
2. vault 벡터 인덱스에서 코사인 유사도 top-3 검색
3. 현재 프로젝트와 다른 scope의 결과는 점수 50% 강등
4. 유사 과거 경험을 프롬프트 컨텍스트로 자동 주입

### 자동 캡처 (Stop 훅)

Claude가 응답을 완료할 때마다:
1. 마지막 사용자 발화를 키워드 게이트로 평가 (결정·선호·교훈 신호)
2. 점수 미달(단순 지시·잡담)이면 스킵
3. secret 스캔 후 필요 시 redact
4. 후보 파일에 append (LLM 호출 없음, 빠름)

### 자동 정제 (SessionEnd 훅)

세션 종료 시:
1. 누적 후보를 `qwen2.5:7b`로 일괄 추출
2. 기존 노트와 코사인 > 0.9 의미중복 dedup
3. vault/notes/ 에 마크다운 노트 저장
4. 벡터 인덱스 전체 재빌드
5. vault git 자동 커밋

### SessionStart 백필

이전 세션이 비정상 종료(크래시)된 경우 미처리 후보를 자동 정제합니다.

---

## 슬래시 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/vault-reindex` | 인덱스 전체 재빌드 (노트 추가/수정 후) |
| `/vault-recall <검색어>` | 특정 주제로 과거 메모리 온디맨드 검색 |

---

## 끄기 (일시 비활성)

Claude Code 설정에서 플러그인을 비활성화하면 됩니다. vault 데이터는 보존됩니다.

훅만 임시로 끄려면 환경변수를 이용하거나 `plugin.json`의 해당 훅 항목을 주석처리합니다.

---

## 프라이버시

- 모든 처리가 **로컬**에서 이루어집니다 (Ollama 기반).
- 노트는 `~/vault-downyu/` 에 저장되며, 이 디렉터리를 private repo로 관리하길 권장합니다.
- secret 스캔이 활성화되어 있어, API 키·주민번호·JWT 등이 감지되면 자동으로 redact 후 저장합니다.
- 캡처된 후보 파일(`~/.vault-downyu/.derived/candidates.jsonl`)은 권한 600(소유자만 읽기)으로 생성됩니다.

---

## 트러블슈팅

### Ollama가 꺼져있을 때

- **인출**: `[memory: DEGRADED — embedder down]` 메시지가 컨텍스트에 표시됩니다. 세션은 정상 진행됩니다.
- **캡처**: LLM을 사용하지 않으므로 정상 동작합니다. 후보는 정상 저장됩니다.
- **정제(SessionEnd)**: 추출에 실패하면 후보가 보존됩니다. 다음 SessionStart 시 재시도합니다.

### 인덱스가 없거나 손상된 경우

```
/vault-reindex
```

### 노트 포맷

```markdown
---
id: auto-1234567890-abc123
created: 2026-06-27T09:00:00.000Z
origin: user-originated
scope:
  project: my-project
tags: ["decision", "payment"]
type: decision
source_session: session-id
source: auto-capture
---

## verbatim
> 원문 발췌

## gist
결제 게이트웨이로 헥토파이낸셜을 사용하기로 결정.
```

---

## 아키텍처

```
UserPromptSubmit → hooks/inject.mjs → lib/retrieve.mjs → 벡터 검색 → 컨텍스트 주입
Stop             → hooks/capture.mjs → 게이트 평가 → 후보 적재 (LLM 0)
SessionEnd       → hooks/consolidate.mjs → qwen2.5 추출 → dedup → 노트 저장 → 재빌드
SessionStart     → hooks/session-start.mjs → 미처리 후보 백필
```

---

## 라이선스

MIT
