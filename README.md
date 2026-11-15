# 방동훈 Portfolio

**웹을 만들고 영상을 편집합니다.**

바이브 코딩으로 만든 웹 작업과 영상 편집 작업을 한곳에 담은 개인 포트폴리오 웹사이트입니다.
이 사이트 자체도 기획, 디자인, 퍼블리싱을 직접 한 작업물입니다.

- Live: (배포 후 추가)
- 도구: VS Code, Claude, HTML, CSS, JavaScript (프레임워크 없이)

---

## 핵심 아이디어: Web / Video 전환

헤더의 **Web / Video**를 누르면 같은 사이트가 두 모드로 바뀝니다.

| | Web | Video |
| --- | --- | --- |
| 히어로 | 흑백 화면 속 컬러 사진, MAKE WEB | 흑연 그림이 찢어지며 얼굴만 컬러, MAKE VIDEO |
| 작업물 | 웹 작업 4개 | 영상 작업 5개 |
| 사용 툴 | VS Code, Claude, Figma, React 등 | Premiere Pro, After Effects, Cinema 4D 등 |

## 화면 구성

1. **로딩**: "방동훈 Portfolio"가 타자기처럼 쳐지고, 가운데 선이 갈라지며 열림 (스크롤하면 건너뜀)
2. **히어로**: 사진 → MAKE WEB 타자기 효과 → 작업물 세 줄 / 오른쪽에 사용 툴과 Instagram QR
3. **작업물**: 화면에 고정된 채 스크롤하면 작업물이 하나씩 넘어감. [Discover] 자세히 보기, [Web] 사이트·영상, [Process] 기획서 PDF
4. **스킬**: 영상편집 / 디자인 / 바이브 코딩 / 기획·운영. 연필 스케치가 그려지고 마우스를 올리면 색이 칠해짐
5. **소개**: 작업한 프로젝트를 완료일 순서로
6. **한 문장 화면과 연락**: 눈금 칸이 올라와 문장을 보여 준 뒤 연락 칸으로 끝남

## 만들면서 정한 것

- 색은 레퍼런스(Heron)에서 뽑은 미색 배경과 주황 두 가지만 씀
- 움직임은 정해진 곳에만 두고, 모든 섹션에 등장 효과를 넣지 않음
- "동작 줄이기" 설정(prefers-reduced-motion)에서는 움직임을 끔
- 이미지는 WebP, 화면 아래쪽 이미지는 지연 로딩
- 글꼴은 쓰는 글자만 남긴 파일로 줄여서 넣음 (`fonts/subset-*.py`)
- PC 1440px, 모바일 390px 기준으로 확인

자세한 기획과 결정 기록은 [docs/plan.md](docs/plan.md)에 있습니다.

## 파일 구조

```
index.html, style.css, script.js
data/projects.json   작업물 데이터 (웹·영상)
images/              사진, 로고, 작업물 이미지
process/             작업물 기획서 PDF
fonts/               Pretendard, 나눔고딕코딩 (OFL)
docs/plan.md         기획 문서
```

## 글꼴 라이선스

- Pretendard, 나눔고딕코딩: SIL Open Font License 1.1 (`fonts/`의 라이선스 파일 참고)
