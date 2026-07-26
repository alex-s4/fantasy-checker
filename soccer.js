// ============================================================
//  GameTime Platform — Soccer
//  soccer.js
//
//  Outfielder and Goalie fantasy scoring: Manual mode + Player Search
//  (Fotmob-driven, matching the shape of the existing Soccer DNP Checker
//  on gamebook-checker.html/js — same combobox pattern, same Worker-first/
//  corsproxy-fallback fetch strategy).
//
//  Scoring per the Product Roadmap spec, with corrections confirmed with
//  Alex: Outfielder Red Card is -2 (spec sheet had -0.5, backwards vs
//  Yellow); Shot and Shot on Target are ADDITIVE (a shot on target scores
//  1+1=2, so "Shot" means TOTAL shots including on-target ones). Goalie
//  scoring REPLACED an earlier draft entirely — availability + shot-
//  stopping only (Starting Score/Saves/Goals Conceded/Clean Sheet), no
//  Goal/Assist/Shot for keepers.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox,
} from './shared.js';

// Stat id -> { label, weight }. Order here defines both the compute order
// and the order of lines in the breakdown text, and must stay in sync with
// the table row order in index.html (both Manual's socout-* rows AND
// Player Search's hidden socout-ps-* rows) so "hide zero stats" lines up
// with the right inputs.
const SOCOUT_STATS = [
    { id: 'goal',    label: 'Goal Scored',        weight: 10 },
    { id: 'assist',  label: 'Assist',             weight: 5 },
    { id: 'shot',    label: 'Shot',               weight: 1 },
    { id: 'sot',     label: 'Shot on Target',     weight: 1 },
    { id: 'shotast', label: 'Shots Assisted',     weight: 0.5 },
    { id: 'pass',    label: 'Passes Attempted',   weight: 0.05 },
    { id: 'clr',     label: 'Clearances',         weight: 1 },
    { id: 'tackle',  label: 'Tackles Attempted',  weight: 1 },
    { id: 'dribble', label: 'Attempted Dribbles', weight: 1 },
    { id: 'cross',   label: 'Crosses',            weight: 0.5 },
    { id: 'yc',      label: 'Yellow Cards',       weight: -1 },
    { id: 'rc',      label: 'Red Cards',          weight: -2 },
    { id: 'foul',    label: 'Fouls',              weight: -0.5 },
];

/** Format a points-per-unit label the same way the other cards do
 *  ("0.05 pt", "-2 pts", "10 pts"). */
function socoutWeightLabel(w) {
    return `${w} ${Math.abs(w) === 1 ? 'pt' : 'pts'}`;
}

// ============================================================
//  Fotmob — stat resolver (pure logic, no DOM)
//
//  Every field below was checked against real Fotmob matchDetails
//  responses Alex pasted (Ilya Petrov, Lamine Yamal — outfielders;
//  Maksim Borisko — goalkeeper) with hand-computed expected values before
//  being wired into the UI. See project notes for the full field-by-field
//  confirmation, including two corrections that only surfaced from real
//  data: "Tackles" is ALREADY an attempt count (Fotmob doesn't split
//  successful/attempted the way Passes/Crosses/Dribbles do, which ARE
//  {value, total} fractions where .total is the attempt count), and
//  "YellowRed" (second yellow → sent off) counts as BOTH a yellow AND a
//  red per Alex's explicit ruling — two cards were literally shown.
// ============================================================

/** Flattens a player's stats (spread across "Top stats"/"Attack"/"Defense"/
 *  "Duels" sections) into one { label: statObject } map, keyed by the
 *  human-readable label Fotmob uses consistently across players/matches. */
function fotmobFlattenPlayerStats(playerEntry) {
    const flat = {};
    (playerEntry.stats || []).forEach(section => {
        Object.entries(section.stats || {}).forEach(([label, obj]) => {
            flat[label] = obj.stat;
        });
    });
    return flat;
}
function fotmobStatValue(flat, label) {
    const s = flat[label];
    return s && s.value != null ? s.value : 0;
}
/** For {value, total} fraction stats (Accurate passes/crosses, Successful
 *  dribbles) — .total IS the attempt count. Falls back to .value for plain
 *  (non-fraction) stats so this is safe to call on either shape. */
function fotmobStatTotal(flat, label) {
    const s = flat[label];
    if (!s) return 0;
    return s.total != null ? s.total : (s.value != null ? s.value : 0);
}

/** Counts yellow/red cards for one player from content.matchFacts.events
 *  (the single source for both — confirmed with Alex rather than also
 *  reading the separate header.events.{home,away}TeamRedCards object,
 *  which would double-count). YellowRed counts as one of each. */
function fotmobCardCounts(events, playerId) {
    let yellow = 0, red = 0;
    // DEFENSIVE, TEMPORARY: content.matchFacts.events turned out NOT to be a
    // flat array in real data (confirmed live — Array.isArray check added
    // after a real crash), contrary to what the single pasted example
    // suggested. Coerce to an array where possible so this fails safe
    // (0/0, not a crash) rather than guess at the real container shape —
    // that needs to be confirmed against a real response, not assumed.
    const list = Array.isArray(events) ? events
        : (events && Array.isArray(events.events)) ? events.events
        : [];
    list.forEach(e => {
        if (e.type !== 'Card') return;
        const pid = e.player?.id ?? e.playerId;
        if (pid !== playerId) return;
        if (e.card === 'Yellow') yellow += 1;
        else if (e.card === 'Red') red += 1;
        else if (e.card === 'YellowRed') { yellow += 1; red += 1; }
    });
    return { yellow, red };
}

/** Maps one Fotmob player entry to the exact {id: count} shape SOCOUT_STATS expects. */
function fotmobOutfielderStats(playerEntry, events, playerId) {
    const flat = fotmobFlattenPlayerStats(playerEntry);
    const cards = fotmobCardCounts(events, playerId);
    return {
        goal: fotmobStatValue(flat, 'Goals'),
        assist: fotmobStatValue(flat, 'Assists'),
        shot: fotmobStatValue(flat, 'Total shots'),
        sot: fotmobStatValue(flat, 'Shots on target'),
        shotast: fotmobStatValue(flat, 'Chances created'),
        pass: fotmobStatTotal(flat, 'Accurate passes'),
        clr: fotmobStatValue(flat, 'Clearances'),
        tackle: fotmobStatValue(flat, 'Tackles'),
        dribble: fotmobStatTotal(flat, 'Successful dribbles'),
        cross: fotmobStatTotal(flat, 'Accurate crosses'),
        yc: cards.yellow,
        rc: cards.red,
        foul: fotmobStatValue(flat, 'Fouls committed'),
    };
}

/** Maps one Fotmob goalkeeper entry to {start, saves, ga, cs}. Clean Sheet
 *  is DERIVED (per Alex's explicit choice for Player Search mode): the
 *  keeper must have 0 goals conceded AND played past the 60th minute —
 *  Fotmob's "Minutes played" already accounts for extra time, so this
 *  holds for matches that went to ET without any special-casing. */
function fotmobGoalieStats(playerEntry, startersIds, playerId) {
    const flat = fotmobFlattenPlayerStats(playerEntry);
    const minutes = fotmobStatValue(flat, 'Minutes played');
    const saves = fotmobStatValue(flat, 'Saves');
    const ga = fotmobStatValue(flat, 'Goals conceded');
    return {
        started: startersIds.has(playerId),
        saves, ga, minutes,
        cs: ga === 0 && minutes > 60,
    };
}

// ============================================================
//  Fotmob — fetch helpers
//  Same Worker-first / corsproxy.io-fallback strategy as the migrated
//  Soccer DNP Checker (gamebook-checker.js) — matches?date= is CORS-open
//  and fetched directly with the Worker only as a fallback; matchDetails
//  needs the Worker (or, failing that, the public proxy) since Fotmob never
//  set a CORS header on it for direct browser fetch.
// ============================================================
const FOTMOB_API = 'https://www.fotmob.com/api/data';
const FOTMOB_WORKER = 'https://gametime-nfl-gamebook-proxy.alex-s4.workers.dev/fotmob';
const CORS_PROXY = 'https://corsproxy.io/?url=';

async function fotmobMatchesFetch(dateParam) {
    try {
        const res = await fetch(`${FOTMOB_API}/matches?date=${dateParam}`);
        if (res.ok) return res;
    } catch { /* fall through to the Worker */ }
    return fetch(`${FOTMOB_WORKER}/matches?date=${encodeURIComponent(dateParam)}`);
}
async function fotmobDetailsFetch(matchId) {
    try {
        const res = await fetch(`${FOTMOB_WORKER}/matchDetails?matchId=${encodeURIComponent(matchId)}`);
        if (res.ok) return res;
    } catch { /* Worker unreachable — fall through to the public proxy */ }
    return fetch(CORS_PROXY + encodeURIComponent(`${FOTMOB_API}/matchDetails?matchId=${matchId}`));
}

/** search/suggest — CORS status was unconfirmed when this was built (unlike
 *  matches, which we know is CORS-open), so this defaults to the safer
 *  Worker-first strategy, same as matchDetails/playerData rather than
 *  matches' direct-first one. */
async function fotmobPlayerSearchFetch(term) {
    try {
        const res = await fetch(`${FOTMOB_WORKER}/playerSearch?term=${encodeURIComponent(term)}`);
        if (res.ok) return res;
    } catch { /* fall through */ }
    return fetch(`${FOTMOB_API}/search/suggest?hits=50&lang=en&term=${encodeURIComponent(term)}`);
}

/** playerData — CONFIRMED to need the Worker (Alex tested live; this is
 *  where recentMatches[] comes from, the piece that lets Name Search skip
 *  asking for a date). No corsproxy fallback bothered with here since the
 *  Worker is the known-good path, not a fallback of last resort. */
async function fotmobPlayerDataFetch(playerId) {
    return fetch(`${FOTMOB_WORKER}/playerData?id=${encodeURIComponent(playerId)}`);
}

// ============================================================
//  Shared Name Search UI wiring
//  name → Fotmob player id (autocomplete via search/suggest) → that
//  player's OWN recent matches (via playerData, no date needed) → pick one
//  → matchDetails for the real stats, exactly the same resolver call
//  Player Search uses. Two comboboxes chained instead of Player Search's
//  date-then-team-tabs-then-player flow.
//
//  KNOWN LIMITATION (accepted — rare enough not to worry about): resolves
//  via the player's CURRENT team only. A lookup for a match from before a
//  transfer would find no matching player on today's roster and correctly
//  report nothing, rather than silently attributing stats to the wrong club.
// ============================================================
function initSoccerNameSearch({ prefix, filterIsGoalkeeper, onPlayerSelected }) {
    const nameSearch  = document.querySelector(`#${prefix}-name-search`);
    const namePanel   = document.querySelector(`#${prefix}-name-panel`);
    const nameMsg     = document.querySelector(`#${prefix}-name-msg`);
    const matchRow    = document.querySelector(`#${prefix}-match-row`);
    const matchSearch = document.querySelector(`#${prefix}-match-search`);
    const matchPanel  = document.querySelector(`#${prefix}-match-panel`);
    const fetchMsgEl  = document.querySelector(`#${prefix}-fetch-msg`);
    const matchupEl   = document.querySelector(`#${prefix}-matchup`);

    // Same overflow:hidden-clipping fix as the match-search combobox.
    document.body.appendChild(namePanel);
    document.body.appendChild(matchPanel);
    function positionPanel(panel, anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.left = rect.left + 'px';
        panel.style.width = rect.width + 'px';
    }

    function setNameMsg(msg, type = '') {
        nameMsg.textContent = msg;
        nameMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }
    function setFetchMsg(msg, type = '') {
        fetchMsgEl.textContent = msg;
        fetchMsgEl.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    let nameOptions = [];       // [{id, label, teamName}]
    let selectedPlayer = null;  // the chosen {id, label, teamName}
    let matchOptions = [];      // [{id, label, raw}] from recentMatches
    let selectedMatch = null;

    // ── Name combobox ──
    function renderNamePanel(options, emptyText) {
        namePanel.innerHTML = options.length
            ? options.map(o => `<div class="soccerdnp-dropdown-item" data-id="${o.id}">${o.label}</div>`).join('')
            : `<div class="soccerdnp-dropdown-empty">${emptyText}</div>`;
        positionPanel(namePanel, nameSearch);
        namePanel.style.display = 'block';
    }
    function hideNamePanel() { namePanel.style.display = 'none'; }

    let nameSearchDebounce = null;
    nameSearch.addEventListener('input', () => {
        const term = nameSearch.value.trim();
        clearTimeout(nameSearchDebounce);
        if (term.length < 3) { hideNamePanel(); return; }
        nameSearchDebounce = setTimeout(async () => {
            setNameMsg('Searching…', 'loading');
            try {
                const res = await fotmobPlayerSearchFetch(term);
                if (!res.ok) throw new Error('search request failed');
                const data = await res.json();
                const playersGroup = (data || []).find(g => g.title?.key === 'players') || (data || [])[0];
                const players = (playersGroup?.suggestions || []).filter(s => s.type === 'player' && !s.isCoach);
                // search/suggest returns id as a STRING ("id": "723495"), but
                // matchDetails' player/event ids are NUMBERS — normalize here,
                // once, at the source, rather than at every comparison site
                // downstream (a mismatch here silently broke card counting
                // and matchup lookup, both of which use strict equality;
                // object-key lookups like playerStats[id] happened to still
                // work since JS coerces those, which is exactly why this
                // slipped through initial testing).
                nameOptions = players.map(p => ({ id: Number(p.id), label: `${p.name} (${p.teamName || 'no club'})` }));
                renderNamePanel(nameOptions, 'No players found.');
                setNameMsg(nameOptions.length ? `Found ${nameOptions.length} player(s).` : 'No players found.', nameOptions.length ? 'success' : 'error');
            } catch (err) {
                setNameMsg('Search failed — Fotmob may be unreachable. ' + err.message, 'error');
            }
        }, 300); // debounce so every keystroke doesn't fire a request
    });
    window.addEventListener('scroll', () => { if (namePanel.style.display === 'block') positionPanel(namePanel, nameSearch); }, true);
    window.addEventListener('resize', () => { if (namePanel.style.display === 'block') positionPanel(namePanel, nameSearch); });
    namePanel.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.soccerdnp-dropdown-item');
        if (!item) return;
        e.preventDefault();
        const option = nameOptions.find(o => String(o.id) === item.dataset.id);
        if (!option) return;
        selectedPlayer = option;
        nameSearch.value = option.label;
        hideNamePanel();
        loadPlayerMatches(option.id);
    });
    document.addEventListener('click', (e) => {
        if (!nameSearch.contains(e.target) && !namePanel.contains(e.target)) hideNamePanel();
    });
    nameSearch.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideNamePanel(); nameSearch.blur(); } });

    // ── Match combobox (populated from THIS player's recentMatches) ──
    function renderMatchPanel(query) {
        const q = query.trim().toLowerCase();
        const filtered = q ? matchOptions.filter(o => o.label.toLowerCase().includes(q)) : matchOptions;
        matchPanel.innerHTML = filtered.length
            ? filtered.map(o => `<div class="soccerdnp-dropdown-item" data-id="${o.id}">${o.label}</div>`).join('')
            : '<div class="soccerdnp-dropdown-empty">No matches found.</div>';
        positionPanel(matchPanel, matchSearch);
        matchPanel.style.display = 'block';
    }
    function hideMatchPanel() { matchPanel.style.display = 'none'; }

    matchSearch.addEventListener('focus', () => { if (matchOptions.length) { matchSearch.select(); renderMatchPanel(''); } });
    matchSearch.addEventListener('input', () => renderMatchPanel(matchSearch.value));
    window.addEventListener('scroll', () => { if (matchPanel.style.display === 'block') positionPanel(matchPanel, matchSearch); }, true);
    window.addEventListener('resize', () => { if (matchPanel.style.display === 'block') positionPanel(matchPanel, matchSearch); });
    matchPanel.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.soccerdnp-dropdown-item');
        if (!item) return;
        e.preventDefault();
        const option = matchOptions.find(o => String(o.id) === item.dataset.id);
        if (!option) return;
        selectedMatch = option;
        matchSearch.value = option.label;
        hideMatchPanel();
        loadMatchDetails(option.id, option.raw);
    });
    document.addEventListener('click', (e) => {
        if (!matchRow.contains(e.target) && !matchPanel.contains(e.target)) hideMatchPanel();
    });
    matchSearch.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideMatchPanel(); matchSearch.blur(); } });

    async function loadPlayerMatches(playerId) {
        matchRow.style.display = 'none';
        matchOptions = [];
        selectedMatch = null;
        matchupEl.textContent = '';
        setFetchMsg('Loading recent matches…', 'loading');
        try {
            const res = await fotmobPlayerDataFetch(playerId);
            if (!selectedPlayer || String(selectedPlayer.id) !== String(playerId)) return; // stale guard
            if (!res.ok) throw new Error('playerData request failed');
            const data = await res.json();
            if (!selectedPlayer || String(selectedPlayer.id) !== String(playerId)) return;

            const recent = data.recentMatches || [];
            if (recent.length === 0) {
                setFetchMsg('No recent matches found for this player.', 'error');
                return;
            }
            matchOptions = recent.map(m => {
                const dateStr = new Date(m.matchDate.utcTime).toISOString().slice(0, 10);
                const vs = m.isHomeTeam ? `${m.teamName} vs ${m.opponentTeamName}` : `${m.opponentTeamName} vs ${m.teamName}`;
                return { id: m.id, label: `${dateStr} — ${m.leagueName}: ${vs}`, raw: m };
            });
            matchSearch.value = '';
            matchSearch.placeholder = `Search ${matchOptions.length} recent matches…`;
            matchRow.style.display = 'flex';
            setFetchMsg(`Found ${matchOptions.length} recent match(es). Click the box above to search.`, 'success');
        } catch (err) {
            setFetchMsg('Fetch failed — Fotmob may be unreachable. ' + err.message, 'error');
        }
    }

    async function loadMatchDetails(matchId) {
        setFetchMsg('Loading match…', 'loading');
        try {
            const res = await fotmobDetailsFetch(matchId);
            if (!selectedMatch || String(selectedMatch.id) !== String(matchId)) return; // stale guard
            if (!res.ok) throw new Error('matchDetails request failed');
            const data = await res.json();
            if (!selectedMatch || String(selectedMatch.id) !== String(matchId)) return;

            const playerId = selectedPlayer.id;
            const playerEntry = data.content?.playerStats?.[playerId];
            if (!playerEntry) {
                setFetchMsg("Could not find this player's stats for that match — Fotmob's coverage may not include them for this fixture.", 'error');
                return;
            }

            // Card-type guard: Name Search resolves a SPECIFIC named player,
            // so unlike Player Search's pre-filtered dropdown, we only find
            // out here whether they're a keeper or not. Refuse to silently
            // fill the wrong card's inputs with the wrong shape of data.
            const isGk = !!playerEntry.isGoalkeeper;
            if (isGk !== filterIsGoalkeeper) {
                setFetchMsg(
                    isGk
                        ? 'This player is a goalkeeper — use the Goalie card\'s Name Search instead.'
                        : 'This player is not a goalkeeper — use the Outfielder card\'s Name Search instead.',
                    'error'
                );
                return;
            }

            const lineup = data.content?.lineup;
            let side = null, startersIds = new Set(), opponentName = '';
            if (lineup?.homeTeam && lineup?.awayTeam) {
                for (const s of ['homeTeam', 'awayTeam']) {
                    const all = [...(lineup[s].starters || []), ...(lineup[s].subs || [])];
                    if (all.some(p => p.id === playerId)) { side = s; break; }
                }
                if (side) {
                    startersIds = new Set((lineup[side].starters || []).map(p => p.id));
                    opponentName = lineup[side === 'homeTeam' ? 'awayTeam' : 'homeTeam'].name;
                }
            }
            matchupEl.textContent = opponentName ? `vs ${opponentName}` : '';

            const events = data.content?.matchFacts?.events || [];
            onPlayerSelected({ playerEntry, events, startersIds, playerId, playerName: playerEntry.name });
            setFetchMsg(`Loaded ${playerEntry.name}.`, 'success');
        } catch (err) {
            setFetchMsg('Fetch failed — Fotmob may be unreachable. ' + err.message, 'error');
        }
    }
}

// ============================================================
//  Shared Player Search UI wiring
//  Identical date→matches→searchable-combobox→team-tabs→player-select flow
//  for both cards (ported from the Soccer DNP Checker's soccerdnp-* pattern
//  in gamebook-checker.js) — only what happens AFTER a player is picked
//  differs, via the onPlayerSelected callback.
// ============================================================
function initSoccerMatchSearch({ prefix, filterIsGoalkeeper, onPlayerSelected }) {
    const dateInput    = document.querySelector(`#${prefix}-date`);
    const loadBtn      = document.querySelector(`#${prefix}-load-games-btn`);
    const gameRow       = document.querySelector(`#${prefix}-game-row`);
    const gameSearch    = document.querySelector(`#${prefix}-game-search`);
    const gamePanel     = document.querySelector(`#${prefix}-game-panel`);
    const fetchMsgEl     = document.querySelector(`#${prefix}-fetch-msg`);
    const lineupStatus  = document.querySelector(`#${prefix}-lineup-status`);
    const teamTabs      = document.querySelector(`#${prefix}-team-tabs`);
    const playerRow     = document.querySelector(`#${prefix}-player-row`);
    const playerSelect  = document.querySelector(`#${prefix}-player-select`);
    const matchupEl     = document.querySelector(`#${prefix}-matchup`);

    // Detach the dropdown panel to <body> with position:fixed — .calc-card/
    // .card-body use overflow:hidden for the collapse animation and rounded
    // corners, which would otherwise clip a panel that extends past the
    // card's edge. Same fix as the Soccer DNP Checker's combobox.
    document.body.appendChild(gamePanel);
    function positionPanel() {
        const rect = gameSearch.getBoundingClientRect();
        gamePanel.style.top = (rect.bottom + 4) + 'px';
        gamePanel.style.left = rect.left + 'px';
        gamePanel.style.width = rect.width + 'px';
    }

    // Soccer is global — default to the browser's local date, not Eastern.
    (function initDate() {
        const d = new Date();
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        dateInput.value = local;
    })();

    function setMsg(msg, type = '') {
        fetchMsgEl.textContent = msg;
        fetchMsgEl.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    let allOptions = [];
    let selectedMatch = null;
    let matchData = null; // full matchDetails response, cached after a successful fetch
    let activeSide = null; // 'homeTeam' | 'awayTeam'
    let teamNames = { homeTeam: '', awayTeam: '' };

    function renderPanel(query) {
        const q = query.trim().toLowerCase();
        const filtered = q ? allOptions.filter(o => o.label.toLowerCase().includes(q)) : allOptions;
        gamePanel.innerHTML = filtered.length
            ? filtered.map(o => `<div class="soccerdnp-dropdown-item" data-id="${o.id}">${o.label}</div>`).join('')
            : '<div class="soccerdnp-dropdown-empty">No matches found.</div>';
        positionPanel();
        gamePanel.style.display = 'block';
    }
    function hidePanel() { gamePanel.style.display = 'none'; }

    window.addEventListener('scroll', () => { if (gamePanel.style.display === 'block') positionPanel(); }, true);
    window.addEventListener('resize', () => { if (gamePanel.style.display === 'block') positionPanel(); });

    gameSearch.addEventListener('focus', () => {
        if (allOptions.length === 0) return;
        gameSearch.select();
        renderPanel('');
    });
    gameSearch.addEventListener('input', () => renderPanel(gameSearch.value));
    gamePanel.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.soccerdnp-dropdown-item');
        if (!item) return;
        e.preventDefault();
        const matchId = item.dataset.id;
        const option = allOptions.find(o => String(o.id) === matchId);
        if (!option) return;
        selectedMatch = option;
        gameSearch.value = option.label;
        hidePanel();
        loadMatch(matchId);
    });
    document.addEventListener('click', (e) => {
        if (!gameRow.contains(e.target) && !gamePanel.contains(e.target)) hidePanel();
    });
    gameSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { hidePanel(); gameSearch.blur(); }
    });

    async function loadGames() {
        const dateVal = dateInput.value;
        if (!dateVal) { setMsg('Pick a date first.', 'error'); return; }
        const dateParam = dateVal.replace(/-/g, '');

        loadBtn.disabled = true;
        gameRow.style.display = 'none';
        hidePanel();
        gameSearch.value = '';
        selectedMatch = null;
        matchData = null;
        teamTabs.style.display = 'none';
        playerRow.style.display = 'none';
        lineupStatus.style.display = 'none';
        matchupEl.textContent = '';
        setMsg('Loading matches…', 'loading');

        try {
            const res = await fotmobMatchesFetch(dateParam);
            if (!res.ok) throw new Error('matches request failed');
            const data = await res.json();
            const leagues = data.leagues || [];
            const options = [];
            leagues.forEach(league => {
                (league.matches || []).forEach(m => {
                    options.push({ id: m.id, label: `${league.name}: ${m.home.name} vs ${m.away.name} (${m.time})` });
                });
            });
            if (options.length === 0) { setMsg(`No matches found on ${dateVal}.`, 'error'); return; }
            allOptions = options;
            gameSearch.placeholder = `Search ${options.length} matches…`;
            gameRow.style.display = 'flex';
            setMsg(`Found ${options.length} match(es) on ${dateVal}. Click the box above to search.`, 'success');
        } catch (err) {
            setMsg('Fetch failed — Fotmob may be unreachable. ' + err.message, 'error');
        } finally {
            loadBtn.disabled = false;
        }
    }
    loadBtn.addEventListener('click', loadGames);

    const LINEUP_STATUS_TEXT = {
        standard: { msg: 'Confirmed lineup.', type: 'success' },
        lastStartingLineups: { msg: '⚠ Predicted lineup only — carried over from each team\'s last match, not yet confirmed for this fixture.', type: '' },
        predicted: { msg: '⚠ Predicted lineup only — not yet confirmed for this fixture.', type: '' },
        unavailable: { msg: 'Lineup not available for this match yet.', type: 'error' },
    };

    async function loadMatch(matchId) {
        teamTabs.style.display = 'none';
        playerRow.style.display = 'none';
        lineupStatus.style.display = 'none';
        setMsg('Loading match…', 'loading');
        try {
            const res = await fotmobDetailsFetch(matchId);
            // Stale-response guard: if the user picked a different match
            // while this was in flight, drop the outdated result.
            if (!selectedMatch || String(selectedMatch.id) !== matchId) return;
            if (!res.ok) throw new Error('matchDetails request failed');
            const data = await res.json();
            if (!selectedMatch || String(selectedMatch.id) !== matchId) return;

            const lineup = data.content?.lineup;
            const statusKey = lineup?.lineupType || 'unavailable';
            const statusInfo = LINEUP_STATUS_TEXT[statusKey] || LINEUP_STATUS_TEXT.unavailable;
            lineupStatus.textContent = statusInfo.msg;
            lineupStatus.className = 'manual-note' + (statusInfo.type ? ' fetch-msg--' + statusInfo.type : '');
            lineupStatus.style.display = 'block';

            if (!lineup || statusKey === 'unavailable' || !lineup.homeTeam || !lineup.awayTeam) {
                setMsg('No lineup data to show for this match.', 'error');
                matchData = null;
                return;
            }

            matchData = data;
            teamNames = { homeTeam: lineup.homeTeam.name, awayTeam: lineup.awayTeam.name };
            activeSide = 'homeTeam';
            renderTeamTabs();
            renderPlayerSelect();
            setMsg(`${teamNames.awayTeam} @ ${teamNames.homeTeam} — loaded. Pick a player below.`, 'success');
        } catch (err) {
            setMsg('Fetch failed — Fotmob may be unreachable. ' + err.message, 'error');
        }
    }

    function renderTeamTabs() {
        const sides = ['homeTeam', 'awayTeam'];
        teamTabs.innerHTML = sides.map(side =>
            `<label class="round-pill" style="width:49%">
                <input type="radio" name="${prefix}-team-tab" value="${side}" ${side === activeSide ? 'checked' : ''}> ${teamNames[side]}
             </label>`
        ).join('');
        teamTabs.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                activeSide = radio.value;
                renderPlayerSelect();
            });
        });
        teamTabs.style.display = 'flex';
    }

    // Only players with an actual playerStats entry are offered — a bench
    // player who never appeared has nothing to auto-fill from, so showing
    // them (even correctly labeled) would just be a selectable dead end.
    function renderPlayerSelect() {
        if (!matchData) return;
        const side = matchData.content.lineup[activeSide];
        const all = [...(side.starters || []), ...(side.subs || [])];
        const filtered = all.filter(p => {
            const stats = matchData.content.playerStats?.[p.id];
            if (!stats) return false;
            return filterIsGoalkeeper ? !!stats.isGoalkeeper : !stats.isGoalkeeper;
        });
        playerSelect.innerHTML = '<option value="">Select a player…</option>' +
            filtered.map(p => `<option value="${p.id}">#${p.shirtNumber || '-'} ${p.name}</option>`).join('');
        playerRow.style.display = 'flex';
        if (filtered.length === 0) {
            setMsg(`No ${filterIsGoalkeeper ? 'goalkeepers' : 'outfield players'} with recorded stats for this team.`, 'error');
        }
    }

    playerSelect.addEventListener('change', () => {
        const playerId = Number(playerSelect.value);
        if (!playerId || !matchData) return;
        const playerEntry = matchData.content.playerStats?.[playerId];
        if (!playerEntry) { setMsg("Could not find that player's stats.", 'error'); return; }

        const side = matchData.content.lineup[activeSide];
        const oppositeSide = activeSide === 'homeTeam' ? 'awayTeam' : 'homeTeam';
        matchupEl.textContent = `vs ${teamNames[oppositeSide]}`;

        const startersIds = new Set((side.starters || []).map(p => p.id));
        const events = matchData.content.matchFacts?.events || [];

        onPlayerSelected({ playerEntry, events, startersIds, playerId, playerName: playerEntry.name });
        setMsg(`Loaded ${playerEntry.name}.`, 'success');
    });
}

export function initSoccer() {
    // ── Soccer Outfielder ──────────────────────────────────────
    const socoutTotalEl  = document.querySelector('#socout-total-fs');
    const socoutHeaderEl = document.querySelector('#head-socout');
    let   socoutHzsChk   = document.querySelector('#socout-hzs-checkbox');

    /** Computes + renders one Outfielder stat set. `prefix` selects which
     *  input set to read (socout = Manual, socout-ps = Player Search) and
     *  which total/breakdown elements to write to. Returns the total, since
     *  Player Search needs it for the auto-computed matchup line elsewhere. */
    function computeSocoutFS(prefix, name, hzsChk) {
        const statLines = [];
        let total = 0;

        SOCOUT_STATS.forEach(({ id, label, weight }) => {
            const input = document.getElementById(`${prefix}-${id}`);
            const count = Number(input.value) || 0;
            // Round each line individually before summing, so the displayed
            // per-line values always add up to the printed total — matters
            // because of the 0.05 and 0.5 weights.
            const value = Number((count * weight).toFixed(2));
            total += value;
            const valEl = document.querySelector(`#${prefix}-${id}-val`);
            if (valEl) valEl.innerHTML = `= ${value}`;
            statLines.push(`${label}: ${socoutWeightLabel(weight)} (${count}) = ${value}`);
        });

        total = Number(total.toFixed(2));
        const totalEl = document.querySelector(`#${prefix}-total-fs`);
        if (totalEl) totalEl.innerHTML = total;
        fillEmptyInputs(document.querySelectorAll(`.${prefix.split('-')[0]}-fs`));

        const header = buildHeader(name);
        const breakdown = withHeader(header, buildBreakdown(statLines, total));
        showBreakdown(`#${prefix}-breakdown`, `#${prefix}-textarea-btn-cont`, breakdown);
        if (hzsChk) {
            const allInputs = SOCOUT_STATS.map(({ id }) => document.getElementById(`${prefix}-${id}`));
            return { total, newHzsChk: setupHideZerosCheckbox(hzsChk, `#${prefix}-breakdown`, statLines, allInputs, total, '', header) };
        }
        return { total };
    }

    // Manual mode
    document.querySelector('#socout-btn').addEventListener('click', () => {
        const name = document.getElementById('socout-player-name').value;
        const { newHzsChk } = computeSocoutFS('socout', name, socoutHzsChk);
        if (newHzsChk) socoutHzsChk = newHzsChk;
    });
    document.querySelector('#socout-clear').addEventListener('click', () => {
        document.querySelectorAll('.socout-fs').forEach(i => i.value = '');
        document.querySelectorAll('.socout-val').forEach(v => v.innerHTML = '');
        document.getElementById('socout-player-name').value = '';
        socoutTotalEl.innerHTML = '';
        document.querySelector('#socout-breakdown').innerHTML = '';
        document.querySelector('#socout-textarea-btn-cont').style.display = 'none';
    });
    document.querySelector('#socout-copy').addEventListener('click', () => copyBreakdown('#socout-breakdown'));
    socoutHeaderEl.addEventListener('click', () => toggleSection('#content-socout'));

    // Applies resolved Fotmob stats to whichever input set `prefix` points
    // at (socout-ps-* for Player Search, socout-ns-* for Name Search) and
    // computes — shared so both search modes reuse the exact same logic,
    // not two copies that could drift apart.
    function applyOutfielderStats(prefix, { playerEntry, events, playerId, playerName }) {
        const stats = fotmobOutfielderStats(playerEntry, events, playerId);
        SOCOUT_STATS.forEach(({ id }) => {
            document.getElementById(`${prefix}-${id}`).value = stats[id];
        });
        computeSocoutFS(prefix, playerName, null);
    }

    // Player Search mode — browse by date/match, then pick a player.
    initSoccerMatchSearch({
        prefix: 'socout-ps',
        filterIsGoalkeeper: false,
        onPlayerSelected: (args) => applyOutfielderStats('socout-ps', args),
    });

    // Name Search mode — search by name first, then pick from THAT
    // player's own recent matches (no date needed).
    initSoccerNameSearch({
        prefix: 'socout-ns',
        filterIsGoalkeeper: false,
        onPlayerSelected: (args) => applyOutfielderStats('socout-ns', args),
    });

    // Mode toggle (3-way: Name Search / Player Search / Manual)
    document.querySelectorAll('.socout-mode-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const mode = document.querySelector('input[name="socout-mode"]:checked').id;
            document.getElementById('socout-name-mode').style.display   = mode === 'socout-mode-name'   ? 'block' : 'none';
            document.getElementById('socout-search-mode').style.display = mode === 'socout-mode-search' ? 'block' : 'none';
            document.getElementById('socout-manual-mode').style.display = mode === 'socout-mode-manual' ? 'block' : 'none';
        });
    });

    // ── Soccer Goalie ────────────────────────────────────────
    function socgkCheckCleanSheetContradiction(prefix) {
        const gaEl = document.getElementById(`${prefix}-ga`);
        const csEl = document.getElementById(`${prefix}-cs`);
        const warningEl = document.getElementById(`${prefix}-cs-warning`) || document.getElementById(`${prefix}-cs-note`);
        if (!gaEl || !csEl || !warningEl) return;
        const conceded = Number(gaEl.value) || 0;
        const contradiction = csEl.checked && conceded > 0;
        warningEl.textContent = contradiction
            ? `Clean Sheet is ticked but ${conceded} goal${conceded === 1 ? '' : 's'} conceded — a keeper who conceded can't have a clean sheet. Score still calculated as entered.`
            : '';
        warningEl.style.display = contradiction ? 'block' : 'none';
    }

    /** Computes + renders one Goalie stat set, mirroring computeSocoutFS.
     *  Checkboxes (Starting Score/Clean Sheet) are represented to
     *  setupHideZerosCheckbox via lightweight {value:'1'|'0'} stand-ins,
     *  since it only ever reads `.value`. */
    function computeSocgkFS(prefix, name, hzsChk) {
        const startEl = document.getElementById(`${prefix}-start`);
        const savesEl = document.getElementById(`${prefix}-saves`);
        const gaEl    = document.getElementById(`${prefix}-ga`);
        const csEl    = document.getElementById(`${prefix}-cs`);

        const startCount = startEl.checked ? 1 : 0;
        const savesCount = Number(savesEl.value) || 0;
        const gaCount    = Number(gaEl.value) || 0;
        const csCount    = csEl.checked ? 1 : 0;

        const startVal = startCount * 5;
        const savesVal = savesCount * 2;
        const gaVal    = gaCount * -2;
        const csVal    = csCount * 5;
        const total    = Number((startVal + savesVal + gaVal + csVal).toFixed(2));

        const setInner = (id, html) => { const el = document.querySelector(id); if (el) el.innerHTML = html; };
        setInner(`#${prefix}-start-val`, `= ${startVal}`);
        setInner(`#${prefix}-saves-val`, `= ${savesVal}`);
        setInner(`#${prefix}-ga-val`,    `= ${gaVal}`);
        setInner(`#${prefix}-cs-val`,    `= ${csVal}`);
        const totalEl = document.querySelector(`#${prefix}-total-fs`);
        if (totalEl) totalEl.innerHTML = total;
        fillEmptyInputs(document.querySelectorAll(`.${prefix.split('-')[0]}-fs`));
        socgkCheckCleanSheetContradiction(prefix);

        const statLines = [
            `Starting Score: 5 pts (${startCount}) = ${startVal}`,
            `Saves: 2 pts (${savesCount}) = ${savesVal}`,
            `Goals Conceded: -2 pts (${gaCount}) = ${gaVal}`,
            `Clean Sheet: 5 pts (${csCount}) = ${csVal}`,
        ];
        const header = buildHeader(name);
        const breakdown = withHeader(header, buildBreakdown(statLines, total));
        showBreakdown(`#${prefix}-breakdown`, `#${prefix}-textarea-btn-cont`, breakdown);
        if (hzsChk) {
            const hzsInputs = [{ value: String(startCount) }, savesEl, gaEl, { value: String(csCount) }];
            return { total, newHzsChk: setupHideZerosCheckbox(hzsChk, `#${prefix}-breakdown`, statLines, hzsInputs, total, '', header) };
        }
        return { total };
    }

    let socgkHzsChk = document.querySelector('#socgk-hzs-checkbox');
    document.getElementById('socgk-cs').addEventListener('change', () => socgkCheckCleanSheetContradiction('socgk'));
    document.getElementById('socgk-ga').addEventListener('input', () => socgkCheckCleanSheetContradiction('socgk'));

    document.querySelector('#socgk-btn').addEventListener('click', () => {
        const name = document.getElementById('socgk-player-name').value;
        const { newHzsChk } = computeSocgkFS('socgk', name, socgkHzsChk);
        if (newHzsChk) socgkHzsChk = newHzsChk;
    });
    document.querySelector('#socgk-clear').addEventListener('click', () => {
        document.querySelectorAll('.socgk-fs').forEach(i => i.value = '');
        document.querySelectorAll('.socgk-val').forEach(v => v.innerHTML = '');
        document.getElementById('socgk-start').checked = false;
        document.getElementById('socgk-cs').checked = false;
        document.getElementById('socgk-player-name').value = '';
        document.querySelector('#socgk-total-fs').innerHTML = '';
        document.querySelector('#socgk-cs-warning').style.display = 'none';
        document.querySelector('#socgk-breakdown').innerHTML = '';
        document.querySelector('#socgk-textarea-btn-cont').style.display = 'none';
    });
    document.querySelector('#socgk-copy').addEventListener('click', () => copyBreakdown('#socgk-breakdown'));
    document.querySelector('#head-socgk').addEventListener('click', () => toggleSection('#content-socgk'));

    function applyGoalieStats(prefix, { playerEntry, startersIds, playerId, playerName }) {
        const stats = fotmobGoalieStats(playerEntry, startersIds, playerId);
        document.getElementById(`${prefix}-start`).checked = stats.started;
        document.getElementById(`${prefix}-saves`).value = stats.saves;
        document.getElementById(`${prefix}-ga`).value = stats.ga;
        document.getElementById(`${prefix}-cs`).checked = stats.cs;
        computeSocgkFS(prefix, playerName, null);
    }

    // Player Search mode
    initSoccerMatchSearch({
        prefix: 'socgk-ps',
        filterIsGoalkeeper: true,
        onPlayerSelected: (args) => applyGoalieStats('socgk-ps', args),
    });

    // Name Search mode
    initSoccerNameSearch({
        prefix: 'socgk-ns',
        filterIsGoalkeeper: true,
        onPlayerSelected: (args) => applyGoalieStats('socgk-ns', args),
    });

    document.querySelectorAll('.socgk-mode-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const mode = document.querySelector('input[name="socgk-mode"]:checked').id;
            document.getElementById('socgk-name-mode').style.display   = mode === 'socgk-mode-name'   ? 'block' : 'none';
            document.getElementById('socgk-search-mode').style.display = mode === 'socgk-mode-search' ? 'block' : 'none';
            document.getElementById('socgk-manual-mode').style.display = mode === 'socgk-mode-manual' ? 'block' : 'none';
        });
    });
}