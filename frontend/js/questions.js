/**
 * questions.js — Interview Prep Page Logic for Optima
 *
 * Backend endpoints used (via api.js):
 *   POST /api/questions/generate         — Body: { submission_id } → { questions: [...] }
 *   GET  /api/questions/submission/{id}  — { questions: [...] }
 *   POST /api/questions/answer           — Body: { question_id, user_answer }
 *                                          → { question, grading: { feedback, is_correct } }
 *
 * Question object structure from backend:
 *   { id, submission_id, question_text, created_at }
 *
 * Grading object structure from backend:
 *   { feedback: string, is_correct: bool }
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
    const generateBtn       = document.getElementById('generate-btn');
    const genSubInput       = document.getElementById('gen-submission-id');
    const genStatus         = document.getElementById('gen-status');
    const listContainer     = document.getElementById('questions-list-container');

    const loadBtn           = document.getElementById('load-btn');
    const loadSubInput      = document.getElementById('load-submission-id');
    const loadStatus        = document.getElementById('load-status');

    // ─── Generate Questions ───────────────────────────────────────────────────
    generateBtn.addEventListener('click', async () => {
        const subId = parseInt(genSubInput.value, 10);
        if (!subId || subId < 1) {
            showStatus(genStatus, 'error', 'Please enter a valid submission ID.');
            return;
        }

        hideStatus(genStatus);
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        listContainer.innerHTML = `<div class="feature-card"><div class="state-loading"><div class="spinner"></div><span>Generating questions...</span></div></div>`;

        // POST /api/questions/generate  — Body: { submission_id }
        const { ok, data, status } = await QuestionsAPI.generate(subId);

        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate';

        if (ok && data) {
            const questions = data.questions || [];
            if (questions.length === 0) {
                listContainer.innerHTML = `<div class="feature-card"><div class="state-empty">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                    <p class="state-empty-title">No questions generated</p>
                    <p>The backend returned no questions for submission #${subId}.</p>
                </div></div>`;
                return;
            }
            renderQuestions(questions, subId);
        } else if (status !== 401) {
            const msg = status === 0
                ? 'Cannot connect to backend. Make sure server is running on port 8000.'
                : extractErrorMessage(data, 'Failed to generate questions. Make sure the submission ID exists.');
            showStatus(genStatus, 'error', msg);
            listContainer.innerHTML = '';
        }
    });

    // ─── Load Existing Questions ──────────────────────────────────────────────
    loadBtn.addEventListener('click', async () => {
        const subId = parseInt(loadSubInput.value, 10);
        if (!subId || subId < 1) {
            showStatus(loadStatus, 'error', 'Please enter a valid submission ID.');
            return;
        }

        hideStatus(loadStatus);
        loadBtn.disabled = true;
        loadBtn.textContent = 'Loading...';
        listContainer.innerHTML = `<div class="feature-card"><div class="state-loading"><div class="spinner"></div><span>Loading questions...</span></div></div>`;

        // GET /api/questions/submission/{id}
        const { ok, data, status } = await QuestionsAPI.forSubmission(subId);

        loadBtn.disabled = false;
        loadBtn.textContent = 'Load Questions';

        if (ok && data) {
            const questions = data.questions || [];
            if (questions.length === 0) {
                listContainer.innerHTML = `<div class="feature-card"><div class="state-empty">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                    <p class="state-empty-title">No questions found</p>
                    <p>No questions exist for submission #${subId}. Use "Generate" to create some.</p>
                </div></div>`;
                return;
            }
            renderQuestions(questions, subId);
        } else if (status !== 401) {
            const msg = extractErrorMessage(data, 'Failed to load questions.');
            showStatus(loadStatus, 'error', msg);
            listContainer.innerHTML = '';
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // RENDER QUESTIONS
    // ════════════════════════════════════════════════════════════════════════

    function renderQuestions(questions, subId) {
        listContainer.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'feature-card';
        header.innerHTML = `
            <div class="feature-card-title">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/></svg>
                ${questions.length} Question${questions.length !== 1 ? 's' : ''} — Submission #${subId}
            </div>`;
        listContainer.appendChild(header);

        questions.forEach((q, idx) => {
            const card = buildQuestionCard(q, idx + 1);
            listContainer.appendChild(card);
        });
    }

    /**
     * Builds a question card with an answer textarea and submit button.
     * On submit, calls POST /api/questions/answer and renders grading feedback.
     */
    function buildQuestionCard(question, num) {
        const card = document.createElement('div');
        card.className = 'feature-card';

        // question_text is the backend field name
        const questionText = question.question_text || question.text || question.question || 'No question text.';

        card.innerHTML = `
            <div class="question-card" id="q-card-${question.id}">
                <div class="question-number">Question ${num}</div>
                <div class="question-text">${escapeHtml(questionText)}</div>
                <div class="fp-field-group">
                    <label class="fp-label" for="answer-${question.id}">Your Answer</label>
                    <textarea id="answer-${question.id}" class="answer-textarea" placeholder="Type your answer here..."></textarea>
                </div>
                <div class="fp-actions-row">
                    <button class="btn-feature-success submit-answer-btn" data-qid="${question.id}">
                        Submit Answer
                    </button>
                    <span class="answer-saving-label" style="display:none; font-size:0.8rem; color:var(--color-text-muted);">Grading...</span>
                </div>
                <div class="answer-feedback" id="feedback-${question.id}" style="display:none;"></div>
            </div>
        `;

        // Bind submit button
        const btn = card.querySelector('.submit-answer-btn');
        btn.addEventListener('click', () => submitAnswer(question.id, card));

        return card;
    }

    async function submitAnswer(questionId, card) {
        const textarea = card.querySelector(`#answer-${questionId}`);
        const btn = card.querySelector('.submit-answer-btn');
        const savingLabel = card.querySelector('.answer-saving-label');
        const feedbackEl = card.querySelector(`#feedback-${questionId}`);
        const qCard = card.querySelector(`#q-card-${questionId}`);

        const userAnswer = textarea.value.trim();
        if (!userAnswer) {
            feedbackEl.style.display = 'block';
            feedbackEl.innerHTML = `<div class="state-error" style="margin:0;">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Please write an answer before submitting.
            </div>`;
            return;
        }

        btn.disabled = true;
        savingLabel.style.display = 'inline';
        feedbackEl.style.display = 'none';

        // POST /api/questions/answer  — Body: { question_id, user_answer }
        const { ok, data, status } = await QuestionsAPI.submitAnswer(questionId, userAnswer);

        btn.disabled = false;
        savingLabel.style.display = 'none';

        if (ok && data) {
            const grading = data.grading || {};
            const isCorrect = grading.is_correct;
            const feedback = grading.feedback || 'No feedback returned.';

            feedbackEl.style.display = 'block';
            feedbackEl.innerHTML = `
                <div class="feedback-box ${isCorrect ? 'correct' : 'incorrect'}">
                    <div class="feedback-label">${isCorrect ? '✓ Correct' : '✗ Needs Improvement'}</div>
                    <div>${escapeHtml(feedback)}</div>
                </div>`;

            if (isCorrect && qCard) {
                qCard.classList.add('answered');
                btn.textContent = 'Answered ✓';
                textarea.disabled = true;
            }
        } else if (status !== 401) {
            const msg = extractErrorMessage(data, 'Failed to submit answer. Please try again.');
            feedbackEl.style.display = 'block';
            feedbackEl.innerHTML = `<div class="state-error" style="margin:0;">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                ${escapeHtml(msg)}
            </div>`;
        }
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

    // ─── escapeHtml ───────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
});
