/**
 * TaskMaster - API Client
 * Handles all HTTP requests to the backend
 */

const API = {
    baseUrl: '/api',
    token: null,

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
    },

    /**
     * Get stored token
     */
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('accessToken');
        }
        return this.token;
    },

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        // Don't set Content-Type for FormData
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle token expiration
                if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Retry request with new token
                        config.headers['Authorization'] = `Bearer ${this.getToken()}`;
                        const retryResponse = await fetch(url, config);
                        return await retryResponse.json();
                    }
                }
                throw data;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Refresh access token
     */
    async refreshToken() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.setToken(data.data.tokens.accessToken);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    // ============================================
    // AUTH ENDPOINTS
    // ============================================

    auth: {
        async login(email, password) {
            const data = await API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            API.setToken(data.data.tokens.accessToken);
            return data;
        },

        async register(userData) {
            const data = await API.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            API.setToken(data.data.tokens.accessToken);
            return data;
        },

        async logout() {
            try {
                await API.request('/auth/logout', { method: 'POST' });
            } finally {
                API.setToken(null);
            }
        },

        async getProfile() {
            return API.request('/auth/me');
        },

        async updateProfile(data) {
            return API.request('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async changePassword(currentPassword, newPassword) {
            return API.request('/auth/password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            });
        }
    },

    // ============================================
    // TASKS ENDPOINTS
    // ============================================

    tasks: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/tasks${query ? '?' + query : ''}`);
        },

        async getById(id) {
            return API.request(`/tasks/${id}`);
        },

        async create(taskData) {
            return API.request('/tasks', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });
        },

        async update(id, taskData) {
            return API.request(`/tasks/${id}`, {
                method: 'PUT',
                body: JSON.stringify(taskData)
            });
        },

        async complete(id) {
            return API.request(`/tasks/${id}/complete`, {
                method: 'POST'
            });
        },

        async submit(id, formData) {
            return API.request(`/tasks/${id}/submit`, {
                method: 'POST',
                body: formData
            });
        },

        async delete(id) {
            return API.request(`/tasks/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // SHOP ENDPOINTS
    // ============================================

    shop: {
        async getItems(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/shop/items${query ? '?' + query : ''}`);
        },

        async purchase(itemId) {
            return API.request(`/shop/purchase/${itemId}`, {
                method: 'POST'
            });
        },

        async getInventory() {
            return API.request('/shop/inventory');
        },

        async equipItem(itemId, equip = true) {
            return API.request(`/shop/equip/${itemId}`, {
                method: 'POST',
                body: JSON.stringify({ equip })
            });
        },

        async getCategories() {
            return API.request('/shop/categories');
        }
    },

    // ============================================
    // CHAT ENDPOINTS
    // ============================================

    chat: {
        async getChannels() {
            return API.request('/chat/channels');
        },

        async createChannel(name, type = 'public', memberIds = []) {
            return API.request('/chat/channels', {
                method: 'POST',
                body: JSON.stringify({ name, type, memberIds })
            });
        },

        async createDirectMessage(userId) {
            return API.request('/chat/channels/direct', {
                method: 'POST',
                body: JSON.stringify({ userId })
            });
        },

        async getMessages(channelId, params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/chat/channels/${channelId}/messages${query ? '?' + query : ''}`);
        },

        async sendMessage(channelId, content, messageType = 'text', codeLanguage = null) {
            return API.request(`/chat/channels/${channelId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ content, messageType, codeLanguage })
            });
        },

        async uploadFile(channelId, file) {
            const formData = new FormData();
            formData.append('file', file);

            return API.request(`/chat/channels/${channelId}/upload`, {
                method: 'POST',
                body: formData
            });
        },

        async getUsers() {
            return API.request('/chat/users');
        }
    },

    // ============================================
    // LEADERBOARD ENDPOINTS
    // ============================================

    leaderboard: {
        async get(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/leaderboard${query ? '?' + query : ''}`);
        },

        async getBadges() {
            return API.request('/leaderboard/badges');
        },

        async getStats() {
            return API.request('/leaderboard/stats');
        },

        async getDepartments() {
            return API.request('/leaderboard/departments');
        }
    },

    // ============================================
    // NOTIFICATIONS ENDPOINTS
    // ============================================

    notifications: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/notifications${query ? '?' + query : ''}`);
        },

        async markAsRead(id) {
            return API.request(`/notifications/${id}/read`, {
                method: 'PUT'
            });
        },

        async markAllAsRead() {
            return API.request('/notifications/read-all', {
                method: 'PUT'
            });
        },

        async delete(id) {
            return API.request(`/notifications/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // FILES
    // ============================================

    files: {
        getUrl(filename) {
            return `/api/files/${filename}`;
        }
    }
};

// Make API available globally
window.API = API;
