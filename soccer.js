// ============================================================
//  GameTime Platform — Soccer
//  soccer.js
//
//  Outfielder and (later) Goalie fantasy scoring.
//
//  Scoring per the Product Roadmap spec, with one correction confirmed
//  with Alex: the spec sheet listed Yellow -1 / Red -0.5, which had the
//  severity backwards. Confirmed correct values are Yellow -1, Red -2.
//
//  Shot and Shot on Target are ADDITIVE (confirmed): a shot on target
//  scores 1 as a shot PLUS 1 as on-target = 2 total. The card therefore
//  expects "Shot" to be the player's TOTAL shots (including on-target
//  ones), not shots-off-target.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox,
} from './shared.js';

// Stat id -> { label, weight }. Order here defines both the compute order
// and the order of lines in the breakdown text, and must stay in sync with
// the table row order in index.html so "hide zero stats" lines up with the
// right inputs (setupHideZerosCheckbox pairs statLines[i] with inputs[i]).
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

export function initSoccer() {
    // ── Soccer Outfielder — Manual mode ──────────────────────
    const socoutTotalEl  = document.querySelector('#socout-total-fs');
    const socoutGoBtn    = document.querySelector('#socout-btn');
    const socoutClearBtn = document.querySelector('#socout-clear');
    const socoutCopyBtn  = document.querySelector('#socout-copy');
    const socoutHeaderEl = document.querySelector('#head-socout');
    let   socoutHzsChk   = document.querySelector('#socout-hzs-checkbox');
    const socoutInputs   = document.querySelectorAll('.socout-fs');
    const socoutVals     = document.querySelectorAll('.socout-val');

    socoutGoBtn.addEventListener('click', () => {
        const statLines = [];
        let total = 0;

        SOCOUT_STATS.forEach(({ id, label, weight }) => {
            const input = document.getElementById(`socout-${id}`);
            const count = Number(input.value) || 0;
            // Round each line individually before summing, so the displayed
            // per-line values always add up to the printed total. Matters
            // here because Passes Attempted (0.05) and the 0.5-weight stats
            // produce fractions that would otherwise drift.
            const value = Number((count * weight).toFixed(2));
            total += value;
            document.querySelector(`#socout-${id}-val`).innerHTML = `= ${value}`;
            statLines.push(`${label}: ${socoutWeightLabel(weight)} (${count}) = ${value}`);
        });

        total = Number(total.toFixed(2));
        socoutTotalEl.innerHTML = total;
        fillEmptyInputs(socoutInputs);

        const header = buildHeader(document.getElementById('socout-player-name').value);
        const breakdown = withHeader(header, buildBreakdown(statLines, total));
        showBreakdown('#socout-breakdown', '#socout-textarea-btn-cont', breakdown);
        socoutHzsChk = setupHideZerosCheckbox(
            socoutHzsChk, '#socout-breakdown', statLines, socoutInputs, total, '', header
        );
    });

    socoutClearBtn.addEventListener('click', () => {
        socoutInputs.forEach(i => i.value = '');
        socoutVals.forEach(v => v.innerHTML = '');
        document.getElementById('socout-player-name').value = '';
        socoutTotalEl.innerHTML = '';
        document.querySelector('#socout-breakdown').innerHTML = '';
        document.querySelector('#socout-textarea-btn-cont').style.display = 'none';
    });

    socoutCopyBtn.addEventListener('click',  () => copyBreakdown('#socout-breakdown'));
    socoutHeaderEl.addEventListener('click', () => toggleSection('#content-socout'));

    // ── Soccer Goalie — Manual mode ──────────────────────────
    // Scoring is availability + shot-stopping only: no Goal Scored / Assist /
    // Shot (an earlier draft of the spec had those; confirmed replaced).
    //
    // Clean Sheet is a plain checkbox on trust. The real rule needs minutes
    // played (must play past the 60th minute without conceding, and being
    // subbed off before 60 makes them ineligible regardless), which isn't
    // derivable from anything else on this card — so Manual mode explains
    // the rule in helper text rather than asking for a Minutes Played field
    // nobody wants to type. Player Search mode will derive it from Fotmob,
    // where minutes and goals-conceded come back with the lineup data.
    //
    // One contradiction IS checkable without minutes: Clean Sheet ticked
    // while Goals Conceded > 0 can never be right. That's surfaced as an
    // ADVISORY warning — it never blocks the calculation or alters the
    // score, since the user may be mid-entry or handling an edge case the
    // app doesn't know about.
    const socgkTotalEl  = document.querySelector('#socgk-total-fs');
    const socgkGoBtn    = document.querySelector('#socgk-btn');
    const socgkClearBtn = document.querySelector('#socgk-clear');
    const socgkCopyBtn  = document.querySelector('#socgk-copy');
    const socgkHeaderEl = document.querySelector('#head-socgk');
    let   socgkHzsChk   = document.querySelector('#socgk-hzs-checkbox');
    const socgkInputs   = document.querySelectorAll('.socgk-fs');
    const socgkVals     = document.querySelectorAll('.socgk-val');
    const socgkStart    = document.querySelector('#socgk-start');
    const socgkSaves    = document.querySelector('#socgk-saves');
    const socgkGa       = document.querySelector('#socgk-ga');
    const socgkCs       = document.querySelector('#socgk-cs');
    const socgkWarning  = document.querySelector('#socgk-cs-warning');

    function socgkCheckCleanSheet() {
        const conceded = Number(socgkGa.value) || 0;
        const contradiction = socgkCs.checked && conceded > 0;
        socgkWarning.textContent = contradiction
            ? `Clean Sheet is ticked but ${conceded} goal${conceded === 1 ? '' : 's'} conceded — a keeper who conceded can't have a clean sheet. Score still calculated as entered.`
            : '';
        socgkWarning.style.display = contradiction ? 'block' : 'none';
    }
    socgkCs.addEventListener('change', socgkCheckCleanSheet);
    socgkGa.addEventListener('input', socgkCheckCleanSheet);

    socgkGoBtn.addEventListener('click', () => {
        const startCount = socgkStart.checked ? 1 : 0;
        const savesCount = Number(socgkSaves.value) || 0;
        const gaCount    = Number(socgkGa.value) || 0;
        const csCount    = socgkCs.checked ? 1 : 0;

        const startVal = startCount * 5;
        const savesVal = savesCount * 2;
        const gaVal    = gaCount * -2;
        const csVal    = csCount * 5;
        const total    = Number((startVal + savesVal + gaVal + csVal).toFixed(2));

        document.querySelector('#socgk-start-val').innerHTML = `= ${startVal}`;
        document.querySelector('#socgk-saves-val').innerHTML = `= ${savesVal}`;
        document.querySelector('#socgk-ga-val').innerHTML    = `= ${gaVal}`;
        document.querySelector('#socgk-cs-val').innerHTML    = `= ${csVal}`;
        socgkTotalEl.innerHTML = total;
        fillEmptyInputs(socgkInputs);
        socgkCheckCleanSheet();

        const statLines = [
            `Starting Score: 5 pts (${startCount}) = ${startVal}`,
            `Saves: 2 pts (${savesCount}) = ${savesVal}`,
            `Goals Conceded: -2 pts (${gaCount}) = ${gaVal}`,
            `Clean Sheet: 5 pts (${csCount}) = ${csVal}`,
        ];

        // setupHideZerosCheckbox pairs statLines[i] with inputs[i] and only
        // ever reads `.value`, so checkboxes are represented by lightweight
        // stand-ins exposing '1'/'0' — lets the two checkbox rows take part
        // in "hide zero stats" alongside the real numeric inputs.
        const hzsInputs = [
            { value: String(startCount) },
            socgkSaves,
            socgkGa,
            { value: String(csCount) },
        ];

        const header = buildHeader(document.getElementById('socgk-player-name').value);
        const breakdown = withHeader(header, buildBreakdown(statLines, total));
        showBreakdown('#socgk-breakdown', '#socgk-textarea-btn-cont', breakdown);
        socgkHzsChk = setupHideZerosCheckbox(
            socgkHzsChk, '#socgk-breakdown', statLines, hzsInputs, total, '', header
        );
    });

    socgkClearBtn.addEventListener('click', () => {
        socgkInputs.forEach(i => i.value = '');
        socgkVals.forEach(v => v.innerHTML = '');
        socgkStart.checked = false;
        socgkCs.checked = false;
        document.getElementById('socgk-player-name').value = '';
        socgkTotalEl.innerHTML = '';
        socgkWarning.style.display = 'none';
        document.querySelector('#socgk-breakdown').innerHTML = '';
        document.querySelector('#socgk-textarea-btn-cont').style.display = 'none';
    });

    socgkCopyBtn.addEventListener('click',  () => copyBreakdown('#socgk-breakdown'));
    socgkHeaderEl.addEventListener('click', () => toggleSection('#content-socgk'));
}