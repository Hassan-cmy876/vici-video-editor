/**
 * Vici Video Editor - Templates Manager
 * Handles pre-made templates, transitions, and animations
 */

export class TemplatesManager {
    constructor(app) {
        this.app = app;
        this.previewWrapper = document.getElementById('previewWrapper');
        this.video = document.getElementById('previewVideo');
        
        this.templates = {
            // Intro templates
            'intro-fade': {
                name: 'Fade In',
                type: 'intro',
                duration: 1.5,
                apply: () => this.fadeIn()
            },
            'intro-zoom': {
                name: 'Zoom In',
                type: 'intro',
                duration: 1,
                apply: () => this.zoomIn()
            },
            'intro-slide': {
                name: 'Slide In',
                type: 'intro',
                duration: 0.8,
                apply: () => this.slideIn()
            },
            'intro-glitch': {
                name: 'Glitch',
                type: 'intro',
                duration: 0.5,
                apply: () => this.glitchIntro()
            },
            
            // Transitions
            'trans-dissolve': {
                name: 'Dissolve',
                type: 'transition',
                duration: 1,
                apply: () => this.dissolve()
            },
            'trans-wipe': {
                name: 'Wipe',
                type: 'transition',
                duration: 0.8,
                apply: () => this.wipe()
            },
            'trans-spin': {
                name: 'Spin',
                type: 'transition',
                duration: 0.6,
                apply: () => this.spin()
            },
            'trans-blur': {
                name: 'Blur',
                type: 'transition',
                duration: 0.5,
                apply: () => this.blurTransition()
            },
            
            // Outro templates
            'outro-fade': {
                name: 'Fade Out',
                type: 'outro',
                duration: 1.5,
                apply: () => this.fadeOut()
            },
            'outro-zoom': {
                name: 'Zoom Out',
                type: 'outro',
                duration: 1,
                apply: () => this.zoomOut()
            }
        };
    }

    applyTemplate(templateId) {
        const template = this.templates[templateId];
        if (!template) return;
        
        template.apply();
        this.app.showToast(`Applied: ${template.name}`, 'success');
    }

    // Intro animations
    fadeIn() {
        this.animate({
            duration: 1500,
            keyframes: [
                { opacity: 0 },
                { opacity: 1 }
            ]
        });
    }

    zoomIn() {
        this.animate({
            duration: 1000,
            keyframes: [
                { transform: 'scale(1.5)', opacity: 0 },
                { transform: 'scale(1)', opacity: 1 }
            ]
        });
    }

    slideIn() {
        this.animate({
            duration: 800,
            keyframes: [
                { transform: 'translateX(-100%)', opacity: 0 },
                { transform: 'translateX(0)', opacity: 1 }
            ]
        });
    }

    glitchIntro() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: #000;
            z-index: 10;
        `;
        this.previewWrapper.appendChild(overlay);

        // Rapid flicker effect
        let flickers = 0;
        const flickerInterval = setInterval(() => {
            overlay.style.opacity = Math.random() > 0.5 ? '1' : '0';
            this.video.style.transform = `translateX(${(Math.random() - 0.5) * 10}px)`;
            flickers++;
            
            if (flickers > 20) {
                clearInterval(flickerInterval);
                overlay.remove();
                this.video.style.transform = 'none';
            }
        }, 50);
    }

    // Transitions
    dissolve() {
        this.animate({
            duration: 1000,
            keyframes: [
                { opacity: 1, filter: 'brightness(1)' },
                { opacity: 0.5, filter: 'brightness(1.5)' },
                { opacity: 1, filter: 'brightness(1)' }
            ]
        });
    }

    wipe() {
        const wiper = document.createElement('div');
        wiper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 100%;
            background: linear-gradient(90deg, #8B5CF6, #3B82F6);
            z-index: 10;
            transition: width 0.4s ease-in-out;
        `;
        this.previewWrapper.appendChild(wiper);

        requestAnimationFrame(() => {
            wiper.style.width = '100%';
            
            setTimeout(() => {
                wiper.style.left = 'auto';
                wiper.style.right = '0';
                wiper.style.width = '0';
                
                setTimeout(() => wiper.remove(), 400);
            }, 400);
        });
    }

    spin() {
        this.animate({
            duration: 600,
            keyframes: [
                { transform: 'scale(1) rotate(0deg)' },
                { transform: 'scale(0.8) rotate(180deg)' },
                { transform: 'scale(1) rotate(360deg)' }
            ]
        });
    }

    blurTransition() {
        this.animate({
            duration: 500,
            keyframes: [
                { filter: 'blur(0px)' },
                { filter: 'blur(20px)' },
                { filter: 'blur(0px)' }
            ]
        });
    }

    // Outro animations
    fadeOut() {
        this.animate({
            duration: 1500,
            keyframes: [
                { opacity: 1 },
                { opacity: 0 }
            ]
        });
    }

    zoomOut() {
        this.animate({
            duration: 1000,
            keyframes: [
                { transform: 'scale(1)', opacity: 1 },
                { transform: 'scale(0.5)', opacity: 0 }
            ]
        });
    }

    // Animation helper
    animate(options) {
        const { duration, keyframes } = options;
        
        this.video.animate(keyframes, {
            duration,
            easing: 'ease-in-out',
            fill: 'forwards'
        }).onfinish = () => {
            // Reset to final state
            this.video.style.opacity = '1';
            this.video.style.transform = 'none';
            this.video.style.filter = 'none';
        };
    }

    // Text animation presets
    getTextAnimations() {
        return {
            'text-fade': {
                name: 'Fade',
                keyframes: [
                    { opacity: 0 },
                    { opacity: 1 }
                ]
            },
            'text-slide-up': {
                name: 'Slide Up',
                keyframes: [
                    { transform: 'translateY(50px)', opacity: 0 },
                    { transform: 'translateY(0)', opacity: 1 }
                ]
            },
            'text-slide-left': {
                name: 'Slide Left',
                keyframes: [
                    { transform: 'translateX(50px)', opacity: 0 },
                    { transform: 'translateX(0)', opacity: 1 }
                ]
            },
            'text-scale': {
                name: 'Scale',
                keyframes: [
                    { transform: 'scale(0)', opacity: 0 },
                    { transform: 'scale(1)', opacity: 1 }
                ]
            },
            'text-typewriter': {
                name: 'Typewriter',
                custom: true
            },
            'text-bounce': {
                name: 'Bounce',
                keyframes: [
                    { transform: 'translateY(-100px)', opacity: 0 },
                    { transform: 'translateY(10px)', opacity: 1 },
                    { transform: 'translateY(-5px)' },
                    { transform: 'translateY(0)' }
                ]
            }
        };
    }

    // Lower thirds template
    createLowerThird(title, subtitle) {
        const element = document.createElement('div');
        element.className = 'lower-third';
        element.innerHTML = `
            <div class="lower-third-content">
                <div class="lower-third-title">${title}</div>
                <div class="lower-third-subtitle">${subtitle}</div>
            </div>
        `;
        
        element.style.cssText = `
            position: absolute;
            bottom: 60px;
            left: 40px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(59, 130, 246, 0.9));
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-family: Inter, sans-serif;
            animation: slideInLeft 0.5s ease-out;
        `;
        
        this.previewWrapper.appendChild(element);
        return element;
    }

    // Subscribe button template
    createSubscribeButton() {
        const element = document.createElement('div');
        element.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                gap: 12px;
                background: #FF0000;
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-family: Inter, sans-serif;
                font-weight: 600;
                animation: bounceIn 0.5s ease-out;
            ">
                <span>▶</span>
                SUBSCRIBE
            </div>
        `;
        
        element.style.cssText = `
            position: absolute;
            bottom: 80px;
            right: 40px;
        `;
        
        this.previewWrapper.appendChild(element);
        return element;
    }
}
