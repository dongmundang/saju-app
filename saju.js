// 사주팔자 계산 모듈 (lunar-javascript 기반, 한글 변환)
const { Solar } = require('lunar-javascript');

const GAN = { '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계' };
const ZHI = { '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해' };
const WUXING = { '金': '금(金)', '木': '목(木)', '水': '수(水)', '火': '화(火)', '土': '토(土)' };
const SHISHEN = {
  '比肩': '비견', '劫财': '겁재', '劫財': '겁재', '食神': '식신', '伤官': '상관', '傷官': '상관',
  '偏财': '편재', '偏財': '편재', '正财': '정재', '正財': '정재', '偏官': '편관', '七杀': '편관', '七殺': '편관',
  '正官': '정관', '偏印': '편인', '正印': '정인'
};
const SHENGXIAO = { '鼠': '쥐', '牛': '소', '虎': '호랑이', '兔': '토끼', '龙': '용', '蛇': '뱀', '马': '말', '羊': '양', '猴': '원숭이', '鸡': '닭', '狗': '개', '猪': '돼지' };
const GAN_WX = { '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토', '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수' };
const ZHI_WX = { '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화', '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수' };
const GAN_YINYANG = { '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양', '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음' };

function k(map, ch) { return map[ch] || ch; }
function pillarKo(gan, zhi) { return k(GAN, gan) + k(ZHI, zhi); }
function ganZhiKo(gz) {
  // '己酉' -> '기유'
  if (!gz || gz.length < 2) return gz || '';
  return k(GAN, gz[0]) + k(ZHI, gz[1]);
}
function hideGanKo(arr) { return (arr || []).map(g => k(GAN, g)); }

function mapShiShenArr(arr) {
  return (arr || []).map(s => k(SHISHEN, s));
}

// 오행 개수 집계 (천간 4 + 지지 4, 지장간 제외한 단순 버전)
function countWuXing(gans, zhis) {
  const cnt = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  gans.forEach(g => { if (GAN_WX[g]) cnt[GAN_WX[g]]++; });
  zhis.forEach(z => { if (ZHI_WX[z]) cnt[ZHI_WX[z]]++; });
  return cnt;
}

/**
 * @param {object} opts
 * @param {number} opts.year 양력 연도
 * @param {number} opts.month
 * @param {number} opts.day
 * @param {number} opts.hour  0-23
 * @param {number} opts.minute
 * @param {boolean} opts.isLunar 입력이 음력인지
 * @param {boolean} opts.isLeapMonth 음력 윤달 여부
 * @param {boolean} opts.trueSolarTime 진태양시 보정(한국 기준 약 -32분)
 * @param {string} opts.gender '남' | '여'
 */
function calcSaju(opts) {
  let { year, month, day, hour, minute = 0, isLunar = false, isLeapMonth = false, trueSolarTime = true, gender = '남' } = opts;

  let solar;
  if (isLunar) {
    const { Lunar } = require('lunar-javascript');
    try {
      const lunar = Lunar.fromYmdHms(year, isLeapMonth ? -month : month, day, hour, minute, 0);
      solar = lunar.getSolar();
    } catch (e) {
      if (isLeapMonth) {
        throw new Error(`${year}년 음력 ${month}월에는 윤달이 없습니다. "음력(평달)" 또는 "양력"으로 선택해 주세요.`);
      }
      throw new Error(`음력 날짜를 변환할 수 없습니다 (${year}년 ${month}월 ${day}일). 날짜를 확인하거나 "양력"으로 선택해 주세요.`);
    }
  } else {
    solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  }

  // 진태양시 보정: 한국 표준시(동경 135도) 기준, 서울 약 127도 → 약 -32분
  if (trueSolarTime) {
    solar = solar.next(0); // no-op to clone semantics
    const corrected = Solar.fromYmdHms(
      solar.getYear(), solar.getMonth(), solar.getDay(),
      solar.getHour(), solar.getMinute(), solar.getSecond()
    );
    // -32분 적용
    const d = new Date(corrected.getYear(), corrected.getMonth() - 1, corrected.getDay(), corrected.getHour(), corrected.getMinute() - 32, 0);
    solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0);
  }

  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const gans = [ec.getYearGan(), ec.getMonthGan(), ec.getDayGan(), ec.getTimeGan()];
  const zhis = [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi(), ec.getTimeZhi()];

  const dayGan = ec.getDayGan();
  const wuXingCount = countWuXing(gans, zhis);
  const lacking = Object.keys(wuXingCount).filter(k => wuXingCount[k] === 0);
  const strong = Object.keys(wuXingCount).filter(k => wuXingCount[k] >= 3);

  // 대운 (10년 단위)
  let daeun = [];
  let daeunStartAge = null;
  try {
    const yun = ec.getYun(gender === '남' ? 1 : 0);
    daeunStartAge = yun.getStartYear ? yun.getStartYear() : null;
    const list = yun.getDaYun() || [];
    daeun = list.slice(0, 9).filter(d => d.getGanZhi()).map(d => ({
      startYear: d.getStartYear(),
      endYear: d.getEndYear(),
      startAge: d.getStartAge(),
      ganZhiKo: ganZhiKo(d.getGanZhi()),
      ganZhiHan: d.getGanZhi()
    }));
  } catch (e) { /* 대운 계산 실패 시 생략 */ }

  // 지장간 (한자 원본 + 한글)
  const hideRaw = {
    year: (ec.getYearHideGan && ec.getYearHideGan()) || [],
    month: (ec.getMonthHideGan && ec.getMonthHideGan()) || [],
    day: (ec.getDayHideGan && ec.getDayHideGan()) || [],
    time: (ec.getTimeHideGan && ec.getTimeHideGan()) || []
  };
  const jijangan = {
    year: hideGanKo(hideRaw.year),
    month: hideGanKo(hideRaw.month),
    day: hideGanKo(hideRaw.day),
    time: hideGanKo(hideRaw.time)
  };

  // 신강/신약 + 억부용신 분석
  const strength = analyzeStrength(dayGan, gans, zhis, hideRaw);

  // 신살
  const sinsal = calcSinsal(gans, zhis);

  // 12운성 (일간 기준, 각 지지)
  const unseong = {
    year: twelveUnseong(dayGan, zhis[0]),
    month: twelveUnseong(dayGan, zhis[1]),
    day: twelveUnseong(dayGan, zhis[2]),
    time: twelveUnseong(dayGan, zhis[3])
  };

  // 지지 형충회합
  const relations = analyzeRelations(zhis);

  // 삼재
  const samjae = checkSamjae(zhis[0], new Date().getFullYear());

  // 대운 길흉 점수 + 현재 대운 표시
  const nowYear = new Date().getFullYear();
  // 신강/신약이면 억부용신 기준, 중화면 "부족한 오행 보완" 기준
  const usingYongsin = (strength.yongsin && strength.yongsin.length) > 0;
  const yong = new Set(usingYongsin ? strength.yongsin : lacking);
  const gi = new Set(usingYongsin ? strength.gisin : strong);
  const daeunBasis = usingYongsin ? '억부용신' : (lacking.length ? '부족 오행 보완' : null);
  daeun = daeun.map(d => {
    const gW = GAN_WX[d.ganZhiHan[0]], zW = ZHI_WX[d.ganZhiHan[1]];
    let sc = 0;
    [gW, zW].forEach((w, i) => {
      const weight = i === 0 ? 1 : 1.3; // 지지에 조금 더 비중
      if (yong.has(w)) sc += 2 * weight;
      else if (gi.has(w)) sc -= 2 * weight;
    });
    sc = Math.round(sc * 10) / 10;
    let label = '평이';
    if (daeunBasis) {
      if (sc >= 4) label = '매우 좋음';
      else if (sc >= 1.5) label = '좋음';
      else if (sc <= -4) label = '주의 필요';
      else if (sc <= -1.5) label = '다소 힘듦';
    }
    return Object.assign({}, d, {
      score: daeunBasis ? sc : null,
      label,
      current: nowYear >= d.startYear && nowYear <= d.endYear
    });
  });

  return {
    input: {
      solar: solar.toYmd() + ' ' + String(solar.getHour()).padStart(2, '0') + ':' + String(solar.getMinute()).padStart(2, '0'),
      lunar: `${lunar.getYear()}년 ${lunar.getMonth() < 0 ? '윤' : ''}${Math.abs(lunar.getMonth())}월 ${lunar.getDay()}일`,
      gender,
      trueSolarTime
    },
    pillars: {
      year: { ko: pillarKo(ec.getYearGan(), ec.getYearZhi()), han: ec.getYear(), ganKo: k(GAN, ec.getYearGan()), zhiKo: k(ZHI, ec.getYearZhi()) },
      month: { ko: pillarKo(ec.getMonthGan(), ec.getMonthZhi()), han: ec.getMonth(), ganKo: k(GAN, ec.getMonthGan()), zhiKo: k(ZHI, ec.getMonthZhi()) },
      day: { ko: pillarKo(ec.getDayGan(), ec.getDayZhi()), han: ec.getDay(), ganKo: k(GAN, ec.getDayGan()), zhiKo: k(ZHI, ec.getDayZhi()) },
      time: { ko: pillarKo(ec.getTimeGan(), ec.getTimeZhi()), han: ec.getTime(), ganKo: k(GAN, ec.getTimeGan()), zhiKo: k(ZHI, ec.getTimeZhi()) }
    },
    dayMaster: {
      gan: dayGan,
      ganKo: k(GAN, dayGan),
      wuXing: GAN_WX[dayGan],
      yinYang: GAN_YINYANG[dayGan],
      desc: `일간(본인)은 ${k(GAN, dayGan)}, 오행은 ${GAN_WX[dayGan]}(${GAN_YINYANG[dayGan]})입니다.`
    },
    wuXing: {
      count: wuXingCount,
      lacking,
      strong
    },
    shiShen: {
      year: { gan: k(SHISHEN, ec.getYearShiShenGan()), zhi: mapShiShenArr(ec.getYearShiShenZhi()) },
      month: { gan: k(SHISHEN, ec.getMonthShiShenGan()), zhi: mapShiShenArr(ec.getMonthShiShenZhi()) },
      day: { gan: '일간(본인)', zhi: mapShiShenArr(ec.getDayShiShenZhi()) },
      time: { gan: k(SHISHEN, ec.getTimeShiShenGan()), zhi: mapShiShenArr(ec.getTimeShiShenZhi()) }
    },
    jijangan,
    strength,
    sinsal,
    unseong,
    relations,
    samjae,
    daeun,
    daeunBasis,
    daeunStartAge,
    extra: {
      zodiac: k(SHENGXIAO, lunar.getYearShengXiao()),
      gongmang: (ec.getDayXunKong && ec.getDayXunKong() || '').split('').map(c => k(ZHI, c)).join(''),
      naYin: {
        year: ec.getYearNaYin(), month: ec.getMonthNaYin(), day: ec.getDayNaYin(), time: ec.getTimeNaYin()
      }
    }
  };
}

// AI 프롬프트용 사주 요약 텍스트
function sajuSummaryText(s) {
  const p = s.pillars;
  const wx = s.wuXing.count;
  return [
    `성별: ${s.input.gender}`,
    `양력 생일: ${s.input.solar}`,
    `사주팔자: 년주 ${p.year.ko}(${p.year.han}), 월주 ${p.month.ko}(${p.month.han}), 일주 ${p.day.ko}(${p.day.han}), 시주 ${p.time.ko}(${p.time.han})`,
    `일간(본인): ${s.dayMaster.ganKo} / 오행 ${s.dayMaster.wuXing} / ${s.dayMaster.yinYang}`,
    `오행 분포 - 목:${wx.목} 화:${wx.화} 토:${wx.토} 금:${wx.금} 수:${wx.수}`,
    s.wuXing.lacking.length ? `부족한 오행: ${s.wuXing.lacking.join(', ')}` : `부족한 오행 없음`,
    s.wuXing.strong.length ? `강한 오행: ${s.wuXing.strong.join(', ')}` : ``,
    `십신 - 년:${s.shiShen.year.gan}, 월:${s.shiShen.month.gan}, 시:${s.shiShen.time.gan}`,
    `띠: ${s.extra.zodiac}`,
    s.strength ? `신강/신약 - ${s.strength.verdict} (일간 힘 ${s.strength.score}점)` : ``,
    s.strength && s.strength.yongsin.length ? `억부용신(도움되는 오행): ${s.strength.yongsin.join(', ')} / 꺼리는 오행: ${s.strength.gisin.join(', ')}` : ``,
    s.sinsal && s.sinsal.length ? `신살: ${s.sinsal.map(x => `${x.name}(${x.at})`).join(', ')}` : ``,
    s.unseong ? `12운성 - 년:${s.unseong.year}, 월:${s.unseong.month}, 일:${s.unseong.day}, 시:${s.unseong.time}` : ``,
    s.relations && s.relations.length ? `지지 관계: ${s.relations.map(r => `${r.type}(${String(r.zhi).split('').map(c => k(ZHI, c)).join('·')})`).join(', ')}` : ``,
    s.samjae && s.samjae.active ? `삼재: ${s.samjae.upcoming.map(u => `${u.year}년 ${u.phase}`).join(', ')}` : ``,
    (s.daeun && s.daeun.length) ? `대운(10년 단위)${s.daeunBasis ? ' [' + s.daeunBasis + ' 기준 길흉]' : ''}:\n${s.daeun.map(d => `  - ${d.startYear}~${d.endYear}년 (${d.startAge}세~) ${d.ganZhiKo}${d.label && d.label !== '평이' ? ' = ' + d.label : ''}${d.current ? '  ← 현재 대운' : ''}`).join('\n')}` : ``,
    `오늘 기준 연도: ${new Date().getFullYear()}년`
  ].filter(Boolean).join('\n');
}

// ── 가족운(육친) 요약 ──
// 십신 → 육친
function yukchin(shishen, gender) {
  const m = {
    '비견': '형제·친구·동료', '겁재': '형제·경쟁자',
    '식신': gender === '여' ? '자녀(주로 딸)·아랫사람' : '아랫사람·손아랫식구',
    '상관': gender === '여' ? '자녀(주로 아들)·아랫사람' : '아랫사람·표현력',
    '편재': '아버지·재물·(남)애인', '정재': gender === '남' ? '아내·재물' : '재물·시댁',
    '편관': gender === '여' ? '남편·(남)애인' : '자녀(주로 아들)·직책', '정관': gender === '여' ? '남편' : '자녀(주로 딸)·직장·명예',
    '편인': '어머니(계모 뉘앙스)·문서', '정인': '어머니·문서·공부'
  };
  return m[shishen] || shishen;
}

function familySummary(saju) {
  const g = saju.input.gender;
  const p = saju.pillars, ss = saju.shiShen, un = saju.unseong, rel = saju.relations || [];
  const yong = new Set((saju.strength && saju.strength.yongsin) || []);
  const gi = new Set((saju.strength && saju.strength.gisin) || []);
  const wxOf = ch => GAN_WX[ch] || ZHI_WX[ch];
  const tag = wx => yong.has(wx) ? '(용신 기운·긍정)' : gi.has(wx) ? '(기신 기운·과하면 부담)' : '';
  const relAt = (label) => rel.filter(r => r.at.includes(label)).map(r => `${r.type}`);

  // 배우자궁 = 일지
  const spouseZhiWx = ZHI_WX[p.day.han[1]];
  const spouseRel = relAt('일지');

  // 자녀궁 = 시주
  const childGanWx = GAN_WX[p.time.han[0]];
  const childRel = relAt('시지');

  return {
    부모: {
      note: `년주 ${p.year.ko}, 월주 ${p.month.ko}. 어머니=정인/편인, 아버지=편재.`,
      month12: un.month,
      monthRel: relAt('월지'),
      yearRel: relAt('년지')
    },
    형제: {
      note: `월주 ${p.month.ko}의 십신 ${ss.month.gan} (${yukchin(ss.month.gan, g)}). 비겁이 강하면 형제·동료 인연이 많고 경쟁도.`,
      month12: un.month
    },
    배우자: {
      gung: `일지 ${p.day.zhiKo}(${p.day.han[1]}), 오행 ${spouseZhiWx} ${tag(spouseZhiWx)}`,
      sipsin: g === '남' ? '남자는 재성(정재=아내)으로도 봄' : '여자는 관성(정관=남편)으로도 봄',
      un12: un.day,
      relation: spouseRel.length ? spouseRel.join(', ') + ' — 배우자궁에 변동/작용 있음' : '큰 충·합 없음'
    },
    자녀: {
      gung: `시주 ${p.time.ko}, 시간 오행 ${childGanWx} ${tag(childGanWx)}`,
      sipsin: g === '남' ? `남자는 관성으로 자녀를 봄 (시주 십신 ${ss.time.gan})` : `여자는 식상으로 자녀를 봄 (시주 십신 ${ss.time.gan})`,
      un12: un.time,
      relation: childRel.length ? childRel.join(', ') : '큰 충·합 없음'
    }
  };
}

function buildFamilyPrompt(saju) {
  const f = familySummary(saju);
  const g = saju.input.gender;
  return `아래는 한 사람(${g})의 사주에서 가족운 관련 정보입니다.

[부모] ${f.부모.note} / 월주 12운성 ${f.부모.month12} / 관계 ${[...f.부모.monthRel, ...f.부모.yearRel].join(',') || '특이사항 없음'}
[형제] ${f.형제.note}
[배우자] 배우자궁 ${f.배우자.gung} / 12운성 ${f.배우자.un12} / ${f.배우자.sipsin} / ${f.배우자.relation}
[자녀] 자녀궁 ${f.자녀.gung} / 12운성 ${f.자녀.un12} / ${f.자녀.sipsin} / ${f.자녀.relation}

아래 항목으로, 각 제목(###)을 그대로 써서 충분히 풀어 상담해 주세요.

### 한눈에 보는 가족운
가족 전체 그림을 3줄로.

### 부모와의 인연
년주·월주, 인성(어머니)·편재(아버지)의 상태로 본 부모와의 관계, 어린 시절의 분위기, 부모에게 받은 것과 아쉬웠던 것. (4~5문장)

### 형제·동료 인연
비겁의 힘으로 본 형제·친구·동료 관계의 특징. 경쟁인지 협력인지, 도움을 주고받는 관계인지. (3~4문장)

### 배우자
남자는 재성, 여자는 관성, 그리고 배우자궁(일지)의 오행·12운성·형충으로 본 배우자의 모습과 성향, 만나기 쉬운 인연, 부부관계에서 유의할 점. (5~6문장)

### 자녀
남자는 관성, 여자는 식상, 자녀궁(시주)의 상태로 본 자녀와의 인연, 자녀운의 흐름, 자녀를 대할 때 도움이 되는 태도. (4~5문장)

### 상담가의 조언
가족 안에서 이 분이 편안해지기 위한 구체적 조언 2~3가지.

규칙: 위 정보와 사주에 나온 십신·오행·12운성만 근거로, 자녀 수처럼 없는 사실을 단정하지 말 것. 12운성이 약한 자리(절·묘·병 등)나 형충이 있으면 "인연의 거리감"이나 "서로 맞춰가는 노력이 필요한 관계"처럼 부드럽게 표현. 겁주지 말 것. 한국어.
마지막에 "※ 가족의 인연은 서로의 노력으로 더 좋아질 수 있습니다." 를 덧붙이세요.`;
}

// ── 십신 판정 (일간 기준, 다른 천간과의 관계) ──
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // 생: A가 B를 낳음
const KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };   // 극: A가 B를 이김

function tenGod(dayGanHan, otherGanHan) {
  const dW = GAN_WX[dayGanHan], oW = GAN_WX[otherGanHan];
  const same = GAN_YINYANG[dayGanHan] === GAN_YINYANG[otherGanHan];
  if (dW === oW) return same ? '비견' : '겁재';
  if (SHENG[dW] === oW) return same ? '식신' : '상관';      // 내가 생함
  if (KE[dW] === oW) return same ? '편재' : '정재';          // 내가 극함
  if (KE[oW] === dW) return same ? '편관' : '정관';          // 나를 극함
  if (SHENG[oW] === dW) return same ? '편인' : '정인';       // 나를 생함
  return '-';
}

// ── 신강/신약 + 억부용신 분석 ──
const SHENG_OF = { 목:'수', 화:'목', 토:'화', 금:'토', 수:'금' }; // X를 생하는 오행 (인성)
const GEN_BY   = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' }; // X가 생하는 오행 (식상)
const KE_OF    = { 목:'금', 화:'수', 토:'목', 금:'화', 수:'토' }; // X를 극하는 오행 (관성)
const KE_BY    = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' }; // X가 극하는 오행 (재성)

function analyzeStrength(dayGanHan, gans, zhis, hideRaw) {
  const dW = GAN_WX[dayGanHan];
  const friendEls = new Set([dW, SHENG_OF[dW]]);          // 비겁 + 인성
  const foeEls = new Set([GEN_BY[dW], KE_BY[dW], KE_OF[dW]]); // 식상 + 재성 + 관성

  const ganW = [1.0, 1.2, 0, 1.0];   // 년 월 일(제외) 시
  const zhiW = [1.5, 3.0, 2.0, 1.5]; // 년 월 일 시 (월지 = 월령, 최대)

  let friend = 0, foe = 0;
  const bump = (el, w) => {
    if (!el) return;
    if (friendEls.has(el)) friend += w;
    else if (foeEls.has(el)) foe += w;
  };

  gans.forEach((g, i) => { if (i !== 2) bump(GAN_WX[g], ganW[i]); });
  zhis.forEach((z, i) => bump(ZHI_WX[z], zhiW[i]));
  // 지장간 정기(마지막 원소)에 지지 절반 가중
  ['year', 'month', 'day', 'time'].forEach((key, i) => {
    const arr = hideRaw[key] || [];
    if (arr.length) bump(GAN_WX[arr[arr.length - 1]], zhiW[i] * 0.5);
  });

  const total = friend + foe;
  const score = total ? Math.round(friend / total * 100) : 50;

  let verdict, needElements, avoidElements;
  if (score >= 58) {
    verdict = '신강';
    needElements = [GEN_BY[dW], KE_BY[dW], KE_OF[dW]]; // 식상·재성·관성
    avoidElements = [dW, SHENG_OF[dW]];
  } else if (score <= 42) {
    verdict = '신약';
    needElements = [SHENG_OF[dW], dW]; // 인성·비겁
    avoidElements = [KE_OF[dW], KE_BY[dW]];
  } else {
    verdict = '중화(중간)';
    needElements = [];
    avoidElements = [];
  }

  const roleName = { [dW]: '비겁(자기 세력)', [SHENG_OF[dW]]: '인성(도움)', [GEN_BY[dW]]: '식상(표현·활동)', [KE_BY[dW]]: '재성(재물)', [KE_OF[dW]]: '관성(직책·규율)' };

  return {
    dayWuXing: dW,
    score,                       // 0~100, 높을수록 신강
    verdict,                     // 신강 / 신약 / 중화
    yongsin: needElements,       // 억부용신 후보 오행
    gisin: avoidElements,        // 꺼리는 오행
    roles: roleName,
    summary: verdict === '중화(중간)'
      ? `일간 힘이 ${score}점으로 중화에 가깝습니다. 특정 오행에 크게 의존하지 않고 대운 흐름을 따라갑니다.`
      : `일간 힘 ${score}점, ${verdict}. 억부로 보면 용신은 ${needElements.join('·')} 계열, 꺼리는 것은 ${avoidElements.join('·')} 계열입니다.`
  };
}

// ── 신살(神殺) ──
// 삼합국별 도화/역마/화개 지지
const SANHAP = [
  { group: ['寅', '午', '戌'], dohwa: '卯', yeokma: '申', hwagae: '戌' },
  { group: ['申', '子', '辰'], dohwa: '酉', yeokma: '寅', hwagae: '辰' },
  { group: ['巳', '酉', '丑'], dohwa: '午', yeokma: '亥', hwagae: '丑' },
  { group: ['亥', '卯', '未'], dohwa: '子', yeokma: '巳', hwagae: '未' }
];
// 천을귀인 (일간 기준)
const CHEONEUL = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯']
};
// 문창귀인 (일간 기준)
const MUNCHANG = { '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' };
// 양인살 (양간 기준)
const YANGIN = { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' };
// 괴강 / 백호 (일주 간지)
const GWAEGANG = ['庚辰', '庚戌', '壬辰', '戊戌'];
const BAEKHO = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'];

const PILLAR_NAMES = ['년', '월', '일', '시'];

// ── 12운성 (십이운성 / 포태법) ──
const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const UNSEONG = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const UNSEONG_START = { // 장생 지지 + 방향(양간 forward / 음간 backward)
  '甲': ['亥', 1], '丙': ['寅', 1], '戊': ['寅', 1], '庚': ['巳', 1], '壬': ['申', 1],
  '乙': ['午', -1], '丁': ['酉', -1], '己': ['酉', -1], '辛': ['子', -1], '癸': ['卯', -1]
};
function twelveUnseong(dayGanHan, zhiHan) {
  const cfg = UNSEONG_START[dayGanHan]; if (!cfg) return '';
  const s = ZHI_ORDER.indexOf(cfg[0]), t = ZHI_ORDER.indexOf(zhiHan);
  const idx = cfg[1] === 1 ? ((t - s + 12) % 12) : ((s - t + 12) % 12);
  return UNSEONG[idx];
}

// ── 지지 형충회합 ──
const YUKHAP = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const YUKCHUNG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const YUKHAE = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
const SAMHAP_SETS = [['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未']];
const SAMHYEONG_SETS = [['寅', '巳', '申'], ['丑', '戌', '未']];

function analyzeRelations(zhis) {
  const rel = [];
  const seen = new Set();
  const pairName = (i, j) => `${PILLAR_NAMES[i]}지-${PILLAR_NAMES[j]}지`;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = zhis[i], b = zhis[j];
    const has = (list) => list.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    if (has(YUKHAP)) rel.push({ type: '육합', at: pairName(i, j), zhi: `${a}${b}`, desc: '결합·안정, 묶여서 다른 작용이 약해지기도' });
    if (has(YUKCHUNG)) rel.push({ type: '충(沖)', at: pairName(i, j), zhi: `${a}${b}`, desc: '충돌·이동·변화, 자리 흔들림' });
    if (has(YUKHAE)) rel.push({ type: '해(害)', at: pairName(i, j), zhi: `${a}${b}`, desc: '방해·소소한 마찰, 건강·관계 신경' });
    if (a === b && ['辰', '午', '酉', '亥'].includes(a)) rel.push({ type: '자형(自刑)', at: pairName(i, j), zhi: `${a}${b}`, desc: '스스로를 옭아매는 기운, 자책 경향' });
  }
  // 삼합/반합
  SAMHAP_SETS.forEach(set => {
    const idxs = [0, 1, 2, 3].filter(i => set.includes(zhis[i]));
    const kinds = new Set(idxs.map(i => zhis[i]));
    if (kinds.size === 3) rel.push({ type: '삼합', at: '지지 3개', zhi: set.join(''), desc: '강력한 결합, 해당 오행 세력이 크게 강해짐' });
    else if (kinds.size === 2) rel.push({ type: '반합', at: '지지 2개', zhi: [...kinds].join(''), desc: '부분 결합, 해당 오행 기운이 강해짐' });
  });
  // 삼형
  SAMHYEONG_SETS.forEach(set => {
    const kinds = new Set([0, 1, 2, 3].filter(i => set.includes(zhis[i])).map(i => zhis[i]));
    if (kinds.size === 3) rel.push({ type: '삼형(三刑)', at: '지지 3개', zhi: set.join(''), desc: '갈등·구설·법적 다툼 주의, 직업으로 승화 가능' });
  });
  return rel;
}

// ── 삼재(三災) ──
const SAMJAE_MAP = { // 띠 그룹 → 삼재 드는 해의 지지 3개 [들, 눌, 날]
  '申子辰': ['寅', '卯', '辰'], '巳酉丑': ['亥', '子', '丑'],
  '寅午戌': ['申', '酉', '戌'], '亥卯未': ['巳', '午', '未']
};
function checkSamjae(birthYearZhi, fromYear) {
  const group = Object.keys(SAMJAE_MAP).find(g => g.includes(birthYearZhi));
  if (!group) return null;
  const targets = SAMJAE_MAP[group];
  const labels = ['들삼재', '눌삼재', '날삼재'];
  const list = [];
  for (let y = fromYear; y < fromYear + 6; y++) {
    const zhi = ZHI_ORDER[(y - 4) % 12]; // 4 CE = 子년
    const pos = targets.indexOf(zhi);
    if (pos >= 0) list.push({ year: y, phase: labels[pos] });
  }
  return { active: list.length > 0, upcoming: list };
}

function findGroup(zhi) { return SANHAP.find(s => s.group.includes(zhi)); }

function calcSinsal(gans, zhis) {
  const dayGan = gans[2];
  const found = []; // { name, at: ['일','시'], desc }
  const add = (name, idx, desc) => {
    let e = found.find(f => f.name === name);
    if (!e) { e = { name, at: [], desc }; found.push(e); }
    if (!e.at.includes(PILLAR_NAMES[idx])) e.at.push(PILLAR_NAMES[idx]);
  };

  // 도화/역마/화개 — 일지 기준(주) + 년지 기준(보조)
  [zhis[2], zhis[0]].forEach(base => {
    const g = findGroup(base);
    if (!g) return;
    zhis.forEach((z, i) => {
      if (z === g.dohwa) add('도화살', i, '매력·인기·이성운, 때로 구설');
      if (z === g.yeokma) add('역마살', i, '이동·변화·여행·해외, 분주함');
      if (z === g.hwagae) add('화개살', i, '예술·종교·학문·고독, 재능');
    });
  });

  // 천을귀인
  (CHEONEUL[dayGan] || []).forEach(target => {
    zhis.forEach((z, i) => { if (z === target) add('천을귀인', i, '최고의 길신 — 귀인의 도움, 위기에 조력자'); });
  });
  // 문창귀인
  zhis.forEach((z, i) => { if (z === MUNCHANG[dayGan]) add('문창귀인', i, '학문·시험·글재주·총명'); });
  // 양인살
  if (YANGIN[dayGan]) zhis.forEach((z, i) => { if (z === YANGIN[dayGan]) add('양인살', i, '강한 추진력·전문기술, 과하면 극단·사고 주의'); });

  // 괴강 / 백호 (일주)
  const dayGZ = gans[2] + zhis[2];
  if (GWAEGANG.includes(dayGZ)) add('괴강살', 2, '강한 리더십·카리스마·결단, 기복이 큼');
  if (BAEKHO.includes(dayGZ)) add('백호살', 2, '강렬한 기운·전문성, 건강·안전에 유의');

  return found.map(f => ({ name: f.name, at: f.at.join('·') + '주', desc: f.desc }));
}

function gzInfo(dayGanHan, gz) {
  const g = gz[0], z = gz[1];
  return {
    ganZhiKo: k(GAN, g) + k(ZHI, z),
    ganZhiHan: gz,
    ganKo: k(GAN, g),
    zhiKo: k(ZHI, z),
    wuXing: GAN_WX[g],
    tenGod: tenGod(dayGanHan, g)
  };
}

// ── 오늘의 일진 ──
function getTodayIljin(dayGanHan, date) {
  const now = date || new Date();
  const solar = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0);
  const lunar = solar.getLunar();
  return Object.assign({
    dateStr: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`
  }, gzInfo(dayGanHan, lunar.getDayInGanZhi()));
}

// ── 시기 분석: 앞으로 N년 세운 스캔 (질문 주제별) ──
const CHUNG_MAP = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
const TOPIC_GOOD_SHIN = {
  '취업':  { good: ['정관', '정인', '편인', '식신'], bad: ['겁재', '편관'], label: '취업·이직' },
  '결혼':  { good: ['정관', '정재', '정인', '식신'], bad: ['겁재', '비견'], label: '결혼·인연' },
  '재물':  { good: ['정재', '편재', '식신', '상관'], bad: ['겁재', '편인'], label: '재물·투자' },
  '시험':  { good: ['정인', '편인'], bad: ['상관', '정재'], label: '시험·합격' },
  '이동':  { good: ['역마'], bad: [], label: '이사·이동' }
};

function scanYears(dayGanHan, dayZhiHan, strength, topic, fromYear, n = 12) {
  const cfg = TOPIC_GOOD_SHIN[topic] || TOPIC_GOOD_SHIN['취업'];
  const yong = new Set((strength && strength.yongsin) || []);
  const gi = new Set((strength && strength.gisin) || []);
  const out = [];
  for (let y = fromYear; y < fromYear + n; y++) {
    const ec = Solar.fromYmdHms(y, 6, 1, 12, 0, 0).getLunar().getEightChar();
    const gz = ec.getYear();
    const g = gz[0], z = gz[1];
    const tg = tenGod(dayGanHan, g);
    let score = 0;
    const notes = [];
    if (cfg.good.includes(tg)) { score += 3; notes.push(`${tg}운 (${cfg.label}에 유리)`); }
    if (cfg.bad.includes(tg)) { score -= 2; notes.push(`${tg}운 (부담)`); }
    if (yong.has(GAN_WX[g])) { score += 1.5; notes.push('용신 천간'); }
    else if (gi.has(GAN_WX[g])) { score -= 1.5; notes.push('기신 천간'); }
    if (yong.has(ZHI_WX[z])) { score += 1.5; notes.push('용신 지지'); }
    else if (gi.has(ZHI_WX[z])) { score -= 1.5; notes.push('기신 지지'); }
    if (CHUNG_MAP[dayZhiHan] === z) { notes.push('본명 일지와 충 (변동·이동 큼)'); if (topic === '이동') score += 2; else score -= 1; }
    out.push({
      year: y,
      ganZhiKo: k(GAN, g) + k(ZHI, z),
      tenGod: tg,
      score: Math.round(score * 10) / 10,
      notes,
      rating: score >= 3 ? '좋음' : score >= 1 ? '무난' : score <= -2 ? '주의' : '보통'
    });
  }
  return out;
}

function buildTimingPrompt(topic, years, sajuText) {
  const label = (TOPIC_GOOD_SHIN[topic] || {}).label || topic;
  const lines = years.map(y => `${y.year}년 ${y.ganZhiKo} · ${y.tenGod}운 · ${y.rating} (${y.notes.join(', ') || '특이사항 없음'})`).join('\n');
  return `"${label}" 시기 분석입니다. 앞으로 12년 세운을 자동 평가한 표입니다.

${lines}

본인 사주:
${sajuText || '(제공되지 않음)'}

이 표와 사주를 바탕으로 아래 항목으로 상담해 주세요. 각 제목(###)을 그대로.

### 한눈에 보는 흐름
"${label}"에 대해 앞으로 12년의 큰 그림을 3줄로.

### 가장 유리한 시기
좋은 해 2~3개를 꼽고, 각각 왜 그 해가 좋은지(어떤 십신·오행 운이 들어오는지) 구체적으로. 그 시기에 무엇을 하면 좋을지도. (해마다 3~4문장)

### 무난하거나 조심할 시기
나머지 해들의 분위기, 주의로 나온 해가 있으면 왜 그런지와 어떻게 대비할지. 없으면 "특별히 나쁜 해는 없다"고. (4~5문장)

### 상담가의 조언
"${label}"을 위해 지금부터 준비하면 좋은 것 2~3가지. (3~4문장)

규칙: 표에 있는 연도만 언급, 지어내지 말 것, 단정보다 흐름으로, 겁주지 말 것, 한국어.
마지막에 "※ 좋은 시기는 준비된 사람에게 더 크게 열립니다." 를 덧붙이세요.`;
}

// ── 세운(올해) · 월운(이번 달) — 절기 기준 사주 간지 ──
function getCurrentLuck(dayGanHan, date) {
  const now = date || new Date();
  const ec = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0).getLunar().getEightChar();
  return {
    dateStr: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
    year: Object.assign({ label: `${now.getFullYear()}년 세운` }, gzInfo(dayGanHan, ec.getYear())),
    month: Object.assign({ label: `${now.getMonth() + 1}월 월운` }, gzInfo(dayGanHan, ec.getMonth())),
    day: Object.assign({ label: '오늘 일진' }, gzInfo(dayGanHan, ec.getDay()))
  };
}

// ── 오행 → 건강(한의학 통념) 매핑 ──
const WX_HEALTH = {
  목: '간·담(쓸개), 근육, 눈, 스트레스와 화(火)',
  화: '심장·소장, 혈액순환, 혀, 정신·수면',
  토: '비장·위장, 소화기, 입, 근심걱정',
  금: '폐·대장, 호흡기, 코·피부, 슬픔',
  수: '신장·방광, 뼈·생식기, 귀, 두려움'
};

function healthHintText(s) {
  const c = s.wuXing.count;
  const lines = [];
  s.wuXing.lacking.forEach(w => lines.push(`${w} 부족 → ${WX_HEALTH[w]} 계통이 약할 수 있음`));
  s.wuXing.strong.forEach(w => lines.push(`${w} 과다 → ${WX_HEALTH[w]} 계통에 과부하·염증 주의`));
  if (!lines.length) lines.push('오행이 비교적 고르게 분포 → 특정 장기 편중은 크지 않음');
  return lines.join('\n');
}

module.exports = { calcSaju, sajuSummaryText, getTodayIljin, getCurrentLuck, scanYears, buildTimingPrompt, familySummary, buildFamilyPrompt, healthHintText, tenGod, TOPIC_GOOD_SHIN };
