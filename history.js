// ============================================================
//  GameTime Platform — Saved History
//  history.js
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
    function copyBreakdown(textareaSelector) {
        const el = document.querySelector(textareaSelector);
        el.select();
        el.setSelectionRange(0, 99999);
        triggerToastBtn.click();
        navigator.clipboard.writeText(el.value);
    }
    function toggleSection(contentSelector) {
        const el = document.querySelector(contentSelector);
        const header = el.previousElementSibling;
        el.classList.toggle('open');
        if (header && header.classList.contains('card-header')) {
            header.classList.toggle('open');
        }
    }

    // --------------------------------------------------------
    //  HISTORY — storage + rendering
    // --------------------------------------------------------
    // Same storage key app.js writes to when a "Save" button is clicked on
    // any FS Calculator card. This page is read/manage-only — it never
    // writes new entries itself, only deletes/clears existing ones.
    const HISTORY_STORAGE_KEY = 'gt-history';

    const SPORT_LABELS = {
        basketball: 'Basketball',
        'mlb-hitter': 'MLB Hitter',
        'mlb-pitcher': 'MLB Pitcher',
        tennis: 'Tennis',
        mma: 'MMA',
        boxing: 'Boxing',
        'nfl-offensive': 'NFL Offensive',
    };

    function historyLoad() {
        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }
    function historySaveList(list) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(list));
    }

    const histFilterSport = document.querySelector('#hist-filter-sport');
    const histFilterName  = document.querySelector('#hist-filter-name');
    const histClearAllBtn = document.querySelector('#hist-clear-all-btn');
    const histResults     = document.querySelector('#hist-results');
    const histResultsBody = document.querySelector('#hist-results-body');
    const histEmptyNote   = document.querySelector('#hist-empty-note');
    const histCountNote   = document.querySelector('#hist-count-note');

    /** Human-friendly relative-ish timestamp for the Saved column. */
    function formatSavedAt(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
        });
    }

    function getFilteredEntries() {
        const all = historyLoad().slice().sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
        const sportFilter = histFilterSport.value;
        const nameFilter = histFilterName.value.trim().toLowerCase();
        return all.filter(e => {
            if (sportFilter && e.sport !== sportFilter) return false;
            if (nameFilter && !(e.playerName || '').toLowerCase().includes(nameFilter)) return false;
            return true;
        });
    }

    function deleteEntry(id) {
        const all = historyLoad().filter(e => e.id !== id);
        historySaveList(all);
        renderHistory();
    }

    function renderHistory() {
        const entries = getFilteredEntries();
        const totalCount = historyLoad().length;

        histResultsBody.innerHTML = '';

        if (totalCount === 0) {
            histEmptyNote.style.display = 'block';
            histEmptyNote.textContent = 'No saved calculations yet — use the "Save" button next to Copy on any FS Calculator card.';
            histResults.style.display = 'none';
            histCountNote.textContent = '';
            return;
        }

        if (entries.length === 0) {
            histEmptyNote.style.display = 'block';
            histEmptyNote.textContent = 'No saved calculations match this filter.';
            histResults.style.display = 'none';
            histCountNote.textContent = '';
            return;
        }

        histEmptyNote.style.display = 'none';
        histResults.style.display = 'block';
        histCountNote.textContent = `Showing ${entries.length} of ${totalCount} saved calculation(s).`;

        entries.forEach((e, i) => {
            const row = document.createElement('tr');
            row.className = 'hist-result-row';
            row.innerHTML =
                `<td><i class="fa-solid fa-chevron-right hist-chevron"></i></td>` +
                `<td>${formatSavedAt(e.savedAt)}</td>` +
                `<td>${SPORT_LABELS[e.sport] || e.sport || '—'}</td>` +
                `<td>${e.mode || '—'}</td>` +
                `<td>${e.playerName || '—'}</td>` +
                `<td>${e.date || '—'}</td>` +
                `<td>${e.matchup || '—'}</td>` +
                `<td>${e.total ?? '—'}</td>` +
                `<td><button type="button" class="btn btn-secondary hist-delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button></td>`;
            histResultsBody.appendChild(row);

            const detailRow = document.createElement('tr');
            detailRow.className = 'hist-breakdown-row';
            detailRow.style.display = 'none';
            const textareaId = `hist-breakdown-${i}`;
            detailRow.innerHTML =
                `<td colspan="9">` +
                `<textarea id="${textareaId}" readonly>${e.breakdownText || ''}</textarea>` +
                `<div class="btn-row" style="padding: 0 .9rem .75rem">` +
                `<button type="button" class="btn btn-secondary hist-copy-btn"><i class="fa-solid fa-copy"></i> Copy</button>` +
                `</div></td>`;
            histResultsBody.appendChild(detailRow);

            row.addEventListener('click', (evt) => {
                if (evt.target.closest('.hist-delete-btn')) return; // don't expand when deleting
                const isOpen = detailRow.style.display !== 'none';
                detailRow.style.display = isOpen ? 'none' : 'table-row';
                row.classList.toggle('hist-expanded', !isOpen);
            });
            row.querySelector('.hist-delete-btn').addEventListener('click', () => deleteEntry(e.id));
            detailRow.querySelector('.hist-copy-btn').addEventListener('click', () => copyBreakdown(`#${textareaId}`));
        });
    }

    histFilterSport.addEventListener('change', renderHistory);
    histFilterName.addEventListener('input', renderHistory);
    histClearAllBtn.addEventListener('click', () => {
        if (historyLoad().length === 0) return;
        if (!confirm('Delete ALL saved history? This cannot be undone.')) return;
        historySaveList([]);
        renderHistory();
    });

    document.querySelector('#head-history').addEventListener('click', () => toggleSection('#content-history'));

    renderHistory();

    // ── Dark / Light mode toggle is handled by the inline <script> in
    //    history.html (same pattern as every other page) ──

}; // end window.onload