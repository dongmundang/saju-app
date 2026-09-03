// 택일(擇日) - 다가오는 좋은 날 찾기
const { Solar } = require('lunar-javascript');

const GAN_KO = { '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계' };
const ZHI_KO = { '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해' };
const GAN_WX = { '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토', '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수' };
const GAN_YY = { '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양', '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음' };
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const CHUNG = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };

function tenGod(dayGan, other) {
  const d = GAN_WX[dayGan], o = GAN_WX[other];
  const same = GAN_YY[dayGan] === GAN_YY[other];
  if (d === o) return same ? '비견' : '겁재';
  if (SHENG[d] === o) return same ? '식신' : '상관';
  if (KE[d] === o) return same ? '편재' : '정재';
  if (KE[o] === d) return same ? '편관' : '정관';
  if (SHENG[o] === d) return same ? '편인' : '정인';
  return '-';
}

// 황도흑도 12신 (월지 기준 청룡 시작 → 일지)
const SIN12 = ['청룡', '명당', '천형', '주작', '금궤', '천덕', '백호', '옥당', '천뢰', '현무', '사명', '구진'];
const HWANGDO = new Set(['청룡', '명당', '금궤', '천덕', '옥당', '사명']);
function hwangHeukDo(monthZhi, dayZhi) {
  const mIdx = ZHI_ORDER.indexOf(monthZhi);   // 寅=2 ...
  const base = ZHI_ORDER.indexOf(monthZhi);
  // 청룡 지지 index = ((월지index - 寅index) * 2) mod 12, 단 子부터 세는 방식
  const startFromIn = (base - 2 + 12) % 12;
  const cheongryongZhi = (startFromIn * 2) % 12;
  const off = (ZHI_ORDER.indexOf(dayZhi) - cheongryongZhi + 12) % 12;
  const sin = SIN12[off];
  return { sin, good: HWANGDO.has(sin) };
}

// 이벤트별 유리한 십신
const EVENT_GOOD = {
  '결혼': ['정관', '정재', '정인', '식신', '천을귀인'],
  '이사': ['정인', '식신', '편인', '비견'],
  '개업': ['정재', '편재', '식신', '상관'],
  '계약': ['정관', '정재', '정인'],
  '여행': ['식신', '상관', '역마'],
  '기타': ['정관', '정재', '정인', '식신']
};

function findGoodDays(dayGanHan, dayZhiHan, eventType, fromDate, days = 45) {
  const start = fromDate || new Date();
  const goodShin = EVENT_GOOD[eventType] || EVENT_GOOD['기타'];
  const results = [];

  for (let d = 1; d <= days; d++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
    const solar = Solar.fromYmdHms(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), 12, 0, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    const dGz = lunar.getDayInGanZhi();
    const dGan = dGz[0], dZhi = dGz[1];
    const monthZhi = ec.getMonthZhi();

    let score = 0;
    const notes = [];

    // 본명 일지와 충 → 제외
    if (CHUNG[dayZhiHan] === dZhi) { continue; }

    // 황도길일
    const hd = hwangHeukDo(monthZhi, dZhi);
    if (hd.good) { score += 3; notes.push(`황도길일(${hd.sin})`); }
    else if (['백호', '주작', '천뢰', '현무', '천형', '구진'].includes(hd.sin)) { score -= 2; notes.push(`${hd.sin}일(흑도)`); }

    // 일간 십신
    const tg = tenGod(dayGanHan, dGan);
    if (goodShin.includes(tg)) { score += 3; notes.push(`${tg}일 (이 일에 유리)`); }
    if (tg === '편관' || tg === '겁재') { score -= 2; notes.push(`${tg}일 (부담될 수 있음)`); }

    // 손없는날 (음력 9·10·19·20·29·30) — 이사·개업에 가점
    const lday = lunar.getDay();
    const sonEobda = [9, 10, 19, 20, 29, 30].includes(lday);
    if (sonEobda && ['이사', '개업'].includes(eventType)) { score += 2; notes.push('손 없는 날'); }

    // 삼재/기타는 생략 (개인 삼재는 saju에서 별도 안내)

    if (score >= 4) {
      results.push({
        date: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
        weekday: ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()],
        ganZhiKo: GAN_KO[dGan] + ZHI_KO[dZhi],
        ganZhiHan: dGz,
        lunar: `음력 ${lunar.getMonth() < 0 ? '윤' : ''}${Math.abs(lunar.getMonth())}.${lday}`,
        tenGod: tg,
        score,
        notes
      });
    }
  }

  results.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return results.slice(0, 8);
}

function buildTaegilPrompt(eventType, days, sajuText) {
  const lines = days.slice(0, 8).map(d => `${d.date}(${d.weekday}) ${d.ganZhiKo}일 · ${d.tenGod} · ${d.notes.join(', ')}`).join('\n');
  return `"${eventType}"에 좋은 날 후보입니다. 황도길일·십신·손없는날 기준으로 자동 선별했고, 본인 일지와 충(沖)하는 날은 이미 제외했습니다.

${lines}
${sajuText ? '\n[의뢰인 사주]\n' + sajuText + '\n' : ''}
아래 항목으로 상담해 주세요. 각 제목(###)을 그대로.

### 추천 날짜 TOP 3
가장 좋은 날 3개를 순위대로 뽑고, 각각 왜 좋은지 (황도길일인지, 어떤 십신의 날인지, 손없는날인지, 의뢰인 사주와 어떻게 맞는지) 3~4문장씩 설명.

### 두 번째 그룹
그다음으로 괜찮은 날 2~3개를 한 줄씩.

### 당일 팁
"${eventType}" 당일에 시간대나 방향 등 참고할 점이 있으면. (2~3문장)

규칙: 위 목록에 있는 날짜만 추천, 지어내지 말 것, 한국어.
마지막에 "참고: 사람 사이의 일은 날을 잘 잡는 것도 중요하지만, 두 당사자의 사주 궁합을 함께 보면 더 좋습니다." 를 덧붙이세요.`;
}

module.exports = { findGoodDays, buildTaegilPrompt, EVENT_GOOD };
