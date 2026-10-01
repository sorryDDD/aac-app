# AAC 사용 기록 구현 및 로컬 검증

검증일: 2026-10-01. 브라우저: Mac Chrome 154.0.8037.59.
판정: Chrome 로컬 검증 통과. Safari와 실제 iPad는 미검증이다.
배포 및 커밋은 수행하지 않았다.

## 사용 방법

1. 보드 편집 화면에서 **기록 시작**을 누른다.
2. **프레젠테이션** 화면에서 AAC 버튼을 사용한다.
3. 편집 화면으로 돌아와 **기록 종료**를 누른다.
4. 전체 기록 또는 특정 기록 묶음을 선택한다.
5. **CSV 준비**를 누른 뒤 **CSV 저장**을 눌러 파일로 보관한다.

기록 대상은 기록 중인 프레젠테이션 화면의 버튼 누름이다.
편집 화면의 시험 재생은 기록하지 않는다.
기록은 누른 사람, 의사소통 의도, 음성 재생 완료를 판정하지 않는다.
시각은 기기 시계를 따르며 UTC, 당시 시간대의 시각, 밀리초 값을 CSV에 보존한다.
CSV를 내보내도 저장된 기록은 유지된다.
앱을 다시 열면 기록은 꺼져 있으며 이전 기록은 내보낼 수 있다.
갑작스러운 종료로 종료 시각이 저장되지 않은 묶음은 목록에 표시한다.

## 자료 보존 설계

- 기존 `aac-board-studio` DB와 기록용 `aac-board-usage` DB를 분리했다.
- 기존 DB 코드, 버튼·보드 타입, 음성 재생 서비스, manifest, 의존성 파일은 변경하지 않았다.
- 기록에는 ID, 당시 이름과 시각만 저장하며 사진·녹음은 복제하지 않는다.
- 기록 종료 시 이미 접수한 쓰기를 기다린 뒤 종료 시각을 저장한다.
- 기록 저장 실패를 표시하며 음성 재생을 DB 저장 완료 뒤로 미루지 않는다.
- CSV 내보내기는 기록용 DB의 읽기 작업이다. 자동 삭제나 서버 전송은 없다.
- CSV 문자열의 수식 해석 방지를 위한 작은따옴표는 내보낼 때만 붙인다. DB에 저장된 원래 이름은 그대로 남는다.

기존 DB 버전 1에서 2로 전환할 때의 `button_empty_dummy` 정리 코드는 그대로다.
버전 1 보존 시험은 이 예약 ID를 포함하지 않는 일반 버튼으로 수행했다.

별도 DB도 같은 사이트의 저장 공간과 삭제 정책을 공유한다.
이 기능은 기존 사진·녹음·보드 전체를 백업하는 기능이 아니다.
저장 중 앱이 강제로 종료되는 상황까지 모든 기록의 저장을 보장하지 않는다.

## 검증 결과

- `npm run build`: 타입 검사와 프로덕션 빌드 통과. 기존에도 있었던 큰 번들 경고는 남아 있다.
- DB 버전 1·2: 버튼·보드 필드와 사진·녹음의 크기·MIME·SHA-256 동일.
- 기록 꺼짐, 편집 중 재생, 종료 후 누름: 새 기록 없음.
- 빠른 반복 누름 50회: 50건 저장, 고유 ID와 순서 유지.
- 저장 공간 오류를 가상으로 발생시킨 시험: 이전 기록 유지, 실패 표시, 재생 함수 호출 유지.
- 종료 직전 누름 12회: 이미 접수한 기록을 모두 저장한 후 종료.
- CSV: 건수·순서·밀리초 시각·시간대 일치, 한글·쉼표·따옴표·줄바꿈 보존.
- 특정 묶음 조회, 새 DB 연결, 내보내기 이후: 저장된 기록 유지.
- 실제 앱 화면: 기록 시작·종료 및 특정 묶음 2건의 CSV 파일 저장 확인.
- 네트워크 요청 실패를 재현한 상태: 캐시로 앱 재실행, AAC 자료 표시, 2건 기록 및 CSV 파일 다운로드 확인.
- 원본 PWA의 서비스 워커 v3에서 v4로 교체하는 과정 확인.
- `git diff --check`: 통과.

자동 시험의 음성 재생 호출은 가상 함수로 대체하여 기록 오류와의 분리를 검사했다.
저장 공간 오류도 IndexedDB 쓰기 훅에서 발생시킨 가상 오류다.
실제 iPad의 저장 공간 압박·터치·홈 화면 PWA·파일 앱 동작은 확인하지 않았다.

## 서비스 워커 변경

새 HTML에 필요한 JS·CSS까지 확보한 다음 그 HTML을 오프라인 화면으로 보관한다.
기존 워커가 첫 업데이트 요청을 처리하더라도 새 워커가 필요한 실행 파일을 확보한다.
화면 이동 시에도 실행 파일과 짝이 맞는 HTML을 갱신한다.
이 앱의 캐시 이름으로 시작하는 캐시만 정리하며 IndexedDB는 지우지 않는다.

## 검증 재현

`browser_validation.tsx`와 `validation.html`은 로컬 시험용이다.
프로덕션 빌드와 배포 산출물에는 포함되지 않는다.
새로운 임시 localhost 포트에서만 가상 자료를 생성한다.
이미 자료용 DB가 있으면 생성 시험은 중단하며, 기존 DB를 삭제하지 않는다.

프로젝트 루트에서 다음과 같이 검증 자산을 준비한다.

```sh
mkdir -p /private/tmp/aac-usage-validation/checks
cp tests/validation.html /private/tmp/aac-usage-validation/checks/index.html
node_modules/.bin/esbuild tests/browser_validation.tsx --bundle --format=iife \
  --jsx=automatic --outfile=/private/tmp/aac-usage-validation/checks/validation.js
node_modules/.bin/esbuild src/services/usage.ts --bundle --platform=node \
  --format=esm --outfile=/private/tmp/aac-usage-validation/usage_node.mjs
node tests/csv_validation.mjs /private/tmp/aac-usage-validation/usage_node.mjs
npm run build
```

기존 빌드와 새 빌드를 준비한 뒤 서버를 실행한다.
`--baseline`은 수정 전 `dist` 폴더를 지정한다.
이번 작업의 수정 전 빌드는 `/private/tmp/aac-usage-work/baseline-dist`에 보존했다.
이미 검증한 포트 대신 새 포트를 사용한다.

```sh
python3 tests/serve_validation.py \
  --baseline /private/tmp/aac-usage-work/baseline-dist \
  --current ./dist \
  --checks /private/tmp/aac-usage-validation/checks \
  --port 49180
```

브라우저에서 `http://127.0.0.1:49180/checks/`를 연다.
버전 1 또는 2의 가상 자료를 생성하고 원본 앱을 연다.
서버가 표시한 `mode` 파일의 내용을 `current`로 바꾸고 앱을 새로고침한다.
검증 페이지에서 자동 검증을 실행하여 `COMPLETE`를 확인한다.
버전 1에서 새 코드로 직접 전환하는 검사는 별도 포트와 `--initial-mode current`를 쓴다.

서비스 워커의 업데이트 확인을 누르고 온라인 앱을 연 뒤,
`mode` 파일을 `offline`으로 바꾸면 앱 파일의 네트워크 요청 실패를 재현한다.
검사 후에는 `current`로 되돌린다.
이는 Mac의 네트워크 설정을 바꾸는 시험이 아니다.

검증 로그와 화면은 `artifacts/`에 보존한다. 모두 가상 자료이다.
