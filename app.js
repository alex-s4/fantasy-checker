// ============================================================
//  GameTime Platform — Fantasy Score Calculator
//  app.js
// ============================================================
window.onload = function () {
    // --------------------------------------------------------
    //  BOOTSTRAP INIT
    // --------------------------------------------------------
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    [...popoverTriggerList].map(el => new bootstrap.Popover(el));
    const toastTrigger      = document.getElementById('liveToastBtn');
    const toastLiveExample  = document.getElementById('liveToast');
    const triggerToastBtn   = document.getElementById('liveToastBtn'); // used to fire "Copied!" toast
    if (toastTrigger) {
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample);
        toastTrigger.addEventListener('click', () => toastBootstrap.show());
    }
    // --------------------------------------------------------
    //  SHARED UTILITIES
    // --------------------------------------------------------
    /** Fill empty inputs with "0" so the breakdown text is never blank. */
    function fillEmptyInputs(inputs) {
        inputs.forEach(input => {
            if (input.value === '') input.value = 0;
        });
    }
    /** Build a plain-text breakdown string from an array of stat lines + total. */
    function buildBreakdown(statLines, total, trailText = '') {
        return statLines.join('\n') + (trailText ? '\n' + trailText : '') + '\n\nTOTAL FS = ' + total;
    }
    /** Build the same breakdown but skipping lines whose matching input is "0". */
    function buildBreakdownHideZeros(statLines, inputs, total, trailText = '') {
        const filtered = statLines.filter((_, i) => inputs[i] && inputs[i].value !== '0');
        return filtered.join('\n') + (trailText ? '\n' + trailText : '') + '\n\nTOTAL FS = ' + total;
    }
    /** Write text to the breakdown textarea and show the copy-button container. */
    function showBreakdown(textareaId, btnContId, text) {
        document.querySelector(textareaId).innerHTML = text;
        document.querySelector(btnContId).style.display = 'block';
    }
    /** Build breakdown header line from name + optional period label.
     *  - With period:  "LeBron James - 1Q FS" or "1Q FS" (no name)
     *  - Without:      "LeBron James FS"        or ""     (no name, no period)
     */
    function buildHeader(name, period) {
        const n = (name || '').trim();
        const p = period || '';
        if (n && p)  return `${n} - ${p} FS`;
        if (n)       return `${n} FS`;
        if (p)       return `${p} FS`;
        return '';
    }
    /** Prepend header to a breakdown string if header is non-empty. */
    function withHeader(header, breakdown) {
        return header ? `${header}\n${breakdown}` : breakdown;
    }
    function toggleSection(contentSelector) {
        const el = document.querySelector(contentSelector);
        el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    }
    /** Copy a textarea's contents to the clipboard and trigger the toast. */
    function copyBreakdown(textareaSelector) {
        const el = document.querySelector(textareaSelector);
        el.select();
        el.setSelectionRange(0, 99999);
        triggerToastBtn.click();
        navigator.clipboard.writeText(el.value);
    }
    /**
     * Wire up the "Hide zero stats" checkbox.
     * Must be called inside the Go-button handler (after statLines + total are known).
     */
    function setupHideZerosCheckbox(checkbox, textareaId, statLines, inputs, total, trailText = '', header = '') {
        const fresh = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(fresh, checkbox);
        fresh.checked = false;
        fresh.addEventListener('click', () => {
            const body = fresh.checked
                ? buildBreakdownHideZeros(statLines, inputs, total, trailText)
                : buildBreakdown(statLines, total, trailText);
            document.querySelector(textareaId).innerHTML = withHeader(header, body);
        });
        return fresh;
    }
    /** Get the checked radio value from a NodeList; returns 0 if none checked. */
    function getCheckedRadioValue(radios) {
        for (const r of radios) {
            if (r.checked) return Number(r.value);
        }
        return 0;
    }

    // --------------------------------------------------------
    //  DEFAULT DATES — today in Eastern Time
    // --------------------------------------------------------
    function getTodayEasternDateStr() {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date());
    }
    const todayET = getTodayEasternDateStr();
    ['#bball-date', '#bsballh-date', '#bsballp-date', '#fballo-date'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.value = todayET;
    });

    // ========================================================
    //  BASKETBALL (NBA / WNBA / CBB)
    // ========================================================
    const bballTotalEl     = document.querySelector('#bball-total-fs');
    const bballGoBtn       = document.querySelector('#bball-btn');
    const bballClearBtn    = document.querySelector('#bball-clear');
    const bballCopyBtn     = document.querySelector('#bball-copy');
    const bballHeaderEl    = document.querySelector('#head-bball');
    let   bballHzsChk      = document.querySelector('#bball-hzs-checkbox');
    const bballInputs = document.querySelectorAll('.bball-fs');
    const bballVals   = document.querySelectorAll('.bball-val');
    const bballPts  = document.getElementById('bball-pts');
    const bballRebs = document.getElementById('bball-rebs');
    const bballAst  = document.getElementById('bball-asst');
    const bballBlk  = document.getElementById('bball-blk');
    const bballStl  = document.getElementById('bball-stl');
    const bballTo   = document.getElementById('bball-to');
    bballGoBtn.addEventListener('click', () => {
        const ptsVal  = Number(bballPts.value);
        const rebsVal = Number((Number(bballRebs.value) * 1.2).toFixed(1));
        const astVal  = Number((Number(bballAst.value)  * 1.5).toFixed(1));
        const blkVal  = Number(bballBlk.value) * 3;
        const stlVal  = Number(bballStl.value) * 3;
        const toVal   = Number(bballTo.value)  * -1;
        const total = Number((ptsVal + rebsVal + astVal + blkVal + stlVal + toVal).toFixed(1));
        // Update inline value displays
        document.querySelector('#bball-points-val').innerHTML   = `= ${ptsVal}`;
        document.querySelector('#bball-rebounds-val').innerHTML = `= ${rebsVal}`;
        document.querySelector('#bball-assists-val').innerHTML  = `= ${astVal}`;
        document.querySelector('#bball-blocks-val').innerHTML   = `= ${blkVal}`;
        document.querySelector('#bball-steals-val').innerHTML   = `= ${stlVal}`;
        document.querySelector('#bball-turnovers-val').innerHTML= `= ${toVal}`;
        bballTotalEl.innerHTML = total;
        fillEmptyInputs(bballInputs);
        const statLines = [
            `Points: 1 pt (${bballPts.value}) = ${ptsVal}`,
            `Rebound: 1.2 pts (${bballRebs.value}) = ${rebsVal}`,
            `Assist: 1.5 pts (${bballAst.value}) = ${astVal}`,
            `Block: 3 pts (${bballBlk.value}) = ${blkVal}`,
            `Steal: 3 pts (${bballStl.value}) = ${stlVal}`,
            `Turnover: -1 pt (${bballTo.value}) = ${toVal}`,
        ];
        const bballHeader = buildHeader(
            document.getElementById('bball-player-name').value,
            document.querySelector('input[name="bball-period"]:checked')?.value
        );
        const bballBreakdown = withHeader(bballHeader, buildBreakdown(statLines, total));
        showBreakdown('#bball-breakdown', '#bball-textarea-btn-cont', bballBreakdown);
        bballHzsChk = setupHideZerosCheckbox(bballHzsChk, '#bball-breakdown', statLines, bballInputs, total, '', bballHeader);
    });
    bballClearBtn.addEventListener('click', () => {
        bballInputs.forEach(i => i.value = '');
        bballVals.forEach(v => v.innerHTML = '');
        document.getElementById('bball-player-name').value = '';
        bballTotalEl.innerHTML = '';
        document.querySelector('#bball-breakdown').innerHTML = '';
        document.querySelector('#bball-textarea-btn-cont').style.display = 'none';
        document.getElementById('bball-matchup').textContent = '';
        document.getElementById('bball-fetch-msg').textContent = '';
        bballGameSelect.innerHTML = '';
        bballTeamSelect.innerHTML = '';
        bballPlayerSelect.innerHTML = '';
        bballGameRow.style.display = 'none';
        bballTeamRow.style.display = 'none';
        bballPlayerRow.style.display = 'none';
    });
    bballCopyBtn.addEventListener('click',   () => copyBreakdown('#bball-breakdown'));
    bballHeaderEl.addEventListener('click',  () => toggleSection('#content-bball'));
    // ── Basketball — Auto-fill from ESPN (NBA) ────────────────────
    // Data source: ESPN's public site API (undocumented, no auth).
    // Flow: name → athlete ID (search) → season game log → match date → fields.
    const ESPN_SEARCH_API = 'https://site.api.espn.com/apis/search/v2';
    const ESPN_NBA_API    = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
    const bballFetchBtn  = document.querySelector('#bball-fetch-btn');
    const bballDateInput = document.querySelector('#bball-date');
    const bballFetchMsg  = document.querySelector('#bball-fetch-msg');
    const bballMatchup   = document.querySelector('#bball-matchup');
    function setBballFetchMsg(msg, type = '') {
        bballFetchMsg.textContent = msg;
        bballFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }
    /** NBA season is labeled by its ending year (e.g. Oct 2025 - Jun 2026 => season "2026"). */
    function seasonFromDate(dateStr) {
        const d = new Date(dateStr);
        const month = d.getMonth() + 1; // 1-12
        const year  = d.getFullYear();
        return month >= 8 ? year + 1 : year;
    }
    /** Normalize a UTC gameDate string to an Eastern-Time YYYY-MM-DD string. */
    function toEasternDateStr(utcDateStr) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(utcDateStr));
    }
    /** Resolve a player name to their ESPN athlete record (NBA only). */
    async function resolveEspnAthlete(name) {
        const res = await fetch(`${ESPN_SEARCH_API}?page=1&query=${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error('player search request failed');
        const data = await res.json();
        const playerBucket = (data.results || []).find(r => r.type === 'player');
        const candidates = (playerBucket?.contents || [])
            .filter(p => p.sport === 'basketball' && p.defaultLeagueSlug === 'nba');
        const target = name.trim().toLowerCase();
        const match = candidates.find(p => p.displayName.toLowerCase() === target) || candidates[0] || null;
        if (!match) return null;
        return {
            id: match.uid.split('~').pop().replace('a:', ''),
            fullName: match.displayName,
            team: match.subtitle,
        };
    }
    /** Find the eventId + metadata (opponent, score, result) matching a target date. */
    function findEventByDate(gamelog, targetDateStr) {
        for (const [eventId, ev] of Object.entries(gamelog.events || {})) {
            if (toEasternDateStr(ev.gameDate) === targetDateStr) return { eventId, meta: ev };
        }
        return null;
    }
    /** Pull the raw per-game stats array for an eventId out of seasonTypes. */
    function findStatsArray(gamelog, eventId) {
        for (const seasonType of gamelog.seasonTypes || []) {
            for (const category of seasonType.categories || []) {
                const match = (category.events || []).find(e => e.eventId === eventId);
                if (match) return match.stats;
            }
        }
        return null;
    }
    /** Map a raw stats array to named fields using gamelog.names. */
    function mapGamelogStats(gamelog, statsArray) {
        const result = {};
        gamelog.names.forEach((key, i) => { result[key] = statsArray[i]; });
        return result;
    }
    async function fetchNbaPlayerStats() {
        const name = document.getElementById('bball-player-name').value.trim();
        const date = bballDateInput.value; // YYYY-MM-DD
        if (!name) { setBballFetchMsg('Enter a player name first.', 'error'); return; }
        if (!date) { setBballFetchMsg('Pick a date first.', 'error'); return; }
        bballFetchBtn.disabled = true;
        bballMatchup.textContent = '';
        setBballFetchMsg('Looking up player…', 'loading');
        try {
            const player = await resolveEspnAthlete(name);
            if (!player) {
                setBballFetchMsg(`No NBA player matching "${name}".`, 'error');
                return;
            }
            setBballFetchMsg(`Found ${player.fullName}. Fetching game log…`, 'loading');
            const season = seasonFromDate(date);
            const res = await fetch(`${ESPN_NBA_API}/athletes/${player.id}/gamelog?season=${season}`);
            if (!res.ok) throw new Error('game log request failed');
            const gamelog = await res.json();
            const eventMatch = findEventByDate(gamelog, date);
            if (!eventMatch) {
                setBballFetchMsg(`${player.fullName} has no game log on ${date}.`, 'error');
                return;
            }
            const statsArray = findStatsArray(gamelog, eventMatch.eventId);
            if (!statsArray) {
                setBballFetchMsg(`Stats missing for that game.`, 'error');
                return;
            }
            const stats = mapGamelogStats(gamelog, statsArray);
            bballPts.value  = stats.points;
            bballRebs.value = stats.totalRebounds;
            bballAst.value  = stats.assists;
            bballBlk.value  = stats.blocks;
            bballStl.value  = stats.steals;
            bballTo.value   = stats.turnovers;
            const oppName = eventMatch.meta.opponent?.displayName || '';
            if (oppName) {
                bballMatchup.textContent = `vs ${oppName} (${eventMatch.meta.gameResult} ${eventMatch.meta.score})`;
            }
            setBballFetchMsg(`Loaded ${player.fullName} — ${date}.`, 'success');
            bballGoBtn.click(); // auto-calculate
        } catch (err) {
            setBballFetchMsg(
                'Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message,
                'error'
            );
        } finally {
            bballFetchBtn.disabled = false;
        }
    }
    bballFetchBtn.addEventListener('click', fetchNbaPlayerStats);

    // ── Basketball — Browse by date/league/team/player (drill-down alternative) ──
        const bballLoadGamesBtn = document.querySelector('#bball-load-games-btn');
        const bballGameRow      = document.querySelector('#bball-game-row');
        const bballGameSelect   = document.querySelector('#bball-game-select');
        const bballTeamRow      = document.querySelector('#bball-team-row');
        const bballTeamSelect   = document.querySelector('#bball-team-select');

        let bballScoreboardCache = null; // last fetched scoreboard response, keyed for lookup on game-select change

        function getSelectedBballLeague() {
            return document.querySelector('input[name="bball-league"]:checked')?.value || 'nba';
        }

        /** Convert an <input type="date"> value (YYYY-MM-DD) to ESPN's YYYYMMDD format. */
        function toEspnDateParam(dateStr) {
            return dateStr.replaceAll('-', '');
        }

        async function loadBballGames() {
            const date = bballDateInput.value;
            if (!date) { setBballFetchMsg('Pick a date first.', 'error'); return; }

            const league = getSelectedBballLeague();
            bballLoadGamesBtn.disabled = true;
            bballGameRow.style.display = 'none';
            bballTeamRow.style.display = 'none';
            bballGameSelect.innerHTML = '';
            bballTeamSelect.innerHTML = '';
            setBballFetchMsg('Loading games…', 'loading');

            try {
                const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard?dates=${toEspnDateParam(date)}`);
                if (!res.ok) throw new Error('scoreboard request failed');
                const data = await res.json();
                bballScoreboardCache = data;

                const events = data.events || [];
                if (events.length === 0) {
                    setBballFetchMsg(`No games found on ${date}.`, 'error');
                    return;
                }

                bballGameSelect.innerHTML = '<option value="">Select a game…</option>' +
                    events.map(ev => `<option value="${ev.id}">${ev.shortName || ev.name}</option>`).join('');
                bballGameRow.style.display = 'flex';
                setBballFetchMsg(`Found ${events.length} game(s) on ${date}.`, 'success');
            } catch (err) {
                setBballFetchMsg(
                    'Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message,
                    'error'
                );
            } finally {
                bballLoadGamesBtn.disabled = false;
            }
        }
        bballLoadGamesBtn.addEventListener('click', loadBballGames);

        bballGameSelect.addEventListener('change', () => {
            const eventId = bballGameSelect.value;
            bballTeamSelect.innerHTML = '';
            bballTeamRow.style.display = 'none';
            if (!eventId || !bballScoreboardCache) return;

            const event = bballScoreboardCache.events.find(ev => ev.id === eventId);
            const competitors = event?.competitions?.[0]?.competitors || [];
            if (competitors.length === 0) return;

            bballTeamSelect.innerHTML = '<option value="">Select a team…</option>' +
                competitors.map(c => `<option value="${c.team.id}">${c.team.displayName}</option>`).join('');
            bballTeamRow.style.display = 'flex';
        });

        const bballPlayerRow    = document.querySelector('#bball-player-row');
            const bballPlayerSelect = document.querySelector('#bball-player-select');

            const bballBoxscoreCache = {}; // eventId -> boxscore.players[], cached so switching teams doesn't re-fetch

            async function fetchBballBoxscore(eventId) {
                if (bballBoxscoreCache[eventId]) return bballBoxscoreCache[eventId];
                const league = getSelectedBballLeague();
                const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/summary?event=${eventId}`);
                if (!res.ok) throw new Error('boxscore request failed');
                const data = await res.json();
                const players = data.boxscore?.players || [];
                bballBoxscoreCache[eventId] = players;
                return players;
            }

            /** Build a "vs Opponent (W/L 94-90)" line from the cached scoreboard event + the selected team's id. */
            function buildBballMatchupLine(event, teamId) {
                const competitors = event?.competitions?.[0]?.competitors || [];
                const mine = competitors.find(c => c.team.id === teamId);
                const opp  = competitors.find(c => c.team.id !== teamId);
                if (!mine || !opp) return '';
                const result = mine.winner ? 'W' : 'L';
                return `vs ${opp.team.displayName} (${result} ${mine.score}-${opp.score})`;
            }

            bballTeamSelect.addEventListener('change', async () => {
                const eventId = bballGameSelect.value;
                const teamId  = bballTeamSelect.value;
                bballPlayerSelect.innerHTML = '';
                bballPlayerRow.style.display = 'none';
                if (!eventId || !teamId) return;

                setBballFetchMsg('Loading roster…', 'loading');
                try {
                    const players   = await fetchBballBoxscore(eventId);
                    const teamBlock = players.find(p => p.team.id === teamId);
                    const athletes  = teamBlock?.statistics?.[0]?.athletes || [];
                    const active    = athletes.filter(a => !a.didNotPlay);

                    if (active.length === 0) {
                        setBballFetchMsg('No players with stats found for that team.', 'error');
                        return;
                    }

                    bballPlayerSelect.innerHTML = '<option value="">Select a player…</option>' +
                        active.map(a => `<option value="${a.athlete.id}">${a.athlete.displayName} (${a.athlete.position?.abbreviation || ''})</option>`).join('');
                    bballPlayerRow.style.display = 'flex';
                    setBballFetchMsg('Pick a player to load their stats.', '');
                } catch (err) {
                    setBballFetchMsg(
                        'Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message,
                        'error'
                    );
                }
            });

            bballPlayerSelect.addEventListener('change', () => {
                const eventId   = bballGameSelect.value;
                const teamId    = bballTeamSelect.value;
                const athleteId = bballPlayerSelect.value;
                if (!eventId || !teamId || !athleteId) return;

                const players       = bballBoxscoreCache[eventId] || [];
                const teamBlock      = players.find(p => p.team.id === teamId);
                const statBlock      = teamBlock?.statistics?.[0];
                const athleteEntry   = statBlock?.athletes?.find(a => a.athlete.id === athleteId);
                if (!statBlock || !athleteEntry) {
                    setBballFetchMsg("Could not find that player's stats.", 'error');
                    return;
                }

                const stats = {};
                statBlock.keys.forEach((key, i) => { stats[key] = athleteEntry.stats[i]; });

                bballPts.value  = stats.points;
                bballRebs.value = stats.rebounds;
                bballAst.value  = stats.assists;
                bballBlk.value  = stats.blocks;
                bballStl.value  = stats.steals;
                bballTo.value   = stats.turnovers;

                document.getElementById('bball-player-name').value = athleteEntry.athlete.displayName;

                const event = bballScoreboardCache?.events.find(ev => ev.id === eventId);
                bballMatchup.textContent = event ? buildBballMatchupLine(event, teamId) : '';

                setBballFetchMsg(`Loaded ${athleteEntry.athlete.displayName}.`, 'success');
                bballGoBtn.click(); // auto-calculate
            });        

    // ========================================================
    //  MLB PITCHER
    // ========================================================
    const bsballpTotalEl  = document.querySelector('#bsballp-total-fs');
    const bsballpGoBtn    = document.querySelector('#bsballp-btn');
    const bsballpClearBtn = document.querySelector('#bsballp-clear');
    const bsballpCopyBtn  = document.querySelector('#bsballp-copy');
    const bsballpHeaderEl = document.querySelector('#head-bsballp');
    let   bsballpHzsChk   = document.querySelector('#bsballp-hzs-checkbox');
    const bsballpInputs = document.querySelectorAll('.bsballp-fs');
    const bsballpVals   = document.querySelectorAll('.bsballp-val');
    const bsballpWinInput = document.getElementById('bsballp-win');
    const bsballpWinChk   = document.getElementById('bsballp-win-checkbox');
    const bsballpQSInput  = document.getElementById('bsballp-qs');
    const bsballpER       = document.getElementById('bsballp-er');
    const bsballpK        = document.getElementById('bsballp-k');
    const bsballpOut      = document.getElementById('bsballp-out');
    bsballpGoBtn.addEventListener('click', () => {
        // Win (checkbox-driven)
        const winVal = bsballpWinChk.checked ? 6 : 0;
        bsballpWinInput.value = bsballpWinChk.checked ? 1 : 0;
        const erVal  = Number(bsballpER.value) * -3;
        const kVal   = Number(bsballpK.value)  * 3;
        const outRaw = Number(bsballpOut.value);
        // Convert Innings Pitched (IP) → outs  (e.g. 6.2 IP → 6×3 + 2 = 20 outs)
        const outWhole   = Math.floor(outRaw);
        const outDecimal = Number((outRaw % 1).toFixed(1));
        const outPts     = (outWhole * 3) + (outDecimal * 10);
        // Quality Start: ≥ 6 IP and ≤ 3 ER
        const qsVal = (Number(bsballpER.value) <= 3 && Number(bsballpOut.value) >= 6) ? 4 : 0;
        bsballpQSInput.value = qsVal ? 1 : 0;
        const total = winVal + qsVal + erVal + kVal + outPts;
        document.querySelector('#bsballp-win-val').innerHTML = `= ${winVal}`;
        document.querySelector('#bsballp-qs-val').innerHTML  = `= ${qsVal}`;
        document.querySelector('#bsballp-er-val').innerHTML  = `= ${erVal}`;
        document.querySelector('#bsballp-k-val').innerHTML   = `= ${kVal}`;
        document.querySelector('#bsballp-out-val').innerHTML = `= ${outPts}`;
        bsballpTotalEl.innerHTML = total;
        fillEmptyInputs(bsballpInputs);
        const statLines = [
            `Win: 6 pts = ${winVal}`,
            `Quality Start: 4 pts = ${qsVal}`,
            `Earned Run: -3 pt (${bsballpER.value}) = ${erVal}`,
            `Strikeout: 3 pt (${bsballpK.value}) = ${kVal}`,
            `Out: 1 pt (${outPts}) = ${outPts}`,
        ];
        const bsballpHeader   = buildHeader(document.getElementById('bsballp-player-name').value);
        const bsballpBreakdown = withHeader(bsballpHeader, buildBreakdown(statLines, total));
        showBreakdown('#bsballp-breakdown', '#bsballp-textarea-btn-cont', bsballpBreakdown);
        bsballpHzsChk = setupHideZerosCheckbox(bsballpHzsChk, '#bsballp-breakdown', statLines, bsballpInputs, total, '', bsballpHeader);
    });
    bsballpClearBtn.addEventListener('click', () => {
        bsballpInputs.forEach(i => i.value = '');
        bsballpVals.forEach(v => v.innerHTML = '');
        bsballpWinChk.checked = false;
        document.getElementById('bsballp-player-name').value = '';
        bsballpTotalEl.innerHTML = '';
        document.querySelector('#bsballp-breakdown').innerHTML = '';
        document.querySelector('#bsballp-textarea-btn-cont').style.display = 'none';
        document.getElementById('bsballp-matchup').textContent = '';
        document.getElementById('bsballp-fetch-msg').textContent = '';
    });
    bsballpCopyBtn.addEventListener('click',  () => copyBreakdown('#bsballp-breakdown'));
    bsballpHeaderEl.addEventListener('click', () => toggleSection('#content-bsballp'));
    // ── MLB Pitcher — Auto-fill from MLB Stats API ────────────────
    // Reuses MLB_API and resolveMlbPlayer() defined in the Hitter section.
    const bsballpFetchBtn  = document.querySelector('#bsballp-fetch-btn');
    const bsballpDateInput = document.querySelector('#bsballp-date');
    const bsballpFetchMsg  = document.querySelector('#bsballp-fetch-msg');
    const bsballpMatchup   = document.querySelector('#bsballp-matchup');
    function setPitcherFetchMsg(msg, type = '') {
        bsballpFetchMsg.textContent = msg;
        bsballpFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
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
    async function fetchMlbPitcherStats() {
        const name = document.getElementById('bsballp-player-name').value.trim();
        const date = bsballpDateInput.value;
        if (!name) { setPitcherFetchMsg('Enter a player name first.', 'error'); return; }
        if (!date) { setPitcherFetchMsg('Pick a date first.', 'error'); return; }
        const season = date.slice(0, 4);
        bsballpFetchBtn.disabled = true;
        bsballpMatchup.textContent = '';
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
            // Aggregate (sums doubleheaders; innings summed via outs)
            const agg = games.reduce((a, g) => {
                const s = g.stat || {};
                a.earnedRuns += s.earnedRuns || 0;
                a.strikeOuts += s.strikeOuts || 0;
                a.wins       += s.wins       || 0;
                a.outs       += ipToOuts(s.inningsPitched);
                return a;
            }, { earnedRuns:0, strikeOuts:0, wins:0, outs:0 });
            // Populate fields — QS and Win points are computed by the Go handler
            bsballpER.value  = agg.earnedRuns;
            bsballpK.value   = agg.strikeOuts;
            bsballpOut.value = outsToIp(agg.outs);
            bsballpWinChk.checked = agg.wins > 0;
            const g0 = games[0];
            if (g0.team?.name && g0.opponent?.name) {
                bsballpMatchup.textContent = `${g0.team.name} vs ${g0.opponent.name}`;
            }
            const dhNote = games.length > 1 ? ` (${games.length} games combined)` : '';
            setPitcherFetchMsg(`Loaded ${player.fullName} — ${date}${dhNote}.`, 'success');
            bsballpGoBtn.click(); // auto-calculate
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
    initMlbDrillDown({
        prefix: 'bsballp',
        statCategory: 'pitching',
        goBtn: bsballpGoBtn,
        applyStats(s) {
            bsballpER.value  = s.earnedRuns || 0;
            bsballpK.value   = s.strikeOuts || 0;
            bsballpOut.value = outsToIp(s.outs ?? ipToOuts(s.inningsPitched || '0.0'));
            bsballpWinChk.checked = (s.wins || 0) > 0;
        }
    });
    // ========================================================
    //  MLB HITTER
    // ========================================================
    const bsballhTotalEl  = document.querySelector('#bsballh-total-fs');
    const bsballhGoBtn    = document.querySelector('#bsballh-btn');
    const bsballhClearBtn = document.querySelector('#bsballh-clear');
    const bsballhCopyBtn  = document.querySelector('#bsballh-copy');
    const bsballhHeaderEl = document.querySelector('#head-bsballh');
    let   bsballhHzsChk   = document.querySelector('#bsballh-hzs-checkbox');
    const bsballhInputs = document.querySelectorAll('.bsballh-fs');
    const bsballhVals   = document.querySelectorAll('.bsballh-val');
    const bsballhSing = document.getElementById('bsballh-sing');
    const bsballhDoub = document.getElementById('bsballh-doub');
    const bsballhTrip = document.getElementById('bsballh-trip');
    const bsballhHR   = document.getElementById('bsballh-hr');
    const bsballhR    = document.getElementById('bsballh-r');
    const bsballhRBI  = document.getElementById('bsballh-rbi');
    const bsballhBOB  = document.getElementById('bsballh-bob');
    const bsballhHBP  = document.getElementById('bsballh-hbp');
    const bsballhSB   = document.getElementById('bsballh-sb');
    const bsballhMatchup = document.querySelector('#bsballh-matchup');
    bsballhGoBtn.addEventListener('click', () => {
        const singVal = Number(bsballhSing.value) * 3;
        const doubVal = Number(bsballhDoub.value) * 5;
        const tripVal = Number(bsballhTrip.value) * 8;
        const hrVal   = Number(bsballhHR.value)   * 10;
        const rVal    = Number(bsballhR.value)     * 2;
        const rbiVal  = Number(bsballhRBI.value)   * 2;
        const bobVal  = Number(bsballhBOB.value)   * 2;
        const hbpVal  = Number(bsballhHBP.value)   * 2;
        const sbVal   = Number(bsballhSB.value)    * 5;
        const total = singVal + doubVal + tripVal + hrVal + rVal + rbiVal + bobVal + hbpVal + sbVal;
        document.querySelector('#bsballh-sing-val').innerHTML = `= ${singVal}`;
        document.querySelector('#bsballh-doub-val').innerHTML = `= ${doubVal}`;
        document.querySelector('#bsballh-trip-val').innerHTML = `= ${tripVal}`;
        document.querySelector('#bsballh-hr-val').innerHTML   = `= ${hrVal}`;
        document.querySelector('#bsballh-r-val').innerHTML    = `= ${rVal}`;
        document.querySelector('#bsballh-rbi-val').innerHTML  = `= ${rbiVal}`;
        document.querySelector('#bsballh-bob-val').innerHTML  = `= ${bobVal}`;
        document.querySelector('#bsballh-hbp-val').innerHTML  = `= ${hbpVal}`;
        document.querySelector('#bsballh-sb-val').innerHTML   = `= ${sbVal}`;
        bsballhTotalEl.innerHTML = total;
        fillEmptyInputs(bsballhInputs);
        const statLines = [
            `Single: 3 pts (${bsballhSing.value}) = ${singVal}`,
            `Double: 5 pts (${bsballhDoub.value}) = ${doubVal}`,
            `Triple: 8 pts (${bsballhTrip.value}) = ${tripVal}`,
            `Home Run: 10 pts (${bsballhHR.value}) = ${hrVal}`,
            `Run: 2 pts (${bsballhR.value}) = ${rVal}`,
            `Run Batted In: 2 pts (${bsballhRBI.value}) = ${rbiVal}`,
            `Base On Balls: 2 pts (${bsballhBOB.value}) = ${bobVal}`,
            `Hit By Pitch: 2 pts (${bsballhHBP.value}) = ${hbpVal}`,
            `Stolen Base: 5 pts (${bsballhSB.value}) = ${sbVal}`,
        ];
        const bsballhHeader   = buildHeader(document.getElementById('bsballh-player-name').value);
        const bsballhBreakdown = withHeader(bsballhHeader, buildBreakdown(statLines, total));
        showBreakdown('#bsballh-breakdown', '#bsballh-textarea-btn-cont', bsballhBreakdown);
        bsballhHzsChk = setupHideZerosCheckbox(bsballhHzsChk, '#bsballh-breakdown', statLines, bsballhInputs, total, '', bsballhHeader);
    });
    bsballhClearBtn.addEventListener('click', () => {
        bsballhInputs.forEach(i => i.value = '');
        bsballhVals.forEach(v => v.innerHTML = '');
        document.getElementById('bsballh-player-name').value = '';
        bsballhTotalEl.innerHTML = '';
        document.querySelector('#bsballh-breakdown').innerHTML = '';
        document.querySelector('#bsballh-textarea-btn-cont').style.display = 'none';
        document.getElementById('bsballh-matchup').textContent = '';
    });
    bsballhCopyBtn.addEventListener('click',  () => copyBreakdown('#bsballh-breakdown'));
    bsballhHeaderEl.addEventListener('click', () => toggleSection('#content-bsballh'));
    // ── MLB Hitter — Auto-fill from MLB Stats API ─────────────────
    // Data source: statsapi.mlb.com/api/v1 (official, free, no auth).
    // Flow: name → player ID → hitting game log → match date → fields.
    const MLB_API           = 'https://statsapi.mlb.com/api/v1';
    const bsballhFetchBtn    = document.querySelector('#bsballh-fetch-btn');
    const bsballhDateInput   = document.querySelector('#bsballh-date');
    const bsballhFetchMsg    = document.querySelector('#bsballh-fetch-msg');
    function setHitterFetchMsg(msg, type = '') {
        bsballhFetchMsg.textContent = msg;
        bsballhFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }
    /** Resolve a player name to their MLB person record for a given season. */
    async function resolveMlbPlayer(name, season) {
        const res = await fetch(`${MLB_API}/sports/1/players?season=${season}`);
        if (!res.ok) throw new Error('player list request failed');
        const data = await res.json();
        const target = name.trim().toLowerCase();
        const people = data.people || [];
        // Prefer exact full-name match, then a partial contains match
        return people.find(p => p.fullName.toLowerCase() === target)
            || people.find(p => p.fullName.toLowerCase().includes(target))
            || null;
    }
    // ── MLB Drill-down (Date → League → Game → Team → Player) ──────
    // Shared by Hitter and Pitcher cards. `applyStats(statsObj)` is
    // caller-defined and writes the card-specific fields.
    function initMlbDrillDown({ prefix, statCategory, goBtn, applyStats }) {
        const dateInput    = document.querySelector(`#${prefix}-date`);
        const loadGamesBtn = document.querySelector(`#${prefix}-load-games-btn`);
        const gameRow      = document.querySelector(`#${prefix}-game-row`);
        const gameSelect   = document.querySelector(`#${prefix}-game-select`);
        const teamRow      = document.querySelector(`#${prefix}-team-row`);
        const teamSelect   = document.querySelector(`#${prefix}-team-select`);
        const playerRow    = document.querySelector(`#${prefix}-player-row`);
        const playerSelect = document.querySelector(`#${prefix}-player-select`);
        const fetchMsg     = document.querySelector(`#${prefix}-fetch-msg`);
        const matchup      = document.querySelector(`#${prefix}-matchup`);

        function setMsg(msg, type = '') {
            fetchMsg.textContent = msg;
            fetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
        }

        let gamesCache = {};    // gamePk -> game object (from schedule)
        let boxscoreCache = {}; // gamePk -> boxscore.teams object

        function getSelectedSportId() {
            return document.querySelector(`input[name="${prefix}-league"]:checked`)?.value || '1';
        }

        async function loadGames() {
            const date = dateInput.value;
            if (!date) { setMsg('Pick a date first.', 'error'); return; }

            const sportId = getSelectedSportId();
            loadGamesBtn.disabled = true;
            gameRow.style.display = 'none';
            teamRow.style.display = 'none';
            playerRow.style.display = 'none';
            gameSelect.innerHTML = '';
            teamSelect.innerHTML = '';
            playerSelect.innerHTML = '';
            setMsg('Loading games…', 'loading');

            try {
                const res = await fetch(`${MLB_API}/schedule?sportId=${sportId}&date=${date}`);
                if (!res.ok) throw new Error('schedule request failed');
                const data = await res.json();
                const games = data.dates?.[0]?.games || [];
                gamesCache = {};
                games.forEach(g => { gamesCache[g.gamePk] = g; });

                if (games.length === 0) {
                    setMsg(`No games found on ${date}.`, 'error');
                    return;
                }

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

        gameSelect.addEventListener('change', () => {
            const gamePk = gameSelect.value;
            teamSelect.innerHTML = '';
            playerSelect.innerHTML = '';
            teamRow.style.display = 'none';
            playerRow.style.display = 'none';
            if (!gamePk || !gamesCache[gamePk]) return;

            const g = gamesCache[gamePk];
            teamSelect.innerHTML = '<option value="">Select a team…</option>' +
                `<option value="away">${g.teams.away.team.name}</option>` +
                `<option value="home">${g.teams.home.team.name}</option>`;
            teamRow.style.display = 'flex';
        });

        async function fetchBoxscore(gamePk) {
            if (boxscoreCache[gamePk]) return boxscoreCache[gamePk];
            const res = await fetch(`${MLB_API}/game/${gamePk}/boxscore`);
            if (!res.ok) throw new Error('boxscore request failed');
            const data = await res.json();
            boxscoreCache[gamePk] = data.teams || {};
            return boxscoreCache[gamePk];
        }

        teamSelect.addEventListener('change', async () => {
            const gamePk   = gameSelect.value;
            const homeAway = teamSelect.value;
            playerSelect.innerHTML = '';
            playerRow.style.display = 'none';
            if (!gamePk || !homeAway) return;

            setMsg('Loading roster…', 'loading');
            try {
                const teams   = await fetchBoxscore(gamePk);
                const players = Object.values(teams[homeAway]?.players || {});
                const active  = players.filter(p => Object.keys(p.stats?.[statCategory] || {}).length > 0);

                if (active.length === 0) {
                    setMsg(`No ${statCategory === 'pitching' ? 'pitchers' : 'batters'} with stats found for that team.`, 'error');
                    return;
                }

                playerSelect.innerHTML = '<option value="">Select a player…</option>' +
                    active.map(p => `<option value="${p.person.id}">${p.person.fullName} (${p.position.abbreviation})</option>`).join('');
                playerRow.style.display = 'flex';
                setMsg('Pick a player to load their stats.', '');
            } catch (err) {
                setMsg('Fetch failed — the MLB API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
            }
        });

        playerSelect.addEventListener('change', () => {
            const gamePk    = gameSelect.value;
            const homeAway  = teamSelect.value;
            const athleteId = playerSelect.value;
            if (!gamePk || !homeAway || !athleteId) return;

            const teams   = boxscoreCache[gamePk] || {};
            const players = Object.values(teams[homeAway]?.players || {});
            const entry   = players.find(p => String(p.person.id) === athleteId);
            if (!entry) { setMsg("Could not find that player's stats.", 'error'); return; }

            const statsObj = entry.stats[statCategory] || {};
            document.getElementById(`${prefix}-player-name`).value = entry.person.fullName;
            applyStats(statsObj);

            const g   = gamesCache[gamePk];
            const opp = homeAway === 'away' ? g?.teams.home.team.name : g?.teams.away.team.name;
            matchup.textContent = opp ? `vs ${opp}` : '';

            setMsg(`Loaded ${entry.person.fullName}.`, 'success');
            goBtn.click(); // auto-calculate
        });
    }
    async function fetchMlbHitterStats() {
        const name = document.getElementById('bsballh-player-name').value.trim();
        const date = bsballhDateInput.value; // YYYY-MM-DD
        if (!name) { setHitterFetchMsg('Enter a player name first.', 'error'); return; }
        if (!date) { setHitterFetchMsg('Pick a date first.', 'error'); return; }
        const season = date.slice(0, 4);
        bsballhFetchBtn.disabled = true;
        setHitterFetchMsg('Looking up player…', 'loading');
        bsballhMatchup.textContent = '';
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
            // Aggregate (sums doubleheaders into one entry)
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
            // Populate the hitter fields
            bsballhSing.value = singles;
            bsballhDoub.value = agg.doubles;
            bsballhTrip.value = agg.triples;
            bsballhHR.value   = agg.homeRuns;
            bsballhR.value    = agg.runs;
            bsballhRBI.value  = agg.rbi;
            bsballhBOB.value  = agg.bb;
            bsballhHBP.value  = agg.hbp;
            bsballhSB.value   = agg.sb;
            const dhNote = games.length > 1 ? ` (${games.length} games combined)` : '';
            setHitterFetchMsg(`Loaded ${player.fullName} — ${date}${dhNote}.`, 'success');
            const g0       = games[0];
            const teamName = g0.team?.name || '';
            const oppName  = g0.opponent?.name || '';
            if (teamName && oppName) {
                bsballhMatchup.textContent = `${teamName} vs ${oppName}`;
            }
            // Auto-calculate
            bsballhGoBtn.click();
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
    initMlbDrillDown({
        prefix: 'bsballh',
        statCategory: 'batting',
        goBtn: bsballhGoBtn,
        applyStats(s) {
            const singles = Math.max(0, (s.hits || 0) - (s.doubles || 0) - (s.triples || 0) - (s.homeRuns || 0));
            bsballhSing.value = singles;
            bsballhDoub.value = s.doubles || 0;
            bsballhTrip.value = s.triples || 0;
            bsballhHR.value   = s.homeRuns || 0;
            bsballhR.value    = s.runs || 0;
            bsballhRBI.value  = s.rbi || 0;
            bsballhBOB.value  = s.baseOnBalls || 0;
            bsballhHBP.value  = s.hitByPitch || 0;
            bsballhSB.value   = s.stolenBases || 0;
        }
    });
    // ========================================================
    //  TENNIS
    // ========================================================
    const tennisTotalEl  = document.querySelector('#tennis-total-fs');
    const tennisGoBtn    = document.querySelector('#tennis-btn');
    const tennisClearBtn = document.querySelector('#tennis-clear');
    const tennisCopyBtn  = document.querySelector('#tennis-copy');
    const tennisHeaderEl = document.querySelector('#head-tennis');
    const tennisInputs = document.querySelectorAll('.tennis-fs');
    const tennisVals   = document.querySelectorAll('.tennis-val');
    // Calculated hidden inputs
    const tennisMP    = document.querySelector('#tennis-mp');
    const tennisGW    = document.querySelector('#tennis-gw');
    const tennisGL    = document.querySelector('#tennis-gl');
    const tennisSW    = document.querySelector('#tennis-sw');
    const tennisSL    = document.querySelector('#tennis-sl');
    const tennisAce   = document.querySelector('#tennis-ac');
    const tennisDblFt = document.querySelector('#tennis-dblft');
    // Box score inputs — player sets
    const playerSets   = [1, 2, 3, 4, 5].map(n => document.querySelector(`#tennis-box-player-s${n}`));
    const opponentSets = [1, 2, 3, 4, 5].map(n => document.querySelector(`#tennis-box-opponent-s${n}`));
    // Retirement controls
    const retirementChk       = document.querySelector('#tennis-bs-retirement'); // legacy shim
    const oppRetiredChk       = document.querySelector('#tennis-opp-retired');
    const playerRetiredChk    = document.querySelector('#tennis-player-retired');
    const playerRetiredRadio  = document.querySelector('#tennis-bs-p-retired');
    const opponentRetiredRadio= document.querySelector('#tennis-bs-o-retired');
    // Mutual exclusion — checking one unchecks the other
    oppRetiredChk.addEventListener('change', () => {
        if (oppRetiredChk.checked) playerRetiredChk.checked = false;
    });
    playerRetiredChk.addEventListener('change', () => {
        if (playerRetiredChk.checked) oppRetiredChk.checked = false;
    });
    tennisGoBtn.addEventListener('click', () => {
        let pScores = playerSets.map(el   => Number(el.value || 0));
        let oScores = opponentSets.map(el => Number(el.value || 0));
        // ── Retirement logic ──────────────────────────────────────────
        // Rule: only applies if Set 1 is fully complete.
        // The retiring player's opponent gets filled as the winner.
        // Ace / Double Fault are never touched here.
        const oppRetired    = oppRetiredChk.checked;
        const playerRetired = playerRetiredChk.checked;
        const retirementChecked = oppRetired || playerRetired;
        const format    = Number(document.querySelector('input[name="tennis-format"]:checked')?.value || 3);
        const setsToWin = Math.ceil(format / 2); // 2 for BO3, 3 for BO5
        /** True if a set score pair represents a completed set. */
        function setComplete(p, o) { return p >= 6 || o >= 6; }
        /** 6 normally; 7 if the in-progress set is already at 5-5 or beyond. */
        function winningScore(w, l) { return (w >= 5 && l >= 5) ? 7 : 6; }
        /**
         * Fill sets for the winning side after a retirement.
         * winnerScores / loserScores are the raw arrays, mutated in place.
         */
        function applyRetirement(winnerScores, loserScores) {
            if (!setComplete(winnerScores[0], loserScores[0])) return; // Set 1 must be done
            // Step 1 — find and fill the first incomplete set
            let retiredAtSet = -1;
            for (let i = 0; i < format; i++) {
                if (!setComplete(winnerScores[i], loserScores[i])) { retiredAtSet = i; break; }
            }
            if (retiredAtSet !== -1) {
                winnerScores[retiredAtSet] = winningScore(winnerScores[retiredAtSet], loserScores[retiredAtSet]);
            }
            // Step 2 — count winner's set wins after that fill
            let winnerSetWins = 0;
            for (let i = 0; i < format; i++) {
                if (setComplete(winnerScores[i], loserScores[i]) && winnerScores[i] > loserScores[i]) winnerSetWins++;
            }
            // Step 3 — fill 6-0 until winner reaches setsToWin; zero the rest
            const startFrom = retiredAtSet === -1 ? format : retiredAtSet + 1;
            for (let i = startFrom; i < format; i++) {
                if (winnerSetWins >= setsToWin) { winnerScores[i] = 0; loserScores[i] = 0; }
                else { winnerScores[i] = 6; loserScores[i] = 0; winnerSetWins++; }
            }
            for (let i = format; i < 5; i++) { winnerScores[i] = 0; loserScores[i] = 0; }
        }
        if (oppRetired)    applyRetirement(pScores, oScores); // opponent retired → player wins
        if (playerRetired) applyRetirement(oScores, pScores); // player retired    → opponent wins
        if (retirementChecked) {
            // Write adjusted scores back to input boxes
            let lastSet = -1;
            for (let i = format - 1; i >= 0; i--) {
                if (pScores[i] > 0 || oScores[i] > 0) { lastSet = i; break; }
            }
            playerSets.forEach((el, i)   => { el.value = i <= lastSet ? pScores[i] : ''; });
            opponentSets.forEach((el, i) => { el.value = i <= lastSet ? oScores[i] : ''; });
        }
        // ── Tally games won / lost ────────────────────────────────────
        const gamesWon  = pScores.slice(0, format).reduce((sum, v) => sum + v, 0);
        const gamesLost = oScores.slice(0, format).reduce((sum, v) => sum + v, 0);
        // ── Tally sets won / lost ─────────────────────────────────────
        let setsWon = 0, setsLost = 0;
        for (let i = 0; i < format; i++) {
            if (!setComplete(pScores[i], oScores[i])) continue;
            if      (pScores[i] > oScores[i]) setsWon++;
            else if (pScores[i] < oScores[i]) setsLost++;
        }
        // Write computed values to hidden inputs
        tennisGW.value = gamesWon;
        tennisGL.value = gamesLost;
        tennisSW.value = String(setsWon);
        tennisSL.value = String(setsLost);
        const mpVal    = Number(tennisMP.value) * 10;
        const gwVal    = gamesWon  * 1;
        const glVal    = gamesLost * -1;
        const swVal    = setsWon   * 3;
        const slVal    = setsLost  * -3;
        const aceVal   = Number(tennisAce.value)   * 0.5;
        const dblftVal = Number(tennisDblFt.value) * -0.5;
        const total = mpVal + gwVal + glVal + swVal + slVal + aceVal + dblftVal;
        document.querySelector('#tennis-ac-val').innerHTML    = `= ${aceVal}`;
        document.querySelector('#tennis-dblft-val').innerHTML = `= ${dblftVal}`;
        tennisTotalEl.innerHTML = total;
        fillEmptyInputs(tennisInputs);
        const statLines = [
            `Match Played: 10 pts (${tennisMP.value}) = ${mpVal}`,
            `Game Win: 1 pt (${gamesWon}) = ${gwVal}`,
            `Game Loss: -1 pt (${gamesLost}) = ${glVal}`,
            `Set Won: 3 pts (${setsWon}) = ${swVal}`,
            `Set Loss: -3 pts (${setsLost}) = ${slVal}`,
            `Ace: 0.5 pt (${tennisAce.value}) = ${aceVal}`,
            `Double Fault: -0.5 pt (${tennisDblFt.value}) = ${dblftVal}`,
        ];
        const tennisHeader = buildHeader(document.getElementById('tennis-player-name').value);
        // DNP: retirement checked but Set 1 not complete → show DNP only
        const isDNP = retirementChecked && !setComplete(pScores[0], oScores[0]);
        if (isDNP) {
            const dnpText = withHeader(tennisHeader, 'BOBO');
            showBreakdown('#tennis-breakdown', '#tennis-textarea-btn-cont', dnpText);
            tennisTotalEl.innerHTML = 'DNP';
            return;
        }
        const retirementNote = retirementChecked ? '[Retirement — scores adjusted per PrizePicks rule]' : '';
        const tennisBreakdown = withHeader(tennisHeader, buildBreakdown(statLines, total, retirementNote));
        showBreakdown('#tennis-breakdown', '#tennis-textarea-btn-cont', tennisBreakdown);
    });
    tennisClearBtn.addEventListener('click', () => {
        tennisInputs.forEach(inp => {
            if (inp.id === 'tennis-mp') return; // keep Match Played = 1
            inp.value = '';
        });
        tennisVals.forEach(v => v.innerHTML = '');
        document.getElementById('tennis-player-name').value = '';
        retirementChk.checked    = false;
        oppRetiredChk.checked    = false;
        playerRetiredChk.checked = false;
        tennisTotalEl.innerHTML = '';
        document.querySelector('#tennis-breakdown').innerHTML = '';
        document.querySelector('#tennis-textarea-btn-cont').style.display = 'none';
    });
    tennisCopyBtn.addEventListener('click',  () => copyBreakdown('#tennis-breakdown'));
    tennisHeaderEl.addEventListener('click', () => toggleSection('#content-tennis'));
    // ========================================================
    //  MMA
    // ========================================================
    const mmaTotalEl  = document.querySelector('#mma-total-fs');
    const mmaGoBtn    = document.querySelector('#mma-btn');
    const mmaClearBtn = document.querySelector('#mma-clear');
    const mmaCopyBtn  = document.querySelector('#mma-copy');
    const mmaHeaderEl = document.querySelector('#head-mma');
    const mmaInputs = document.querySelectorAll('.mma-fs');
    const mmaVals   = document.querySelectorAll('.mma-val');
    const mmaRadios = document.querySelectorAll('.mma-fcb');
    const mmaSigStr = document.querySelector('#mma-sigstr');
    const mmaTD     = document.querySelector('#mma-td');
    const mmaSubAtt = document.querySelector('#mma-subatt');
    const mmaKD     = document.querySelector('#mma-kd');
    // Map radio point values → readable label
    const MMA_FCB_LABELS = {
        50: '1st Round Win = 50 pts',
        40: '2nd Round Win = 40 pts',
        30: '3rd Round Win = 30 pts',
        20: '4th/5th Round Win = 20 pts',
        10: 'Decision Win = 10 pts',
         0: 'Draw = 0 pt',
    };
    mmaGoBtn.addEventListener('click', () => {
        const sigStrVal = Number(mmaSigStr.value) * 0.5;
        const tdVal     = Number(mmaTD.value)     * 5;
        const subAttVal = Number(mmaSubAtt.value) * 4;
        const kdVal     = Number(mmaKD.value)     * 10;
        const fcbVal   = getCheckedRadioValue(mmaRadios);
        const fcbLabel = MMA_FCB_LABELS[fcbVal] ?? '';
        const total = sigStrVal + tdVal + subAttVal + kdVal + fcbVal;
        document.querySelector('#mma-sigstr-val').innerHTML = `= ${sigStrVal}`;
        document.querySelector('#mma-td-val').innerHTML     = `= ${tdVal}`;
        document.querySelector('#mma-subatt-val').innerHTML = `= ${subAttVal}`;
        document.querySelector('#mma-kd-val').innerHTML     = `= ${kdVal}`;
        mmaTotalEl.innerHTML = total;
        fillEmptyInputs(mmaInputs);
        const statLines = [
            `Significant Strikes: 0.5 pts (${mmaSigStr.value}) = ${sigStrVal}`,
            `Takedown: 5 pts (${mmaTD.value}) = ${tdVal}`,
            `Submission Attempt: 4 pts (${mmaSubAtt.value}) = ${subAttVal}`,
            `Knockdown: 10 pts (${mmaKD.value}) = ${kdVal}`,
        ];
        const mmaHeader   = buildHeader(document.getElementById('mma-player-name').value);
        const mmaBreakdown = withHeader(mmaHeader, buildBreakdown(statLines, total, fcbLabel));
        showBreakdown('#mma-breakdown', '#mma-textarea-btn-cont', mmaBreakdown);
    });
    mmaClearBtn.addEventListener('click', () => {
        mmaInputs.forEach(i => i.value = '');
        mmaVals.forEach(v => v.innerHTML = '');
        mmaRadios.forEach(r => r.checked = false);
        document.getElementById('mma-player-name').value = '';
        mmaTotalEl.innerHTML = '';
        document.querySelector('#mma-breakdown').innerHTML = '';
        document.querySelector('#mma-textarea-btn-cont').style.display = 'none';
    });
    mmaCopyBtn.addEventListener('click',  () => copyBreakdown('#mma-breakdown'));
    mmaHeaderEl.addEventListener('click', () => toggleSection('#content-mma'));
    // ========================================================
    //  BOXING
    // ========================================================
    const boxTotalEl  = document.querySelector('#box-total-fs');
    const boxGoBtn    = document.querySelector('#box-btn');
    const boxClearBtn = document.querySelector('#box-clear');
    const boxCopyBtn  = document.querySelector('#box-copy');
    const boxHeaderEl = document.querySelector('#head-box');
    let   boxHzsChk   = document.querySelector('#box-hzs-checkbox');
    const boxInputs = document.querySelectorAll('.box-fs');
    const boxVals   = document.querySelectorAll('.box-val');
    const boxRadios = document.querySelectorAll('.box-fcb');
    const boxPunch   = document.querySelector('#box-punch');
    const boxKD      = document.querySelector('#box-kd');
    const boxBeingKD = document.querySelector('#box-beingkd');
    // Map radio point values → readable label
    const BOX_FCB_LABELS = {
        100: 'Win Within Rounds 1-2 = 100 pts',
         75: 'Win Within Rounds 3-6 = 75 pts',
         50: 'Win Within Rounds 7-10 = 50 pts',
         25: 'Win Within Rounds 11-12 = 25 pts',
         20: 'Decision Win = 20 pts',
    };
    boxGoBtn.addEventListener('click', () => {
        const punchVal   = Number(boxPunch.value)   * 0.5;
        const kdVal      = Number(boxKD.value)      * 12;
        const beingKdVal = Number(boxBeingKD.value) * -12;
        const fcbVal   = getCheckedRadioValue(boxRadios);
        const fcbLabel = BOX_FCB_LABELS[fcbVal] ?? '';
        const total = punchVal + kdVal + beingKdVal + fcbVal;
        document.querySelector('#box-punch-val').innerHTML   = `= ${punchVal}`;
        document.querySelector('#box-kd-val').innerHTML      = `= ${kdVal}`;
        document.querySelector('#box-beingkd-val').innerHTML = `= ${beingKdVal}`;
        boxTotalEl.innerHTML = total;
        fillEmptyInputs(boxInputs);
        const statLines = [
            `Punch Landed: 0.5 pts (${boxPunch.value}) = ${punchVal}`,
            `Knockdown on Opponent: 12 pts (${boxKD.value}) = ${kdVal}`,
            `Being Knocked Down by Opponent: -12 pts (${boxBeingKD.value}) = ${beingKdVal}`,
        ];
        const boxHeader   = buildHeader(document.getElementById('box-player-name').value);
        const boxBreakdown = withHeader(boxHeader, buildBreakdown(statLines, total, fcbLabel));
        showBreakdown('#box-breakdown', '#box-textarea-btn-cont', boxBreakdown);
        boxHzsChk = setupHideZerosCheckbox(boxHzsChk, '#box-breakdown', statLines, boxInputs, total, fcbLabel, boxHeader);
    });
    boxClearBtn.addEventListener('click', () => {
        boxInputs.forEach(i => i.value = '');
        boxVals.forEach(v => v.innerHTML = '');
        boxRadios.forEach(r => r.checked = false);
        document.getElementById('box-player-name').value = '';
        boxTotalEl.innerHTML = '';
        document.querySelector('#box-breakdown').innerHTML = '';
        document.querySelector('#box-textarea-btn-cont').style.display = 'none';
    });
    boxCopyBtn.addEventListener('click',  () => copyBreakdown('#box-breakdown'));
    boxHeaderEl.addEventListener('click', () => toggleSection('#content-box'));
    // ========================================================
    //  NFL / CFB OFFENSIVE
    // ========================================================
    const fballoTotalEl  = document.querySelector('#fballo-total-fs');
    const fballoGoBtn    = document.querySelector('#fballo-btn');
    const fbálloClearBtn = document.querySelector('#fballo-clear');
    const fbálloCopyBtn  = document.querySelector('#fballo-copy');
    const fballoHeaderEl = document.querySelector('#head-fballo');
    let   fballoHzsChk   = document.querySelector('#fballo-hzs-checkbox');
    const fballoInputs = document.querySelectorAll('.fballo-fs');
    const fballoVals   = document.querySelectorAll('.fballo-val');
    const fballoPassYd  = document.getElementById('fballo-passyd');
    const fballoPassTD  = document.getElementById('fballo-passtd');
    const fballoInt     = document.getElementById('fballo-int');
    const fballoRushYd  = document.getElementById('fballo-rushyd');
    const fballoRushTD  = document.getElementById('fballo-rushtd');
    const fballoRecYd   = document.getElementById('fballo-recyd');
    const fballoRecTD   = document.getElementById('fballo-rectd');
    const fballoRec     = document.getElementById('fballo-rec');
    const fballoFL      = document.getElementById('fballo-fl');
    const fballo2Ptc    = document.getElementById('fballo-2ptc');
    const fballoOFRT    = document.getElementById('fballo-ofrt');
    const fballoKPFGRTD = document.getElementById('fballo-kpfgrtd');
    fballoGoBtn.addEventListener('click', () => {
        const passYdVal  = Number((Number(fballoPassYd.value)  * 0.04).toFixed(2));
        const passTDVal  = Number(fballoPassTD.value)  * 4;
        const intVal     = Number(fballoInt.value)     * -1;
        const rushYdVal  = Number((Number(fballoRushYd.value)  * 0.1).toFixed(1));
        const rushTDVal  = Number(fballoRushTD.value)  * 6;
        const recYdVal   = Number((Number(fballoRecYd.value)   * 0.1).toFixed(1));
        const recTDVal   = Number(fballoRecTD.value)   * 6;
        const recVal     = Number(fballoRec.value);
        const flVal      = Number(fballoFL.value)      * -1;
        const twoPtcVal  = Number(fballo2Ptc.value)    * 2;
        const ofrtVal    = Number(fballoOFRT.value)    * 6;
        const kpfgrtdVal = Number(fballoKPFGRTD.value) * 6;
        const total = Number((
            passYdVal + passTDVal + intVal +
            rushYdVal + rushTDVal +
            recYdVal  + recTDVal  + recVal +
            flVal + twoPtcVal + ofrtVal + kpfgrtdVal
        ).toFixed(2));
        document.querySelector('#fballo-passyd-val').innerHTML   = `= ${passYdVal}`;
        document.querySelector('#fballo-passtd-val').innerHTML   = `= ${passTDVal}`;
        document.querySelector('#fballo-int-val').innerHTML      = `= ${intVal}`;
        document.querySelector('#fballo-rushyd-val').innerHTML   = `= ${rushYdVal}`;
        document.querySelector('#fballo-rushtd-val').innerHTML   = `= ${rushTDVal}`;
        document.querySelector('#fballo-recyd-val').innerHTML    = `= ${recYdVal}`;
        document.querySelector('#fballo-rectd-val').innerHTML    = `= ${recTDVal}`;
        document.querySelector('#fballo-rec-val').innerHTML      = `= ${recVal}`;
        document.querySelector('#fballo-fl-val').innerHTML       = `= ${flVal}`;
        document.querySelector('#fballo-2ptc-val').innerHTML     = `= ${twoPtcVal}`;
        document.querySelector('#fballo-ofrt-val').innerHTML     = `= ${ofrtVal}`;
        document.querySelector('#fballo-kpfgrtd-val').innerHTML  = `= ${kpfgrtdVal}`;
        fballoTotalEl.innerHTML = total;
        fillEmptyInputs(fballoInputs);
        const statLines = [
            `Passing Yards: 0.04 pts/yard (${fballoPassYd.value}) = ${passYdVal}`,
            `Passing TDs: 4 pts (${fballoPassTD.value}) = ${passTDVal}`,
            `Interceptions: -1 pt (${fballoInt.value}) = ${intVal}`,
            `Rushing Yards: 0.1 pts/yard (${fballoRushYd.value}) = ${rushYdVal}`,
            `Rushing TDs: 6 pts (${fballoRushTD.value}) = ${rushTDVal}`,
            `Receiving Yards: 0.1 pts/yard (${fballoRecYd.value}) = ${recYdVal}`,
            `Receiving TDs: 6 pts (${fballoRecTD.value}) = ${recTDVal}`,
            `Receptions: 1 pt (${fballoRec.value}) = ${recVal}`,
            `Fumbles Lost: -1 pt (${fballoFL.value}) = ${flVal}`,
            `2 Point Conversions: 2 pts (${fballo2Ptc.value}) = ${twoPtcVal}`,
            `Offensive Fumble Recovery Touchdown: 6 pts (${fballoOFRT.value}) = ${ofrtVal}`,
            `Kick/Punt/Field Goal Return Touchdown: 6 pts (${fballoKPFGRTD.value}) = ${kpfgrtdVal}`,
        ];
        const fballoHeader   = buildHeader(
            document.getElementById('fballo-player-name').value,
            document.querySelector('input[name="fballo-period"]:checked')?.value
        );
        const fballoBreakdown = withHeader(fballoHeader, buildBreakdown(statLines, total));
        showBreakdown('#fballo-breakdown', '#fballo-textarea-btn-cont', fballoBreakdown);
        fballoHzsChk = setupHideZerosCheckbox(fballoHzsChk, '#fballo-breakdown', statLines, fballoInputs, total, '', fballoHeader);
    });
    fbálloClearBtn.addEventListener('click', () => {
        fballoInputs.forEach(i => i.value = '');
        fballoVals.forEach(v => v.innerHTML = '');
        document.getElementById('fballo-player-name').value = '';
        fballoTotalEl.innerHTML = '';
        document.querySelector('#fballo-breakdown').innerHTML = '';
        document.querySelector('#fballo-textarea-btn-cont').style.display = 'none';
        fballoGameSelect.innerHTML = '';
        fballoTeamSelect.innerHTML = '';
        fballoPlayerSelect.innerHTML = '';
        fballoGameRow.style.display = 'none';
        fballoTeamRow.style.display = 'none';
        fballoPlayerRow.style.display = 'none';
        fballoFetchMsg.textContent = '';
        fballoMatchup.textContent = '';
    });
    fbálloCopyBtn.addEventListener('click',  () => copyBreakdown('#fballo-breakdown'));
    fballoHeaderEl.addEventListener('click', () => toggleSection('#content-fballo'));

    // ── NFL Offensive — Drill-down (Date → Game → Team → Player) ──
    // Unlike NBA/MLB, ESPN's NFL boxscore splits stats into separate
    // category tables (passing, rushing, receiving, fumbles, kickReturns,
    // puntReturns, kicking, defensive). A player can appear in several —
    // e.g. a WR with both receiving and punt-return stats — so we merge
    // every offensive category's stat line for a given athlete.id into
    // one combined object before building the player dropdown.
    const FBALLO_OFFENSE_CATEGORIES = ['passing', 'rushing', 'receiving', 'fumbles', 'kickReturns', 'puntReturns'];

    const fballoDateInput   = document.querySelector('#fballo-date');
    const fballoLoadGamesBtn= document.querySelector('#fballo-load-games-btn');
    const fballoGameRow     = document.querySelector('#fballo-game-row');
    const fballoGameSelect  = document.querySelector('#fballo-game-select');
    const fballoTeamRow     = document.querySelector('#fballo-team-row');
    const fballoTeamSelect  = document.querySelector('#fballo-team-select');
    const fballoPlayerRow   = document.querySelector('#fballo-player-row');
    const fballoPlayerSelect= document.querySelector('#fballo-player-select');
    const fballoFetchMsg    = document.querySelector('#fballo-fetch-msg');
    const fballoMatchup     = document.querySelector('#fballo-matchup');

    function setFballoFetchMsg(msg, type = '') {
        fballoFetchMsg.textContent = msg;
        fballoFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    let fballoScoreboardCache = null;
    const fballoBoxscoreCache = {}; // eventId -> boxscore.players[]

    async function loadFballoGames() {
        const date = fballoDateInput.value;
        if (!date) { setFballoFetchMsg('Pick a date first.', 'error'); return; }

        fballoLoadGamesBtn.disabled = true;
        fballoGameRow.style.display = 'none';
        fballoTeamRow.style.display = 'none';
        fballoPlayerRow.style.display = 'none';
        fballoGameSelect.innerHTML = '';
        fballoTeamSelect.innerHTML = '';
        fballoPlayerSelect.innerHTML = '';
        setFballoFetchMsg('Loading games…', 'loading');

        try {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date.replaceAll('-', '')}`);
            if (!res.ok) throw new Error('scoreboard request failed');
            const data = await res.json();
            fballoScoreboardCache = data;

            const events = data.events || [];
            if (events.length === 0) {
                setFballoFetchMsg(`No games found on ${date}.`, 'error');
                return;
            }

            fballoGameSelect.innerHTML = '<option value="">Select a game…</option>' +
                events.map(ev => `<option value="${ev.id}">${ev.shortName || ev.name}</option>`).join('');
            fballoGameRow.style.display = 'flex';
            setFballoFetchMsg(`Found ${events.length} game(s) on ${date}.`, 'success');
        } catch (err) {
            setFballoFetchMsg('Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
        } finally {
            fballoLoadGamesBtn.disabled = false;
        }
    }
    fballoLoadGamesBtn.addEventListener('click', loadFballoGames);

    fballoGameSelect.addEventListener('change', () => {
        const eventId = fballoGameSelect.value;
        fballoTeamSelect.innerHTML = '';
        fballoPlayerSelect.innerHTML = '';
        fballoTeamRow.style.display = 'none';
        fballoPlayerRow.style.display = 'none';
        if (!eventId || !fballoScoreboardCache) return;

        const event = fballoScoreboardCache.events.find(ev => ev.id === eventId);
        const competitors = event?.competitions?.[0]?.competitors || [];
        if (competitors.length === 0) return;

        fballoTeamSelect.innerHTML = '<option value="">Select a team…</option>' +
            competitors.map(c => `<option value="${c.team.id}">${c.team.displayName}</option>`).join('');
        fballoTeamRow.style.display = 'flex';
    });

    async function fetchFballoBoxscore(eventId) {
        if (fballoBoxscoreCache[eventId]) return fballoBoxscoreCache[eventId];
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`);
        if (!res.ok) throw new Error('boxscore request failed');
        const data = await res.json();
        const players = data.boxscore?.players || [];
        fballoBoxscoreCache[eventId] = players;
        return players;
    }

    /** Merge every offensive category's stat line for each athlete into one combined object. */
    function mergeFballoOffensiveStats(teamBlock) {
        const merged = {}; // athleteId -> { displayName, jersey, stats: {...} }
        (teamBlock.statistics || []).forEach(category => {
            if (!FBALLO_OFFENSE_CATEGORIES.includes(category.name)) return;
            (category.athletes || []).forEach(entry => {
                const id = entry.athlete.id;
                if (!merged[id]) {
                    merged[id] = { displayName: entry.athlete.displayName, jersey: entry.athlete.jersey, stats: {} };
                }
                category.keys.forEach((key, i) => { merged[id].stats[key] = entry.stats[i]; });
            });
        });
        return merged;
    }

    function buildFballoMatchupLine(event, teamId) {
        const competitors = event?.competitions?.[0]?.competitors || [];
        const mine = competitors.find(c => c.team.id === teamId);
        const opp  = competitors.find(c => c.team.id !== teamId);
        if (!mine || !opp) return '';
        const result = mine.winner ? 'W' : 'L';
        return `vs ${opp.team.displayName} (${result} ${mine.score}-${opp.score})`;
    }

    fballoTeamSelect.addEventListener('change', async () => {
        const eventId = fballoGameSelect.value;
        const teamId  = fballoTeamSelect.value;
        fballoPlayerSelect.innerHTML = '';
        fballoPlayerRow.style.display = 'none';
        if (!eventId || !teamId) return;

        setFballoFetchMsg('Loading roster…', 'loading');
        try {
            const players   = await fetchFballoBoxscore(eventId);
            const teamBlock = players.find(p => p.team.id === teamId);
            if (!teamBlock) {
                setFballoFetchMsg('No offensive stats found for that team.', 'error');
                return;
            }
            const merged = mergeFballoOffensiveStats(teamBlock);
            const entries = Object.entries(merged);

            if (entries.length === 0) {
                setFballoFetchMsg('No offensive stats found for that team.', 'error');
                return;
            }

            fballoBoxscoreCache[`${eventId}_merged_${teamId}`] = merged; // stash for player-select handler
            fballoPlayerSelect.innerHTML = '<option value="">Select a player…</option>' +
                entries.map(([id, p]) => `<option value="${id}">${p.displayName} (#${p.jersey || '-'})</option>`).join('');
            fballoPlayerRow.style.display = 'flex';
            setFballoFetchMsg('Pick a player to load their stats.', '');
        } catch (err) {
            setFballoFetchMsg('Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
        }
    });

    fballoPlayerSelect.addEventListener('change', () => {
        const eventId   = fballoGameSelect.value;
        const teamId    = fballoTeamSelect.value;
        const athleteId = fballoPlayerSelect.value;
        if (!eventId || !teamId || !athleteId) return;

        const merged = fballoBoxscoreCache[`${eventId}_merged_${teamId}`] || {};
        const entry  = merged[athleteId];
        if (!entry) { setFballoFetchMsg("Could not find that player's stats.", 'error'); return; }

        const s = entry.stats;
        fballoPassYd.value  = s.passingYards || 0;
        fballoPassTD.value  = s.passingTouchdowns || 0;
        fballoInt.value     = s.interceptions || 0;
        fballoRushYd.value  = s.rushingYards || 0;
        fballoRushTD.value  = s.rushingTouchdowns || 0;
        fballoRecYd.value   = s.receivingYards || 0;
        fballoRecTD.value   = s.receivingTouchdowns || 0;
        fballoRec.value     = s.receptions || 0;
        fballoFL.value      = s.fumblesLost || 0;
        fballoKPFGRTD.value = (Number(s.kickReturnTouchdowns) || 0) + (Number(s.puntReturnTouchdowns) || 0);
        // 2-Pt Conversions and Offensive Fumble Recovery TD aren't in this data — reset to blank for manual entry
        fballo2Ptc.value = '';
        fballoOFRT.value = '';

        document.getElementById('fballo-player-name').value = entry.displayName;

        const event = fballoScoreboardCache?.events.find(ev => ev.id === eventId);
        fballoMatchup.textContent = event ? buildFballoMatchupLine(event, teamId) : '';

        setFballoFetchMsg(`Loaded ${entry.displayName}.`, 'success');
        fballoGoBtn.click(); // auto-calculate
    });

    // ========================================================
    //  NFL DST (currently hidden in the UI)
    // ========================================================
    const fballdTotalEl  = document.querySelector('#fballd-total-fs');
    const fballdGoBtn    = document.querySelector('#fballd-btn');
    const fballdClearBtn = document.querySelector('#fballd-clear');
    const fballdCopyBtn  = document.querySelector('#fballd-copy');
    const fballdHeaderEl = document.querySelector('#head-fballd');
    let   fballdHzsChk   = document.querySelector('#fballd-hzs-checkbox');
    const fballdInputs = document.querySelectorAll('.fballd-fs');
    const fballdVals   = document.querySelectorAll('.fballd-val');
    const fballdRads   = document.querySelectorAll('.fballd-pa');
    const fballdSack    = document.getElementById('fballd-sac');
    const fballdInt     = document.getElementById('fballd-int');
    const fballdFumbRec = document.getElementById('fballd-fumbrec');
    const fballdPKFGRTD = document.getElementById('fballd-pkfgrtd');
    const fballdIntRetTD= document.getElementById('fballd-intrettd');
    const fballdFumbRTD = document.getElementById('fballd-fumbrectd');
    const fballdBlkPunt = document.getElementById('fballd-blkpunt');
    const fballdSafety  = document.getElementById('fballd-saf');
    const fballdBlkKick = document.getElementById('fballd-blkkick');
    const fballd2PtConv = document.getElementById('fballd-2ptconv');
    // Map points-allowed radio values → readable label
    const DST_PA_LABELS = {
        10: '0 Point Allowed = 10 pts',
         7: '1-6 Points Allowed = 7 pts',
         4: '7-13 Points Allowed = 4 pts',
         1: '14-20 Points Allowed = 1 pt',
         0: '21-27 Points Allowed = 0 pt',
        '-1': '28-34 Points Allowed = -1 pt',
        '-4': '35+ Points Allowed = -4 pt',
    };
    fballdGoBtn.addEventListener('click', () => {
        const sackVal    = Number(fballdSack.value)    * 1;
        const intVal     = Number(fballdInt.value)     * 2;
        const fumbRecVal = Number(fballdFumbRec.value) * 2;
        const pkfgrtdVal = Number(fballdPKFGRTD.value) * 6;
        const intRetTDVal= Number(fballdIntRetTD.value)* 6;
        const fumbRTDVal = Number(fballdFumbRTD.value) * 6;
        const blkPuntVal = Number(fballdBlkPunt.value) * 6;
        const safVal     = Number(fballdSafety.value)  * 2;
        const blkKickVal = Number(fballdBlkKick.value) * 2;
        const twoPtConvVal= Number(fballd2PtConv.value)* 2;
        let paVal   = getCheckedRadioValue(fballdRads) || 0;
        const paLabel = DST_PA_LABELS[paVal] ?? '';
        const total = sackVal + intVal + fumbRecVal + pkfgrtdVal + intRetTDVal +
                      fumbRTDVal + blkPuntVal + safVal + blkKickVal + twoPtConvVal + paVal;
        document.querySelector('#fballd-sac-val').innerHTML      = `= ${sackVal}`;
        document.querySelector('#fballd-int-val').innerHTML      = `= ${intVal}`;
        document.querySelector('#fballd-fumbrec-val').innerHTML  = `= ${fumbRecVal}`;
        document.querySelector('#fballd-pkfgrtd-val').innerHTML  = `= ${pkfgrtdVal}`;
        document.querySelector('#fballd-intrettd-val').innerHTML = `= ${intRetTDVal}`;
        document.querySelector('#fballd-fumbrectd-val').innerHTML= `= ${fumbRTDVal}`;
        document.querySelector('#fballd-blkpunt-val').innerHTML  = `= ${blkPuntVal}`;
        document.querySelector('#fballd-saf-val').innerHTML      = `= ${safVal}`;
        document.querySelector('#fballd-blkkick-val').innerHTML  = `= ${blkKickVal}`;
        document.querySelector('#fballd-2ptconv-val').innerHTML  = `= ${twoPtConvVal}`;
        fballdTotalEl.innerHTML = total;
        fillEmptyInputs(fballdInputs);
        const statLines = [
            `Sack: 1 pt (${fballdSack.value}) = ${sackVal}`,
            `Interception: 2 pts (${fballdInt.value}) = ${intVal}`,
            `Fumble Recovery: 2 pts (${fballdFumbRec.value}) = ${fumbRecVal}`,
            `Punt/Kickoff/FG Return for TD: 6 pts (${fballdPKFGRTD.value}) = ${pkfgrtdVal}`,
            `Interception Return TD: 6 pts (${fballdIntRetTD.value}) = ${intRetTDVal}`,
            `Fumble Recovery TD: 6 pts (${fballdFumbRTD.value}) = ${fumbRTDVal}`,
            `Blocked Punt or FG Return TD: 6 pts (${fballdBlkPunt.value}) = ${blkPuntVal}`,
            `Safety: 2 pts (${fballdSafety.value}) = ${safVal}`,
            `Blocked Kick: 2 pts (${fballdBlkKick.value}) = ${blkKickVal}`,
            `2 Point Conversions/Extra Point Returns: 2 pts (${fballd2PtConv.value}) = ${twoPtConvVal}`,
        ];
        showBreakdown('#fballd-breakdown', '#fballd-textarea-btn-cont', buildBreakdown(statLines, total, paLabel));
        fballdHzsChk = setupHideZerosCheckbox(fballdHzsChk, '#fballd-breakdown', statLines, fballdInputs, total, paLabel);
    });
    fballdClearBtn.addEventListener('click', () => {
        fballdInputs.forEach(i => i.value = '');
        fballdVals.forEach(v => v.innerHTML = '');
        fballdRads.forEach(r => r.checked = false);
        fballdTotalEl.innerHTML = '';
        document.querySelector('#fballd-breakdown').innerHTML = '';
        document.querySelector('#fballd-textarea-btn-cont').style.display = 'none';
    });
    fballdCopyBtn.addEventListener('click',  () => copyBreakdown('#fballd-breakdown'));
    fballdHeaderEl.addEventListener('click', () => toggleSection('#content-fballd'));
    // ========================================================
    //  NASCAR (currently hidden in the UI)
    // ========================================================
    const nascarTotalEl  = document.querySelector('#nascar-total-fs');
    const nascarGoBtn    = document.querySelector('#nascar-btn');
    const nascarClearBtn = document.querySelector('#nascar-clear');
    const nascarCopyBtn  = document.querySelector('#nascar-copy');
    const nascarHeaderEl = document.querySelector('#head-nascar');
    let   nascarHzsChk   = document.querySelector('#nascar-hzs-checkbox');
    const nascarInputs = document.querySelectorAll('.nascar-fs');
    const nascarVals   = document.querySelectorAll('.nascar-val');
    const nascarRads   = document.querySelectorAll('.nascar-fpp');
    const nascarPD = document.querySelector('#nascar-pd');
    const nascarFL = document.querySelector('#nascar-fl');
    const nascarLL = document.querySelector('#nascar-ll');
    // Map finishing-place radio values → readable label
    const NASCAR_PLACE_LABELS = {
        45: '1st Place: 45 pts',  42: '2nd Place: 42 pts',  41: '3rd Place: 41 pts',
        40: '4th Place: 40 pts',  39: '5th Place: 39 pts',  38: '6th Place: 38 pts',
        37: '7th Place: 37 pts',  36: '8th Place: 36 pts',  35: '9th Place: 35 pts',
        34: '10th Place: 34 pts', 32: '11th Place: 32 pts', 31: '12th Place: 31 pts',
        30: '13th Place: 30 pts', 29: '14th Place: 29 pts', 28: '15th Place: 28 pts',
        27: '16th Place: 27 pts', 26: '17th Place: 26 pts', 25: '18th Place: 25 pts',
        23: '19th Place: 23 pts', 21: '20th Place: 21 pts', 20: '21st Place: 20 pts',
        19: '22nd Place: 19 pts', 18: '23rd Place: 18 pts', 17: '24th Place: 17 pts',
        16: '25th Place: 16 pts', 15: '26th Place: 15 pts', 14: '27th Place: 14 pts',
        13: '28th Place: 13 pts', 12: '29th Place: 12 pts', 11: '30th Place: 11 pts',
        10: '31st Place: 10 pts',  9: '32nd Place: 9 pts',   8: '33rd Place: 8 pts',
         7: '34th Place: 7 pts',   6: '35th Place: 6 pts',   5: '36th Place: 5 pts',
         4: '37th Place: 4 pts',   3: '38th Place: 3 pts',   2: '39th Place: 2 pts',
         1: '40th Place: 1 pt',    0: '41st Place or Worse: 0 pt',
    };
    nascarGoBtn.addEventListener('click', () => {
        fillEmptyInputs(nascarInputs);
        const pdVal = Number(nascarPD.value) * 1;
        const flVal = Number(nascarFL.value) * 0.45;
        const llVal = Number(nascarLL.value) * 0.25;
        const fppVal   = getCheckedRadioValue(nascarRads);
        const fppLabel = NASCAR_PLACE_LABELS[fppVal] ?? '';
        const total = pdVal + flVal + llVal + fppVal;
        document.querySelector('#nascar-pd-val').innerHTML = `= ${pdVal}`;
        document.querySelector('#nascar-fl-val').innerHTML = `= ${flVal}`;
        document.querySelector('#nascar-ll-val').innerHTML = `= ${llVal}`;
        nascarTotalEl.innerHTML = total;
        const statLines = [
            `Place Differential: +/- 1 pt (${nascarPD.value}) = ${pdVal}`,
            `Fastest Laps: 0.45 pt/lap (${nascarFL.value}) = ${flVal}`,
            `Laps Lead: 0.25 pt/lap (${nascarLL.value}) = ${llVal}`,
        ];
        showBreakdown('#nascar-breakdown', '#nascar-textarea-btn-cont', buildBreakdown(statLines, total, fppLabel));
        nascarHzsChk = setupHideZerosCheckbox(nascarHzsChk, '#nascar-breakdown', statLines, nascarInputs, total, fppLabel);
    });
    nascarClearBtn.addEventListener('click', () => {
        nascarInputs.forEach(i => i.value = '');
        nascarVals.forEach(v => v.innerHTML = '');
        nascarRads.forEach(r => r.checked = false);
        nascarTotalEl.innerHTML = '';
        document.querySelector('#nascar-breakdown').innerHTML = '';
        document.querySelector('#nascar-textarea-btn-cont').style.display = 'none';
    });
    nascarCopyBtn.addEventListener('click',  () => copyBreakdown('#nascar-breakdown'));
    nascarHeaderEl.addEventListener('click', () => toggleSection('#content-nascar'));
}; // end window.onload