/**
 * dashboard.js — Dashboard Page Logic for Optima
 *
 * Uses centralized API client from api.js (loaded before this script).
 *
 * Real backend endpoints used:
 *   GET /api/auth/me          — Validates session & gets current user
 *   GET /api/patterns/learned — Distinct patterns the user has encountered
 *   GET /api/patterns/weak-areas — Complexities user struggles with
 *
 * Recent submissions are read from SubmissionCache (localStorage cache
 * populated by ide.js after each real POST /api/analyze/complexity call).
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ─── 1. AUTH CHECK ────────────────────────────────────────────────────────
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
        window.location.href = 'login.html';
        return;
    }

    // ─── 2. RENDER USER INFO FROM STORED SESSION ──────────────────────────────
    const username = storedUser.username || 'Developer';
    document.getElementById('user-display-name').textContent = username;
    document.getElementById('user-username').textContent = username;
    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();

    // ─── 3. SET LOADING STATES ────────────────────────────────────────────────
    document.getElementById('stat-submissions').textContent = '—';
    document.getElementById('stat-complexity').textContent = '—';
    document.getElementById('stat-patterns').textContent = '—';
    document.getElementById('stat-streak').textContent = '—';
    document.getElementById('submissions-tbody').innerHTML = `
        <tr><td colspan="5" style="text-align:center; color:var(--color-text-muted); padding: 2rem 0;">
            <span style="opacity:0.6">Loading submissions...</span>
        </td></tr>`;
    document.getElementById('weak-areas-tags-container').innerHTML = `
        <span style="color:var(--color-text-muted); font-size:0.85rem;">Loading...</span>`;
    document.getElementById('pattern-feed-container').innerHTML = `
        <p style="color:var(--color-text-muted); font-size:0.8rem;">Loading...</p>`;

    // ─── 4. VALIDATE SESSION WITH BACKEND ────────────────────────────────────
    // GET /api/auth/me  (authFetch handles 401 → redirect to login automatically)
    const meResult = await AuthAPI.me();
    if (!meResult.ok) {
        // authFetch already redirected on 401; handle other errors gracefully
        return;
    }

    // ─── 5. FETCH REAL DATA IN PARALLEL ──────────────────────────────────────
    const [patternsResult, weakAreasResult] = await Promise.all([
        PatternsAPI.learned(),
        PatternsAPI.weakAreas(),
    ]);

    // ─── 6. LOAD SUBMISSION CACHE ─────────────────────────────────────────────
    const submissions = SubmissionCache.getAll();

    // ─── 7. RENDER STATS ROW ──────────────────────────────────────────────────
    // Total submissions from cache
    document.getElementById('stat-submissions').textContent = submissions.length;
    const weekCount = submissions.filter(s => isWithinLastNDays(s.created_at, 7)).length;
    document.getElementById('stat-submissions-delta').querySelector('span').textContent =
        `+${weekCount} this week`;

    // Avg complexity derived from cached submissions
    let badCount = 0;
    submissions.forEach(sub => {
        const tc = sub.time_complexity || sub.analysis?.time_complexity || '';
        if (getComplexityClass(tc) === 'bad') badCount++;
    });
    const avgComplexity = submissions.length === 0
        ? 'N/A'
        : (badCount > submissions.length / 2 ? 'O(N²)' : 'O(N log N)');
    document.getElementById('stat-complexity').textContent = avgComplexity;

    // Patterns learned count from real backend
    let patternsCount = 0;
    if (patternsResult.ok && patternsResult.data) {
        patternsCount = (patternsResult.data.patterns || []).length;
    }
    document.getElementById('stat-patterns').textContent = patternsCount;

    // Streak: count distinct days with submissions
    const streak = computeStreak(submissions);
    document.getElementById('stat-streak').textContent = `${streak} Days`;

    // ─── 8. RENDER RECENT SUBMISSIONS TABLE ───────────────────────────────────
    renderSubmissionsTable(submissions);

    // ─── 9. RENDER WEAK AREAS ────────────────────────────────────────────────
    renderWeakAreas(weakAreasResult);

    // ─── 10. RENDER PATTERN FEED ──────────────────────────────────────────────
    renderPatternFeed(submissions);

    // ─── 11. LOGOUT ───────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await AuthAPI.logout();
            clearSession();
            window.location.href = 'login.html';
        });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ════════════════════════════════════════════════════════════════════════════

    function renderSubmissionsTable(subs) {
        const tbody = document.getElementById('submissions-tbody');
        tbody.innerHTML = '';

        if (!subs || subs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-text-muted); padding:2rem 0;">
                No submissions yet. Go to the <a href="ide.html" style="color:var(--color-accent);">IDE</a> and analyze your first algorithm!
            </td></tr>`;
            return;
        }

        subs.slice(0, 10).forEach(sub => {
            // Support both direct fields (from submission cache) and nested analysis
            const timeC = sub.time_complexity || sub.analysis?.time_complexity || 'N/A';
            const spaceC = sub.space_complexity || sub.analysis?.space_complexity || 'N/A';
            const lang = sub.language || 'Unknown';
            const title = sub.problem_title || sub.problem || 'Untitled';
            const dateStr = formatDate(sub.created_at || sub.submitted_at);

            const timeClass = getComplexityClass(timeC);
            const spaceClass = getComplexityClass(spaceC);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><a href="ide.html" class="problem-link">${escapeHtml(title)}</a></td>
                <td><span class="lang-badge">${escapeHtml(lang)}</span></td>
                <td><span class="complexity-badge ${timeClass}">${escapeHtml(timeC)}</span></td>
                <td><span class="complexity-badge ${spaceClass}">${escapeHtml(spaceC)}</span></td>
                <td style="color:var(--color-text-muted); font-size:0.85rem;">${escapeHtml(dateStr)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderWeakAreas(result) {
        const container = document.getElementById('weak-areas-tags-container');
        container.innerHTML = '';

        if (!result.ok || !result.data) {
            container.innerHTML = `<span style="color:var(--color-text-muted); font-size:0.85rem;">
                Could not load weak areas.
            </span>`;
            return;
        }

        const weakAreas = result.data.weak_areas || [];

        if (weakAreas.length === 0) {
            container.innerHTML = `<span style="color:var(--color-text-muted); font-size:0.85rem;">
                No weak areas identified yet. Keep analyzing!
            </span>`;
            return;
        }

        // weak_areas from backend: [{ time_complexity, count }]
        // Display as tags linking to IDE
        weakAreas.forEach(area => {
            const label = area.time_complexity || String(area);
            const a = document.createElement('a');
            a.href = 'ide.html';
            a.className = 'weak-area-tag';
            a.innerHTML = `
                <span>${escapeHtml(label)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
            `;
            container.appendChild(a);
        });
    }

    function renderPatternFeed(subs) {
        const container = document.getElementById('pattern-feed-container');
        container.innerHTML = '';

        if (!subs || subs.length === 0) {
            container.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.8rem;">
                No pattern history yet. Submit code in the IDE to see insights here.
            </p>`;
            return;
        }

        // Build feed from real submission data
        const feedItems = subs.slice(0, 8).map(sub => {
            const tc = sub.time_complexity || sub.analysis?.time_complexity || '';
            const title = sub.problem_title || sub.problem || 'Untitled';
            const isBad = getComplexityClass(tc) === 'bad';
            const patterns = sub.patterns || [];
            const patternNames = patterns.map(p => p.name || p).join(', ');

            let text, type;
            if (isBad) {
                text = `Suboptimal complexity ${tc} detected on '${title}'. Consider optimization.`;
                type = 'warning';
            } else if (patternNames) {
                text = `Pattern recognized on '${title}': ${patternNames}. Achieved ${tc}.`;
                type = 'success';
            } else {
                text = `Analysis complete on '${title}'. Complexity: ${tc || 'N/A'}.`;
                type = 'success';
            }

            return { text, type, time: formatDate(sub.created_at || sub.submitted_at) };
        });

        feedItems.forEach(item => {
            const dotClass = item.type === 'warning' ? 'amber' : 'emerald';
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item';
            feedItem.innerHTML = `
                <div class="feed-dot ${dotClass}"></div>
                <div class="feed-details">
                    <span class="feed-text">${escapeHtml(item.text)}</span>
                    <span class="feed-time">${escapeHtml(item.time)}</span>
                </div>
            `;
            container.appendChild(feedItem);
        });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // UTILITY HELPERS
    // ════════════════════════════════════════════════════════════════════════════

    function getComplexityClass(complexity) {
        if (!complexity) return 'good';
        const comp = complexity.replace(/\s+/g, '').toLowerCase();
        if (comp.includes('n^2') || comp.includes('2^n') || comp.includes('n^3') ||
            comp.includes('o(n*n)') || comp.includes('o(n²)')) return 'bad';
        if (comp.includes('nlogn') || comp.includes('n*logn') ||
            comp.includes('m+n') || comp.includes('n+m')) return 'warning';
        if (comp.includes('o(1)') || comp.includes('o(logn)') ||
            comp.includes('o(n)') || comp.includes('o(n+1)')) return 'good';
        return 'warning';
    }

    function formatDate(dateValue) {
        if (!dateValue) return 'Unknown';
        // Already a relative string (e.g. "Just now")
        if (typeof dateValue === 'string' && !dateValue.includes('T') && !dateValue.includes('-')) {
            return dateValue;
        }
        try {
            const d = new Date(dateValue);
            const now = new Date();
            const diffMs = now - d;
            const diffMin = Math.floor(diffMs / 60000);
            const diffHr = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHr / 24);

            if (diffMin < 1) return 'Just now';
            if (diffMin < 60) return `${diffMin} min ago`;
            if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
            if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
            return d.toLocaleDateString();
        } catch {
            return String(dateValue);
        }
    }

    function isWithinLastNDays(dateValue, n) {
        if (!dateValue) return false;
        try {
            const d = new Date(dateValue);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - n);
            return d >= cutoff;
        } catch {
            return false;
        }
    }

    function computeStreak(subs) {
        if (!subs || subs.length === 0) return 0;
        // Count distinct days (using cached created_at)
        const days = new Set();
        subs.forEach(s => {
            const v = s.created_at || s.submitted_at;
            if (v) {
                try {
                    days.add(new Date(v).toDateString());
                } catch { /* skip */ }
            }
        });
        return days.size;
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
