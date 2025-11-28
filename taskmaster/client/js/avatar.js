/**
 * TaskMaster Avatar System
 * Animated avatar with customization and movements
 */

const AvatarSystem = {
    canvas: null,
    ctx: null,
    currentAnimation: 'idle',
    animationFrame: 0,
    frameCount: 0,
    equippedItems: {},
    avatarConfig: {},
    particles: [],
    isInitialized: false,

    // Avatar base colors
    colors: {
        skin: '#FFD5B8',
        hair: '#4A3C2A',
        eyes: '#2196F3',
        outfit: '#6C63FF'
    },

    // Animation states
    animations: {
        idle: { frames: 60, loop: true },
        wave: { frames: 45, loop: false },
        jump: { frames: 30, loop: false },
        dance: { frames: 90, loop: true },
        celebrate: { frames: 60, loop: false },
        think: { frames: 120, loop: true },
        work: { frames: 80, loop: true },
        sleep: { frames: 100, loop: true }
    },

    /**
     * Initialize the avatar system
     */
    init(containerId = 'avatar-canvas') {
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
            this.canvas.height = 250;
            container.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
        this.isInitialized = true;

        // Load user's avatar config
        this.loadAvatarConfig();

        // Start animation loop
        this.startAnimationLoop();
    },

    /**
     * Load avatar configuration from user data
     */
    loadAvatarConfig() {
        const user = window.TaskMasterApp?.currentUser;
        if (user?.avatarConfig) {
            this.avatarConfig = user.avatarConfig;
            this.colors = {
                ...this.colors,
                ...this.avatarConfig.colors
            };
        }
    },

    /**
     * Update equipped items
     */
    setEquippedItems(items) {
        this.equippedItems = {};
        items.forEach(item => {
            if (item.is_equipped) {
                this.equippedItems[item.category] = item;
            }
        });
    },

    /**
     * Play a specific animation
     */
    playAnimation(name) {
        if (this.animations[name]) {
            this.currentAnimation = name;
            this.animationFrame = 0;

            // Add particles for celebrate animation
            if (name === 'celebrate') {
                this.addCelebrationParticles();
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
            p.vy += 0.1; // gravity
            p.life--;
            p.alpha = p.life / p.maxLife;
            return p.life > 0;
        });
    },

    /**
     * Render the avatar
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

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
        ctx.ellipse(w/2, h - 20, 40 - offset.shadowOffset, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw pet if equipped
        if (this.equippedItems.pet) {
            this.drawPet(offset);
        }

        // Draw body
        this.drawBody(offset);

        // Draw head
        this.drawHead(offset);

        // Draw equipped items
        this.drawEquippedItems(offset);

        // Draw effect if equipped
        if (this.equippedItems.effect) {
            this.drawEffect();
        }

        // Draw particles
        this.drawParticles();
    },

    /**
     * Get animation offset values
     */
    getAnimationOffset() {
        const frame = this.animationFrame;
        const anim = this.currentAnimation;
        let offset = { x: 0, y: 0, rotation: 0, armAngle: 0, shadowOffset: 0 };

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
                offset.y = -Math.sin(jumpProgress * Math.PI) * 40;
                offset.shadowOffset = Math.sin(jumpProgress * Math.PI) * 20;
                break;

            case 'dance':
                offset.x = Math.sin(frame * 0.15) * 10;
                offset.y = Math.abs(Math.sin(frame * 0.2)) * -10;
                offset.rotation = Math.sin(frame * 0.1) * 5;
                break;

            case 'celebrate':
                offset.y = Math.abs(Math.sin(frame * 0.2)) * -15;
                offset.armAngle = Math.sin(frame * 0.3) * 45;
                offset.rotation = Math.sin(frame * 0.15) * 3;
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

        // Body
        const bodyItem = this.equippedItems.body;
        ctx.fillStyle = bodyItem?.color || this.colors.outfit;

        // Torso
        ctx.beginPath();
        ctx.roundRect(-25, -40, 50, 60, 10);
        ctx.fill();

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

        // Eyes
        const eyeOffset = this.currentAnimation === 'sleep' ? 0 : 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-12, -5, 10, 8 * eyeOffset, 0, 0, Math.PI * 2);
        ctx.ellipse(12, -5, 10, 8 * eyeOffset, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.currentAnimation !== 'sleep') {
            // Pupils
            ctx.fillStyle = this.colors.eyes;
            ctx.beginPath();
            ctx.arc(-12, -3, 5, 0, Math.PI * 2);
            ctx.arc(12, -3, 5, 0, Math.PI * 2);
            ctx.fill();

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
            ctx.fillStyle = '#6C63FF';
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
        if (this.currentAnimation === 'celebrate' || this.currentAnimation === 'dance') {
            // Happy mouth
            ctx.arc(0, 8, 12, 0.2, Math.PI - 0.2);
        } else if (this.currentAnimation === 'think') {
            // Thinking mouth
            ctx.moveTo(-8, 15);
            ctx.lineTo(8, 12);
        } else {
            // Normal smile
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
     * Draw equipped items
     */
    drawEquippedItems(offset) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Head item
        if (this.equippedItems.head) {
            this.drawHeadItem(offset);
        }

        // Accessory
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

        // Draw based on item id (simplified - would load actual sprites)
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

        // Necklace/pendant
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -20, 25, 0.3, Math.PI - 0.3);
        ctx.stroke();

        // Pendant
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

        // Stars
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
        const petY = h - 40 + Math.sin(this.frameCount * 0.08) * 3;

        ctx.save();
        ctx.translate(petX, petY);

        // Simple pet (could be cat, dog, dragon based on item)
        const color = item.rarity === 'legendary' ? '#FF6B6B' : '#6C63FF';

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(-10, -8, 10, 0, Math.PI * 2);
        ctx.fill();

        // Ears
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

        // Eyes
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

        // Tail
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

        // Sparkle effect around avatar
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time;
            const radius = 70 + Math.sin(time * 2 + i) * 10;
            const x = w/2 + Math.cos(angle) * radius;
            const y = h/2 + Math.sin(angle) * radius * 0.8;
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
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: -Math.random() * 8 - 2,
                size: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 60,
                maxLife: 60,
                alpha: 1
            });
        }
    },

    /**
     * Draw particles
     */
    drawParticles() {
        const ctx = this.ctx;

        this.particles.forEach(p => {
            ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
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
