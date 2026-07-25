// ============================================================
//  GameTime — lightweight smoke tests
//
//  PURPOSE: a regression safety net for the upcoming app.js module
//  split, not exhaustive coverage of every mode/edge case. Run this
//  BEFORE and AFTER the split — if it stays green, the split didn't
//  silently disconnect anything these tests touch.
//
//  Scope deliberately kept small: Manual mode for every sport (the
//  simplest, most deterministic path — no network calls), plus a
//  structural check that every card/mode-toggle still exists, plus
//  the Save-to-History wiring, plus the NFL per-quarter parser's pure
//  logic (already validated separately, folded in here so it's part
//  of the automated regression net too).
//
//  NOT covered (by design, to keep this lightweight): ESPN/MLB API
//  drill-downs (network-dependent), PDF Gamebook Upload flows (file
//  upload + pdf.js, not easily jsdom-testable), MLB Pitcher/Tennis
//  exact-value checks (formulas involve more state than was worth
//  reverse-engineering for a first pass — structural-only for now).
//
//  Run: node --test
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness.js');

function setValue(document, id, value) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found — did the DOM structure change?`);
    el.value = value;
}
function click(document, id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found — did the DOM structure change?`);
    el.click();
}
function text(document, id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found — did the DOM structure change?`);
    return el.textContent.trim();
}
function totalFs(document, id) {
    return Number(text(document, id));
}

// ── Structural smoke test — every card + key mode-toggle exists ──
test('structure: every FS Calculator card and mode toggle is present', async () => {
    const { document } = await loadApp();
    const expectedHeaders = [
        '#head-bball', '#head-bsballp', '#head-bsballh',
        '#head-tennis', '#head-mma', '#head-box', '#head-fballo',
        '#head-socout', '#head-socgk',
    ];
    expectedHeaders.forEach(sel => {
        assert.ok(document.querySelector(sel), `Missing card header: ${sel}`);
    });

    const expectedModeToggles = [
        '#bball-mode-gamebook', '#bball-mode-search', '#bball-mode-name', '#bball-mode-manual',
        '#bsballp-mode-search', '#bsballp-mode-name', '#bsballp-mode-manual',
        '#bsballh-mode-search', '#bsballh-mode-name', '#bsballh-mode-manual',
    ];
    expectedModeToggles.forEach(sel => {
        assert.ok(document.querySelector(sel), `Missing mode toggle: ${sel}`);
    });
});

// ── Basketball Manual ──
test('Basketball Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    setValue(document, 'bball-pts', 20);
    setValue(document, 'bball-rebs', 10);
    setValue(document, 'bball-asst', 5);
    setValue(document, 'bball-blk', 2);
    setValue(document, 'bball-stl', 3);
    setValue(document, 'bball-to', 4);
    click(document, 'bball-btn');
    // 20 + 10*1.2 + 5*1.5 + 2*3 + 3*3 - 4*1 = 20+12+7.5+6+9-4 = 50.5
    assert.equal(totalFs(document, 'bball-total-fs'), 50.5);
});

// ── NFL Offensive Manual ──
test('NFL Offensive Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    setValue(document, 'fballo-man-passyd', 250);
    setValue(document, 'fballo-man-passtd', 2);
    setValue(document, 'fballo-man-int', 1);
    setValue(document, 'fballo-man-rushyd', 30);
    setValue(document, 'fballo-man-rushtd', 1);
    setValue(document, 'fballo-man-recyd', 0);
    setValue(document, 'fballo-man-rectd', 0);
    setValue(document, 'fballo-man-rec', 0);
    setValue(document, 'fballo-man-fl', 0);
    setValue(document, 'fballo-man-2ptc', 0);
    setValue(document, 'fballo-man-ofrt', 0);
    setValue(document, 'fballo-man-kpfgrtd', 0);
    click(document, 'fballo-man-btn');
    // 250*0.04 + 2*4 - 1*1 + 30*0.1 + 1*6 = 10 + 8 - 1 + 3 + 6 = 26
    assert.equal(totalFs(document, 'fballo-man-total-fs'), 26);
});

// ── MMA Manual ──
test('MMA Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    setValue(document, 'mma-sigstr', 20);
    setValue(document, 'mma-td', 2);
    setValue(document, 'mma-subatt', 1);
    setValue(document, 'mma-kd', 1);
    document.getElementById('mma-1strd').checked = true; // 1st Round Win = 50 pts
    click(document, 'mma-btn');
    // 20*0.5 + 2*5 + 1*4 + 1*10 + 50 = 10+10+4+10+50 = 84
    assert.equal(totalFs(document, 'mma-total-fs'), 84);
});

// ── Boxing Manual ──
test('Boxing Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    setValue(document, 'box-punch', 50);
    setValue(document, 'box-kd', 1);
    setValue(document, 'box-beingkd', 0);
    document.getElementById('box-dec').checked = true; // Decision Win = 20 pts
    click(document, 'box-btn');
    // 50*0.5 + 1*12 - 0*12 + 20 = 25+12+0+20 = 57
    assert.equal(totalFs(document, 'box-total-fs'), 57);
});

// ── Tennis Manual ──
// Closes a gap noted in the README — this wasn't covered originally due to
// the set-score grid's complexity, added once the Tennis split gave a
// concrete reason to verify it properly rather than leave it untested.
test('Tennis Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    // Straight-sets win: 6-3, 6-4. 2 aces, 1 double fault.
    setValue(document, 'tennis-box-player-s1', 6);
    setValue(document, 'tennis-box-opponent-s1', 3);
    setValue(document, 'tennis-box-player-s2', 6);
    setValue(document, 'tennis-box-opponent-s2', 4);
    setValue(document, 'tennis-ac', 2);
    setValue(document, 'tennis-dblft', 1);
    click(document, 'tennis-btn');
    // Match Played: 1*10=10, Games Won: 12*1=12, Games Lost: 7*-1=-7,
    // Sets Won: 2*3=6, Sets Lost: 0*-3=0, Aces: 2*0.5=1, Dbl Faults: 1*-0.5=-0.5
    // 10+12-7+6+0+1-0.5 = 21.5
    assert.equal(totalFs(document, 'tennis-total-fs'), 21.5);
});

// ── Tennis super tiebreak ──
// Real match (Kovackova/Kovackova vs Dart/Lumsden, Prague Open 2026): the
// deciding set was a super tiebreak, entered as 1-0 because a super tiebreak
// counts as ONE GAME, not its raw point score (10-3 would wrongly add 10
// games won). Before the fix, setComplete() required p>=6||o>=6, so the 1-0
// set was skipped and its Set Won silently vanished — games tallied fine
// (they're computed separately), giving 9.5 instead of 12.5.
test('Tennis: super tiebreak deciding set (1-0) counts as a won set', async () => {
    const { document } = await loadApp();
    setValue(document, 'tennis-box-player-s1', 3);
    setValue(document, 'tennis-box-opponent-s1', 6);
    setValue(document, 'tennis-box-player-s2', 6);
    setValue(document, 'tennis-box-opponent-s2', 3);
    setValue(document, 'tennis-box-player-s3', 1);   // super tiebreak WON
    setValue(document, 'tennis-box-opponent-s3', 0);
    setValue(document, 'tennis-ac', 0);
    setValue(document, 'tennis-dblft', 3);
    click(document, 'tennis-btn');
    // MP 10 + GW 10 - GL 9 + SW(2)*3=6 - SL(1)*3=3 + Ace 0 - DF 1.5 = 12.5
    assert.equal(totalFs(document, 'tennis-total-fs'), 12.5);
});

test('Tennis: 1-0 in a NON-deciding set is still treated as incomplete', async () => {
    const { document } = await loadApp();
    setValue(document, 'tennis-box-player-s1', 1);
    setValue(document, 'tennis-box-opponent-s1', 0);
    setValue(document, 'tennis-ac', 0);
    setValue(document, 'tennis-dblft', 3);
    click(document, 'tennis-btn');
    // Set 1 isn't deciding, so no set is counted: 10 + 1 - 0 + 0 - 0 - 1.5 = 9.5
    assert.equal(totalFs(document, 'tennis-total-fs'), 9.5);
});

// ── Soccer Outfielder Manual ──
// Note the confirmed scoring corrections vs the original roadmap spec:
// Red Card is -2 (not -0.5), and Shot + Shot on Target are ADDITIVE, so
// "Shot" is total shots including on-target ones.
test('Soccer Outfielder Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    setValue(document, 'socout-goal', 1);      // 1  * 10   =  10
    setValue(document, 'socout-assist', 1);    // 1  * 5    =   5
    setValue(document, 'socout-shot', 4);      // 4  * 1    =   4
    setValue(document, 'socout-sot', 2);       // 2  * 1    =   2
    setValue(document, 'socout-shotast', 3);   // 3  * 0.5  =   1.5
    setValue(document, 'socout-pass', 60);     // 60 * 0.05 =   3
    setValue(document, 'socout-clr', 2);       // 2  * 1    =   2
    setValue(document, 'socout-tackle', 3);    // 3  * 1    =   3
    setValue(document, 'socout-dribble', 5);   // 5  * 1    =   5
    setValue(document, 'socout-cross', 4);     // 4  * 0.5  =   2
    setValue(document, 'socout-yc', 1);        // 1  * -1   =  -1
    setValue(document, 'socout-rc', 1);        // 1  * -2   =  -2
    setValue(document, 'socout-foul', 2);      // 2  * -0.5 =  -1
    click(document, 'socout-btn');
    // 10+5+4+2+1.5+3+2+3+5+2-1-2-1 = 33.5
    assert.equal(totalFs(document, 'socout-total-fs'), 33.5);
});

// ── Soccer Goalie Manual ──
// Availability + shot-stopping only: Starting Score 5, Saves 2,
// Goals Conceded -2, Clean Sheet 5.
test('Soccer Goalie Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    document.getElementById('socgk-start').checked = true;  // 1 * 5  =  5
    setValue(document, 'socgk-saves', 4);                   // 4 * 2  =  8
    setValue(document, 'socgk-ga', 1);                      // 1 * -2 = -2
    // Clean Sheet left unchecked                           // 0 * 5  =  0
    click(document, 'socgk-btn');
    // 5 + 8 - 2 + 0 = 11
    assert.equal(totalFs(document, 'socgk-total-fs'), 11);
});

test('Soccer Goalie: clean-sheet warning is advisory only, never changes the score', async () => {
    const { document } = await loadApp();
    const warning = document.getElementById('socgk-cs-warning');

    // Contradiction: clean sheet ticked WITH goals conceded.
    document.getElementById('socgk-start').checked = true;  //  5
    setValue(document, 'socgk-saves', 3);                   //  6
    setValue(document, 'socgk-ga', 2);                      // -4
    document.getElementById('socgk-cs').checked = true;     //  5
    click(document, 'socgk-btn');

    assert.notEqual(warning.style.display, 'none', 'warning should be visible on contradiction');
    // Crucially the score is still exactly what was entered: 5+6-4+5 = 12
    assert.equal(totalFs(document, 'socgk-total-fs'), 12);

    // Clearing the contradiction hides the warning again.
    setValue(document, 'socgk-ga', 0);
    document.getElementById('socgk-ga').dispatchEvent(new document.defaultView.Event('input'));
    assert.equal(warning.style.display, 'none', 'warning should clear when no goals conceded');
});

// ── MLB Hitter Manual ──
test('MLB Hitter Manual: FS total computes correctly', async () => {
    const { document } = await loadApp();
    setValue(document, 'bsballh-sing', 2);
    setValue(document, 'bsballh-doub', 1);
    setValue(document, 'bsballh-trip', 0);
    setValue(document, 'bsballh-hr', 1);
    setValue(document, 'bsballh-r', 2);
    setValue(document, 'bsballh-rbi', 3);
    setValue(document, 'bsballh-bob', 1);
    setValue(document, 'bsballh-hbp', 0);
    setValue(document, 'bsballh-sb', 1);
    click(document, 'bsballh-btn');
    // 2*3 + 1*5 + 0*8 + 1*10 + 2*2 + 3*2 + 1*2 + 0*2 + 1*5 = 6+5+0+10+4+6+2+0+5 = 38
    assert.equal(totalFs(document, 'bsballh-total-fs'), 38);
});

// ── Save-to-History wiring ──
test('Save-to-History: clicking Save on Basketball Manual writes a gt-history entry', async () => {
    const { document, window } = await loadApp();
    window.localStorage.clear();

    setValue(document, 'bball-player-name', 'Test Player');
    setValue(document, 'bball-pts', 20);
    setValue(document, 'bball-rebs', 10);
    setValue(document, 'bball-asst', 5);
    setValue(document, 'bball-blk', 2);
    setValue(document, 'bball-stl', 3);
    setValue(document, 'bball-to', 4);
    click(document, 'bball-btn');

    const saveBtn = document.querySelector('.history-save-btn[data-sport="basketball"][data-mode="Manual"]');
    assert.ok(saveBtn, 'Basketball Manual Save button not found');
    saveBtn.click();

    const stored = JSON.parse(window.localStorage.getItem('gt-history') || '[]');
    assert.equal(stored.length, 1, 'Expected exactly one saved history entry');
    assert.equal(stored[0].sport, 'basketball');
    assert.equal(stored[0].mode, 'Manual');
    assert.equal(stored[0].total, 50.5);
});

// ── NFL per-quarter play-by-play parser (pure logic, no DOM) ──
// Extracted directly from app.js source rather than re-implemented here,
// so this test actually guards the shipped code, not a parallel copy of it.
const fs = require('fs');
const path = require('path');

function extractFunction(source, name) {
    // \r?\n instead of \n throughout — tolerates both Unix (LF) and Windows
    // (CRLF) line endings. Without this, the regex silently fails to match
    // on any file with CRLF endings (common on Windows), since it requires
    // an LF immediately after the closing brace and CRLF has \r there instead.
    const re = new RegExp(`    function ${name}\\(.*?\\r?\\n    \\}\\r?\\n`, 's');
    const m = source.match(re);
    if (!m) throw new Error(`Could not extract function ${name} from app.js — did it move or get renamed?`);
    return m[0];
}

function loadQuarterParser() {
    // fballoGbParsePlayByPlayQuarter moved from app.js to nfl.js during the
    // module split — updated here alongside that move, per the maintenance
    // note in README.md.
    const source = fs.readFileSync(path.join(__dirname, '..', 'nfl.js'), 'utf8');
    const nameConst = `const FBALLO_GB_NAME_RE = "[A-Z]\\\\.[A-Za-z'\\\\-]+";\n`;
    const fnSource = extractFunction(source, 'fballoGbParsePlayByPlayQuarter');
    const wrapped = `${nameConst}${fnSource}\nmodule.exports = { fballoGbParsePlayByPlayQuarter };`;
    const Module = require('module');
    const m = new Module();
    m._compile(wrapped, 'quarter-parser-extracted.js');
    return m.exports.fballoGbParsePlayByPlayQuarter;
}

test('NFL quarter parser: matches hand-counted real play-by-play text', () => {
    const parsePlayByPlayQuarter = loadQuarterParser();
    const lines = [
        "1-10-ARZ 25 (14:55) D.Jacobs reported in as eligible. J.Brissett pass short right to T.McBride to ARZ 32 for 7 yards (J.Pitre; A.Al-Shaair).",
        "2-3-ARZ 32 (14:18) (Shotgun) M.Carter right guard to ARZ 34 for 2 yards (D.Hunter).",
        "3-1-ARZ 34 (13:57) (No Huddle) J.Brissett up the middle to ARZ 34 for no gain (S.Rankins).",
        "1-10-HST 12 (9:34) (Shotgun) J.Brissett scrambles right end pushed ob at HST 8 for 4 yards (A.Al-Shaair).",
        "PENALTY on ARZ-I.Adams, Offensive Holding, 10 yards, enforced at HST 12 - No Play.",
        "3-4-ARZ 4 (4:42) (Shotgun) C.Stroud pass short left to D.Schultz for 4 yards, TOUCHDOWN. P17",
    ];
    const result = parsePlayByPlayQuarter(lines);
    assert.equal(result.rushing['M.Carter'].yds, 2);
    assert.equal(result.rushing['J.Brissett'].yds, 0); // the "no gain" one
    assert.equal(result.rushing['J.Brissett'].att, 1); // the pushed-ob-4yd play was excluded (No Play)
    assert.equal(result.passing['J.Brissett'].cmp, 1);
    assert.equal(result.passing['J.Brissett'].yds, 7);
    assert.equal(result.passing['C.Stroud'].td, 1);
    assert.equal(result.receiving['D.Schultz'].td, 1);
});