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
        const header = el.previousElementSibling; // .card-header sits right before .card-body
        el.classList.toggle('open');
        if (header && header.classList.contains('card-header')) {
            header.classList.toggle('open');
        }
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

                const extras = scoringInfo[name] || null;
                const warnings = [];
                if (extras?.warn) warnings.push(extras.warn);

                const cats = hasOT ? ['Full Game', '1H', '2H', 'OT', '2H+OT'] : ['Full Game', '1H', '2H'];
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

                rows.push({ team, name, dnp: false, raw, extras, fs, warnings });
            });
        });

        rows.sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
        return { rows, hasOT, foundSections, roster };
    }

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
        const fumLost = raw.fumbles?.lost || 0;
        const twoPtc = extras?.twoPtc || 0, ofrt = extras?.ofrt || 0, kpfgrtd = extras?.kpfgrtd || 0;
        const lines = [
            `Passing Yards: 0.04 pts/yard (${passYd}) = ${Number((passYd * 0.04).toFixed(2))}`,
            `Passing TDs: 4 pts (${passTd}) = ${passTd * 4}`,
            `Interceptions: -1 pt (${int}) = ${int * -1}`,
            `Rushing Yards: 0.1 pts/yard (${rushYd}) = ${Number((rushYd * 0.1).toFixed(1))}`,
            `Rushing TDs: 6 pts (${rushTd}) = ${rushTd * 6}`,
            `Receiving Yards: 0.1 pts/yard (${recYd}) = ${Number((recYd * 0.1).toFixed(1))}`,
            `Receiving TDs: 6 pts (${recTd}) = ${recTd * 6}`,
            `Receptions: 1 pt (${rec}) = ${rec}`,
            `Fumbles Lost: -1 pt (${fumLost}) = ${fumLost * -1}`,
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
        return `<span class="gamebook-cell-clickable" data-key="${key}" data-cat="${cat}">${val}</span>`;
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
                fballoGbRenderResults(fballoGbLastRows, fballoGbHasOT, fballoGbActiveTeam);
            });
        });
        fballoGbTeamTabs.style.display = teams.length > 0 ? 'flex' : 'none';
    }

    function fballoGbRawCell(row, cat, category, key) {
        const raw = row.raw?.[cat]?.[category];
        if (!raw) return '—';
        return raw[key] ?? '—';
    }

    function fballoGbRenderResults(allRows, hasOT, activeTeam) {
        const rows = allRows.filter(r => r.team === activeTeam);
        const cats = hasOT ? ['Full Game', '1H', '2H', 'OT', '2H+OT'] : ['Full Game', '1H', '2H'];

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
        triggerToastBtn.click();
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
            const { rows, hasOT, foundSections } = await fballoGbParsePdf(buffer);
            fballoGbLastRows = rows;
            fballoGbHasOT = hasOT;

            const required = ['Full Game', '1H'];
            const missing = required.filter(t => !foundSections.includes(t));
            if (missing.length > 0) {
                fballoGbMissing.textContent = `Note: could not find these sections in the PDF — ${missing.join(', ')}. Related columns may be incomplete.`;
            } else if (!foundSections.includes('2H')) {
                fballoGbMissing.textContent = `Note: this gamebook has no separate "Second Half Summary" section — 2H was computed as Full Game minus 1H instead.`;
            }

            const teams = [...new Set(rows.map(r => r.team))];
            fballoGbActiveTeam = teams[0] || null;
            fballoGbRenderTeamTabs(rows);
            fballoGbRenderResults(rows, hasOT, fballoGbActiveTeam);

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
        fballoGbActiveTeam = null;
        fballoGbSetStatus('', '');
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