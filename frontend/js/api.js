/**
 * api.js — Centralized API Client for Optima Frontend
 *
 * Backend base URL: http://localhost:8000
 * Auth: JWT Bearer token stored in localStorage under key "token"
 * All protected routes require: Authorization: Bearer <token>
 */

const API_BASE_URL = 'http://localhost:8000';

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken() {
    return localStorage.getItem('token');
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('optima_submissions_cache');
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

/**
 * Makes an authenticated request to the backend.
 * On 401, clears session and redirects to login.
 * @param {string} path - API path (e.g. '/api/auth/me')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function authFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        // Handle 401 — session expired or invalid token
        if (response.status === 401) {
            clearSession();
            window.location.href = 'login.html';
            return { ok: false, status: 401, data: null };
        }

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await response.json();
        }

        return { ok: response.ok, status: response.status, data };
    } catch (err) {
        // Network error
        return { ok: false, status: 0, data: null, error: err };
    }
}

/**
 * Makes an unauthenticated POST request (login/signup).
 */
async function publicPost(path, body) {
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await response.json();
        }

        return { ok: response.ok, status: response.status, data };
    } catch (err) {
        return { ok: false, status: 0, data: null, error: err };
    }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

const AuthAPI = {
    /**
     * POST /api/auth/signup
     * Body: { username, password, confirm_password }
     * Response: { access_token, token_type, user: { id, username } }
     */
    signup(username, password, confirmPassword) {
        return publicPost('/api/auth/signup', {
            username,
            password,
            confirm_password: confirmPassword,
        });
    },

    /**
     * POST /api/auth/login
     * Body: { username, password }
     * Response: { access_token, token_type, user: { id, username } }
     */
    login(username, password) {
        return publicPost('/api/auth/login', { username, password });
    },

    /**
     * POST /api/auth/logout
     * Response: { message }
     */
    logout() {
        return authFetch('/api/auth/logout', { method: 'POST' });
    },

    /**
     * GET /api/auth/me
     * Response: { id, username }
     */
    me() {
        return authFetch('/api/auth/me');
    },
};

// ─── Analyze API ──────────────────────────────────────────────────────────────

const AnalyzeAPI = {
    /**
     * POST /api/analyze/complexity
     * Body: { code, language, problem_title? }
     * Response: {
     *   submission: { id, user_id, problem_title, language, code,
     *                 time_complexity, space_complexity, created_at },
     *   analysis:   { time_complexity, space_complexity, explanation },
     *   patterns:   [{ name, confidence }]
     * }
     */
    complexity(code, language, problemTitle = null) {
        return authFetch('/api/analyze/complexity', {
            method: 'POST',
            body: JSON.stringify({ code, language, problem_title: problemTitle }),
        });
    },

    /**
     * POST /api/analyze/optimize
     * Body: { code, language, submission_id? }
     * Response: { optimized_code, new_time_complexity, new_space_complexity, rationale }
     */
    optimize(code, language, submissionId = null) {
        return authFetch('/api/analyze/optimize', {
            method: 'POST',
            body: JSON.stringify({ code, language, submission_id: submissionId }),
        });
    },
};

// ─── Execute API ──────────────────────────────────────────────────────────────

const ExecuteAPI = {
    /**
     * POST /api/execute
     * Body: { language, code, stdin? }
     * Response: { stdout, stderr, exit_code, time_ms }
     *
     * Backend language map (lowercase):
     *   Python     → "python"
     *   JavaScript → "javascript"
     *   C++        → "cpp"
     *   Java       → "java"
     *   Go         → "go"
     *   C          → "c"
     */
    run(language, code, stdin = '') {
        const langMap = {
            'Python': 'python',
            'JavaScript': 'javascript',
            'C++': 'cpp',
            'Java': 'java',
            'Go': 'go',
            'C': 'c',
        };
        const backendLang = langMap[language] || language.toLowerCase();
        return authFetch('/api/execute', {
            method: 'POST',
            body: JSON.stringify({ language: backendLang, code, stdin }),
        });
    },
};

// ─── Patterns API ─────────────────────────────────────────────────────────────

const PatternsAPI = {
    /**
     * GET /api/patterns/submission/{submission_id}
     * Response: { patterns: [...] }
     */
    forSubmission(submissionId) {
        return authFetch(`/api/patterns/submission/${submissionId}`);
    },

    /**
     * GET /api/patterns/learned
     * Response: { patterns: [string, ...] }
     */
    learned() {
        return authFetch('/api/patterns/learned');
    },

    /**
     * GET /api/patterns/weak-areas
     * Response: { weak_areas: [...] }
     */
    weakAreas() {
        return authFetch('/api/patterns/weak-areas');
    },
};

// ─── Learn API ────────────────────────────────────────────────────────────────

const LearnAPI = {
    /**
     * GET /api/learn/topics
     * Response: { topics: [{ topic, status }] }
     * Status values: "not_started" | "in_progress" | "mastered"
     */
    topics() {
        return authFetch('/api/learn/topics');
    },

    /**
     * POST /api/learn/progress
     * Body: { topic, status }
     * Response: updated progress record
     */
    updateProgress(topic, status) {
        return authFetch('/api/learn/progress', {
            method: 'POST',
            body: JSON.stringify({ topic, status }),
        });
    },
};

// ─── Debug API ────────────────────────────────────────────────────────────────

const DebugAPI = {
    /**
     * POST /api/debug
     * Body: { submission_id, error_message }
     * Response: debug session record
     */
    create(submissionId, errorMessage) {
        return authFetch('/api/debug', {
            method: 'POST',
            body: JSON.stringify({ submission_id: submissionId, error_message: errorMessage }),
        });
    },

    /**
     * GET /api/debug/submission/{submission_id}
     * Response: { debug_sessions: [...] }
     */
    forSubmission(submissionId) {
        return authFetch(`/api/debug/submission/${submissionId}`);
    },
};

// ─── A/B Test API ─────────────────────────────────────────────────────────────

const ABTestAPI = {
    /**
     * POST /api/abtest
     * Body: { code_a, code_b, language }
     * Response: AB test record
     */
    create(codeA, codeB, language) {
        const langMap = {
            'Python': 'python', 'JavaScript': 'javascript',
            'C++': 'cpp', 'Java': 'java',
        };
        const backendLang = langMap[language] || language.toLowerCase();
        return authFetch('/api/abtest', {
            method: 'POST',
            body: JSON.stringify({ code_a: codeA, code_b: codeB, language: backendLang }),
        });
    },

    /**
     * GET /api/abtest
     * Response: { ab_tests: [...] }
     */
    list() {
        return authFetch('/api/abtest');
    },
};

// ─── Questions API ────────────────────────────────────────────────────────────

const QuestionsAPI = {
    /**
     * POST /api/questions/generate
     * Body: { submission_id }
     * Response: { questions: [...] }
     */
    generate(submissionId) {
        return authFetch('/api/questions/generate', {
            method: 'POST',
            body: JSON.stringify({ submission_id: submissionId }),
        });
    },

    /**
     * GET /api/questions/submission/{submission_id}
     * Response: { questions: [...] }
     */
    forSubmission(submissionId) {
        return authFetch(`/api/questions/submission/${submissionId}`);
    },

    /**
     * POST /api/questions/answer
     * Body: { question_id, user_answer }
     * Response: { question, grading: { feedback, is_correct } }
     */
    submitAnswer(questionId, userAnswer) {
        return authFetch('/api/questions/answer', {
            method: 'POST',
            body: JSON.stringify({ question_id: questionId, user_answer: userAnswer }),
        });
    },
};

// ─── Submission cache helpers (localStorage) ──────────────────────────────────
// The backend stores submissions in DB on analyze/complexity calls.
// We keep a local cache so the dashboard can show them without needing
// a dedicated "list submissions" route (which doesn't exist yet).

const SubmissionCache = {
    KEY: 'optima_submissions_cache',

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY)) || [];
        } catch {
            return [];
        }
    },

    /**
     * Prepend a real submission from the backend response.
     * @param {object} submission - the submission object from /api/analyze/complexity
     */
    prepend(submission) {
        const all = this.getAll();
        all.unshift(submission);
        // Keep last 50 submissions
        localStorage.setItem(this.KEY, JSON.stringify(all.slice(0, 50)));
    },

    clear() {
        localStorage.removeItem(this.KEY);
    },
};

// ─── Error message helper ─────────────────────────────────────────────────────

function extractErrorMessage(data, fallback = 'An error occurred. Please try again.') {
    if (!data) return fallback;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
        return data.detail.map(e => e.msg || String(e)).join(', ');
    }
    if (typeof data.message === 'string') return data.message;
    return fallback;
}
