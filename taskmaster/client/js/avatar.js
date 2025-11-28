/**
 * TaskMaster Avatar System
 * Animated avatar with progression, customization, and level-based evolution
 */

const AvatarSystem = {
    canvas: null,
    ctx: null,
    currentAnimation: 'idle',
    animationFrame: 0,
    frameCount: 0,
    equippedItems: {},
    particles: [],
    isInitialized: false,
    level: 1,
    experience: 0,
    maxExperience: 100,
    evolutionStage: 1, // 1-5 based on level

    // Evolution stages based on level
    evolutionStages: {
        1: { name: 'Novice', minLevel: 1, auraColor: null, size: 0.8 },
        2: { name: 'Apprentice', minLevel: 5, auraColor: 'rgba(108, 99, 255, 0.2)', size: 0.9 },
        3: { name: 'Skilled', minLevel: 10, auraColor: 'rgba(76, 175, 80, 0.3)', size: 1.0 },
        4: { name: 'Expert', minLevel: 20, auraColor: 'rgba(156, 39, 176, 0.3)', size: 1.05 },
        5: { name: 'Master', minLevel: 35, auraColor: 'rgba(255, 215, 0, 0.4)', size: 1.1 }
    },

    // Avatar base colors (evolve with level)
    baseColors: {
        skin: '#FFD5B8',
        hair: '#4A3C2A',
        eyes: '#2196F3',
        outfit: '#6C63FF'
    },

    colors: {},

    // Animation states
    animations: {
        idle: { frames: 60, loop: true },
        wave: { frames: 45, loop: false },
        jump: { frames: 30, loop: false },
        dance: { frames: 90, loop: true },
        celebrate: { frames: 60, loop: false },
        think: { frames: 120, loop: true },
        work: { frames: 80, loop: true },
        sleep: { frames: 100, loop: true },
        spin: { frames: 40, loop: false },
        levelUp: { frames: 80, loop: false },
        power: { frames: 60, loop: false }
    },

    /**
     * Initialize the avatar system
     */
    init(configOrContainerId = 'profile-avatar') {
        // Handle both config object and container ID
        let containerId = 'profile-avatar';
        let config = {};

        if (typeof configOrContainerId === 'string') {
            containerId = configOrContainerId;
        } else if (typeof configOrContainerId === 'object' && configOrContainerId !== null) {
            config = configOrContainerId;
            containerId = config.containerId || 'profile-avatar';
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Avatar container not found:', containerId);
            return;
        }

        // Create canvas if it doesn't exist
        this.canvas = container.querySelector('canvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 200;
            this.canvas.height = 280;
            this.canvas.style.display = 'block';
            this.canvas.style.margin = '0 auto';
            container.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
        this.isInitialized = true;
        this.colors = { ...this.baseColors };

        // Load user data
        this.loadUserData();

        // Apply config colors if provided
        if (config.colors) {
            this.colors = { ...this.colors, ...config.colors };
        }

        // Start animation loop
        this.startAnimationLoop();
    },

    /**
     * Load user data for progression
     */
    loadUserData() {
        const user = Auth?.currentUser || window.TaskMasterApp?.currentUser;
        if (user) {
            this.level = user.level || 1;
            this.experience = user.totalPoints || 0;
            this.updateEvolutionStage();
            this.updateColorsForLevel();
        }
    },

    /**
     * Update evolution stage based on level
     */
    updateEvolutionStage() {
        let stage = 1;
        for (let s = 5; s >= 1; s--) {
            if (this.level >= this.evolutionStages[s].minLevel) {
                stage = s;
                break;
            }
        }
        this.evolutionStage = stage;
    },

    /**
     * Update colors based on level/evolution
     */
    updateColorsForLevel() {
        const stage = this.evolutionStage;

        // Outfit color evolves with stage
        const outfitColors = {
            1: '#6C63FF',  // Purple - Novice
            2: '#4CAF50',  // Green - Apprentice
            3: '#2196F3',  // Blue - Skilled
            4: '#9C27B0',  // Deep Purple - Expert
            5: '#FFD700'   // Gold - Master
        };

        // Eye glow evolves
        const eyeColors = {
            1: '#2196F3',
            2: '#4CAF50',
            3: '#00BCD4',
            4: '#E91E63',
            5: '#FFD700'
        };

        this.colors.outfit = outfitColors[stage] || this.baseColors.outfit;
        this.colors.eyes = eyeColors[stage] || this.baseColors.eyes;
    },

    /**
     * Set user level and update avatar
     */
    setLevel(level, experience = 0) {
        const oldStage = this.evolutionStage;
        this.level = level;
        this.experience = experience;
        this.updateEvolutionStage();
        this.updateColorsForLevel();

        // Play level up animation if evolved
        if (this.evolutionStage > oldStage) {
            this.playAnimation('levelUp');
            this.addEvolutionParticles();
        }
    },

    /**
     * Add experience and check for level up
     */
    addExperience(amount) {
        this.experience += amount;
        // Emit particles for XP gain
        this.addXPParticles(amount);
    },

    /**
     * Update equipped items
     */
    setEquippedItems(items) {
        this.equippedItems = {};
        if (Array.isArray(items)) {
            items.forEach(item => {
                if (item.is_equipped) {
                    this.equippedItems[item.category] = item;
                }
            });
        }
    },

    /**
     * Play a specific animation
     */
    playAnimation(name) {
        if (this.animations[name]) {
            this.currentAnimation = name;
            this.animationFrame = 0;

            // Add particles for special animations
            if (name === 'celebrate' || name === 'levelUp') {
                this.addCelebrationParticles();
            }
            if (name === 'power') {
                this.addPowerParticles();
            }
        }
    },

    /**
     * Start the animation loop
     */
    startAnimationLoop() {
        const animate = () => {
            if (!this.isInitialized) return;

            this.frameCount++;
            if (this.frameCount % 2 === 0) { // 30 FPS
                this.update();
                this.render();
            }
            requestAnimationFrame(animate);
        };
        animate();
    },

    /**
     * Update animation state
     */
    update() {
        const animation = this.animations[this.currentAnimation];
        if (!animation) return;

        this.animationFrame++;

        if (this.animationFrame >= animation.frames) {
            if (animation.loop) {
                this.animationFrame = 0;
            } else {
                this.currentAnimation = 'idle';
                this.animationFrame = 0;
            }
        }

        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0.1;
            p.life--;
            p.alpha = p.life / p.maxLife;
            p.size *= p.decay || 1;
            return p.life > 0;
        });
    },

    /**
     * Render the avatar
     */
    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const scale = this.evolutionStages[this.evolutionStage]?.size || 1;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw evolution aura
        this.drawAura();

        // Draw background effect if equipped
        if (this.equippedItems.background) {
            this.drawBackground();
        }

        // Calculate animation offset
        const offset = this.getAnimationOffset();

        // Draw shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(w/2, h - 30, (40 - offset.shadowOffset) * scale, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw pet if equipped
        if (this.equippedItems.pet) {
            this.drawPet(offset);
        }

        // Save context and apply scale
        ctx.save();
        ctx.translate(w/2, h - 100);
        ctx.scale(scale, scale);
        ctx.translate(-w/2, -(h - 100));

        // Draw body
        this.drawBody(offset);

        // Draw head
        this.drawHead(offset);

        // Draw equipped items
        this.drawEquippedItems(offset);

        ctx.restore();

        // Draw effect if equipped
        if (this.equippedItems.effect) {
            this.drawEffect();
        }

        // Draw level indicator
        this.drawLevelIndicator();

        // Draw particles
        this.drawParticles();
    },

    /**
     * Draw evolution aura based on stage
     */
    drawAura() {
        const stage = this.evolutionStages[this.evolutionStage];
        if (!stage?.auraColor) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = this.frameCount * 0.02;

        // Pulsing aura
        const pulseSize = 60 + Math.sin(time) * 10;

        const gradient = ctx.createRadialGradient(
            w/2, h - 120, 0,
            w/2, h - 120, pulseSize * stage.size
        );

        gradient.addColorStop(0, stage.auraColor);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Add sparkles for higher stages
        if (this.evolutionStage >= 4) {
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + time;
                const radius = 50 + Math.sin(time * 2 + i) * 10;
                const x = w/2 + Math.cos(angle) * radius;
                const y = h - 120 + Math.sin(angle) * radius * 0.6;

                ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time * 3 + i) * 0.2})`;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    /**
     * Draw level indicator
     */
    drawLevelIndicator() {
        const ctx = this.ctx;
        const w = this.canvas.width;

        // Level badge
        ctx.save();

        // Badge background
        const gradient = ctx.createLinearGradient(w/2 - 25, 0, w/2 + 25, 0);
        gradient.addColorStop(0, this.colors.outfit);
        gradient.addColorStop(1, this.shadeColor(this.colors.outfit, -20));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(w/2 - 25, 5, 50, 22, 11);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Level text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv.${this.level}`, w/2, 16);

        // Evolution stage name
        const stageName = this.evolutionStages[this.evolutionStage]?.name || '';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(stageName, w/2, 270);

        ctx.restore();
    },

    /**
     * Get animation offset values
     */
    getAnimationOffset() {
        const frame = this.animationFrame;
        const anim = this.currentAnimation;
        let offset = { x: 0, y: 0, rotation: 0, armAngle: 0, shadowOffset: 0, scaleX: 1, scaleY: 1 };

        switch (anim) {
            case 'idle':
                offset.y = Math.sin(frame * 0.1) * 3;
                break;

            case 'wave':
                offset.armAngle = Math.sin(frame * 0.3) * 30;
                offset.y = Math.sin(frame * 0.2) * 2;
                break;

            case 'jump':
                const jumpProgress = frame / 30;
                offset.y = -Math.sin(jumpProgress * Math.PI) * 50;
                offset.shadowOffset = Math.sin(jumpProgress * Math.PI) * 25;
                break;

            case 'dance':
                offset.x = Math.sin(frame * 0.15) * 10;
                offset.y = Math.abs(Math.sin(frame * 0.2)) * -10;
                offset.rotation = Math.sin(frame * 0.1) * 5;
                break;

            case 'celebrate':
            case 'levelUp':
                offset.y = Math.abs(Math.sin(frame * 0.2)) * -20;
                offset.armAngle = Math.sin(frame * 0.3) * 60;
                offset.rotation = Math.sin(frame * 0.15) * 5;
                offset.scaleX = 1 + Math.sin(frame * 0.2) * 0.05;
                offset.scaleY = 1 + Math.sin(frame * 0.2) * 0.05;
                break;

            case 'think':
                offset.y = Math.sin(frame * 0.05) * 2;
                offset.rotation = Math.sin(frame * 0.02) * 2;
                break;

            case 'work':
                offset.y = Math.sin(frame * 0.15) * 2;
                offset.armAngle = Math.sin(frame * 0.2) * 15;
                break;

            case 'sleep':
                offset.y = Math.sin(frame * 0.03) * 3;
                offset.rotation = 5;
                break;

            case 'spin':
                const spinProgress = frame / 40;
                offset.rotation = spinProgress * 360;
                offset.y = Math.sin(spinProgress * Math.PI) * -20;
                break;

            case 'power':
                offset.y = Math.sin(frame * 0.3) * 5 - 10;
                offset.scaleX = 1 + Math.sin(frame * 0.2) * 0.1;
                offset.scaleY = 1 + Math.sin(frame * 0.2) * 0.1;
                break;
        }

        return offset;
    },

    /**
     * Draw avatar body
     */
    drawBody(offset) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2 + offset.x;
        const centerY = h - 80 + offset.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(offset.rotation * Math.PI / 180);
        if (offset.scaleX) ctx.scale(offset.scaleX, offset.scaleY);

        // Body glow for high levels
        if (this.evolutionStage >= 3) {
            ctx.shadowColor = this.colors.outfit;
            ctx.shadowBlur = 10;
        }

        // Body/Outfit
        const bodyItem = this.equippedItems.body;
        ctx.fillStyle = bodyItem?.color || this.colors.outfit;

        // Torso
        ctx.beginPath();
        ctx.roundRect(-25, -40, 50, 60, 10);
        ctx.fill();

        // Outfit details for higher evolution
        if (this.evolutionStage >= 2) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-15, -35);
            ctx.lineTo(0, -20);
            ctx.lineTo(15, -35);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Arms
        ctx.save();
        // Left arm
        ctx.translate(-25, -30);
        ctx.rotate(-20 * Math.PI / 180);
        ctx.fillStyle = this.colors.skin;
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 45, 8);
        ctx.fill();
        ctx.restore();

        // Right arm (animated)
        ctx.save();
        ctx.translate(25, -30);
        ctx.rotate((20 + offset.armAngle) * Math.PI / 180);
        ctx.fillStyle = this.colors.skin;
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 45, 8);
        ctx.fill();
        ctx.restore();

        // Legs
        ctx.fillStyle = '#4A4A6A';
        ctx.beginPath();
        ctx.roundRect(-20, 15, 15, 40, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(5, 15, 15, 40, 5);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw avatar head
     */
    drawHead(offset) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2 + offset.x;
        const centerY = h - 140 + offset.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(offset.rotation * Math.PI / 180);
        if (offset.scaleX) ctx.scale(offset.scaleX, offset.scaleY);

        // Head shape
        ctx.fillStyle = this.colors.skin;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        const hairColor = this.equippedItems.head?.color || this.colors.hair;
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(0, -5, 35, Math.PI, 0, false);
        ctx.quadraticCurveTo(35, -40, 0, -45);
        ctx.quadraticCurveTo(-35, -40, -35, 0);
        ctx.fill();

        // Evolution crown/halo for high levels
        if (this.evolutionStage >= 4) {
            this.drawEvolutionCrown(0, -50);
        }

        // Eyes
        const eyeOffset = this.currentAnimation === 'sleep' ? 0 : 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-12, -5, 10, 8 * eyeOffset, 0, 0, Math.PI * 2);
        ctx.ellipse(12, -5, 10, 8 * eyeOffset, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.currentAnimation !== 'sleep') {
            // Pupils with glow for higher evolution
            if (this.evolutionStage >= 3) {
                ctx.shadowColor = this.colors.eyes;
                ctx.shadowBlur = 8;
            }

            ctx.fillStyle = this.colors.eyes;
            ctx.beginPath();
            ctx.arc(-12, -3, 5, 0, Math.PI * 2);
            ctx.arc(12, -3, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Eye highlights
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-14, -5, 2, 0, Math.PI * 2);
            ctx.arc(10, -5, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Closed eyes (zzz)
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-18, -5);
            ctx.lineTo(-6, -5);
            ctx.moveTo(6, -5);
            ctx.lineTo(18, -5);
            ctx.stroke();

            // Z's
            ctx.fillStyle = this.colors.outfit;
            ctx.font = 'bold 14px Arial';
            const zOffset = Math.sin(this.animationFrame * 0.05) * 5;
            ctx.fillText('z', 35, -20 - zOffset);
            ctx.font = 'bold 10px Arial';
            ctx.fillText('z', 45, -35 - zOffset * 1.5);
        }

        // Mouth
        ctx.strokeStyle = '#E57373';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (this.currentAnimation === 'celebrate' || this.currentAnimation === 'dance' || this.currentAnimation === 'levelUp') {
            ctx.arc(0, 8, 12, 0.2, Math.PI - 0.2);
        } else if (this.currentAnimation === 'think') {
            ctx.moveTo(-8, 15);
            ctx.lineTo(8, 12);
        } else if (this.currentAnimation === 'power') {
            ctx.arc(0, 10, 8, 0, Math.PI);
        } else {
            ctx.arc(0, 5, 8, 0.3, Math.PI - 0.3);
        }
        ctx.stroke();

        // Blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-22, 8, 8, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(22, 8, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw evolution crown for high-level avatars
     */
    drawEvolutionCrown(x, y) {
        const ctx = this.ctx;
        const time = this.frameCount * 0.03;

        // Floating halo
        ctx.save();
        ctx.translate(x, y + Math.sin(time) * 3);

        const gradient = ctx.createLinearGradient(-20, 0, 20, 0);
        if (this.evolutionStage === 5) {
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.5, '#FFF8DC');
            gradient.addColorStop(1, '#FFD700');
        } else {
            gradient.addColorStop(0, '#9C27B0');
            gradient.addColorStop(0.5, '#E1BEE7');
            gradient.addColorStop(1, '#9C27B0');
        }

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 8, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Glow
        ctx.shadowColor = this.evolutionStage === 5 ? '#FFD700' : '#9C27B0';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Draw equipped items
     */
    drawEquippedItems(offset) {
        if (this.equippedItems.head) {
            this.drawHeadItem(offset);
        }
        if (this.equippedItems.accessory) {
            this.drawAccessory(offset);
        }
    },

    /**
     * Draw head item (hat, crown, etc)
     */
    drawHeadItem(offset) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const item = this.equippedItems.head;
        const centerX = w / 2 + offset.x;
        const centerY = h - 140 + offset.y;

        ctx.save();
        ctx.translate(centerX, centerY - 35);
        ctx.rotate(offset.rotation * Math.PI / 180);

        const rarity = item.rarity;
        let color = '#FFD700';
        if (rarity === 'legendary') color = '#FF6B6B';
        else if (rarity === 'epic') color = '#9C27B0';
        else if (rarity === 'rare') color = '#2196F3';

        // Crown-like shape
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-25, 10);
        ctx.lineTo(-25, -5);
        ctx.lineTo(-15, 5);
        ctx.lineTo(-5, -10);
        ctx.lineTo(0, 0);
        ctx.lineTo(5, -10);
        ctx.lineTo(15, 5);
        ctx.lineTo(25, -5);
        ctx.lineTo(25, 10);
        ctx.closePath();
        ctx.fill();

        // Gems
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw accessory
     */
    drawAccessory(offset) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const item = this.equippedItems.accessory;
        const centerX = w / 2 + offset.x;
        const centerY = h - 100 + offset.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(offset.rotation * Math.PI / 180);

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -20, 25, 0.3, Math.PI - 0.3);
        ctx.stroke();

        ctx.fillStyle = item.rarity === 'legendary' ? '#FF6B6B' : '#6C63FF';
        ctx.beginPath();
        ctx.arc(0, 5, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw background effect
     */
    drawBackground() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const item = this.equippedItems.background;

        const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);

        if (item.rarity === 'legendary') {
            gradient.addColorStop(0, 'rgba(255, 107, 107, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
        } else if (item.rarity === 'epic') {
            gradient.addColorStop(0, 'rgba(156, 39, 176, 0.3)');
            gradient.addColorStop(1, 'rgba(156, 39, 176, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(108, 99, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(108, 99, 255, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        const time = this.frameCount * 0.02;
        for (let i = 0; i < 5; i++) {
            const x = w/2 + Math.cos(time + i * 1.2) * 80;
            const y = h/2 + Math.sin(time + i * 1.2) * 60;
            const alpha = 0.3 + Math.sin(time * 2 + i) * 0.2;

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.drawStar(x, y, 3, 5, 2);
        }
    },

    /**
     * Draw pet companion
     */
    drawPet(offset) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const item = this.equippedItems.pet;

        const petX = w - 50 + Math.sin(this.frameCount * 0.05) * 5;
        const petY = h - 50 + Math.sin(this.frameCount * 0.08) * 3;

        ctx.save();
        ctx.translate(petX, petY);

        const color = item.rarity === 'legendary' ? '#FF6B6B' : '#6C63FF';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-10, -8, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-18, -15);
        ctx.lineTo(-15, -25);
        ctx.lineTo(-10, -15);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, -15);
        ctx.lineTo(-5, -25);
        ctx.lineTo(0, -15);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-13, -8, 4, 0, Math.PI * 2);
        ctx.arc(-7, -8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-13, -7, 2, 0, Math.PI * 2);
        ctx.arc(-7, -7, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.quadraticCurveTo(25, -10 + Math.sin(this.frameCount * 0.1) * 5, 20, -20);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Draw special effect
     */
    drawEffect() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const item = this.equippedItems.effect;
        const time = this.frameCount * 0.03;

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time;
            const radius = 70 + Math.sin(time * 2 + i) * 10;
            const x = w/2 + Math.cos(angle) * radius;
            const y = h/2 - 20 + Math.sin(angle) * radius * 0.8;
            const alpha = 0.5 + Math.sin(time * 3 + i) * 0.3;
            const size = 2 + Math.sin(time * 2 + i * 0.5) * 1;

            const color = item.rarity === 'legendary' ?
                `rgba(255, 215, 0, ${alpha})` :
                `rgba(108, 99, 255, ${alpha})`;

            ctx.fillStyle = color;
            this.drawStar(x, y, size, 4, size/2);
        }
    },

    /**
     * Draw star shape
     */
    drawStar(cx, cy, outerRadius, points, innerRadius) {
        const ctx = this.ctx;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / points) - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    },

    /**
     * Add celebration particles
     */
    addCelebrationParticles() {
        const w = this.canvas.width;
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9C27B0'];

        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: w / 2,
                y: this.canvas.height / 2 - 50,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 10 - 3,
                size: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 70,
                maxLife: 70,
                alpha: 1,
                gravity: 0.15,
                decay: 0.99
            });
        }
    },

    /**
     * Add evolution particles
     */
    addEvolutionParticles() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const color = this.colors.outfit;

        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            this.particles.push({
                x: w / 2 + Math.cos(angle) * 30,
                y: h - 120 + Math.sin(angle) * 30,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3 - 2,
                size: Math.random() * 4 + 2,
                color: color,
                life: 60,
                maxLife: 60,
                alpha: 1,
                gravity: 0,
                decay: 0.97
            });
        }
    },

    /**
     * Add XP gain particles
     */
    addXPParticles(amount) {
        const w = this.canvas.width;
        const count = Math.min(amount / 5, 20);

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: w / 2 + (Math.random() - 0.5) * 60,
                y: this.canvas.height - 80,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 1,
                size: 3,
                color: '#FFD700',
                life: 40,
                maxLife: 40,
                alpha: 1,
                gravity: -0.02,
                decay: 0.98
            });
        }
    },

    /**
     * Add power-up particles
     */
    addPowerParticles() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: w / 2,
                y: h - 100,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 6,
                size: Math.random() * 5 + 2,
                color: this.colors.outfit,
                life: 50,
                maxLife: 50,
                alpha: 1,
                gravity: 0.1,
                decay: 0.98
            });
        }
    },

    /**
     * Draw particles
     */
    drawParticles() {
        const ctx = this.ctx;

        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;
    },

    /**
     * Helper: Shade color
     */
    shadeColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    },

    /**
     * Clean up
     */
    destroy() {
        this.isInitialized = false;
        this.particles = [];
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarSystem;
}

// Make globally available
window.AvatarSystem = AvatarSystem;
