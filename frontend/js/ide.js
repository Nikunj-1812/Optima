/**
 * ide.js — IDE / Workspace Page Logic for Optima
 *
 * Uses centralized API client from api.js (loaded before this script).
 *
 * Real backend endpoints used:
 *   POST /api/analyze/complexity  — Claude AI complexity + patterns analysis
 *   POST /api/analyze/optimize    — Claude AI code optimization
 *   POST /api/execute             — Run code via Piston (through backend, requires auth)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. AUTH CHECK ────────────────────────────────────────────────────────
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
        window.location.href = 'login.html';
        return;
    }

    let currentUser = storedUser;
    const username = currentUser.username || 'Developer';
    document.getElementById('user-username').textContent = username;
    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();

    // ─── 2. DOM ELEMENT SELECTORS ─────────────────────────────────────────────
    const problemSelector     = document.getElementById('problem-selector');
    const customProblemField  = document.getElementById('custom-problem-field');
    const customProblemTitle  = document.getElementById('custom-problem-title');
    const languageSelector    = document.getElementById('language-selector');
    const codeTextarea        = document.getElementById('code-textarea');
    const lineNumbersSidebar  = document.getElementById('line-numbers-sidebar');

    const resetCodeBtn        = document.getElementById('reset-code-btn');
    const optimizeCodeBtn     = document.getElementById('optimize-code-btn');
    const runAnalysisBtn      = document.getElementById('run-analysis-btn');
    const submitCodeBtn       = document.getElementById('submit-code-btn');

    const analysisStatus      = document.getElementById('analysis-status');
    const idleView            = document.getElementById('idle-view');
    const resultsView         = document.getElementById('results-view');

    const timeComplexityBadge     = document.getElementById('time-complexity-badge');
    const spaceComplexityBadge    = document.getElementById('space-complexity-badge');
    const patternRecognitionBox   = document.getElementById('pattern-recognition-box');
    const patternStatusIcon       = document.getElementById('pattern-status-icon');
    const patternHeadline         = document.getElementById('pattern-headline');
    const patternDescription      = document.getElementById('pattern-description');
    const recommendationsContainer = document.getElementById('recommendations-container');

    const optimizationGroup       = document.getElementById('optimization-group');
    const optimizationBadge       = document.getElementById('optimization-badge');
    const optimizationRationale   = document.getElementById('optimization-rationale-text');
    const optimizedCodeBlock      = document.getElementById('optimized-code-block');
    const applyOptimizedBtn       = document.getElementById('apply-optimized-code-btn');

    // Track last submission_id from backend so optimize / debug can reference it
    let lastSubmissionId = null;
    let currentOptimizedCode = '';

    // ─── 3. CODE TEMPLATE DICTIONARY ─────────────────────────────────────────
    const codeTemplates = {
        "Only IDE": {
            "Python": `# enter your code here`,
            "JavaScript": `// enter your code here`,
            "C++": `// enter your code here`,
            "Java": `// enter your code here`
        },
        "Two Sum": {
            "Python": `def twoSum(nums, target):\n    # enter your code here\n    pass`,
            "JavaScript": `function twoSum(nums, target) {\n    // enter your code here\n}`,
            "C++": `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // enter your code here\n    }\n};`,
            "Java": `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // enter your code here\n    }\n}`
        },
        "Valid Parentheses": {
            "Python": `def isValid(s):\n    # enter your code here\n    pass`,
            "JavaScript": `function isValid(s) {\n    // enter your code here\n}`,
            "C++": `class Solution {\npublic:\n    bool isValid(string s) {\n        // enter your code here\n    }\n};`,
            "Java": `class Solution {\n    public boolean isValid(String s) {\n        // enter your code here\n    }\n}`
        },
        "Merge Intervals": {
            "Python": `def merge(intervals):\n    # enter your code here\n    pass`,
            "JavaScript": `function merge(intervals) {\n    // enter your code here\n}`,
            "C++": `class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // enter your code here\n    }\n};`,
            "Java": `class Solution {\n    public int[][] merge(int[][] intervals) {\n        // enter your code here\n    }\n}`
        },
        "Fibonacci Number": {
            "Python": `def fib(n):\n    # enter your code here\n    pass`,
            "JavaScript": `function fib(n) {\n    // enter your code here\n}`,
            "C++": `class Solution {\npublic:\n    int fib(int n) {\n        // enter your code here\n    }\n};`,
            "Java": `class Solution {\n    public int fib(int n) {\n        // enter your code here\n    }\n}`
        },
        "Binary Search": {
            "Python": `def search(nums, target):\n    # enter your code here\n    pass`,
            "JavaScript": `function search(nums, target) {\n    // enter your code here\n}`,
            "C++": `class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // enter your code here\n    }\n};`,
            "Java": `class Solution {\n    public int search(int[] nums, int target) {\n        // enter your code here\n    }\n}`
        },
        "Custom Problem": {
            "Python": `# enter your code here`,
            "JavaScript": `// enter your code here`,
            "C++": `// enter your code here`,
            "Java": `// enter your code here`
        }
    };

    // ─── 4. EDITOR EVENTS ─────────────────────────────────────────────────────

    function updateLineNumbers() {
        const linesCount = codeTextarea.value.split('\n').length;
        lineNumbersSidebar.innerHTML = '';
        for (let i = 1; i <= linesCount; i++) {
            const span = document.createElement('span');
            span.textContent = i;
            lineNumbersSidebar.appendChild(span);
        }
    }

    function loadTemplate() {
        const problem = problemSelector.value;
        const lang = languageSelector.value;
        if (codeTemplates[problem] && codeTemplates[problem][lang]) {
            codeTextarea.value = codeTemplates[problem][lang];
        } else {
            codeTextarea.value = '// Enter your code here';
        }
        updateLineNumbers();
        resetAnalysisUI();
        lastSubmissionId = null;
    }

    function resetAnalysisUI() {
        analysisStatus.textContent = 'Ready';
        analysisStatus.className = 'status-indicator-idle';
        idleView.style.display = 'flex';
        resultsView.style.display = 'none';
        if (optimizationGroup) optimizationGroup.style.display = 'none';
    }

    problemSelector.addEventListener('change', () => {
        customProblemField.style.display =
            problemSelector.value === 'Custom Problem' ? 'flex' : 'none';
        loadTemplate();
    });

    languageSelector.addEventListener('change', loadTemplate);
    codeTextarea.addEventListener('input', updateLineNumbers);
    codeTextarea.addEventListener('scroll', () => {
        lineNumbersSidebar.scrollTop = codeTextarea.scrollTop;
    });

    resetCodeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the editor to the baseline starter code?')) {
            loadTemplate();
        }
    });

    // ─── 5. COMPLEXITY CLASSIFIER (for badge coloring) ────────────────────────

    function getComplexityClass(complexity) {
        if (!complexity) return 'good';
        const comp = complexity.replace(/\s+/g, '').toLowerCase();
        if (comp.includes('n^2') || comp.includes('2^n') || comp.includes('n^3') ||
            comp.includes('n²')) return 'bad';
        if (comp.includes('nlogn') || comp.includes('n*logn')) return 'warning';
        return 'good';
    }

    // ─── 6. RENDER ANALYSIS RESULTS ───────────────────────────────────────────

    function renderAnalysis(analysisData) {
        const analysis = analysisData.analysis || {};
        const patterns = analysisData.patterns || [];
        const timeC  = analysis.time_complexity || 'Unknown';
        const spaceC = analysis.space_complexity || 'Unknown';
        const explanation = analysis.explanation || '';

        analysisStatus.textContent = 'Completed';
        analysisStatus.className = 'status-indicator-done';

        idleView.style.display = 'none';
        resultsView.style.display = 'flex';

        // Complexity Badges
        timeComplexityBadge.textContent = timeC;
        timeComplexityBadge.className = `complexity-badge ${getComplexityClass(timeC)}`;

        spaceComplexityBadge.textContent = spaceC;
        spaceComplexityBadge.className = `complexity-badge ${getComplexityClass(spaceC)}`;

        // Pattern Recognition
        const isGoodComplexity = getComplexityClass(timeC) !== 'bad';
        const patternNames = patterns.map(p => p.name || p).join(', ');

        if (isGoodComplexity) {
            patternRecognitionBox.className = 'insight-item-box success';
            patternStatusIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>`;
        } else {
            patternRecognitionBox.className = 'insight-item-box warning';
            patternStatusIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>`;
        }

        patternHeadline.textContent = patternNames || (isGoodComplexity ? 'Efficient algorithm detected' : 'Suboptimal complexity detected');
        patternDescription.textContent = explanation || (patternNames
            ? `Detected patterns: ${patternNames}`
            : 'No specific pattern recognized.');

        // Recommendations
        recommendationsContainer.innerHTML = '';
        const recs = buildRecommendations(timeC, spaceC, patterns, explanation);
        recs.forEach((rec, idx) => {
            const card = document.createElement('div');
            const borderClass = rec.type === 'warning' ? 'warning-border' : 'success-border';
            card.className = `rec-card ${borderClass}`;
            card.innerHTML = `
                <span class="rec-number-badge">${idx + 1}</span>
                <div>
                    <strong>${escapeHtml(rec.bold)}</strong> ${escapeHtml(rec.text)}
                </div>
            `;
            recommendationsContainer.appendChild(card);
        });
    }

    function buildRecommendations(timeC, spaceC, patterns, explanation) {
        const recs = [];
        const timeCl = getComplexityClass(timeC);

        if (timeCl === 'bad') {
            recs.push({
                type: 'warning',
                bold: 'High Time Complexity Detected.',
                text: `Your solution runs in ${timeC}. Click the ⚡ Optimize button above for an algorithmic refactor.`,
            });
        } else if (timeCl === 'warning') {
            recs.push({
                type: 'warning',
                bold: 'Moderate Time Complexity.',
                text: `${timeC} — generally acceptable, but verify this is optimal for the problem constraints.`,
            });
        } else {
            recs.push({
                type: 'success',
                bold: 'Optimal Time Complexity.',
                text: `${timeC} — your algorithm scales well with input size.`,
            });
        }

        const spaceCl = getComplexityClass(spaceC);
        if (spaceCl === 'bad') {
            recs.push({
                type: 'warning',
                bold: 'High Space Usage.',
                text: `Space complexity is ${spaceC}. Consider whether intermediate data structures can be reduced or eliminated.`,
            });
        } else if (spaceC && spaceC !== 'Unknown') {
            recs.push({
                type: spaceC === 'O(1)' ? 'success' : 'info',
                bold: `Space Complexity: ${spaceC}.`,
                text: spaceC === 'O(1)'
                    ? 'In-place solution — minimal memory overhead.'
                    : 'Review allocations to see if in-place computation is possible.',
            });
        }

        if (patterns.length > 0) {
            const high = patterns.filter(p => (p.confidence || 0) >= 0.7);
            if (high.length > 0) {
                recs.push({
                    type: 'success',
                    bold: 'Recognized Patterns.',
                    text: high.map(p => `${p.name} (${Math.round((p.confidence || 0) * 100)}% confidence)`).join('; ') + '.',
                });
            }
        }

        return recs;
    }

    // ─── 7. CODE EXECUTION VIA BACKEND ────────────────────────────────────────

    async function runCodeExecution(code, langName, stdin = '') {
        const executionBadge = document.getElementById('execution-status-badge');
        const stdoutElem     = document.getElementById('terminal-stdout');
        const stderrElem     = document.getElementById('terminal-stderr');
        const stderrSection  = document.getElementById('stderr-section');

        if (!executionBadge || !stdoutElem || !stderrElem || !stderrSection) return;

        executionBadge.textContent = 'Running...';
        executionBadge.className = 'execution-badge';
        stdoutElem.textContent = 'Executing code on backend...';
        stderrSection.style.display = 'none';

        const { ok, data, status } = await ExecuteAPI.run(langName, code, stdin);

        if (ok && data) {
            const stdout   = (data.stdout || '').trim();
            const stderr   = (data.stderr || '').trim();
            const exitCode = data.exit_code;

            if (stderr || (exitCode !== null && exitCode !== 0)) {
                executionBadge.textContent = 'Runtime Error';
                executionBadge.className = 'execution-badge error';
                stdoutElem.textContent = stdout || 'No standard output produced.';
                stderrElem.textContent = stderr || `Process exited with code ${exitCode}`;
                stderrSection.style.display = 'flex';
            } else {
                executionBadge.textContent = 'Success (Exit 0)';
                executionBadge.className = 'execution-badge success';
                stdoutElem.textContent = stdout || 'Code executed cleanly with no printed output.';
                stderrSection.style.display = 'none';
            }

            if (lastSubmissionId && (stderr || (exitCode !== null && exitCode !== 0))) {
                const errorMsg = stderr || `Exit code ${exitCode}`;
                offerDebugHelp(lastSubmissionId, errorMsg, stderrSection);
            }
        } else if (status !== 401) {
            executionBadge.textContent = 'Error';
            executionBadge.className = 'execution-badge error';
            if (status === 0) {
                stdoutElem.textContent = 'Cannot reach execution service.';
                stderrElem.textContent = 'Make sure the backend server is running on port 8000.';
            } else {
                stdoutElem.textContent = 'Execution failed.';
                stderrElem.textContent = extractErrorMessage(data, `Server returned HTTP ${status}`);
            }
            stderrSection.style.display = 'flex';
        }
    }

    // ─── 8. DEBUG HELP OFFER ──────────────────────────────────────────────────

    function offerDebugHelp(submissionId, errorMsg, stderrSection) {
        if (stderrSection.querySelector('.debug-help-btn')) return;

        const debugBtn = document.createElement('button');
        debugBtn.className = 'debug-help-btn btn-secondary';
        debugBtn.textContent = '🔍 Get AI Debug Help';
        debugBtn.style.marginTop = '0.75rem';
        debugBtn.addEventListener('click', async () => {
            debugBtn.disabled = true;
            debugBtn.textContent = 'Analyzing error...';

            const { ok, data } = await DebugAPI.create(submissionId, errorMsg);
            debugBtn.disabled = false;

            if (ok && data) {
                const suggestion = data.suggestion || 'No suggestion available.';
                const errorType = data.error_type || 'Unknown';

                const rec = document.createElement('div');
                rec.className = 'rec-card warning-border';
                rec.style.marginTop = '0.75rem';
                rec.innerHTML = `
                    <span class="rec-number-badge">🐛</span>
                    <div>
                        <strong>${escapeHtml(errorType)}</strong> — ${escapeHtml(suggestion)}
                    </div>
                `;
                recommendationsContainer.appendChild(rec);
                debugBtn.textContent = '✓ Debug suggestion added above';
            } else {
                debugBtn.textContent = 'Debug failed — try again';
                setTimeout(() => { debugBtn.textContent = '🔍 Get AI Debug Help'; }, 2000);
            }
        });

        stderrSection.appendChild(debugBtn);
    }

    // ─── 9. RUN BUTTON HANDLER ────────────────────────────────────────────────

    runAnalysisBtn.addEventListener('click', async () => {
        const codeText = codeTextarea.value.trim();
        if (!codeText || codeText === '// Enter your code here') {
            alert('Please write some code in the editor before running.');
            return;
        }

        const langName = languageSelector.value;
        let problemName = problemSelector.value;
        if (problemName === 'Custom Problem') {
            problemName = customProblemTitle.value.trim() || 'Custom Algorithm';
        }

        analysisStatus.textContent = 'Analyzing...';
        analysisStatus.className = 'status-indicator-running';
        runAnalysisBtn.setAttribute('disabled', 'true');
        submitCodeBtn.setAttribute('disabled', 'true');
        if (optimizeCodeBtn) optimizeCodeBtn.setAttribute('disabled', 'true');
        runAnalysisBtn.textContent = 'Analyzing...';

        idleView.style.display = 'none';
        resultsView.style.display = 'flex';
        timeComplexityBadge.textContent = '...';
        spaceComplexityBadge.textContent = '...';
        patternHeadline.textContent = 'Consulting AI...';
        patternDescription.textContent = 'Analyzing your code for patterns and complexity.';
        recommendationsContainer.innerHTML = '';
        if (optimizationGroup) optimizationGroup.style.display = 'none';

        const backendLangMap = {
            'Python': 'python', 'JavaScript': 'javascript',
            'C++': 'cpp', 'Java': 'java',
        };
        const backendLang = backendLangMap[langName] || langName.toLowerCase();

        const { ok, data, status } = await AnalyzeAPI.complexity(codeText, backendLang, problemName !== 'Only IDE' ? problemName : null);

        if (ok && data) {
            lastSubmissionId = data.submission?.id || null;
            renderAnalysis(data);

            if (data.submission) {
                SubmissionCache.prepend({
                    ...data.submission,
                    analysis: data.analysis,
                    patterns: data.patterns,
                });
            }
        } else if (status !== 401) {
            analysisStatus.textContent = 'Error';
            analysisStatus.className = 'status-indicator-running';
            patternHeadline.textContent = 'Analysis Failed';
            patternDescription.textContent = status === 0
                ? 'Cannot connect to backend. Make sure the server is running on port 8000.'
                : extractErrorMessage(data, 'Analysis request failed. Please try again.');
            timeComplexityBadge.textContent = 'N/A';
            spaceComplexityBadge.textContent = 'N/A';
        }

        await runCodeExecution(codeText, langName);

        runAnalysisBtn.removeAttribute('disabled');
        submitCodeBtn.removeAttribute('disabled');
        if (optimizeCodeBtn) optimizeCodeBtn.removeAttribute('disabled');
        runAnalysisBtn.textContent = 'Run';
    });

    // ─── 10. OPTIMIZE CODE HANDLER ────────────────────────────────────────────

    if (optimizeCodeBtn) {
        optimizeCodeBtn.addEventListener('click', async () => {
            const codeText = codeTextarea.value.trim();
            if (!codeText || codeText === '// Enter your code here') {
                alert('Please write some code in the editor before optimizing.');
                return;
            }

            const langName = languageSelector.value;
            const backendLangMap = {
                'Python': 'python', 'JavaScript': 'javascript',
                'C++': 'cpp', 'Java': 'java',
            };
            const backendLang = backendLangMap[langName] || langName.toLowerCase();

            optimizeCodeBtn.disabled = true;
            optimizeCodeBtn.textContent = '⚡ Optimizing...';

            idleView.style.display = 'none';
            resultsView.style.display = 'flex';

            const { ok, data, status } = await AnalyzeAPI.optimize(codeText, backendLang, lastSubmissionId);

            optimizeCodeBtn.disabled = false;
            optimizeCodeBtn.textContent = '⚡ Optimize';

            if (ok && data) {
                currentOptimizedCode = data.optimized_code || '';
                if (optimizationGroup) {
                    optimizationGroup.style.display = 'block';
                    if (optimizationRationale) {
                        optimizationRationale.textContent = data.rationale || 'Code optimized for lower algorithmic complexity.';
                    }
                    if (optimizedCodeBlock) {
                        optimizedCodeBlock.textContent = currentOptimizedCode || '// No code returned.';
                    }
                    if (optimizationBadge) {
                        const newTime = data.new_time_complexity || 'Optimal';
                        optimizationBadge.textContent = newTime;
                    }
                }
            } else if (status !== 401) {
                const msg = extractErrorMessage(data, 'Optimization request failed.');
                alert(`Optimization failed: ${msg}`);
            }
        });
    }

    if (applyOptimizedBtn) {
        applyOptimizedBtn.addEventListener('click', () => {
            if (currentOptimizedCode) {
                codeTextarea.value = currentOptimizedCode;
                updateLineNumbers();
                applyOptimizedBtn.textContent = 'Applied ✓';
                setTimeout(() => { applyOptimizedBtn.textContent = 'Apply to Editor'; }, 2000);
            }
        });
    }

    // ─── 11. SUBMIT BUTTON HANDLER ────────────────────────────────────────────

    submitCodeBtn.addEventListener('click', async () => {
        const codeText = codeTextarea.value.trim();
        if (!codeText || codeText === '// Enter your code here') {
            alert('Please write some code in the editor before submitting.');
            return;
        }

        let problemName = problemSelector.value;
        if (problemName === 'Custom Problem') {
            problemName = customProblemTitle.value.trim() || 'Custom Algorithm';
        }

        const langName = languageSelector.value;
        const backendLangMap = {
            'Python': 'python', 'JavaScript': 'javascript',
            'C++': 'cpp', 'Java': 'java',
        };
        const backendLang = backendLangMap[langName] || langName.toLowerCase();

        submitCodeBtn.setAttribute('disabled', 'true');
        submitCodeBtn.textContent = 'Submitting...';
        runAnalysisBtn.setAttribute('disabled', 'true');

        const { ok, data, status } = await AnalyzeAPI.complexity(
            codeText,
            backendLang,
            problemName !== 'Only IDE' ? problemName : null
        );

        if (ok && data) {
            lastSubmissionId = data.submission?.id || null;

            if (data.submission) {
                SubmissionCache.prepend({
                    ...data.submission,
                    analysis: data.analysis,
                    patterns: data.patterns,
                });
            }

            renderAnalysis(data);

            submitCodeBtn.textContent = 'Submitted ✓';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        } else if (status !== 401) {
            const errMsg = status === 0
                ? 'Cannot connect to backend server.'
                : extractErrorMessage(data, 'Submission failed. Please try again.');
            alert(`Submission failed: ${errMsg}`);
            submitCodeBtn.removeAttribute('disabled');
            submitCodeBtn.textContent = 'Submit';
            runAnalysisBtn.removeAttribute('disabled');
        }
    });

    // ─── 12. INITIALIZE PAGE ──────────────────────────────────────────────────
    loadTemplate();

    // ─── 13. LOGOUT ───────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await AuthAPI.logout();
            clearSession();
            window.location.href = 'login.html';
        });
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
