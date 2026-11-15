# PLAN-20261115-sync-artifact-hygiene: 동기화 복제본 정리와 커밋 전 검사

| 항목 | 내용 |
|---|---|
| 상태 | 커밋됨 |
| 요청 | 사용자가 C1 문서 승인과 함께 번호 2 복제 파일·디렉터리 정리 및 커밋 전 검사 규칙 추가, C2 연속 진행을 명시 요청했습니다. |
| 범위 밖 | 사용자 기존 inquiry-handoff.md 삭제, .env·하네스 파일·의존성·실서버 변경 |

## 1. 목적
동기화로 생긴 번호 2 경로를 조사해 프로젝트에서 제거하고 check:full에서 재발을 막습니다. 사용자 요청이 배치별 재확인 대신 연속 실행을 승인하므로 계획을 먼저 남기고 구현합니다.

## 2. 읽은 문서
| 문서 | 절 | 제약 |
|---|---|---|
| AGENTS.md | 2·6·7·8 | 기존 작업 보존, 비밀 값·하네스 수정 금지, 명시적 staging |
| docs/spec/00_INDEX.md | 전체 | 계약 우선순위 유지 |
| docs/conventions/decisions.md | D14~18 | main·검증, 기존 시각·동작 보존 |
| docs/conventions/architecture.md | 전체 | 새 스크립트는 scripts/checks에 배치 |
| docs/conventions/antipatterns.md | 전체 | 광범위 삭제·일괄 staging 금지 |
| docs/conventions/testing.md | 전체 | 기존 단위·e2e 유지 |
| docs/conventions/clean-code.md | CC-STRUCT-01·적용 절차 | 기존 코드 동작 보존 |

## 3. 바뀌는 화면·라우트
없음 — 동기화 복제본·도구 검사만 정리합니다.

## 4. 코드 변경 (스키마 → API → 훅 → 컴포넌트 → 페이지 → 라우트 순)
| 파일 | 단위 | 변경 |
|---|---|---|
| 번호 2 경로 731개 | 미추적 파일 | 원본 경로 존재·추적 여부를 기록하고 프로젝트 밖 보관 폴더로 이동합니다. 내용이 다른 복제본도 유실하지 않습니다. 디렉터리도 재귀 조사합니다. |
| scripts/checks/sync-artifacts.mjs | 경로 검사 | .git·node_modules·빌드 결과를 제외하고 파일·디렉터리의 번호 복제 이름을 검사합니다. 내용을 읽거나 자동 삭제하지 않습니다. |
| scripts/checks/sync-artifacts.test.mjs | 검사 테스트 | 파일·디렉터리·제외·정상 이름 경계를 확인합니다. |
| package.json | check:sync, check:full | check:full 첫 단계에서 검사합니다. |
| docs/conventions/clean-code.md | 작업 위생 | 커밋 전 확인·내용 비교·고유 내용 보존 규칙을 추가합니다. |

## 5. API 계약 영향
없음 — 요청·응답·스키마를 변경하지 않습니다.

## 6. 상태 4종
| 상태 | 조건 | 화면 동작 |
|---|---|---|
| 로딩 | 기존 조건 | 동일 |
| 빈 상태 | 기존 조건 | 동일 |
| 오류 | 기존 조건 | 동일 |
| 정상 | 기존 조건 | 동일 |

## 7. 문구
없음 — 제품 문구 변경 없음.

## 8. 고칠 명세
| 파일 | 절 | 내용 |
|---|---|---|
| docs/conventions/clean-code.md | 승인 상태·주석·커밋 전 위생 | 사용자 추가 요청을 규칙으로 반영 |
| docs/conventions/decisions.md | D19 | C2 연속 실행·정리 승인 범위를 기록 |

## 9. 테스트 계획
| 종류 | 파일 | 확인 |
|---|---|---|
| 도구 | scripts/checks/sync-artifacts.test.mjs | 복제 파일·디렉터리 검출과 정상 이름 허용 |
| 단위 | 기존 src 테스트 | 전체 실행 |
| e2e | 기존 tests/e2e | 전체 MSW 실행 |
| 목 | 기존 src/mocks | 내용 변경 없음 |

## 10. 확인할 화면 (verify-ui)
없음 — 실행되는 제품 소스를 변경하지 않습니다.

## 11. 결정 필요
없음 — 삭제 대상은 기록 후 프로젝트 밖 보관으로 복구 가능하게 정리합니다. AGENTS·skills 수정은 현재 세션에서 하지 않고 일반 규칙과 check:full로 강제합니다.

## Deviation Log
| 날짜 | 계획 | 실제 | 이유 |
|---|---|---|---|
| 2026-11-15 | 전체 해시 비교 | 경로 대조 후 외부 보관 | iCloud 미다운로드 PNG를 읽는 작업이 지연되어 불필요한 다운로드 없이 고유 내용도 보존합니다. |

## 검증 결과
| 명령·점검 | 결과 |
|---|---|
| 변경 전 check:full | exit 0, ESLint 오류0·경고6 |
| 변경 전 test | 22파일·78개 통과, exit 0 |
| 변경 전 test:e2e | 133개 통과, exit 0 |
| npm run check | check:full에 포함, exit 0 |
| npm run test | 22파일·78개 통과, exit 0 |
| npm run test:e2e | 133개 통과, exit 0 |
| npm run check:full | exit 0, 검사 후보 0개 |
| verify-ui 점검표 | 해당 없음 |

## 자기 점검
- [x] 명세에 없는 엔드포인트·필드·쿼리 없음
- [x] 상태 4종 보존
- [x] 제품 문구 보존
- [x] features 간 직접 import 없음
- [x] 단위·e2e·목 테스트 계획 명시
- [x] 확인할 화면 해당 없음 사유 명시

## 최종 검증 요약

| 점검 | 결과 |
|---|---|
| 배치 최종 명령 | check:full exit 0 · 단위 78개 통과(exit 0) · e2e 133개 통과(exit 0), 실패·skip 0 |
| 최종 통합 재검증(C01) | check:full exit 0 · 단위 116개 · e2e 139개 통과, 실패·skip 0 |
| UI 영향 | 직접 렌더 변경 없음. 최종 UI 검증 기록 참고 |
| 사본 검사 도구 | node --test scripts/checks/sync-artifacts.test.mjs: 4개 통과, exit 0 · check:sync 후보 0 |

커밋 직전 재확인: `npm run check:full` exit 0. 최종 단위·e2e 이후 src/tests 코드 변경 없음.
