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
                element?.classList.add('completed');

                // Show points animation
                if (element) {
                    const rect = element.getBoundingClientRect();
                    Utils.showPointsAnimation(rect.right - 50, rect.top, pointsEarned);
                }

                // Update user stats
                Auth.currentUser.totalPoints += pointsEarned;
                Auth.currentUser.starsBalance += starsEarned;
                if (newLevel) {
                    Auth.currentUser.level = newLevel;
                }
                App.updateUserUI();

                // Update avatar if initialized
                if (window.AvatarSystem?.isInitialized) {
                    AvatarSystem.addExperience(pointsEarned);
                    if (newLevel) {
                        AvatarSystem.setLevel(newLevel, Auth.currentUser.totalPoints);
                        AvatarSystem.playAnimation('celebrate');
                    }
                }

                // Show toast
                Utils.showToast('success', 'Task Completed!', `+${pointsEarned} points earned`);

                // Level up notification with special animation
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
                const escapedCode = Utils.escapeHtml(code);
                const escapedLanguage = Utils.escapeHtml(language);
                const codeId = 'viewer-code-' + Date.now();

                container.innerHTML = `
                    <div class="code-viewer">
                        <div class="code-header">
                            <span class="code-language">${escapedLanguage}</span>
                            <button class="btn btn-ghost btn-sm" id="copy-code-btn">Copy</button>
                        </div>
                        <div class="code-content">
                            <pre><code id="${codeId}" class="language-${escapedLanguage}">${escapedCode}</code></pre>
                        </div>
                    </div>
                `;

                // Bind copy button
                const copyBtn = document.getElementById('copy-code-btn');
                const codeElement = document.getElementById(codeId);
                copyBtn?.addEventListener('click', () => {
                    if (codeElement) {
                        Utils.copyToClipboard(codeElement.textContent || codeElement.innerText);
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
                    }
                });

                // Highlight code safely
                if (typeof hljs !== 'undefined' && codeElement) {
                    try {
                        hljs.highlightElement(codeElement);
                    } catch (e) {
                        console.warn('Code highlighting failed:', e);
                    }
                }
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

            const getBannerPreview = (item) => {
                // Parse animation_data to get colors
                let animData = {};
                try {
                    animData = item.animationData || (item.animation_data ? JSON.parse(item.animation_data) : {});
                } catch (e) {
                    animData = {};
                }

                if (animData.colors && animData.colors.length > 0) {
                    const colors = animData.colors;
                    const gradient = colors.length > 1
                        ? `linear-gradient(135deg, ${colors.join(', ')})`
                        : colors[0];
                    return `<div class="banner-preview" style="background: ${gradient};"></div>`;
                }

                return `<div class="banner-preview" style="background: var(--gradient-primary);"></div>`;
            };

            const getCategoryIcon = (category) => {
                const icons = {
                    head: '🎩', body: '👕', accessory: '💎',
                    background: '🖼️', effect: '✨', pet: '🐾', banner: '🏞️'
                };
                return icons[category] || '❓';
            };

            return items.map(item => {
                const isBanner = item.category === 'banner';
                const preview = isBanner
                    ? getBannerPreview(item)
                    : `<span class="item-emoji">${getRarityEmoji(item.rarity)}</span>`;

                return `
                    <div class="shop-item ${item.owned ? 'owned' : ''} ${isBanner ? 'banner-item' : ''} hover-lift" data-id="${item.id}">
                        <div class="shop-item-preview ${isBanner ? 'is-banner' : ''}">
                            ${preview}
                        </div>
                        <div class="shop-item-info">
                            <div class="shop-item-name">${item.name}</div>
                            <div class="shop-item-category">
                                <span class="category-icon">${getCategoryIcon(item.category)}</span>
                                ${item.category}
                            </div>
                            <div class="shop-item-rarity rarity-${item.rarity}">${item.rarity}</div>
                            <div class="shop-item-price ${item.owned ? 'owned' : ''}">
                                ${item.owned ? '✓ Owned' : `⭐ ${item.price_stars}`}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
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
        equippedBanner: null,

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

                // Find equipped banner
                const equippedBanner = inventory.find(i => i.category === 'banner' && i.is_equipped);
                this.equippedBanner = equippedBanner;

                // Get banner style
                const bannerStyle = this.getBannerStyle(equippedBanner);

                main.innerHTML = `
                    <div class="page-section active">
                        <!-- YouTube-style Profile Banner -->
                        <div class="profile-banner" style="${bannerStyle}">
                            <div class="profile-banner-overlay"></div>
                            <button class="profile-banner-edit" onclick="Pages.profile.changeBanner()">
                                📷 Change Banner
                            </button>
                            ${equippedBanner ? `<span class="banner-name">${equippedBanner.name}</span>` : ''}
                        </div>

                        <!-- Profile Header with Avatar -->
                        <div class="profile-header-section">
                            <div class="profile-avatar-wrapper">
                                <div class="profile-avatar-photo ${this.getAvatarFrameClass(inventory)}" id="profile-avatar">
                                    ${user.avatarUrl ?
                                        `<img src="${user.avatarUrl}" alt="Avatar" class="avatar-image">` :
                                        `<div class="avatar-initials">${Utils.getInitials(user.fullName)}</div>`
                                    }
                                    <button class="avatar-edit-btn" onclick="Pages.profile.changeAvatar()">
                                        📷
                                    </button>
                                    ${this.getAvatarEffect(inventory)}
                                </div>
                                <div class="profile-level-badge">
                                    <span class="level-number">${user.level}</span>
                                    <span class="level-label">LVL</span>
                                </div>
                            </div>

                            <div class="profile-info">
                                <h1 class="profile-name animated-text">${user.fullName}</h1>
                                <p class="profile-role">${user.department || 'No department'} • ${user.role}</p>
                                <div class="profile-stats-row">
                                    <div class="profile-stat">
                                        <span class="stat-value">${Utils.formatNumber(user.totalPoints)}</span>
                                        <span class="stat-label">Points</span>
                                    </div>
                                    <div class="profile-stat">
                                        <span class="stat-value">⭐ ${Utils.formatNumber(user.starsBalance)}</span>
                                        <span class="stat-label">Stars</span>
                                    </div>
                                    <div class="profile-stat">
                                        <span class="stat-value">🔥 ${user.streakDays}</span>
                                        <span class="stat-label">Streak</span>
                                    </div>
                                    <div class="profile-stat">
                                        <span class="stat-value">${stats.taskStats?.completed || 0}</span>
                                        <span class="stat-label">Tasks</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Avatar Customization Bar -->
                        <div class="avatar-actions-bar glass-card">
                            <span class="actions-label">Customize:</span>
                            <div class="avatar-actions-buttons">
                                <button class="avatar-action-btn ripple" onclick="Pages.profile.changeAvatar()">📷 Photo</button>
                                <button class="avatar-action-btn ripple" onclick="Pages.profile.changeFrame()">🖼️ Frame</button>
                                <button class="avatar-action-btn ripple" onclick="Pages.profile.changeEffect()">✨ Effect</button>
                                <button class="avatar-action-btn ripple" onclick="Pages.profile.changeBanner()">🎨 Banner</button>
                            </div>
                        </div>

                        <div class="content-grid">
                            <div>

                                <div class="glass-card">
                                    <div class="card-title" style="margin-bottom: 20px;">Your Inventory</div>

                                    <div class="equipped-items">
                                        ${['head', 'body', 'accessory', 'background', 'effect', 'pet', 'banner'].map(slot => {
                                            const equipped = inventory.find(i => i.category === slot && i.is_equipped);
                                            return `
                                                <div class="equipped-slot ${equipped ? 'filled' : ''} hover-scale" data-slot="${slot}">
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
                                            <div class="inventory-item ${item.is_equipped ? 'equipped' : ''} hover-scale"
                                                 data-id="${item.item_id}"
                                                 data-category="${item.category}"
                                                 title="${item.name} (${item.category})">
                                                <div class="inventory-item-icon">${this.getItemIcon(item)}</div>
                                                <div class="inventory-item-name">${item.name}</div>
                                            </div>
                                        `).join('') : '<p style="color: var(--text-muted); grid-column: 1/-1;">No items yet. Visit the shop!</p>'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="glass-card hover-lift" style="margin-bottom: 20px;">
                                    <div class="card-title" style="margin-bottom: 20px;">🏆 Achievements</div>
                                    <div class="achievements-progress">
                                        <div class="achievement-item">
                                            <div class="achievement-icon">🎯</div>
                                            <div class="achievement-info">
                                                <span>Tasks Master</span>
                                                <div class="achievement-bar">
                                                    <div class="achievement-fill" style="width: ${Math.min(100, (stats.taskStats?.completed || 0) * 2)}%"></div>
                                                </div>
                                                <span class="achievement-progress">${stats.taskStats?.completed || 0}/50</span>
                                            </div>
                                        </div>
                                        <div class="achievement-item">
                                            <div class="achievement-icon">🔥</div>
                                            <div class="achievement-info">
                                                <span>Streak Champion</span>
                                                <div class="achievement-bar">
                                                    <div class="achievement-fill" style="width: ${Math.min(100, (user.streakDays || 0) * 3.33)}%"></div>
                                                </div>
                                                <span class="achievement-progress">${user.streakDays || 0}/30 days</span>
                                            </div>
                                        </div>
                                        <div class="achievement-item">
                                            <div class="achievement-icon">⭐</div>
                                            <div class="achievement-info">
                                                <span>Star Collector</span>
                                                <div class="achievement-bar">
                                                    <div class="achievement-fill" style="width: ${Math.min(100, (user.totalPoints || 0) / 100)}%"></div>
                                                </div>
                                                <span class="achievement-progress">${Utils.formatNumber(user.totalPoints || 0)}/10K</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="glass-card hover-lift" style="margin-bottom: 20px;">
                                    <div class="card-title" style="margin-bottom: 20px;">🏅 Badges (${badges.length})</div>
                                    <div class="badges-showcase">
                                        ${badges.length > 0 ? badges.map(badge => `
                                            <div class="badge-showcase-item pulse-glow" title="${badge.description}">
                                                <div class="badge-icon">${badge.icon}</div>
                                                <div class="badge-name">${badge.name}</div>
                                            </div>
                                        `).join('') : '<p style="color: var(--text-muted);">No badges yet. Complete tasks to earn badges!</p>'}
                                    </div>
                                </div>

                                <div class="glass-card hover-lift">
                                    <div class="card-title" style="margin-bottom: 20px;">⚙️ Account Settings</div>
                                    <button class="btn btn-ghost btn-full magnetic-btn" style="margin-bottom: 10px;" onclick="Pages.profile.editProfile()">
                                        ✏️ Edit Profile
                                    </button>
                                    <button class="btn btn-ghost btn-full magnetic-btn" style="margin-bottom: 10px;" onclick="Pages.profile.changePassword()">
                                        🔒 Change Password
                                    </button>
                                    <button class="btn btn-ghost btn-full magnetic-btn" style="margin-bottom: 10px;" onclick="App.navigateTo('shop')">
                                        🛒 Visit Shop
                                    </button>
                                    <button class="btn btn-danger btn-full" onclick="Auth.logout()">
                                        🚪 Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                this.inventory = inventory;
                this.user = user;
                this.bindEvents();

                // Photo-based avatar - no character overlay needed

            } catch (error) {
                main.innerHTML = `<div class="empty-state"><h3>Failed to load profile</h3><p>${error.message}</p></div>`;
            }
        },

        getSlotIcon(slot) {
            const icons = {
                head: '🎩',
                body: '👕',
                accessory: '💎',
                background: '🖼️',
                effect: '✨',
                pet: '🐾',
                banner: '🏞️'
            };
            return icons[slot] || '❓';
        },

        getItemIcon(item) {
            if (item.category === 'banner') {
                return this.getBannerPreview(item);
            }
            return this.getRarityEmoji(item.rarity);
        },

        getRarityEmoji(rarity) {
            const emojis = { common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟡' };
            return emojis[rarity] || '⚪';
        },

        getBannerStyle(banner) {
            if (!banner) {
                return 'background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);';
            }

            // Banner styles based on item name/id
            const bannerStyles = {
                'Cosmic Nebula': 'background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);',
                'Sunset Dream': 'background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);',
                'Ocean Wave': 'background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #00d2ff 100%);',
                'Forest Mist': 'background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);',
                'Fire Storm': 'background: linear-gradient(135deg, #f12711 0%, #f5af19 100%);',
                'Arctic Aurora': 'background: linear-gradient(135deg, #43e97b 0%, #38f9d7 50%, #4facfe 100%);',
                'Purple Galaxy': 'background: linear-gradient(135deg, #7f00ff 0%, #e100ff 100%);',
                'Golden Sunrise': 'background: linear-gradient(135deg, #f5af19 0%, #f12711 50%, #f5af19 100%);',
                'Neon Lights': 'background: linear-gradient(135deg, #00ff87 0%, #60efff 50%, #ff00ea 100%);',
                'Deep Space': 'background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%);'
            };

            return bannerStyles[banner.name] || 'background: var(--gradient-primary);';
        },

        getBannerPreview(item) {
            const colors = {
                'Cosmic Nebula': '🌌',
                'Sunset Dream': '🌅',
                'Ocean Wave': '🌊',
                'Forest Mist': '🌲',
                'Fire Storm': '🔥',
                'Arctic Aurora': '❄️',
                'Purple Galaxy': '🟣',
                'Golden Sunrise': '🌄',
                'Neon Lights': '💡',
                'Deep Space': '🌑'
            };
            return colors[item.name] || '🏞️';
        },

        // Get avatar frame class based on equipped items
        getAvatarFrameClass(inventory) {
            const frame = inventory.find(i => i.category === 'accessory' && i.is_equipped);
            if (!frame) return 'frame-default';

            const frameClasses = {
                legendary: 'frame-legendary',
                epic: 'frame-epic',
                rare: 'frame-rare',
                uncommon: 'frame-uncommon',
                common: 'frame-common'
            };
            return frameClasses[frame.rarity] || 'frame-default';
        },

        // Get avatar effect HTML based on equipped items
        getAvatarEffect(inventory) {
            const effect = inventory.find(i => i.category === 'effect' && i.is_equipped);
            if (!effect) return '';

            const effectClasses = {
                legendary: 'effect-legendary',
                epic: 'effect-epic',
                rare: 'effect-sparkle',
                uncommon: 'effect-glow',
                common: ''
            };
            const effectClass = effectClasses[effect.rarity] || '';
            return effectClass ? `<div class="avatar-effect ${effectClass}"></div>` : '';
        },

        // Change avatar photo
        async changeAvatar() {
            if (typeof Modal !== 'undefined') {
                const file = await Modal.imageUpload('Загрузить аватар', Auth.currentUser?.avatarUrl);
                if (file && file !== 'keep') {
                    try {
                        Utils.showToast('Загружаю...', 'info');
                        const response = await API.profile.uploadAvatar(file);
                        if (response.success) {
                            Auth.currentUser.avatarUrl = response.data.avatarUrl;
                            Utils.showToast('Аватар обновлён!', 'success');
                            this.render();
                        }
                    } catch (error) {
                        Utils.showToast('Ошибка загрузки', 'error');
                    }
                }
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const response = await API.profile.uploadAvatar(file);
                            if (response.success) {
                                Auth.currentUser.avatarUrl = response.data.avatarUrl;
                                Utils.showToast('Аватар обновлён!', 'success');
                                this.render();
                            }
                        } catch (error) {
                            Utils.showToast('Ошибка загрузки', 'error');
                        }
                    }
                };
                input.click();
            }
        },

        // Change avatar frame
        async changeFrame() {
            const frames = this.inventory.filter(i => i.category === 'accessory');

            if (frames.length === 0) {
                Utils.showToast('Нет рамок! Посетите магазин.', 'info');
                return;
            }

            if (typeof Modal !== 'undefined') {
                const options = frames.map(f => ({
                    value: f.item_id,
                    label: `${f.name} (${f.rarity})`,
                    icon: this.getRarityEmoji(f.rarity)
                }));

                const selected = await Modal.select('Выберите рамку для аватара:', options, '🖼️ Рамки');
                if (selected) {
                    await this.equipItem(selected, 'accessory');
                }
            }
        },

        // Change avatar effect
        async changeEffect() {
            const effects = this.inventory.filter(i => i.category === 'effect');

            if (effects.length === 0) {
                Utils.showToast('Нет эффектов! Посетите магазин.', 'info');
                return;
            }

            if (typeof Modal !== 'undefined') {
                const options = effects.map(e => ({
                    value: e.item_id,
                    label: `${e.name} (${e.rarity})`,
                    icon: '✨'
                }));

                const selected = await Modal.select('Выберите эффект для аватара:', options, '✨ Эффекты');
                if (selected) {
                    await this.equipItem(selected, 'effect');
                }
            }
        },

        // Equip item helper
        async equipItem(itemId, category) {
            try {
                // Unequip current item in category
                const currentEquipped = this.inventory.find(i => i.category === category && i.is_equipped);
                if (currentEquipped && currentEquipped.item_id !== itemId) {
                    await API.shop.equipItem(currentEquipped.item_id, false);
                }

                // Equip new item
                await API.shop.equipItem(itemId, true);
                Utils.showToast('Предмет экипирован!', 'success');
                this.render();
            } catch (error) {
                Utils.showToast('Ошибка экипировки', 'error');
            }
        },

        changeBanner() {
            // Show banner selection modal
            const banners = this.inventory.filter(i => i.category === 'banner');

            if (banners.length === 0) {
                Utils.showToast('info', 'No Banners', 'Visit the shop to buy banners!');
                return;
            }

            const currentBanner = banners.find(b => b.is_equipped);
            const options = banners.map(b => `${b.name}${b.is_equipped ? ' (current)' : ''}`).join('\n');

            const selection = prompt(`Select a banner:\n\n${options}\n\nEnter banner name:`);

            if (selection) {
                const banner = banners.find(b => b.name.toLowerCase() === selection.toLowerCase().replace(' (current)', ''));
                if (banner) {
                    this.equipBanner(banner.item_id);
                }
            }
        },

        async equipBanner(bannerId) {
            try {
                await API.shop.equipItem(bannerId, true);
                Utils.showToast('success', 'Banner Changed', 'Your profile banner has been updated!');
                this.render();
            } catch (error) {
                Utils.showToast('error', 'Error', error.error || 'Failed to change banner');
            }
        },

        bindEvents() {
            // Inventory items click to equip
            document.querySelectorAll('.inventory-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const itemId = item.dataset.id;
                    const category = item.dataset.category;
                    const isEquipped = item.classList.contains('equipped');

                    try {
                        await API.shop.equipItem(itemId, !isEquipped);

                        // Special feedback for banners
                        if (category === 'banner') {
                            Utils.showToast('success', isEquipped ? 'Banner Removed' : 'Banner Equipped', 'Profile updated!');
                        } else {
                            Utils.showToast('success', isEquipped ? 'Unequipped' : 'Equipped', 'Avatar updated');
                        }

                        this.render();
                    } catch (error) {
                        Utils.showToast('error', 'Error', error.error || 'Failed to update');
                    }
                });
            });

            // Add scroll reveal animations
            this.initScrollReveal();
        },

        initScrollReveal() {
            const reveals = document.querySelectorAll('.glass-card');
            reveals.forEach((el, idx) => {
                el.classList.add('reveal', `stagger-${Math.min(idx + 1, 5)}`);
                setTimeout(() => el.classList.add('visible'), 100 + idx * 100);
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
