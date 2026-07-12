// ============================================================
//  GameTime Platform — NBA Gamebook Checker
//  gamebook-checker.js
//
//  Parses the NBA.com official "Game Book" PDF (Official Scorer's
//  Report) to extract, per player, minutes played across every
//  period the report breaks out: 1Q, 2Q, 1H, 3Q, 1Q-3Q, 4Q, 2H,
//  and FINAL — plus DNP (never entered the game) and "Reboot"
//  (played in the game, but zero minutes in the second half).
//
//  Runs entirely client-side via pdf.js (WASM, no backend needed).
//  pdf.js only gives raw positioned text fragments, not assembled
//  table rows, so we cluster fragments into rows by y-coordinate
//  and sort each row by x-coordinate to reconstruct the table —
//  validated against a real Game Book PDF before shipping.
// ============================================================

const PDFJS_VERSION = '3.11.174';
if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
}

// Known Official Scorer's Report section titles, in the fixed order
// they appear in every Game Book PDF. PLAY-BY-PLAY pages are skipped.
const SECTION_TITLES = [
    'FINAL BOX',
    '1st QUARTER ONLY',
    '2nd QUARTER ONLY',
    'FIRST HALF',
    '3rd QUARTER ONLY',
    '1st QUARTER - 3rd QUARTER',
    '4th QUARTER ONLY',
    '1st QUARTER - 4th QUARTER', // only present in OT games
    'SECOND HALF',
];

// Short column labels used in the results table, keyed by section title.
const SECTION_LABELS = {
    'FINAL BOX': 'FINAL',
    '1st QUARTER ONLY': '1Q',
    '2nd QUARTER ONLY': '2Q',
    'FIRST HALF': '1H',
    '3rd QUARTER ONLY': '3Q',
    '1st QUARTER - 3rd QUARTER': '1Q-3Q',
    '4th QUARTER ONLY': '4Q',
    '1st QUARTER - 4th QUARTER': '1Q-4Q',
    'SECOND HALF': '2H',
};

// OT sections aren't a fixed count (1st OT, 2nd OT, ...), so they're
// detected dynamically by pattern rather than listed in SECTION_TITLES.
const OT_TITLE_PATTERN = /^(\d+)(?:st|nd|rd|th) OT ONLY$/;

/** Short column label for a dynamically-detected OT section title, e.g. "1st OT ONLY" -> "OT1". */
function otLabel(title) {
    const m = title.match(OT_TITLE_PATTERN);
    return m ? `OT${m[1]}` : null;
}

/** Resolve a section title to its short column label, whether fixed or dynamic OT. */
function labelForTitle(title) {
    return SECTION_LABELS[title] || otLabel(title) || title;
}

// Fixed column order after the MIN token in every player row.
const STAT_KEYS = ['fg', 'fga', 'fg3', 'fg3a', 'ft', 'fta', 'or', 'dr', 'tot', 'ast', 'pf', 'stl', 'to', 'blk', 'plusMinus', 'pts'];

/** Cluster pdf.js text items into visually-ordered rows (top-to-bottom, left-to-right). */
function reconstructRows(items, yTolerance = 2.5) {
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

/** Extract all reconstructed lines of a single PDF page. */
async function extractPageLines(page) {
    const content = await page.getTextContent();
    return reconstructRows(content.items);
}

/** Identify which known section a page belongs to. Returns null for non-box-score pages (e.g. play-by-play, matchup summary). */
function detectSectionTitle(lines) {
    if (!lines.some(l => l.includes("OFFICIAL SCORER'S"))) return null;
    const titleLines = lines.slice(0, 6);
    const joined = titleLines.join(' | ');
    const fixed = SECTION_TITLES.find(title => joined.includes(title));
    if (fixed) return fixed;
    const ot = titleLines.find(l => OT_TITLE_PATTERN.test(l.trim()));
    return ot ? ot.trim() : null;
}

/** Parse a single active-player row into a structured stat object, or null if the line doesn't match the pattern. */
function parsePlayerRow(line) {
    const tokens = line.split(' ');
    if (tokens.length < 3) return null;

    const jersey = tokens[0];
    if (!/^\d{1,2}$/.test(jersey)) return null;

    const minIdx = tokens.findIndex(t => /^\d{1,2}:\d{2}$/.test(t));
    if (minIdx < 2) return null; // need jersey + at least one name word before MIN

    let nameEnd = minIdx;
    let position = '';
    const maybePos = tokens[minIdx - 1];
    if (['F', 'C', 'G'].includes(maybePos) && minIdx - 1 > 1) {
        position = maybePos;
        nameEnd = minIdx - 1;
    }
    const name = tokens.slice(1, nameEnd).join(' ');
    const min = tokens[minIdx];

    const statTokens = tokens.slice(minIdx + 1);
    if (statTokens.length !== STAT_KEYS.length) {
        return {
            jersey, name, position, min, stats: null,
            parseWarning: `Expected ${STAT_KEYS.length} stat columns after MIN, found ${statTokens.length}`,
        };
    }
    const stats = {};
    STAT_KEYS.forEach((key, i) => { stats[key] = statTokens[i]; });
    return { jersey, name, position, min, stats, parseWarning: null };
}

/** Parse a "DNP - <reason>" row. */
function parseDnpRow(line) {
    const m = line.match(/^(\d{1,2})\s+(.+?)\s+DNP\s*-\s*(.+)$/);
    if (!m) return null;
    return { jersey: m[1], name: m[2].trim(), reason: m[3].trim() };
}

/** Parse one section page's lines into { teamName: { players: [...] } }. */
function parseSectionPage(lines) {
    const teams = {};
    let currentTeam = null;

    for (const line of lines) {
        const visitorMatch = line.match(/^VISITOR:\s*(.+?)(?:\s*\(\d+-\d+\))?$/);
        const homeMatch = line.match(/^HOME:\s*(.+?)(?:\s*\(\d+-\d+\))?$/);

        if (visitorMatch) { currentTeam = visitorMatch[1].trim(); teams[currentTeam] = { players: [] }; continue; }
        if (homeMatch)    { currentTeam = homeMatch[1].trim();    teams[currentTeam] = { players: [] }; continue; }
        if (!currentTeam) continue;

        // Team totals row marks the end of that team's player list for this page.
        if (/^\d{2,3}:00\s/.test(line)) { currentTeam = null; continue; }
        if (line.startsWith('POS ')) continue; // column header row

        const dnp = parseDnpRow(line);
        if (dnp) {
            teams[currentTeam].players.push({ jersey: dnp.jersey, name: dnp.name, dnp: true, reason: dnp.reason });
            continue;
        }

        const active = parsePlayerRow(line);
        if (active) {
            teams[currentTeam].players.push({
                jersey: active.jersey, name: active.name, dnp: false,
                min: active.min, stats: active.stats, parseWarning: active.parseWarning,
            });
        }
    }
    return teams;
}

/** Merge all section tables into one row per player: MIN across every period + DNP/Reboot flags. */
function buildMasterTable(sections) {
    const master = {}; // `${team}__${jersey}` -> row

    Object.keys(sections).forEach(title => {
        const sectionData = sections[title];
        const label = labelForTitle(title);

        Object.entries(sectionData).forEach(([team, teamData]) => {
            teamData.players.forEach(p => {
                const key = `${team}__${p.jersey}`;
                if (!master[key]) {
                    master[key] = { team, jersey: p.jersey, name: p.name, periods: {}, fullGameDnp: false, warnings: [] };
                }
                if (p.dnp) {
                    master[key].periods[label] = 'DNP';
                    if (title === 'FINAL BOX') master[key].fullGameDnp = true;
                } else {
                    master[key].periods[label] = p.min;
                    if (p.parseWarning) master[key].warnings.push(`${label}: ${p.parseWarning}`);
                }
            });
        });
    });

    const rows = Object.values(master);
    rows.forEach(r => {
        const zeroSecondHalf = r.periods['2H'] === '00:00';
        const otKeys = Object.keys(r.periods).filter(k => /^OT\d+$/.test(k));
        const playedInOT = otKeys.some(k => {
            const v = r.periods[k];
            return v && v !== '00:00' && v !== 'DNP';
        });
        // Reboot requires zero 2H minutes AND zero minutes in every OT period
        // the player has a row for — a player who sat the 2nd half but got
        // subbed into overtime should not be flagged.
        r.reboot = !r.fullGameDnp && zeroSecondHalf && !playedInOT;
    });

    // Sort: by team, then jersey number ascending
    rows.sort((a, b) => a.team.localeCompare(b.team) || Number(a.jersey) - Number(b.jersey));
    return rows;
}

/** Top-level: parse an uploaded Game Book PDF (ArrayBuffer) into the master per-player table. */
async function parseGamebookPdf(arrayBuffer) {
    const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const sections = {};

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const lines = await extractPageLines(page);
        const title = detectSectionTitle(lines);
        if (!title || sections[title]) continue; // skip PBP pages / unexpected duplicates
        sections[title] = parseSectionPage(lines);
    }

    const foundSections = Object.keys(sections);
    if (foundSections.length === 0) {
        throw new Error('No recognizable Official Scorer\'s Report sections found — is this an NBA.com Game Book PDF?');
    }

    return { rows: buildMasterTable(sections), foundSections };
}

// Column display order: FINAL first, then halves, then quarters, then any
// OT periods. Cumulative "1Q-3Q"/"1Q-4Q" sections are still parsed if
// present (harmless) but are no longer shown as their own columns.
const DISPLAY_ORDER_TITLES = [
    'FINAL BOX',
    'FIRST HALF',
    'SECOND HALF',
    '1st QUARTER ONLY',
    '2nd QUARTER ONLY',
    '3rd QUARTER ONLY',
    '4th QUARTER ONLY',
];

// Columns visually emphasized in the results table.
const HIGHLIGHTED_LABELS = new Set(['FINAL', '1H', '2H', '1Q', '4Q']);

/** Build the full, ordered list of period column labels actually present in this PDF. */
function canonicalPeriodOrder(foundSections) {
    const base = DISPLAY_ORDER_TITLES.filter(t => foundSections.includes(t));
    const otTitles = foundSections
        .filter(t => OT_TITLE_PATTERN.test(t))
        .sort((a, b) => Number(a.match(OT_TITLE_PATTERN)[1]) - Number(b.match(OT_TITLE_PATTERN)[1]));
    return [...base, ...otTitles].map(labelForTitle);
}

// ============================================================
//  UI WIRING
// ============================================================
window.onload = function () {
    const headerEl    = document.querySelector('#head-gamebook');
    const headerRebootEl    = document.querySelector('#head-reboot');

    /** Collapse/expand the card body — identical pattern to every card on index.html. */
    function toggleSection(contentSelector) {
        const el = document.querySelector(contentSelector);
        el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    }

    headerEl.addEventListener('click', () => toggleSection('#content-gamebook'));
    headerRebootEl.addEventListener('click', () => toggleSection('#content-reboot'));

    const fileInput   = document.querySelector('#gamebook-file-input');
    const dropZone    = document.querySelector('#gamebook-dropzone');
    const statusMsg   = document.querySelector('#gamebook-status');
    const resultsWrap = document.querySelector('#gamebook-results-wrap');
    const resultsHead = document.querySelector('#gamebook-results-head');
    const resultsBody = document.querySelector('#gamebook-results-body');
    const missingMsg  = document.querySelector('#gamebook-missing-sections');

    function setStatus(msg, type = '') {
        statusMsg.textContent = msg;
        statusMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    async function handleFile(file) {
        if (!file || file.type !== 'application/pdf') {
            setStatus('Please upload a PDF file.', 'error');
            return;
        }

        resultsWrap.style.display = 'none';
        resultsBody.innerHTML = '';
        resultsHead.innerHTML = '';
        missingMsg.textContent = '';
        setStatus(`Reading ${file.name}…`, 'loading');

        try {
            const buffer = await file.arrayBuffer();
            const { rows, foundSections } = await parseGamebookPdf(buffer);

            const missingBase = DISPLAY_ORDER_TITLES.filter(t => !foundSections.includes(t));
            if (missingBase.length > 0) {
                missingMsg.textContent = `Note: could not find these sections in the PDF — ${missingBase.map(labelForTitle).join(', ')}. Their columns will be omitted.`;
            }

            const periodOrder = canonicalPeriodOrder(foundSections);
            renderResults(rows, periodOrder);
            setStatus(`Parsed ${rows.length} players from ${foundSections.length} sections.`, 'success');
            resultsWrap.style.display = 'block';
        } catch (err) {
            setStatus('Could not parse this PDF — ' + err.message, 'error');
        }
    }

    function renderResults(rows, periodOrder) {
        resultsHead.innerHTML = '<tr>' +
            '<th>Team</th><th>#</th><th>Player</th>' +
            periodOrder.map(p => `<th class="${HIGHLIGHTED_LABELS.has(p) ? 'gamebook-col-highlight' : ''}">${p}</th>`).join('') +
            '<th>Flags</th></tr>';

        resultsBody.innerHTML = rows.map(r => {
            const cells = periodOrder.map(p => {
                const val = r.periods[p] ?? '—';
                const isDnp = val === 'DNP';
                const classes = [
                    isDnp ? 'gamebook-dnp-cell' : '',
                    HIGHLIGHTED_LABELS.has(p) ? 'gamebook-col-highlight' : '',
                ].filter(Boolean).join(' ');
                return `<td class="${classes}">${val}</td>`;
            }).join('');

            const flags = [];
            if (r.fullGameDnp) flags.push('<span class="manual-badge gamebook-flag-dnp">DNP</span>');
            if (r.reboot) flags.push('<span class="manual-badge gamebook-flag-reboot">Reboot</span>');
            if (r.warnings.length) flags.push(`<span class="manual-badge gamebook-flag-warn" title="${r.warnings.join('; ')}">⚠ Check</span>`);

            return `<tr>
                <td>${r.team}</td>
                <td>#${r.jersey}</td>
                <td>${r.name}</td>
                ${cells}
                <td>${flags.join(' ') || '—'}</td>
            </tr>`;
        }).join('');
    }

    fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

    ['dragenter', 'dragover'].forEach(evt =>
        dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('gamebook-dropzone--active'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
        dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('gamebook-dropzone--active'); })
    );
    dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    dropZone.addEventListener('click', () => fileInput.click());

    initRebootChecker();
};

// ============================================================
//  MLB REBOOT CHECKER — plate appearances via ESPN play-by-play
//
//  Same date → game → team → player drill-down pattern as the
//  NBA/NFL cards on index.html, but reading play-by-play instead
//  of a boxscore stat line.
//
//  A play counts as a completed plate appearance when its outer
//  `type.type` is "play-result" — this is ESPN's own category for
//  the outcome of an at-bat (hit, out, BB, HBP, error, FC, sac,
//  etc.) regardless of what the specific `alternativeType` says.
//  Steals, wild pitches, balks, pickoffs, passed balls, mound
//  visits, and substitutions are separate play types and don't
//  carry type.type === "play-result", so they're excluded for free.
//
//  Reboot rule (2 or fewer PA before leaving): we can only count
//  PAs reliably from play-by-play. Whether the player actually
//  left the game — vs. the game just ending, or this being the
//  final out — isn't reliably inferable from play-by-play alone,
//  so that part is left for manual confirmation from the play list,
//  same spirit as the DNP/Reboot flags above.
//
//  ASSUMPTION TO VERIFY: player display names are read from
//  data.boxscore.players[].statistics[].athletes[], mirroring the
//  shape ESPN's NBA/NFL summary endpoints use elsewhere in this
//  codebase. This hasn't been tested against a live MLB summary
//  response (ESPN isn't reachable from the sandbox this was built
//  in). If names don't populate, the dropdown falls back to
//  "Batter #<id>" — it'll still work, just say so and I'll patch
//  athleteNameMap() once you've seen the real shape.
// ============================================================
function initRebootChecker() {
    const dateInput    = document.querySelector('#reboot-date');
    const loadGamesBtn = document.querySelector('#reboot-load-games-btn');
    const gameRow      = document.querySelector('#reboot-game-row');
    const gameSelect   = document.querySelector('#reboot-game-select');
    const teamRow      = document.querySelector('#reboot-team-row');
    const teamSelect   = document.querySelector('#reboot-team-select');
    const playerRow    = document.querySelector('#reboot-player-row');
    const playerSelect = document.querySelector('#reboot-player-select');
    const fetchMsg     = document.querySelector('#reboot-fetch-msg');
    const resultWrap   = document.querySelector('#reboot-result-wrap');
    const flagLine     = document.querySelector('#reboot-flag-line');
    const paBody       = document.querySelector('#reboot-pa-body');

    function setMsg(msg, type = '') {
        fetchMsg.textContent = msg;
        fetchMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    let scoreboardCache = null; // last fetched scoreboard response
    const summaryCache  = {};   // eventId -> summary response (boxscore + plays)

    /** Convert an <input type="date"> value (YYYY-MM-DD) to ESPN's YYYYMMDD format. */
    function toEspnDateParam(dateStr) {
        return dateStr.replaceAll('-', '');
    }

    async function loadGames() {
        const date = dateInput.value;
        if (!date) { setMsg('Pick a date first.', 'error'); return; }

        loadGamesBtn.disabled = true;
        gameRow.style.display = 'none';
        teamRow.style.display = 'none';
        playerRow.style.display = 'none';
        resultWrap.style.display = 'none';
        gameSelect.innerHTML = '';
        teamSelect.innerHTML = '';
        playerSelect.innerHTML = '';
        setMsg('Loading games…', 'loading');

        try {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${toEspnDateParam(date)}`);
            if (!res.ok) throw new Error('scoreboard request failed');
            const data = await res.json();
            scoreboardCache = data;

            const events = data.events || [];
            if (events.length === 0) {
                setMsg(`No games found on ${date}.`, 'error');
                return;
            }

            gameSelect.innerHTML = '<option value="">Select a game…</option>' +
                events.map(ev => `<option value="${ev.id}">${ev.shortName || ev.name}</option>`).join('');
            gameRow.style.display = 'flex';
            setMsg(`Found ${events.length} game(s) on ${date}.`, 'success');
        } catch (err) {
            setMsg('Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
        } finally {
            loadGamesBtn.disabled = false;
        }
    }
    loadGamesBtn.addEventListener('click', loadGames);

    gameSelect.addEventListener('change', () => {
        const eventId = gameSelect.value;
        teamSelect.innerHTML = '';
        playerSelect.innerHTML = '';
        teamRow.style.display = 'none';
        playerRow.style.display = 'none';
        resultWrap.style.display = 'none';
        if (!eventId || !scoreboardCache) return;

        const event = scoreboardCache.events.find(ev => ev.id === eventId);
        const competitors = event?.competitions?.[0]?.competitors || [];
        if (competitors.length === 0) return;

        teamSelect.innerHTML = '<option value="">Select a team…</option>' +
            competitors.map(c => `<option value="${c.team.id}">${c.team.displayName}</option>`).join('');
        teamRow.style.display = 'flex';
    });

    async function fetchSummary(eventId) {
        if (summaryCache[eventId]) return summaryCache[eventId];
        const res = await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?lang=en&contentorigin=espn&event=${eventId}`);
        if (!res.ok) throw new Error('summary request failed');
        const data = await res.json();
        summaryCache[eventId] = data;
        return data;
    }

    /** Every plate-appearance-ending play for one team, keyed by batter athlete id. */
    function batterPaMap(summary, teamId) {
        const plays = summary?.plays || [];
        const map = {}; // athleteId -> [play, ...]
        plays.forEach(play => {
            if (play.type?.type !== 'play-result') return;
            if (String(play.team?.id) !== String(teamId)) return;
            const batter = play.participants?.find(p => p.type === 'batter');
            if (!batter) return;
            const id = batter.athlete.id;
            (map[id] ||= []).push(play);
        });
        return map;
    }

    /** Best-effort athlete id -> display name lookup from the boxscore block. See ASSUMPTION note above. */
    function athleteNameMap(summary, teamId) {
        const names = {};
        const teamBlock = (summary.boxscore?.players || []).find(p => String(p.team?.id) === String(teamId));
        (teamBlock?.statistics || []).forEach(stat => {
            (stat.athletes || []).forEach(a => { names[a.athlete.id] = a.athlete.displayName; });
        });
        return names;
    }

    teamSelect.addEventListener('change', async () => {
        const eventId = gameSelect.value;
        const teamId  = teamSelect.value;
        playerSelect.innerHTML = '';
        playerRow.style.display = 'none';
        resultWrap.style.display = 'none';
        if (!eventId || !teamId) return;

        setMsg('Loading batters…', 'loading');
        try {
            const summary = await fetchSummary(eventId);
            const paMap   = batterPaMap(summary, teamId);
            const names   = athleteNameMap(summary, teamId);
            const ids     = Object.keys(paMap);

            if (ids.length === 0) {
                setMsg('No plate appearances found for that team.', 'error');
                return;
            }

            playerSelect.innerHTML = '<option value="">Select a batter…</option>' +
                ids.map(id => `<option value="${id}">${names[id] || `Batter #${id}`} (${paMap[id].length} PA)</option>`).join('');
            playerRow.style.display = 'flex';
            setMsg('Pick a batter to see their plate appearances.', '');
        } catch (err) {
            setMsg('Fetch failed — the ESPN API may be unreachable or blocking browser requests (CORS). ' + err.message, 'error');
        }
    });

    playerSelect.addEventListener('change', () => {
        const eventId   = gameSelect.value;
        const teamId    = teamSelect.value;
        const athleteId = playerSelect.value;
        resultWrap.style.display = 'none';
        if (!eventId || !teamId || !athleteId) return;

        const summary = summaryCache[eventId];
        const paMap   = batterPaMap(summary, teamId);
        const plays   = (paMap[athleteId] || []).slice()
            .sort((a, b) => Number(a.atBatId) - Number(b.atBatId)); // atBatId is monotonic across the whole game

        const names = athleteNameMap(summary, teamId);
        const name  = names[athleteId] || `Batter #${athleteId}`;

        paBody.innerHTML = plays.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${p.period?.displayValue || ''}</td>
                <td>${p.text || ''}</td>
            </tr>
        `).join('');

        const eligible = plays.length <= 2;
        flagLine.innerHTML = eligible
            ? `<span class="manual-badge gamebook-flag-reboot">Reboot-eligible</span> ${name} recorded ${plays.length} PA — confirm from the plays below that they actually left the game.`
            : `${name} recorded ${plays.length} PA — not Reboot-eligible (needs 2 or fewer).`;

        resultWrap.style.display = 'block';
        setMsg(`Loaded ${name}.`, 'success');
    });
}