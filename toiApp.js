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
    //  NHL — TOI REPORT IMPORT (nhl.com official HTM reports)
    // ========================================================
    //
    // NHL's htmlreports pages are old, deeply-nested legacy HTML (not an
    // API) and don't appear to send Access-Control-Allow-Origin headers,
    // so a direct browser fetch() will very likely be blocked by CORS —
    // same class of problem as stats.nba.com elsewhere in this codebase.
    // We still try fetch() first since it's the smoothest path when it
    // works, but fall back to a "paste the page source" textarea (same
    // parser either way) when it doesn't.
    //
    // Parsing strategy: rather than relying on the exact table nesting
    // (which is fragile on this kind of legacy markup), walk every <tr>
    // in the document in order and track "current player" state as we go.
    // A row whose full text matches "<jersey#> LASTNAME, First" starts a
    // new player; subsequent rows starting with a period number or "TOT"
    // (from that player's own Per/SHF/AVG/TOI/EV/PP/SH summary table) are
    // recorded under that player until the next player heading appears.
    // Periods 1-3 are always regulation; anything from period 4 onward is
    // overtime, whether that's a single 3v3 OT (regular season) or several
    // full OT periods (playoffs).

    const toiImportUrlInput    = document.querySelector('#toi-import-url');
    const toiImportLoadBtn     = document.querySelector('#toi-import-load');
    const toiImportClearBtn    = document.querySelector('#toi-import-clear');
    const toiImportMsg         = document.querySelector('#toi-import-msg');
    const toiImportFallback    = document.querySelector('#toi-import-fallback');
    const toiImportHtmlInput   = document.querySelector('#toi-import-html');
    const toiImportParseBtn    = document.querySelector('#toi-import-parse-fallback');
    const toiImportResultsWrap = document.querySelector('#toi-import-results');
    const toiImportResultsHead = document.querySelector('#toi-import-results-head');
    const toiImportResultsBody = document.querySelector('#toi-import-results-body');

    /** "4:12" -> 252 */
    function timeStrToSecs(str) {
        const [m, s] = str.split(':').map(Number);
        return (m * 60) + s;
    }

    /** 252 -> "4:12" */
    function secsToMmSs(totalSecs) {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins}:${padSecs(secs)}`;
    }

    /** 252 -> "4.20" (mm.dd decimal, e.g. 4:12 = 4 + 12/60 = 4.20) */
    function secsToDecimalStr(totalSecs) {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins}.${secsToDecStr(secs)}`;
    }

    /** "mm:ss = <span class=decimal>m.d</span>" — decimal highlighted since
     *  that's the value actually needed for PrizePicks. */
    function formatToiCell(totalSecs) {
        return `${secsToMmSs(totalSecs)} = <span class="toi-dec-highlight">${secsToDecimalStr(totalSecs)}</span>`;
    }

    function setToiImportMsg(msg, type) {
        toiImportMsg.textContent = msg;
        toiImportMsg.className = 'fetch-msg' + (type ? ' fetch-msg--' + type : '');
    }

    /** Find the team name this report covers, via the ".teamHeading" cell
     *  that introduces this report's own shift tables — e.g.
     *  <td class="teamHeading + border">BUFFALO SABRES</td>. NHL's legacy
     *  markup uses space-separated class tokens like "teamHeading + border",
     *  so .teamHeading matches it directly. This cell is deliberately NOT
     *  the scoreboard-header "Game # Away/Home Game #" cells — those show
     *  BOTH teams (once each), so picking from there is ambiguous about
     *  which team this specific report actually covers. A TOI report only
     *  ever covers one team (the file is per-team: a "TV" away report or
     *  "TH" home report), so whatever we find here applies to every player. */
    function parseNhlToiTeamName(doc) {
        const heading = doc.querySelector('.teamHeading');
        if (heading) {
            const text = heading.textContent.replace(/\s+/g, ' ').trim();
            if (text) return text;
        }

        // Fallback for report variants without a .teamHeading cell: look
        // for "<name> Game # Away/Home Game #", handling <br> not adding
        // whitespace to textContent.
        const cells = Array.from(doc.querySelectorAll('td'))
            .map(el => el.textContent.replace(/\s+/g, ' ').trim())
            .filter(t => t !== '');
        for (const text of cells) {
            const m = text.match(/^(.+?)Game\s+\d+\s+(Away|Home)\s+Game\s+\d+$/i);
            if (m) return m[1].trim();
        }
        return null;
    }

    /**
     * Parse an NHL.com TOI report's HTML into per-player TOI data.
     * Returns [{ jersey, name, team, periods: {1: secs, ...}, totalSecs, otSecs, regSecs }]
     */
    function parseNhlToiReport(htmlText) {
        const doc  = new DOMParser().parseFromString(htmlText, 'text/html');
        const team = parseNhlToiTeamName(doc);
        const rows = Array.from(doc.querySelectorAll('tr'));

        // "4 GOSTISBEHERE, SHAYNE" -> jersey 4, last GOSTISBEHERE, first SHAYNE
        const headingRe = /^(\d{1,2})\s+([A-Z'.\-]+),\s*(.+)$/;

        const players = [];
        let current = null;

        rows.forEach(row => {
            const cols = Array.from(row.querySelectorAll('td, th'))
                .map(c => c.textContent.replace(/\s+/g, ' ').trim())
                .filter(c => c !== '');
            if (cols.length === 0) return;

            const rowText = cols.join(' ');
            const headingMatch = rowText.match(headingRe);
            if (headingMatch) {
                const [, jersey, last, first] = headingMatch;
                current = { jersey, name: `${first.trim()} ${last.trim()}`, team, periods: {}, totalSecs: null };
                players.push(current);
                return;
            }

            if (!current) return;
            if (cols[0] === 'Per') return;      // header row of the summary table
            if (cols.length < 4) return;

            const toi = cols[3];
            if (!/^\d{1,3}:\d{2}$/.test(toi)) return;
            const secs = timeStrToSecs(toi);

            if (cols[0] === 'TOT') {
                current.totalSecs = secs;
            } else if (/^\d+$/.test(cols[0])) {
                current.periods[Number(cols[0])] = secs;
            }
        });

        return players
            .filter(p => p.totalSecs != null) // drop anything without a TOT row (no ice time recorded)
            .map(p => {
                const otSecs = Object.entries(p.periods)
                    .filter(([per]) => Number(per) > 3)
                    .reduce((sum, [, s]) => sum + s, 0);
                return { ...p, otSecs, regSecs: p.totalSecs - otSecs };
            });
    }

    function renderToiImportResults(players) {
        if (players.length === 0) {
            setToiImportMsg('No players found — is this a valid NHL.com TOI report page?', 'error');
            toiImportResultsWrap.style.display = 'none';
            return;
        }

        // If nobody logged OT time, this game ended in regulation — drop the
        // OT/Regulation columns entirely rather than show a redundant "0:00"
        // OT column and a Regulation column that's identical to Total.
        const hasOT = players.some(p => p.otSecs > 0);

        toiImportResultsHead.innerHTML = hasOT
            ? '<tr><th>#</th><th>Team</th><th>Player</th><th>Total TOI</th><th>OT TOI</th><th>Regulation TOI</th></tr>'
            : '<tr><th>#</th><th>Team</th><th>Player</th><th>Total TOI</th></tr>';

        toiImportResultsBody.innerHTML = players.map(p => {
            const teamCell  = `<td>${p.team || '—'}</td>`;
            const totalCell = `<td>${formatToiCell(p.totalSecs)}</td>`;
            if (!hasOT) {
                return `<tr><td>${p.jersey}</td>${teamCell}<td>${p.name}</td>${totalCell}</tr>`;
            }
            const otCell  = `<td>${p.otSecs > 0 ? formatToiCell(p.otSecs) : '—'}</td>`;
            const regCell = `<td>${formatToiCell(p.regSecs)}</td>`;
            return `<tr><td>${p.jersey}</td>${teamCell}<td>${p.name}</td>${totalCell}${otCell}${regCell}</tr>`;
        }).join('');

        toiImportResultsWrap.style.display = 'block';
        setToiImportMsg(
            `Parsed ${players.length} player(s)${hasOT ? '' : ' — game ended in regulation, no OT.'}`,
            'success'
        );
    }

    function runToiImportParse(htmlText) {
        try {
            renderToiImportResults(parseNhlToiReport(htmlText));
        } catch (err) {
            setToiImportMsg('Failed to parse the report: ' + err.message, 'error');
        }
    }

    toiImportLoadBtn.addEventListener('click', async () => {
        const url = toiImportUrlInput.value.trim();
        if (!url) { setToiImportMsg('Paste a report URL first.', 'error'); return; }

        toiImportFallback.style.display = 'none';
        toiImportResultsWrap.style.display = 'none';
        setToiImportMsg('Fetching…', 'loading');

        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            runToiImportParse(await res.text());
        } catch (err) {
            setToiImportMsg(
                "Fetch failed — likely blocked by CORS, since NHL.com's report pages don't appear to allow direct cross-origin requests. Use the fallback below instead.",
                'error'
            );
            toiImportFallback.style.display = 'block';
        }
    });

    toiImportParseBtn.addEventListener('click', () => {
        if (!toiImportHtmlInput.value.trim()) { setToiImportMsg('Paste the page source first.', 'error'); return; }
        runToiImportParse(toiImportHtmlInput.value);
    });

    toiImportClearBtn.addEventListener('click', () => {
        toiImportUrlInput.value = '';
        toiImportHtmlInput.value = '';
        toiImportFallback.style.display = 'none';
        toiImportResultsWrap.style.display = 'none';
        setToiImportMsg('', '');
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