// Check if already logged in
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('chatrise_user')) {
        window.location.href = 'index.html';
    }
});

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Simple validation
    if (!username || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Demo credentials (in real app, this would be server validation)
    const validCredentials = [
        { username: 'demo', password: 'demo123' },
        { username: 'user', password: 'password' },
        { username: 'admin', password: 'admin123' }
    ];
    
    const isValid = validCredentials.some(cred => 
        cred.username === username && cred.password === password
    );
    
    if (isValid) {
        // Create user session
        const userData = {
            username: username,
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe
        };
        
        localStorage.setItem('chatrise_user', JSON.stringify(userData));
        
        showAlert('Login successful! Redirecting...', 'success');
        
        // Redirect to main app
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } else {
        showAlert('Invalid username or password', 'error');
    }
}

// Demo login with preset credentials
function demoLogin() {
    document.getElementById('username').value = 'demo';
    document.getElementById('password').value = 'demo123';
    
    // Trigger login
    const loginForm = document.querySelector('.login-form');
    loginForm.dispatchEvent(new Event('submit'));
}

// Show/hide registration modal
function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
}

function hideRegister() {
    document.getElementById('registerModal').style.display = 'none';
}

// Handle registration form submission
function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    // Validation
    if (!username || !email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    
    // Check if username already exists (in real app, this would be server-side)
    const existingUsers = JSON.parse(localStorage.getItem('chatrise_registered_users') || '[]');
    
    if (existingUsers.some(user => user.username === username)) {
        showAlert('Username already exists', 'error');
        return;
    }
    
    if (existingUsers.some(user => user.email === email)) {
        showAlert('Email already registered', 'error');
        return;
    }
    
    // Register new user
    const newUser = {
        username: username,
        email: email,
        password: password, // In real app, this would be hashed
        registeredAt: new Date().toISOString()
    };
    
    existingUsers.push(newUser);
    localStorage.setItem('chatrise_registered_users', JSON.stringify(existingUsers));
    
    showAlert('Registration successful! You can now login.', 'success');
    
    // Close modal and fill login form
    hideRegister();
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show alert messages
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Alert styles
    const alertColors = {
        success: { bg: '#00a884', border: '#008a73' },
        error: { bg: '#dc3545', border: '#c82333' },
        info: { bg: '#17a2b8', border: '#138496' }
    };
    
    const colors = alertColors[type];
    
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors.bg};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        border: 1px solid ${colors.border};
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: alertSlideIn 0.3s ease;
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        alert.style.animation = 'alertSlideOut 0.3s ease forwards';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('registerModal');
    if (event.target === modal) {
        hideRegister();
    }
}

// Handle Enter key on login form
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // If in login form
        if (activeElement.closest('.login-form')) {
            const loginForm = document.querySelector('.login-form');
            loginForm.dispatchEvent(new Event('submit'));
        }
        
        // If in registration form
        if (activeElement.closest('.register-form')) {
            const registerForm = document.querySelector('.register-form');
            registerForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Add alert animations CSS
const alertCSS = `
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

.alert {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
`;

const alertStyle = document.createElement('style');
alertStyle.textContent = alertCSS;
document.head.appendChild(alertStyle);

// Password strength indicator (optional enhancement)
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997'];
    
    return {
        level: strengthLevels[strength] || 'Very Weak',
        color: strengthColors[strength] || '#dc3545',
        score: strength
    };
}

// Add password strength indicator to registration form
document.getElementById('regPassword')?.addEventListener('input', function() {
    const password = this.value;
    const strength = checkPasswordStrength(password);
    
    // Remove existing indicator
    const existing = document.querySelector('.password-strength');
    if (existing) existing.remove();
    
    if (password.length > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'password-strength';
        indicator.style.cssText = `
            font-size: 12px;
            margin-top: 5px;
            color: ${strength.color};
            font-weight: 500;
        `;
        indicator.textContent = `Password strength: ${strength.level}`;
        
        this.parentNode.appendChild(indicator);
    }
});

// Auto-focus first input on page load
window.addEventListener('load', function() {
    const firstInput = document.querySelector('input[type="text"], input[type="email"]');
    if (firstInput) {
        firstInput.focus();
    }
});

// Forgot password functionality (placeholder)
document.querySelector('.forgot-link')?.addEventListener('click', function(e) {
    e.preventDefault();
    
    const email = prompt('Enter your email address to reset password:');
    if (email && isValidEmail(email)) {
        showAlert('Password reset link sent to your email!', 'success');
    } else if (email) {
        showAlert('Please enter a valid email address', 'error');
    }
});
