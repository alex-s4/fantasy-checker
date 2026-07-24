// ============================================================
//  GameTime Platform — Boxing
//  boxing.js
//
//  Confirmed self-contained during the split — nothing outside this block
//  references any box-* identifier, and this block doesn't reach into
//  any other sport.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox, getCheckedRadioValue,
} from './shared.js';

export function initBoxing() {
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

} // end initBoxing