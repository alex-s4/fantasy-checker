// ============================================================
//  GameTime Platform — Fantasy Score Calculator
//  app.js
// ============================================================
import {
    fillEmptyInputs, buildBreakdown, buildBreakdownHideZeros, showBreakdown,
    buildHeader, withHeader, toggleSection, copyBreakdown, setupHideZerosCheckbox,
    getCheckedRadioValue, getTodayEasternDateStr, initHistorySaveButtons,
} from './shared.js';
import { initBasketball } from './basketball.js';
import { initMlb } from './mlb.js';
import { initTennis } from './tennis.js';
import { initMma } from './mma.js';
import { initBoxing } from './boxing.js';
import { initNfl } from './nfl.js';
import { initSoccer } from './soccer.js';

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
    //  DEFAULT DATES — today in Eastern Time
    // --------------------------------------------------------
    const todayET = getTodayEasternDateStr();
    ['#bball-date', '#bsballh-date', '#bsballp-date', '#fballo-date', '#bball-gb-lookup-date', '#fballo-gb-lookup-date'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.value = todayET;
    });

    initBasketball();
    initMlb();
    initTennis();
    initMma();
    initBoxing();
    initNfl();
    initSoccer();

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

    // Save-to-History wiring (all 16 Save buttons) now lives in shared.js —
    // see initHistorySaveButtons for the generic handler.
    initHistorySaveButtons();
}; // end window.onload