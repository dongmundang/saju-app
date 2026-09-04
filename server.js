const express = require('express');
const path = require('path');
const fsEnv = require('fs');

// .env 파일에서 환경변수 읽기 (dotenv 없이 간단히)
try {
  const envPath = path.join(__dirname, '.env');
  if (fsEnv.existsSync(envPath)) {
    for (const line of fsEnv.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch (e) { /* .env 없어도 됨 */ }

const { calcSaju, sajuSummaryText, getTodayIljin, getCurrentLuck, scanYears, buildTimingPrompt, familySummary, buildFamilyPrompt, healthHintText } = require('./saju');
const { generate, buildPrompt, buildDailyPrompt, buildLuckPrompt, buildGunghapPrompt, MODEL } = require('./ai');
const { castHexagram, buildIchingPrompt } = require('./iching');
const { findGoodDays, buildTaegilPrompt } = require('./taegil');
const { moveDirections, buildBanwiPrompt } = require('./banwi');
const { analyzeName, buildIreumPrompt } = require('./ireum');

const fs = require('fs');
const LOG = path.join(__dirname, 'server.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch (e) {}
  process.stdout.write(line);
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  const t = Date.now();
  if (req.path.startsWith('/api/')) {
    log(`→ ${req.method} ${req.path} topic=${req.body && req.body.topic || '-'}`);
    res.on('finish', () => log(`← ${req.path} ${res.statusCode} (${Date.now() - t}ms)`));
  }
  next();
});
app.use(express.static(__dirname, { index: 'index.html' }));

function parseBody(b) {
  return {
    year: parseInt(b.year, 10),
    month: parseInt(b.month, 10),
    day: parseInt(b.day, 10),
    hour: b.hour === '' || b.hour == null ? 12 : parseInt(b.hour, 10),
    minute: b.minute ? parseInt(b.minute, 10) : 0,
    isLunar: !!b.isLunar,
    isLeapMonth: !!b.isLeapMonth,
    trueSolarTime: b.trueSolarTime !== false,
    gender: b.gender || '남'
  };
}

// 임시 진단용 (배포 환경변수 확인, 나중에 제거)
app.get('/api/keyinfo', (req, res) => {
  const raw = process.env.ANTHROPIC_API_KEY || '';
  const clean = raw.trim().replace(/^["']|["']$/g, '').trim();
  res.json({
    rawLength: raw.length,
    cleanLength: clean.length,
    prefix: clean.slice(0, 14),
    suffix: clean.slice(-6),
    hadWhitespace: raw !== clean,
    model: MODEL
  });
});

// 사주팔자 계산만
app.post('/api/saju', (req, res) => {
  try {
    const saju = calcSaju(parseBody(req.body));
    res.json({ ok: true, saju });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 사주 + AI 풀이 (총운 / 연애 / 재물 / 건강)
app.post('/api/reading', async (req, res) => {
  try {
    const topic = req.body.topic || '총운';
    const saju = calcSaju(parseBody(req.body));
    let text = sajuSummaryText(saju);
    if (topic === '건강') {
      text += `\n\n[오행-건강 참고]\n${healthHintText(saju)}`;
    }
    const reading = await generate(buildPrompt(topic, text));
    res.json({ ok: true, saju, topic, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 오늘의 운세 (본인 사주 + 오늘 일진)
app.post('/api/daily', async (req, res) => {
  try {
    const saju = calcSaju(parseBody(req.body));
    const iljin = getTodayIljin(saju.dayMaster.gan);
    const reading = await generate(buildDailyPrompt(sajuSummaryText(saju), iljin));
    res.json({ ok: true, saju, iljin, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 올해 세운 + 이번 달 월운
app.post('/api/luck', async (req, res) => {
  try {
    const saju = calcSaju(parseBody(req.body));
    const luck = getCurrentLuck(saju.dayMaster.gan);
    const reading = await generate(buildLuckPrompt(sajuSummaryText(saju), luck));
    res.json({ ok: true, saju, luck, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 궁합
app.post('/api/gunghap', async (req, res) => {
  try {
    const a = calcSaju(parseBody(req.body.a));
    const b = calcSaju(parseBody(req.body.b));
    const reading = await generate(buildGunghapPrompt(sajuSummaryText(a), sajuSummaryText(b)));
    res.json({ ok: true, a, b, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 주역 동전점
app.post('/api/iching', async (req, res) => {
  try {
    const cast = castHexagram(Array.isArray(req.body.lines) ? req.body.lines.map(Number) : null);
    const reading = await generate(buildIchingPrompt(req.body.question || '', cast));
    res.json({ ok: true, cast, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 시기 분석 - "언제?" (취업/결혼/재물/시험/이동)
app.post('/api/timing', async (req, res) => {
  try {
    const topic = req.body.topic || '취업';
    const saju = calcSaju(parseBody(req.body));
    const years = scanYears(saju.dayMaster.gan, saju.pillars.day.han[1], saju.strength, topic, new Date().getFullYear());
    const reading = await generate(buildTimingPrompt(topic, years, sajuSummaryText(saju)));
    res.json({ ok: true, saju, topic, years, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 가족운 (부모·형제·배우자·자녀)
app.post('/api/family', async (req, res) => {
  try {
    const saju = calcSaju(parseBody(req.body));
    const family = familySummary(saju);
    const reading = await generate(buildFamilyPrompt(saju));
    res.json({ ok: true, saju, family, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 이름 오행 풀이
app.post('/api/ireum', async (req, res) => {
  try {
    const saju = calcSaju(parseBody(req.body));
    const nameToCheck = (req.body.checkName || req.body.name || '').trim();
    const a = analyzeName(nameToCheck, saju);
    if (!a.ok) return res.status(400).json({ ok: false, error: a.error });
    const reading = await generate(buildIreumPrompt(a));
    res.json({ ok: true, saju, name: a, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 이사 방위
app.post('/api/banwi', async (req, res) => {
  try {
    const saju = calcSaju(parseBody(req.body));
    const year = parseInt(req.body.targetYear, 10) || new Date().getFullYear();
    const bw = moveDirections(saju.strength.yongsin, year);
    const reading = await generate(buildBanwiPrompt(bw, saju.strength.yongsin));
    res.json({ ok: true, saju, banwi: bw, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 택일 - 좋은 날 찾기
app.post('/api/taegil', async (req, res) => {
  try {
    const eventType = req.body.eventType || '기타';
    const saju = calcSaju(parseBody(req.body));
    const dayGanHan = saju.dayMaster.gan;
    const dayZhiHan = saju.pillars.day.han[1];
    const list = findGoodDays(dayGanHan, dayZhiHan, eventType);
    if (!list.length) {
      return res.json({ ok: true, saju, eventType, days: [], reading: '앞으로 45일 안에 조건에 맞는 날을 찾지 못했습니다. 기간을 늘리거나 조건을 완화해 보세요.', model: MODEL });
    }
    const reading = await generate(buildTaegilPrompt(eventType, list, sajuSummaryText(saju)));
    res.json({ ok: true, saju, eventType, days: list, reading, model: MODEL });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  동문당 실행 중  →  http://localhost:${PORT}\n  (종료: Ctrl+C)\n`);
});
