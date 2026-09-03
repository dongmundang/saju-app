// 이사 방위(方位) - 대장군방 / 삼살방 / 개인 길방
const { Solar } = require('lunar-javascript');

const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_WX = { '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토', '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수' };

const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

// 대장군방: 년지 그룹 → 방향
function daejanggunBang(yearZhi) {
  if (['亥', '子', '丑'].includes(yearZhi)) return '서';
  if (['寅', '卯', '辰'].includes(yearZhi)) return '북';
  if (['巳', '午', '未'].includes(yearZhi)) return '동';
  if (['申', '酉', '戌'].includes(yearZhi)) return '남';
  return null;
}

// 삼살방: 년지 삼합국 → 반대편 방(3방향)
function samsalBang(yearZhi) {
  if (['申', '子', '辰'].includes(yearZhi)) return { dir: '남', span: ['남동', '남', '남서'] };
  if (['寅', '午', '戌'].includes(yearZhi)) return { dir: '북', span: ['북서', '북', '북동'] };
  if (['巳', '酉', '丑'].includes(yearZhi)) return { dir: '동', span: ['북동', '동', '남동'] };
  if (['亥', '卯', '未'].includes(yearZhi)) return { dir: '서', span: ['남서', '서', '북서'] };
  return null;
}

// 오행 → 방위
const WX_DIR = { 목: ['동'], 화: ['남'], 금: ['서'], 수: ['북'], 토: ['남서', '북동'] };

function moveDirections(yongsinList, targetYear) {
  const ec = Solar.fromYmdHms(targetYear, 6, 1, 12, 0, 0).getLunar().getEightChar();
  const yearZhi = ec.getYear()[1];

  const djg = daejanggunBang(yearZhi);
  const ss = samsalBang(yearZhi);
  const goodDirs = new Set();
  (yongsinList || []).forEach(w => (WX_DIR[w] || []).forEach(d => goodDirs.add(d)));

  const table = DIRS.map(dir => {
    let verdict = '평이', reasons = [];
    if (dir === djg) { verdict = '피하기'; reasons.push('대장군방'); }
    if (ss && ss.span.includes(dir)) { verdict = '피하기'; reasons.push('삼살방'); }
    if (goodDirs.has(dir) && verdict !== '피하기') { verdict = '좋음'; reasons.push('내 용신 방향'); }
    else if (goodDirs.has(dir) && verdict === '피하기') { reasons.push('(용신 방향이나 올해는 흉살과 겹침)'); }
    return { dir, verdict, reasons };
  });

  return {
    year: targetYear,
    yearGanZhi: ec.getYear(),
    daejanggun: djg,
    samsal: ss ? ss.span : [],
    goodByYongsin: [...goodDirs],
    table
  };
}

function buildBanwiPrompt(bw, yongsinList) {
  const bad = bw.table.filter(t => t.verdict === '피하기').map(t => t.dir);
  const good = bw.table.filter(t => t.verdict === '좋음').map(t => t.dir);
  return `${bw.year}년(${bw.yearGanZhi}) 이사 방위 분석입니다. (현재 사는 집 기준, 새 집이 어느 방향인지)

- 올해 대장군방(피함): ${bw.daejanggun || '-'}
- 올해 삼살방(피함): ${bw.samsal.join(', ') || '-'}
- 이 사람의 용신 방향(길): ${(yongsinList && yongsinList.length) ? yongsinList.join(', ') + ' → ' + bw.goodByYongsin.join(', ') : '중화라 뚜렷한 길방은 약함'}
- 종합: 피할 방향 [${bad.join(', ') || '없음'}], 좋은 방향 [${good.join(', ') || '뚜렷하지 않음'}]

아래 항목으로 상담해 주세요. 각 제목(###)을 그대로.

### 올해 방위 요약
${bw.year}년의 방위 지형을 3줄로 (좋은 쪽 / 피할 쪽 / 한마디).

### 이사하기 좋은 방향
좋은 방향과 그 이유 — 왜 그쪽이 이 사람에게 도움이 되는지(용신 오행과의 관계), 그 방향으로 갔을 때 기대할 수 있는 분위기. (4~5문장)

### 피하는 게 나은 방향
대장군방·삼살방이 무엇인지 쉬운 말로 설명하고, 올해 어느 쪽인지, 꼭 그쪽으로 가야 한다면 어떻게 보완하는지. 겁주지 말 것. (4~5문장)

### 실전 조언
방위는 여러 요소 중 하나라는 점, 부득이하면 이사 날짜(택일)로 보완할 수 있다는 점, 현재 집을 기준으로 방향을 본다는 점. (3~4문장)

규칙: 위 정보만 근거로, 지어내지 말 것, 한국어.
마지막에 "※ 방위는 참고이며, 좋은 집·좋은 시기·좋은 마음이 더 중요합니다." 를 덧붙이세요.`;
}

module.exports = { moveDirections, buildBanwiPrompt };
