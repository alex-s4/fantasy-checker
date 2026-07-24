// ============================================================
//  GameTime Platform — MMA
//  mma.js
//
//  Confirmed self-contained during the split — nothing outside this block
//  references any mma-* identifier, and this block doesn't reach into
//  any other sport.
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, getCheckedRadioValue,
} from './shared.js';

export function initMma() {
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

} // end initMma