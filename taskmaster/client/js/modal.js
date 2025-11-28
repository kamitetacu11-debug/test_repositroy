/**
 * TaskMaster - Custom Modal System
 * Beautiful themed modals instead of standard alerts
 */

const Modal = {
    /**
     * Show custom alert (replacement for window.alert)
     */
    alert(message, title = 'Уведомление') {
        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                content: `<p class="modal-message">${Utils.escapeHtml(message)}</p>`,
                buttons: [
                    { text: 'OK', type: 'primary', action: resolve }
                ]
            });
            document.body.appendChild(modal);
            this.animateIn(modal);
        });
    },

    /**
     * Show custom confirm (replacement for window.confirm)
     */
    confirm(message, title = 'Подтверждение') {
        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                content: `<p class="modal-message">${Utils.escapeHtml(message)}</p>`,
                buttons: [
                    { text: 'Отмена', type: 'ghost', action: () => resolve(false) },
                    { text: 'Подтвердить', type: 'primary', action: () => resolve(true) }
                ]
            });
            document.body.appendChild(modal);
            this.animateIn(modal);
        });
    },

    /**
     * Show custom prompt (replacement for window.prompt)
     */
    prompt(message, defaultValue = '', title = 'Введите данные') {
        return new Promise((resolve) => {
            const inputId = 'modal-input-' + Date.now();
            const modal = this.createModal({
                title,
                content: `
                    <p class="modal-message">${Utils.escapeHtml(message)}</p>
                    <div class="form-group">
                        <input type="text" id="${inputId}" class="modal-input" value="${Utils.escapeHtml(defaultValue)}" placeholder="Введите значение...">
                    </div>
                `,
                buttons: [
                    { text: 'Отмена', type: 'ghost', action: () => resolve(null) },
                    { text: 'OK', type: 'primary', action: () => {
                        const input = document.getElementById(inputId);
                        resolve(input ? input.value : null);
                    }}
                ],
                onShow: () => {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            });
            document.body.appendChild(modal);
            this.animateIn(modal);

            // Handle Enter key
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        resolve(input.value);
                        this.close(modal);
                    }
                });
            }
        });
    },

    /**
     * Show selection modal
     */
    select(message, options = [], title = 'Выберите') {
        return new Promise((resolve) => {
            const optionsHtml = options.map((opt, idx) => `
                <div class="modal-option" data-value="${idx}">
                    <span class="modal-option-icon">${opt.icon || '▸'}</span>
                    <span class="modal-option-text">${Utils.escapeHtml(opt.label || opt)}</span>
                </div>
            `).join('');

            const modal = this.createModal({
                title,
                content: `
                    <p class="modal-message">${Utils.escapeHtml(message)}</p>
                    <div class="modal-options">
                        ${optionsHtml}
                    </div>
                `,
                buttons: [
                    { text: 'Отмена', type: 'ghost', action: () => resolve(null) }
                ],
                onShow: () => {
                    modal.querySelectorAll('.modal-option').forEach(opt => {
                        opt.addEventListener('click', () => {
                            const idx = parseInt(opt.dataset.value);
                            const selected = options[idx];
                            resolve(typeof selected === 'object' ? selected.value : selected);
                            this.close(modal);
                        });
                    });
                }
            });
            document.body.appendChild(modal);
            this.animateIn(modal);
        });
    },

    /**
     * Create modal element
     */
    createModal({ title, content, buttons = [], onShow = null }) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        modal.innerHTML = `
            <div class="custom-modal-overlay"></div>
            <div class="custom-modal-container">
                <div class="custom-modal-glow"></div>
                <div class="custom-modal-content">
                    <div class="custom-modal-header">
                        <div class="custom-modal-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4M12 8h.01"/>
                            </svg>
                        </div>
                        <h3 class="custom-modal-title">${Utils.escapeHtml(title)}</h3>
                    </div>
                    <div class="custom-modal-body">
                        ${content}
                    </div>
                    <div class="custom-modal-footer">
                        ${buttons.map(btn => `
                            <button class="btn btn-${btn.type || 'ghost'} modal-btn" data-action="${btn.text}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Bind button events
        buttons.forEach(btn => {
            const button = modal.querySelector(`[data-action="${btn.text}"]`);
            if (button) {
                button.addEventListener('click', () => {
                    if (btn.action) btn.action();
                    this.close(modal);
                });
            }
        });

        // Close on overlay click
        modal.querySelector('.custom-modal-overlay').addEventListener('click', () => {
            const cancelBtn = buttons.find(b => b.type === 'ghost');
            if (cancelBtn && cancelBtn.action) cancelBtn.action();
            this.close(modal);
        });

        // Call onShow callback
        if (onShow) {
            setTimeout(onShow, 100);
        }

        return modal;
    },

    /**
     * Animate modal in
     */
    animateIn(modal) {
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    },

    /**
     * Close and remove modal
     */
    close(modal) {
        modal.classList.remove('show');
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
        }, 300);
    },

    /**
     * Show code input modal
     */
    codeInput(defaultLanguage = 'javascript') {
        return new Promise((resolve) => {
            const languages = [
                { value: 'javascript', label: 'JavaScript', icon: '🟨' },
                { value: 'typescript', label: 'TypeScript', icon: '🔷' },
                { value: 'python', label: 'Python', icon: '🐍' },
                { value: 'java', label: 'Java', icon: '☕' },
                { value: 'go', label: 'Go', icon: '🔵' },
                { value: 'rust', label: 'Rust', icon: '🦀' },
                { value: 'html', label: 'HTML', icon: '🌐' },
                { value: 'css', label: 'CSS', icon: '🎨' },
                { value: 'sql', label: 'SQL', icon: '🗃️' },
                { value: 'bash', label: 'Bash', icon: '💻' },
                { value: 'json', label: 'JSON', icon: '📋' },
                { value: 'plaintext', label: 'Plain Text', icon: '📄' }
            ];

            const languageOptions = languages.map(lang => `
                <option value="${lang.value}" ${lang.value === defaultLanguage ? 'selected' : ''}>
                    ${lang.icon} ${lang.label}
                </option>
            `).join('');

            const modal = this.createModal({
                title: '📝 Отправить код',
                content: `
                    <div class="form-group">
                        <label>Язык программирования</label>
                        <select id="code-language-select" class="modal-select">
                            ${languageOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Ваш код</label>
                        <textarea id="code-input-area" class="modal-code-input" rows="12" placeholder="// Вставьте ваш код здесь..."></textarea>
                    </div>
                `,
                buttons: [
                    { text: 'Отмена', type: 'ghost', action: () => resolve(null) },
                    { text: 'Отправить', type: 'primary', action: () => {
                        const code = document.getElementById('code-input-area')?.value;
                        const language = document.getElementById('code-language-select')?.value;
                        if (code && code.trim()) {
                            resolve({ code: code.trim(), language });
                        } else {
                            resolve(null);
                        }
                    }}
                ],
                onShow: () => {
                    const textarea = document.getElementById('code-input-area');
                    if (textarea) textarea.focus();
                }
            });

            modal.classList.add('modal-lg');
            document.body.appendChild(modal);
            this.animateIn(modal);
        });
    },

    /**
     * Show image upload modal
     */
    imageUpload(title = 'Загрузить изображение', currentImage = null) {
        return new Promise((resolve) => {
            const modal = this.createModal({
                title: `📷 ${title}`,
                content: `
                    <div class="image-upload-preview" id="image-upload-preview">
                        ${currentImage ? `<img src="${currentImage}" alt="Current">` : `
                            <div class="upload-placeholder">
                                <span class="upload-icon">📁</span>
                                <p>Нажмите для выбора или перетащите файл</p>
                            </div>
                        `}
                    </div>
                    <input type="file" id="image-upload-input" accept="image/*" hidden>
                    <div class="image-upload-actions">
                        <button class="btn btn-ghost btn-sm" id="select-image-btn">
                            📂 Выбрать файл
                        </button>
                        ${currentImage ? `
                            <button class="btn btn-ghost btn-sm" id="remove-image-btn">
                                🗑️ Удалить
                            </button>
                        ` : ''}
                    </div>
                `,
                buttons: [
                    { text: 'Отмена', type: 'ghost', action: () => resolve(null) },
                    { text: 'Сохранить', type: 'primary', action: () => {
                        const input = document.getElementById('image-upload-input');
                        if (input && input.files.length > 0) {
                            resolve(input.files[0]);
                        } else {
                            resolve(currentImage ? 'keep' : null);
                        }
                    }}
                ],
                onShow: () => {
                    const input = document.getElementById('image-upload-input');
                    const preview = document.getElementById('image-upload-preview');
                    const selectBtn = document.getElementById('select-image-btn');
                    const removeBtn = document.getElementById('remove-image-btn');

                    selectBtn?.addEventListener('click', () => input?.click());
                    preview?.addEventListener('click', () => input?.click());

                    input?.addEventListener('change', () => {
                        if (input.files.length > 0) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                            };
                            reader.readAsDataURL(input.files[0]);
                        }
                    });

                    removeBtn?.addEventListener('click', () => {
                        preview.innerHTML = `
                            <div class="upload-placeholder">
                                <span class="upload-icon">📁</span>
                                <p>Нажмите для выбора или перетащите файл</p>
                            </div>
                        `;
                        if (input) input.value = '';
                    });

                    // Drag and drop
                    preview?.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        preview.classList.add('dragover');
                    });

                    preview?.addEventListener('dragleave', () => {
                        preview.classList.remove('dragover');
                    });

                    preview?.addEventListener('drop', (e) => {
                        e.preventDefault();
                        preview.classList.remove('dragover');
                        if (e.dataTransfer.files.length > 0) {
                            input.files = e.dataTransfer.files;
                            input.dispatchEvent(new Event('change'));
                        }
                    });
                }
            });

            document.body.appendChild(modal);
            this.animateIn(modal);
        });
    }
};

// Override native alert/confirm/prompt with custom modals
window.customAlert = Modal.alert.bind(Modal);
window.customConfirm = Modal.confirm.bind(Modal);
window.customPrompt = Modal.prompt.bind(Modal);

// Export
window.Modal = Modal;
