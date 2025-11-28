/**
 * TaskMaster - Advanced Animations
 * Gun5.team and Rocketbank style animations
 */

const Animations = {
    /**
     * Initialize all animations
     */
    init() {
        this.initScrollReveal();
        this.initParallax();
        this.initMagneticButtons();
        this.initCursorSpotlight();
        this.initScrollProgress();
        this.initTiltCards();
        this.initPageTransitions();
        this.initParticles();
    },

    /**
     * Scroll Reveal Animation
     */
    initScrollReveal() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Add stagger delay based on index
                    const delay = (index % 8) * 0.1;
                    entry.target.style.transitionDelay = `${delay}s`;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all reveal elements
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            observer.observe(el);
        });

        // Auto-add reveal class to cards and items
        document.querySelectorAll('.card, .stat-card, .task-card, .shop-item').forEach(el => {
            if (!el.classList.contains('reveal')) {
                el.classList.add('reveal');
                observer.observe(el);
            }
        });
    },

    /**
     * Parallax Effect on Scroll
     */
    initParallax() {
        const parallaxElements = document.querySelectorAll('.parallax-bg, .cosmic-bg');

        window.addEventListener('scroll', Utils.throttle(() => {
            const scrolled = window.pageYOffset;

            parallaxElements.forEach(el => {
                const speed = el.dataset.speed || 0.5;
                el.style.setProperty('--parallax-offset', `${scrolled * speed}px`);
            });
        }, 16));
    },

    /**
     * Magnetic Button Effect
     */
    initMagneticButtons() {
        const magneticElements = document.querySelectorAll('.btn-primary, .nav-item, .magnetic-hover');

        magneticElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                const strength = 0.2;
                el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    },

    /**
     * Cursor Following Spotlight
     */
    initCursorSpotlight() {
        const spotlight = document.createElement('div');
        spotlight.className = 'spotlight';
        spotlight.style.opacity = '0';
        document.body.appendChild(spotlight);

        let isVisible = false;

        document.addEventListener('mousemove', Utils.throttle((e) => {
            spotlight.style.left = `${e.clientX}px`;
            spotlight.style.top = `${e.clientY}px`;

            if (!isVisible) {
                spotlight.style.opacity = '1';
                isVisible = true;
            }
        }, 16));

        document.addEventListener('mouseleave', () => {
            spotlight.style.opacity = '0';
            isVisible = false;
        });
    },

    /**
     * Scroll Progress Indicator
     */
    initScrollProgress() {
        const progress = document.createElement('div');
        progress.className = 'scroll-progress';
        document.body.appendChild(progress);

        window.addEventListener('scroll', Utils.throttle(() => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollTop / docHeight;

            progress.style.transform = `scaleX(${scrollPercent})`;
        }, 16));
    },

    /**
     * 3D Tilt Cards
     */
    initTiltCards() {
        const tiltElements = document.querySelectorAll('.card-3d, .tilt-card');

        tiltElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;

                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    },

    /**
     * Page Transition Animation
     */
    initPageTransitions() {
        // Animate page sections when switching
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const currentPage = document.querySelector('.page-section.active');
                if (currentPage) {
                    currentPage.classList.add('page-exit');
                    setTimeout(() => {
                        currentPage.classList.remove('page-exit');
                    }, 300);
                }
            });
        });

        // Add CSS for page exit animation
        const style = document.createElement('style');
        style.textContent = `
            .page-section.page-exit {
                animation: pageSlideOut 0.3s ease forwards;
            }
            @keyframes pageSlideOut {
                to {
                    opacity: 0;
                    transform: translateY(-20px);
                }
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Floating Particles Background
     */
    initParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.appendChild(container);

        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                left: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * 10}s;
                animation-duration: ${10 + Math.random() * 10}s;
                width: ${2 + Math.random() * 4}px;
                height: ${2 + Math.random() * 4}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
            `;
            container.appendChild(particle);
        }
    },

    /**
     * Add hover animations to elements
     */
    addHoverEffects(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('hover-lift');
        });
    },

    /**
     * Create ripple effect on click
     */
    createRipple(event) {
        const element = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(element.clientWidth, element.clientHeight);
        const radius = diameter / 2;

        circle.style.cssText = `
            width: ${diameter}px;
            height: ${diameter}px;
            left: ${event.clientX - element.offsetLeft - radius}px;
            top: ${event.clientY - element.offsetTop - radius}px;
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;

        element.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
    },

    /**
     * Animate counter numbers
     */
    animateCounter(element, target, duration = 1500) {
        let start = 0;
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(easeOutQuart * target);

            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        };

        requestAnimationFrame(updateCounter);
    },

    /**
     * Typewriter effect
     */
    typeWriter(element, text, speed = 50) {
        let i = 0;
        element.textContent = '';

        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        };

        type();
    },

    /**
     * Shake animation for errors
     */
    shake(element) {
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), 500);
    },

    /**
     * Success pulse animation
     */
    successPulse(element) {
        element.classList.add('success-pulse');
        setTimeout(() => element.classList.remove('success-pulse'), 1000);
    }
};

// Add shake and success-pulse CSS
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-10px); }
        40% { transform: translateX(10px); }
        60% { transform: translateX(-10px); }
        80% { transform: translateX(10px); }
    }
    .shake { animation: shake 0.5s ease; }

    @keyframes successPulse {
        0% { box-shadow: 0 0 0 0 rgba(67, 233, 123, 0.5); }
        50% { box-shadow: 0 0 0 15px rgba(67, 233, 123, 0); }
        100% { box-shadow: 0 0 0 0 rgba(67, 233, 123, 0); }
    }
    .success-pulse { animation: successPulse 1s ease; }

    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(animationStyles);

// Initialize animations when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Animations.init());
} else {
    Animations.init();
}

// Export
window.Animations = Animations;
