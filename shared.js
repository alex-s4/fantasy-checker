// ============================================================
//  GameTime Platform — shared utilities
//  shared.js
//
//  Functions used across MULTIPLE sports/cards. Sport-specific logic stays
//  in its own file (basketball.js, mlb.js, etc. — split incrementally).
// ============================================================

/** Fill empty inputs with "0" so the breakdown text is never blank. */
export function fillEmptyInputs(inputs) {
    inputs.forEach(input => {
        if (input.value === '') input.value = 0;
    });
}

/** Build a plain-text breakdown string from an array of stat lines + total. */
export function buildBreakdown(statLines, total, trailText = '') {
    return statLines.join('\n') + (trailText ? '\n' + trailText : '') + '\n\nTOTAL FS = ' + total;
}

/** Build the same breakdown but skipping lines whose matching input is "0". */
export function buildBreakdownHideZeros(statLines, inputs, total, trailText = '') {
    const filtered = statLines.filter((_, i) => inputs[i] && inputs[i].value !== '0');
    return filtered.join('\n') + (trailText ? '\n' + trailText : '') + '\n\nTOTAL FS = ' + total;
}

/** Write text to the breakdown textarea and show the copy-button container. */
export function showBreakdown(textareaId, btnContId, text) {
    document.querySelector(textareaId).innerHTML = text;
    document.querySelector(btnContId).style.display = 'block';
}

/** Build breakdown header line from name + optional period label.
 *  - With period:  "LeBron James - 1Q FS" or "1Q FS" (no name)
 *  - Without:      "LeBron James FS"        or ""     (no name, no period)
 */
export function buildHeader(name, period) {
    const n = (name || '').trim();
    const p = period || '';
    if (n && p)  return `${n} - ${p} FS`;
    if (n)       return `${n} FS`;
    if (p)       return `${p} FS`;
    return '';
}

/** Prepend header to a breakdown string if header is non-empty. */
export function withHeader(header, breakdown) {
    return header ? `${header}\n${breakdown}` : breakdown;
}

export function toggleSection(contentSelector) {
    const el = document.querySelector(contentSelector);
    const header = el.previousElementSibling; // .card-header sits right before .card-body
    el.classList.toggle('open');
    if (header && header.classList.contains('card-header')) {
        header.classList.toggle('open');
    }
}

/** Copy a textarea's contents to the clipboard and trigger the toast.
 *  NOTE: this does its own #liveToastBtn lookup rather than depending on an
 *  outer-scope variable (as the pre-split version did) — makes this function
 *  genuinely self-contained, which is exactly the kind of thing a monolithic
 *  file makes easy to get away with and a real module split forces you to fix. */
export function copyBreakdown(textareaSelector) {
    const el = document.querySelector(textareaSelector);
    el.select();
    el.setSelectionRange(0, 99999);
    const toastBtn = document.getElementById('liveToastBtn');
    if (toastBtn) toastBtn.click();
    navigator.clipboard.writeText(el.value);
}

/**
 * Wire up the "Hide zero stats" checkbox.
 * Must be called inside the Go-button handler (after statLines + total are known).
 */
export function setupHideZerosCheckbox(checkbox, textareaId, statLines, inputs, total, trailText = '', header = '') {
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
export function getCheckedRadioValue(radios) {
    for (const r of radios) {
        if (r.checked) return Number(r.value);
    }
    return 0;
}

/** Today's date in Eastern Time as YYYY-MM-DD (for date input defaults). */
export function getTodayEasternDateStr() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
}

// ── Save to History — shared across all cards ──────────────────
// Every mode's "Copy" button has a matching "Save" button right next to it,
// driven by data-sport/data-mode/data-breakdown/data-matchup/data-date
// attributes set in the HTML — this is the one generic handler for all of
// them, wired up once via initHistorySaveButtons().
const HISTORY_STORAGE_KEY = 'gt-history';

export function historyLoad() {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function historySaveList(list) {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(list));
}

/** Best-effort player-name extraction from a breakdown's own header line
 *  (buildHeader output, e.g. "LeBron James FS" or "LeBron James - 1Q FS").
 *  Manual modes have no name input, so their breakdowns have no header —
 *  this correctly returns '' for those rather than misreading a stat line
 *  as a name (stat lines always contain "=", header lines never do). */
export function historyParsePlayerName(breakdownText) {
    const firstLine = (breakdownText.split('\n')[0] || '').trim();
    if (/ FS$/.test(firstLine) && !firstLine.includes('=')) {
        return firstLine.replace(/ FS$/, '').replace(/ - .*$/, '').trim();
    }
    return '';
}

export function historyParseTotal(breakdownText) {
    const match = breakdownText.match(/TOTAL FS = (-?[\d.]+)/);
    return match ? Number(match[1]) : null;
}

/** Wires up every .history-save-btn on the page. Call this once, after the
 *  DOM is ready (all Save buttons must already exist in the document). */
export function initHistorySaveButtons() {
    document.querySelectorAll('.history-save-btn').forEach(btn => {
        const originalHtml = btn.innerHTML;
        btn.addEventListener('click', () => {
            const breakdownSel = btn.dataset.breakdown;
            const breakdownEl = breakdownSel ? document.querySelector(breakdownSel) : null;
            const breakdownText = breakdownEl ? breakdownEl.value : '';

            if (!breakdownText.trim()) {
                btn.innerHTML = 'Nothing to save yet';
                setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
                return;
            }

            const matchupEl = btn.dataset.matchup ? document.querySelector(btn.dataset.matchup) : null;
            const dateEl    = btn.dataset.date ? document.querySelector(btn.dataset.date) : null;

            const entry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                savedAt: new Date().toISOString(),
                sport: btn.dataset.sport || '',
                mode: btn.dataset.mode || '',
                playerName: historyParsePlayerName(breakdownText),
                date: dateEl ? dateEl.value : '',
                matchup: matchupEl ? matchupEl.textContent.trim() : '',
                total: historyParseTotal(breakdownText),
                breakdownText,
            };

            const list = historyLoad();
            list.push(entry);
            historySaveList(list);

            btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
            setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
        });
    });
}