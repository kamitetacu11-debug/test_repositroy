/**
 * TaskMaster - Page Renderers
 */

const Pages = {
    // ============================================
    // DASHBOARD PAGE
    // ============================================
    dashboard: {
        async render() {
            const main = document.getElementById('main-content');
            App.showLoading(main);

            try {
                const [tasksRes, statsRes] = await Promise.all([
                    API.tasks.getAll({ limit: 5 }),
                    API.leaderboard.getStats()
                ]);

                const tasks = tasksRes.data.tasks;
                const stats = statsRes.data;

                const completedToday = tasks.filter(t => t.status === 'completed').length;
                const totalTasks = tasks.length;
                const progressPercent = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

                main.innerHTML = `
                    <div class="page-section active" id="page-dashboard">
                        <div class="page-header">
                            <h1 class="page-title">Welcome back, ${Auth.currentUser?.fullName?.split(' ')[0]}! 👋</h1>
                            <p class="page-subtitle">Here's your productivity overview</p>
                        </div>

                        <div class="stats-grid">
                            <div class="glass-card stat-card">
                                <div class="stat-icon purple">📋</div>
                                <div class="stat-value">${stats.taskStats?.total || 0}</div>
                                <div class="stat-label">Total Tasks</div>
                            </div>
                            <div class="glass-card stat-card">
                                <div class="stat-icon green">✅</div>
                                <div class="stat-value">${stats.taskStats?.completed || 0}</div>
                                <div class="stat-label">Completed</div>
                            </div>
                            <div class="glass-card stat-card">
                                <div class="stat-icon cyan">⏱️</div>
                                <div class="stat-value">${stats.taskStats?.in_progress || 0}</div>
                                <div class="stat-label">In Progress</div>
                            </div>
                            <div class="glass-card stat-card">
                                <div class="stat-icon gold">⭐</div>
                                <div class="stat-value">${Utils.formatNumber(stats.user?.totalPoints || 0)}</div>
                                <div class="stat-label">Total Points</div>
                            </div>
                        </div>

                        <div class="content-grid">
                            <div class="glass-card">
                                <div class="card-header">
                                    <div class="card-title">
                                        Recent Tasks
                                        <span class="card-badge">${tasks.filter(t => t.status !== 'completed').length} remaining</span>
                                    </div>
                                    <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('tasks')">View All</button>
                                </div>

                                <div class="task-list" id="dashboard-tasks">
                                    ${this.renderTasks(tasks)}
                                </div>

                                <div class="ai-insight">
                                    <div class="ai-insight-icon">🤖</div>
                                    <div class="ai-insight-content">
                                        <h4>AI Insight</h4>
                                        <p>You're ${progressPercent}% through your tasks. ${progressPercent >= 70 ? 'Great progress! Keep it up!' : 'Focus on high-priority items first.'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="glass-card" style="margin-bottom: 20px;">
                                    <div class="card-title" style="margin-bottom: 15px;">Today's Progress</div>
                                    <div class="progress-container">
                                        <div class="progress-ring">
                                            <svg width="150" height="150">
                                                <defs>
                                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stop-color="#667eea"/>
                                                        <stop offset="50%" stop-color="#764ba2"/>
                                                        <stop offset="100%" stop-color="#f093fb"/>
                                                    </linearGradient>
                                                </defs>
                                                <circle class="progress-ring-bg" cx="75" cy="75" r="65"/>
                                                <circle class="progress-ring-fill" id="progress-circle" cx="75" cy="75" r="65"/>
                                            </svg>
                                            <div class="progress-text">
                                                <div class="progress-value">${progressPercent}%</div>
                                                <div class="progress-label">Completed</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="glass-card">
                                    <div class="card-header">
                                        <div class="card-title">Top Performers</div>
                                    </div>
                                    <div class="leaderboard-list" id="mini-leaderboard">
                                        ${await this.renderMiniLeaderboard()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Animate progress ring
                setTimeout(() => {
                    const circle = document.getElementById('progress-circle');
                    if (circle) {
                        const circumference = 2 * Math.PI * 65;
                        const offset = circumference - (progressPercent / 100) * circumference;
                        circle.style.strokeDashoffset = offset;
                    }
                }, 100);

                this.bindEvents();

            } catch (error) {
                main.innerHTML = `<div class="empty-state"><h3>Failed to load dashboard</h3><p>${error.message}</p></div>`;
            }
        },

        renderTasks(tasks) {
            if (!tasks.length) {
                return '<div class="empty-state"><p>No tasks yet</p></div>';
            }

            return tasks.slice(0, 5).map(task => `
                <div class="task-item ${task.status === 'completed' ? 'completed' : ''}" data-id="${task.id}">
                    <div class="task-checkbox" data-action="toggle"></div>
                    <div class="task-content">
                        <div class="task-title">${Utils.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span class="task-priority priority-${task.priority}">${task.priority}</span>
                            <span class="task-status status-${task.status}">${task.status.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <div class="task-points">
                        <span>⭐</span>
                        <span>+${task.points_reward}</span>
                    </div>
                </div>
            `).join('');
        },

        async renderMiniLeaderboard() {
            try {
                const response = await API.leaderboard.get({ limit: 3 });
                const rankings = response.data.rankings;

                return rankings.map((user, idx) => `
                    <div class="leaderboard-item top-${idx + 1} ${user.isCurrentUser ? 'current-user' : ''}">
                        <div class="leaderboard-rank">${idx + 1}</div>
                        <div class="leaderboard-avatar">${user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${user.full_name}${user.isCurrentUser ? ' (You)' : ''}</div>
                            <div class="leaderboard-stats">${user.tasks_completed} tasks</div>
                        </div>
                        <div class="leaderboard-points">${Utils.formatNumber(user.total_points)}</div>
                    </div>
                `).join('');
            } catch {
                return '<p>Failed to load leaderboard</p>';
            }
        },

        bindEvents() {
            document.querySelectorAll('#dashboard-tasks .task-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    const taskId = item.dataset.id;

                    if (e.target.closest('[data-action="toggle"]')) {
                        await this.completeTask(taskId, item);
                    } else {
                        Pages.tasks.showTaskModal(taskId);
                    }
                });
            });
        },

        async completeTask(taskId, element) {
            try {
                const response = await API.tasks.complete(taskId);
                const { pointsEarned, starsEarned, newLevel } = response.data;

                // Update UI
                element.classList.add('completed');

                // Show points animation
                const rect = element.getBoundingClientRect();
                Utils.showPointsAnimation(rect.right - 50, rect.top, pointsEarned);

                // Update user stats
                Auth.currentUser.totalPoints += pointsEarned;
                Auth.currentUser.starsBalance += starsEarned;
                App.updateUserUI();

                // Show toast
                Utils.showToast('success', 'Task Completed!', `+${pointsEarned} points earned`);

                // Level up notification
                if (newLevel) {
                    setTimeout(() => {
                        Utils.showToast('success', 'Level Up! 🎉', `You're now level ${newLevel}`);
                    }, 1000);
                }

                // Emit event
                App.emit('task:update', { taskId, status: 'completed' });

            } catch (error) {
                Utils.showToast('error', 'Error', error.error || 'Failed to complete task');
            }
        }
    },

    // ============================================
    // TASKS PAGE
    // ============================================
    tasks: {
        currentFilter: 'all',

        async render() {
            const main = document.getElementById('main-content');
            App.showLoading(main);

            try {
                const response = await API.tasks.getAll({ limit: 50 });
                const tasks = response.data.tasks;

                main.innerHTML = `
                    <div class="page-section active" id="page-tasks">
                        <div class="page-header">
                            <h1 class="page-title">My Tasks</h1>
                            <p class="page-subtitle">Manage and track your assignments</p>
                        </div>

                        <div class="glass-card">
                            <div class="card-header">
                                <div class="tabs" id="task-tabs">
                                    <div class="tab active" data-filter="all">All (${tasks.length})</div>
                                    <div class="tab" data-filter="pending">Pending (${tasks.filter(t => t.status === 'pending').length})</div>
                                    <div class="tab" data-filter="in_progress">In Progress (${tasks.filter(t => t.status === 'in_progress').length})</div>
                                    <div class="tab" data-filter="completed">Completed (${tasks.filter(t => t.status === 'completed').length})</div>
                                </div>
                                ${Auth.canManage() ? '<button class="btn btn-primary" id="new-task-btn">+ New Task</button>' : ''}
                            </div>

                            <div class="task-list" id="tasks-list">
                                ${this.renderTasks(tasks)}
                            </div>
                        </div>
                    </div>
                `;

                this.allTasks = tasks;
                this.bindEvents();

            } catch (error) {
                main.innerHTML = `<div class="empty-state"><h3>Failed to load tasks</h3><p>${error.message}</p></div>`;
            }
        },

        renderTasks(tasks, filter = 'all') {
            let filtered = tasks;
            if (filter !== 'all') {
                filtered = tasks.filter(t => t.status === filter);
            }

            if (!filtered.length) {
                return '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No tasks</h3><p>No tasks match the current filter</p></div>';
            }

            return filtered.map(task => `
                <div class="task-item ${task.status === 'completed' ? 'completed' : ''}" data-id="${task.id}">
                    <div class="task-checkbox" data-action="toggle"></div>
                    <div class="task-content">
                        <div class="task-title">${Utils.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span class="task-priority priority-${task.priority}">${task.priority}</span>
                            <span class="task-difficulty difficulty-${task.difficulty}">${task.difficulty}</span>
                            <span class="task-status status-${task.status}">${task.status.replace('_', ' ')}</span>
                            ${task.deadline ? `<span>📅 ${Utils.formatDate(task.deadline)}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-points">
                        <span>⭐</span>
                        <span>+${task.points_reward}</span>
                    </div>
                </div>
            `).join('');
        },

        bindEvents() {
            // Tab filtering
            document.querySelectorAll('#task-tabs .tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('#task-tabs .tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const filter = tab.dataset.filter;
                    document.getElementById('tasks-list').innerHTML = this.renderTasks(this.allTasks, filter);
                    this.bindTaskEvents();
                });
            });

            // New task button
            document.getElementById('new-task-btn')?.addEventListener('click', () => {
                this.showNewTaskModal();
            });

            this.bindTaskEvents();
        },

        bindTaskEvents() {
            document.querySelectorAll('#tasks-list .task-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    const taskId = item.dataset.id;

                    if (e.target.closest('[data-action="toggle"]')) {
                        await Pages.dashboard.completeTask(taskId, item);
                    } else {
                        this.showTaskModal(taskId);
                    }
                });
            });
        },

        async showTaskModal(taskId) {
            const modal = document.getElementById('task-modal');
            const title = document.getElementById('task-modal-title');
            const body = document.getElementById('task-modal-body');

            modal.classList.remove('hidden');
            body.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

            try {
                const response = await API.tasks.getById(taskId);
                const { task, submissions } = response.data;

                title.textContent = task.title;
                body.innerHTML = `
                    <div class="task-detail">
                        <div class="task-meta" style="margin-bottom: 20px;">
                            <span class="task-priority priority-${task.priority}">${task.priority}</span>
                            <span class="task-difficulty difficulty-${task.difficulty}">${task.difficulty}</span>
                            <span class="task-status status-${task.status}">${task.status.replace('_', ' ')}</span>
                            <span class="task-points"><span>⭐</span> +${task.points_reward}</span>
                        </div>

                        ${task.description ? `<p style="margin-bottom: 20px; color: var(--text-secondary);">${Utils.escapeHtml(task.description)}</p>` : ''}

                        ${task.deadline ? `<p style="margin-bottom: 20px;"><strong>Deadline:</strong> ${Utils.formatDate(task.deadline, true)}</p>` : ''}

                        ${task.assignee ? `<p style="margin-bottom: 20px;"><strong>Assigned to:</strong> ${task.assignee.fullName}</p>` : ''}

                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            ${task.status !== 'completed' ? `
                                <button class="btn btn-primary" id="complete-task-btn">Complete Task</button>
                                <button class="btn btn-ghost" id="submit-solution-btn">Submit Solution</button>
                            ` : ''}
                        </div>

                        ${submissions.length > 0 ? `
                            <h4 style="margin-bottom: 15px;">Submissions</h4>
                            <div class="submissions-list">
                                ${submissions.map(sub => `
                                    <div class="submission-item" style="padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 10px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                            <strong>${sub.user_name}</strong>
                                            <span style="color: var(--text-muted);">${Utils.timeAgo(sub.created_at)}</span>
                                        </div>
                                        ${sub.content ? `<p style="color: var(--text-secondary);">${Utils.escapeHtml(sub.content)}</p>` : ''}
                                        ${sub.file_path ? `
                                            <button class="btn btn-ghost btn-sm" onclick="Pages.tasks.viewFile('${sub.file_path}', '${sub.file_name}', '${sub.file_type}', '${sub.code_language || ''}')">
                                                📎 ${sub.file_name}
                                            </button>
                                        ` : ''}
                                        ${sub.code_language ? `<span class="code-language" style="font-size: 11px; color: var(--text-muted);">${sub.code_language}</span>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;

                // Bind modal events
                document.getElementById('complete-task-btn')?.addEventListener('click', async () => {
                    await Pages.dashboard.completeTask(taskId, document.querySelector(`[data-id="${taskId}"]`));
                    modal.classList.add('hidden');
                    this.render();
                });

                document.getElementById('submit-solution-btn')?.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    this.showSubmitModal(taskId);
                });

            } catch (error) {
                body.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
            }
        },

        async showNewTaskModal() {
            const modal = document.getElementById('new-task-modal');
            modal.classList.remove('hidden');

            // Load users for assignment
            try {
                const response = await API.chat.getUsers();
                const select = document.getElementById('new-task-assignee');
                select.innerHTML = '<option value="">Select employee</option>' +
                    response.data.users.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('');
            } catch (e) {
                console.error('Failed to load users:', e);
            }

            // Handle form submission
            const form = document.getElementById('new-task-form');
            form.onsubmit = async (e) => {
                e.preventDefault();

                try {
                    await API.tasks.create({
                        title: document.getElementById('new-task-title').value,
                        description: document.getElementById('new-task-description').value,
                        priority: document.getElementById('new-task-priority').value,
                        difficulty: document.getElementById('new-task-difficulty').value,
                        pointsReward: parseInt(document.getElementById('new-task-points').value),
                        deadline: document.getElementById('new-task-deadline').value || null,
                        assigneeId: document.getElementById('new-task-assignee').value || null
                    });

                    modal.classList.add('hidden');
                    form.reset();
                    Utils.showToast('success', 'Success', 'Task created successfully');
                    this.render();

                } catch (error) {
                    Utils.showToast('error', 'Error', error.error || 'Failed to create task');
                }
            };
        },

        showSubmitModal(taskId) {
            const modal = document.getElementById('submit-modal');
            modal.classList.remove('hidden');
            document.getElementById('submit-task-id').value = taskId;

            // Handle submission type changes
            document.querySelectorAll('input[name="submit-type"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    document.getElementById('submit-text-group').classList.toggle('hidden', radio.value !== 'text');
                    document.getElementById('submit-code-group').classList.toggle('hidden', radio.value !== 'code');
                    document.getElementById('submit-file-group').classList.toggle('hidden', radio.value !== 'file');
                });
            });

            // Handle file upload
            const fileZone = document.getElementById('file-upload-zone');
            const fileInput = document.getElementById('submit-file');
            const filePreview = document.getElementById('file-preview');
            const fileName = document.getElementById('file-name');
            const fileRemove = document.getElementById('file-remove');

            fileZone.addEventListener('click', () => fileInput.click());

            fileZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileZone.classList.add('dragover');
            });

            fileZone.addEventListener('dragleave', () => {
                fileZone.classList.remove('dragover');
            });

            fileZone.addEventListener('drop', (e) => {
                e.preventDefault();
                fileZone.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    showFilePreview(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    showFilePreview(fileInput.files[0]);
                }
            });

            function showFilePreview(file) {
                fileName.textContent = file.name;
                filePreview.classList.remove('hidden');
                fileZone.classList.add('hidden');
            }

            fileRemove.addEventListener('click', () => {
                fileInput.value = '';
                filePreview.classList.add('hidden');
                fileZone.classList.remove('hidden');
            });

            // Handle form submission
            const form = document.getElementById('submit-form');
            form.onsubmit = async (e) => {
                e.preventDefault();

                const type = document.querySelector('input[name="submit-type"]:checked').value;
                const formData = new FormData();

                if (type === 'text') {
                    formData.append('content', document.getElementById('submit-content').value);
                } else if (type === 'code') {
                    formData.append('content', document.getElementById('submit-code').value);
                    formData.append('codeLanguage', document.getElementById('submit-language').value);
                } else if (type === 'file' && fileInput.files.length) {
                    formData.append('file', fileInput.files[0]);
                }

                try {
                    await API.tasks.submit(taskId, formData);
                    modal.classList.add('hidden');
                    form.reset();
                    Utils.showToast('success', 'Success', 'Solution submitted!');
                    this.render();
                } catch (error) {
                    Utils.showToast('error', 'Error', error.error || 'Failed to submit');
                }
            };
        },

        viewFile(filePath, fileName, fileType, codeLanguage) {
            const modal = document.getElementById('file-viewer-modal');
            const title = document.getElementById('file-viewer-title');
            const body = document.getElementById('file-viewer-body');

            title.textContent = fileName;
            modal.classList.remove('hidden');
            body.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

            // Determine viewer type
            if (fileType?.includes('spreadsheet') || fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')) {
                this.viewExcel(filePath, body);
            } else if (codeLanguage || fileType?.startsWith('text/') || fileType === 'application/javascript') {
                this.viewCode(filePath, codeLanguage || 'plaintext', body);
            } else if (fileType?.startsWith('image/')) {
                body.innerHTML = `<img src="${API.files.getUrl(filePath)}" alt="${fileName}" style="max-width: 100%;">`;
            } else {
                body.innerHTML = `
                    <div class="empty-state">
                        <p>Preview not available for this file type</p>
                        <a href="${API.files.getUrl(filePath)}" download="${fileName}" class="btn btn-primary">Download File</a>
                    </div>
                `;
            }
        },

        async viewCode(filePath, language, container) {
            try {
                const response = await fetch(API.files.getUrl(filePath));
                const code = await response.text();

                container.innerHTML = `
                    <div class="code-viewer">
                        <div class="code-header">
                            <span class="code-language">${language}</span>
                            <button class="btn btn-ghost btn-sm" onclick="Utils.copyToClipboard(\`${Utils.escapeHtml(code).replace(/`/g, '\\`')}\`)">Copy</button>
                        </div>
                        <div class="code-content">
                            <pre><code class="language-${language}">${Utils.escapeHtml(code)}</code></pre>
                        </div>
                    </div>
                `;

                // Highlight code
                hljs.highlightAll();
            } catch (error) {
                container.innerHTML = `<div class="empty-state"><p>Failed to load file</p></div>`;
            }
        },

        async viewExcel(filePath, container) {
            try {
                const response = await fetch(API.files.getUrl(filePath));
                const data = await response.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const html = XLSX.utils.sheet_to_html(sheet, { editable: false });

                container.innerHTML = `
                    <div class="excel-viewer">
                        ${html.replace('<table>', '<table class="excel-table">')}
                    </div>
                `;
            } catch (error) {
                container.innerHTML = `<div class="empty-state"><p>Failed to load Excel file</p></div>`;
            }
        }
    },

    // ============================================
    // LEADERBOARD PAGE
    // ============================================
    leaderboard: {
        async render() {
            const main = document.getElementById('main-content');
            App.showLoading(main);

            try {
                const [leaderboardRes, badgesRes] = await Promise.all([
                    API.leaderboard.get({ limit: 20 }),
                    API.leaderboard.getBadges()
                ]);

                const rankings = leaderboardRes.data.rankings;
                const badges = badgesRes.data.badges;

                main.innerHTML = `
                    <div class="page-section active">
                        <div class="page-header">
                            <h1 class="page-title">Leaderboard 🏆</h1>
                            <p class="page-subtitle">See how you rank among your colleagues</p>
                        </div>

                        <div class="content-grid">
                            <div class="glass-card">
                                <div class="card-header">
                                    <div class="tabs" id="leaderboard-tabs">
                                        <div class="tab active" data-period="all">All Time</div>
                                        <div class="tab" data-period="monthly">Monthly</div>
                                        <div class="tab" data-period="weekly">Weekly</div>
                                    </div>
                                </div>

                                <div class="leaderboard-list" id="leaderboard-list">
                                    ${this.renderLeaderboard(rankings)}
                                </div>
                            </div>

                            <div class="glass-card">
                                <div class="card-title" style="margin-bottom: 20px;">Your Badges</div>
                                <div class="badges-grid">
                                    ${badges.map(badge => `
                                        <div class="badge-item ${badge.earned ? '' : 'locked'}" title="${badge.description}">
                                            <div class="badge-icon">${badge.icon}</div>
                                            <div class="badge-name">${badge.name}</div>
                                            <div class="badge-tier">${badge.tier}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                this.bindEvents();

            } catch (error) {
                main.innerHTML = `<div class="empty-state"><h3>Failed to load leaderboard</h3><p>${error.message}</p></div>`;
            }
        },

        renderLeaderboard(rankings) {
            return rankings.map((user, idx) => `
                <div class="leaderboard-item ${idx < 3 ? 'top-' + (idx + 1) : ''} ${user.isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank">${idx + 1}</div>
                    <div class="leaderboard-avatar">${user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${user.full_name}${user.isCurrentUser ? ' (You)' : ''}</div>
                        <div class="leaderboard-stats">Level ${user.level} • ${user.tasks_completed} tasks • 🔥 ${user.streak_days} days</div>
                    </div>
                    <div class="leaderboard-points">${Utils.formatNumber(user.total_points || user.period_points || 0)}</div>
                </div>
            `).join('');
        },

        bindEvents() {
            document.querySelectorAll('#leaderboard-tabs .tab').forEach(tab => {
                tab.addEventListener('click', async () => {
                    document.querySelectorAll('#leaderboard-tabs .tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    const period = tab.dataset.period;
                    const list = document.getElementById('leaderboard-list');
                    list.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

                    try {
                        const response = await API.leaderboard.get({ period, limit: 20 });
                        list.innerHTML = this.renderLeaderboard(response.data.rankings);
                    } catch (error) {
                        list.innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
                    }
                });
            });
        }
    },

    // ============================================
    // SHOP PAGE
    // ============================================
    shop: {
        currentCategory: 'all',
        items: [],

        async render() {
            const main = document.getElementById('main-content');
            App.showLoading(main);

            try {
                const response = await API.shop.getItems();
                this.items = response.data.items;

                const categories = [...new Set(this.items.map(i => i.category))];

                main.innerHTML = `
                    <div class="page-section active">
                        <div class="page-header">
                            <h1 class="page-title">Avatar Shop 🛒</h1>
                            <p class="page-subtitle">Customize your avatar with unique items</p>
                        </div>

                        <div class="glass-card" style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div class="shop-filters" id="shop-filters">
                                    <button class="shop-filter active" data-category="all">All</button>
                                    ${categories.map(cat => `
                                        <button class="shop-filter" data-category="${cat}">${cat}</button>
                                    `).join('')}
                                </div>
                                <div class="nav-stars" style="font-size: 18px;">
                                    <span>⭐</span>
                                    <span style="font-weight: 700;">${Utils.formatNumber(Auth.currentUser?.starsBalance || 0)}</span>
                                    <span style="color: var(--text-muted); font-size: 14px;">Stars</span>
                                </div>
                            </div>
                        </div>

                        <div class="shop-grid" id="shop-grid">
                            ${this.renderItems(this.items)}
                        </div>
                    </div>
                `;

                this.bindEvents();

            } catch (error) {
                main.innerHTML = `<div class="empty-state"><h3>Failed to load shop</h3><p>${error.message}</p></div>`;
            }
        },

        renderItems(items) {
            const getRarityEmoji = (rarity) => {
                const emojis = { common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟡' };
                return emojis[rarity] || '⚪';
            };

            return items.map(item => `
                <div class="shop-item ${item.owned ? 'owned' : ''}" data-id="${item.id}">
                    <div class="shop-item-preview">${getRarityEmoji(item.rarity)}</div>
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-category">${item.category}</div>
                    <div class="shop-item-rarity rarity-${item.rarity}">${item.rarity}</div>
                    <div class="shop-item-price ${item.owned ? 'owned' : ''}">
                        ${item.owned ? '✓ Owned' : `⭐ ${item.price_stars}`}
                    </div>
                </div>
            `).join('');
        },

        bindEvents() {
            // Category filters
            document.querySelectorAll('#shop-filters .shop-filter').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#shop-filters .shop-filter').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const category = btn.dataset.category;
                    const filtered = category === 'all' ? this.items : this.items.filter(i => i.category === category);
                    document.getElementById('shop-grid').innerHTML = this.renderItems(filtered);
                    this.bindItemEvents();
                });
            });

            this.bindItemEvents();
        },

        bindItemEvents() {
            document.querySelectorAll('.shop-item:not(.owned)').forEach(item => {
                item.addEventListener('click', async () => {
                    const itemId = item.dataset.id;
                    const shopItem = this.items.find(i => i.id === itemId);

                    if (Auth.currentUser.starsBalance < shopItem.price_stars) {
                        Utils.showToast('warning', 'Insufficient Stars', `You need ${shopItem.price_stars - Auth.currentUser.starsBalance} more stars`);
                        return;
                    }

                    if (confirm(`Purchase "${shopItem.name}" for ${shopItem.price_stars} stars?`)) {
                        try {
                            const response = await API.shop.purchase(itemId);
                            Auth.currentUser.starsBalance = response.data.newBalance;
                            App.updateUserUI();

                            Utils.showToast('success', 'Purchase Successful!', `You bought ${shopItem.name}`);

                            // Update item in list
                            shopItem.owned = true;
                            item.classList.add('owned');
                            item.querySelector('.shop-item-price').innerHTML = '✓ Owned';

                        } catch (error) {
                            Utils.showToast('error', 'Purchase Failed', error.error || 'Failed to purchase item');
                        }
                    }
                });
            });
        }
    },

    // ============================================
    // PROFILE PAGE
    // ============================================
    profile: {
        async render() {
            const main = document.getElementById('main-content');
            App.showLoading(main);

            try {
                const [profileRes, inventoryRes, statsRes] = await Promise.all([
                    API.auth.getProfile(),
                    API.shop.getInventory(),
                    API.leaderboard.getStats()
                ]);

                const user = profileRes.data.user;
                const badges = profileRes.data.badges;
                const inventory = inventoryRes.data.inventory;
                const stats = statsRes.data;

                main.innerHTML = `
                    <div class="page-section active">
                        <div class="page-header">
                            <h1 class="page-title">My Profile</h1>
                            <p class="page-subtitle">Manage your account and avatar</p>
                        </div>

                        <div class="content-grid">
                            <div>
                                <div class="glass-card profile-avatar-section" style="margin-bottom: 20px;">
                                    <div class="avatar-display">
                                        <div class="avatar-container" id="profile-avatar">
                                            <div class="avatar-background"></div>
                                            <div class="avatar-body avatar-idle"></div>
                                            <div class="avatar-head"></div>
                                            <div class="avatar-accessory"></div>
                                            <div class="avatar-effect"></div>
                                        </div>
                                        <div class="avatar-level-ring"></div>
                                        <div class="avatar-level">Lvl ${user.level}</div>
                                    </div>
                                    <h2 style="margin-top: 20px;">${user.fullName}</h2>
                                    <p style="color: var(--text-secondary);">${user.department || 'No department'} • ${user.role}</p>

                                    <div class="profile-avatar-controls">
                                        <button class="avatar-action-btn" onclick="AvatarSystem.playAnimation('wave')">👋 Wave</button>
                                        <button class="avatar-action-btn" onclick="AvatarSystem.playAnimation('jump')">🦘 Jump</button>
                                        <button class="avatar-action-btn" onclick="AvatarSystem.playAnimation('spin')">🔄 Spin</button>
                                    </div>
                                </div>

                                <div class="glass-card">
                                    <div class="card-title" style="margin-bottom: 20px;">Your Inventory</div>

                                    <div class="equipped-items">
                                        ${['head', 'body', 'accessory', 'background', 'effect', 'pet'].map(slot => {
                                            const equipped = inventory.find(i => i.category === slot && i.is_equipped);
                                            return `
                                                <div class="equipped-slot ${equipped ? 'filled' : ''}" data-slot="${slot}">
                                                    <div class="equipped-slot-icon">${equipped ? '✓' : this.getSlotIcon(slot)}</div>
                                                    <div class="equipped-slot-label">${slot}</div>
                                                    ${equipped ? `<div class="equipped-slot-name">${equipped.name}</div>` : ''}
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>

                                    <h4 style="margin: 20px 0 15px;">All Items (${inventory.length})</h4>
                                    <div class="inventory-grid">
                                        ${inventory.length > 0 ? inventory.map(item => `
                                            <div class="inventory-item ${item.is_equipped ? 'equipped' : ''}" data-id="${item.item_id}" title="${item.name}">
                                                <div class="inventory-item-icon">${this.getRarityEmoji(item.rarity)}</div>
                                                <div class="inventory-item-name">${item.name}</div>
                                            </div>
                                        `).join('') : '<p style="color: var(--text-muted); grid-column: 1/-1;">No items yet. Visit the shop!</p>'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="glass-card" style="margin-bottom: 20px;">
                                    <div class="card-title" style="margin-bottom: 20px;">Statistics</div>

                                    <div style="display: grid; gap: 15px;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: var(--text-secondary);">Total Points</span>
                                            <span style="font-weight: 700;">${Utils.formatNumber(user.totalPoints)}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: var(--text-secondary);">Stars Balance</span>
                                            <span style="font-weight: 700;">⭐ ${Utils.formatNumber(user.starsBalance)}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: var(--text-secondary);">Current Streak</span>
                                            <span style="font-weight: 700;">🔥 ${user.streakDays} days</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: var(--text-secondary);">Tasks Completed</span>
                                            <span style="font-weight: 700;">${stats.taskStats?.completed || 0}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: var(--text-secondary);">Badges Earned</span>
                                            <span style="font-weight: 700;">${badges.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="glass-card" style="margin-bottom: 20px;">
                                    <div class="card-title" style="margin-bottom: 20px;">Badges (${badges.length})</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                        ${badges.map(badge => `
                                            <div class="badge-item" style="padding: 10px;" title="${badge.description}">
                                                <div class="badge-icon" style="font-size: 24px;">${badge.icon}</div>
                                            </div>
                                        `).join('') || '<p style="color: var(--text-muted);">No badges yet</p>'}
                                    </div>
                                </div>

                                <div class="glass-card">
                                    <div class="card-title" style="margin-bottom: 20px;">Account Settings</div>
                                    <button class="btn btn-ghost btn-full" style="margin-bottom: 10px;" onclick="Pages.profile.editProfile()">Edit Profile</button>
                                    <button class="btn btn-ghost btn-full" style="margin-bottom: 10px;" onclick="Pages.profile.changePassword()">Change Password</button>
                                    <button class="btn btn-danger btn-full" onclick="Auth.logout()">Logout</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                this.inventory = inventory;
                this.bindEvents();

                // Initialize avatar
                AvatarSystem.init(user.avatarConfig);

            } catch (error) {
                main.innerHTML = `<div class="empty-state"><h3>Failed to load profile</h3><p>${error.message}</p></div>`;
            }
        },

        getSlotIcon(slot) {
            const icons = { head: '🎩', body: '👕', accessory: '💎', background: '🖼️', effect: '✨', pet: '🐾' };
            return icons[slot] || '❓';
        },

        getRarityEmoji(rarity) {
            const emojis = { common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟡' };
            return emojis[rarity] || '⚪';
        },

        bindEvents() {
            // Inventory items click to equip
            document.querySelectorAll('.inventory-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const itemId = item.dataset.id;
                    const isEquipped = item.classList.contains('equipped');

                    try {
                        await API.shop.equipItem(itemId, !isEquipped);
                        Utils.showToast('success', isEquipped ? 'Unequipped' : 'Equipped', 'Avatar updated');
                        this.render();
                    } catch (error) {
                        Utils.showToast('error', 'Error', error.error || 'Failed to update');
                    }
                });
            });
        },

        editProfile() {
            const fullName = prompt('Enter your full name:', Auth.currentUser?.fullName);
            if (fullName) {
                API.auth.updateProfile({ fullName }).then(() => {
                    Auth.currentUser.fullName = fullName;
                    Utils.showToast('success', 'Profile Updated');
                    this.render();
                }).catch(error => {
                    Utils.showToast('error', 'Error', error.error || 'Failed to update');
                });
            }
        },

        changePassword() {
            const currentPassword = prompt('Enter current password:');
            if (!currentPassword) return;

            const newPassword = prompt('Enter new password (min 8 chars, upper+lower+number):');
            if (!newPassword) return;

            API.auth.changePassword(currentPassword, newPassword).then(() => {
                Utils.showToast('success', 'Password Changed');
            }).catch(error => {
                Utils.showToast('error', 'Error', error.error || 'Failed to change password');
            });
        }
    }
};

window.Pages = Pages;
