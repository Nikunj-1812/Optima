/**
 * abtest.js — A/B Testing Page Logic for Optima
 *
 * Backend endpoints used (via api.js):
 *   POST /api/abtest  — Body: { code_a, code_b, language } → AB test record
 *   GET  /api/abtest  — { ab_tests: [...] }
 *
 * Response structure from POST /api/abtest (from backend):
 *   { id, user_id, code_a, code_b, language, winner, analysis_a, analysis_b,
 *     comparison, created_at }
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ─── Auth check ──────────────────────────────────────────────────────────
    const storedUser = getStoredUser();
    if (!getToken() || !storedUser) {
        window.location.href = 'login.html';
        return;
    }

    const username = storedUser.username || 'Developer';
    document.getElementById('user-username').textContent = username;
    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();

    // ─── Logout ──────────────────────────────────────────────────────────────
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await AuthAPI.logout();
        clearSession();
        window.location.href = 'login.html';
    });

    // ─── Elements ─────────────────────────────────────────────────────────────
    const codeAEl       = document.getElementById('code-a');
    const codeBEl       = document.getElementById('code-b');
    const langEl        = document.getElementById('ab-language');
    const runBtn        = document.getElementById('run-abtest-btn');
    const runLabel      = document.getElementById('ab-running-label');
    const statusEl      = document.getElementById('ab-create-status');
    const resultCard    = document.getElementById('ab-result-card');
    const resultBody    = document.getElementById('ab-result-body');
    const historyEl     = document.getElementById('ab-history-container');

    // ─── Load history on page open ───────────────────────────────────────────
    await loadHistory();

    // ─── Run A/B Test ─────────────────────────────────────────────────────────
    runBtn.addEventListener('click', async () => {
        const codeA = codeAEl.value.trim();
        const codeB = codeBEl.value.trim();
        const language = langEl.value;

        if (!codeA || !codeB) {
            showStatus('error', 'Please enter code for both Version A and Version B.');
            return;
        }

        hideStatus();
        runBtn.disabled = true;
        runLabel.style.display = 'inline';
        resultCard.style.display = 'none';

        // POST /api/abtest  (ABTestAPI handles language mapping python/cpp/etc.)
        const { ok, data, status } = await ABTestAPI.create(codeA, codeB, language);

        runBtn.disabled = false;
        runLabel.style.display = 'none';

        if (ok && data) {
            renderResult(data, resultBody);
            resultCard.style.display = 'flex';
            // Refresh history to include new test
            await loadHistory();
        } else if (status !== 401) {
            const msg = status === 0
                ? 'Cannot reach server. Make sure backend is running on port 8000.'
                : extractErrorMessage(data, 'A/B test failed. Please try again.');
            showStatus('error', msg);
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // RENDER FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Renders a single AB test result into the given container.
     * Fields depend on what the backend actually returns.
     */
    function renderResult(test, container) {
        const winner = (test.winner || '').toLowerCase();
        const winnerClass = winner === 'a' ? 'winner-a' : winner === 'b' ? 'winner-b' : 'winner-tie';
        const winnerLabel = winner === 'a' ? '🏆 Version A Wins' : winner === 'b' ? '🏆 Version B Wins' : '🤝 Tie';

        const analysisA = test.analysis_a || {};
        const analysisB = test.analysis_b || {};
        const comparison = test.comparison || 'No comparison detail available.';
        const lang = test.language || '';
        const dateStr = formatDate(test.created_at);

        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
                <span class="verdict-badge ${winnerClass}">${escapeHtml(winnerLabel)}</span>
                <span style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    ${lang ? `<span class="info-chip">${escapeHtml(lang)}</span>` : ''}
                    <span class="info-chip">${escapeHtml(dateStr)}</span>
                </span>
            </div>

            <div class="code-panel-grid" style="margin-top:1rem;">
                <div class="result-block">
                    <div class="result-block-label" style="color:var(--color-success);">Version A — Analysis</div>
                    <div class="result-block-value">
                        ${analysisA.time_complexity ? `<b>Time:</b> ${escapeHtml(analysisA.time_complexity)}<br>` : ''}
                        ${analysisA.space_complexity ? `<b>Space:</b> ${escapeHtml(analysisA.space_complexity)}<br>` : ''}
                        ${analysisA.explanation ? `<br>${escapeHtml(analysisA.explanation)}` : ''}
                        ${!analysisA.time_complexity && !analysisA.explanation ? '<em style="opacity:0.6">No analysis data</em>' : ''}
                    </div>
                </div>
                <div class="result-block">
                    <div class="result-block-label" style="color:var(--color-accent);">Version B — Analysis</div>
                    <div class="result-block-value">
                        ${analysisB.time_complexity ? `<b>Time:</b> ${escapeHtml(analysisB.time_complexity)}<br>` : ''}
                        ${analysisB.space_complexity ? `<b>Space:</b> ${escapeHtml(analysisB.space_complexity)}<br>` : ''}
                        ${analysisB.explanation ? `<br>${escapeHtml(analysisB.explanation)}` : ''}
                        ${!analysisB.time_complexity && !analysisB.explanation ? '<em style="opacity:0.6">No analysis data</em>' : ''}
                    </div>
                </div>
            </div>

            <div class="result-block" style="margin-top:1rem;">
                <div class="result-block-label">Comparison & Recommendation</div>
                <div class="result-block-value">${escapeHtml(comparison)}</div>
            </div>
        `;
    }

    // ─── Load and render test history ─────────────────────────────────────────
    async function loadHistory() {
        historyEl.innerHTML = `<div class="state-loading"><div class="spinner"></div><span>Loading history...</span></div>`;

        // GET /api/abtest → { ab_tests: [...] }
        const { ok, data, status } = await ABTestAPI.list();

        if (!ok) {
            if (status === 401) return;
            historyEl.innerHTML = `
                <div class="state-error">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    ${escapeHtml(extractErrorMessage(data, 'Failed to load history.'))}
                </div>`;
            return;
        }

        const tests = (data && data.ab_tests) || [];
        if (tests.length === 0) {
            historyEl.innerHTML = `
                <div class="state-empty">
                    <svg viewBox="0 0 24 24"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/></svg>
                    <p class="state-empty-title">No tests yet</p>
                    <p>Create your first A/B test using the form on the left.</p>
                </div>`;
            return;
        }

        const list = document.createElement('div');
        list.className = 'abtest-history-list';

        tests.slice().reverse().forEach(test => {
            const winner = (test.winner || '').toLowerCase();
            const winnerLabel = winner === 'a' ? '🏆 A Wins' : winner === 'b' ? '🏆 B Wins' : '🤝 Tie';
            const winnerClass = winner === 'a' ? 'winner-a' : winner === 'b' ? 'winner-b' : 'winner-tie';

            const item = document.createElement('div');
            item.className = 'abtest-history-item';
            item.innerHTML = `
                <div class="abtest-meta-row">
                    <span class="verdict-badge ${winnerClass}" style="font-size:0.75rem; padding:0.2rem 0.65rem;">${escapeHtml(winnerLabel)}</span>
                    <span style="display:flex; gap:0.4rem;">
                        ${test.language ? `<span class="info-chip" style="font-size:0.7rem; padding:0.15rem 0.55rem;">${escapeHtml(test.language)}</span>` : ''}
                        <span style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(formatDate(test.created_at))}</span>
                    </span>
                </div>
                ${test.comparison ? `<div style="font-size:0.82rem; color:var(--color-text); line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(test.comparison)}</div>` : ''}
            `;
            list.appendChild(item);
        });

        historyEl.innerHTML = '';
        historyEl.appendChild(list);
    }

    // ─── Status helpers ───────────────────────────────────────────────────────

    function showStatus(type, msg) {
        statusEl.style.display = 'flex';
        statusEl.className = type === 'error' ? 'state-error' : 'state-success';
        statusEl.innerHTML = `
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ${escapeHtml(msg)}
        `;
    }

    function hideStatus() {
        statusEl.style.display = 'none';
    }

    // ─── Date formatter ───────────────────────────────────────────────────────
    function formatDate(val) {
        if (!val) return '';
        try {
            const d = new Date(val);
            const diff = Date.now() - d;
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return d.toLocaleDateString();
        } catch { return String(val); }
    }

    // ─── escapeHtml ───────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
});
