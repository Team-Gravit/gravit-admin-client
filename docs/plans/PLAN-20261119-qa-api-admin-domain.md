# PLAN-20261119-qa-api-admin-domain: QA API 도메인을 관리자 서버 도메인으로 교체

| 항목 | 내용 |
|---|---|
| 상태 | 커밋됨 |
| 요청 | 사용자가 2026-11-19 서버 측 핸드오프 프롬프트("관리자 웹 · QA API 도메인 교체")를 붙여 요청했습니다. QA API 서버(gravit-qa-server)의 이름이 gravit-admin-server 로 바뀌어 도메인이 `grav-it-qa.inuappcenter.kr` 에서 `grav-it-admin.inuappcenter.kr` 로 바뀌었고, 옛 도메인은 서버 Caddy 에서 지웠습니다. |
| 범위 밖 | `/qa-api` 경로, `VITE_QA_API_BASE`·`VITE_QA_ORIGIN` 이름 변경 · MSW 핸들러, `qaClient`, Zod 스키마, 화면 · 관리자 API(`apiClient`)를 관리자 서버로 돌리는 변경(`/admin-server` rewrite, `apiClient` base, 별도 프롬프트로 올 예정) · `.env*` 읽기·수정 · 서버 이름 표기만 남은 `src/env.ts:8` 주석과 `decisions.md` D9 제목·첫 줄(§4 끝 참고) · 리팩터링, 의존성 추가 |

## 1. 목적
옛 QA 도메인이 서버에서 지워져 지금 운영 QA 메뉴의 모든 요청이 실패합니다. 운영 rewrite 와 로컬 proxy 의 대상만 새 관리자 서버 도메인으로 바꾸면 QA 메뉴가 다시 동작합니다. 경로 접두(`/api/v1`), QA API 13개 계약, 인증(D9-3), 오류 처리는 그대로입니다.

## 2. 읽은 문서
| 문서 | 절 | 이 계획에 주는 제약 |
|---|---|---|
| `AGENTS.md` | 2·3·6·7·8 | 계획서 승인 전 수정 금지, `.env*` 미접근, 파일을 지정해 스테이징, main 커밋, 푸시 전 사용자 확인. 배포는 사람 몫 |
| `docs/spec/00_INDEX.md` | 1·2·4 | D9 는 별도 서비스 계약의 권위. 나중 D 가 앞선 D 를 대체. 명세를 고치려면 계획서 "고칠 명세"에 먼저 적음 |
| `docs/conventions/decisions.md` | D9-3, D9-4 | rewrite 는 SPA catch-all 보다 앞(D8-4 와 같은 규칙). 로컬 proxy 는 `VITE_QA_ORIGIN` 기본값 + `/api/v1`, `changeOrigin`. `VITE_QA_ORIGIN` 은 vite 설정에서만 읽음 |
| `docs/conventions/decisions.md` | D11 "구현·검증" | "rewrite/proxy 변경 금지"는 D11(QA 흐름 v2) 작업 범위를 제한한 문장입니다. 이번 변경은 사용자가 명시해 요청했고, 경로·순서 규칙(D8-4·D9-4)은 그대로 둡니다 |
| `docs/conventions/antipatterns.md` | 흐름·안전 | 계획서 1개 = 변경 1개, 결과를 보기 전 "통과" 선언 금지, 배포 직접 실행 금지, `git add -A` 금지 |

## 3. 바뀌는 화면·라우트
없음 — 라우트와 화면은 그대로입니다. 운영(`/qa-api/*` rewrite)과 로컬(`/qa-api` proxy)에서 요청이 가는 서버 도메인만 바뀝니다.

## 4. 코드 변경 (스키마 → API → 훅 → 컴포넌트 → 페이지 → 라우트 순)
| 파일:줄 | 단위 | 변경 전 → 후 |
|---|---|---|
| `vercel.json:13` | `/qa-api/:path*` rewrite destination | `https://grav-it-qa.inuappcenter.kr/api/v1/:path*` → `https://grav-it-admin.inuappcenter.kr/api/v1/:path*`. rewrite 순서(ravvit → qa → SPA catch-all)는 그대로 |
| `vite.config.ts:27` | `/qa-api` proxy 주석 | `// QA(gravit-qa) 프록시 (decisions D9-4). …` → `// QA 메뉴 → 관리자 서버(gravit-admin-server) 프록시 (decisions D9-4). …` (뒤 문장은 그대로) |
| `vite.config.ts:31` | `/qa-api` proxy 기본 target | `env.VITE_QA_ORIGIN ?? 'https://grav-it-qa.inuappcenter.kr'` → `env.VITE_QA_ORIGIN ?? 'https://grav-it-admin.inuappcenter.kr'` |

`src/` 는 바꾸지 않습니다. `src/env.ts:8` 주석의 `QA(gravit-qa)`, `decisions.md:132-133`(D9 제목과 첫 줄)의 서버 이름도 그대로 둡니다. 프롬프트가 범위를 위 3곳과 D9-4 로 한정했기 때문입니다. 완료 보고에 목록만 적습니다.

## 5. API 계약 영향 (`docs/spec/03_gravit_admin_api_spec.md`, 별도 서비스는 해당 D 항목)
없음 — 메서드, 경로(`/api/v1/…`), 요청, 응답, 상태 코드가 그대로입니다. 바뀌는 것은 서버 도메인뿐입니다.

새 도메인을 확인한 결과(2026-11-19, 읽기 요청만 보냄)는 다음과 같습니다.
| 요청 | 결과 |
|---|---|
| `GET https://grav-it-admin.inuappcenter.kr/actuator/health` | `{"status":"UP"}` |
| `GET https://grav-it-admin.inuappcenter.kr/api/v1/sprints` (토큰 없음) | 401. `/api/v1` 접두가 QA API 로 이어짐 |
| `GET https://grav-it-qa.inuappcenter.kr/actuator/health` | DNS 조회 실패(curl exit 6). 옛 도메인이 제거된 것을 확인 |

## 6. 상태 4종
| 상태 | 조건 | 화면 동작 |
|---|---|---|
| 로딩 | 기존 조건 | 변경 없음 |
| 빈 상태 | 기존 조건 | 변경 없음 |
| 오류 | 기존 조건 | 변경 없음. 지금 운영에서 나는 도메인 실패가 사라짐 |
| 정상 | 기존 조건 | 변경 없음 |

## 7. 문구
없음 — 제품 문구(`src/features/qa/copy.ts` 등)를 바꾸지 않습니다.

## 8. 고칠 명세
| 파일 | 절 | 바꿀 내용 |
|---|---|---|
| `docs/conventions/decisions.md` | D9-4 첫 줄(164) "QA 도메인" | `https://grav-it-qa.inuappcenter.kr` → `https://grav-it-admin.inuappcenter.kr`. 나머지 문장은 그대로 |
| `docs/conventions/decisions.md` | D9-4 둘째 줄(165) "운영" | rewrite 대상 도메인을 새 도메인으로 교체. 나머지 문장은 그대로 |
| `docs/conventions/decisions.md` | D9-4 (165 다음에 한 줄 추가) | `- 도메인 교체(2026-11-19): QA 서버가 관리자 서버(gravit-admin-server)로 이름을 바꿔 도메인을 교체했고, 옛 QA 도메인은 서버 Caddy 에서 제거됐다. 경로 접두·QA API 계약·인증(D9-3)은 그대로다. 위 2026-10-26 확인은 옛 도메인 기준이고, 새 도메인은 2026-11-19 \`/actuator/health\` UP·토큰 없는 \`/api/v1/sprints\` 401 을 확인했다.` |

추가하는 줄에는 옛 도메인 문자열을 쓰지 않습니다. 쓰면 확인 기준("`grav-it-qa` 검색 결과가 지난 기록 문서뿐")에 살아 있는 문서인 `decisions.md` 가 걸립니다. 옛 값은 git 이력에 남습니다.

## 9. 테스트 계획
`src/` 동작이 바뀌지 않으므로 새 테스트 작성(`write-test`)과 화면 전후 캡처(`verify-ui`)는 생략합니다. 바뀌는 것은 운영 rewrite 대상과 로컬 proxy 기본 대상뿐인데, 단위 테스트와 e2e 는 MSW 목으로 돌아서 두 대상에 요청을 보내지 않습니다. 그래서 테스트를 새로 써도 이 변경을 검증할 수 없습니다. 실제 확인은 아래 "사람 확인"으로 합니다.

| 종류 | 파일 | 확인할 동작 |
|---|---|---|
| 단위(Vitest) | 기존 `src/**/*.test.ts(x)` | 바꾼 `vite.config.ts` 로 Vitest 가 그대로 뜨고 기존 테스트가 모두 통과 |
| e2e(Playwright + MSW) | 기존 `tests/e2e/` | 바꾼 `vite.config.ts` 로 dev 서버가 뜨고 기존 e2e 가 모두 통과. 목을 강제하므로 실서버 요청은 없음 |
| 목 핸들러 | `src/mocks/` | 변경 없음 — 범위 밖 |
| 정적 검사 | `npm run check:full` | 타입·ESLint·token-lint·sync 검사·`vite build` 통과 |
| 문자열 검색 | `grep -rn "grav-it-qa" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist .` | 결과가 지난 기록 문서뿐(현재 `docs/plans/` 에는 걸리는 것이 없으므로 이 계획서 말고는 0건 예상) |

사람 확인(에이전트는 실행하지 않음):
| 시점 | 방법 | 기대 결과 |
|---|---|---|
| 로컬 | 목 없이 `npm run dev` → 관리자 로그인 → QA 메뉴 | 스프린트 목록이 뜸 |
| 배포 후 | 운영 관리자 웹 → QA 메뉴 | 스프린트 목록이 뜸(`/qa-api/sprints` 200) |
| 판단 참고 | 목록이 401 로 실패 | 도메인 문제가 아닙니다. 서버의 관리자 판정 대상(메인 서버 환경)과 로그인한 환경이 다른 경우라 서버 쪽에 알립니다 |

## 10. 확인할 화면 (verify-ui)
없음 — 화면·컴포넌트를 바꾸지 않고, 목 모드 화면은 이번 변경과 무관합니다. 실서버 확인은 §9 "사람 확인"으로 합니다.

## 11. 결정 필요
없음 — 아래 기본 선택으로 진행합니다. 다르게 원하시면 승인할 때 알려 주세요.
| # | 기본 선택 |
|---|---|
| 1 | `src/env.ts:8`·`decisions.md:132-133` 의 서버 이름 `gravit-qa` 는 범위 밖이라 그대로 둡니다 |
| 2 | D9-4 에 추가하는 줄에는 옛 도메인 문자열을 쓰지 않습니다(§8 끝) |
| 3 | 이 계획서 §4·§8 에는 바꾸기 전 값으로 옛 도메인이 남습니다. 지난 기록 문서로 분류합니다 |

## Deviation Log
구현 중 계획과 달라진 점. 계획 자체가 틀렸거나 새 결정이 필요하면 여기 적지 말고 멈춰 질문합니다.
| 날짜 | 계획 | 실제 | 이유 |
|---|---|---|---|
| 2026-11-19 | 검증 명령을 그대로 실행 | 실행 전에 `npm ci`(잠금 파일 그대로, `package.json`·잠금 파일 변경 없음) | `node_modules` 가 없어 `tsc` 를 찾지 못했습니다(check:full exit 127) |
| 2026-11-19 | `npm run test:e2e` 를 그대로 실행 | `vite.config.ts` 의 Vitest 더미 env(`VITE_API_HOST=http://localhost:5999`·`VITE_OAUTH_DEST=test`·`VITE_RAVVIT_API_BASE=/ravvit-api`·`VITE_QA_API_BASE=/qa-api`, 비밀 값 아님)를 프로세스 환경으로만 주고 다시 실행 | 작업 폴더에 `.env*` 파일이 없어 `src/env.ts` 검증이 실패했고 앱이 부팅하지 않았습니다(그대로 실행하면 6개 통과·133개 실패). `.env*` 는 읽거나 만들지 않았습니다 |

## 검증 결과
| 명령·점검 | 결과 |
|---|---|
| `npm run check` | `check:full` 에 포함해 실행 — exit 0, ESLint 오류 0·경고 4(이번에 안 건드린 파일의 기존 경고), token-lint OK |
| `npm run test` | 31파일·116개 통과, exit 0 |
| `npm run test:e2e` | 더미 env 로 139개 통과, exit 0(1.2분). env 없이 실행하면 6개 통과·133개 실패 — Deviation Log 참고 |
| `npm run check:full` | exit 0 — sync 후보 0, typecheck·lint·token-lint 통과, `vite build` 성공 |
| `grav-it-qa` 검색 | 이 계획서의 "바꾸기 전 값" 기록만 걸림. `vercel.json`·`vite.config.ts`·`decisions.md` 에는 0건 |
| verify-ui 점검표 | 해당 없음 — §10 |

## 자기 점검
- [x] 명세에 없는 엔드포인트·필드·쿼리 없음 — 도메인만 교체
- [x] 상태 4종 각각 화면 동작이 적혀 있음 — 모두 변경 없음
- [x] 문구가 기존 문구 체계와 맞음 — 제품 문구 변경 없음
- [x] `features` 간 직접 import 없이 구현 가능 — `src/` 변경 없음
- [x] 테스트 계획에 단위·e2e 와 목 핸들러 변경이 있음 — 기존 단위·e2e 재실행, 목 변경 없음, 새 테스트를 생략하는 이유 기록
- [x] 확인할 화면 목록이 있음 — 해당 없음 사유와 사람 확인 방법 기록
