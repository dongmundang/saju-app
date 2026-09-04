// AI 호출 모듈
// 우선순위: ANTHROPIC_API_KEY 있으면 Claude API, 없으면 로컬 Ollama
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.SAJU_MODEL || 'llama3-kr:latest';
const OLLAMA_KEEPALIVE = process.env.OLLAMA_KEEPALIVE || '20s';
// 키에 실수로 공백/따옴표/개행이 붙어도 제거 (배포 환경변수 붙여넣기 실수 대비)
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || '').trim().replace(/^["']|["']$/g, '').trim();
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4000', 10);

const SYSTEM = `당신은 30년 경력의 사주명리 상담가입니다. 손님의 사주 원국과 대운을 깊이 있게 읽고, 따뜻하지만 솔직하게 상담합니다.

원칙:
- 반드시 한국어. 손님에게 직접 이야기하듯 "~하시는 분입니다", "~해보시면 좋겠습니다" 체로 씁니다.
- 제공된 사주 데이터(사주팔자·십신·오행·신강신약·억부용신·신살·12운성·지지 형충회합·대운 흐름·삼재)만 근거로 해석하고, 데이터에 없는 것을 지어내지 않습니다.
- 신강/신약과 억부용신을 해석의 중심축으로 삼습니다. 용신 오행이 들어오는 시기는 유리하게, 꺼리는(기신) 오행이 강해지는 시기는 조심하도록 풀이합니다.
- 누구에게나 들어맞는 뻔한 일반론을 피하고, 이 사주만의 구체적인 특징을 짚습니다. 어떤 글자·어떤 십신·어떤 신살 때문에 그런지 근거를 함께 말합니다.
- 어려운 용어는 처음 한 번 쉬운 말로 풀어주고 사용합니다. (예: "식상 — 표현하고 만들어내는 기운")
- 한자는 되도록 쓰지 않습니다. 꼭 병기해야 하면 아래 제공된 사주 데이터에 그대로 적혀 있는 한자만 그대로 옮겨 씁니다(예: 사주팔자의 "신미(辛未)"). 신살·십신·지지 관계 이름(역마살·화개살·도화살·천을귀인·비견·편관·반합·반회 등)은 한글로만 쓰고, 한자나 "(日主)"·"(年月)" 같은 자리 표시를 임의로 붙이지 않습니다. 데이터에 없는 한자, 확실하지 않은 한자는 절대 쓰지 않습니다.
- 운명을 단정하지 않고 경향·가능성으로 말합니다. 겁주지 않고, 나쁜 부분도 대비하고 활용하는 방향으로 안내합니다.
- 각 항목을 충분히(대개 4~6문장) 풀어서 씁니다. 항목 제목(###)은 지시된 그대로 씁니다.`;

const USING = ANTHROPIC_KEY ? `Claude(${CLAUDE_MODEL})` : `Ollama(${OLLAMA_MODEL})`;

async function generate(prompt) {
  if (ANTHROPIC_KEY) return generateClaude(prompt);
  return generateOllama(prompt);
}

async function generateClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Claude API 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content.map(c => c.text || '').join('').trim();
}

async function generateOllama(prompt) {
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL, prompt, system: SYSTEM, stream: false,
        keep_alive: OLLAMA_KEEPALIVE,
        options: { temperature: 0.7, num_predict: 460, num_ctx: 2048 }
      })
    });
  } catch (e) {
    throw new Error('AI 풀이 기능은 아직 준비 중입니다. (계산 결과는 정상 제공됩니다) — 관리자: ANTHROPIC_API_KEY 설정 필요');
  }
  if (!res.ok) throw new Error(`Ollama 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.response.trim();
}

// ── 주제별 풀이 ──
function buildPrompt(topic, sajuText, extra) {
  const sections = {
    '총운': [
      '### 한눈에 보는 요약\n이 사주의 핵심을 3줄로. (1줄: 타고난 기질 / 2줄: 가장 큰 강점 / 3줄: 지금 시기 한마디)',
      '### 타고난 성격과 기질\n일간(본인)과 월지, 십신 구성으로 본 성격. 겉으로 보이는 모습과 속마음이 어떻게 다른지. 신강/신약이 성격에 주는 색깔. (5~6문장)',
      '### 대인관계와 일하는 방식\n비겁·식상·관성의 배치로 본 사람들과 어울리는 방식. 조직 생활이 맞는지 독립이 맞는지, 앞에 나서는 형인지 뒤에서 받치는 형인지. (4~5문장)',
      '### 타고난 강점과 재능\n이 사주가 가진 무기. 특히 신살(도화·문창귀인·역마·화개·천을귀인 등)이 있으면 그것이 뜻하는 재능과 살릴 방향. (5~6문장)',
      '### 약점과 인생의 과제\n신약/신강의 그늘, 부족하거나 지나친 오행이 만드는 어려움, 삶에서 반복되기 쉬운 패턴. 지지 형충이 있으면 그 영향. (4~5문장)',
      '### 인생의 큰 흐름 (대운)\n제공된 대운 흐름을 보고 어느 시기가 순풍이고 어느 시기가 역풍인지, 지금 대운(현재 표시된 것)의 의미, 다음 대운은 언제 어떻게 바뀌는지, 전성기로 볼 만한 시기. (6~7문장)',
      '### 상담가의 조언\n이 분이 삶에서 붙잡으면 좋은 것을 구체적으로 3가지. 용신 오행을 살리는 방향(잘 맞는 직업 분야, 도움이 되는 색·방향·활동)을 실제로 제시. (3~4문장)'
    ],
    '연애': [
      '### 한눈에 보는 요약\n연애·결혼운의 핵심을 3줄로.',
      '### 연애 성향과 매력\n타고난 연애 스타일, 사랑에 빠지는 방식, 이성에게 어떻게 보이는지. 도화살·홍염 등이 있으면 그 영향. (5~6문장)',
      '### 어떤 인연과 만나기 쉬운가\n남자는 재성(정재·편재), 여자는 관성(정관·편관)으로 본 배우자·애인의 모습과 성향. 배우자궁(일지)의 상태가 뜻하는 것. (5~6문장)',
      '### 결혼운과 시기\n결혼 인연이 오기 쉬운 흐름, 대운·세운에서 배우자 십신이 강해지는 때. (4~5문장)',
      '### 연애에서 반복되기 쉬운 어려움\n이 사주가 관계에서 부딪히기 쉬운 패턴과 그 이유. 일지 형충이 있으면 그 영향. 겁주지 말고 대비하는 쪽으로. (4~5문장)',
      '### 상담가의 조언\n좋은 인연을 만나고 관계를 지키기 위한 구체적 조언 3가지. (3~4문장)'
    ],
    '재물': [
      '### 한눈에 보는 요약\n재물·직업운의 핵심을 3줄로.',
      '### 돈이 들어오고 나가는 방식\n재성(정재·편재)의 유무와 위치로 본 돈 버는 스타일 — 안정적인 월급형인지, 크게 벌고 크게 쓰는 사업형인지, 큰돈과 인연이 있는지. 식상생재(만들어서 파는 구조)가 되는지. (5~6문장)',
      '### 잘 맞는 직업과 일하는 방식\n십신·오행·신살로 본 적성 분야를 구체적으로. 관성이 좋으면 조직·전문직, 식상이 좋으면 창작·기술·영업 등. (5~6문장)',
      '### 재물운의 큰 흐름\n대운·세운에서 재성·식상 운이 들어오는 시기가 재물이 불어나기 좋은 때. 반대로 조심할 시기. (4~5문장)',
      '### 돈 관리에서 조심할 점\n재물이 새기 쉬운 패턴(겁재, 편재 과다 등), 투자·보증·동업에서 주의점. (4~5문장)',
      '### 상담가의 조언\n재물을 모으고 지키기 위한 구체적 조언 3가지. (3~4문장)'
    ],
    '건강': [
      '### 한눈에 보는 요약\n체질과 건강 흐름의 핵심을 3줄로.',
      '### 타고난 체질\n오행 균형으로 본 몸의 강한 곳과 약한 곳. 일간 오행과 신강/신약이 체력·회복력에 주는 영향. (4~5문장)',
      '### 특히 신경 써야 할 부위\n부족하거나 지나친 오행에 해당하는 장기·계통(목=간담·눈·근육, 화=심장·혈압·수면, 토=위장·소화, 금=폐·기관지·피부, 수=신장·방광·뼈), 나타나기 쉬운 증상. (5~6문장)',
      '### 조심할 시기\n대운·세운에서 기신 오행이 강해지거나 지지 충이 걸리는 때 건강에 더 유의. 삼재 기간이 있으면 무리하지 않도록. (3~4문장)',
      '### 생활 습관 제안\n용신 오행을 돕는 방향으로 음식·운동·수면·환경을 구체적으로. (4~5문장)',
      '### 상담가의 조언\n진단이 아닌 참고임을 전제로, 건강을 지키는 큰 원칙 2~3가지. (2~3문장)'
    ]
  };
  let secList = sections[topic] || sections['총운'];
  if (!ANTHROPIC_KEY) {
    // 로컬 폴백: 항목 줄이고 짧게
    secList = secList.slice(1, 4).map(s => s.replace(/\(\d+[~-]\d+문장\)/g, '(2문장)'));
  }
  return `아래는 한 손님의 사주 정보입니다. 명리학 프로그램이 계산한 값이니 그대로 신뢰하고 해석하세요.

${sajuText}${extra ? '\n' + extra : ''}

이 사주로 "${topic}" 상담을 해 주세요. 아래 항목을 순서대로, 각 제목(###)을 그대로 쓰고, 항목마다 지시된 분량으로 충분히 풀어 씁니다.

${secList.join('\n\n')}

마지막에 한 줄 띄우고 "※ 사주는 타고난 흐름을 보는 참고 자료이며, 삶은 선택으로 바꿔갈 수 있습니다."를 그대로 덧붙이세요.`;
}

function buildDailyPrompt(sajuText, iljin) {
  return `아래는 한 손님의 사주와 오늘 날짜의 일진입니다.

[본인 사주]
${sajuText}

[오늘 일진]
날짜: ${iljin.dateStr}
오늘의 간지: ${iljin.ganZhiKo}(${iljin.ganZhiHan}) · 오행 ${iljin.wuXing} · 본인 일간 기준 십신 ${iljin.tenGod}

오늘 하루 운세를 아래 항목으로 상담해 주세요. 각 제목(###)을 그대로 쓰세요.

### 오늘의 기운
오늘 일진의 십신(${iljin.tenGod})과 오행(${iljin.wuXing})이 본인 사주(특히 용신/기신)에 어떻게 작용하는지 쉽게. (3~4문장)

### 오늘 잘 풀리는 일
십신·오행 관점에서 오늘 하기 좋은 일들을 구체적으로. (3~4문장)

### 오늘 조심할 일
미루거나 신중하게 다룰 일. 겁주지 말고. (2~3문장)

### 오늘의 조언
실천 가능한 한두 문장.

마지막에 "※ 재미로 봐주세요." 를 덧붙이세요.`;
}

function buildLuckPrompt(sajuText, luck) {
  return `아래는 한 손님의 사주와 현재 시점의 세운(올해)·월운(이번 달)입니다.

[본인 사주]
${sajuText}

[현재 운]
${luck.year.label}: ${luck.year.ganZhiKo}(${luck.year.ganZhiHan}) · 오행 ${luck.year.wuXing} · 본인 기준 십신 ${luck.year.tenGod}
${luck.month.label}: ${luck.month.ganZhiKo}(${luck.month.ganZhiHan}) · 오행 ${luck.month.wuXing} · 본인 기준 십신 ${luck.month.tenGod}

아래 항목으로 상담해 주세요. 각 제목(###)을 그대로 쓰세요.

### 올해 전체 흐름
세운의 십신·오행이 본인 사주(특히 용신/기신)에 어떻게 작용하는지, 올해의 큰 주제. (5~6문장)

### 이번 달 포인트
월운을 반영해 지금 한 달 신경 쓸 일과 기회. (3~4문장)

### 분야별 전망
재물 / 직장·일 / 인간관계 / 건강 / 애정 — 각 항목 2~3문장씩.

### 올해의 조언
올해를 잘 보내기 위한 구체적 조언 3가지.

마지막에 "※ 사주는 참고 자료입니다." 를 덧붙이세요.`;
}

function buildGunghapPrompt(aText, bText) {
  return `아래 두 사람의 사주로 궁합을 봐 주세요.

[A]
${aText}

[B]
${bText}

아래 항목으로 상담해 주세요. 각 제목(###)을 그대로 쓰세요.

### 한눈에 보는 궁합
두 사람 궁합의 핵심을 3줄로.

### 일간(본인 자리) 관계
두 사람의 일간 오행이 상생인지 상극인지, 그게 관계에서 어떻게 나타나는지. (4~5문장)

### 성격 궁합
두 사람의 십신·신강신약을 비교해 잘 맞는 점과 부딪힐 수 있는 점. (5~6문장)

### 서로에게 주는 영향
한 사람의 용신이 상대에게 어떤 기운인지 등, 서로 도움이 되는 부분과 부담이 되는 부분. (4~5문장)

### 관계를 좋게 만드는 조언
이 두 사람이 오래 잘 지내기 위한 구체적 조언 3가지.

마지막에 "※ 궁합은 참고이고, 관계는 두 사람이 함께 만들어가는 것입니다." 를 덧붙이세요.`;
}

module.exports = { generate, buildPrompt, buildDailyPrompt, buildLuckPrompt, buildGunghapPrompt, MODEL: USING };
