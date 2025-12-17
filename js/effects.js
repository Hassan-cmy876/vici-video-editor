/**
 * Vici Video Editor - Effects Manager
 * Handles filters, color correction, and visual effects
 */

export class EffectsManager {
    constructor(app) {
        this.app = app;
        this.video = document.getElementById('previewVideo');
        this.canvas = document.getElementById('previewCanvas');
        this.previewWrapper = document.getElementById('previewWrapper');

        // Effect overlays
        this.vignetteOverlay = null;
        this.grainOverlay = null;
    }

    applyFilter(filterName) {
        // Remove all filter classes
        this.video.className = 'preview-video';
        this.canvas.className = 'preview-canvas';

        // Apply new filter
        if (filterName !== 'none') {
            this.video.classList.add(`filter-${filterName}`);
            this.canvas.classList.add(`filter-${filterName}`);
        }
    }

    applyEffects() {
        const effects = this.app.state.effects;
        
        // Build CSS filter string
        let filters = [];
        
        if (effects.brightness !== 0) {
            filters.push(`brightness(${1 + effects.brightness / 100})`);
        }
        if (effects.contrast !== 0) {
            filters.push(`contrast(${1 + effects.contrast / 100})`);
        }
        if (effects.saturation !== 0) {
            filters.push(`saturate(${1 + effects.saturation / 100})`);
        }
        if (effects.sharpness > 0) {
            // Sharpness simulated via contrast
            filters.push(`contrast(${1 + effects.sharpness / 200})`);
        }
        if (effects.blur) {
            filters.push('blur(3px)');
        }

        // Apply current filter preset on top
        const currentFilter = this.app.state.currentFilter;
        const filterPresets = {
            vintage: 'sepia(0.4) saturate(0.8) contrast(1.1) brightness(0.95)',
            cinematic: 'contrast(1.2) saturate(0.9) brightness(0.95)',
            bw: 'grayscale(1) contrast(1.1)',
            warm: 'sepia(0.2) saturate(1.3) brightness(1.02)',
            cool: 'saturate(0.9) hue-rotate(15deg) brightness(1.02)',
            vivid: 'saturate(1.5) contrast(1.1)',
            matte: 'contrast(0.9) brightness(1.1) saturate(0.8)',
            neon: 'saturate(1.8) brightness(1.1) contrast(1.1)',
            retro: 'sepia(0.3) contrast(1.1) brightness(0.95) saturate(0.9)',
            dramatic: 'contrast(1.4) saturate(0.8) brightness(0.9)',
            sepia: 'sepia(0.8)'
        };

        let finalFilter = filters.join(' ');
        if (currentFilter !== 'none' && filterPresets[currentFilter]) {
            finalFilter += ' ' + filterPresets[currentFilter];
        }

        this.video.style.filter = finalFilter.trim() || 'none';
        this.canvas.style.filter = finalFilter.trim() || 'none';

        // Handle overlay effects
        this.toggleVignette(effects.vignette);
        this.toggleGrain(effects.grain);
    }

    toggleVignette(enabled) {
        if (enabled && !this.vignetteOverlay) {
            this.vignetteOverlay = document.createElement('div');
            this.vignetteOverlay.className = 'vignette-overlay';
            this.previewWrapper.appendChild(this.vignetteOverlay);
        } else if (!enabled && this.vignetteOverlay) {
            this.vignetteOverlay.remove();
            this.vignetteOverlay = null;
        }
    }

    toggleGrain(enabled) {
        if (enabled && !this.grainOverlay) {
            this.grainOverlay = document.createElement('div');
            this.grainOverlay.className = 'grain-overlay';
            this.previewWrapper.appendChild(this.grainOverlay);
        } else if (!enabled && this.grainOverlay) {
            this.grainOverlay.remove();
            this.grainOverlay = null;
        }
    }

    autoEnhance(type) {
        switch (type) {
            case 'auto':
                // Auto-enhance: subtle improvements
                this.app.state.effects.brightness = 5;
                this.app.state.effects.contrast = 10;
                this.app.state.effects.saturation = 15;
                this.app.state.effects.sharpness = 20;
                
                // Update slider values
                this.updateSlider('brightnessSlider', 'brightnessValue', 5);
                this.updateSlider('contrastSlider', 'contrastValue', 10);
                this.updateSlider('saturationSlider', 'saturationValue', 15);
                this.updateSlider('sharpnessSlider', 'sharpnessValue', 20);
                
                this.applyEffects();
                this.app.showToast('Auto-enhance applied!', 'success');
                break;
                
            case 'hd':
                // HD upscale simulation
                this.app.state.effects.sharpness = 40;
                this.app.state.effects.contrast = 5;
                
                this.updateSlider('sharpnessSlider', 'sharpnessValue', 40);
                this.updateSlider('contrastSlider', 'contrastValue', 5);
                
                this.applyEffects();
                this.app.showToast('HD enhancement applied!', 'success');
                break;
        }
    }

    updateSlider(sliderId, valueId, value) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        if (slider) slider.value = value;
        if (valueEl) valueEl.textContent = value;
    }

    resetEffects() {
        this.app.state.effects = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            vignette: false,
            grain: false,
            blur: false,
            glitch: false
        };
        
        this.app.state.currentFilter = 'none';
        
        // Reset all sliders
        this.updateSlider('brightnessSlider', 'brightnessValue', 0);
        this.updateSlider('contrastSlider', 'contrastValue', 0);
        this.updateSlider('saturationSlider', 'saturationValue', 0);
        this.updateSlider('sharpnessSlider', 'sharpnessValue', 0);
        
        // Reset filter selection
        document.querySelectorAll('.filter-card').forEach(card => {
            card.classList.toggle('active', card.dataset.filter === 'none');
        });
        
        // Reset effect buttons
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        this.applyEffects();
        this.app.showToast('Effects reset', 'success');
    }

    // Glitch effect
    applyGlitch() {
        if (!this.app.state.effects.glitch) return;
        
        const canvas = this.canvas;
        const ctx = canvas.getContext('2d');
        
        // Random glitch slices
        const sliceCount = Math.floor(Math.random() * 5) + 2;
        
        for (let i = 0; i < sliceCount; i++) {
            const y = Math.random() * canvas.height;
            const height = Math.random() * 30 + 5;
            const offset = (Math.random() - 0.5) * 40;
            
            const imageData = ctx.getImageData(0, y, canvas.width, height);
            ctx.putImageData(imageData, offset, y);
        }
        
        // Color channel shift
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const shift = Math.floor(Math.random() * 10) + 2;
        
        for (let i = 0; i < data.length; i += 4) {
            // Shift red channel
            if (i + shift * 4 < data.length) {
                data[i] = data[i + shift * 4];
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    // Color grading presets
    applyColorGrade(grade) {
        const grades = {
            'teal-orange': {
                brightness: 0,
                contrast: 15,
                saturation: 20,
                filter: 'none'
            },
            'moody-blue': {
                brightness: -10,
                contrast: 20,
                saturation: -20,
                filter: 'cool'
            },
            'golden-hour': {
                brightness: 10,
                contrast: 5,
                saturation: 30,
                filter: 'warm'
            },
            'noir': {
                brightness: 0,
                contrast: 30,
                saturation: -100,
                filter: 'bw'
            }
        };

        const settings = grades[grade];
        if (!settings) return;

        Object.assign(this.app.state.effects, {
            brightness: settings.brightness,
            contrast: settings.contrast,
            saturation: settings.saturation
        });
        
        this.app.state.currentFilter = settings.filter;
        this.applyEffects();
    }
}
