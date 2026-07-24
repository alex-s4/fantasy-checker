// ============================================================
//  GameTime Platform — NFL / CFB Offensive
//  nfl.js
//
//  The largest and most recently-built sport module: Gamebook Upload
//  (including the per-quarter play-by-play parser), the "Find the Game"
//  lookup (Cloudflare Worker + recap-page fallback), Player Search, and
//  Manual mode. Confirmed self-contained during the split — nothing
//  outside this block references any fballo-* identifier (the separate,
//  currently-unused fballd/NASCAR stub sections were deliberately left
//  untouched in app.js — out of scope, not part of the 7 live cards).
//
//  One hidden cross-scope dependency found and fixed during extraction:
//  the Gamebook breakdown's own inline Copy handler was calling
//  app.js's outer-scope `triggerToastBtn` variable directly (same class
//  of issue the shared copyBreakdown() had in Phase 1) — now does its
//  own #liveToastBtn lookup instead, making this file genuinely
//  self-contained.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox,
} from './shared.js';

export function initNfl() {
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

    // ── NFL Offensive — Mode toggle (Gamebook / Player Search / Manual) ──
    // Name Search is a planned follow-up; only these 3 exist today.
    document.querySelectorAll('.fballo-mode-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const isGamebook = document.getElementById('fballo-mode-gamebook').checked;
            const isSearch   = document.getElementById('fballo-mode-search').checked;
            const isManual   = !isGamebook && !isSearch;
            document.getElementById('fballo-gamebook-mode').style.display = isGamebook ? 'block' : 'none';
            document.getElementById('fballo-search-mode').style.display   = isSearch   ? 'block' : 'none';
            document.getElementById('fballo-manual-mode').style.display   = isManual   ? 'block' : 'none';
        });
    });

    // ── NFL Offensive — Manual mode (independent stat-input set) ──
    const fballoManTotalEl  = document.querySelector('#fballo-man-total-fs');
    const fballoManGoBtn    = document.querySelector('#fballo-man-btn');
    const fballoManClearBtn = document.querySelector('#fballo-man-clear');
    const fballoManCopyBtn  = document.querySelector('#fballo-man-copy');
    let   fballoManHzsChk   = document.querySelector('#fballo-man-hzs-checkbox');
    const fballoManInputs = document.querySelectorAll('.fballo-man-fs');
    const fballoManVals   = document.querySelectorAll('#fballo-manual-mode .fballo-val');
    const fballoManPassYd  = document.getElementById('fballo-man-passyd');
    const fballoManPassTD  = document.getElementById('fballo-man-passtd');
    const fballoManInt     = document.getElementById('fballo-man-int');
    const fballoManRushYd  = document.getElementById('fballo-man-rushyd');
    const fballoManRushTD  = document.getElementById('fballo-man-rushtd');
    const fballoManRecYd   = document.getElementById('fballo-man-recyd');
    const fballoManRecTD   = document.getElementById('fballo-man-rectd');
    const fballoManRec     = document.getElementById('fballo-man-rec');
    const fballoManFL      = document.getElementById('fballo-man-fl');
    const fballoMan2Ptc    = document.getElementById('fballo-man-2ptc');
    const fballoManOFRT    = document.getElementById('fballo-man-ofrt');
    const fballoManKPFGRTD = document.getElementById('fballo-man-kpfgrtd');
    fballoManGoBtn.addEventListener('click', () => {
        const passYdVal  = Number((Number(fballoManPassYd.value)  * 0.04).toFixed(2));
        const passTDVal  = Number(fballoManPassTD.value)  * 4;
        const intVal     = Number(fballoManInt.value)     * -1;
        const rushYdVal  = Number((Number(fballoManRushYd.value)  * 0.1).toFixed(1));
        const rushTDVal  = Number(fballoManRushTD.value)  * 6;
        const recYdVal   = Number((Number(fballoManRecYd.value)   * 0.1).toFixed(1));
        const recTDVal   = Number(fballoManRecTD.value)   * 6;
        const recVal     = Number(fballoManRec.value);
        const flVal      = Number(fballoManFL.value)      * -1;
        const twoPtcVal  = Number(fballoMan2Ptc.value)    * 2;
        const ofrtVal    = Number(fballoManOFRT.value)    * 6;
        const kpfgrtdVal = Number(fballoManKPFGRTD.value) * 6;
        const total = Number((
            passYdVal + passTDVal + intVal +
            rushYdVal + rushTDVal +
            recYdVal  + recTDVal  + recVal +
            flVal + twoPtcVal + ofrtVal + kpfgrtdVal
        ).toFixed(2));
        document.querySelector('#fballo-man-passyd-val').innerHTML   = `= ${passYdVal}`;
        document.querySelector('#fballo-man-passtd-val').innerHTML   = `= ${passTDVal}`;
        document.querySelector('#fballo-man-int-val').innerHTML      = `= ${intVal}`;
        document.querySelector('#fballo-man-rushyd-val').innerHTML   = `= ${rushYdVal}`;
        document.querySelector('#fballo-man-rushtd-val').innerHTML   = `= ${rushTDVal}`;
        document.querySelector('#fballo-man-recyd-val').innerHTML    = `= ${recYdVal}`;
        document.querySelector('#fballo-man-rectd-val').innerHTML    = `= ${recTDVal}`;
        document.querySelector('#fballo-man-rec-val').innerHTML      = `= ${recVal}`;
        document.querySelector('#fballo-man-fl-val').innerHTML       = `= ${flVal}`;
        document.querySelector('#fballo-man-2ptc-val').innerHTML     = `= ${twoPtcVal}`;
        document.querySelector('#fballo-man-ofrt-val').innerHTML     = `= ${ofrtVal}`;
        document.querySelector('#fballo-man-kpfgrtd-val').innerHTML  = `= ${kpfgrtdVal}`;
        fballoManTotalEl.innerHTML = total;
        fillEmptyInputs(fballoManInputs);
        const statLines = [
            `Passing Yards: 0.04 pts/yard (${fballoManPassYd.value}) = ${passYdVal}`,
            `Passing TDs: 4 pts (${fballoManPassTD.value}) = ${passTDVal}`,
            `Interceptions: -1 pt (${fballoManInt.value}) = ${intVal}`,
            `Rushing Yards: 0.1 pts/yard (${fballoManRushYd.value}) = ${rushYdVal}`,
            `Rushing TDs: 6 pts (${fballoManRushTD.value}) = ${rushTDVal}`,
            `Receiving Yards: 0.1 pts/yard (${fballoManRecYd.value}) = ${recYdVal}`,
            `Receiving TDs: 6 pts (${fballoManRecTD.value}) = ${recTDVal}`,
            `Receptions: 1 pt (${fballoManRec.value}) = ${recVal}`,
            `Fumbles Lost: -1 pt (${fballoManFL.value}) = ${flVal}`,
            `2 Point Conversions: 2 pts (${fballoMan2Ptc.value}) = ${twoPtcVal}`,
            `Offensive Fumble Recovery Touchdown: 6 pts (${fballoManOFRT.value}) = ${ofrtVal}`,
            `Kick/Punt/Field Goal Return Touchdown: 6 pts (${fballoManKPFGRTD.value}) = ${kpfgrtdVal}`,
        ];
        const fballoManHeader = buildHeader(document.getElementById('fballo-man-player-name').value);
        const fballoManBreakdown = withHeader(fballoManHeader, buildBreakdown(statLines, total));
        showBreakdown('#fballo-man-breakdown', '#fballo-man-textarea-btn-cont', fballoManBreakdown);
        fballoManHzsChk = setupHideZerosCheckbox(fballoManHzsChk, '#fballo-man-breakdown', statLines, fballoManInputs, total, '', fballoManHeader);
    });
    fballoManClearBtn.addEventListener('click', () => {
        fballoManInputs.forEach(i => i.value = '');
        fballoManVals.forEach(v => v.innerHTML = '');
        document.getElementById('fballo-man-player-name').value = '';
        fballoManTotalEl.innerHTML = '';
        document.querySelector('#fballo-man-breakdown').innerHTML = '';
        document.querySelector('#fballo-man-textarea-btn-cont').style.display = 'none';
    });
    fballoManCopyBtn.addEventListener('click', () => copyBreakdown('#fballo-man-breakdown'));

    // ============================================================
    //  NFL Offensive — Upload Gamebook mode
    //
    //  Parses the official NFL Game Summary PDF client-side via pdf.js.
    //  Unlike the NBA/WNBA Game Book, the NFL PDF has no single fixed
    //  column layout — each period section (Final Individual Statistics
    //  = Full Game, First Half Summary = 1H, Second Half Summary = 2H,
    //  Overtime Summary = OT) prints separate RUSHING / PASSING / PASS
    //  RECEIVING / FUMBLES tables, two teams side-by-side per line.
    //  "Second Half Summary" and "Overtime Summary" only appear in
    //  gamebooks that actually went to OT — for a normal game, 2H is
    //  computed as Full Game minus 1H instead (confirmed against real
    //  PDFs: 2H-section totals, when present, already exclude OT, so
    //  Full Game = 1H + 2H + OT holds either way).
    //
    //  2-Pt Conversions, Offensive Fumble Recovery TD, and Kick/Punt/FG
    //  Return TD are auto-filled (Full Game only) from the gamebook's
    //  "Player Scoring Information" table. That table's column meaning
    //  isn't documented anywhere in the PDF — it was reverse-engineered
    //  from known plays (a rushing TD, a kick-return TD, a punt-return
    //  TD, a fumble-recovery TD, and a 2pt reception) across 4 real
    //  gamebooks. As a safety net against a wrong column guess, each
    //  row's own Points column is recomputed from the raw values and
    //  compared — a mismatch is surfaced as a "⚠ Check" flag rather
    //  than silently producing a wrong 2PT/OFRT/KPFGRTD number.
    // ============================================================
    const FBALLOGB_STAT_KEYS = {
        rushing:   ['att', 'yds', 'avg', 'lg', 'td'],
        passing:   ['att', 'cmp', 'yds', 'sackYd', 'td', 'lg', 'int', 'rt'],
        receiving: ['tar', 'rec', 'yds', 'avg', 'lg', 'td'],
        fumbles:   ['fum', 'lost', 'ownRec', 'ownRecYds', 'ownRecTd', 'forced', 'oppRec', 'oppRecYds', 'oppRecTd', 'outBds'],
    };
    // Player Scoring Information — 14 numeric columns, position confirmed
    // (see comment block above) except tdFgReturn / twoPtRush which are
    // inferred by elimination (always 0 in every sample seen so far).
    const FBALLOGB_SCORING_KEYS = ['tdFgReturn', 'tdRush', 'tdRec', 'tdKo', 'tdPunt', 'tdInt', 'tdFum', 'tdMisc', 'fg', 'xp', 'twoPtRush', 'twoPtRec', 'sfty', 'points'];

    function fballoGbReconstructRows(items, yTolerance = 2.5) {
        const rows = [];
        items.forEach(item => {
            const y = item.transform[5];
            let row = rows.find(r => Math.abs(r.y - y) <= yTolerance);
            if (!row) { row = { y, items: [] }; rows.push(row); }
            row.items.push(item);
        });
        rows.sort((a, b) => b.y - a.y);
        rows.forEach(r => r.items.sort((a, b) => a.transform[4] - b.transform[4]));
        return rows
            .map(r => r.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim())
            .filter(Boolean);
    }
    async function fballoGbExtractPageLines(page) {
        const content = await page.getTextContent();
        return fballoGbReconstructRows(content.items);
    }

    /** Extract every "Name  n1 n2 ... nK" occurrence on/after a category header line, stopping at the next table boundary. Handles 1 or 2 teams per line automatically. */
    function fballoGbExtractCategoryRows(lines, headerRegex, n) {
        const startIdx = lines.findIndex(l => headerRegex.test(l));
        if (startIdx === -1) return null; // section/category not found at all
        const numGroup = `(?:-?[\\d./]+\\s+){${n - 1}}-?[\\d./]+`;
        const re = new RegExp(`([A-Z][A-Za-z'.\\-]*(?:\\s[A-Z][A-Za-z'.\\-]*)?)\\s+(${numGroup})(?=\\s|$)`, 'g');
        const BOUNDARY_RE = /^(RUSHING |PASSING |PASS RECEIVING|FUMBLES|INTERCEPTIONS|PUNTING|PUNT RETURNS|KICKOFF RETURNS|TKL |Final Individual|Final Team|First Half Summary|Second Half Summary|Overtime Summary|Ball Possession|Miscellaneous|Touchdown Scoring|Ten Longest|Playtime Percentage)/;
        const out = [];
        for (let i = startIdx + 1; i < lines.length; i++) {
            if (BOUNDARY_RE.test(lines[i])) break;
            let m;
            re.lastIndex = 0;
            while ((m = re.exec(lines[i]))) {
                const name = m[1].trim();
                if (name === 'Total') continue;
                const nums = m[2].trim().split(/\s+/).map(tok => tok.includes('/') ? tok : Number(tok));
                out.push({ name, nums });
            }
        }
        return out;
    }

    /** Build { name: {statObj} } for one category, given its column-key list. */
    function fballoGbCategoryMap(lines, headerRegex, keys) {
        const rows = fballoGbExtractCategoryRows(lines, headerRegex, keys.length);
        const map = {};
        if (!rows) return map;
        rows.forEach(r => {
            const stats = {};
            keys.forEach((k, i) => { stats[k] = r.nums[i]; });
            // A player can legitimately appear twice in the same category in
            // rare cases (shouldn't normally happen) — last occurrence wins.
            map[r.name] = stats;
        });
        return map;
    }

    /** Parse the "Player Scoring Information" table (Full Game only). Returns { name: {2ptc, ofrt, kpfgrtd, warn} }. */
    function fballoGbParseScoringInfo(lines) {
        const startIdx = lines.findIndex(l => /^Club Player/.test(l) || /^Player Scoring Information/.test(l));
        const result = {};
        if (startIdx === -1) return result;
        const numGroup = `(?:-?[\\d.]+\\s+){13}-?[\\d.]+`; // 14 numeric columns
        const re = new RegExp(`^[A-Z]{2,4}\\s+([A-Z][A-Za-z'.\\-]*(?:\\s[A-Z][A-Za-z'.\\-]*)?)\\s+(${numGroup})$`);
        for (let i = startIdx + 1; i < lines.length; i++) {
            if (/^Possession Detail/.test(lines[i])) break;
            const m = lines[i].match(re);
            if (!m) continue;
            const name = m[1].trim();
            const nums = m[2].trim().split(/\s+/).map(Number);
            const s = {};
            FBALLOGB_SCORING_KEYS.forEach((k, idx) => { s[k] = nums[idx]; });

            const impliedPoints = (s.tdFgReturn + s.tdRush + s.tdRec + s.tdKo + s.tdPunt + s.tdInt + s.tdFum + s.tdMisc) * 6
                + s.fg * 3 + s.xp * 1 + (s.twoPtRush + s.twoPtRec) * 2 + s.sfty * 2;

            result[name] = {
                twoPtc:   s.twoPtRush + s.twoPtRec,
                ofrt:     s.tdFum,
                kpfgrtd:  s.tdFgReturn + s.tdKo + s.tdPunt,
                warn: impliedPoints !== s.points
                    ? `Player Scoring Information row didn't reconcile (implied ${impliedPoints} vs printed ${s.points} pts) — verify 2PT/OFRT/KPFGRTD by hand.`
                    : null,
            };
        }
        return result;
    }

    /** Identify VISITOR/HOME team names from a "VISITOR: Team" / "HOME: Team" pair anywhere on the page. */
    function fballoGbDetectTeams(lines) {
        let visitor = null, home = null;
        lines.forEach(l => {
            const v = l.match(/^VISITOR:\s*(.+?)\s+\d/) || l.match(/^VISITOR:\s*(.+)$/);
            const h = l.match(/^HOME:\s*(.+?)\s+\d/)    || l.match(/^HOME:\s*(.+)$/);
            if (v && !visitor) visitor = v[1].trim();
            if (h && !home)    home    = h[1].trim();
        });
        return { visitor, home };
    }

    /** Parse one period section's lines into { team: { rushing:{name:stats}, passing:{...}, receiving:{...}, fumbles:{...} } }. Two-team tables are name-attributed by matching against the team's own roster names collected from the lineup page (rosterByTeam), falling back to a simple even/odd split when rosters aren't available. */
    function fballoGbParseSectionTeams(lines, teamNames, rosterByTeam) {
        const rushingRows   = fballoGbExtractCategoryRows(lines, /^RUSHING /, FBALLOGB_STAT_KEYS.rushing.length) || [];
        const passingRows   = fballoGbExtractCategoryRows(lines, /^PASSING /, FBALLOGB_STAT_KEYS.passing.length) || [];
        const receivingRows = fballoGbExtractCategoryRows(lines, /^PASS RECEIVING /, FBALLOGB_STAT_KEYS.receiving.length) || [];
        const fumblesRows   = fballoGbExtractCategoryRows(lines, /^FUMBLES /, FBALLOGB_STAT_KEYS.fumbles.length) || [];

        const teams = {};
        teamNames.forEach(t => { teams[t] = { rushing: {}, passing: {}, receiving: {}, fumbles: {} }; });

        function assign(rows, keys, category) {
            rows.forEach(r => {
                const stats = {};
                keys.forEach((k, i) => { stats[k] = r.nums[i]; });
                // Attribute to whichever team's roster contains this name; if
                // rosters aren't available yet (shouldn't normally happen since
                // Lineups is always page 1), default to the first team so the
                // stat isn't silently dropped.
                let team = teamNames.find(t => rosterByTeam[t] && rosterByTeam[t].has(r.name)) || teamNames[0];
                teams[team][category][r.name] = stats;
            });
        }
        assign(rushingRows,   FBALLOGB_STAT_KEYS.rushing,   'rushing');
        assign(passingRows,   FBALLOGB_STAT_KEYS.passing,   'passing');
        assign(receivingRows, FBALLOGB_STAT_KEYS.receiving, 'receiving');
        assign(fumblesRows,   FBALLOGB_STAT_KEYS.fumbles,   'fumbles');
        return teams;
    }

    /** Parse the Lineups page: starters (4 "POS# Name" groups per row: TeamA-Off, TeamA-Def, TeamB-Off, TeamB-Def) plus best-effort Substitutions/DNP lists. Returns { team: { starters:Set, subNames:Set, dnpNames:Set } }. */
    const FBALLOGB_OFFENSE_POS = new Set(['QB','RB','FB','WR','TE','T','G','C','LT','RT','LG','RG','OL']);
    function fballoGbParseLineups(lines, teamNames) {
        const roster = {};
        teamNames.forEach(t => { roster[t] = { starters: new Set(), subNames: new Set(), dnpNames: new Set() }; });

        const linIdx = lines.findIndex(l => l === 'Lineups');
        if (linIdx === -1) return roster;

        // Name must look like "F.Lastname" (single initial + period), which is
        // this PDF's consistent player-name format — filters out cases where
        // a malformed line causes a stray position tag to look like a name.
        const posNameRe = /([A-Z]{1,4}(?:\/[A-Z]{1,4})?)\s+(\d{1,2})\s+([A-Z]\.[A-Za-z'\-]+)/g;

        // Starters: 4 matches per row, in fixed order TeamA-Off, TeamA-Def, TeamB-Off, TeamB-Def.
        let i = linIdx + 1;
        // Skip the "TeamA TeamB" and "Offense Defense Offense Defense" header lines.
        while (i < lines.length && !/^Substitutions/.test(lines[i]) && i < linIdx + 30) {
            const matches = [...lines[i].matchAll(posNameRe)];
            if (matches.length >= 2) {
                // Assign in groups of up to 4, alternating team A / team B every 2 (Off,Def).
                matches.forEach((m, idx) => {
                    const pos = m[1];
                    const team = idx < Math.ceil(matches.length / 2) ? teamNames[0] : teamNames[1];
                    if (FBALLOGB_OFFENSE_POS.has(pos.split('/')[0])) roster[team].starters.add(m[3]);
                });
            }
            i++;
        }

        // Substitutions / Did Not Play / Not Active: best-effort scan. These
        // wrap across lines with both teams' comma-lists interleaved per
        // visual row, so team attribution can occasionally miss a name split
        // right at a line wrap — acceptable for a roster-completeness display
        // (it never affects any player who actually has stats, since those
        // come from the category tables above, not from this list).
        const section = lines.slice(i, lines.length);
        const subStart = section.findIndex(l => /^Substitutions/.test(l));
        const dnpStart = section.findIndex(l => /^Did Not Play/.test(l));
        const naStart  = section.findIndex(l => /^Not Active/.test(l));
        function scanRange(from, to, targetSetName) {
            if (from === -1) return;
            const end = to === -1 ? section.length : to;
            for (let j = from + 1; j < end; j++) {
                const matches = [...section[j].matchAll(posNameRe)];
                const half = Math.ceil(matches.length / 2);
                matches.forEach((m, idx) => {
                    if (!FBALLOGB_OFFENSE_POS.has(m[1].split('/')[0])) return;
                    const team = idx < half ? teamNames[0] : teamNames[1];
                    roster[team][targetSetName].add(m[3]);
                });
            }
        }
        scanRange(subStart, dnpStart !== -1 ? dnpStart : naStart, 'subNames');
        scanRange(dnpStart, naStart, 'dnpNames');
        return roster;
    }

    /** Fantasy score for one player's raw stats across rushing/passing/receiving/fumbles + optional scoring-info extras. */
    function fballoGbFsFromStats(rushing, passing, receiving, fumbles, extras) {
        const passYd = passing?.yds || 0, passTd = passing?.td || 0, int = passing?.int || 0;
        const rushYd = rushing?.yds || 0, rushTd = rushing?.td || 0;
        const recYd  = receiving?.yds || 0, recTd = receiving?.td || 0, rec = receiving?.rec || 0;
        const fumLost = fumbles?.lost || 0;
        const twoPtc = extras?.twoPtc || 0, ofrt = extras?.ofrt || 0, kpfgrtd = extras?.kpfgrtd || 0;
        return Number((
            passYd * 0.04 + passTd * 4 - int * 1 +
            rushYd * 0.1  + rushTd * 6 +
            recYd  * 0.1  + recTd  * 6 + rec * 1 -
            fumLost * 1 + twoPtc * 2 + ofrt * 6 + kpfgrtd * 6
        ).toFixed(2));
    }

    /** Sum raw category stats across sections (used for 2H+OT when a game went to OT, and for Full Game-minus-1H fallback when no explicit Second Half section exists). */
    function fballoGbSumCat(list) {
        const valid = list.filter(Boolean);
        if (valid.length === 0) return null;
        const keys = Object.keys(valid[0]);
        const sum = {};
        keys.forEach(k => {
            if (typeof valid[0][k] !== 'number') { sum[k] = valid[0][k]; return; } // e.g. sackYd string, just carry first
            sum[k] = valid.reduce((acc, s) => acc + (s[k] || 0), 0);
        });
        return sum;
    }
    function fballoGbDiffCat(full, half) {
        if (!full) return null;
        if (!half) return full;
        const keys = Object.keys(full);
        const diff = {};
        keys.forEach(k => {
            if (typeof full[k] !== 'number') { diff[k] = full[k]; return; }
            diff[k] = Number((full[k] - (half[k] || 0)).toFixed(1));
        });
        return diff;
    }

    // ── NFL Gamebook — per-quarter (1Q/4Q) breakdown ──────────────────
    // Rebuilt from scratch (was lost from an earlier session — see project
    // notes). No per-quarter box score exists in these PDFs, so this is
    // derived by parsing the actual play-by-play text. Validated against
    // real gamebook play-by-play text (Cardinals@Texans, Bears@Packers
    // samples) during this rebuild — matched hand-counted stats exactly,
    // including the "no gain" (no trailing "yards" word), "- No Play"
    // penalty exclusion, and a real "...REVERSED" challenge-reversal case.
    // The "FUMBLES (Aborted)" 0-yard-QB-rush pattern is carried over from
    // prior documented notes but was NOT re-verified against a real sample
    // this time — worth watching for if a botched-snap game gets tested.
    //
    // KNOWN UNRESOLVED EDGE CASE (same as before): a run partially negated
    // by an UNTAGGED offensive-holding penalty (no "- No Play" text) is
    // credited by the NFL at the foul spot, which can't be derived from the
    // play text alone. Rather than guess, this reconciles 1Q+2Q against the
    // trustworthy box-score-derived 1H total (and 3Q+4Q against 2H) and
    // flags the displayed 1Q/4Q cell with ⚠ when they don't match — Full
    // Game/1H/2H/OT numbers themselves are never affected, only the
    // quarter-split display. Fumbles-lost isn't tracked per-quarter at all
    // (no per-quarter fumbles data exists in the play text in a reliably
    // parseable form), so 1Q/4Q breakdowns note "not tracked per-quarter"
    // for that line; 4Q+OT is the exception since it borrows OT's real
    // box-score fumbles data.

    const FBALLO_GB_NAME_RE = "[A-Z]\\.[A-Za-z'\\-]+"; // "Initial.Surname" single token, e.g. "J.Brissett"

    /** Split all page lines into { '1Q': [...], '2Q': [...], '3Q': [...], '4Q': [...] } by
     *  "Play By Play {Quarter}" header lines. Returns {} if none found (graceful degradation —
     *  callers should treat a missing quarter as "no per-quarter data available"). */
    function fballoGbExtractQuarterSections(allLines) {
        const QUARTER_LABELS = { First: '1Q', Second: '2Q', Third: '3Q', Fourth: '4Q' };
        const headerRe = /^Play By Play (First|Second|Third|Fourth) Quarter/;
        const headers = [];
        allLines.forEach((line, i) => {
            const m = line.match(headerRe);
            if (m) headers.push({ index: i, label: QUARTER_LABELS[m[1]] });
        });

        const sections = {};
        headers.forEach((h, idx) => {
            const end = idx + 1 < headers.length ? headers[idx + 1].index : allLines.length;
            sections[h.label] = allLines.slice(h.index + 1, end);
        });
        return sections;
    }

    /** Parse one quarter's play-by-play lines into { rushing, passing, receiving }
     *  maps keyed by player name (team attribution happens separately via roster lookup). */
    function fballoGbParsePlayByPlayQuarter(lines) {
        const rushing = {}, passing = {}, receiving = {};
        const NAME = FBALLO_GB_NAME_RE;

        // Phase 1: find every line matching a known play pattern, recording
        // its index and a function that applies its stats.
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const abortedMatch = line.match(new RegExp(`FUMBLES \\(Aborted\\) by (${NAME})`));
            if (abortedMatch) {
                const name = abortedMatch[1];
                matches.push({ lineIndex: i, apply: () => {
                    if (!rushing[name]) rushing[name] = { att: 0, yds: 0, td: 0 };
                    rushing[name].att += 1;
                }});
                continue;
            }

            const intMatch = line.match(new RegExp(`(${NAME})\\s+pass\\s+(?:short|deep)\\s+(?:left|right|middle)\\s+intended for\\s+${NAME}\\s+INTERCEPTED`));
            if (intMatch) {
                const passer = intMatch[1];
                matches.push({ lineIndex: i, apply: () => {
                    if (!passing[passer]) passing[passer] = { att: 0, cmp: 0, yds: 0, td: 0, int: 0 };
                    passing[passer].att += 1;
                    passing[passer].int += 1;
                }});
                continue;
            }

            const incMatch = line.match(new RegExp(`(${NAME})\\s+pass\\s+incomplete`));
            if (incMatch) {
                const passer = incMatch[1];
                matches.push({ lineIndex: i, apply: () => {
                    if (!passing[passer]) passing[passer] = { att: 0, cmp: 0, yds: 0, td: 0, int: 0 };
                    passing[passer].att += 1;
                }});
                continue;
            }

            const passMatch = line.match(new RegExp(
                `(${NAME})\\s+pass\\s+(?:short|deep)\\s+(?:left|right|middle)\\s+to\\s+(${NAME}).*?\\s+for\\s+(no gain|-?\\d+)(?:\\s+yards?)?(,\\s*TOUCHDOWN)?`
            ));
            if (passMatch) {
                const [, passer, receiver, yardStr, tdStr] = passMatch;
                const yds = yardStr === 'no gain' ? 0 : Number(yardStr);
                const isTd = !!tdStr;
                matches.push({ lineIndex: i, apply: () => {
                    if (!passing[passer]) passing[passer] = { att: 0, cmp: 0, yds: 0, td: 0, int: 0 };
                    passing[passer].att += 1;
                    passing[passer].cmp += 1;
                    passing[passer].yds += yds;
                    if (isTd) passing[passer].td += 1;
                    if (!receiving[receiver]) receiving[receiver] = { rec: 0, yds: 0, td: 0 };
                    receiving[receiver].rec += 1;
                    receiving[receiver].yds += yds;
                    if (isTd) receiving[receiver].td += 1;
                }});
                continue;
            }

            const rushMatch = line.match(new RegExp(
                `(${NAME})\\s+(?:scrambles\\s+)?(?:up the middle|left guard|right guard|left tackle|right tackle|left end|right end).*?\\s+for\\s+(no gain|-?\\d+)(?:\\s+yards?)?(,\\s*TOUCHDOWN)?`
            ));
            if (rushMatch) {
                const [, rusher, yardStr, tdStr] = rushMatch;
                const yds = yardStr === 'no gain' ? 0 : Number(yardStr);
                const isTd = !!tdStr;
                matches.push({ lineIndex: i, apply: () => {
                    if (!rushing[rusher]) rushing[rusher] = { att: 0, yds: 0, td: 0 };
                    rushing[rusher].att += 1;
                    rushing[rusher].yds += yds;
                    if (isTd) rushing[rusher].td += 1;
                }});
            }
        }

        // Phase 2: exclusion markers ("- No Play" penalties, challenge
        // reversals) exclude the nearest PRIOR MATCHED PLAY, not just the
        // nearest text line — a play's description can wrap across 2
        // physical lines before the marker appears.
        const excluded = new Set();
        for (let i = 0; i < lines.length; i++) {
            if (/-\s*No Play\.?\s*$/.test(lines[i]) || /and the play was REVERSED/.test(lines[i])) {
                for (let m = matches.length - 1; m >= 0; m--) {
                    if (matches[m].lineIndex < i) { excluded.add(m); break; }
                }
            }
        }

        // Phase 3: apply all non-excluded matches.
        matches.forEach((m, idx) => { if (!excluded.has(idx)) m.apply(); });

        return { rushing, passing, receiving };
    }

    /** Attribute a quarter's { rushing, passing, receiving } stat maps to teams via roster lookup. */
    function fballoGbAttributeQuarterByTeam(quarterStats, teamNames, rosterByTeam) {
        const out = {};
        teamNames.forEach(t => { out[t] = { rushing: {}, passing: {}, receiving: {} }; });
        ['rushing', 'passing', 'receiving'].forEach(category => {
            Object.entries(quarterStats[category]).forEach(([name, stat]) => {
                const team = teamNames.find(t => rosterByTeam[t]?.has(name));
                if (team) out[team][category][name] = stat;
                // If a name isn't found on either roster (shouldn't normally happen),
                // it's silently dropped rather than guessed — same spirit as the
                // rest of this parser: don't fabricate an attribution.
            });
        });
        return out;
    }

    /** Does any FS-relevant field differ between a quarter-pair sum and the trustworthy box-score half? Only compares fields that actually feed fballoGbFsFromStats (yds/td/int/rec) — not att/cmp, which aren't confirmed to share key names with the box-score parser and don't affect FS anyway. */
    function fballoGbQuarterPairMismatches(sumRaw, halfRaw) {
        const num = (obj, key) => (obj && obj[key]) || 0;
        const fields = [
            ['rushing', 'yds'], ['rushing', 'td'],
            ['passing', 'yds'], ['passing', 'td'], ['passing', 'int'],
            ['receiving', 'yds'], ['receiving', 'td'], ['receiving', 'rec'],
        ];
        return fields.some(([cat, key]) => num(sumRaw[cat], key) !== num(halfRaw[cat], key));
    }

    /** name -> parsed quarter's stat object) → {att,yds,td}. Used for summing pairs before reconciliation. */
    function fballoGbSumQuarterCats(a, b) {
        return {
            rushing:   fballoGbSumCat([a?.rushing,   b?.rushing]),
            passing:   fballoGbSumCat([a?.passing,   b?.passing]),
            receiving: fballoGbSumCat([a?.receiving, b?.receiving]),
        };
    }

    /** Top-level: parse an uploaded NFL Game Summary PDF into the per-player, per-team, per-category table. */
    async function fballoGbParsePdf(arrayBuffer) {
        const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageLines = [];
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            pageLines.push(await fballoGbExtractPageLines(page));
        }
        const allLines = pageLines.flat();

        const { visitor, home } = fballoGbDetectTeams(allLines);
        if (!visitor || !home) throw new Error("Couldn't find VISITOR/HOME team names — is this an NFL Game Summary PDF?");
        const teamNames = [visitor, home];

        const roster = fballoGbParseLineups(allLines, teamNames);
        const rosterByTeam = {};
        teamNames.forEach(t => { rosterByTeam[t] = new Set([...roster[t].starters, ...roster[t].subNames, ...roster[t].dnpNames]); });

        const sectionPage = {
            'Full Game': pageLines.find(lns => lns.some(l => l.includes('Final Individual Statistics'))),
            '1H':        pageLines.find(lns => lns.some(l => l.includes('First Half Summary'))),
            '2H':        pageLines.find(lns => lns.some(l => l.includes('Second Half Summary'))),
            'OT':        pageLines.find(lns => lns.some(l => l.includes('Overtime Summary'))),
        };
        const foundSections = Object.keys(sectionPage).filter(k => sectionPage[k]);
        if (!sectionPage['Full Game']) throw new Error("Couldn't find the 'Final Individual Statistics' section — is this an NFL Game Summary PDF?");

        const sectionTeams = {};
        Object.entries(sectionPage).forEach(([label, lns]) => {
            if (lns) sectionTeams[label] = fballoGbParseSectionTeams(lns, teamNames, rosterByTeam);
        });

        const scoringInfo = fballoGbParseScoringInfo(pageLines.find(lns => lns.some(l => /Player Scoring Information/.test(l))) || []);

        const hasOT = !!sectionTeams['OT'];

        // Per-quarter (1Q/4Q) data, parsed from play-by-play text. Gracefully
        // degrades to nothing if no "Play By Play {Quarter}" headers are found
        // (some gamebook format variant) — 1Q/4Q columns simply won't appear.
        const quarterSections = fballoGbExtractQuarterSections(allLines);
        const quarterTeams = {};
        ['1Q', '2Q', '3Q', '4Q'].forEach(q => {
            if (!quarterSections[q]) return;
            const parsed = fballoGbParsePlayByPlayQuarter(quarterSections[q]);
            quarterTeams[q] = fballoGbAttributeQuarterByTeam(parsed, teamNames, rosterByTeam);
        });
        const hasPlayByPlay = !!(quarterTeams['1Q'] || quarterTeams['4Q']);

        // Build one row per player per team.
        const rows = [];
        teamNames.forEach(team => {
            const allNames = new Set([
                ...roster[team].starters, ...roster[team].subNames,
                ...Object.keys(sectionTeams['Full Game']?.[team]?.rushing || {}),
                ...Object.keys(sectionTeams['Full Game']?.[team]?.passing || {}),
                ...Object.keys(sectionTeams['Full Game']?.[team]?.receiving || {}),
                ...Object.keys(sectionTeams['Full Game']?.[team]?.fumbles || {}),
            ]);

            allNames.forEach(name => {
                const dnp = roster[team].dnpNames.has(name) && !sectionTeams['Full Game'][team].rushing[name]
                    && !sectionTeams['Full Game'][team].passing[name] && !sectionTeams['Full Game'][team].receiving[name];
                if (dnp) {
                    rows.push({ team, name, dnp: true, warnings: [] });
                    return;
                }

                const raw = {};
                ['Full Game', '1H'].forEach(cat => {
                    raw[cat] = {
                        rushing:   sectionTeams[cat]?.[team]?.rushing[name]   || null,
                        passing:   sectionTeams[cat]?.[team]?.passing[name]   || null,
                        receiving: sectionTeams[cat]?.[team]?.receiving[name] || null,
                        fumbles:   sectionTeams[cat]?.[team]?.fumbles[name]   || null,
                    };
                });
                if (sectionTeams['2H']) {
                    raw['2H'] = {
                        rushing:   sectionTeams['2H']?.[team]?.rushing[name]   || null,
                        passing:   sectionTeams['2H']?.[team]?.passing[name]   || null,
                        receiving: sectionTeams['2H']?.[team]?.receiving[name] || null,
                        fumbles:   sectionTeams['2H']?.[team]?.fumbles[name]   || null,
                    };
                } else {
                    // Fallback: 2H = Full Game − 1H, per-category.
                    raw['2H'] = {
                        rushing:   fballoGbDiffCat(raw['Full Game'].rushing,   raw['1H'].rushing),
                        passing:   fballoGbDiffCat(raw['Full Game'].passing,   raw['1H'].passing),
                        receiving: fballoGbDiffCat(raw['Full Game'].receiving, raw['1H'].receiving),
                        fumbles:   fballoGbDiffCat(raw['Full Game'].fumbles,   raw['1H'].fumbles),
                    };
                }
                if (hasOT) {
                    raw['OT'] = {
                        rushing:   sectionTeams['OT']?.[team]?.rushing[name]   || null,
                        passing:   sectionTeams['OT']?.[team]?.passing[name]   || null,
                        receiving: sectionTeams['OT']?.[team]?.receiving[name] || null,
                        fumbles:   sectionTeams['OT']?.[team]?.fumbles[name]   || null,
                    };
                    raw['2H+OT'] = {
                        rushing:   fballoGbSumCat([raw['2H'].rushing,   raw['OT'].rushing]),
                        passing:   fballoGbSumCat([raw['2H'].passing,   raw['OT'].passing]),
                        receiving: fballoGbSumCat([raw['2H'].receiving, raw['OT'].receiving]),
                        fumbles:   fballoGbSumCat([raw['2H'].fumbles,   raw['OT'].fumbles]),
                    };
                }

                // Per-quarter (1Q/4Q), derived from play-by-play text. Fumbles
                // are never populated here (not tracked per-quarter) — the
                // breakdown text notes this explicitly rather than showing a
                // misleading "0". Reconciliation compares 1Q+2Q against the
                // trustworthy box-score 1H, and 3Q+4Q against 2H; any FS-relevant
                // mismatch (yds/td/int/rec) flags the corresponding displayed
                // cell rather than silently showing a possibly-wrong number —
                // this is how the untagged-holding-penalty edge case (see
                // comment above fballoGbParsePlayByPlayQuarter) surfaces itself.
                const quarterFlags = new Set();
                if (hasPlayByPlay) {
                    const q1 = { rushing: quarterTeams['1Q']?.[team]?.rushing[name] || null, passing: quarterTeams['1Q']?.[team]?.passing[name] || null, receiving: quarterTeams['1Q']?.[team]?.receiving[name] || null };
                    const q2 = { rushing: quarterTeams['2Q']?.[team]?.rushing[name] || null, passing: quarterTeams['2Q']?.[team]?.passing[name] || null, receiving: quarterTeams['2Q']?.[team]?.receiving[name] || null };
                    const q3 = { rushing: quarterTeams['3Q']?.[team]?.rushing[name] || null, passing: quarterTeams['3Q']?.[team]?.passing[name] || null, receiving: quarterTeams['3Q']?.[team]?.receiving[name] || null };
                    const q4 = { rushing: quarterTeams['4Q']?.[team]?.rushing[name] || null, passing: quarterTeams['4Q']?.[team]?.passing[name] || null, receiving: quarterTeams['4Q']?.[team]?.receiving[name] || null };

                    raw['1Q'] = { rushing: q1.rushing, passing: q1.passing, receiving: q1.receiving, fumbles: null };
                    raw['4Q'] = { rushing: q4.rushing, passing: q4.passing, receiving: q4.receiving, fumbles: null };
                    if (hasOT) {
                        raw['4Q+OT'] = {
                            rushing:   fballoGbSumCat([raw['4Q'].rushing,   raw['OT'].rushing]),
                            passing:   fballoGbSumCat([raw['4Q'].passing,   raw['OT'].passing]),
                            receiving: fballoGbSumCat([raw['4Q'].receiving, raw['OT'].receiving]),
                            fumbles:   raw['OT'].fumbles, // borrows OT's real box-score fumbles data
                        };
                    }

                    if (fballoGbQuarterPairMismatches(fballoGbSumQuarterCats(q1, q2), raw['1H'])) quarterFlags.add('1Q');
                    if (fballoGbQuarterPairMismatches(fballoGbSumQuarterCats(q3, q4), raw['2H'])) quarterFlags.add('4Q');
                }

                const extras = scoringInfo[name] || null;
                const warnings = [];
                if (extras?.warn) warnings.push(extras.warn);

                let cats = hasOT ? ['Full Game', '1H', '2H', 'OT', '2H+OT'] : ['Full Game', '1H', '2H'];
                if (hasPlayByPlay) {
                    cats = hasOT
                        ? ['Full Game', '1H', '1Q', '2H', 'OT', '2H+OT', '4Q', '4Q+OT']
                        : ['Full Game', '1H', '1Q', '2H', '4Q'];
                }
                const fs = {};
                cats.forEach(cat => {
                    const r = raw[cat];
                    const catExtras = cat === 'Full Game' ? extras : null;
                    // A player with no rushing/passing/receiving/fumbles line in
                    // this category still has a real FS if they scored via a
                    // return/fumble-recovery TD or 2pt conversion (Full Game
                    // scoring-info extras) — only truly blank when neither exists.
                    const hasAnyStat = r && (r.rushing || r.passing || r.receiving || r.fumbles);
                    if (!hasAnyStat && !catExtras) { fs[cat] = null; return; }
                    fs[cat] = fballoGbFsFromStats(r?.rushing, r?.passing, r?.receiving, r?.fumbles, catExtras);
                });

                rows.push({ team, name, dnp: false, raw, extras, fs, warnings, quarterFlags });
            });
        });

        rows.sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
        return { rows, hasOT, hasPlayByPlay, foundSections, roster };
    }

    // ── NFL Gamebook — "Find the Game" lookup ──────────
    // Unlike Basketball's version, this can ONLY get you to the NFL.com recap
    // page, not the actual Game Book PDF. Confirmed via live testing: the PDF
    // lives at a random Cloudinary URL (e.g. static.www.nfl.com/.../<uuid>.pdf)
    // that's only discoverable by reading the recap page's HTML — and that page
    // itself is CORS-blocked for direct browser fetch(), AND for three different
    // public CORS proxies (corsproxy.io, allorigins.win, codetabs.com — all
    // tested live against a real recap page and all failed). So there is no
    // client-side path to the PDF link itself. This is a genuine 2-step hop:
    // this lookup gets you to the right NFL.com page, then you click
    // "Download Game Book (PDF)" there yourself.
    //
    // NFL.com's own recap page URL pattern (confirmed against real pages):
    //   https://www.nfl.com/games/{away-nickname}-at-{home-nickname}-{year}-{seasonType}-{week}?tab=recap
    // — also not a documented/versioned API, so it can break if NFL.com
    // changes its URL scheme. If links start 404ing across the board, that's
    // the likely cause.
    function toNflComSlugSegment(name) {
        return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    // ESPN's season.slug values map to NFL.com's URL segments.
    // Post-season week numbering: ESPN and NFL.com don't agree here. Confirmed
    // live: for the Super Bowl, this app's own ESPN fetch returns week=5, but
    // NFL.com's real page is .../post-4 (nfl.com/schedules/2025/by-week/post-4
    // is literally titled the Super Bowl page). So ESPN's post-season week
    // numbering appears to run one higher than NFL.com's at the far end —
    // possibly because ESPN counts the Pro Bowl as a numbered week and NFL.com
    // doesn't. Only this one case (week 5 → Super Bowl → NFL.com week 4) has
    // been confirmed; Wild Card/Divisional/Conference weeks (post-season weeks
    // 1–3) have NOT been checked against real NFL.com pages, so if one of
    // those turns out wrong too, this may need to become a uniform -1 offset
    // for the whole post-season rather than just this special case.
    function toNflComPostseasonWeek(week) {
        if (week === 5) return 4; // Super Bowl — confirmed
        return week;
    }
    function toNflComSeasonType(slug) {
        if (slug === 'regular-season') return 'reg';
        if (slug === 'post-season') return 'post';
        if (slug === 'pre-season') return 'pre';
        return slug || 'reg';
    }

    const fballoGbLookupDate    = document.querySelector('#fballo-gb-lookup-date');
    const fballoGbLookupLoadBtn = document.querySelector('#fballo-gb-lookup-load-btn');
    const fballoGbLookupMsg     = document.querySelector('#fballo-gb-lookup-msg');
    const fballoGbLookupGameRow = document.querySelector('#fballo-gb-lookup-game-row');
    const fballoGbLookupGameSel = document.querySelector('#fballo-gb-lookup-game-select');
    const fballoGbLookupResult  = document.querySelector('#fballo-gb-lookup-result');
    const fballoGbLookupMatchup = document.querySelector('#fballo-gb-lookup-matchup');
    const fballoGbLookupLink    = document.querySelector('#fballo-gb-lookup-link');
    const fballoGbLookupLinkLabel = document.querySelector('#fballo-gb-lookup-link-label');
    const fballoGbLookupNote    = document.querySelector('#fballo-gb-lookup-note');

    function setFballoGbLookupMsg(msg, type = '') {
        fballoGbLookupMsg.textContent = msg;
        fballoGbLookupMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    let fballoGbLookupGamesCache = {}; // eventId -> the raw ESPN event object

    async function fballoGbLoadGames() {
        const date = fballoGbLookupDate.value;
        if (!date) { setFballoGbLookupMsg('Pick a date first.', 'error'); return; }

        fballoGbLookupGameRow.style.display = 'none';
        fballoGbLookupGameSel.innerHTML = '<option value="">Select a game…</option>';
        fballoGbLookupResult.style.display = 'none';
        fballoGbLookupLoadBtn.disabled = true;
        fballoGbLookupGamesCache = {};
        setFballoGbLookupMsg('Loading NFL games…', 'loading');

        try {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date.replaceAll('-', '')}`);
            if (!res.ok) throw new Error('scoreboard request failed');
            const data = await res.json();
            const events = data.events || [];

            if (events.length === 0) {
                setFballoGbLookupMsg(`No NFL games found on ${date}.`, 'error');
                return;
            }

            events.forEach(ev => { fballoGbLookupGamesCache[ev.id] = ev; });
            fballoGbLookupGameSel.innerHTML = '<option value="">Select a game…</option>' +
                events.map(ev => `<option value="${ev.id}">${ev.shortName || ev.name}</option>`).join('');
            fballoGbLookupGameRow.style.display = 'flex';
            setFballoGbLookupMsg(`Found ${events.length} game(s) on ${date}.`, 'success');
        } catch (err) {
            setFballoGbLookupMsg(
                'Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message,
                'error'
            );
        } finally {
            fballoGbLookupLoadBtn.disabled = false;
        }
    }
    fballoGbLookupLoadBtn.addEventListener('click', fballoGbLoadGames);

    // Cloudflare Worker that scrapes the recap page server-side (CORS doesn't
    // apply server-to-server) to find the actual Game Book PDF link, instead
    // of only linking to the recap page. If this fails for any reason
    // (Worker down, network issue, unexpected response), we fall back to the
    // same "link to the recap page, click Download yourself" flow as before —
    // that fallback ALWAYS works regardless of the Worker's status.
    const FBALLO_GB_WORKER_URL = 'https://gametime-nfl-gamebook-proxy.alex-s4.workers.dev/';

    fballoGbLookupGameSel.addEventListener('change', async () => {
        const eventId = fballoGbLookupGameSel.value;
        fballoGbLookupResult.style.display = 'none';
        const event = fballoGbLookupGamesCache[eventId];
        if (!event) return;

        const competitors = event.competitions?.[0]?.competitors || [];
        const home = competitors.find(c => c.homeAway === 'home');
        const away = competitors.find(c => c.homeAway === 'away');
        if (!home || !away) return;

        const awaySlug = toNflComSlugSegment(away.team.name);
        const homeSlug = toNflComSlugSegment(home.team.name);
        const seasonType = toNflComSeasonType(event.season?.slug);
        const week = seasonType === 'post' ? toNflComPostseasonWeek(event.week?.number) : event.week?.number;
        const year = event.season?.year;
        const recapUrl = `https://www.nfl.com/games/${awaySlug}-at-${homeSlug}-${year}-${seasonType}-${week}?tab=recap`;

        const scoreLine = (home.score != null && away.score != null) ? ` — ${away.score}-${home.score}` : '';
        fballoGbLookupMatchup.textContent = `${away.team.displayName} @ ${home.team.displayName}${scoreLine}`;

        // Show a loading state while we check for a direct PDF link, instead
        // of flashing the recap-page fallback first and swapping it a moment
        // later — the result block only appears once we know the final answer.
        fballoGbLookupResult.style.display = 'none';
        setFballoGbLookupMsg('Looking up the direct PDF link…', 'loading');

        try {
            const workerUrl = `${FBALLO_GB_WORKER_URL}?away=${encodeURIComponent(awaySlug)}&home=${encodeURIComponent(homeSlug)}&year=${year}&seasonType=${seasonType}&week=${week}`;
            const res = await fetch(workerUrl);
            const data = await res.json();
            if (res.ok && data.pdfUrl) {
                fballoGbLookupLink.href = data.pdfUrl;
                fballoGbLookupLinkLabel.textContent = 'Open Game Book PDF';
                fballoGbLookupNote.textContent = 'Save it, then drop it into the box below.';
                setFballoGbLookupMsg('Found the direct PDF link.', 'success');
            } else {
                // Worker responded but didn't find a PDF — fall back to the recap-page link.
                fballoGbLookupLink.href = recapUrl;
                fballoGbLookupLinkLabel.textContent = 'Open NFL.com Recap Page';
                fballoGbLookupNote.innerHTML = 'Once there, scroll to "Download Game Book (PDF)" and save it, then drop it into the box below. This link is a best-effort guess at NFL.com\'s page-naming pattern — if it 404s, try <a href="https://www.nfl.com/scores" target="_blank" rel="noopener noreferrer">NFL.com\'s Scores page</a> instead.';
                setFballoGbLookupMsg('Couldn\'t find a direct PDF link — falling back to the recap page.', 'error');
            }
        } catch {
            // Worker unreachable (down, network issue, CORS mismatch) — fall back to the recap-page link.
            fballoGbLookupLink.href = recapUrl;
            fballoGbLookupLinkLabel.textContent = 'Open NFL.com Recap Page';
            fballoGbLookupNote.innerHTML = 'Once there, scroll to "Download Game Book (PDF)" and save it, then drop it into the box below. This link is a best-effort guess at NFL.com\'s page-naming pattern — if it 404s, try <a href="https://www.nfl.com/scores" target="_blank" rel="noopener noreferrer">NFL.com\'s Scores page</a> instead.';
            setFballoGbLookupMsg('Direct PDF lookup unavailable — falling back to the recap page.', 'error');
        }
        fballoGbLookupResult.style.display = 'block';
    });

    // --- NFL Offensive Gamebook — UI wiring (mirrors Basketball's bballGb pattern) ---
    const fballoGbFileInput      = document.querySelector('#fballo-gb-file-input');
    const fballoGbDropZone       = document.querySelector('#fballo-gb-dropzone');
    const fballoGbStatus         = document.querySelector('#fballo-gb-status');
    const fballoGbMissing        = document.querySelector('#fballo-gb-missing');
    const fballoGbTeamTabs       = document.querySelector('#fballo-gb-team-tabs');
    const fballoGbResultsWrap    = document.querySelector('#fballo-gb-results-wrap');
    const fballoGbResultsHead    = document.querySelector('#fballo-gb-results-head');
    const fballoGbResultsBody    = document.querySelector('#fballo-gb-results-body');
    const fballoGbBreakdownLabel = document.querySelector('#fballo-gb-breakdown-label');
    const fballoGbBreakdownArea  = document.querySelector('#fballo-gb-breakdown-area');
    const fballoGbBreakdownEl    = document.querySelector('#fballo-gb-breakdown');
    const fballoGbBreakdownCopy  = document.querySelector('#fballo-gb-breakdown-copy');

    let fballoGbLastRows   = [];
    let fballoGbHasOT      = false;
    let fballoGbHasPlayByPlay = false;
    let fballoGbActiveTeam = null;

    function fballoGbSetStatus(msg, type = '') {
        fballoGbStatus.textContent = msg;
        fballoGbStatus.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    /** Full raw stat line for one category table (all columns, not just the FS-relevant ones). */
    function fballoGbRawLines(raw) {
        const lines = [];
        if (raw.rushing) {
            const s = raw.rushing;
            lines.push(`Rushing — ATT ${s.att} / YDS ${s.yds} / AVG ${s.avg} / LG ${s.lg} / TD ${s.td}`);
        }
        if (raw.passing) {
            const s = raw.passing;
            lines.push(`Passing — ATT ${s.att} / CMP ${s.cmp} / YDS ${s.yds} / SK-YD ${s.sackYd} / TD ${s.td} / LG ${s.lg} / IN ${s.int} / RT ${s.rt}`);
        }
        if (raw.receiving) {
            const s = raw.receiving;
            lines.push(`Receiving — TAR ${s.tar} / REC ${s.rec} / YDS ${s.yds} / AVG ${s.avg} / LG ${s.lg} / TD ${s.td}`);
        }
        if (raw.fumbles) {
            const s = raw.fumbles;
            lines.push(`Fumbles — FUM ${s.fum} / LOST ${s.lost} / OWN-REC ${s.ownRec} / YDS ${s.ownRecYds} / TD ${s.ownRecTd} / FORCED ${s.forced} / OPP-REC ${s.oppRec} / YDS ${s.oppRecYds} / TD ${s.oppRecTd} / OUT-BDS ${s.outBds}`);
        }
        return lines;
    }

    function fballoGbBreakdownLines(r, cat) {
        const raw = r.raw[cat] || {};
        const extras = cat === 'Full Game' ? r.extras : null;
        const passYd = raw.passing?.yds || 0, passTd = raw.passing?.td || 0, int = raw.passing?.int || 0;
        const rushYd = raw.rushing?.yds || 0, rushTd = raw.rushing?.td || 0;
        const recYd  = raw.receiving?.yds || 0, recTd = raw.receiving?.td || 0, rec = raw.receiving?.rec || 0;
        const twoPtc = extras?.twoPtc || 0, ofrt = extras?.ofrt || 0, kpfgrtd = extras?.kpfgrtd || 0;
        // Fumbles aren't tracked per-quarter at all (no reliable per-quarter
        // fumbles data exists in the play text) — 4Q+OT is the exception
        // since it borrows OT's real box-score fumbles figure.
        const fumblesNotTracked = (cat === '1Q' || cat === '4Q');
        const fumLost = raw.fumbles?.lost || 0;
        const lines = [
            `Passing Yards: 0.04 pts/yard (${passYd}) = ${Number((passYd * 0.04).toFixed(2))}`,
            `Passing TDs: 4 pts (${passTd}) = ${passTd * 4}`,
            `Interceptions: -1 pt (${int}) = ${int * -1}`,
            `Rushing Yards: 0.1 pts/yard (${rushYd}) = ${Number((rushYd * 0.1).toFixed(1))}`,
            `Rushing TDs: 6 pts (${rushTd}) = ${rushTd * 6}`,
            `Receiving Yards: 0.1 pts/yard (${recYd}) = ${Number((recYd * 0.1).toFixed(1))}`,
            `Receiving TDs: 6 pts (${recTd}) = ${recTd * 6}`,
            `Receptions: 1 pt (${rec}) = ${rec}`,
            fumblesNotTracked
                ? 'Fumbles Lost: not tracked per-quarter (excluded from this total)'
                : `Fumbles Lost: -1 pt (${fumLost}) = ${fumLost * -1}`,
        ];
        if (cat === 'Full Game') {
            lines.push(
                `2 Point Conversions: 2 pts (${twoPtc}) = ${twoPtc * 2}`,
                `Offensive Fumble Recovery Touchdown: 6 pts (${ofrt}) = ${ofrt * 6}`,
                `Kick/Punt/Field Goal Return Touchdown: 6 pts (${kpfgrtd}) = ${kpfgrtd * 6}`,
            );
        } else {
            lines.push('2-Pt Conversions / Off. Fumble Recovery TD / Kick-Punt-FG Return TD: only tracked for Full Game.');
        }

        if ((cat === '1Q' || cat === '4Q') && r.quarterFlags?.has(cat)) {
            lines.push(
                '',
                `⚠ ${cat} vs. box score check: this quarter's split doesn't fully reconcile against the trustworthy ${cat === '1Q' ? '1H' : '2H'} total.`,
                'Most likely cause: an untagged offensive-holding penalty (no "- No Play" text) that the NFL credits at the foul spot — that adjustment can\'t be derived from the play text alone. Full Game/1H/2H/OT numbers above are NOT affected, only this quarter split.'
            );
        }

        const rawLines = fballoGbRawLines(raw);
        if (rawLines.length) {
            lines.push('', '— Full raw stat line —', ...rawLines);
        }
        return lines;
    }

    function fballoGbShowBreakdown(row, cat) {
        const fs = row.fs[cat];
        if (fs === null || fs === undefined) return;
        const header = `${row.name} - ${cat} FS`;
        const text = `${header}\n${fballoGbBreakdownLines(row, cat).join('\n')}\n\nTOTAL FS = ${fs}`;
        fballoGbBreakdownEl.value = text;
        fballoGbBreakdownLabel.style.display = 'block';
        fballoGbBreakdownArea.style.display = 'block';
    }

    function fballoGbFmtCell(row, cat) {
        const val = row.fs[cat];
        if (val === null || val === undefined) return '<span class="gamebook-dnp-cell">—</span>';
        const key = `${row.team}__${row.name}`;
        const flagged = (cat === '1Q' || cat === '4Q') && row.quarterFlags?.has(cat);
        const flagMark = flagged ? ' <span class="gamebook-cell-flagged" title="Doesn\'t fully reconcile against the box-score total — click for details">⚠</span>' : '';
        return `<span class="gamebook-cell-clickable" data-key="${key}" data-cat="${cat}">${val}${flagMark}</span>`;
    }

    function fballoGbRenderTeamTabs(rows) {
        const teams = [...new Set(rows.map(r => r.team))];
        fballoGbTeamTabs.innerHTML = teams.map(t =>
            `<label class="round-pill" style="width:${Math.floor(100 / teams.length) - 1}%">
                <input type="radio" name="fballo-gb-team-tab" value="${t}" ${t === fballoGbActiveTeam ? 'checked' : ''}> ${t}
             </label>`
        ).join('');
        fballoGbTeamTabs.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                fballoGbActiveTeam = radio.value;
                fballoGbBreakdownLabel.style.display = 'none';
                fballoGbBreakdownArea.style.display = 'none';
                fballoGbRenderResults(fballoGbLastRows, fballoGbHasOT, fballoGbHasPlayByPlay, fballoGbActiveTeam);
            });
        });
        fballoGbTeamTabs.style.display = teams.length > 0 ? 'flex' : 'none';
    }

    function fballoGbRawCell(row, cat, category, key) {
        const raw = row.raw?.[cat]?.[category];
        if (!raw) return '—';
        return raw[key] ?? '—';
    }

    function fballoGbRenderResults(allRows, hasOT, hasPlayByPlay, activeTeam) {
        const rows = allRows.filter(r => r.team === activeTeam);
        let cats = hasOT ? ['Full Game', '1H', '2H', 'OT', '2H+OT'] : ['Full Game', '1H', '2H'];
        if (hasPlayByPlay) {
            cats = hasOT
                ? ['Full Game', '1H', '1Q', '2H', 'OT', '2H+OT', '4Q', '4Q+OT']
                : ['Full Game', '1H', '1Q', '2H', '4Q'];
        }

        fballoGbResultsHead.innerHTML = '<tr><th>Player</th>' +
            cats.map(c => `<th>${c} FS</th>`).join('') + '<th>Flags</th></tr>';

        fballoGbResultsBody.innerHTML = rows.map(r => {
            if (r.dnp) {
                return `<tr><td>${r.name}</td>${cats.map(() => '<td><span class="gamebook-dnp-cell">DNP</span></td>').join('')}<td>—</td></tr>`;
            }
            const cells = cats.map(c => `<td>${fballoGbFmtCell(r, c)}</td>`).join('');
            const flags = r.warnings.length
                ? `<span class="manual-badge gamebook-flag-warn" title="${r.warnings.join('; ')}">⚠ Check</span>`
                : '—';
            return `<tr><td>${r.name}</td>${cells}<td>${flags}</td></tr>`;
        }).join('');
    }

    fballoGbResultsBody.addEventListener('click', e => {
        const cell = e.target.closest('.gamebook-cell-clickable');
        if (!cell) return;
        const row = fballoGbLastRows.find(r => `${r.team}__${r.name}` === cell.dataset.key);
        if (!row) return;
        document.querySelectorAll('.gamebook-cell-active').forEach(el => el.classList.remove('gamebook-cell-active'));
        cell.classList.add('gamebook-cell-active');
        fballoGbShowBreakdown(row, cell.dataset.cat);
    });

    fballoGbBreakdownCopy.addEventListener('click', () => {
        fballoGbBreakdownEl.select();
        fballoGbBreakdownEl.setSelectionRange(0, 99999);
        const toastBtn = document.getElementById('liveToastBtn');
        if (toastBtn) toastBtn.click();
        navigator.clipboard.writeText(fballoGbBreakdownEl.value);
    });

    async function fballoGbHandleFile(file) {
        if (!file || file.type !== 'application/pdf') {
            fballoGbSetStatus('Please upload a PDF file.', 'error');
            return;
        }
        fballoGbResultsWrap.style.display = 'none';
        fballoGbResultsBody.innerHTML = '';
        fballoGbResultsHead.innerHTML = '';
        fballoGbMissing.textContent = '';
        fballoGbBreakdownLabel.style.display = 'none';
        fballoGbBreakdownArea.style.display = 'none';
        fballoGbSetStatus(`Reading ${file.name}…`, 'loading');

        try {
            const buffer = await file.arrayBuffer();
            const { rows, hasOT, hasPlayByPlay, foundSections } = await fballoGbParsePdf(buffer);
            fballoGbLastRows = rows;
            fballoGbHasOT = hasOT;
            fballoGbHasPlayByPlay = hasPlayByPlay;

            const required = ['Full Game', '1H'];
            const missing = required.filter(t => !foundSections.includes(t));
            if (missing.length > 0) {
                fballoGbMissing.textContent = `Note: could not find these sections in the PDF — ${missing.join(', ')}. Related columns may be incomplete.`;
            } else if (!foundSections.includes('2H')) {
                fballoGbMissing.textContent = `Note: this gamebook has no separate "Second Half Summary" section — 2H was computed as Full Game minus 1H instead.`;
            } else if (!hasPlayByPlay) {
                fballoGbMissing.textContent = `Note: no "Play By Play" sections found — 1Q/4Q breakdown isn't available for this file.`;
            }

            const teams = [...new Set(rows.map(r => r.team))];
            fballoGbActiveTeam = teams[0] || null;
            fballoGbRenderTeamTabs(rows);
            fballoGbRenderResults(rows, hasOT, hasPlayByPlay, fballoGbActiveTeam);

            const dnpCount = rows.filter(r => r.dnp).length;
            fballoGbSetStatus(
                `Parsed ${rows.length - dnpCount} player(s)${dnpCount ? ` (${dnpCount} DNP)` : ''} from ${foundSections.length} section(s)${hasOT ? ' (game went to OT)' : ''}. Click any FS value for its breakdown.`,
                'success'
            );
            fballoGbResultsWrap.style.display = 'block';
        } catch (err) {
            fballoGbSetStatus('Could not parse this PDF — ' + err.message, 'error');
        }
    }

    fballoGbFileInput.addEventListener('change', () => fballoGbHandleFile(fballoGbFileInput.files[0]));
    ['dragenter', 'dragover'].forEach(evt =>
        fballoGbDropZone.addEventListener(evt, e => { e.preventDefault(); fballoGbDropZone.classList.add('gamebook-dropzone--active'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
        fballoGbDropZone.addEventListener(evt, e => { e.preventDefault(); fballoGbDropZone.classList.remove('gamebook-dropzone--active'); })
    );
    fballoGbDropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) fballoGbHandleFile(file);
    });
    fballoGbDropZone.addEventListener('click', () => fballoGbFileInput.click());

    document.querySelector('#fballo-gb-clear').addEventListener('click', () => {
        fballoGbFileInput.value = '';
        fballoGbResultsWrap.style.display = 'none';
        fballoGbResultsBody.innerHTML = '';
        fballoGbResultsHead.innerHTML = '';
        fballoGbMissing.textContent = '';
        fballoGbTeamTabs.innerHTML = '';
        fballoGbTeamTabs.style.display = 'none';
        fballoGbBreakdownLabel.style.display = 'none';
        fballoGbBreakdownArea.style.display = 'none';
        fballoGbLastRows = [];
        fballoGbHasOT = false;
        fballoGbHasPlayByPlay = false;
        fballoGbActiveTeam = null;
        fballoGbSetStatus('', '');
    });

} // end initNfl