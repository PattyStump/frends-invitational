// Frends Invitational — shared player-profile rendering
// Used by both stats/player.html (standalone page) and stats/index.html (in-place panel).
// Depends on the globals defined in data.js (computePlayerStats, pct, colorP, borderP,
// teamOf, result, computeYearRank, allPlayers). data.js must be loaded before this file.

const PHOTOS = {};
let ALL_MATCHES = [];
let ROSTERS = null;

function handlePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const player = document.getElementById('playerSelect').value;
  const reader = new FileReader();
  reader.onload = ev => { PHOTOS[player] = ev.target.result; updateAvatar(player); };
  reader.readAsDataURL(file);
}

function updateAvatar(player) {
  const wrap = document.getElementById('avatarWrap');
  const initial = document.getElementById('avatarInitial');
  const existing = wrap.querySelector('img');
  if (existing) existing.remove();
  if (PHOTOS[player]) {
    initial.style.display = 'none';
    const img = document.createElement('img');
    img.src = PHOTOS[player];
    wrap.insertBefore(img, wrap.querySelector('.avatar-overlay'));
  } else {
    initial.style.display = '';
    const parts = player.split(' ');
    initial.textContent = parts[parts.length - 1].charAt(0).toUpperCase();
  }
}

function onPlayerChange() {
  const player = document.getElementById('playerSelect').value;
  if (player) {
    const url = new URL(window.location);
    url.searchParams.set('p', player);
    window.history.replaceState({}, '', url);
    renderProfile(player);
  }
}

function renderProfile(player) {
  const ms = ALL_MATCHES;
  const s = computePlayerStats(ms, player);
  const { W, L, T, byFmt, byYear, partners, years, yearCount, teamWins } = s;
  const total = W + L + T;
  const wp = pct(W, L, T);

  document.getElementById('playerName').textContent = player;
  document.getElementById('playerMeta').textContent = `${years.join(' · ')} · ${total} matches`;
  updateAvatar(player);

  const wPct = total ? Math.round(W / total * 100) : 0;
  const tPct = total ? Math.round(T / total * 100) : 0;
  const lPct = 100 - wPct - tPct;

  const allYrRanks = {};
  years.forEach(yr => { allYrRanks[yr] = computeYearRank(ms, player, yr); });
  const seedByYear = ROSTERS ? computeSeedDiff(ms, ROSTERS, player).byYear : {};

  const fmts = [['scramble', 'Scramble'], ['singles', 'Singles'], ['best ball', 'Best ball']];
  const formatBarsHTML = fmts.map(([k, label]) => {
    const f = byFmt[k];
    const p2 = pct(f.W, f.L, f.T);
    const tot2 = f.W + f.L + f.T;
    if (!tot2) return `<div class="bar-row"><div class="bar-label">${label}</div><div style="font-size:11px;color:var(--text-tertiary)">No data</div></div>`;
    const col = colorP(p2);
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${p2}%;background:${col}"></div></div>
      <div class="bar-right"><span class="bar-rec">${f.W}-${f.L}-${f.T}</span><span class="bar-pct" style="color:${col}">${p2}%</span></div>
    </div>`;
  }).join('');

  const yearCardsHTML = years.map(yr => {
    const y = byYear[yr];
    const p2 = pct(y.W, y.L, y.T);
    const rk = allYrRanks[yr];
    const ts = y.team.replace('Team ', '');
    const sv = seedByYear[yr];
    const seedInline = (sv != null)
      ? ` <span style="color:${seedColor(sv)};font-weight:400" title="Faced opponents better (↑) or worse (↓) than your own seed, on average.">(${fmtSeed(sv)})</span>`
      : '';
    return `<div class="year-card" style="border-left-color:${borderP(p2)}">
      <div class="yr">${yr}</div>
      <div class="yr-record">${y.W}-${y.L}-${y.T}</div>
      <div class="yr-pct" style="color:${colorP(p2)}">${p2}%${seedInline}</div>
      <div class="yr-team">${ts}</div>
      <div class="yr-rank">#${rk.rank} of ${rk.of}</div>
    </div>`;
  }).join('');

  const partnerArr = Object.entries(partners)
    .map(([name, r]) => ({ name, ...r, pct: pct(r.W, r.L, r.T), tot: r.W + r.L + r.T }))
    .filter(x => x.tot > 0)
    .sort((a, b) => b.pct - a.pct || b.tot - a.tot);

  const partnersHTML = !partnerArr.length
    ? '<div class="no-data">No paired match data</div>'
    : partnerArr.slice(0, 8).map(p2 => {
      const col = colorP(p2.pct);
      const parts = [];
      if (p2.scramble > 0) parts.push(`${p2.scramble} scramble`);
      if (p2.bestball > 0) parts.push(`${p2.bestball} best ball`);
      return `<div class="partner-row">
        <span class="partner-name">${p2.name}</span>
        <span class="partner-detail">${parts.join(' · ')}</span>
        <span class="partner-rec">${p2.W}-${p2.L}-${p2.T}</span>
        <span class="partner-pct" style="color:${col}">${p2.pct}%</span>
      </div>`;
    }).join('');

  const days = ['Fri', 'Sat', 'Sun'];
  const fmtLabel = { scramble: 'Scramble', singles: 'Singles', 'best ball': 'Best ball' };
  const sorted = s.matches.slice().sort((a, b) => a.year - b.year || a.day - b.day);
  const matchRowsHTML = sorted.map(m => {
    const res = result(m, player);
    const resCls = res === 'W' ? 'res-w' : res === 'L' ? 'res-l' : 'res-t';
    const myTeam = teamOf(m, player);
    const prtnrs = [m.wA, m.wB, m.lA, m.lB].filter(p2 => p2 && p2 !== player && teamOf(m, p2) === myTeam);
    const opps = [m.wA, m.wB, m.lA, m.lB].filter(p2 => p2 && p2 !== player && teamOf(m, p2) !== myTeam);
    return `<tr>
      <td class="${resCls}">${res}</td>
      <td>${m.year}</td>
      <td style="color:var(--text-tertiary)">${days[m.day - 1]}</td>
      <td>${fmtLabel[m.mf] || m.mf}</td>
      <td>${prtnrs.join(', ') || '—'}</td>
      <td style="color:var(--text-secondary)">${opps.join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  document.getElementById('profileBody').innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="val">${W}-${L}-${T}</div><div class="lbl">Career W-L-T</div></div>
      <div class="stat-box"><div class="val">${wp}%</div><div class="lbl">Career win %</div></div>
      <div class="stat-box"><div class="val">${teamWins}/${yearCount}</div><div class="lbl">Team titles</div></div>
    </div>

    <div class="section">
      <div class="section-head">Win · Tie · Loss</div>
      <div class="wlt-bar">
        ${W > 0 ? `<div class="wlt-seg" style="width:${wPct}%;background:#1D9E75"></div>` : ''}
        ${T > 0 ? `<div class="wlt-seg" style="width:${tPct}%;background:#EF9F27"></div>` : ''}
        ${L > 0 ? `<div class="wlt-seg" style="flex:1;background:var(--bg-secondary)"></div>` : ''}
      </div>
      <div class="wlt-labels">
        <div class="wlt-label"><div class="wlt-dot" style="background:#1D9E75"></div><strong>${W}</strong>&nbsp;wins&nbsp;${wPct}%</div>
        ${T > 0 ? `<div class="wlt-label"><div class="wlt-dot" style="background:#EF9F27"></div><strong>${T}</strong>&nbsp;ties&nbsp;${tPct}%</div>` : ''}
        <div class="wlt-label"><div class="wlt-dot" style="background:var(--border-mid)"></div><strong>${L}</strong>&nbsp;losses&nbsp;${lPct}%</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">By format</div>
      ${formatBarsHTML}
    </div>

    <div class="section">
      <div class="section-head">Year by year</div>
      <div class="year-grid">${yearCardsHTML}</div>
    </div>

    <div class="section">
      <div class="section-head">Best partners · combined scramble + best ball record</div>
      <div class="partner-list">${partnersHTML}</div>
    </div>

    <div class="section">
      <div class="section-head">Match log</div>
      <table class="match-table">
        <thead><tr>
          <th style="width:28px">Res</th>
          <th style="width:40px">Year</th>
          <th style="width:28px">Day</th>
          <th style="width:74px">Format</th>
          <th>Partner(s)</th>
          <th>Opponent(s)</th>
        </tr></thead>
        <tbody>${matchRowsHTML}</tbody>
      </table>
    </div>`;
}
