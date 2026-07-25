// ============================================================
//  GameTime Platform — Basketball (NBA / WNBA / CBB)
//  basketball.js
//
//  Everything Basketball-specific: Gamebook Upload, the "Find the Game
//  Book" lookup, Player Search, Name Search, and Manual modes. Confirmed
//  self-contained during the split — nothing outside this file references
//  computeBballFS/resolveEspnAthlete/etc., and this file doesn't reach into
//  any other sport's scope either.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox,
} from './shared.js';

export function initBasketball() {
    // ========================================================
    //  BASKETBALL (NBA / WNBA / CBB)
    // ========================================================
    //
    // Player Search, Name Search, and Manual are fully independent modes —
    // each has its own name field (or tracked name, for Player Search),
    // stat-table, total, Go/Clear, fetch-msg/matchup, and breakdown. They
    // used to share one set of elements, which meant switching modes could
    // show a previous mode's leftover fetch result. computeBballFS() below
    // is the one shared piece — just the math/breakdown-building logic,
    // parameterized by which mode's elements to read from and write to —
    // so the formula itself can't drift between modes even though their
    // DOM/state is fully separate.
    const bballHeaderEl = document.querySelector('#head-bball');
    bballHeaderEl.addEventListener('click', () => toggleSection('#content-bball'));

    /** Compute FS from one mode's stat inputs and render its breakdown. Returns the (possibly new) hide-zeros checkbox reference for that mode. */
    function computeBballFS(ids) {
        const ptsVal  = Number(ids.pts.value);
        const rebsVal = Number((Number(ids.rebs.value) * 1.2).toFixed(1));
        const astVal  = Number((Number(ids.asst.value)  * 1.5).toFixed(1));
        const blkVal  = Number(ids.blk.value) * 3;
        const stlVal  = Number(ids.stl.value) * 3;
        const toVal   = Number(ids.to.value)  * -1;
        const total = Number((ptsVal + rebsVal + astVal + blkVal + stlVal + toVal).toFixed(1));

        ids.pointsVal.innerHTML    = `= ${ptsVal}`;
        ids.reboundsVal.innerHTML  = `= ${rebsVal}`;
        ids.assistsVal.innerHTML   = `= ${astVal}`;
        ids.blocksVal.innerHTML    = `= ${blkVal}`;
        ids.stealsVal.innerHTML    = `= ${stlVal}`;
        ids.turnoversVal.innerHTML = `= ${toVal}`;
        ids.totalEl.innerHTML = total;
        fillEmptyInputs(ids.inputs);

        const statLines = [
            `Points: 1 pt (${ids.pts.value}) = ${ptsVal}`,
            `Rebound: 1.2 pts (${ids.rebs.value}) = ${rebsVal}`,
            `Assist: 1.5 pts (${ids.asst.value}) = ${astVal}`,
            `Block: 3 pts (${ids.blk.value}) = ${blkVal}`,
            `Steal: 3 pts (${ids.stl.value}) = ${stlVal}`,
            `Turnover: -1 pt (${ids.to.value}) = ${toVal}`,
        ];
        const header = buildHeader(ids.playerName(), undefined);
        const breakdownText = withHeader(header, buildBreakdown(statLines, total));
        showBreakdown(ids.breakdownSel, ids.textareaBtnContSel, breakdownText);
        document.getElementById(ids.breakdownWrapId).style.display = 'block';
        return setupHideZerosCheckbox(ids.hzsChk, ids.breakdownSel, statLines, ids.inputs, total, '', header);
    }

    // ── Manual mode (keeps the original bball-* IDs — it's the "base" set) ──
    const bballTotalEl  = document.querySelector('#bball-total-fs');
    const bballGoBtn    = document.querySelector('#bball-btn');
    const bballClearBtn = document.querySelector('#bball-clear');
    const bballCopyBtn  = document.querySelector('#bball-copy');
    const bballInputs   = document.querySelectorAll('.bball-fs');
    const bballVals     = document.querySelectorAll('#bball-manual-mode .bball-val');
    const bballPts  = document.getElementById('bball-pts');
    const bballRebs = document.getElementById('bball-rebs');
    const bballAst  = document.getElementById('bball-asst');
    const bballBlk  = document.getElementById('bball-blk');
    const bballStl  = document.getElementById('bball-stl');
    const bballTo   = document.getElementById('bball-to');
    let   bballHzsChk = document.querySelector('#bball-hzs-checkbox');
    const bballManualIds = {
        pts: bballPts, rebs: bballRebs, asst: bballAst, blk: bballBlk, stl: bballStl, to: bballTo,
        pointsVal: document.querySelector('#bball-points-val'),
        reboundsVal: document.querySelector('#bball-rebounds-val'),
        assistsVal: document.querySelector('#bball-assists-val'),
        blocksVal: document.querySelector('#bball-blocks-val'),
        stealsVal: document.querySelector('#bball-steals-val'),
        turnoversVal: document.querySelector('#bball-turnovers-val'),
        totalEl: bballTotalEl, inputs: bballInputs,
        playerName: () => document.getElementById('bball-player-name').value,
        breakdownSel: '#bball-breakdown', textareaBtnContSel: '#bball-textarea-btn-cont',
        breakdownWrapId: 'bball-breakdown-wrap', hzsChk: bballHzsChk,
    };
    bballGoBtn.addEventListener('click', () => {
        bballManualIds.hzsChk = bballHzsChk;
        bballHzsChk = computeBballFS(bballManualIds);
    });
    bballClearBtn.addEventListener('click', () => {
        bballInputs.forEach(i => i.value = '');
        bballVals.forEach(v => v.innerHTML = '');
        document.getElementById('bball-player-name').value = '';
        bballTotalEl.innerHTML = '';
        document.querySelector('#bball-breakdown').innerHTML = '';
        document.querySelector('#bball-textarea-btn-cont').style.display = 'none';
        document.getElementById('bball-breakdown-wrap').style.display = 'none';
    });
    bballCopyBtn.addEventListener('click', () => copyBreakdown('#bball-breakdown'));

    // ── Basketball — Mode toggle (Gamebook / Player Search / Name Search / Manual) ──
    // Each mode is now fully self-contained, so this only needs to show/hide
    // the 4 panels (plus the shared date row) — no more shared-footer state.
    document.querySelectorAll('.bball-mode-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const isGamebook = document.getElementById('bball-mode-gamebook').checked;
            const isSearch   = document.getElementById('bball-mode-search').checked;
            const isName     = document.getElementById('bball-mode-name').checked;
            const isManual   = !isGamebook && !isSearch && !isName;

            document.getElementById('bball-gamebook-mode').style.display = isGamebook ? 'block' : 'none';
            document.getElementById('bball-search-mode').style.display   = isSearch   ? 'block' : 'none';
            document.getElementById('bball-name-mode').style.display     = isName     ? 'block' : 'none';
            document.getElementById('bball-manual-mode').style.display   = isManual   ? 'block' : 'none';
            document.getElementById('bball-date-row').style.display      = (isSearch || isName) ? 'block' : 'none';
        });
    });

    // ============================================================
    //  Basketball — Upload Gamebook mode
    //
    //  Parses the NBA.com/WNBA.com official Game Book PDF the same way
    //  the Gamebook Checker does (gamebook-checker.js) — pdf.js only
    //  gives raw positioned text fragments, so rows are reconstructed by
    //  clustering fragments by y-coordinate and sorting by x-coordinate
    //  within each cluster. That part is identical to the Gamebook
    //  Checker; what's new here is pulling the FULL stat line per
    //  player per section (not just MIN) and computing fantasy score
    //  per period using the existing formula (Pts x1, Reb x1.2, Ast
    //  x1.5, Blk x3, Stl x3, TO x-1).
    //
    //  Categories shown: Full Game (FINAL BOX, already includes OT),
    //  1H, 1Q, 2H, OT, 2H+OT, 4Q, 4Q+OT. The OT/2H+OT/4Q+OT columns are
    //  only shown if the game actually went to overtime.
    // ============================================================
    const BBALL_GB_SECTION_TITLES = [
        'FINAL BOX', '1st QUARTER ONLY', '2nd QUARTER ONLY', 'FIRST HALF',
        '3rd QUARTER ONLY', '1st QUARTER - 3rd QUARTER', '4th QUARTER ONLY',
        '1st QUARTER - 4th QUARTER', 'SECOND HALF',
    ];
    const BBALL_GB_OT_PATTERN = /^(\d+)(?:st|nd|rd|th) OT ONLY$/;
    // Fixed column order after the MIN token in every player row.
    const BBALL_GB_STAT_KEYS = ['fg', 'fga', 'fg3', 'fg3a', 'ft', 'fta', 'or', 'dr', 'tot', 'ast', 'pf', 'stl', 'to', 'blk', 'plusMinus', 'pts'];

    /** Cluster pdf.js text items into visually-ordered rows (top-to-bottom, left-to-right). */
    function bballGbReconstructRows(items, yTolerance = 2.5) {
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
    async function bballGbExtractPageLines(page) {
        const content = await page.getTextContent();
        return bballGbReconstructRows(content.items);
    }
    /** Identify which known section a page belongs to. Returns null for non-box-score pages (play-by-play, etc). */
    function bballGbDetectSectionTitle(lines) {
        if (!lines.some(l => l.includes("OFFICIAL SCORER'S"))) return null;
        const titleLines = lines.slice(0, 6);
        const joined = titleLines.join(' | ');
        const fixed = BBALL_GB_SECTION_TITLES.find(title => joined.includes(title));
        if (fixed) return fixed;
        const ot = titleLines.find(l => BBALL_GB_OT_PATTERN.test(l.trim()));
        return ot ? ot.trim() : null;
    }
    /** Parse a single active-player row into jersey/name/stats, or a warning if the column count doesn't match. */
    function bballGbParsePlayerRow(line) {
        const tokens = line.split(' ');
        if (tokens.length < 3) return null;
        const jersey = tokens[0];
        if (!/^\d{1,2}$/.test(jersey)) return null;

        const minIdx = tokens.findIndex(t => /^\d{1,2}:\d{2}$/.test(t));
        if (minIdx < 2) return null;

        let nameEnd = minIdx;
        const maybePos = tokens[minIdx - 1];
        if (['F', 'C', 'G'].includes(maybePos) && minIdx - 1 > 1) nameEnd = minIdx - 1;
        const name = tokens.slice(1, nameEnd).join(' ');

        const statTokens = tokens.slice(minIdx + 1);
        if (statTokens.length !== BBALL_GB_STAT_KEYS.length) {
            return { jersey, name, stats: null, parseWarning: `Expected ${BBALL_GB_STAT_KEYS.length} stat columns, found ${statTokens.length}` };
        }
        const stats = {};
        BBALL_GB_STAT_KEYS.forEach((key, i) => { stats[key] = Number(statTokens[i]); });
        return { jersey, name, stats, parseWarning: null };
    }
    /** Parse a "DNP - <reason>" row. */
    function bballGbParseDnpRow(line) {
        const m = line.match(/^(\d{1,2})\s+(.+?)\s+DNP\s*-\s*(.+)$/);
        return m ? { jersey: m[1], name: m[2].trim() } : null;
    }
    /** Parse one section page's lines into { teamName: { players: [...] } }. */
    function bballGbParseSectionPage(lines) {
        const teams = {};
        let currentTeam = null;
        for (const line of lines) {
            const visitorMatch = line.match(/^VISITOR:\s*(.+?)(?:\s*\(\d+-\d+\))?$/);
            const homeMatch = line.match(/^HOME:\s*(.+?)(?:\s*\(\d+-\d+\))?$/);
            if (visitorMatch) { currentTeam = visitorMatch[1].trim(); teams[currentTeam] = { players: [] }; continue; }
            if (homeMatch)    { currentTeam = homeMatch[1].trim();    teams[currentTeam] = { players: [] }; continue; }
            if (!currentTeam) continue;
            if (/^\d{2,3}:00\s/.test(line)) { currentTeam = null; continue; } // team totals row
            if (line.startsWith('POS ')) continue; // header row

            const dnp = bballGbParseDnpRow(line);
            if (dnp) { teams[currentTeam].players.push({ jersey: dnp.jersey, name: dnp.name, dnp: true }); continue; }
            const active = bballGbParsePlayerRow(line);
            if (active) teams[currentTeam].players.push({ jersey: active.jersey, name: active.name, dnp: false, stats: active.stats, parseWarning: active.parseWarning });
        }
        return teams;
    }
    /** Fantasy score from a raw stat object using the existing Basketball FS formula. */
    function bballGbFsFromStats(stats) {
        if (!stats) return null;
        return Number((stats.pts * 1 + stats.tot * 1.2 + stats.ast * 1.5 + stats.blk * 3 + stats.stl * 3 + stats.to * -1).toFixed(1));
    }
    /** Sum raw stats across multiple period sections (used for 2H+OT / 4Q+OT combos). */
    function bballGbSumStats(statsList) {
        const valid = statsList.filter(Boolean);
        if (valid.length === 0) return null;
        const sum = {};
        ['pts', 'tot', 'ast', 'blk', 'stl', 'to'].forEach(k => { sum[k] = valid.reduce((acc, s) => acc + (s[k] || 0), 0); });
        return sum;
    }
    /** Build one row per player with FS for every required category. */
    function bballGbBuildTable(sections) {
        const master = {};
        Object.keys(sections).forEach(title => {
            Object.entries(sections[title]).forEach(([team, teamData]) => {
                teamData.players.forEach(p => {
                    const key = `${team}__${p.jersey}`;
                    if (!master[key]) master[key] = { team, jersey: p.jersey, name: p.name, fullGameDnp: false, raw: {}, warnings: [] };
                    if (p.dnp) {
                        if (title === 'FINAL BOX') master[key].fullGameDnp = true;
                        master[key].raw[title] = null;
                    } else {
                        master[key].raw[title] = p.stats;
                        if (p.parseWarning) master[key].warnings.push(`${title}: ${p.parseWarning}`);
                    }
                });
            });
        });

        const otTitles = Object.keys(sections).filter(t => BBALL_GB_OT_PATTERN.test(t));
        const rows = Object.values(master).map(r => {
            const otStatsList = otTitles.map(t => r.raw[t]).filter(Boolean);
            const otCombined = otTitles.length > 0 ? bballGbSumStats(otStatsList) : null;
            const secondHalfRaw = r.raw['SECOND HALF'] || null;
            const fourthQRaw = r.raw['4th QUARTER ONLY'] || null;

            // Raw stats per category, keyed the same way as the display
            // columns — kept alongside the FS number so a clicked cell can
            // show the full stat-line breakdown, not just the total.
            const statsByCategory = {
                'Full Game': r.raw['FINAL BOX'],
                '1H':        r.raw['FIRST HALF'],
                '1Q':        r.raw['1st QUARTER ONLY'],
                '2H':        secondHalfRaw,
                'OT':        otCombined,
                '2H+OT':     (secondHalfRaw || otCombined) ? bballGbSumStats([secondHalfRaw, otCombined]) : null,
                '4Q':        fourthQRaw,
                '4Q+OT':     (fourthQRaw || otCombined) ? bballGbSumStats([fourthQRaw, otCombined]) : null,
            };
            const fs = {};
            Object.keys(statsByCategory).forEach(cat => { fs[cat] = bballGbFsFromStats(statsByCategory[cat]); });

            return {
                team: r.team, jersey: r.jersey, name: r.name,
                fullGameDnp: r.fullGameDnp, warnings: r.warnings,
                statsByCategory, fs,
            };
        });
        rows.sort((a, b) => a.team.localeCompare(b.team) || Number(a.jersey) - Number(b.jersey));
        return { rows, hasOT: otTitles.length > 0 };
    }
    /** Top-level: parse an uploaded Game Book PDF (ArrayBuffer) into the per-player FS table. */
    async function bballGbParsePdf(arrayBuffer) {
        const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const sections = {};
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const lines = await bballGbExtractPageLines(page);
            const title = bballGbDetectSectionTitle(lines);
            if (!title || sections[title]) continue; // skip PBP pages / unexpected duplicates
            sections[title] = bballGbParseSectionPage(lines);
        }
        const foundSections = Object.keys(sections);
        if (foundSections.length === 0) {
            throw new Error("No recognizable Official Scorer's Report sections found — is this an NBA.com/WNBA.com Game Book PDF?");
        }
        const { rows, hasOT } = bballGbBuildTable(sections);
        return { rows, hasOT, foundSections };
    }

    // --- Basketball Gamebook — UI wiring ---
    const bballGbFileInput      = document.querySelector('#bball-gb-file-input');
    const bballGbDropZone       = document.querySelector('#bball-gb-dropzone');
    const bballGbStatus         = document.querySelector('#bball-gb-status');
    const bballGbMissing        = document.querySelector('#bball-gb-missing');
    const bballGbTeamTabs       = document.querySelector('#bball-gb-team-tabs');
    const bballGbResultsWrap    = document.querySelector('#bball-gb-results-wrap');
    const bballGbResultsHead    = document.querySelector('#bball-gb-results-head');
    const bballGbResultsBody    = document.querySelector('#bball-gb-results-body');
    const bballGbBreakdownLabel = document.querySelector('#bball-gb-breakdown-label');
    const bballGbBreakdownArea  = document.querySelector('#bball-gb-breakdown-area');
    const bballGbBreakdownEl    = document.querySelector('#bball-gb-breakdown');
    const bballGbBreakdownCopy  = document.querySelector('#bball-gb-breakdown-copy');

    const BBALL_GB_REQUIRED_SECTIONS = ['FINAL BOX', 'FIRST HALF', 'SECOND HALF', '1st QUARTER ONLY', '4th QUARTER ONLY'];
    // The 5 categories Alex actually wants tracked, per his rule that Full
    // Game/2H/4Q include OT — so the "real" 2H/4Q here are the +OT columns.
    const BBALL_GB_HIGHLIGHTED = new Set(['Full Game', '1H', '1Q', '2H+OT', '4Q+OT']);

    let bballGbLastRows   = []; // current parse results (all players, incl. full-game DNPs), kept for cell-click lookup
    let bballGbHasOT      = false;
    let bballGbActiveTeam = null;


    function bballGbSetStatus(msg, type = '') {
        bballGbStatus.textContent = msg;
        bballGbStatus.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    /** Same per-stat breakdown lines/formula as the manual Go button, built from a raw stat object. */
    function bballGbBreakdownLines(stats) {
        const ptsVal  = stats.pts;
        const rebsVal = Number((stats.tot * 1.2).toFixed(1));
        const astVal  = Number((stats.ast * 1.5).toFixed(1));
        const blkVal  = stats.blk * 3;
        const stlVal  = stats.stl * 3;
        const toVal   = stats.to * -1;
        return [
            `Points: 1 pt (${stats.pts}) = ${ptsVal}`,
            `Rebound: 1.2 pts (${stats.tot}) = ${rebsVal}`,
            `Assist: 1.5 pts (${stats.ast}) = ${astVal}`,
            `Block: 3 pts (${stats.blk}) = ${blkVal}`,
            `Steal: 3 pts (${stats.stl}) = ${stlVal}`,
            `Turnover: -1 pt (${stats.to}) = ${toVal}`,
        ];
    }

    /** Show the full stat-line breakdown for one player/category cell, copy-paste ready. */
    function bballGbShowBreakdown(row, category) {
        const stats = row.statsByCategory[category];
        const fs = row.fs[category];
        if (!stats || fs === null) return; // DNP or no data for this category — nothing to break down

        const header = `${row.name} - ${category} FS`;
        const text = `${header}\n${bballGbBreakdownLines(stats).join('\n')}\n\nTOTAL FS = ${fs}`;
        bballGbBreakdownEl.value = text;
        bballGbBreakdownLabel.style.display = 'block';
        bballGbBreakdownArea.style.display = 'block';
    }

    function bballGbFmtCell(row, key) {
        const val = row.fs[key];
        if (val === null) return '<span class="gamebook-dnp-cell">DNP</span>'; // DNP for that specific period only
        const key_ = `${row.team}__${row.jersey}`;
        return `<span class="gamebook-cell-clickable" data-key="${key_}" data-cat="${key}">${val}</span>`;
    }

    /** Build the team-tab pills from all parsed rows, and wire them to re-render on click. No re-parse needed — just filters bballGbLastRows. */
    function bballGbRenderTeamTabs(rows) {
        const teams = [...new Set(rows.map(r => r.team))];
        bballGbTeamTabs.innerHTML = teams.map(t =>
            `<label class="round-pill" style="width:${Math.floor(100 / teams.length) - 1}%">
                <input type="radio" name="bball-gb-team-tab" value="${t}" ${t === bballGbActiveTeam ? 'checked' : ''}> ${t}
             </label>`
        ).join('');
        bballGbTeamTabs.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                bballGbActiveTeam = radio.value;
                bballGbBreakdownLabel.style.display = 'none';
                bballGbBreakdownArea.style.display = 'none';
                bballGbRenderResults(bballGbLastRows, bballGbHasOT, bballGbActiveTeam);
            });
        });
        bballGbTeamTabs.style.display = teams.length > 0 ? 'flex' : 'none';
    }

    function bballGbRenderResults(allRows, hasOT, activeTeam) {
        const rows = allRows.filter(r => !r.fullGameDnp && r.team === activeTeam);
        const cols = hasOT
            ? ['Full Game', '1H', '1Q', '2H', 'OT', '2H+OT', '4Q', '4Q+OT']
            : ['Full Game', '1H', '1Q', '2H', '4Q'];

        bballGbResultsHead.innerHTML = '<tr><th>#</th><th>Player</th>' +
            cols.map(c => `<th class="${BBALL_GB_HIGHLIGHTED.has(c) ? 'gamebook-col-highlight' : ''}">${c}</th>`).join('') +
            '<th>Flags</th></tr>';

        bballGbResultsBody.innerHTML = rows.map(r => {
            const cells = cols.map(c =>
                `<td class="${BBALL_GB_HIGHLIGHTED.has(c) ? 'gamebook-col-highlight' : ''}">${bballGbFmtCell(r, c)}</td>`
            ).join('');
            const flags = [];
            if (r.warnings.length) flags.push(`<span class="manual-badge gamebook-flag-warn" title="${r.warnings.join('; ')}">⚠ Check</span>`);
            return `<tr><td>#${r.jersey}</td><td>${r.name}</td>${cells}<td>${flags.join(' ') || '—'}</td></tr>`;
        }).join('');
    }

    // Event delegation — table body is fully replaced on every parse, so
    // listeners are bound once on the (stable) parent rather than per-cell.
    bballGbResultsBody.addEventListener('click', e => {
        const cell = e.target.closest('.gamebook-cell-clickable');
        if (!cell) return;
        const row = bballGbLastRows.find(r => `${r.team}__${r.jersey}` === cell.dataset.key);
        if (!row) return;

        document.querySelectorAll('.gamebook-cell-active').forEach(el => el.classList.remove('gamebook-cell-active'));
        cell.classList.add('gamebook-cell-active');
        bballGbShowBreakdown(row, cell.dataset.cat);
    });

    bballGbBreakdownCopy.addEventListener('click', () => {
        bballGbBreakdownEl.select();
        bballGbBreakdownEl.setSelectionRange(0, 99999);
        triggerToastBtn.click();
        navigator.clipboard.writeText(bballGbBreakdownEl.value);
    });

    async function bballGbHandleFile(file) {
        if (!file || file.type !== 'application/pdf') {
            bballGbSetStatus('Please upload a PDF file.', 'error');
            return;
        }
        bballGbResultsWrap.style.display = 'none';
        bballGbResultsBody.innerHTML = '';
        bballGbResultsHead.innerHTML = '';
        bballGbMissing.textContent = '';
        bballGbBreakdownLabel.style.display = 'none';
        bballGbBreakdownArea.style.display = 'none';
        bballGbSetStatus(`Reading ${file.name}…`, 'loading');

        try {
            const buffer = await file.arrayBuffer();
            const { rows, hasOT, foundSections } = await bballGbParsePdf(buffer);
            bballGbLastRows = rows;
            bballGbHasOT = hasOT;

            const missing = BBALL_GB_REQUIRED_SECTIONS.filter(t => !foundSections.includes(t));
            if (missing.length > 0) {
                bballGbMissing.textContent = `Note: could not find these sections in the PDF — ${missing.join(', ')}. Related columns may be incomplete.`;
            }

            const teams = [...new Set(rows.map(r => r.team))];
            bballGbActiveTeam = teams[0] || null;
            bballGbRenderTeamTabs(rows);
            bballGbRenderResults(rows, hasOT, bballGbActiveTeam);

            const dnpCount = rows.filter(r => r.fullGameDnp).length;
            const shown = rows.length - dnpCount;
            bballGbSetStatus(
                `Parsed ${shown} player(s)${dnpCount ? ` (${dnpCount} full-game DNP hidden)` : ''} from ${foundSections.length} sections${hasOT ? ' (game went to OT)' : ''}. Click any value for its breakdown.`,
                'success'
            );
            bballGbResultsWrap.style.display = 'block';
        } catch (err) {
            bballGbSetStatus('Could not parse this PDF — ' + err.message, 'error');
        }
    }

    bballGbFileInput.addEventListener('change', () => bballGbHandleFile(bballGbFileInput.files[0]));
    ['dragenter', 'dragover'].forEach(evt =>
        bballGbDropZone.addEventListener(evt, e => { e.preventDefault(); bballGbDropZone.classList.add('gamebook-dropzone--active'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
        bballGbDropZone.addEventListener(evt, e => { e.preventDefault(); bballGbDropZone.classList.remove('gamebook-dropzone--active'); })
    );
    bballGbDropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) bballGbHandleFile(file);
    });
    bballGbDropZone.addEventListener('click', () => bballGbFileInput.click());

    document.querySelector('#bball-gb-clear').addEventListener('click', () => {
        bballGbFileInput.value = '';
        bballGbResultsWrap.style.display = 'none';
        bballGbResultsBody.innerHTML = '';
        bballGbResultsHead.innerHTML = '';
        bballGbMissing.textContent = '';
        bballGbTeamTabs.innerHTML = '';
        bballGbTeamTabs.style.display = 'none';
        bballGbBreakdownLabel.style.display = 'none';
        bballGbBreakdownArea.style.display = 'none';
        bballGbLastRows = [];
        bballGbHasOT = false;
        bballGbActiveTeam = null;
        bballGbSetStatus('', '');
    });

    // ── Basketball Gamebook — "Find the Game Book" lookup ──────────
    // Ported/adapted from a companion project ("Box Score Fetcher") that
    // generates box-score links. Here it's scoped down to one job: list
    // every NBA/WNBA game on a date (via ESPN's scoreboard), then construct
    // the official statsdmz.nba.com Game Book PDF URL for whichever one is picked.
    //
    // IMPORTANT — this is a LINK, not an auto-fetch. statsdmz.nba.com blocks
    // direct browser fetch() (confirmed via live CORS test), and public CORS
    // proxies (corsproxy.io, allorigins.win, codetabs.com — all tested live)
    // failed too. So the PDF still has to be opened, saved, and dropped into
    // the box above by hand — this just removes the manual searching step.
    //
    // FRAGILE BY NATURE: the URL pattern below is NBA's current (as of this
    // build) statsdmz.nba.com convention, confirmed against real 2025/2026
    // gamebook PDFs — but it's not a documented/versioned API. NBA can change
    // the host, path, or filename format at any time with no warning, which
    // would silently break every link here. If links start 404ing across the
    // board (not just for one team), that's the likely cause — worth
    // periodically re-confirming the pattern against a fresh real PDF.
    //
    // ESPN's team abbreviations don't always match the tricode used in the
    // gamebook PDF filename (e.g. ESPN "NY" vs "NYK" for the Knicks). Only
    // the genuine mismatches are listed; anything absent passes through
    // unchanged. Because of the CORS block above, a constructed URL can't be
    // verified before a human clicks it — so these are checked by hand.
    //
    // AUDITED against Alex's full ESPN-vs-official reference sheet
    // (ABBRREV.xlsx, NBA + WNBA tabs). NBA matched exactly, all 30 teams,
    // no changes needed. WNBA was missing Golden State Valkyries (GS→GSV,
    // an expansion team) — added.
    //
    // Portland Fire (POR→PDX) added separately: the 2026 expansion team
    // isn't in that sheet at all. ESPN uses "POR" (their team URL is
    // /wnba/team/_/name/por/portland-fire and their matchup pages render
    // "Fire POR"); the league side uses "PDX" (per Alex, and it's prominent
    // enough that it confused fans on a June 2026 broadcast). NOT yet
    // verified two ways though: (a) ESPN's *API* `team.abbreviation` field —
    // which is what this code actually reads — was inferred from ESPN's web
    // URLs, not read from the API directly, and (b) no real Portland
    // gamebook link has been clicked to confirm the PDF filename actually
    // uses PDX. Worth testing on a real Fire game.
    //
    // STILL MISSING: Toronto Tempo, the other 2026 expansion team — also
    // absent from the sheet, and no abbreviation data gathered yet.
    //
    // DELIBERATE DIVERGENCE FROM THAT SHEET — do not "fix" this back:
    // the sheet lists WNBA Phoenix Mercury as PHX→PHO, but Alex confirmed
    // live against a real Mercury @ Sparks gamebook link that the PDF
    // filename uses PHX. Best explanation: the sheet's column is WNBA.com's
    // *display* abbreviation, which is a different system from the
    // statsdmz.nba.com filename convention this table actually feeds — they
    // usually agree, but not here. Phoenix therefore passes through as PHX
    // for both leagues (WNBA confirmed directly; NBA never had a confirmed
    // counter-example either).
    const ESPN_TO_NBA_TRICODE = {
        NO: 'NOP', NY: 'NYK', GS: 'GSW', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS',
    };
    const ESPN_TO_WNBA_TRICODE = {
        GS: 'GSV', LV: 'LVA', LA: 'LAS', NY: 'NYL', POR: 'PDX', WSH: 'WAS',
    };
    function toNbaTricode(espnAbbr) {
        const up = (espnAbbr || '').toUpperCase();
        return ESPN_TO_NBA_TRICODE[up] || up;
    }
    function toWnbaTricode(espnAbbr) {
        const up = (espnAbbr || '').toUpperCase();
        return ESPN_TO_WNBA_TRICODE[up] || up;
    }

    const bballGbLookupDate     = document.querySelector('#bball-gb-lookup-date');
    const bballGbLookupLoadBtn  = document.querySelector('#bball-gb-lookup-load-btn');
    const bballGbLookupMsg      = document.querySelector('#bball-gb-lookup-msg');
    const bballGbLookupGameRow  = document.querySelector('#bball-gb-lookup-game-row');
    const bballGbLookupGameSel  = document.querySelector('#bball-gb-lookup-game-select');
    const bballGbLookupResult   = document.querySelector('#bball-gb-lookup-result');
    const bballGbLookupMatchup  = document.querySelector('#bball-gb-lookup-matchup');
    const bballGbLookupLink     = document.querySelector('#bball-gb-lookup-link');

    function setBballGbLookupMsg(msg, type = '') {
        bballGbLookupMsg.textContent = msg;
        bballGbLookupMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    // event.id isn't guaranteed unique ACROSS leagues (just within one), so games
    // are cached/selected by a composite "league__eventId" key.
    let bballGbLookupGamesCache = {}; // key -> { league, label, tricodeFn, home, away }

    async function bballGbLoadGames() {
        const date = bballGbLookupDate.value;
        if (!date) { setBballGbLookupMsg('Pick a date first.', 'error'); return; }

        bballGbLookupGameRow.style.display = 'none';
        bballGbLookupGameSel.innerHTML = '<option value="">Select a game…</option>';
        bballGbLookupResult.style.display = 'none';
        bballGbLookupLoadBtn.disabled = true;
        bballGbLookupGamesCache = {};
        setBballGbLookupMsg('Loading NBA and WNBA games…', 'loading');

        const dateNoSep = date.replaceAll('-', '');
        const leagues = [
            { id: 'nba', label: 'NBA', tricodeFn: toNbaTricode },
            { id: 'wnba', label: 'WNBA', tricodeFn: toWnbaTricode },
        ];

        try {
            const optionGroups = [];

            for (const { id, label, tricodeFn } of leagues) {
                const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/${id}/scoreboard?dates=${dateNoSep}`);
                if (!res.ok) continue;
                const data = await res.json();
                const events = data.events || [];
                if (events.length === 0) continue;

                const options = [];
                for (const event of events) {
                    const competitors = event.competitions?.[0]?.competitors || [];
                    const home = competitors.find(c => c.homeAway === 'home');
                    const away = competitors.find(c => c.homeAway === 'away');
                    if (!home || !away) continue;

                    const key = `${id}__${event.id}`;
                    bballGbLookupGamesCache[key] = { league: id, label, tricodeFn, home, away };
                    options.push(`<option value="${key}">${away.team.displayName} @ ${home.team.displayName}</option>`);
                }
                if (options.length > 0) optionGroups.push(`<optgroup label="${label}">${options.join('')}</optgroup>`);
            }

            if (optionGroups.length === 0) {
                setBballGbLookupMsg(`No NBA or WNBA games found on ${date}.`, 'error');
                return;
            }

            bballGbLookupGameSel.innerHTML = '<option value="">Select a game…</option>' + optionGroups.join('');
            bballGbLookupGameRow.style.display = 'flex';
            setBballGbLookupMsg(`Found ${Object.keys(bballGbLookupGamesCache).length} game(s) on ${date}.`, 'success');
        } catch (err) {
            setBballGbLookupMsg(
                'Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message,
                'error'
            );
        } finally {
            bballGbLookupLoadBtn.disabled = false;
        }
    }
    bballGbLookupLoadBtn.addEventListener('click', bballGbLoadGames);

    bballGbLookupGameSel.addEventListener('change', () => {
        const key = bballGbLookupGameSel.value;
        bballGbLookupResult.style.display = 'none';
        if (!key || !bballGbLookupGamesCache[key]) return;

        const { label, tricodeFn, home, away } = bballGbLookupGamesCache[key];
        const dateNoSep = bballGbLookupDate.value.replaceAll('-', '');
        const homeTricode = tricodeFn(home.team.abbreviation);
        const awayTricode = tricodeFn(away.team.abbreviation);
        const pdfUrl = `https://statsdmz.nba.com/pdfs/${dateNoSep}/${dateNoSep}_${awayTricode}${homeTricode}_book.pdf`;

        const scoreLine = (home.score != null && away.score != null) ? ` — ${away.score}-${home.score}` : '';
        bballGbLookupMatchup.textContent = `${label}: ${away.team.displayName} @ ${home.team.displayName}${scoreLine}`;
        bballGbLookupLink.href = pdfUrl;
        bballGbLookupResult.style.display = 'block';
    });

    // ── Basketball — Auto-fill from ESPN (NBA) — Name Search mode ─
    // Data source: ESPN's public site API (undocumented, no auth).
    // Flow: name → athlete ID (search) → season game log → match date → fields.
    const ESPN_SEARCH_API = 'https://site.api.espn.com/apis/search/v2';
    const ESPN_NBA_API    = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
    const bballFetchBtn    = document.querySelector('#bball-fetch-btn');
    const bballDateInput   = document.querySelector('#bball-date');
    const bballNsPlayerName = document.querySelector('#bball-ns-player-name');
    const bballNsFetchMsg  = document.querySelector('#bball-ns-fetch-msg');
    const bballNsMatchup   = document.querySelector('#bball-ns-matchup');
    const bballNsInputs = document.querySelectorAll('.bball-ns-fs');
    const bballNsVals   = document.querySelectorAll('#bball-name-mode .bball-val');
    const bballNsPts  = document.getElementById('bball-ns-pts');
    const bballNsRebs = document.getElementById('bball-ns-rebs');
    const bballNsAst  = document.getElementById('bball-ns-asst');
    const bballNsBlk  = document.getElementById('bball-ns-blk');
    const bballNsStl  = document.getElementById('bball-ns-stl');
    const bballNsTo   = document.getElementById('bball-ns-to');
    const bballNsTotalEl = document.querySelector('#bball-ns-total-fs');
    const bballNsGoBtn   = document.querySelector('#bball-ns-btn');
    const bballNsClearBtn = document.querySelector('#bball-ns-clear');
    const bballNsCopyBtn  = document.querySelector('#bball-ns-copy');
    let   bballNsHzsChk   = document.querySelector('#bball-ns-hzs-checkbox');
    const bballNsIds = {
        pts: bballNsPts, rebs: bballNsRebs, asst: bballNsAst, blk: bballNsBlk, stl: bballNsStl, to: bballNsTo,
        pointsVal: document.querySelector('#bball-ns-points-val'),
        reboundsVal: document.querySelector('#bball-ns-rebounds-val'),
        assistsVal: document.querySelector('#bball-ns-assists-val'),
        blocksVal: document.querySelector('#bball-ns-blocks-val'),
        stealsVal: document.querySelector('#bball-ns-steals-val'),
        turnoversVal: document.querySelector('#bball-ns-turnovers-val'),
        totalEl: bballNsTotalEl, inputs: bballNsInputs,
        playerName: () => bballNsPlayerName.value,
        breakdownSel: '#bball-ns-breakdown', textareaBtnContSel: '#bball-ns-textarea-btn-cont',
        breakdownWrapId: 'bball-ns-breakdown-wrap', hzsChk: bballNsHzsChk,
    };
    bballNsGoBtn.addEventListener('click', () => {
        bballNsIds.hzsChk = bballNsHzsChk;
        bballNsHzsChk = computeBballFS(bballNsIds);
    });
    bballNsClearBtn.addEventListener('click', () => {
        bballNsInputs.forEach(i => i.value = '');
        bballNsVals.forEach(v => v.innerHTML = '');
        bballNsPlayerName.value = '';
        bballNsTotalEl.innerHTML = '';
        document.querySelector('#bball-ns-breakdown').innerHTML = '';
        document.querySelector('#bball-ns-textarea-btn-cont').style.display = 'none';
        document.getElementById('bball-ns-breakdown-wrap').style.display = 'none';
        bballNsMatchup.textContent = '';
        bballNsFetchMsg.textContent = '';
    });
    bballNsCopyBtn.addEventListener('click', () => copyBreakdown('#bball-ns-breakdown'));

    function setBballFetchMsg(msg, type = '') {
        bballNsFetchMsg.textContent = msg;
        bballNsFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
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
        const name = bballNsPlayerName.value.trim();
        const date = bballDateInput.value; // YYYY-MM-DD
        if (!name) { setBballFetchMsg('Enter a player name first.', 'error'); return; }
        if (!date) { setBballFetchMsg('Pick a date first.', 'error'); return; }
        bballFetchBtn.disabled = true;
        bballNsMatchup.textContent = '';
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
            bballNsPts.value  = stats.points;
            bballNsRebs.value = stats.totalRebounds;
            bballNsAst.value  = stats.assists;
            bballNsBlk.value  = stats.blocks;
            bballNsStl.value  = stats.steals;
            bballNsTo.value   = stats.turnovers;
            bballNsPlayerName.value = player.fullName;
            const oppName = eventMatch.meta.opponent?.displayName || '';
            if (oppName) {
                bballNsMatchup.textContent = `vs ${oppName} (${eventMatch.meta.gameResult} ${eventMatch.meta.score})`;
            }
            setBballFetchMsg(`Loaded ${player.fullName} — ${date}.`, 'success');
            bballNsGoBtn.click(); // auto-calculate
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

    // ── Basketball — Browse by date/league/team/player (Player Search mode) ──
        const bballLoadGamesBtn = document.querySelector('#bball-load-games-btn');
        const bballGameRow      = document.querySelector('#bball-game-row');
        const bballGameSelect   = document.querySelector('#bball-game-select');
        const bballTeamRow      = document.querySelector('#bball-team-row');
        const bballTeamSelect   = document.querySelector('#bball-team-select');
        const bballPsFetchMsg   = document.querySelector('#bball-ps-fetch-msg');
        const bballPsMatchup    = document.querySelector('#bball-ps-matchup');
        const bballPsInputs = document.querySelectorAll('.bball-ps-fs');
        const bballPsVals   = document.querySelectorAll('#bball-search-mode .bball-val');
        const bballPsPts  = document.getElementById('bball-ps-pts');
        const bballPsRebs = document.getElementById('bball-ps-rebs');
        const bballPsAst  = document.getElementById('bball-ps-asst');
        const bballPsBlk  = document.getElementById('bball-ps-blk');
        const bballPsStl  = document.getElementById('bball-ps-stl');
        const bballPsTo   = document.getElementById('bball-ps-to');
        const bballPsTotalEl = document.querySelector('#bball-ps-total-fs');
        const bballPsGoBtn   = document.querySelector('#bball-ps-btn');
        const bballPsClearBtn = document.querySelector('#bball-ps-clear');
        const bballPsCopyBtn  = document.querySelector('#bball-ps-copy');
        let   bballPsHzsChk   = document.querySelector('#bball-ps-hzs-checkbox');
        let   bballPsCurrentPlayerName = ''; // Player Search has no name *input* (player is chosen via dropdown) — tracked here for the breakdown header instead
        const bballPsIds = {
            pts: bballPsPts, rebs: bballPsRebs, asst: bballPsAst, blk: bballPsBlk, stl: bballPsStl, to: bballPsTo,
            pointsVal: document.querySelector('#bball-ps-points-val'),
            reboundsVal: document.querySelector('#bball-ps-rebounds-val'),
            assistsVal: document.querySelector('#bball-ps-assists-val'),
            blocksVal: document.querySelector('#bball-ps-blocks-val'),
            stealsVal: document.querySelector('#bball-ps-steals-val'),
            turnoversVal: document.querySelector('#bball-ps-turnovers-val'),
            totalEl: bballPsTotalEl, inputs: bballPsInputs,
            playerName: () => bballPsCurrentPlayerName,
            breakdownSel: '#bball-ps-breakdown', textareaBtnContSel: '#bball-ps-textarea-btn-cont',
            breakdownWrapId: 'bball-ps-breakdown-wrap', hzsChk: bballPsHzsChk,
        };
        bballPsGoBtn.addEventListener('click', () => {
            bballPsIds.hzsChk = bballPsHzsChk;
            bballPsHzsChk = computeBballFS(bballPsIds);
        });
        bballPsClearBtn.addEventListener('click', () => {
            bballPsInputs.forEach(i => i.value = '');
            bballPsVals.forEach(v => v.innerHTML = '');
            bballPsCurrentPlayerName = '';
            bballPsTotalEl.innerHTML = '';
            document.querySelector('#bball-ps-breakdown').innerHTML = '';
            document.querySelector('#bball-ps-textarea-btn-cont').style.display = 'none';
            document.getElementById('bball-ps-breakdown-wrap').style.display = 'none';
            bballPsMatchup.textContent = '';
            bballPsFetchMsg.textContent = '';
            bballGameSelect.innerHTML = '';
            bballTeamSelect.innerHTML = '';
            bballPlayerSelect.innerHTML = '';
            bballGameRow.style.display = 'none';
            bballTeamRow.style.display = 'none';
            bballPlayerRow.style.display = 'none';
        });
        bballPsCopyBtn.addEventListener('click', () => copyBreakdown('#bball-ps-breakdown'));

        function setBballPsFetchMsg(msg, type = '') {
            bballPsFetchMsg.textContent = msg;
            bballPsFetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
        }

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
            if (!date) { setBballPsFetchMsg('Pick a date first.', 'error'); return; }

            const league = getSelectedBballLeague();
            bballLoadGamesBtn.disabled = true;
            bballGameRow.style.display = 'none';
            bballTeamRow.style.display = 'none';
            bballGameSelect.innerHTML = '';
            bballTeamSelect.innerHTML = '';
            setBballPsFetchMsg('Loading games…', 'loading');

            try {
                const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard?dates=${toEspnDateParam(date)}`);
                if (!res.ok) throw new Error('scoreboard request failed');
                const data = await res.json();
                bballScoreboardCache = data;

                const events = data.events || [];
                if (events.length === 0) {
                    setBballPsFetchMsg(`No games found on ${date}.`, 'error');
                    return;
                }

                bballGameSelect.innerHTML = '<option value="">Select a game…</option>' +
                    events.map(ev => `<option value="${ev.id}">${ev.shortName || ev.name}</option>`).join('');
                bballGameRow.style.display = 'flex';
                setBballPsFetchMsg(`Found ${events.length} game(s) on ${date}.`, 'success');
            } catch (err) {
                setBballPsFetchMsg(
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

                setBballPsFetchMsg('Loading roster…', 'loading');
                try {
                    const players   = await fetchBballBoxscore(eventId);
                    const teamBlock = players.find(p => p.team.id === teamId);
                    const athletes  = teamBlock?.statistics?.[0]?.athletes || [];
                    const active    = athletes.filter(a => !a.didNotPlay);

                    if (active.length === 0) {
                        setBballPsFetchMsg('No players with stats found for that team.', 'error');
                        return;
                    }

                    bballPlayerSelect.innerHTML = '<option value="">Select a player…</option>' +
                        active.map(a => `<option value="${a.athlete.id}">${a.athlete.displayName} (${a.athlete.position?.abbreviation || ''})</option>`).join('');
                    bballPlayerRow.style.display = 'flex';
                    setBballPsFetchMsg('Pick a player to load their stats.', '');
                } catch (err) {
                    setBballPsFetchMsg(
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
                    setBballPsFetchMsg("Could not find that player's stats.", 'error');
                    return;
                }

                const stats = {};
                statBlock.keys.forEach((key, i) => { stats[key] = athleteEntry.stats[i]; });

                bballPsPts.value  = stats.points;
                bballPsRebs.value = stats.rebounds;
                bballPsAst.value  = stats.assists;
                bballPsBlk.value  = stats.blocks;
                bballPsStl.value  = stats.steals;
                bballPsTo.value   = stats.turnovers;

                bballPsCurrentPlayerName = athleteEntry.athlete.displayName;

                const event = bballScoreboardCache?.events.find(ev => ev.id === eventId);
                bballPsMatchup.textContent = event ? buildBballMatchupLine(event, teamId) : '';

                setBballPsFetchMsg(`Loaded ${athleteEntry.athlete.displayName}.`, 'success');
                bballPsGoBtn.click(); // auto-calculate
            });        


} // end initBasketball