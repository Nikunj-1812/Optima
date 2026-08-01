/**
 * pattern.js — Patterns Page Logic for Optima
 *
 * Backend endpoints used (via api.js):
 *   GET /api/patterns/learned            → { patterns: [string, ...] }
 *   GET /api/patterns/weak-areas         → { weak_areas: [{ time_complexity, count }, ...] }
 *   GET /api/patterns/submission/{id}    → { patterns: [{ name, confidence }, ...] }
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

    // ─── Fetch learned + weak areas in parallel ───────────────────────────────
    const [learnedResult, weakAreasResult] = await Promise.all([
        PatternsAPI.learned(),
        PatternsAPI.weakAreas(),
    ]);

    renderLearned(learnedResult);
    renderWeakAreas(weakAreasResult);

    // ─── Submission lookup ────────────────────────────────────────────────────
    document.getElementById('lookup-btn').addEventListener('click', async () => {
        const input = document.getElementById('submission-id-input');
        const resultEl = document.getElementById('submission-patterns-result');
        const id = parseInt(input.value, 10);

        if (!id || id < 1) {
            resultEl.innerHTML = `<div class="state-error">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Please enter a valid submission ID.
            </div>`;
            return;
        }

        resultEl.innerHTML = `<div class="state-loading"><div class="spinner"></div><span>Looking up patterns...</span></div>`;

        // GET /api/patterns/submission/{id}
        const { ok, data, status } = await PatternsAPI.forSubmission(id);

        if (!ok) {
            if (status === 401) return;
            resultEl.innerHTML = `<div class="state-error">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                ${escapeHtml(extractErrorMessage(data, 'Failed to fetch patterns for this submission.'))}
            </div>`;
            return;
        }

        const patterns = (data && data.patterns) || [];
        if (patterns.length === 0) {
            resultEl.innerHTML = `<div class="state-empty" style="padding:1.5rem;">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p class="state-empty-title">No patterns found</p>
                <p>Submission #${id} has no associated patterns, or the ID doesn't exist.</p>
            </div>`;
            return;
        }

        const tagsHtml = patterns.map(p => {
            const name = p.name || p;
            const conf = p.confidence != null ? ` (${Math.round(p.confidence * 100)}%)` : '';
            return `<span class="pattern-tag">${escapeHtml(name)}${escapeHtml(conf)}</span>`;
        }).join('');

        resultEl.innerHTML = `
            <div class="result-block">
                <div class="result-block-label">Patterns in Submission #${id}</div>
                <div class="pattern-tags-grid" style="margin-top:0.5rem;">${tagsHtml}</div>
            </div>`;
    });

    // ════════════════════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ════════════════════════════════════════════════════════════════════════

    function renderLearned(result) {
        const container = document.getElementById('learned-container');

        if (!result.ok) {
            if (result.status === 401) return;
            container.innerHTML = `<div class="state-error">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                ${escapeHtml(extractErrorMessage(result.data, 'Failed to load patterns.'))}
            </div>`;
            return;
        }

        // Backend returns { patterns: [string, ...] }
        const patterns = (result.data && result.data.patterns) || [];

        if (patterns.length === 0) {
            container.innerHTML = `<div class="state-empty" style="padding:1.5rem;">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <p class="state-empty-title">No patterns yet</p>
                <p>Submit and analyze code in the IDE to start building your pattern profile.</p>
            </div>`;
            return;
        }

        const tagsHtml = patterns.map(p => {
            const name = typeof p === 'string' ? p : (p.name || JSON.stringify(p));
            return `<span class="pattern-tag">${escapeHtml(name)}</span>`;
        }).join('');

        container.innerHTML = `
            <div class="pattern-tags-grid">${tagsHtml}</div>
            <p style="margin-top:0.75rem; font-size:0.78rem; color:var(--color-text-muted);">
                ${patterns.length} distinct pattern${patterns.length !== 1 ? 's' : ''} identified across your submissions.
            </p>
        `;
    }

    function renderWeakAreas(result) {
        const container = document.getElementById('weak-areas-container');

        if (!result.ok) {
            if (result.status === 401) return;
            container.innerHTML = `<div class="state-error">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                ${escapeHtml(extractErrorMessage(result.data, 'Failed to load weak areas.'))}
            </div>`;
            return;
        }

        // Backend returns { weak_areas: [{ time_complexity, count }, ...] }
        const weakAreas = (result.data && result.data.weak_areas) || [];

        if (weakAreas.length === 0) {
            container.innerHTML = `<div class="state-empty" style="padding:1.5rem;">
                <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                <p class="state-empty-title">No weak areas identified</p>
                <p>Keep analyzing — weak areas appear when you frequently produce suboptimal complexity.</p>
            </div>`;
            return;
        }

        const tags = weakAreas.map(area => {
            const label = area.time_complexity || String(area);
            const count = area.count ? ` ×${area.count}` : '';
            return `<a href="ide.html" class="weak-area-tag" title="Improve ${escapeHtml(label)} performance">
                ${escapeHtml(label)}${escapeHtml(count)}
                <svg viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </a>`;
        }).join('');

        container.innerHTML = `
            <div class="weak-areas-tags">${tags}</div>
            <p style="margin-top:0.75rem; font-size:0.78rem; color:var(--color-text-muted);">
                Click any complexity to open the IDE and practice optimizing.
            </p>
        `;
    }

    // ─── escapeHtml ───────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
});
