/**
 * learn.js — Learning Page Logic for Optima
 *
 * Backend endpoints used (via api.js):
 *   GET  /api/learn/topics   — { topics: [{ topic, status }] }
 *   POST /api/learn/progress — Body: { topic, status } → updated record
 *
 * Valid status values: "not_started" | "in_progress" | "mastered"
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

    // ─── Load topics ─────────────────────────────────────────────────────────
    await loadTopics();

    // ════════════════════════════════════════════════════════════════════════
    // LOAD & RENDER TOPICS
    // ════════════════════════════════════════════════════════════════════════

    async function loadTopics() {
        const container = document.getElementById('topics-container');
        container.innerHTML = `<div class="state-loading"><div class="spinner"></div><span>Loading topics...</span></div>`;

        // GET /api/learn/topics
        const { ok, data, status } = await LearnAPI.topics();

        if (!ok) {
            if (status === 401) return; // authFetch already redirected
            container.innerHTML = `
                <div class="state-error">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    ${escapeHtml(extractErrorMessage(data, 'Failed to load topics. Make sure the backend is running.'))}
                </div>`;
            return;
        }

        const topics = (data && data.topics) || [];
        if (topics.length === 0) {
            container.innerHTML = `
                <div class="state-empty">
                    <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    <p class="state-empty-title">No topics found</p>
                    <p>The backend returned no topics.</p>
                </div>`;
            return;
        }

        renderTopics(topics);
        renderProgressSummary(topics);
    }

    function renderProgressSummary(topics) {
        const mastered = topics.filter(t => t.status === 'mastered').length;
        const inProgress = topics.filter(t => t.status === 'in_progress').length;
        const notStarted = topics.filter(t => t.status === 'not_started').length;

        document.getElementById('stat-mastered').textContent = mastered;
        document.getElementById('stat-in-progress').textContent = inProgress;
        document.getElementById('stat-not-started').textContent = notStarted;
        document.getElementById('progress-summary').style.display = 'block';
    }

    function renderTopics(topics) {
        const container = document.getElementById('topics-container');
        const grid = document.createElement('div');
        grid.className = 'topics-grid';

        topics.forEach(({ topic, status }) => {
            const card = document.createElement('div');
            const statusClass = status.replace('_', '-');
            card.className = `topic-card ${statusClass}`;
            card.dataset.topic = topic;

            const statusLabel = {
                'mastered': '✓ Mastered',
                'in_progress': '↗ In Progress',
                'not_started': '○ Not Started',
            }[status] || status;

            card.innerHTML = `
                <div class="topic-name">${escapeHtml(topic)}</div>
                <div class="topic-status-badge ${statusClass}" id="badge-${safeid(topic)}">${escapeHtml(statusLabel)}</div>
                <div class="fp-field-group">
                    <select class="topic-progress-select" data-topic="${escapeHtml(topic)}" aria-label="Update status for ${escapeHtml(topic)}">
                        <option value="not_started" ${status === 'not_started' ? 'selected' : ''}>Not Started</option>
                        <option value="in_progress"  ${status === 'in_progress'  ? 'selected' : ''}>In Progress</option>
                        <option value="mastered"     ${status === 'mastered'     ? 'selected' : ''}>Mastered</option>
                    </select>
                </div>
                <div class="topic-feedback" id="feedback-${safeid(topic)}" style="font-size:0.75rem; min-height:1.1rem;"></div>
            `;

            // Listen for select change
            const sel = card.querySelector('.topic-progress-select');
            sel.addEventListener('change', () => handleProgressUpdate(topic, sel.value, card));

            grid.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(grid);
    }

    // ─── Update progress via backend ─────────────────────────────────────────
    async function handleProgressUpdate(topic, newStatus, card) {
        const sel = card.querySelector('.topic-progress-select');
        const feedbackEl = card.querySelector(`#feedback-${safeid(topic)}`);
        const badgeEl = card.querySelector(`#badge-${safeid(topic)}`);

        sel.disabled = true;
        feedbackEl.textContent = 'Saving...';
        feedbackEl.style.color = 'var(--color-text-muted)';

        // POST /api/learn/progress  — Body: { topic, status }
        const { ok, data } = await LearnAPI.updateProgress(topic, newStatus);

        sel.disabled = false;

        if (ok) {
            // Update card visual
            const statusClass = newStatus.replace('_', '-');
            card.className = `topic-card ${statusClass}`;

            const labelMap = {
                'mastered': '✓ Mastered',
                'in_progress': '↗ In Progress',
                'not_started': '○ Not Started',
            };
            badgeEl.className = `topic-status-badge ${statusClass}`;
            badgeEl.textContent = labelMap[newStatus] || newStatus;

            feedbackEl.textContent = 'Saved ✓';
            feedbackEl.style.color = 'var(--color-success)';
            setTimeout(() => { feedbackEl.textContent = ''; }, 2000);

            // Refresh summary
            const allTopics = gatherCurrentTopics();
            renderProgressSummary(allTopics);
        } else {
            feedbackEl.textContent = extractErrorMessage(data, 'Failed to save.');
            feedbackEl.style.color = 'var(--color-warning)';
            // Revert select to old value
            const topicStatus = card.className.includes('mastered') ? 'mastered'
                : card.className.includes('in-progress') ? 'in_progress' : 'not_started';
            sel.value = topicStatus;
        }
    }

    // ─── Collect current state of all topic cards for summary refresh ─────────
    function gatherCurrentTopics() {
        const cards = document.querySelectorAll('.topic-card[data-topic]');
        return Array.from(cards).map(card => {
            const sel = card.querySelector('.topic-progress-select');
            return { topic: card.dataset.topic, status: sel ? sel.value : 'not_started' };
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function safeid(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
});
