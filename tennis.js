// ============================================================
//  GameTime Platform — Tennis
//  tennis.js
//
//  Confirmed self-contained during the split — nothing outside this block
//  references any tennis-* identifier, and this block doesn't reach into
//  any other sport.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown,
} from './shared.js';

export function initTennis() {
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
        const decidingSetIdx = format - 1; // set 3 in BO3, set 5 in BO5
        /**
         * True if a set score pair represents a completed set.
         *
         * SUPER TIEBREAK: when the match is decided by a super tiebreak (a
         * first-to-10 game played in place of a full deciding set), that set
         * is entered as 1-0 / 0-1 — because per the scoring rules a super
         * tiebreak counts as ONE GAME, not as its raw point score. A plain
         * `p >= 6 || o >= 6` check would treat 1-0 as an unfinished set and
         * silently drop the set win (the games tally is computed separately,
         * so games came through fine while Set Won quietly went missing).
         *
         * Deliberately scoped to the DECIDING set only: a 1-0 in any earlier
         * set is still an in-progress set, which is the safer reading.
         * Note the raw score (e.g. 10-3) must NOT be entered — that would
         * count 10 tiebreak POINTS as 10 games won.
         */
        function setComplete(p, o, setIdx) {
            if (setIdx === decidingSetIdx && ((p === 1 && o === 0) || (p === 0 && o === 1))) return true;
            return p >= 6 || o >= 6;
        }
        /** 6 normally; 7 if the in-progress set is already at 5-5 or beyond. */
        function winningScore(w, l) { return (w >= 5 && l >= 5) ? 7 : 6; }
        /**
         * Fill sets for the winning side after a retirement.
         * winnerScores / loserScores are the raw arrays, mutated in place.
         */
        function applyRetirement(winnerScores, loserScores) {
            if (!setComplete(winnerScores[0], loserScores[0], 0)) return; // Set 1 must be done
            // Step 1 — find and fill the first incomplete set
            let retiredAtSet = -1;
            for (let i = 0; i < format; i++) {
                if (!setComplete(winnerScores[i], loserScores[i], i)) { retiredAtSet = i; break; }
            }
            if (retiredAtSet !== -1) {
                winnerScores[retiredAtSet] = winningScore(winnerScores[retiredAtSet], loserScores[retiredAtSet]);
            }
            // Step 2 — count winner's set wins after that fill
            let winnerSetWins = 0;
            for (let i = 0; i < format; i++) {
                if (setComplete(winnerScores[i], loserScores[i], i) && winnerScores[i] > loserScores[i]) winnerSetWins++;
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
            if (!setComplete(pScores[i], oScores[i], i)) continue;
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
        const isDNP = retirementChecked && !setComplete(pScores[0], oScores[0], 0);
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

} // end initTennis