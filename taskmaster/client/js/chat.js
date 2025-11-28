/**
 * TaskMaster - Chat Module
 */

const Chat = {
    currentChannel: null,
    channels: [],
    messages: [],
    typingUsers: new Map(),

    /**
     * Initialize chat page
     */
    async render() {
        const main = document.getElementById('main-content');
        App.showLoading(main);

        try {
            const response = await API.chat.getChannels();
            this.channels = response.data.channels;

            main.innerHTML = `
                <div class="page-section active" id="page-chat">
                    <div class="chat-container">
                        <!-- Channels Sidebar -->
                        <div class="chat-sidebar">
                            <div class="chat-sidebar-header">
                                <h3>Channels</h3>
                                <button class="btn btn-ghost btn-sm" id="new-channel-btn">+</button>
                            </div>

                            <div class="chat-channels" id="chat-channels">
                                ${this.renderChannels()}
                            </div>

                            <div class="chat-sidebar-section">
                                <h4>Direct Messages</h4>
                                <button class="btn btn-ghost btn-sm btn-full" id="new-dm-btn">+ New Message</button>
                            </div>

                            <div class="chat-users" id="chat-users">
                                <!-- Users will be loaded here -->
                            </div>
                        </div>

                        <!-- Chat Main Area -->
                        <div class="chat-main">
                            <div class="chat-header" id="chat-header">
                                <div class="chat-header-info">
                                    <h3 id="channel-name">Select a channel</h3>
                                    <span id="channel-members"></span>
                                </div>
                            </div>

                            <div class="chat-messages" id="chat-messages">
                                <div class="empty-state">
                                    <div class="empty-state-icon">💬</div>
                                    <h3>Select a channel to start chatting</h3>
                                </div>
                            </div>

                            <div class="chat-typing hidden" id="chat-typing">
                                <span id="typing-text"></span>
                            </div>

                            <div class="chat-input-container hidden" id="chat-input-container">
                                <div class="chat-input-toolbar">
                                    <button class="toolbar-btn" id="attach-file-btn" title="Attach file">📎</button>
                                    <button class="toolbar-btn" id="code-btn" title="Send code">{ }</button>
                                </div>
                                <div class="chat-input-wrapper">
                                    <textarea id="chat-input" placeholder="Type a message..." rows="1"></textarea>
                                    <button class="btn btn-primary" id="send-btn">Send</button>
                                </div>
                                <input type="file" id="chat-file-input" hidden>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.addStyles();
            this.bindEvents();
            this.initSocket();
            this.loadUsers();

            // Select first channel if available
            if (this.channels.length > 0) {
                this.selectChannel(this.channels[0].id);
            }

        } catch (error) {
            main.innerHTML = `<div class="empty-state"><h3>Failed to load chat</h3><p>${error.message}</p></div>`;
        }
    },

    /**
     * Add chat-specific styles
     */
    addStyles() {
        if (document.getElementById('chat-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'chat-styles';
        styles.textContent = `
            .chat-container {
                display: grid;
                grid-template-columns: 280px 1fr;
                height: calc(100vh - var(--nav-height) - 60px);
                background: var(--bg-card);
                border-radius: var(--radius-lg);
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-sidebar {
                background: rgba(0, 0, 0, 0.2);
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
            }

            .chat-sidebar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-sidebar-header h3 {
                font-size: 16px;
            }

            .chat-sidebar-section {
                padding: 15px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-sidebar-section h4 {
                font-size: 12px;
                color: var(--text-muted);
                text-transform: uppercase;
                margin-bottom: 10px;
            }

            .chat-channels {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
            }

            .channel-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 15px;
                border-radius: var(--radius-md);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .channel-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .channel-item.active {
                background: var(--gradient-primary);
            }

            .channel-icon {
                font-size: 18px;
            }

            .channel-info {
                flex: 1;
                min-width: 0;
            }

            .channel-name {
                font-weight: 500;
                font-size: 14px;
            }

            .channel-preview {
                font-size: 12px;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .channel-badge {
                background: var(--color-error);
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
            }

            .chat-users {
                padding: 10px;
                max-height: 200px;
                overflow-y: auto;
            }

            .user-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .user-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--gradient-primary);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                position: relative;
            }

            .user-avatar.online::after {
                content: '';
                position: absolute;
                bottom: 0;
                right: 0;
                width: 10px;
                height: 10px;
                background: var(--color-success);
                border-radius: 50%;
                border: 2px solid var(--bg-nebula);
            }

            .user-name {
                font-size: 13px;
            }

            .chat-main {
                display: flex;
                flex-direction: column;
            }

            .chat-header {
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-header h3 {
                font-size: 16px;
                margin-bottom: 2px;
            }

            .chat-header span {
                font-size: 12px;
                color: var(--text-muted);
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .message {
                display: flex;
                gap: 12px;
                max-width: 80%;
            }

            .message.own {
                flex-direction: row-reverse;
                margin-left: auto;
            }

            .message-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: var(--gradient-primary);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                flex-shrink: 0;
            }

            .message-content {
                background: rgba(255, 255, 255, 0.05);
                padding: 12px 16px;
                border-radius: var(--radius-md);
                border-top-left-radius: 4px;
            }

            .message.own .message-content {
                background: rgba(102, 126, 234, 0.2);
                border-top-left-radius: var(--radius-md);
                border-top-right-radius: 4px;
            }

            .message-header {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 5px;
            }

            .message-sender {
                font-weight: 600;
                font-size: 13px;
            }

            .message-time {
                font-size: 11px;
                color: var(--text-muted);
            }

            .message-text {
                font-size: 14px;
                line-height: 1.5;
                word-break: break-word;
            }

            .message-file {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: var(--radius-sm);
                margin-top: 10px;
            }

            .message-file-icon {
                font-size: 24px;
            }

            .message-file-name {
                font-size: 13px;
                color: var(--text-secondary);
            }

            .message-code {
                margin-top: 10px;
                background: #1e1e2e;
                border-radius: var(--radius-sm);
                overflow: hidden;
            }

            .message-code-header {
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.3);
                font-size: 11px;
                color: var(--text-muted);
            }

            .message-code pre {
                margin: 0;
                padding: 12px;
                font-size: 12px;
                overflow-x: auto;
            }

            .chat-typing {
                padding: 5px 20px;
                font-size: 12px;
                color: var(--text-muted);
                font-style: italic;
            }

            .chat-input-container {
                padding: 15px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-input-toolbar {
                display: flex;
                gap: 5px;
                margin-bottom: 10px;
            }

            .toolbar-btn {
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                transition: all var(--transition-fast);
            }

            .toolbar-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary);
            }

            .chat-input-wrapper {
                display: flex;
                gap: 10px;
            }

            #chat-input {
                flex: 1;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--radius-md);
                color: var(--text-primary);
                resize: none;
                max-height: 150px;
            }

            #chat-input:focus {
                outline: none;
                border-color: rgba(102, 126, 234, 0.5);
            }

            .system-message {
                text-align: center;
                padding: 10px;
                font-size: 12px;
                color: var(--text-muted);
            }

            @media (max-width: 768px) {
                .chat-container {
                    grid-template-columns: 1fr;
                }
                .chat-sidebar {
                    display: none;
                }
            }
        `;
        document.head.appendChild(styles);
    },

    /**
     * Render channels list
     */
    renderChannels() {
        return this.channels.map(channel => `
            <div class="channel-item ${this.currentChannel === channel.id ? 'active' : ''}" data-id="${channel.id}">
                <span class="channel-icon">${channel.type === 'direct' ? '👤' : '#'}</span>
                <div class="channel-info">
                    <div class="channel-name">${channel.type === 'direct' ? channel.name.replace('DM: ', '') : channel.name}</div>
                    ${channel.last_message ? `<div class="channel-preview">${channel.last_message.substring(0, 30)}...</div>` : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * Select a channel
     */
    async selectChannel(channelId) {
        this.currentChannel = channelId;
        const channel = this.channels.find(c => c.id === channelId);

        // Update UI
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === channelId);
        });

        document.getElementById('channel-name').textContent = channel?.name || 'Channel';
        document.getElementById('channel-members').textContent = `${channel?.memberCount || 0} members`;
        document.getElementById('chat-input-container').classList.remove('hidden');

        // Load messages
        await this.loadMessages(channelId);

        // Join channel room
        App.socket?.emit('channel:join', channelId);
    },

    /**
     * Load messages for channel
     */
    async loadMessages(channelId) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

        try {
            const response = await API.chat.getMessages(channelId, { limit: 50 });
            this.messages = response.data.messages;

            if (this.messages.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No messages yet. Start the conversation!</p></div>';
                return;
            }

            container.innerHTML = this.messages.map(msg => this.renderMessage(msg)).join('');

            // Scroll to bottom
            container.scrollTop = container.scrollHeight;

            // Highlight code blocks
            container.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });

        } catch (error) {
            container.innerHTML = '<div class="empty-state"><p>Failed to load messages</p></div>';
        }
    },

    /**
     * Render single message
     */
    renderMessage(msg) {
        const isOwn = msg.sender_id === Auth.currentUser?.id;
        const initials = msg.sender_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??';

        if (msg.message_type === 'system') {
            return `<div class="system-message">${Utils.escapeHtml(msg.content)}</div>`;
        }

        let contentHtml = '';

        if (msg.message_type === 'code') {
            contentHtml = `
                <div class="message-code">
                    <div class="message-code-header">${msg.code_language || 'code'}</div>
                    <pre><code class="language-${msg.code_language || 'plaintext'}">${Utils.escapeHtml(msg.content)}</code></pre>
                </div>
            `;
        } else if (msg.message_type === 'file') {
            const icon = this.getFileIcon(msg.file_name);
            contentHtml = `
                <div class="message-text">${Utils.escapeHtml(msg.content)}</div>
                <a href="/uploads/chat/${msg.file_path}" target="_blank" class="message-file">
                    <span class="message-file-icon">${icon}</span>
                    <span class="message-file-name">${msg.file_name}</span>
                </a>
            `;
        } else {
            contentHtml = `<div class="message-text">${Utils.escapeHtml(msg.content)}</div>`;
        }

        return `
            <div class="message ${isOwn ? 'own' : ''}">
                <div class="message-avatar">${initials}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${msg.sender_name}</span>
                        <span class="message-time">${Utils.timeAgo(msg.created_at)}</span>
                    </div>
                    ${contentHtml}
                </div>
            </div>
        `;
    },

    /**
     * Get file icon based on type
     */
    getFileIcon(filename) {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const icons = {
            pdf: '📄',
            doc: '📝', docx: '📝',
            xls: '📊', xlsx: '📊',
            ppt: '📽️', pptx: '📽️',
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
            zip: '📦', rar: '📦',
            js: '📜', ts: '📜', py: '🐍', java: '☕',
            html: '🌐', css: '🎨',
            default: '📁'
        };
        return icons[ext] || icons.default;
    },

    /**
     * Load users for DM
     */
    async loadUsers() {
        try {
            const response = await API.chat.getUsers();
            const container = document.getElementById('chat-users');

            container.innerHTML = response.data.users.slice(0, 10).map(user => `
                <div class="user-item" data-id="${user.id}">
                    <div class="user-avatar ${user.is_online ? 'online' : ''}">
                        ${user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span class="user-name">${user.full_name}</span>
                </div>
            `).join('');

            // Bind click events
            container.querySelectorAll('.user-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const userId = item.dataset.id;
                    await this.startDirectMessage(userId);
                });
            });

        } catch (error) {
            console.error('Failed to load users:', error);
        }
    },

    /**
     * Start direct message
     */
    async startDirectMessage(userId) {
        try {
            const response = await API.chat.createDirectMessage(userId);
            const channel = response.data.channel;

            if (!response.data.existing) {
                this.channels.unshift(channel);
                document.getElementById('chat-channels').innerHTML = this.renderChannels();
                this.bindChannelEvents();
            }

            this.selectChannel(channel.id);

        } catch (error) {
            Utils.showToast('error', 'Error', error.error || 'Failed to start conversation');
        }
    },

    /**
     * Send message
     */
    async sendMessage(content, type = 'text', codeLanguage = null) {
        if (!this.currentChannel || !content.trim()) return;

        try {
            // Send via socket for real-time
            App.socket?.emit('chat:message', {
                channelId: this.currentChannel,
                content: content.trim(),
                messageType: type,
                codeLanguage
            });

            // Clear input
            document.getElementById('chat-input').value = '';

        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to send message');
        }
    },

    /**
     * Upload file
     */
    async uploadFile(file) {
        if (!this.currentChannel) return;

        try {
            const response = await API.chat.uploadFile(this.currentChannel, file);
            // Message will be added via socket
            Utils.showToast('success', 'File Uploaded', file.name);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to upload file');
        }
    },

    /**
     * Bind events
     */
    bindEvents() {
        this.bindChannelEvents();

        // Send message
        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('chat-input');

        sendBtn?.addEventListener('click', () => {
            this.sendMessage(input.value);
        });

        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(input.value);
            }

            // Typing indicator
            App.socket?.emit('chat:typing', {
                channelId: this.currentChannel,
                isTyping: true
            });
        });

        // File upload
        document.getElementById('attach-file-btn')?.addEventListener('click', () => {
            document.getElementById('chat-file-input').click();
        });

        document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.uploadFile(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Code button
        document.getElementById('code-btn')?.addEventListener('click', () => {
            const code = prompt('Paste your code:');
            if (code) {
                const language = prompt('Language (js, python, etc.):', 'javascript');
                this.sendMessage(code, 'code', language);
            }
        });

        // New channel
        document.getElementById('new-channel-btn')?.addEventListener('click', async () => {
            const name = prompt('Channel name:');
            if (name) {
                try {
                    const response = await API.chat.createChannel(name);
                    this.channels.unshift(response.data.channel);
                    document.getElementById('chat-channels').innerHTML = this.renderChannels();
                    this.bindChannelEvents();
                    this.selectChannel(response.data.channel.id);
                } catch (error) {
                    Utils.showToast('error', 'Error', error.error || 'Failed to create channel');
                }
            }
        });
    },

    /**
     * Bind channel click events
     */
    bindChannelEvents() {
        document.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectChannel(item.dataset.id);
            });
        });
    },

    /**
     * Initialize socket listeners
     */
    initSocket() {
        App.socket?.on('chat:message', (message) => {
            if (message.channel_id === this.currentChannel) {
                const container = document.getElementById('chat-messages');
                container.innerHTML += this.renderMessage(message);
                container.scrollTop = container.scrollHeight;

                // Highlight code
                container.querySelectorAll('pre code:not(.hljs)').forEach(block => {
                    hljs.highlightElement(block);
                });
            }
        });

        App.socket?.on('chat:typing', (data) => {
            if (data.userId !== Auth.currentUser?.id) {
                const typing = document.getElementById('chat-typing');
                const text = document.getElementById('typing-text');

                if (data.isTyping) {
                    this.typingUsers.set(data.userId, data.userName);
                } else {
                    this.typingUsers.delete(data.userId);
                }

                if (this.typingUsers.size > 0) {
                    const names = [...this.typingUsers.values()].slice(0, 3);
                    text.textContent = `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} typing...`;
                    typing.classList.remove('hidden');
                } else {
                    typing.classList.add('hidden');
                }

                // Clear typing after 3 seconds
                setTimeout(() => {
                    this.typingUsers.delete(data.userId);
                    if (this.typingUsers.size === 0) {
                        typing.classList.add('hidden');
                    }
                }, 3000);
            }
        });
    }
};

// Add chat to Pages
Pages.chat = {
    render: () => Chat.render()
};

window.Chat = Chat;
