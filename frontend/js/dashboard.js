document.addEventListener('DOMContentLoaded', () => {
    // 1. AUTH CHECK & RETRIEVE USER INFORMATION
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        // Not authenticated, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    let currentUser = {};
    try {
        currentUser = JSON.parse(userStr);
    } catch (e) {
        console.error('Failed to parse user session, redirecting to login.', e);
        window.location.href = 'login.html';
        return;
    }

    // Set user-related UI strings
    const username = currentUser.username || 'Developer';
    document.getElementById('user-display-name').textContent = username;
    document.getElementById('user-username').textContent = username;
    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();

    // 2. MOCK DATA INITIALIZATION FOR LOCALSTORAGE
    // This allows the dashboard to be fully dynamic, feedable by other modules without backend edits.
    const defaultSubmissions = [
        {
            problem: "Two Sum",
            language: "Python",
            time_complexity: "O(N^2)",
            space_complexity: "O(1)",
            submitted_at: "2 hours ago"
        },
        {
            problem: "Valid Parentheses",
            language: "JavaScript",
            time_complexity: "O(N)",
            space_complexity: "O(N)",
            submitted_at: "1 day ago"
        },
        {
            problem: "Merge Intervals",
            language: "C++",
            time_complexity: "O(N log N)",
            space_complexity: "O(N)",
            submitted_at: "3 days ago"
        },
        {
            problem: "Longest Substring Without Repeating",
            language: "Python",
            time_complexity: "O(N)",
            space_complexity: "O(min(M, N))",
            submitted_at: "4 days ago"
        },
        {
            problem: "Fibonacci Number (Recursive)",
            language: "Java",
            time_complexity: "O(2^N)",
            space_complexity: "O(N)",
            submitted_at: "1 week ago"
        }
    ];

    const defaultWeakAreas = [
        { topic: "Dynamic Programming", slug: "dynamic-programming" },
        { topic: "Sliding Window", slug: "sliding-window" },
        { topic: "Recursion & Backtracking", slug: "recursion-backtracking" }
    ];

    const defaultPatternFeed = [
        {
            text: "Recursion detected on 'Fibonacci' with exponential O(2^N) complexity. Consider Dynamic Programming.",
            type: "warning",
            time: "2 hours ago"
        },
        {
            text: "Sliding Window pattern recognized on 'Longest Substring'. Achieved optimal O(N) time complexity.",
            type: "success",
            time: "1 day ago"
        },
        {
            text: "Brute-force nested loops detected on 'Two Sum'. Optimized O(N) Two-Pointer/HashMap pattern recommended.",
            type: "warning",
            time: "3 days ago"
        }
    ];

    // Seed localStorage if not present
    if (!localStorage.getItem('optima_submissions')) {
        localStorage.setItem('optima_submissions', JSON.stringify(defaultSubmissions));
    }
    if (!localStorage.getItem('optima_weak_areas')) {
        localStorage.setItem('optima_weak_areas', JSON.stringify(defaultWeakAreas));
    }
    if (!localStorage.getItem('optima_pattern_feed')) {
        localStorage.setItem('optima_pattern_feed', JSON.stringify(defaultPatternFeed));
    }
    if (!localStorage.getItem('optima_streak')) {
        localStorage.setItem('optima_streak', '5');
    }
    if (!localStorage.getItem('optima_patterns_count')) {
        localStorage.setItem('optima_patterns_count', '6');
    }

    // 3. RENDER METRICS ROW
    const submissions = JSON.parse(localStorage.getItem('optima_submissions'));
    const weakAreas = JSON.parse(localStorage.getItem('optima_weak_areas'));
    const patternFeed = JSON.parse(localStorage.getItem('optima_pattern_feed'));
    const streak = localStorage.getItem('optima_streak') || '0';
    const patternsCount = localStorage.getItem('optima_patterns_count') || '0';

    // Total submissions metric card
    document.getElementById('stat-submissions').textContent = submissions.length;
    document.getElementById('stat-submissions-delta').querySelector('span').textContent = `+${Math.min(submissions.length, 3)} this week`;

    // Average Complexity metric card (e.g. O(N) or O(N log N))
    // We can compute a mock or simple average representation based on submissions
    let badCount = 0;
    submissions.forEach(sub => {
        const cClass = getComplexityClass(sub.time_complexity);
        if (cClass === 'bad') badCount++;
    });
    const avgComplexity = badCount > submissions.length / 2 ? 'O(N²)' : 'O(N log N)';
    document.getElementById('stat-complexity').textContent = avgComplexity;

    // Patterns learned metric card
    document.getElementById('stat-patterns').textContent = patternsCount;

    // Streak card
    document.getElementById('stat-streak').textContent = `${streak} Days`;

    // 4. RENDER RECENT SUBMISSIONS TABLE
    const tbody = document.getElementById('submissions-tbody');
    tbody.innerHTML = ''; // Clear initial placeholder

    if (submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">No submissions found. Solve some problems in the IDE!</td></tr>`;
    } else {
        submissions.forEach(sub => {
            const timeClass = getComplexityClass(sub.time_complexity);
            const spaceClass = getComplexityClass(sub.space_complexity);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><a href="#" class="problem-link">${escapeHtml(sub.problem)}</a></td>
                <td><span class="lang-badge">${escapeHtml(sub.language)}</span></td>
                <td><span class="complexity-badge ${timeClass}">${escapeHtml(sub.time_complexity)}</span></td>
                <td><span class="complexity-badge ${spaceClass}">${escapeHtml(sub.space_complexity)}</span></td>
                <td style="color: var(--color-text-muted); font-size: 0.85rem;">${escapeHtml(sub.submitted_at)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 5. RENDER WEAK AREAS TAGS
    const weakAreasContainer = document.getElementById('weak-areas-tags-container');
    weakAreasContainer.innerHTML = '';

    if (weakAreas.length === 0) {
        weakAreasContainer.innerHTML = `<span style="color: var(--color-text-muted); font-size: 0.85rem;">No current weak areas! Nice work.</span>`;
    } else {
        weakAreas.forEach(area => {
            const a = document.createElement('a');
            a.href = `learn.html?topic=${encodeURIComponent(area.slug)}`;
            a.className = 'weak-area-tag';
            a.innerHTML = `
                <span>${escapeHtml(area.topic)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
            `;
            weakAreasContainer.appendChild(a);
        });
    }

    // 6. RENDER PATTERN RECOGNIZER LIVE FEED
    const feedContainer = document.getElementById('pattern-feed-container');
    feedContainer.innerHTML = '';

    if (patternFeed.length === 0) {
        feedContainer.innerHTML = `<p style="color: var(--color-text-muted); font-size: 0.8rem;">No recent pattern recognizer feed logs.</p>`;
    } else {
        patternFeed.forEach(item => {
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
            feedContainer.appendChild(feedItem);
        });
    }

    // 7. LOGOUT FUNCTIONALITY
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // --- HELPER FUNCTIONS ---
    // Classify time/space complexity to trigger color coding
    function getComplexityClass(complexity) {
        if (!complexity) return 'good';
        const comp = complexity.replace(/\s+/g, '').toLowerCase();

        // Poor complexities (amber/coral/red)
        if (
            comp.includes('n^2') || 
            comp.includes('2^n') || 
            comp.includes('n^3') || 
            comp.includes('o(n*n)') || 
            comp.includes('o(n²)')
        ) {
            return 'bad';
        }

        // Suboptimal but common complexities (amber/warning)
        if (
            comp.includes('nlogn') || 
            comp.includes('n*logn') || 
            comp.includes('m+n') || 
            comp.includes('n+m')
        ) {
            return 'warning';
        }

        // Optimal complexities (green/good)
        if (
            comp.includes('o(1)') || 
            comp.includes('o(logn)') || 
            comp.includes('o(n)') || 
            comp.includes('o(n+1)')
        ) {
            return 'good';
        }

        return 'warning'; // default fallback for unspecified or mixed complexities
    }

    // Escape HTML to prevent XSS issues when printing variables
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
