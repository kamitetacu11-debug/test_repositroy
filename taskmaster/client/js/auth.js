/**
 * TaskMaster - Authentication Module
 */

const Auth = {
    currentUser: null,

    /**
     * Initialize authentication state
     */
    async init() {
        const token = API.getToken();

        if (token) {
            try {
                const response = await API.auth.getProfile();
                this.currentUser = response.data.user;
                return true;
            } catch (error) {
                API.setToken(null);
                return false;
            }
        }

        return false;
    },

    /**
     * Login user
     */
    async login(email, password) {
        const response = await API.auth.login(email, password);
        this.currentUser = response.data.user;
        return response;
    },

    /**
     * Register new user
     */
    async register(userData) {
        const response = await API.auth.register(userData);
        this.currentUser = response.data.user;
        return response;
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await API.auth.logout();
        } finally {
            this.currentUser = null;
            window.location.reload();
        }
    },

    /**
     * Update current user data
     */
    updateUser(userData) {
        if (this.currentUser) {
            Object.assign(this.currentUser, userData);
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    },

    /**
     * Check if user has role
     */
    hasRole(role) {
        return this.currentUser?.role === role;
    },

    /**
     * Check if user is admin or manager
     */
    canManage() {
        return ['admin', 'manager'].includes(this.currentUser?.role);
    },

    /**
     * Get user initials
     */
    getInitials() {
        if (!this.currentUser?.fullName) return '--';
        return this.currentUser.fullName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
};

// Initialize auth forms
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const demoButtons = document.querySelectorAll('.demo-btn');

    // Toggle forms
    showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Login form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = loginForm.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = 'Signing in...';
            btn.querySelector('.btn-loader').classList.remove('hidden');
            errorEl.textContent = '';

            await Auth.login(email, password);
            App.showApp();

        } catch (error) {
            errorEl.textContent = error.error || 'Login failed. Please try again.';
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'Sign In';
            btn.querySelector('.btn-loader').classList.add('hidden');
        }
    });

    // Register form submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const department = document.getElementById('register-department').value;
        const errorEl = document.getElementById('register-error');
        const btn = registerForm.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = 'Creating account...';
            btn.querySelector('.btn-loader').classList.remove('hidden');
            errorEl.textContent = '';

            await Auth.register({ fullName, email, password, department });
            App.showApp();

        } catch (error) {
            const message = error.errors?.[0]?.msg || error.error || 'Registration failed.';
            errorEl.textContent = message;
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'Create Account';
            btn.querySelector('.btn-loader').classList.add('hidden');
        }
    });

    // Demo account buttons
    demoButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = btn.dataset.email;
            const password = btn.dataset.password;

            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;

            // Trigger login
            loginForm.dispatchEvent(new Event('submit'));
        });
    });
});

window.Auth = Auth;
