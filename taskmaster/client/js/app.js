/**
 * TaskMaster - Main Application
 */

const App = {
    socket: null,
    currentPage: 'dashboard',

    /**
     * Initialize application
     */
    async init() {
        // Create stars
        Utils.createStars('splash-stars', 100);
        Utils.createStars('auth-stars', 50);
        Utils.createStars('app-stars', 50);

        // Check authentication
        const isAuthenticated = await Auth.init();

        // Splash screen animation
        setTimeout(() => {
            document.getElementById('logo-container')?.classList.add('expand');
        }, 2000);

        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');

            if (isAuthenticated) {
                this.showApp();
            } else {
                this.showAuth();
            }
        }, 2800);
    },

    /**
     * Show authentication screen
     */
    showAuth() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    },

    /**
     * Show main application
     */
    showApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        this.initSocket();
        this.initNavigation();
        this.updateUserUI();
        this.loadNotifications();
        this.initNexus();

        // Load initial page
        this.navigateTo('dashboard');
    },

    /**
     * Initialize WebSocket connection
     */
    initSocket() {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            console.warn('Socket.IO not available, real-time features disabled');
            return;
        }

        const token = API.getToken();

        this.socket = io({
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        // Listen for real-time events
        this.socket.on('points:earned', (data) => {
            if (data.userId !== Auth.currentUser?.id) {
                Utils.showToast('info', `${data.userName} earned ${data.points} points!`);
            }
        });

        this.socket.on('task:updated', (data) => {
            // Refresh tasks if on tasks page
            if (this.currentPage === 'tasks' || this.currentPage === 'dashboard') {
                Pages[this.currentPage]?.refresh?.();
            }
        });

        this.socket.on('user:online', (data) => {
            // Update online status
        });

        this.socket.on('user:offline', (data) => {
            // Update offline status
        });
    },

    /**
     * Initialize navigation
     */
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // Notifications toggle
        document.getElementById('nav-notifications')?.addEventListener('click', () => {
            const panel = document.getElementById('notifications-panel');
            panel.classList.toggle('hidden');
        });

        // Close notifications when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notifications-panel');
            const trigger = document.getElementById('nav-notifications');
            if (!panel?.contains(e.target) && !trigger?.contains(e.target)) {
                panel?.classList.add('hidden');
            }
        });

        // Mark all as read
        document.getElementById('mark-all-read')?.addEventListener('click', async () => {
            await API.notifications.markAllAsRead();
            this.loadNotifications();
        });

        // User avatar click - go to profile
        document.getElementById('nav-avatar')?.addEventListener('click', () => {
            this.navigateTo('profile');
        });
    },

    /**
     * Navigate to page
     */
    navigateTo(page) {
        this.currentPage = page;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Load page content
        if (Pages[page]) {
            Pages[page].render();
        }
    },

    /**
     * Update user UI elements
     */
    updateUserUI() {
        const user = Auth.currentUser;
        if (!user) return;

        // Update nav avatar
        document.getElementById('nav-avatar-initials').textContent = Auth.getInitials();

        // Update stars
        document.getElementById('user-stars').textContent = Utils.formatNumber(user.starsBalance);

        // Update streak
        document.getElementById('streak-count').textContent = user.streakDays;

        // Show/hide streak badge
        document.getElementById('streak-badge').classList.toggle('hidden', user.streakDays < 1);
    },

    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const response = await API.notifications.getAll();
            const { notifications, unreadCount } = response.data;

            // Update badge
            const badge = document.getElementById('notif-badge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            // Render notifications
            const list = document.getElementById('notif-list');
            if (notifications.length === 0) {
                list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
                return;
            }

            list.innerHTML = notifications.map(notif => `
                <div class="notif-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.id}">
                    <span class="notif-icon">${this.getNotificationIcon(notif.type)}</span>
                    <div class="notif-content">
                        <h4>${notif.title}</h4>
                        <p>${notif.content || ''}</p>
                        <span class="notif-time">${Utils.timeAgo(notif.created_at)}</span>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            list.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.id;
                    await API.notifications.markAsRead(id);
                    item.classList.remove('unread');
                    this.loadNotifications();
                });
            });

        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    },

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            task_assigned: '📋',
            task_completed: '✅',
            submission_received: '📥',
            points_earned: '⭐',
            badge_earned: '🏆',
            level_up: '🎉',
            purchase: '🛒',
            system: '📢'
        };
        return icons[type] || '🔔';
    },

    /**
     * Initialize NEXUS AI assistant
     */
    initNexus() {
        const nexus = document.getElementById('nexus-avatar');
        const tips = [
            "Complete tasks early for bonus points!",
            "Your most productive hours are in the morning.",
            "You're on a {streak}-day streak! Keep it up!",
            "Try tackling harder tasks for more rewards.",
            "Check out the shop for new avatar items!",
            "You're {rank} on the leaderboard!",
            "Don't forget to take breaks for better productivity."
        ];

        let tipIndex = 0;

        nexus?.addEventListener('click', () => {
            const message = document.getElementById('nexus-message');
            let tip = tips[tipIndex];

            // Replace placeholders
            tip = tip.replace('{streak}', Auth.currentUser?.streakDays || 0);
            tip = tip.replace('{rank}', '#' + (Auth.currentUser?.rank || '?'));

            message.textContent = tip;
            tipIndex = (tipIndex + 1) % tips.length;

            // Animation
            nexus.style.animation = 'none';
            nexus.offsetHeight; // Trigger reflow
            nexus.style.animation = 'nexusFloat 3s ease-in-out infinite';
        });
    },

    /**
     * Show loading state
     */
    showLoading(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    },

    /**
     * Emit socket event
     */
    emit(event, data) {
        this.socket?.emit(event, data);
    }
};

// Initialize modals
document.addEventListener('DOMContentLoaded', () => {
    // Close modals
    document.querySelectorAll('.modal').forEach(modal => {
        // Close on overlay click
        modal.querySelector('.modal-overlay')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Close on button click
        modal.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
});

// Start application
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;
