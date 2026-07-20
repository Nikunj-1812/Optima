document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggle logic (shared between signup and login)
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.closest('.input-wrapper').querySelector('input');
            const eyeShow = button.querySelector('.eye-show');
            const eyeHide = button.querySelector('.eye-hide');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeShow.style.display = 'none';
                eyeHide.style.display = 'block';
            } else {
                input.type = 'password';
                eyeShow.style.display = 'block';
                eyeHide.style.display = 'none';
            }
        });
    });

    // Helper: Update validation styles and feedback message
    function updateFieldState(input, feedbackEl, isValid, message) {
        if (!input || !feedbackEl) return;
        if (input.value === '') {
            input.classList.remove('is-valid', 'is-invalid');
            feedbackEl.classList.remove('is-valid', 'is-invalid');
            feedbackEl.textContent = '';
            return;
        }

        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            feedbackEl.classList.remove('is-invalid');
            feedbackEl.classList.add('is-valid');
            feedbackEl.textContent = message || 'Looks good!';
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            feedbackEl.classList.remove('is-valid');
            feedbackEl.classList.add('is-invalid');
            feedbackEl.textContent = message;
        }
    }

    // ==========================================
    // SIGNUP FORM LOGIC
    // ==========================================
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        
        const usernameFeedback = document.getElementById('username-feedback');
        const passwordFeedback = document.getElementById('password-feedback');
        const confirmPasswordFeedback = document.getElementById('confirm-password-feedback');
        
        const submitBtn = document.getElementById('submit-btn');

        let isUsernameValid = false;
        let isPasswordValid = false;
        let isConfirmPasswordValid = false;

        function validateUsername() {
            const value = usernameInput.value.trim();
            const usernameRegex = /^[a-zA-Z0-9_]+$/;

            if (value.length < 3) {
                isUsernameValid = false;
                updateFieldState(usernameInput, usernameFeedback, false, 'Username must be at least 3 characters.');
            } else if (value.length > 20) {
                isUsernameValid = false;
                updateFieldState(usernameInput, usernameFeedback, false, 'Username must be less than 20 characters.');
            } else if (!usernameRegex.test(value)) {
                isUsernameValid = false;
                updateFieldState(usernameInput, usernameFeedback, false, 'Username can only contain letters, numbers, and underscores.');
            } else {
                isUsernameValid = true;
                updateFieldState(usernameInput, usernameFeedback, true, 'Username is valid.');
            }
            checkFormValidity();
        }

        function validatePassword() {
            const value = passwordInput.value;
            const hasLength = value.length >= 8;
            const hasLowercase = /[a-z]/.test(value);
            const hasUppercase = /[A-Z]/.test(value);
            const hasDigit = /\d/.test(value);
            const hasSpecial = /[@$!%*?&#^()_+\-=]/.test(value);

            isPasswordValid = hasLength && hasLowercase && hasUppercase && hasDigit && hasSpecial;
            
            if (value === '') {
                updateFieldState(passwordInput, passwordFeedback, false, '');
            } else {
                let errorMsg = 'Password must meet complexity requirements:';
                if (!hasLength) errorMsg += ' at least 8 characters;';
                if (!hasLowercase) errorMsg += ' a lowercase letter;';
                if (!hasUppercase) errorMsg += ' an uppercase letter;';
                if (!hasDigit) errorMsg += ' a digit;';
                if (!hasSpecial) errorMsg += ' a special character (@$!%*?&#^()_+-=);';
                if (errorMsg.endsWith(';')) {
                    errorMsg = errorMsg.slice(0, -1) + '.';
                }

                updateFieldState(
                    passwordInput, 
                    passwordFeedback, 
                    isPasswordValid, 
                    isPasswordValid ? 'Password meets complexity criteria.' : errorMsg
                );
            }

            validateConfirmPassword();
            checkFormValidity();
        }

        function validateConfirmPassword() {
            const passValue = passwordInput.value;
            const confirmValue = confirmPasswordInput.value;

            if (confirmValue === '') {
                isConfirmPasswordValid = false;
                updateFieldState(confirmPasswordInput, confirmPasswordFeedback, false, '');
            } else if (passValue !== confirmValue) {
                isConfirmPasswordValid = false;
                updateFieldState(confirmPasswordInput, confirmPasswordFeedback, false, 'Passwords do not match.');
            } else if (!isPasswordValid) {
                isConfirmPasswordValid = false;
                updateFieldState(confirmPasswordInput, confirmPasswordFeedback, false, 'Please fix the main password first.');
            } else {
                isConfirmPasswordValid = true;
                updateFieldState(confirmPasswordInput, confirmPasswordFeedback, true, 'Passwords match.');
            }
            checkFormValidity();
        }

        function checkFormValidity() {
            if (isUsernameValid && isPasswordValid && isConfirmPasswordValid) {
                submitBtn.removeAttribute('disabled');
            } else {
                submitBtn.setAttribute('disabled', 'true');
            }
        }

        usernameInput.addEventListener('input', validateUsername);
        passwordInput.addEventListener('input', validatePassword);
        confirmPasswordInput.addEventListener('input', validateConfirmPassword);

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isUsernameValid && isPasswordValid && isConfirmPasswordValid) {
                submitBtn.setAttribute('disabled', 'true');
                submitBtn.textContent = 'Creating account...';

                try {
                    const response = await fetch('http://localhost:5000/api/auth/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: usernameInput.value,
                            password: passwordInput.value,
                            confirm_password: confirmPasswordInput.value
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        if (data && data.access_token) {
                            localStorage.setItem('token', data.access_token);
                            localStorage.setItem('user', JSON.stringify(data.user));
                        }

                        const header = document.querySelector('.auth-header');
                        header.innerHTML = `
                            <div class="auth-brand" style="color: var(--color-success)">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <span>Optima</span>
                            </div>
                            <h1 class="auth-title" style="color: var(--color-success)">Account Created!</h1>
                            <p class="auth-subtitle">Welcome aboard, ${usernameInput.value}. Redirecting to dashboard...</p>
                        `;
                        signupForm.style.display = 'none';

                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 2000);
                    } else {
                        let errorMsg = 'Signup failed. Try again.';
                        if (data && data.detail) {
                            if (Array.isArray(data.detail)) {
                                errorMsg = data.detail.map(err => err.msg).join(', ');
                            } else {
                                errorMsg = data.detail;
                            }
                        }
                        updateFieldState(usernameInput, usernameFeedback, false, errorMsg);
                        submitBtn.removeAttribute('disabled');
                        submitBtn.textContent = 'Sign up';
                    }
                } catch (err) {
                    alert('Server error. Please try again later.');
                    submitBtn.removeAttribute('disabled');
                    submitBtn.textContent = 'Sign up';
                }
            }
        });
    }

    // ==========================================
    // LOGIN FORM LOGIC
    // ==========================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        const usernameFeedback = document.getElementById('username-feedback');
        const passwordFeedback = document.getElementById('password-feedback');
        
        const submitBtn = document.getElementById('submit-btn');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) {
                if (!username) updateFieldState(usernameInput, usernameFeedback, false, 'Username is required.');
                if (!password) updateFieldState(passwordInput, passwordFeedback, false, 'Password is required.');
                return;
            }

            submitBtn.setAttribute('disabled', 'true');
            submitBtn.textContent = 'Logging in...';

            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    if (data && data.access_token) {
                        localStorage.setItem('token', data.access_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }

                    const header = document.querySelector('.auth-header');
                    header.innerHTML = `
                        <div class="auth-brand" style="color: var(--color-success)">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span>Optima</span>
                        </div>
                        <h1 class="auth-title" style="color: var(--color-success)">Login Successful!</h1>
                        <p class="auth-subtitle">Welcome back, ${username}. Redirecting...</p>
                    `;
                    loginForm.style.display = 'none';

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    let errorMsg = 'Invalid username or password.';
                    if (data && data.detail) {
                        if (Array.isArray(data.detail)) {
                            errorMsg = data.detail.map(err => err.msg).join(', ');
                        } else {
                            errorMsg = data.detail;
                        }
                    }
                    updateFieldState(usernameInput, usernameFeedback, false, errorMsg);
                    updateFieldState(passwordInput, passwordFeedback, false, '');
                    submitBtn.removeAttribute('disabled');
                    submitBtn.textContent = 'Log in';
                }
            } catch (err) {
                alert('Server error. Please try again later.');
                submitBtn.removeAttribute('disabled');
                submitBtn.textContent = 'Log in';
            }
        });
    }
});
