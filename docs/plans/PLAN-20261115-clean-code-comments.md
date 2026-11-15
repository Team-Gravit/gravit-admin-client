# PLAN-20261115-clean-code-comments: C01: src 불필요한 주석 정리

| 항목 | 내용 |
|---|---|
| 상태 | 커밋됨 |
| 요청 | C1 지침을 승인하고 추가 정리까지 연속 진행하라는 사용자 요청(D19) |
| 범위 밖 | 기능·API·시각·문구·새 의존성·하네스·기존 사용자 변경 |

## 1. 목적
C01: src 불필요한 주석 정리. 반복 설명·구획·과거 기록은 제거하고 왜 필요한지·계약·도구 지시문·라이선스는 보존합니다.

## 2. 읽은 문서
| 문서 | 절 | 제약 |
|---|---|---|
| AGENTS.md | 2~8 | 계획·검증·비밀 값·기존 작업 보존 |
| docs/spec/00_INDEX.md | 전체 | 명세·결정 우선 |
| docs/conventions/decisions.md | 관련 도메인 D항목·D19 | 기존 계약 보존·연속 실행 승인 |
| docs/conventions/architecture.md | 전체 | alias·feature 경계·새 파일 책임 |
| docs/conventions/antipatterns.md | 전체 | any·무검증 단언·무관한 변경 금지 |
| docs/conventions/good-patterns.md | 관련 절 | Query·폼·에러 기존 정책 |
| docs/conventions/api-contract.md | 관련 절 | 요청·응답 계약 보존 |
| docs/conventions/testing.md | 전체 | 역할 기반 테스트·MSW·격리 |
| docs/conventions/clean-code.md | CC-COMMENT-01 | 해당 규칙 적용 |
| docs/spec/04_gravit_admin_frontend_spec.md | §9~10 | 조회·검증·저장 정책 보존 |
| UI 관련인 경우 ui-conventions·DS-01·DS-02 해당 화면·DS-03·01 해당 절 | 해당 범위 | DOM·props·문구·상호작용·토큰 보존 |

## 3. 바뀌는 화면·라우트
기존 9개 정상 화면 before/after, QA 네 상태는 기존 컴포넌트·e2e 검증과 함께 대조

## 4. 코드 변경 (스키마 → API → 훅 → 컴포넌트 → 페이지 → 라우트 순)
src/**/*.ts(x)·src/shared/styles/globals.css — 내용별 주석 판단표에 해당하는 경로만

## 5. API 계약 영향
없음 — endpoint·method·요청 필드·응답·오류 코드를 보존합니다.

## 6. 상태 4종
| 상태 | 조건 | 화면 동작 |
|---|---|---|
| 로딩 | 기존 조회·저장 조건 | 동일 |
| 빈 상태 | 기존 데이터·필터 결과 | 동일 |
| 오류 | 기존 오류·재시도 조건 | 동일 |
| 정상 | 기존 데이터 | 동일 |

## 7. 문구
없음 — 제품 원문·QA copy·서버 메시지 유지.

## 8. 고칠 명세
없음 — 동작 보존 리팩터링이며 계약을 변경하지 않습니다.

## 9. 테스트 계획
TS transpile 출력 동일성·CSS 의미 AST 동일성, 변경 diff, 전체 3명령.

## 10. 확인할 화면 (verify-ui)
기존 9개 정상 화면 before/after, QA 네 상태는 기존 컴포넌트·e2e 검증과 함께 대조

## 11. 결정 필요
없음 — 기존 계약을 변경해야 하는 문제가 발견되면 종속 변경만 분리해 보고합니다.

## Deviation Log
| 날짜 | 계획 | 실제 | 이유 |
|---|---|---|---|
| 2026-11-15 | 배치마다 재확인·B01 뒤 정지 | 계획을 먼저 기록하고 연속 구현·검증 | 사용자의 추가 명시 지시(D19) |

## 검증 결과
| 명령·점검 | 결과 |
|---|---|
| npm run check | check:full에 포함, exit 0 |
| npm run check:full | exit 0; C01-check-full.log |
| npm run test | exit 0; C01-test.log |
| npm run test:e2e | exit 0; C01-test-e2e.log |
| verify-ui 점검표 | 기존 9개 정상 화면 before/after, QA 네 상태는 기존 컴포넌트·e2e 검증과 함께 대조 |

## 자기 점검
- [x] 명세에 없는 엔드포인트·필드·쿼리 없음
- [x] 상태 4종 보존
- [x] 문구 체계 유지
- [x] features 간 직접 import 없음
- [x] 단위·e2e·목 테스트 계획 명시
- [x] 확인할 화면 또는 해당 없음 근거 명시

## 최종 검증 요약

| 점검 | 결과 |
|---|---|
| 배치 최종 명령 | check:full exit 0 · 단위 116개 통과(exit 0) · e2e 139개 통과(exit 0), 실패·skip 0 |
| 최종 통합 재검증(C01) | check:full exit 0 · 단위 116개 · e2e 139개 통과, 실패·skip 0 |
| verify-ui | [전후 캡처·점검표](assets/20261115-clean-code/REVIEW.md), 정상 화면 9쌍 변경 픽셀 0 |
| 주석 | TS/TSX 261개 조사, 49개 파일에서 107개 제거·24개 축약. 변경 TS 실행 출력·CSS 의미 트리 동일 |

커밋 직전 재확인: `npm run check:full` exit 0. 최종 단위·e2e 이후 src/tests 코드 변경 없음.
