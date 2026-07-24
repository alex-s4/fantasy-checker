// ============================================================
//  GameTime Platform — MLB (Pitcher + Hitter)
//  mlb.js
//
//  Both share infra (MLB_API, resolveMlbPlayer, IP<->outs helpers,
//  initMlbTeamTable drill-down) so they live in one file rather than two —
//  splitting them further would just mean re-importing the shared bits
//  across files for no real benefit. Confirmed self-contained during the
//  split — nothing outside this block references these functions, and
//  this block doesn't reach into any other sport.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox,
} from './shared.js';

export function initMlb() {
    // ========================================================
    //  MLB — shared infra (API base, player resolver, drill-down helpers)
    // ========================================================
    // Data source: statsapi.mlb.com/api/v1 (official, free, no auth).
    const MLB_API = 'https://statsapi.mlb.com/api/v1';

    /** Resolve a player name to their MLB person record for a given season. */
    async function resolveMlbPlayer(name, season) {
        const res = await fetch(`${MLB_API}/sports/1/players?season=${season}`);
        if (!res.ok) throw new Error('player list request failed');
        const data = await res.json();
        const target = name.trim().toLowerCase();
        const people = data.people || [];
        return people.find(p => p.fullName.toLowerCase() === target)
            || people.find(p => p.fullName.toLowerCase().includes(target))
            || null;
    }
    // Innings pitched helpers: "6.2" ⇄ total outs (2 outs = 0.2 IP)
    function ipToOuts(ip) {
        const n = Number(ip) || 0;
        const whole = Math.floor(n);
        const frac  = Math.round((n - whole) * 10); // 0, 1, or 2
        return whole * 3 + frac;
    }
    function outsToIp(outs) {
        return `${Math.floor(outs / 3)}.${outs % 3}`;
    }

    /** Fantasy score + breakdown-line builders — pure functions, shared
     *  between Manual/Name-Search's Go handlers and Player Search's table,
     *  so the formula only lives in one place. */
    function computePitcherFS(s) {
        const outs = s.outs ?? ipToOuts(s.inningsPitched || '0.0');
        const winVal = (s.wins || 0) > 0 ? 6 : 0;
        const erVal  = (s.earnedRuns || 0) * -3;
        const kVal   = (s.strikeOuts || 0) * 3;
        const outVal = outs;
        const qsVal  = ((s.earnedRuns || 0) <= 3 && outs >= 18) ? 4 : 0; // 18 outs = 6 IP
        const total = winVal + qsVal + erVal + kVal + outVal;
        return { total: Number(total.toFixed(1)), winVal, qsVal, erVal, kVal, outVal, outs };
    }
    function pitcherStatLines(s, r) {
        return [
            `Win: 6 pts = ${r.winVal}`,
            `Quality Start: 4 pts = ${r.qsVal}`,
            `Earned Run: -3 pt (${s.earnedRuns || 0}) = ${r.erVal}`,
            `Strikeout: 3 pt (${s.strikeOuts || 0}) = ${r.kVal}`,
            `Out: 1 pt (${r.outs}) = ${r.outVal}`,
        ];
    }
    function computeHitterFS(s) {
        const singles = Math.max(0, (s.hits || 0) - (s.doubles || 0) - (s.triples || 0) - (s.homeRuns || 0));
        const singVal = singles * 3;
        const doubVal = (s.doubles || 0) * 5;
        const tripVal = (s.triples || 0) * 8;
        const hrVal   = (s.homeRuns || 0) * 10;
        const rVal    = (s.runs || 0) * 2;
        const rbiVal  = (s.rbi || 0) * 2;
        const bobVal  = (s.baseOnBalls || 0) * 2;
        const hbpVal  = (s.hitByPitch || 0) * 2;
        const sbVal   = (s.stolenBases || 0) * 5;
        const total = singVal + doubVal + tripVal + hrVal + rVal + rbiVal + bobVal + hbpVal + sbVal;
        return { total: Number(total.toFixed(1)), singles, singVal, doubVal, tripVal, hrVal, rVal, rbiVal, bobVal, hbpVal, sbVal };
    }
    function hitterStatLines(s, r) {
        return [
            `Single: 3 pts (${r.singles}) = ${r.singVal}`,
            `Double: 5 pts (${s.doubles || 0}) = ${r.doubVal}`,
            `Triple: 8 pts (${s.triples || 0}) = ${r.tripVal}`,
            `Home Run: 10 pts (${s.homeRuns || 0}) = ${r.hrVal}`,
            `Run: 2 pts (${s.runs || 0}) = ${r.rVal}`,
            `Run Batted In: 2 pts (${s.rbi || 0}) = ${r.rbiVal}`,
            `Base On Balls: 2 pts (${s.baseOnBalls || 0}) = ${r.bobVal}`,
            `Hit By Pitch: 2 pts (${s.hitByPitch || 0}) = ${r.hbpVal}`,
            `Stolen Base: 5 pts (${s.stolenBases || 0}) = ${r.sbVal}`,
        ];
    }

    /**
     * Player Search mode, shared by Pitcher/Hitter: date → league → pick
     * ONE game → both teams' rosters computed and shown at once in a
     * table (team tabs to switch sides), click a value for its breakdown.
     * Unlike the old drill-down (date→league→game→team→player, one
     * player at a time), this surfaces the whole game in one view — no
     * PDF here (MLB.com doesn't publish a gamebook like NBA/WNBA do), so
     * this is built straight from the same boxscore JSON the old
     * drill-down already fetched, just reorganized into a table instead
     * of a 3rd dropdown.
     */
    function initMlbTeamTable({ prefix, statCategory, computeFS, buildStatLines }) {
        const dateInput      = document.querySelector(`#${prefix}-date`);
        const loadGamesBtn   = document.querySelector(`#${prefix}-load-games-btn`);
        const gameRow        = document.querySelector(`#${prefix}-game-row`);
        const gameSelect     = document.querySelector(`#${prefix}-game-select`);
        const fetchMsg       = document.querySelector(`#${prefix}-ps-fetch-msg`);
        const teamTabs       = document.querySelector(`#${prefix}-ps-team-tabs`);
        const resultsWrap    = document.querySelector(`#${prefix}-ps-results-wrap`);
        const resultsHead    = document.querySelector(`#${prefix}-ps-results-head`);
        const resultsBody    = document.querySelector(`#${prefix}-ps-results-body`);
        const breakdownLabel = document.querySelector(`#${prefix}-ps-breakdown-label`);
        const breakdownArea  = document.querySelector(`#${prefix}-ps-breakdown-area`);
        const breakdownEl    = document.querySelector(`#${prefix}-ps-breakdown`);
        const breakdownCopy  = document.querySelector(`#${prefix}-ps-breakdown-copy`);

        function setMsg(msg, type = '') {
            fetchMsg.textContent = msg;
            fetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
        }
        function hideResults() {
            teamTabs.innerHTML = ''; teamTabs.style.display = 'none';
            resultsWrap.style.display = 'none';
            breakdownLabel.style.display = 'none'; breakdownArea.style.display = 'none';
        }

        let gamesCache = {};
        let lastRows = [];       // flat list across both teams, for click lookup
        let activeTeam = null;

        function getSelectedSportId() {
            return document.querySelector(`input[name="${prefix}-league"]:checked`)?.value || '1';
        }

        async function loadGames() {
            const date = dateInput.value;
            if (!date) { setMsg('Pick a date first.', 'error'); return; }
            const sportId = getSelectedSportId();
            loadGamesBtn.disabled = true;
            gameRow.style.display = 'none';
            gameSelect.innerHTML = '';
            hideResults();
            setMsg('Loading games…', 'loading');
            try {
                const res = await fetch(`${MLB_API}/schedule?sportId=${sportId}&date=${date}`);
                if (!res.ok) throw new Error('schedule request failed');
                const data = await res.json();
                const games = data.dates?.[0]?.games || [];
                gamesCache = {};
                games.forEach(g => { gamesCache[g.gamePk] = g; });
                if (games.length === 0) { setMsg(`No games found on ${date}.`, 'error'); return; }
                gameSelect.innerHTML = '<option value="">Select a game…</option>' +
                    games.map(g => {
                        const dhSuffix = g.doubleHeader !== 'N' ? ` (Game ${g.gameNumber})` : '';
                        return `<option value="${g.gamePk}">${g.teams.away.team.name} @ ${g.teams.home.team.name}${dhSuffix}</option>`;
                    }).join('');
                gameRow.style.display = 'flex';
                setMsg(`Found ${games.length} game(s) on ${date}.`, 'success');
            } catch (err) {
                setMsg('Fetch failed — the MLB API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
            } finally {
                loadGamesBtn.disabled = false;
            }
        }
        loadGamesBtn.addEventListener('click', loadGames);

        async function fetchBoxscore(gamePk) {
            const res = await fetch(`${MLB_API}/game/${gamePk}/boxscore`, { cache: 'no-store' });
            if (!res.ok) throw new Error('boxscore request failed');
            const data = await res.json();
            return data.teams || {};
        }

        /** Build rows for one team — only players with real stats in this
         *  category (an empty stats object means a full-game DNP). */
        function buildRowsForTeam(teamsData, homeAwayKey, teamName) {
            const players = Object.values(teamsData[homeAwayKey]?.players || {});
            return players
                .filter(p => Object.keys(p.stats?.[statCategory] || {}).length > 0)
                .map(p => {
                    const stats = p.stats[statCategory];
                    const r = computeFS(stats);
                    return {
                        team: teamName, jersey: p.jerseyNumber || '-', name: p.person.fullName,
                        fs: r.total, statLines: buildStatLines(stats, r),
                    };
                });
        }

        function renderResults() {
            const rows = lastRows.filter(r => r.team === activeTeam);
            resultsHead.innerHTML = '<tr><th>#</th><th>Player</th><th>Total FS</th></tr>';
            resultsBody.innerHTML = rows.map(r =>
                `<tr><td>#${r.jersey}</td><td>${r.name}</td><td><span class="gamebook-cell-clickable" data-key="${r.team}__${r.jersey}">${r.fs}</span></td></tr>`
            ).join('');
            resultsWrap.style.display = 'block';
        }

        resultsBody.addEventListener('click', e => {
            const cell = e.target.closest('.gamebook-cell-clickable');
            if (!cell) return;
            const row = lastRows.find(r => `${r.team}__${r.jersey}` === cell.dataset.key);
            if (!row) return;
            resultsBody.querySelectorAll('.gamebook-cell-active').forEach(el => el.classList.remove('gamebook-cell-active'));
            cell.classList.add('gamebook-cell-active');
            const header = buildHeader(row.name);
            breakdownEl.value = `${header}\n${row.statLines.join('\n')}\n\nTOTAL FS = ${row.fs}`;
            breakdownLabel.style.display = 'block';
            breakdownArea.style.display = 'block';
        });
        breakdownCopy.addEventListener('click', () => {
            breakdownEl.select();
            breakdownEl.setSelectionRange(0, 99999);
            triggerToastBtn.click();
            navigator.clipboard.writeText(breakdownEl.value);
        });

        gameSelect.addEventListener('change', async () => {
            const gamePk = gameSelect.value;
            hideResults();
            if (!gamePk || !gamesCache[gamePk]) return;

            setMsg('Loading rosters…', 'loading');
            try {
                const teamsData = await fetchBoxscore(gamePk);
                const g = gamesCache[gamePk];
                const awayName = g.teams.away.team.name;
                const homeName = g.teams.home.team.name;

                lastRows = [
                    ...buildRowsForTeam(teamsData, 'away', awayName),
                    ...buildRowsForTeam(teamsData, 'home', homeName),
                ];

                if (lastRows.length === 0) {
                    setMsg('No players with stats found for that game.', 'error');
                    return;
                }

                const teams = [awayName, homeName];
                activeTeam = teams[0];
                teamTabs.innerHTML = teams.map(t =>
                    `<label class="round-pill" style="width:${Math.floor(100 / teams.length) - 1}%">
                        <input type="radio" name="${prefix}-ps-team-tab" value="${t}" ${t === activeTeam ? 'checked' : ''}> ${t}
                     </label>`
                ).join('');
                teamTabs.querySelectorAll('input[type="radio"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        activeTeam = radio.value;
                        breakdownLabel.style.display = 'none'; breakdownArea.style.display = 'none';
                        renderResults();
                    });
                });
                teamTabs.style.display = 'flex';

                renderResults();
                setMsg(`Loaded ${lastRows.length} player(s). Click any value for its breakdown.`, 'success');
            } catch (err) {
                setMsg('Fetch failed — the MLB API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
            }
        });
    }

    // ========================================================
    //  MLB PITCHER
    // ========================================================
    const bsballpHeaderEl = document.querySelector('#head-bsballp');
    bsballpHeaderEl.addEventListener('click', () => toggleSection('#content-bsballp'));

    // ── Mode toggle (Player Search / Name Search / Manual) ──
    document.querySelectorAll('.bsballp-mode-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const isSearch = document.getElementById('bsballp-mode-search').checked;
            const isName   = document.getElementById('bsballp-mode-name').checked;
            const isManual = !isSearch && !isName;
            document.getElementById('bsballp-search-mode').style.display = isSearch ? 'block' : 'none';
            document.getElementById('bsballp-name-mode').style.display   = isName   ? 'block' : 'none';
            document.getElementById('bsballp-manual-mode').style.display = isManual ? 'block' : 'none';
            document.getElementById('bsballp-date-row').style.display    = isManual ? 'none'  : 'block';
        });
    });

    // ── Manual mode (keeps the original bsballp-* IDs) ──
    const bsballpTotalEl  = document.querySelector('#bsballp-total-fs');
    const bsballpGoBtn    = document.querySelector('#bsballp-btn');
    const bsballpClearBtn = document.querySelector('#bsballp-clear');
    const bsballpCopyBtn  = document.querySelector('#bsballp-copy');
    let   bsballpHzsChk   = document.querySelector('#bsballp-hzs-checkbox');
    const bsballpInputs = document.querySelectorAll('.bsballp-fs');
    const bsballpVals   = document.querySelectorAll('#bsballp-manual-mode .bsballp-val');
    const bsballpWinInput = document.getElementById('bsballp-win');
    const bsballpWinChk   = document.getElementById('bsballp-win-checkbox');
    const bsballpQSInput  = document.getElementById('bsballp-qs');
    const bsballpER       = document.getElementById('bsballp-er');
    const bsballpK        = document.getElementById('bsballp-k');
    const bsballpOut      = document.getElementById('bsballp-out');
    bsballpGoBtn.addEventListener('click', () => {
        const rawOuts = ipToOuts(bsballpOut.value);
        const r = computePitcherFS({ wins: bsballpWinChk.checked ? 1 : 0, earnedRuns: Number(bsballpER.value), strikeOuts: Number(bsballpK.value), outs: rawOuts });
        bsballpWinInput.value = bsballpWinChk.checked ? 1 : 0;
        bsballpQSInput.value  = r.qsVal ? 1 : 0;
        document.querySelector('#bsballp-win-val').innerHTML = `= ${r.winVal}`;
        document.querySelector('#bsballp-qs-val').innerHTML  = `= ${r.qsVal}`;
        document.querySelector('#bsballp-er-val').innerHTML  = `= ${r.erVal}`;
        document.querySelector('#bsballp-k-val').innerHTML   = `= ${r.kVal}`;
        document.querySelector('#bsballp-out-val').innerHTML = `= ${r.outVal}`;
        bsballpTotalEl.innerHTML = r.total;
        fillEmptyInputs(bsballpInputs);
        const statLines = pitcherStatLines({ earnedRuns: Number(bsballpER.value), strikeOuts: Number(bsballpK.value) }, r);
        const bsballpHeader   = buildHeader(document.getElementById('bsballp-player-name').value);
        const bsballpBreakdown = withHeader(bsballpHeader, buildBreakdown(statLines, r.total));
        showBreakdown('#bsballp-breakdown', '#bsballp-textarea-btn-cont', bsballpBreakdown);
        document.getElementById('bsballp-breakdown-wrap').style.display = 'block';
        bsballpHzsChk = setupHideZerosCheckbox(bsballpHzsChk, '#bsballp-breakdown', statLines, bsballpInputs, r.total, '', bsballpHeader);
    });
    bsballpClearBtn.addEventListener('click', () => {
        bsballpInputs.forEach(i => i.value = '');
        bsballpVals.forEach(v => v.innerHTML = '');
        bsballpWinChk.checked = false;
        document.getElementById('bsballp-player-name').value = '';
        bsballpTotalEl.innerHTML = '';
        document.querySelector('#bsballp-breakdown').innerHTML = '';
        document.querySelector('#bsballp-textarea-btn-cont').style.display = 'none';
        document.getElementById('bsballp-breakdown-wrap').style.display = 'none';
    });
    bsballpCopyBtn.addEventListener('click', () => copyBreakdown('#bsballp-breakdown'));

    // ── Name Search mode (fully independent — own fields, own breakdown) ──
    const bsballpFetchBtn      = document.querySelector('#bsballp-fetch-btn');
    const bsballpDateInput     = document.querySelector('#bsballp-date');
    const bsballpNsPlayerName  = document.querySelector('#bsballp-ns-player-name');
    const bsballpNsFetchMsg    = document.querySelector('#bsballp-ns-fetch-msg');
    const bsballpNsMatchup     = document.querySelector('#bsballp-ns-matchup');
    const bsballpNsInputs = document.querySelectorAll('.bsballp-ns-fs');
    const bsballpNsVals   = document.querySelectorAll('#bsballp-name-mode .bsballp-ns-val');
    const bsballpNsWinInput = document.getElementById('bsballp-ns-win');
    const bsballpNsWinChk   = document.getElementById('bsballp-ns-win-checkbox');
    const bsballpNsQSInput  = document.getElementById('bsballp-ns-qs');
    const bsballpNsER       = document.getElementById('bsballp-ns-er');
    const bsballpNsK        = document.getElementById('bsballp-ns-k');
    const bsballpNsOut      = document.getElementById('bsballp-ns-out');
    const bsballpNsTotalEl  = document.querySelector('#bsballp-ns-total-fs');
    const bsballpNsGoBtn    = document.querySelector('#bsballp-ns-btn');
    const bsballpNsClearBtn = document.querySelector('#bsballp-ns-clear');
    const bsballpNsCopyBtn  = document.querySelector('#bsballp-ns-copy');
    let   bsballpNsHzsChk   = document.querySelector('#bsballp-ns-hzs-checkbox');
    bsballpNsGoBtn.addEventListener('click', () => {
        const rawOuts = ipToOuts(bsballpNsOut.value);
        const r = computePitcherFS({ wins: bsballpNsWinChk.checked ? 1 : 0, earnedRuns: Number(bsballpNsER.value), strikeOuts: Number(bsballpNsK.value), outs: rawOuts });
        bsballpNsWinInput.value = bsballpNsWinChk.checked ? 1 : 0;
        bsballpNsQSInput.value  = r.qsVal ? 1 : 0;
        document.querySelector('#bsballp-ns-win-val').innerHTML = `= ${r.winVal}`;
        document.querySelector('#bsballp-ns-qs-val').innerHTML  = `= ${r.qsVal}`;
        document.querySelector('#bsballp-ns-er-val').innerHTML  = `= ${r.erVal}`;
        document.querySelector('#bsballp-ns-k-val').innerHTML   = `= ${r.kVal}`;
        document.querySelector('#bsballp-ns-out-val').innerHTML = `= ${r.outVal}`;
        bsballpNsTotalEl.innerHTML = r.total;
        fillEmptyInputs(bsballpNsInputs);
        const statLines = pitcherStatLines({ earnedRuns: Number(bsballpNsER.value), strikeOuts: Number(bsballpNsK.value) }, r);
        const header = buildHeader(bsballpNsPlayerName.value);
        const breakdown = withHeader(header, buildBreakdown(statLines, r.total));
        showBreakdown('#bsballp-ns-breakdown', '#bsballp-ns-textarea-btn-cont', breakdown);
        document.getElementById('bsballp-ns-breakdown-wrap').style.display = 'block';
        bsballpNsHzsChk = setupHideZerosCheckbox(bsballpNsHzsChk, '#bsballp-ns-breakdown', statLines, bsballpNsInputs, r.total, '', header);
    });
    bsballpNsClearBtn.addEventListener('click', () => {
        bsballpNsInputs.forEach(i => i.value = '');
        bsballpNsVals.forEach(v => v.innerHTML = '');
        bsballpNsWinChk.checked = false;
        bsballpNsPlayerName.value = '';
        bsballpNsTotalEl.innerHTML = '';
        document.querySelector('#bsballp-ns-breakdown').innerHTML = '';
        document.querySelector('#bsballp-ns-textarea-btn-cont').style.display = 'none';
        document.getElementById('bsballp-ns-breakdown-wrap').style.display = 'none';
        bsballpNsMatchup.textContent = '';
        bsballpNsFetchMsg.textContent = '';
    });
    bsballpNsCopyBtn.addEventListener('click', () => copyBreakdown('#bsballp-ns-breakdown'));

    function setPitcherFetchMsg(msg, type = '') {
        bsballpNsFetchMsg.textContent = msg;
        bsballpNsFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }
    async function fetchMlbPitcherStats() {
        const name = bsballpNsPlayerName.value.trim();
        const date = bsballpDateInput.value;
        if (!name) { setPitcherFetchMsg('Enter a player name first.', 'error'); return; }
        if (!date) { setPitcherFetchMsg('Pick a date first.', 'error'); return; }
        const season = date.slice(0, 4);
        bsballpFetchBtn.disabled = true;
        bsballpNsMatchup.textContent = '';
        setPitcherFetchMsg('Looking up player…', 'loading');
        try {
            const player = await resolveMlbPlayer(name, season);
            if (!player) {
                setPitcherFetchMsg(`No MLB player matching "${name}" in ${season}.`, 'error');
                return;
            }
            setPitcherFetchMsg(`Found ${player.fullName}. Fetching game log…`, 'loading');
            const res = await fetch(`${MLB_API}/people/${player.id}/stats?stats=gameLog&group=pitching&season=${season}`);
            if (!res.ok) throw new Error('game log request failed');
            const data = await res.json();
            const splits = data.stats?.[0]?.splits || [];
            const games  = splits.filter(s => s.date === date);
            if (games.length === 0) {
                setPitcherFetchMsg(`${player.fullName} has no pitching log on ${date}.`, 'error');
                return;
            }
            const agg = games.reduce((a, g) => {
                const s = g.stat || {};
                a.earnedRuns += s.earnedRuns || 0;
                a.strikeOuts += s.strikeOuts || 0;
                a.wins       += s.wins       || 0;
                a.outs       += ipToOuts(s.inningsPitched);
                return a;
            }, { earnedRuns:0, strikeOuts:0, wins:0, outs:0 });
            bsballpNsER.value  = agg.earnedRuns;
            bsballpNsK.value   = agg.strikeOuts;
            bsballpNsOut.value = outsToIp(agg.outs);
            bsballpNsWinChk.checked = agg.wins > 0;
            const g0 = games[0];
            if (g0.team?.name && g0.opponent?.name) {
                bsballpNsMatchup.textContent = `${g0.team.name} vs ${g0.opponent.name}`;
            }
            const dhNote = games.length > 1 ? ` (${games.length} games combined)` : '';
            setPitcherFetchMsg(`Loaded ${player.fullName} — ${date}${dhNote}.`, 'success');
            bsballpNsGoBtn.click(); // auto-calculate
        } catch (err) {
            setPitcherFetchMsg(
                'Fetch failed — the MLB API may be unreachable or blocking browser requests (CORS). ' + err.message,
                'error'
            );
        } finally {
            bsballpFetchBtn.disabled = false;
        }
    }
    bsballpFetchBtn.addEventListener('click', fetchMlbPitcherStats);

    initMlbTeamTable({ prefix: 'bsballp', statCategory: 'pitching', computeFS: computePitcherFS, buildStatLines: pitcherStatLines });

    // ========================================================
    //  MLB HITTER
    // ========================================================
    const bsballhHeaderEl = document.querySelector('#head-bsballh');
    bsballhHeaderEl.addEventListener('click', () => toggleSection('#content-bsballh'));

    // ── Mode toggle (Player Search / Name Search / Manual) ──
    document.querySelectorAll('.bsballh-mode-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const isSearch = document.getElementById('bsballh-mode-search').checked;
            const isName   = document.getElementById('bsballh-mode-name').checked;
            const isManual = !isSearch && !isName;
            document.getElementById('bsballh-search-mode').style.display = isSearch ? 'block' : 'none';
            document.getElementById('bsballh-name-mode').style.display   = isName   ? 'block' : 'none';
            document.getElementById('bsballh-manual-mode').style.display = isManual ? 'block' : 'none';
            document.getElementById('bsballh-date-row').style.display    = isManual ? 'none'  : 'block';
        });
    });

    // ── Manual mode (keeps the original bsballh-* IDs) ──
    const bsballhTotalEl  = document.querySelector('#bsballh-total-fs');
    const bsballhGoBtn    = document.querySelector('#bsballh-btn');
    const bsballhClearBtn = document.querySelector('#bsballh-clear');
    const bsballhCopyBtn  = document.querySelector('#bsballh-copy');
    let   bsballhHzsChk   = document.querySelector('#bsballh-hzs-checkbox');
    const bsballhInputs = document.querySelectorAll('.bsballh-fs');
    const bsballhVals   = document.querySelectorAll('#bsballh-manual-mode .bsballh-val');
    const bsballhSing = document.getElementById('bsballh-sing');
    const bsballhDoub = document.getElementById('bsballh-doub');
    const bsballhTrip = document.getElementById('bsballh-trip');
    const bsballhHR   = document.getElementById('bsballh-hr');
    const bsballhR    = document.getElementById('bsballh-r');
    const bsballhRBI  = document.getElementById('bsballh-rbi');
    const bsballhBOB  = document.getElementById('bsballh-bob');
    const bsballhHBP  = document.getElementById('bsballh-hbp');
    const bsballhSB   = document.getElementById('bsballh-sb');
    bsballhGoBtn.addEventListener('click', () => {
        const r = computeHitterFS({
            hits: Number(bsballhSing.value) + Number(bsballhDoub.value) + Number(bsballhTrip.value) + Number(bsballhHR.value),
            doubles: Number(bsballhDoub.value), triples: Number(bsballhTrip.value), homeRuns: Number(bsballhHR.value),
            runs: Number(bsballhR.value), rbi: Number(bsballhRBI.value), baseOnBalls: Number(bsballhBOB.value),
            hitByPitch: Number(bsballhHBP.value), stolenBases: Number(bsballhSB.value),
        });
        document.querySelector('#bsballh-sing-val').innerHTML = `= ${r.singVal}`;
        document.querySelector('#bsballh-doub-val').innerHTML = `= ${r.doubVal}`;
        document.querySelector('#bsballh-trip-val').innerHTML = `= ${r.tripVal}`;
        document.querySelector('#bsballh-hr-val').innerHTML   = `= ${r.hrVal}`;
        document.querySelector('#bsballh-r-val').innerHTML    = `= ${r.rVal}`;
        document.querySelector('#bsballh-rbi-val').innerHTML  = `= ${r.rbiVal}`;
        document.querySelector('#bsballh-bob-val').innerHTML  = `= ${r.bobVal}`;
        document.querySelector('#bsballh-hbp-val').innerHTML  = `= ${r.hbpVal}`;
        document.querySelector('#bsballh-sb-val').innerHTML   = `= ${r.sbVal}`;
        bsballhTotalEl.innerHTML = r.total;
        fillEmptyInputs(bsballhInputs);
        const statLines = hitterStatLines({
            doubles: Number(bsballhDoub.value), triples: Number(bsballhTrip.value), homeRuns: Number(bsballhHR.value),
            runs: Number(bsballhR.value), rbi: Number(bsballhRBI.value), baseOnBalls: Number(bsballhBOB.value),
            hitByPitch: Number(bsballhHBP.value), stolenBases: Number(bsballhSB.value),
        }, r);
        const bsballhHeader   = buildHeader(document.getElementById('bsballh-player-name').value);
        const bsballhBreakdown = withHeader(bsballhHeader, buildBreakdown(statLines, r.total));
        showBreakdown('#bsballh-breakdown', '#bsballh-textarea-btn-cont', bsballhBreakdown);
        document.getElementById('bsballh-breakdown-wrap').style.display = 'block';
        bsballhHzsChk = setupHideZerosCheckbox(bsballhHzsChk, '#bsballh-breakdown', statLines, bsballhInputs, r.total, '', bsballhHeader);
    });
    bsballhClearBtn.addEventListener('click', () => {
        bsballhInputs.forEach(i => i.value = '');
        bsballhVals.forEach(v => v.innerHTML = '');
        document.getElementById('bsballh-player-name').value = '';
        bsballhTotalEl.innerHTML = '';
        document.querySelector('#bsballh-breakdown').innerHTML = '';
        document.querySelector('#bsballh-textarea-btn-cont').style.display = 'none';
        document.getElementById('bsballh-breakdown-wrap').style.display = 'none';
    });
    bsballhCopyBtn.addEventListener('click', () => copyBreakdown('#bsballh-breakdown'));

    // ── Name Search mode (fully independent — own fields, own breakdown) ──
    const bsballhFetchBtn     = document.querySelector('#bsballh-fetch-btn');
    const bsballhDateInput    = document.querySelector('#bsballh-date');
    const bsballhNsPlayerName = document.querySelector('#bsballh-ns-player-name');
    const bsballhNsFetchMsg   = document.querySelector('#bsballh-ns-fetch-msg');
    const bsballhNsMatchup    = document.querySelector('#bsballh-ns-matchup');
    const bsballhNsInputs = document.querySelectorAll('.bsballh-ns-fs');
    const bsballhNsVals   = document.querySelectorAll('#bsballh-name-mode .bsballh-ns-val');
    const bsballhNsSing = document.getElementById('bsballh-ns-sing');
    const bsballhNsDoub = document.getElementById('bsballh-ns-doub');
    const bsballhNsTrip = document.getElementById('bsballh-ns-trip');
    const bsballhNsHR   = document.getElementById('bsballh-ns-hr');
    const bsballhNsR    = document.getElementById('bsballh-ns-r');
    const bsballhNsRBI  = document.getElementById('bsballh-ns-rbi');
    const bsballhNsBOB  = document.getElementById('bsballh-ns-bob');
    const bsballhNsHBP  = document.getElementById('bsballh-ns-hbp');
    const bsballhNsSB   = document.getElementById('bsballh-ns-sb');
    const bsballhNsTotalEl  = document.querySelector('#bsballh-ns-total-fs');
    const bsballhNsGoBtn    = document.querySelector('#bsballh-ns-btn');
    const bsballhNsClearBtn = document.querySelector('#bsballh-ns-clear');
    const bsballhNsCopyBtn  = document.querySelector('#bsballh-ns-copy');
    let   bsballhNsHzsChk   = document.querySelector('#bsballh-ns-hzs-checkbox');
    bsballhNsGoBtn.addEventListener('click', () => {
        const r = computeHitterFS({
            hits: Number(bsballhNsSing.value) + Number(bsballhNsDoub.value) + Number(bsballhNsTrip.value) + Number(bsballhNsHR.value),
            doubles: Number(bsballhNsDoub.value), triples: Number(bsballhNsTrip.value), homeRuns: Number(bsballhNsHR.value),
            runs: Number(bsballhNsR.value), rbi: Number(bsballhNsRBI.value), baseOnBalls: Number(bsballhNsBOB.value),
            hitByPitch: Number(bsballhNsHBP.value), stolenBases: Number(bsballhNsSB.value),
        });
        document.querySelector('#bsballh-ns-sing-val').innerHTML = `= ${r.singVal}`;
        document.querySelector('#bsballh-ns-doub-val').innerHTML = `= ${r.doubVal}`;
        document.querySelector('#bsballh-ns-trip-val').innerHTML = `= ${r.tripVal}`;
        document.querySelector('#bsballh-ns-hr-val').innerHTML   = `= ${r.hrVal}`;
        document.querySelector('#bsballh-ns-r-val').innerHTML    = `= ${r.rVal}`;
        document.querySelector('#bsballh-ns-rbi-val').innerHTML  = `= ${r.rbiVal}`;
        document.querySelector('#bsballh-ns-bob-val').innerHTML  = `= ${r.bobVal}`;
        document.querySelector('#bsballh-ns-hbp-val').innerHTML  = `= ${r.hbpVal}`;
        document.querySelector('#bsballh-ns-sb-val').innerHTML   = `= ${r.sbVal}`;
        bsballhNsTotalEl.innerHTML = r.total;
        fillEmptyInputs(bsballhNsInputs);
        const statLines = hitterStatLines({
            doubles: Number(bsballhNsDoub.value), triples: Number(bsballhNsTrip.value), homeRuns: Number(bsballhNsHR.value),
            runs: Number(bsballhNsR.value), rbi: Number(bsballhNsRBI.value), baseOnBalls: Number(bsballhNsBOB.value),
            hitByPitch: Number(bsballhNsHBP.value), stolenBases: Number(bsballhNsSB.value),
        }, r);
        const header = buildHeader(bsballhNsPlayerName.value);
        const breakdown = withHeader(header, buildBreakdown(statLines, r.total));
        showBreakdown('#bsballh-ns-breakdown', '#bsballh-ns-textarea-btn-cont', breakdown);
        document.getElementById('bsballh-ns-breakdown-wrap').style.display = 'block';
        bsballhNsHzsChk = setupHideZerosCheckbox(bsballhNsHzsChk, '#bsballh-ns-breakdown', statLines, bsballhNsInputs, r.total, '', header);
    });
    bsballhNsClearBtn.addEventListener('click', () => {
        bsballhNsInputs.forEach(i => i.value = '');
        bsballhNsVals.forEach(v => v.innerHTML = '');
        bsballhNsPlayerName.value = '';
        bsballhNsTotalEl.innerHTML = '';
        document.querySelector('#bsballh-ns-breakdown').innerHTML = '';
        document.querySelector('#bsballh-ns-textarea-btn-cont').style.display = 'none';
        document.getElementById('bsballh-ns-breakdown-wrap').style.display = 'none';
        bsballhNsMatchup.textContent = '';
        bsballhNsFetchMsg.textContent = '';
    });
    bsballhNsCopyBtn.addEventListener('click', () => copyBreakdown('#bsballh-ns-breakdown'));

    function setHitterFetchMsg(msg, type = '') {
        bsballhNsFetchMsg.textContent = msg;
        bsballhNsFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }
    async function fetchMlbHitterStats() {
        const name = bsballhNsPlayerName.value.trim();
        const date = bsballhDateInput.value;
        if (!name) { setHitterFetchMsg('Enter a player name first.', 'error'); return; }
        if (!date) { setHitterFetchMsg('Pick a date first.', 'error'); return; }
        const season = date.slice(0, 4);
        bsballhFetchBtn.disabled = true;
        setHitterFetchMsg('Looking up player…', 'loading');
        bsballhNsMatchup.textContent = '';
        try {
            const player = await resolveMlbPlayer(name, season);
            if (!player) {
                setHitterFetchMsg(`No MLB player matching "${name}" in ${season}.`, 'error');
                return;
            }
            setHitterFetchMsg(`Found ${player.fullName}. Fetching game log…`, 'loading');
            const res = await fetch(`${MLB_API}/people/${player.id}/stats?stats=gameLog&group=hitting&season=${season}`);
            if (!res.ok) throw new Error('game log request failed');
            const data = await res.json();
            const splits = data.stats?.[0]?.splits || [];
            const games  = splits.filter(s => s.date === date);
            if (games.length === 0) {
                setHitterFetchMsg(`${player.fullName} has no hitting log on ${date}.`, 'error');
                return;
            }
            const agg = games.reduce((a, g) => {
                const s = g.stat || {};
                a.hits     += s.hits        || 0;
                a.doubles  += s.doubles     || 0;
                a.triples  += s.triples     || 0;
                a.homeRuns += s.homeRuns    || 0;
                a.runs     += s.runs        || 0;
                a.rbi      += s.rbi         || 0;
                a.bb       += s.baseOnBalls || 0;
                a.hbp      += s.hitByPitch  || 0;
                a.sb       += s.stolenBases || 0;
                return a;
            }, { hits:0, doubles:0, triples:0, homeRuns:0, runs:0, rbi:0, bb:0, hbp:0, sb:0 });
            const singles = Math.max(0, agg.hits - agg.doubles - agg.triples - agg.homeRuns);
            bsballhNsSing.value = singles;
            bsballhNsDoub.value = agg.doubles;
            bsballhNsTrip.value = agg.triples;
            bsballhNsHR.value   = agg.homeRuns;
            bsballhNsR.value    = agg.runs;
            bsballhNsRBI.value  = agg.rbi;
            bsballhNsBOB.value  = agg.bb;
            bsballhNsHBP.value  = agg.hbp;
            bsballhNsSB.value   = agg.sb;
            const dhNote = games.length > 1 ? ` (${games.length} games combined)` : '';
            setHitterFetchMsg(`Loaded ${player.fullName} — ${date}${dhNote}.`, 'success');
            const g0       = games[0];
            const teamName = g0.team?.name || '';
            const oppName  = g0.opponent?.name || '';
            if (teamName && oppName) {
                bsballhNsMatchup.textContent = `${teamName} vs ${oppName}`;
            }
            bsballhNsGoBtn.click(); // auto-calculate
        } catch (err) {
            setHitterFetchMsg(
                'Fetch failed — the MLB API may be unreachable or blocking browser requests (CORS). ' + err.message,
                'error'
            );
        } finally {
            bsballhFetchBtn.disabled = false;
        }
    }
    bsballhFetchBtn.addEventListener('click', fetchMlbHitterStats);

    initMlbTeamTable({ prefix: 'bsballh', statCategory: 'batting', computeFS: computeHitterFS, buildStatLines: hitterStatLines });

} // end initMlb