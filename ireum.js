// 이름 오행 풀이 - 한글 발음오행(소리오행)
// 초성 오행: ㄱㄲㅋ=목, ㄴㄷㄸㄹㅌ=화, ㅇㅎ=토, ㅅㅆㅈㅉㅊ=금, ㅁㅂㅃㅍ=수

const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO_WX = {
  'ㄱ': '목', 'ㄲ': '목', 'ㅋ': '목',
  'ㄴ': '화', 'ㄷ': '화', 'ㄸ': '화', 'ㄹ': '화', 'ㅌ': '화',
  'ㅇ': '토', 'ㅎ': '토',
  'ㅅ': '금', 'ㅆ': '금', 'ㅈ': '금', 'ㅉ': '금', 'ㅊ': '금',
  'ㅁ': '수', 'ㅂ': '수', 'ㅃ': '수', 'ㅍ': '수'
};
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // A생B
const KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };   // A극B

function syllableChoseong(ch) {
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  return CHOSEONG[Math.floor(code / 588)];
}

function relation(a, b) {
  if (a === b) return { type: '비화', good: true, desc: '같은 기운' };
  if (SHENG[a] === b) return { type: '상생', good: true, desc: `${a}이(가) ${b}을(를) 살림` };
  if (SHENG[b] === a) return { type: '상생', good: true, desc: `${b}이(가) ${a}을(를) 살림` };
  if (KE[a] === b || KE[b] === a) return { type: '상극', good: false, desc: `${a}과(와) ${b}이(가) 부딪힘` };
  return { type: '무관', good: true, desc: '' };
}

/**
 * @param {string} fullName  성+이름 (예: "김민수")
 * @param {object} saju      calcSaju 결과 (strength, wuXing 사용)
 */
function analyzeName(fullName, saju) {
  const chars = [...(fullName || '').replace(/\s/g, '')];
  const syl = chars.map(c => {
    const cho = syllableChoseong(c);
    return { ch: c, cho, wx: cho ? CHO_WX[cho] : null };
  }).filter(s => s.wx);

  if (syl.length < 2) return { ok: false, error: '한글 이름을 2글자 이상 입력해 주세요.' };

  // 발음오행 흐름 (연속 음절 관계)
  const flow = [];
  for (let i = 0; i < syl.length - 1; i++) {
    flow.push(Object.assign({ from: syl[i].ch, to: syl[i + 1].ch, fromWx: syl[i].wx, toWx: syl[i + 1].wx }, relation(syl[i].wx, syl[i + 1].wx)));
  }
  const clashCount = flow.filter(f => f.type === '상극').length;

  // 오행 분포
  const dist = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  syl.forEach(s => dist[s.wx]++);
  const nameEls = new Set(syl.map(s => s.wx));

  // 사주와의 궁합
  const need = new Set(
    (saju.strength && saju.strength.yongsin && saju.strength.yongsin.length)
      ? saju.strength.yongsin
      : (saju.wuXing.lacking || [])
  );
  const avoid = new Set(
    (saju.strength && saju.strength.gisin && saju.strength.gisin.length)
      ? saju.strength.gisin
      : (saju.wuXing.strong || [])
  );
  const supplies = [...need].filter(w => nameEls.has(w));   // 이름이 채워주는 것
  const missing = [...need].filter(w => !nameEls.has(w));   // 필요한데 이름에 없는 것
  const piles = [...avoid].filter(w => nameEls.has(w));     // 이름이 과하게 보태는 것

  // 점수
  let score = 60;
  score += supplies.length * 12;
  score -= piles.length * 10;
  score -= clashCount * 12;
  score = Math.max(5, Math.min(98, score));

  let verdict = '무난';
  if (score >= 80) verdict = '사주와 잘 맞음';
  else if (score >= 62) verdict = '무난한 편';
  else if (score >= 45) verdict = '아쉬운 부분 있음';
  else verdict = '보완을 고려할 만함';

  return {
    ok: true,
    name: fullName,
    syllables: syl.map(s => ({ ch: s.ch, cho: s.cho, wx: s.wx })),
    dist,
    flow,
    clashCount,
    supplies, missing, piles,
    need: [...need], avoid: [...avoid],
    score, verdict
  };
}

function buildIreumPrompt(a) {
  const flowStr = a.flow.map(f => `${f.from}(${f.fromWx})→${f.to}(${f.toWx}): ${f.type}`).join(', ');
  return `이름 "${a.name}"의 발음오행 분석입니다.

- 글자별 오행: ${a.syllables.map(s => `${s.ch}=${s.wx}`).join(', ')}
- 발음오행 흐름: ${flowStr}
- 사주에 필요한 오행: ${a.need.join(', ') || '뚜렷하지 않음'}
- 이름이 채워주는 오행: ${a.supplies.join(', ') || '없음'}
- 필요한데 이름에 없는 오행: ${a.missing.join(', ') || '없음'}
- 이름이 과하게 보태는 오행: ${a.piles.join(', ') || '없음'}
- 종합 판정: ${a.verdict} (${a.score}점)

아래로 답하세요.

### 이 이름의 소리 기운
글자별 발음오행과 글자끼리의 흐름(상생이면 기운이 이어지고, 상극이면 부딪힘)을 쉬운 말로 풀이. 이름을 불렀을 때 느껴지는 전체적인 기운. (4~5문장)

### 사주와의 궁합
이 이름이 사주에 필요한 오행(${a.need.join(', ') || '뚜렷하지 않음'})을 채워주는지, 아니면 이미 강한 기운을 더 보태는지. 그것이 삶에 어떻게 작용할 수 있는지. (4~5문장)

### 개명을 꼭 해야 할까
"필수는 아님 / 고려해볼 만함 / 지금 이름도 괜찮음" 중 하나로 분명히 방향을 제시하고 이유. 개명이 만능이 아니라는 점, 이름은 여러 요소 중 하나라는 점도 함께. (3~4문장)

### 새 이름을 짓는다면
필요한 오행(${a.need.join(', ') || '-'})에 해당하는 소리(자음: 목=ㄱㅋ, 화=ㄴㄷㄹㅌ, 토=ㅇㅎ, 금=ㅅㅈㅊ, 수=ㅁㅂㅍ)를 어디에 넣으면 좋을지, 발음오행이 상생으로 흐르게 하려면 어떤 배열이 좋을지 구체적으로. 다만 특정 이름을 콕 집어 추천하지는 말 것. (3~4문장)

규칙: 위 정보와 발음오행만 근거로, 한자 뜻(자원오행)이나 획수(수리)는 별도로 봐야 한다는 점을 언급, 한국어.
마지막에 "※ 발음오행 기준의 참고 풀이입니다. 정식 작명은 한자 뜻·획수까지 함께 봅니다." 를 덧붙이세요.`;
}

module.exports = { analyzeName, buildIreumPrompt, CHO_WX };
