# Development Rules

## 1. Project Character

이 프로젝트는 성능도 중요하지만, 첫 목적은 빠른 프로토타입 제작이다.
처음부터 복잡한 구조를 만들지 않고, 작게 만들고 빠르게 확인한다.

## 2. Programming Style

함수형 프로그래밍 스타일을 우선한다.
데이터 분석 로직은 가능한 한 입력값을 받아 결과값을 반환하는 순수 함수로 작성한다.
화면 처리와 데이터 계산 로직은 분리한다.

## 3. External Libraries

외부 라이브러리는 최소화한다.
처음에는 기본 HTML, CSS, JavaScript 중심으로 구현한다.
필요성이 분명한 경우에만 라이브러리 추가를 검토한다.

## 4. Verification

작은 단위로 검증한다.
기능 하나를 만들면 바로 확인하고, 데이터 가공 함수도 샘플 데이터로 작게 검증한다.

## 5. Work Boundary

사용자가 부탁한 작업 외에 임의로 추가 작업을 하지 않는다.
필요한 추가 작업이 생기면 먼저 설명하고 확인을 받은 뒤 진행한다.

## 6. Storage Rules

- planning: 기획 문서와 개발 규칙을 저장한다.
- data/raw: 수정하지 않는 원본 데이터를 저장한다.
- data/processed: 정리되거나 변환된 분석용 데이터를 저장한다.
- data/sample: 프로토타입 검증용 샘플 데이터를 저장한다.
- app: 웹페이지 실행에 필요한 파일을 저장한다.
- app/data: 화면에서 직접 불러오는 데이터만 저장한다.
- validation/checklists: 검증 기준과 체크리스트를 저장한다.
- validation/test_results: 검증 결과를 저장한다.
- archive: 현재 사용하지 않는 이전 자료를 보관한다.
