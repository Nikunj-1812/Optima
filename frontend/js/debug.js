/**
 * debug.js — Debug Assistant Page Logic for Optima
 *
 * Backend endpoints used (via api.js):
 *   POST /api/debug                       — Body: { submission_id, error_message }
 *                                           → debug session record
 *   GET  /api/debug/submission/{id}       — { debug_sessions: [...] }
 *
 * Debug session record structure from backend:
 *   { id, submission_id, error_message, error_type, suggestion, created_at }
 */

document.addEventListener('DOMContentLoaded', () => {

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
    const debugSubInput     = document.getElementById('debug-submission-id');
    const debugErrorInput   = document.getElementById('debug-error-msg');
    const debugSubmitBtn    = document.getElementById('debug-submit-btn');
    const debugRunLabel     = document.getElementById('debug-running-label');
    const debugStatusEl     = document.getElementById('debug-create-status');
    const debugResultCard   = document.getElementById('debug-result-card');
    const debugResultBody   = document.getElementById('debug-result-body');

    const historySubInput   = document.getElementById('history-submission-id');
    const historyLoadBtn    = document.getElementById('history-load-btn');
    const historyContainer  = document.getElementById('debug-history-container');

    // ─── Create Debug Session ─────────────────────────────────────────────────
    debugSubmitBtn.addEventListener('click', async () => {
        const subId = parseInt(debugSubInput.value, 10);
        const errorMsg = debugErrorInput.value.trim();

        if (!subId || subId < 1) {
            showStatus(debugStatusEl, 'error', 'Please enter a valid submission ID.');
            return;
        }
        if (!errorMsg) {
            showStatus(debugStatusEl, 'error', 'Please paste the error message or traceback.');
            return;
        }

        hideStatus(debugStatusEl);
        debugSubmitBtn.disabled = true;
        debugRunLabel.style.display = 'inline';
        debugResultCard.style.display = 'none';

        // POST /api/debug  — Body: { submission_id, error_message }
        const { ok, data, status } = await DebugAPI.create(subId, errorMsg);

        debugSubmitBtn.disabled = false;
        debugRunLabel.style.display = 'none';

        if (ok && data) {
            renderDebugResult(data, debugResultBody);
            debugResultCard.style.display = 'flex';
        } else if (status !== 401) {
            const msg = status === 0
                ? 'Cannot reach server. Make sure backend is running on port 8000.'
                : extractErrorMessage(data, 'Debug analysis failed. Make sure the submission ID is valid.');
            showStatus(debugStatusEl, 'error', msg);
        }
    });

    // ─── Load Debug History ───────────────────────────────────────────────────
    historyLoadBtn.addEventListener('click', async () => {
        const subId = parseInt(historySubInput.value, 10);
        if (!subId || subId < 1) {
            historyContainer.innerHTML = `<div class="state-error">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Please enter a valid submission ID.
            </div>`;
            return;
        }

        historyContainer.innerHTML = `<div class="state-loading"><div class="spinner"></div><span>Loading history...</span></div>`;
        historyLoadBtn.disabled = true;

        // GET /api/debug/submission/{id}
        const { ok, data, status } = await DebugAPI.forSubmission(subId);

        historyLoadBtn.disabled = false;

        if (!ok) {
            if (status === 401) return;
            historyContainer.innerHTML = `<div class="state-error">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                ${escapeHtml(extractErrorMessage(data, 'Failed to load debug history.'))}
            </div>`;
            return;
        }

        const sessions = (data && data.debug_sessions) || [];
        if (sessions.length === 0) {
            historyContainer.innerHTML = `<div class="state-empty" style="padding:1.5rem;">
                <svg viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                <p class="state-empty-title">No debug sessions</p>
                <p>No debug sessions found for submission #${subId}.</p>
            </div>`;
            return;
        }

        historyContainer.innerHTML = '';
        sessions.slice().reverse().forEach(session => {
            const card = document.createElement('div');
            card.className = 'debug-session-card';
            card.style.marginBottom = '0.75rem';
            card.innerHTML = buildSessionHTML(session);
            historyContainer.appendChild(card);
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ════════════════════════════════════════════════════════════════════════

    function renderDebugResult(session, container) {
        container.innerHTML = buildSessionHTML(session);
    }

    /**
     * Builds the HTML for a single debug session.
     * Uses only fields actually returned by the backend.
     */
    function buildSessionHTML(session) {
        const errorType  = session.error_type  || null;
        const suggestion = session.suggestion  || session.fix || session.message || 'No suggestion available.';
        const errorMsg   = session.error_message || '';
        const dateStr    = formatDate(session.created_at);

        return `
            ${errorType ? `<div class="debug-error-type">${escapeHtml(errorType)}</div>` : ''}

            ${errorMsg ? `
                <div class="result-block">
                    <div class="result-block-label">Error Message</div>
                    <div class="result-block-value code-font">${escapeHtml(errorMsg)}</div>
                </div>` : ''}

            <div class="result-block">
                <div class="result-block-label">AI Suggestion</div>
                <div class="debug-suggestion">${escapeHtml(suggestion)}</div>
            </div>

            ${dateStr ? `<div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(dateStr)}</div>` : ''}
        `;
    }

    // ─── Status helpers ───────────────────────────────────────────────────────

    function showStatus(el, type, msg) {
        el.style.display = 'flex';
        el.className = type === 'error' ? 'state-error' : 'state-success';
        el.innerHTML = `
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ${escapeHtml(msg)}`;
    }

    function hideStatus(el) {
        el.style.display = 'none';
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
