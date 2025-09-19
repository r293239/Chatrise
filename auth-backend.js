// auth-backend.js - Authentication with Back4app Integration

// Check if already logged in
document.addEventListener('DOMContentLoaded', async function() {
    showLoading(false);
    
    // Initialize Parse SDK
    await ChatRiseBackend.init();
    
    // Check if user is already logged in
    if (ChatRiseAuth.isLoggedIn()) {
        showLoading(true, 'Redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
});

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading(true, 'Signing in...');
        setButtonLoading('loginBtn', 'loginBtnText', true);
        
        const result = await ChatRiseAuth.login(username, password);
        
        if (result.success) {
            showAlert('Login successful!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
        setButtonLoading('loginBtn', 'loginBtnText', false);
    }
}

// Demo login
async function demoLogin() {
    try {
        showLoading(true, 'Creating demo account...');
        
        // Create demo account if it doesn't exist
        const demoUsername = 'demo_' + Date.now();
        const demoEmail = `demo_${Date.now()}@chatrise.app`;
        const demoPassword = 'demo123';
        
        let result = await ChatRiseAuth.register(demoUsername, demoEmail, demoPassword);
        
        if (result.success) {
            showAlert('Demo account created! Signing in...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // If registration fails, try to login with demo credentials
            result = await ChatRiseAuth.login('demo', 'demo123');
            
            if (result.success) {
                showAlert('Signed in with demo account!', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showAlert('Demo login failed. Please try manual registration.', 'error');
            }
        }
    } catch (error) {
        console.error('Demo login error:', error);
        showAlert('Demo login failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Show registration modal
function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('regUsername').focus();
}

// Hide registration modal
function hideRegister() {
    document.getElementById('registerModal').style.display = 'none';
    
    // Clear form
    document.getElementById('regUsername').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordStrength').innerHTML = '';
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    if (username.length < 3) {
        showAlert('Username must be at least 3 characters', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        showLoading(true, 'Creating account...');
        setButtonLoading('registerBtn', 'registerBtnText', true);
        
        const result = await ChatRiseAuth.register(username, email, password);
        
        if (result.success) {
            showAlert('Account created successfully! Redirecting...', 'success');
            
            hideRegister();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
        setButtonLoading('registerBtn', 'registerBtnText', false);
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password strength checker
document.getElementById('regPassword')?.addEventListener('input', function() {
    const password = this.value;
    const strengthDiv = document.getElementById('passwordStrength');
    
    if (password.length === 0) {
        strengthDiv.innerHTML = '';
        return;
    }
    
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) {
        strength++;
    } else {
        feedback.push('At least 8 characters');
    }
    
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997'];
    
    const level = levels[strength] || 'Very Weak';
    const color = colors[strength] || '#dc3545';
    
    strengthDiv.innerHTML = `
        <div style="color: ${color}; font-size: 12px; margin-top: 5px;">
            Password strength: ${level}
            ${feedback.length > 0 ? '<br>Suggestions: ' + feedback.join(', ') : ''}
        </div>
    `;
});

// Confirm password validation
document.getElementById('confirmPassword')?.addEventListener('input', function() {
    const password = document.getElementById('regPassword').value;
    const confirmPassword = this.value;
    
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            this.style.borderColor = '#00a884';
        } else {
            this.style.borderColor = '#dc3545';
        }
    } else {
        this.style.borderColor = '#313d44';
    }
});

// Utility functions
function showLoading(show, text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (show) {
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

function setButtonLoading(buttonId, textId, loading) {
    const button = document.getElementById(buttonId);
    const text = document.getElementById(textId);
    
    if (loading) {
        button.disabled = true;
        button.style.opacity = '0.7';
        text.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.disabled = false;
        button.style.opacity = '1';
        
        if (buttonId === 'loginBtn') {
            text.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        } else if (buttonId === 'registerBtn') {
            text.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const colors = {
        success: '#00a884',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: alertSlideIn 0.3s ease;
        max-width: 400px;
        text-align: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'alertSlideOut 0.3s ease forwards';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('registerModal');
    if (event.target === modal) {
        hideRegister();
    }
}

// Handle Enter key
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.closest('.login-form')) {
            const loginForm = document.querySelector('.login-form');
            loginForm.dispatchEvent(new Event('submit'));
        } else if (activeElement.closest('.register-form')) {
            const registerForm = document.querySelector('.register-form');
            registerForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Auto-focus username field
window.addEventListener('load', function() {
    document.getElementById('username').focus();
});

// Add additional CSS for loading and alerts
const additionalCSS = `
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-spinner {
    text-align: center;
    color: #e9edef;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #313d44;
    border-top: 4px solid #00a884;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes alertSlideIn {
    from {
        transform: translate(-50%, -100%);
        opacity: 0;
    }
    to {
        transform: translate(-50%, 0);
        opacity: 1;
    }
}

@keyframes alertSlideOut {
    from {
        transform: translate(-50%, 0);
        opacity: 1;
    }
    to {
        transform: translate(-50%, -100%);
        opacity: 0;
    }
}

.password-strength {
    margin-top: 5px;
}

.form-group input:focus {
    border-color: #00a884 !important;
    box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.2);
}

.demo-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.login-btn:hover, .register-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 168, 132, 0.3);
}
`;

const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
