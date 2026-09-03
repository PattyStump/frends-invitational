// Frends Invitational — shared data engine

const DATA_FILES = [
  'data/2022master.csv',
  'data/2023master.csv',
  'data/2024master.csv',
  'data/2025master.csv',
  'data/2026master.csv',
];

const ALIAS = { 'Ta. Verma': 'T. Verma' };
function can(n) { return ALIAS[n] || n; }

// Rostered players who have not yet played a match — still get a profile / leaderboard row at 0-0-0.
const EXTRA_PLAYERS = ['E. Mearns'];

async function loadAllMatches() {
  const results = await Promise.all(
    DATA_FILES.map(f => fetch(f).then(r => r.text()))
  );
  const matches = [];
  results.forEach(csv => {
    const lines = csv.trim().split('\n');
    lines.slice(1).forEach(line => {
      const r = line.split(',');
      if (r.length < 21) return;
      matches.push({
        year: +r[0], format: r[1], day: +r[2], weekday: r[3], course: r[4],
        session: r[5], block: +r[6], mf: r[7],
        wA: can(r[8].trim()), wAt: r[9].trim(),
        wB: can(r[10].trim()), wBt: r[11].trim(),
        lA: can(r[12].trim()), lAt: r[13].trim(),
        lB: can(r[14].trim()), lBt: r[15].trim(),
        mv: +r[16], tie: r[17].trim() === 'YES',
        tA: r[18].trim(), pA: +r[19], tB: r[20].trim(), pB: +r[21],
      });
    });
  });
  return matches;
}

function allPlayers(ms) {
  const s = new Set(EXTRA_PLAYERS);
  ms.forEach(m => [m.wA, m.wB, m.lA, m.lB].forEach(p => { if (p) s.add(p); }));
  return [...s].sort();
}

function teamOf(m, p) {
  const pairs = [[m.wA, m.wAt], [m.wB, m.wBt], [m.lA, m.lAt], [m.lB, m.lBt]];
  for (const [n, t] of pairs) if (n === p) return t;
  return '';
}

function result(m, p) {
  if ([m.wA, m.wB].includes(p)) return m.tie ? 'T' : 'W';
  if ([m.lA, m.lB].includes(p)) return m.tie ? 'T' : 'L';
  return null;
}

function pct(W, L, T) {
  const tot = W + L + T;
  return tot ? Math.round((W + T * 0.5) / tot * 100) : 0;
}

function colorP(p) {
  return p >= 65 ? '#1D9E75' : p >= 40 ? '#BA7517' : '#D85A30';
}

function borderP(p) {
  return p >= 65 ? '#1D9E75' : p >= 40 ? '#EF9F27' : '#D85A30';
}

function computePlayerStats(ms, player) {
  const pm = ms.filter(m => [m.wA, m.wB, m.lA, m.lB].includes(player));
  let W = 0, L = 0, T = 0;
  const byFmt = { scramble: { W: 0, L: 0, T: 0 }, singles: { W: 0, L: 0, T: 0 }, 'best ball': { W: 0, L: 0, T: 0 } };
  const byYear = {};
  const partners = {};

  pm.forEach(m => {
    const res = result(m, player);
    if (!res) return;
    if (res === 'W') W++; else if (res === 'L') L++; else T++;
    if (byFmt[m.mf]) {
      if (res === 'W') byFmt[m.mf].W++; else if (res === 'L') byFmt[m.mf].L++; else byFmt[m.mf].T++;
    }
    const yr = m.year;
    if (!byYear[yr]) byYear[yr] = { W: 0, L: 0, T: 0, team: '' };
    if (res === 'W') byYear[yr].W++; else if (res === 'L') byYear[yr].L++; else byYear[yr].T++;
    if (!byYear[yr].team) byYear[yr].team = teamOf(m, player);
    if (m.mf === 'scramble' || m.mf === 'best ball') {
      const myTeam = teamOf(m, player);
      [m.wA, m.wB, m.lA, m.lB].forEach(p => {
        if (p && p !== player && teamOf(m, p) === myTeam) {
          if (!partners[p]) partners[p] = { W: 0, L: 0, T: 0, scramble: 0, bestball: 0 };
          if (res === 'W') partners[p].W++; else if (res === 'L') partners[p].L++; else partners[p].T++;
          if (m.mf === 'scramble') partners[p].scramble++; else partners[p].bestball++;
        }
      });
    }
  });

  const years = [...new Set(pm.map(m => m.year))].sort();

  let bestSeason = { pct: 0, year: null, W: 0, L: 0, T: 0 };
  Object.entries(byYear).forEach(([yr, s]) => {
    const p2 = pct(s.W, s.L, s.T);
    if (p2 > bestSeason.pct || (p2 === bestSeason.pct && s.W > bestSeason.W)) {
      bestSeason = { pct: p2, year: +yr, ...s };
    }
  });

  let teamWins = 0;
  years.forEach(yr => {
    const yrMs = ms.filter(m => m.year === yr);
    const myMatch = yrMs.find(m => [m.wA, m.wB, m.lA, m.lB].includes(player));
    if (!myMatch) return;
    const pt = teamOf(myMatch, player);
    let pA = 0, pB = 0;
    yrMs.forEach(m => { pA += m.pA; pB += m.pB; });
    if ((pt === yrMs[0].tA ? pA : pB) > (pt === yrMs[0].tA ? pB : pA)) teamWins++;
  });

  return { W, L, T, pct: pct(W, L, T), byFmt, byYear, partners, years, yearCount: years.length, bestSeason, teamWins, matches: pm };
}

function computeYearRank(ms, player, year) {
  const yrMs = ms.filter(m => m.year === year);
  const players = allPlayers(yrMs);
  const ranked = players.map(p => {
    const s = computePlayerStats(yrMs, p);
    return { p, pct: s.pct, tot: s.W + s.L + s.T };
  }).filter(x => x.tot > 0).sort((a, b) => b.pct - a.pct || b.tot - a.tot);
  const idx = ranked.findIndex(x => x.p === player);
  return { rank: idx + 1, of: ranked.length };
}

// --- Seed / rank-differential support (added alongside existing engine) ---
// Rosters are the SAME abbreviated player strings used in each year's master CSV
// (canonicalized through can() so e.g. "Ta. Verma" -> "T. Verma" matches the
// canonical identity used everywhere else).

const ROSTER_FILES = [
  'data/Frendsstatistics2022roster.csv',
  'data/Frendsstatistics2023roster.csv',
  'data/Frendsstatistics2024roster.csv',
  'data/Frendsstatistics2025roster.csv',
];

async function loadRosters() {
  const texts = await Promise.all(
    ROSTER_FILES.map(f => fetch(f).then(r => r.text()))
  );
  const rosters = {};
  texts.forEach(csv => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return;
    const header = lines[0].split(',').map(s => s.trim());
    const iYear = header.indexOf('year');
    const iRank = header.indexOf('rank');
    const iPlayer = header.indexOf('player');
    if (iYear < 0 || iRank < 0 || iPlayer < 0) return;
    let year = null;
    const byPlayer = new Map();
    lines.slice(1).forEach(line => {
      const r = line.split(',');
      if (r.length <= iPlayer) return;
      const y = +r[iYear];
      const rk = +r[iRank];
      const name = can((r[iPlayer] || '').trim());
      if (!y || !rk || !name) return;
      year = y;
      byPlayer.set(name, rk);
    });
    if (year != null) rosters[year] = { byPlayer, size: byPlayer.size };
  });
  return rosters;
}

function rankOf(rosters, year, player) {
  const yr = rosters && rosters[year];
  if (!yr) return null;
  const r = yr.byPlayer.get(player);
  return r != null ? r : null;
}

function fieldSize(rosters, year) {
  return rosters && rosters[year] ? rosters[year].size : 0;
}

// Per-year and overall "average rank differential vs. own seed", as a percent.
// matchDiff = ( rank(p) - mean(opponent ranks) ) / (N - 1)
// PerYear  = mean(matchDiff over p's matches in y) * 100
// Overall  = mean(PerYear over years p actually has a value for)  [year-equal]
// Sign: rank 1 = best, so facing lower-numbered opponents -> positive (punched up).
function computeSeedDiff(ms, rosters, player) {
  const byYearMatches = {};
  ms.forEach(m => {
    if (![m.wA, m.wB, m.lA, m.lB].includes(player)) return;
    (byYearMatches[m.year] = byYearMatches[m.year] || []).push(m);
  });

  const byYear = {};
  Object.keys(byYearMatches).forEach(yrKey => {
    const year = +yrKey;
    const matches = byYearMatches[year];
    const myRank = rankOf(rosters, year, player);
    const N = fieldSize(rosters, year);
    if (myRank == null || N < 2) return;

    let sum = 0, count = 0;
    matches.forEach(m => {
      const myTeam = teamOf(m, player);
      if (!myTeam) return;
      const oppNames = [m.wA, m.wB, m.lA, m.lB].filter(o => o && o !== player && teamOf(m, o) && teamOf(m, o) !== myTeam);
      const oppRanks = oppNames.map(o => rankOf(rosters, year, o)).filter(r => r != null);
      if (oppRanks.length === 0) return;
      const meanOpp = oppRanks.reduce((a, b) => a + b, 0) / oppRanks.length;
      sum += (myRank - meanOpp) / (N - 1);
      count++;
    });

    if (count > 0) byYear[year] = (sum / count) * 100;
  });

  const yrVals = Object.values(byYear);
  const overall = yrVals.length ? yrVals.reduce((a, b) => a + b, 0) / yrVals.length : null;
  return { byYear, overall };
}

function fmtSeed(v) {
  if (v == null) return '—';
  const r = Math.round(v);
  if (r === 0) return '0%';
  return r > 0 ? `↑${r}%` : `↓${Math.abs(r)}%`;
}

function seedColor(v) {
  if (v == null) return 'var(--text-tertiary)';
  const r = Math.round(v);
  if (r > 0) return '#1D9E75';
  if (r < 0) return '#D85A30';
  return 'var(--text-tertiary)';
}
