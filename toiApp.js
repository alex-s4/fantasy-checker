// ============================================================
//  GameTime Platform — Time Calculator
//  toiApp.js
// ============================================================


window.onload = function () {

    // --------------------------------------------------------
    //  BOOTSTRAP INIT
    // --------------------------------------------------------

    const toastTrigger     = document.getElementById('liveToastBtn');
    const toastLiveExample = document.getElementById('liveToast');
    const triggerToastBtn  = document.getElementById('liveToastBtn');

    if (toastTrigger) {
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample);
        toastTrigger.addEventListener('click', () => toastBootstrap.show());
    }


    // --------------------------------------------------------
    //  SHARED UTILITIES
    // --------------------------------------------------------

    /** Copy a textarea's contents to the clipboard and trigger the toast. */
    function copyBreakdown(textareaEl) {
        textareaEl.select();
        textareaEl.setSelectionRange(0, 99999);
        triggerToastBtn.click();
        navigator.clipboard.writeText(textareaEl.value);
    }

    /**
     * Convert seconds to a 2-digit decimal fraction string.
     * e.g. 30 seconds → "50"  (30/60 = 0.50 → "50")
     */
    function secsToDecStr(secs) {
        const dec = String(Math.round(secs * 100 / 60) / 100).slice(2);
        return dec === '' ? '00' : dec;
    }

    /** Pad a single-digit seconds value with a leading zero. */
    function padSecs(val) {
        return String(val).padStart(2, '0');
    }


    // ========================================================
    //  NHL — TIME ON ICE CALCULATOR
    // ========================================================

    const toiGoBtn     = document.querySelector('#nhl-toi-btn');
    const toiCopyBtn   = document.querySelector('#toi-copy');
    const toiClearBtn  = document.querySelector('#nhl-toi-clear');
    const toiPeriodRad = document.querySelector('#toi-periods');
    const toiTotalRad  = document.querySelector('#toi-total');
    const toiBreakdown = document.querySelector('#nhl-toi-breakdown');

    // Period-mode inputs
    const p1Mins = document.querySelector('#p1-mins');
    const p1Secs = document.querySelector('#p1-secs');
    const p2Mins = document.querySelector('#p2-mins');
    const p2Secs = document.querySelector('#p2-secs');

    // Total-mode inputs
    const totMins = document.querySelector('#tot-mins');
    const totSecs = document.querySelector('#tot-secs');

    // Result display spans
    const toiDecResult    = document.querySelector('#toi-in-dec');
    const toiDecTotResult = document.querySelector('#toi-in-dec-tot');

    // NodeLists for bulk enable/disable
    const toiPeriodInputs = document.querySelectorAll('.input-toi-period');
    const toiRadioBtns    = document.querySelectorAll('.toi-radio-btn');
    const toiMinInputs    = document.querySelectorAll('.input-toi-mins');
    const toiSecInputs    = document.querySelectorAll('.input-toi-secs');
    const toiValSpans     = document.querySelectorAll('.toi-val');

    // --- Initial state: disable all inputs until a radio is chosen ---
    if (!toiPeriodRad.checked && !toiTotalRad.checked) {
        toiPeriodInputs.forEach(el => el.disabled = true);
        totMins.disabled = true;
        totSecs.disabled = true;
    } else if (!toiTotalRad.checked) {
        totMins.disabled = true;
        totSecs.disabled = true;
    }

    // --- Radio toggle: switch between period-mode and total-mode ---
    toiRadioBtns.forEach(radio => {
        radio.addEventListener('input', () => {
            if (toiPeriodRad.checked) {
                toiPeriodInputs.forEach(el => el.disabled = false);
                totMins.disabled = true;
                totSecs.disabled = true;
                totMins.value = '';
                totSecs.value = '';
                toiDecTotResult.innerHTML = '';
            } else if (toiTotalRad.checked) {
                toiPeriodInputs.forEach(el => { el.disabled = true; el.value = ''; });
                totMins.disabled = false;
                totSecs.disabled = false;
                toiDecResult.innerHTML = '';
            }
        });
    });

    // --- GO button ---
    toiGoBtn.addEventListener('click', () => {

        if (toiPeriodRad.checked) {
            // ---- Period mode: subtract OT TOI from total TOI ----

            let resultMins = Number(p1Mins.value) - Number(p2Mins.value);
            let resultSecs = Number(p1Secs.value) - Number(p2Secs.value);

            // Borrow a minute if seconds went negative
            if (resultSecs < 0) {
                resultSecs += 60;
                resultMins -= 1;
            }

            // Pad seconds inputs to 2 digits; default empty to "00"
            toiSecInputs.forEach(el => {
                if (el.value.length === 1) el.value = padSecs(el.value);
                if (el.value === '' || el.value === '0') el.value = '00';
            });
            toiMinInputs.forEach(el => {
                if (el.value === '' || el.value === '0') el.value = '00';
            });

            const decStr = secsToDecStr(resultSecs);

            toiDecResult.innerHTML = `${resultMins}:${padSecs(resultSecs)} = ${resultMins}.${decStr}`;
            toiBreakdown.value =
                `Total TOI - ${p1Mins.value}:${p1Secs.value}\n` +
                `Overtime TOI - ${p2Mins.value}:${p2Secs.value}\n\n` +
                `Correct at ${resultMins}:${padSecs(resultSecs)} = ${resultMins} + (${resultSecs}/60) = ${resultMins}.${decStr}`;

        } else if (toiTotalRad.checked) {
            // ---- Total mode: convert mm:ss to decimal ----

            const rawSecs = Number(totSecs.value);
            const rawMins = Number(totMins.value);

            // Pad / default empty inputs
            if (totSecs.value.length === 1) totSecs.value = padSecs(totSecs.value);
            if (totMins.value === '')        totMins.value = '0';
            if (totSecs.value === '')        totSecs.value = '00';

            const decStr = (rawSecs === 0 || totSecs.value === '00') ? '0' : secsToDecStr(rawSecs);

            toiDecTotResult.innerHTML = ` = ${totMins.value}.${decStr}`;
            toiBreakdown.value =
                `Total: ${totMins.value}:${totSecs.value} = ` +
                `${totMins.value} + (${totSecs.value}/60) = ${totMins.value}.${decStr}`;
        }

        document.querySelector('#toi-textarea-btn-cont').style.display = 'block';
    });

    // --- Copy button ---
    toiCopyBtn.addEventListener('click', () => copyBreakdown(toiBreakdown));

    // --- Clear button ---
    toiClearBtn.addEventListener('click', () => {
        document.querySelectorAll('.input-time-global').forEach(el => el.value = '');
        toiValSpans.forEach(el => el.innerHTML = '');
        toiBreakdown.value = '';
        document.querySelector('#toi-textarea-btn-cont').style.display = 'none';
    });


    // ========================================================
    //  MMA — FIGHT TIME CALCULATOR
    // ========================================================

    const mmaGoBtn    = document.querySelector('#mma-ft-btn');
    const mmaCopyBtn  = document.querySelector('#mma-ft-copy');
    const mmaClearBtn = document.querySelector('#mma-ft-clear');
    const mmaMins     = document.querySelector('#mma-ft-mins');
    const mmaSecs     = document.querySelector('#mma-ft-secs');
    const mmaRadios   = document.querySelectorAll('.mma-ft-radio');
    const mmaResult   = document.querySelector('#mma-ft-result');
    const mmaTextarea = document.querySelector('#mma-ft-breakdown');

    mmaGoBtn.addEventListener('click', () => {

        // Default empty inputs
        if (mmaMins.value === '' && mmaSecs.value === '') {
            mmaMins.value = '5'; mmaSecs.value = '00'; // full round default
        } else if (mmaMins.value === '') {
            mmaMins.value = '0';
        } else if (mmaSecs.value === '') {
            mmaSecs.value = '00';
        }

        if (mmaSecs.value.length === 1) mmaSecs.value = padSecs(mmaSecs.value);

        // Find which round radio is checked
        let roundIndex = 0;   // 0-based (Round 1 = index 0)
        let roundNumber = 1;
        mmaRadios.forEach(r => {
            if (r.checked) {
                roundIndex  = Number(r.value);
                roundNumber = roundIndex + 1;
            }
        });

        const totalMins = (roundIndex * 5) + Number(mmaMins.value);
        const decStr    = secsToDecStr(Number(mmaSecs.value));

        mmaResult.innerHTML = `${totalMins}:${mmaSecs.value} = ${totalMins}.${decStr}`;
        mmaTextarea.value =
            `Fight Ended at ${mmaMins.value}:${mmaSecs.value} of Round ${roundNumber}\n\n` +
            `Total Fight Time = ${totalMins}:${mmaSecs.value} = ${totalMins} + (${mmaSecs.value}/60) = ${totalMins}.${decStr}`;

        document.querySelector('#ft-textarea-btn-cont').style.display = 'block';
    });

    mmaCopyBtn.addEventListener('click',  () => copyBreakdown(mmaTextarea));

    mmaClearBtn.addEventListener('click', () => {
        mmaMins.value = '';
        mmaSecs.value = '';
        mmaTextarea.value = '';
        mmaResult.innerHTML = '';
        document.querySelector('#ft-textarea-btn-cont').style.display = 'none';
    });


    // ========================================================
    //  BOXING — FIGHT TIME CALCULATOR
    // ========================================================

    const boxGoBtn    = document.querySelector('#box-ft-btn');
    const boxCopyBtn  = document.querySelector('#box-ft-copy');
    const boxClearBtn = document.querySelector('#box-ft-clear');
    const boxMins     = document.querySelector('#box-ft-mins');
    const boxSecs     = document.querySelector('#box-ft-secs');
    const boxRadios   = document.querySelectorAll('.box-ft-radio');
    const boxResult   = document.querySelector('#box-ft-result');
    const boxTextarea = document.querySelector('#box-ft-breakdown');

    boxGoBtn.addEventListener('click', () => {

        // Default empty inputs
        if (boxMins.value === '' && boxSecs.value === '') {
            boxMins.value = '3'; boxSecs.value = '00'; // full round default
        } else if (boxMins.value === '') {
            boxMins.value = '0';
        } else if (boxSecs.value === '') {
            boxSecs.value = '00';
        }

        if (boxSecs.value.length === 1) boxSecs.value = padSecs(boxSecs.value);

        // Find which round radio is checked
        let roundIndex  = 0;
        let roundNumber = 1;
        boxRadios.forEach(r => {
            if (r.checked) {
                roundIndex  = Number(r.value);
                roundNumber = roundIndex + 1;
            }
        });

        const totalMins = (roundIndex * 3) + Number(boxMins.value);
        const decStr    = secsToDecStr(Number(boxSecs.value));

        boxResult.innerHTML = `${totalMins}:${boxSecs.value} = ${totalMins}.${decStr}`;
        boxTextarea.value =
            `Fight Ended at ${boxMins.value}:${boxSecs.value} of Round ${roundNumber}\n\n` +
            `Total Fight Time = ${totalMins}:${boxSecs.value} = ${totalMins} + (${boxSecs.value}/60) = ${totalMins}.${decStr}`;

        document.querySelector('#box-ft-textarea-btn-cont').style.display = 'block';
    });

    boxCopyBtn.addEventListener('click',  () => copyBreakdown(boxTextarea));

    boxClearBtn.addEventListener('click', () => {
        boxMins.value = '';
        boxSecs.value = '';
        boxTextarea.value = '';
        boxResult.innerHTML = '';
        document.querySelector('#box-ft-textarea-btn-cont').style.display = 'none';
    });

}; // end window.onload
