# 동문당 (東門堂)

사주 풀이 · 주역 동전점 웹앱.

## 로컬 실행
```
npm install
npm start        # http://localhost:3000
```
AI 풀이는 로컬 Ollama(`llama3-kr`) 또는 Claude API를 사용합니다.

## 환경변수
| 변수 | 설명 |
|---|---|
| `PORT` | 서버 포트 (기본 3000) |
| `ANTHROPIC_API_KEY` | 있으면 Claude API 사용, 없으면 로컬 Ollama |
| `CLAUDE_MODEL` | 기본 `claude-haiku-4-5-20251001` |
| `SAJU_MODEL` | Ollama 모델명 (기본 `llama3-kr:latest`) |
| `OLLAMA_URL` | 기본 `http://localhost:11434` |

## 배포 (Render)
- Build Command: `npm install`
- Start Command: `npm start`
- 환경변수에 `ANTHROPIC_API_KEY` 추가하면 AI 풀이 활성화

## 기능
- 만세력·신강신약·억부용신·신살·12운성·형충회합·삼재·대운 흐름 (계산, 즉시)
- AI 풀이: 총운/연애/재물/건강, 오늘·올해 운세, 시기분석, 택일, 이사방위, 이름오행, 가족운, 궁합
- 주역 64괘 동전점
- 종합 리포트 + PDF

자세한 내용은 `실행방법.md` 참고.
