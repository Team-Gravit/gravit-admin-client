# C2 UI 검증 기록 — 2026-11-15

| 항목 | 결과 |
|---|---|
| 환경 | VITE_USE_MOCK=true, 127.0.0.1:47173, agent-browser 전용 세션, 1440×900 |
| 정상 화면 | 정상 후 캡처 9개를 직접 열어 확인했으며 전후 9쌍의 PNG 디코딩 후 비교한 변경 픽셀이 모두 0개 |
| 추가 확인 | 객관식·주관식·공지 편집, QA 빈 상태·503 오류 캡처도 직접 확인 |
| 상태·행동 | ChecklistPanel 네 상태 단위 테스트, QA 필터·다음 이동·접힘·FAIL 사유·이력·잠금, staging 부분 실패·정답 pair·hidden 입력 보존 e2e 통과 |
| staging DOM | 두 폼의 최상위 JSX return을 HEAD와 TypeScript printer로 비교: 동일 |
| 모션 | 관련 실행 코드·CSS 의미 트리 변경 없음. review-animations 호출 조건에 해당하지 않음 |
| 스타일 | 색·간격·모션·문구·토큰 변경 없음. 정상 캡처 9쌍으로 시각 변화 없음 확인 |

| 화면 | 전 | 후 | 변경 픽셀 |
|---|---|---|---|
| inquiries | [전](before-inquiries.png) | [후](after-inquiries.png) | 0 |
| notice | [전](before-notice.png) | [후](after-notice.png) | 0 |
| qa-checklist | [전](before-qa-checklist.png) | [후](after-qa-checklist.png) | 0 |
| qa-design | [전](before-qa-design.png) | [후](after-qa-design.png) | 0 |
| reports | [전](before-reports.png) | [후](after-reports.png) | 0 |
| staging-detail | [전](before-staging-detail.png) | [후](after-staging-detail.png) | 0 |
| staging-list | [전](before-staging-list.png) | [후](after-staging-list.png) | 0 |
| user-detail | [전](before-user-detail.png) | [후](after-user-detail.png) | 0 |
| users | [전](before-users.png) | [후](after-users.png) | 0 |

| 추가 상태 | 캡처 | 확인 |
|---|---|---|
| staging 객관식 | [후](after-staging-objective.png) | 보기 4개·선택 정답·원문·편집 패널 |
| staging 주관식 | [후](after-staging-subjective.png) | 단일 콤마 정답·원문 해설 |
| 공지 편집 | [후](after-notice-edit.png) | 제목·요약·본문·상태·고정 |
| QA 빈 상태 | [후](after-qa-empty.png) | 빈 안내·비활성 이동·대상 없음 게이지 |
| QA 503 | [후](after-qa-error.png) | 기존 QA 문구·수동 재시도 |

## Web Interface Guidelines 점검

2026-11-15 [원문](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)을 새로 읽고 아래 파일을 검토했습니다. 기존 동작·시각을 바꾸는 권고는 이번 리팩터링에 섞지 않았습니다.

| 파일:줄 | 지적 / 확인 | 처리 |
|---|---|---|
| src/features/qa/components/ChecklistFeatureSection.tsx:31 | section·table·열 순서·접힘 aria·버튼을 보존 | 신규 지적 없음 |
| src/features/qa/components/ChecklistItemRow.tsx:29 | 아이콘 액션 접근 이름·키보드 버튼·기존 ref 경로 보존 | 신규 지적 없음 |
| src/features/qa/components/DesignVerdictMenu.tsx:49 | Radix 메뉴·키보드 포커스·busy·접근 이름·외부 클릭 조건 보존 | 신규 지적 없음 |
| src/features/qa/components/ChecklistPanel.tsx:64 | 로딩·오류·빈 상태 우선순위 유지 | 네 상태 테스트로 확인 |
| src/features/notices/components/NoticeEditForm.tsx:107 | 상태 SelectTrigger와 label의 명시적 연결이 없음 | 기존 항목. 접근성 후속 변경 제안으로 보존 |
| src/features/staging/components/StagingObjectiveForm.tsx:153 | 보기 내용·해설 입력의 명시적 접근 이름이 없음 | 기존 항목. 후속 접근성 변경에서 다룸 |
| src/features/notices/components/NoticeEditForm.tsx:81 | 비인증 입력에 autoComplete 정책이 명시되지 않음 | 기존 항목. 입력 UX 정책 결정 없이 변경하지 않음 |
| src/features/staging/components/StagingSubjectiveForm.tsx:128 | placeholder 말줄임표 권고와 기존 문구 차이 | 기존 제품 문구 유지 |
| src/features/staging/components/StagingObjectiveForm.tsx:181 | dirty가 없으면 저장 비활성인 기존 정책 | 기존 명세 우선, 권고를 그대로 적용하지 않음 |
| src/pages/users/UserListPage.tsx·reports/ReportListPage.tsx·inquiries/InquiryListPage.tsx·staging/StagingListPage.tsx | 기존 Select·조회·페이지 초기화·문구 유지 | 입력 경계만 검증, URL 상태 정책은 확장하지 않음 |
| src/pages/users/UserDetailPage.tsx | 기존 권한/상태 확인 모달·선택값 유지 | 입력 경계만 검증 |

원본 폼 JSX와 속성은 유지했습니다. 이 표는 접근성 전체 감사를 완료했다는 의미가 아닙니다.
