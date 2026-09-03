# Frends Invitational — Project Guide for Claude Code

This is a static GitHub Pages site for a Ryder Cup-style golf tournament, served at
frendsinvitational.com from the `main` branch of PattyStump/frends-invitational.
Read this file fully before making changes.

## Repo layout
- `index.html` — home page
- `2026.html` — current tournament year page
- `stats/index.html` — all-time leaderboard (clicking a player name opens their profile
  in place; the leaderboard is the default view)
- `stats/player.html` — standalone player profile page (kept as a fallback; still
  reachable by direct link and via deep links like player.html?p=Name)
- `stats/profile.js` — SHARED profile-rendering code (renderProfile, updateAvatar,
  handlePhoto, onPlayerChange, plus PHOTOS/ALL_MATCHES state). Both stats pages load it.
- `stats/data.js` — the DATA ENGINE. Fetches the CSVs, parses matches, exposes
  loadAllMatches(), allPlayers(), computePlayerStats(), pct(), colorP(), borderP(),
  teamOf(), result(), computeYearRank(). **DO NOT MODIFY data.js** unless explicitly
  asked — it is verified-correct and everything depends on it.
- `stats/style.css` — shared styling for all pages
- `stats/data/` — one CSV per year (2022-2025), the source of truth for all stats
- `CNAME` — points the custom domain at GitHub Pages

## How the site computes stats
There is NO precomputed results file on the site. data.js reads the CSVs and computes
every record, the leaderboard, and player profiles live in the browser on page load.
So editing a CSV is what "regenerates" the stats — there is nothing else to update.

## DATA RULES (the tournament's conventions)
- format: legacy (2022) or modern (2023 onward)
- Modern: each player plays exactly 4 matches (2 scrambles + 1 singles + 1 best ball).
  Legacy: exactly 6 (2 singles + 2 best balls + 2 scrambles).
- Ties: tie=YES, points split evenly. For scramble/best ball ties, one pair goes in the
  winner columns and one pair in the loser columns — NEVER leave loser columns blank on
  a pair tie (that silently drops a match from both losers). A pair is two players from
  the SAME team facing a pair from the other team.
- A player not equalling their expected match total (4 modern / 6 legacy) is a RED FLAG
  for a malformed row — often a tie with blank loser columns. Always verify W+L+T totals.
- Player aliases: only add a second letter when two players share the same last name AND
  the same first initial (e.g. Ma. Baker / Mi. Baker). Otherwise use just the first
  initial even if multiple players share it (e.g. T. Pylypow, T. Banks, T. Walker all
  stay as T. since their last names differ).
- Team names by year: 2022 Team Ma. Baker vs Team Yuzdepski; 2023 Team D. Dittmer vs
  Team O. Goosen; 2024 Team J. Woods vs Team B. Dazzan; 2025 Team J. Ross vs Team R. Nieman;
  2026 Team Dumas (captain D. Dumas) vs Team Walker (captain T. Walker).

## 2026 SEASON (conventions — read before entering any 2026 results)
- Teams: Team Dumas (D. Dumas) vs Team Walker (T. Walker). 24 players; the rosters and
  draft tiers live in the 2026.html "Teams" section (each team = 4 per tier, tiers 1-3).
- Data file: `stats/data/2026master.csv` (already registered in DATA_FILES in data.js).
  Editing it is what updates records, profiles, and the all-time leaderboard.
- NON-STANDARD FORMAT — 5 events, but individual records count only 4 matches/player:
  - Fri: 2-man scramble, Evergreen, 6 matches (tee 1:00-1:50 pm)
  - Sat AM: 2-man scramble, Evergreen, 6 matches (10:00-10:50 am)
  - Sat PM: 4-man scramble, ROLLING PINES (different course), 8-somes, 3 matches, tier
    vs tier (4:50/5:00/5:10 pm)
  - Sun: best ball + individual singles, Evergreen (10:00-10:50 am).
    [Confirm exact counts before Sunday scoring — assumed ~6 best ball + ~12 singles.]
- FOUR-MAN SCRAMBLE = TEAM POINTS ONLY. Do NOT put its players in individual records.
  Log each four-man match as a POINTS-ONLY CSV row: fill team_a/pts_team_a and
  team_b/pts_team_b, leave all four player columns (winner_a/b, loser_a/b) BLANK. Blank
  player rows are ignored by allPlayers()/computePlayerStats() (records unaffected) but
  their points still count in the team-title sum. So each player's 2026 record must
  verify to W+L+T = 4 (Fri, Sat AM, Sun best ball, Sun singles), NOT 5.
- POINTS: 1 per match, EXCEPT Sunday singles = 0.5. Ties split 0.5/0.5. Total in play =
  27 -> 14 to win (13.5 apiece = tie).
- SCOREBOARD (2026.html, Ryder Cup style, updated by hand from entered results): each
  side's score, "needs X to win" (= 14 - score), a race bar (fill widths = pts/27, clinch
  line at centre), and the "14 points to win / 27 in play" caption.
- MATCH OUTCOMES in the Matches area (2026.html, display only — not read from the CSV):
  - 2-man / best ball / singles: winning pair BOLD (.mp-win), losing pair dimmed
    (.mp-lose), margin (e.g. 4&3, 1 up) in green (.mp-res) beside the winner; ties show
    "Halved" (.mp-res.halved).
  - Four-man: shown per tier as Team Dumas vs Team Walker, winner bold + margin beside;
    tie = Halved.
- NEW PLAYER: Eli Mearns ("E. Mearns") — added via EXTRA_PLAYERS in data.js so he gets a
  0-0-0 profile/leaderboard row before playing. UPCOMING_PARTNERS in profile.js shows his
  TBD Friday partner (R. Nieman); remove him from UPCOMING_PARTNERS once that match is
  entered.
- DAILY LOOP: caller gives winners + margins (+ "halved" for ties) -> enter that day's
  rows in 2026master.csv (read back, verify W+L+T per player and the day's point totals)
  -> update the scoreboard + Matches outcomes in 2026.html -> preview -> push.

## WORKFLOW RULES (how I like to work)
- One change at a time. Build it, let me verify it in the browser, THEN move on. Don't
  stack multiple unverified changes.
- The terminal's streaming/diff preview is unreliable and often shows garbled or
  duplicated content that is NOT what's on disk. NEVER ask me to verify code from a diff
  preview. To verify, either (a) run `grep -c` on the actual file and show me the counts,
  or (b) write the file and let me open it / preview it in the browser. Bytes on disk and
  the browser are the only sources of truth.
- For any visual/UI change, I preview locally before pushing. Serve from the repo root:
  `python3 -m http.server 8000`, then open http://localhost:8000/stats/index.html.
  (Serve from root, not stats/, because pages use path-relative links and data.js fetches
  data/*.csv relative to stats/.)
- After I confirm in the browser, commit and push. Pushing is set up via the gh CLI, so
  no credentials are needed. The site serves from `main`.
- If you work on a branch and open a PR, tell me CLEARLY — the changes are NOT live
  until the PR is merged into `main`. Do NOT say something is "live" or "done" when it
  is only on a branch. Always verify the change reached main before declaring done.
- After merge, GitHub Pages takes ~1 minute to rebuild. Browser/CDN caching can hide the
  update — confirm with a hard refresh (Cmd+Shift+R) or an incognito window.
- Reuse existing code rather than duplicating it (e.g. profile rendering lives only in
  profile.js, not copied inline).
- Prefer plain-prose answers over tables/box-drawing — they paste cleanly and cost less.

## GROUND RULES (from the project)
- I call out the winners; you enter them exactly as told.
- After every block of data entry, read it back before moving on.
- Never tell me something is done unless verified by reading the file.
- Verify day totals against source before moving to the next day.
- Verify W+L+T = expected match count for every player before finalizing results.
- At the start of each new year, confirm: teams, roster, course name(s) per day, block
  count, and scoresheet colour convention before entering any data.
