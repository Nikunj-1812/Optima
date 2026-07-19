document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    const usernameFeedback = document.getElementById('username-feedback');
    const passwordFeedback = document.getElementById('password-feedback');
    const confirmPasswordFeedback = document.getElementById('confirm-password-feedback');
    
    const submitBtn = document.getElementById('submit-btn');
    
    // Password Requirement Items
    const reqLength = document.getElementById('req-length');
    const reqNumber = document.getElementById('req-number');

    // Validation state
    let isUsernameValid = false;
    let isPasswordValid = false;
    let isConfirmPasswordValid = false;

    // Password visibility toggle logic
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

    // Validate Username
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
            updateFieldState(usernameInput, usernameFeedback, true, 'Username is valid and available.');
        }
        checkFormValidity();
    }

    // Validate Password
    function validatePassword() {
        const value = passwordInput.value;
        
        // 1. Length check
        const hasLength = value.length >= 8;
        if (reqLength) {
            if (hasLength) {
                reqLength.classList.remove('unmet');
                reqLength.classList.add('met');
            } else {
                reqLength.classList.remove('met');
                reqLength.classList.add('unmet');
            }
        }

        // 2. Number or Special Character check
        const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(value);
        if (reqNumber) {
            if (hasNumberOrSpecial) {
                reqNumber.classList.remove('unmet');
                reqNumber.classList.add('met');
            } else {
                reqNumber.classList.remove('met');
                reqNumber.classList.add('unmet');
            }
        }

        isPasswordValid = hasLength && hasNumberOrSpecial;
        
        if (value === '') {
            updateFieldState(passwordInput, passwordFeedback, false, '');
        } else {
            updateFieldState(
                passwordInput, 
                passwordFeedback, 
                isPasswordValid, 
                isPasswordValid ? 'Password meets complexity criteria.' : 'Password must be at least 8 characters and include a number or special character.'
            );
        }

        // Re-validate confirm password since password changed
        validateConfirmPassword();
        checkFormValidity();
    }

    // Validate Confirm Password
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

    // Check overall form validity to toggle submit button
    function checkFormValidity() {
        if (isUsernameValid && isPasswordValid && isConfirmPasswordValid) {
            submitBtn.removeAttribute('disabled');
        } else {
            submitBtn.setAttribute('disabled', 'true');
        }
    }

    // Event listeners for real-time validation
    usernameInput.addEventListener('input', validateUsername);
    passwordInput.addEventListener('input', validatePassword);
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);

    // Form submit handler
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
                        password: passwordInput.value
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // success UI
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
                    
                    // Hide form fields
                    signupForm.style.display = 'none';

                    // Redirect to dashboard after a delay
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                } else {
                    // Backend validation error (e.g. username already taken)
                    updateFieldState(usernameInput, usernameFeedback, false, data.message || 'Signup failed. Try again.');
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
});
