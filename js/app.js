/**
 * Vici Video Editor - Main Application
 * Entry point and module coordination
 */
// Vici Video Editor App - Created by [Hassan Ashraf]
// Copyright © 2025 [Hassan Ashraf]

import { VideoManager } from './video.js';
import { TimelineManager } from './timeline.js';
import { EffectsManager } from './effects.js';
import { TemplatesManager } from './templates.js';
import { AudioManager } from './audio.js';

class ViciApp {
    constructor() {
        this.state = {
            currentTab: 'edit',
            selectedClip: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 100,
            zoom: 5,
            clips: [],
            textOverlays: [],
            currentFilter: 'none',
            effects: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                sharpness: 0,
                vignette: false,
                grain: false,
                blur: false,
                glitch: false
            },
            transform: {
                scale: 100,
                rotation: 0,
                speed: 100
            }
        };

        this.init();
    }

    async init() {
        // Initialize managers
        this.video = new VideoManager(this);
        this.timeline = new TimelineManager(this);
        this.effects = new EffectsManager(this);
        this.templates = new TemplatesManager(this);
        this.audio = new AudioManager(this);

        // Setup event listeners
        this.setupNavigation();
        this.setupFileUpload();
        this.setupPlaybackControls();
        this.setupPropertyControls();
        this.setupModals();
        this.setupKeyboardShortcuts();
        this.setupToolbar();

        // Initialize timeline ruler
        this.timeline.initRuler();

        console.log('Vici Video Editor initialized');
        this.showToast('Welcome to Vici!', 'success');
    }

    // Navigation
    setupNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content panels
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });

        this.state.currentTab = tabName;
    }

    // File Upload
    setupFileUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const importBtn = document.getElementById('importBtn');

        uploadZone.addEventListener('click', () => fileInput.click());
        importBtn.addEventListener('click', () => fileInput.click());

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragging');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragging');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragging');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
            files.forEach(file => this.video.addMedia(file));
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => this.video.addMedia(file));
            fileInput.value = '';
        });
    }

    // Playback Controls
    setupPlaybackControls() {
        const playBtn = document.getElementById('playBtn');
        const skipBackBtn = document.getElementById('skipBackBtn');
        const skipForwardBtn = document.getElementById('skipForwardBtn');
        const volumeBtn = document.getElementById('volumeBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const fullscreenBtn = document.getElementById('fullscreenBtn');

        playBtn.addEventListener('click', () => this.togglePlayback());
        skipBackBtn.addEventListener('click', () => this.video.skip(-5));
        skipForwardBtn.addEventListener('click', () => this.video.skip(5));

        volumeSlider.addEventListener('input', (e) => {
            this.setVolume(parseInt(e.target.value));
        });

        volumeBtn.addEventListener('click', () => {
            this.setVolume(this.state.volume > 0 ? 0 : 100);
            volumeSlider.value = this.state.volume;
        });

        fullscreenBtn.addEventListener('click', () => this.video.toggleFullscreen());
    }

    togglePlayback() {
        if (this.state.isPlaying) {
            this.video.pause();
        } else {
            this.video.play();
        }
    }

    setPlaying(isPlaying) {
        this.state.isPlaying = isPlaying;
        document.getElementById('playIcon').style.display = isPlaying ? 'none' : 'block';
        document.getElementById('pauseIcon').style.display = isPlaying ? 'block' : 'none';
    }

    setVolume(volume) {
        this.state.volume = volume;
        this.video.setVolume(volume / 100);
    }

    updateTime(current, duration) {
        this.state.currentTime = current;
        this.state.duration = duration;
        document.getElementById('currentTime').textContent = this.formatTime(current);
        document.getElementById('totalTime').textContent = this.formatTime(duration);
        this.timeline.updatePlayhead(current, duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Property Controls
    setupPropertyControls() {
        // Transform controls
        this.setupSlider('scaleSlider', 'scaleValue', (v) => `${v}%`, (v) => {
            this.state.transform.scale = v;
            this.video.updateTransform();
        });

        this.setupSlider('rotationSlider', 'rotationValue', (v) => `${v}°`, (v) => {
            this.state.transform.rotation = v;
            this.video.updateTransform();
        });

        this.setupSlider('speedSlider', 'speedValue', (v) => `${(v/100).toFixed(1)}x`, (v) => {
            this.state.transform.speed = v;
            this.video.setPlaybackRate(v / 100);
        });

        // Enhancement controls
        this.setupSlider('brightnessSlider', 'brightnessValue', (v) => v, (v) => {
            this.state.effects.brightness = v;
            this.effects.applyEffects();
        });

        this.setupSlider('contrastSlider', 'contrastValue', (v) => v, (v) => {
            this.state.effects.contrast = v;
            this.effects.applyEffects();
        });

        this.setupSlider('saturationSlider', 'saturationValue', (v) => v, (v) => {
            this.state.effects.saturation = v;
            this.effects.applyEffects();
        });

        this.setupSlider('sharpnessSlider', 'sharpnessValue', (v) => v, (v) => {
            this.state.effects.sharpness = v;
            this.effects.applyEffects();
        });

        // Font size
        this.setupSlider('fontSizeSlider', 'fontSizeValue', (v) => `${v}px`, (v) => {
            // Update selected text overlay
        });

        // Master volume
        this.setupSlider('masterVolumeSlider', 'masterVolumeValue', (v) => `${v}%`, (v) => {
            this.audio.setMasterVolume(v / 100);
        });

        // Filter cards
        document.querySelectorAll('.filter-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.state.currentFilter = card.dataset.filter;
                this.effects.applyFilter(card.dataset.filter);
            });
        });

        // Effect buttons
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const effect = btn.dataset.effect;
                this.state.effects[effect] = btn.classList.contains('active');
                this.effects.applyEffects();
            });
        });

        // Enhance buttons
        document.querySelectorAll('.enhance-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.effects.autoEnhance(btn.dataset.enhance);
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 1000);
            });
        });

        // Template cards
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                this.templates.applyTemplate(card.dataset.template);
            });
        });

        // Audio buttons
        document.querySelectorAll('.audio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audio.applyAudioEffect(btn.dataset.audio);
            });
        });

        // Text buttons
        document.getElementById('addTextBtn')?.addEventListener('click', () => {
            this.showModal('textModal');
        });

        document.getElementById('addMusicBtn')?.addEventListener('click', () => {
            this.audio.addBackgroundMusic();
        });
    }

    setupSlider(sliderId, valueId, formatFn, onChange) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        
        if (!slider || !valueEl) return;

        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            valueEl.textContent = formatFn(value);
            onChange(value);
        });
    }

    // Toolbar
    setupToolbar() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.timeline.setTool(btn.dataset.tool);
            });
        });

        document.getElementById('splitBtn')?.addEventListener('click', () => {
            this.timeline.splitClip();
        });

        document.getElementById('deleteBtn')?.addEventListener('click', () => {
            this.timeline.deleteSelectedClip();
        });

        // Zoom controls
        document.getElementById('zoomInBtn')?.addEventListener('click', () => {
            this.timeline.zoomIn();
        });

        document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
            this.timeline.zoomOut();
        });

        document.getElementById('zoomSlider')?.addEventListener('input', (e) => {
            this.timeline.setZoom(parseInt(e.target.value));
        });
    }

    // Modals
    setupModals() {
        // Export modal
        const exportBtn = document.getElementById('exportBtn');
        const exportModal = document.getElementById('exportModal');
        const closeExportModal = document.getElementById('closeExportModal');
        const cancelExportBtn = document.getElementById('cancelExportBtn');
        const confirmExportBtn = document.getElementById('confirmExportBtn');

        exportBtn?.addEventListener('click', () => this.showModal('exportModal'));
        closeExportModal?.addEventListener('click', () => this.hideModal('exportModal'));
        cancelExportBtn?.addEventListener('click', () => this.hideModal('exportModal'));
        confirmExportBtn?.addEventListener('click', () => this.video.export());

        // Export quality selection
        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.export-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
            });
        });

        // Text modal
        const textModal = document.getElementById('textModal');
        const closeTextModal = document.getElementById('closeTextModal');
        const cancelTextBtn = document.getElementById('cancelTextBtn');
        const confirmTextBtn = document.getElementById('confirmTextBtn');

        closeTextModal?.addEventListener('click', () => this.hideModal('textModal'));
        cancelTextBtn?.addEventListener('click', () => this.hideModal('textModal'));
        confirmTextBtn?.addEventListener('click', () => {
            const content = document.getElementById('newTextContent').value;
            const style = document.getElementById('newTextStyle').value;
            if (content) {
                this.addTextOverlay(content, style);
                this.hideModal('textModal');
                document.getElementById('newTextContent').value = '';
            }
        });
    }

    showModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    }

    // Text Overlays
    addTextOverlay(content, style) {
        const overlay = {
            id: Date.now(),
            content,
            style,
            x: 50,
            y: 50,
            color: '#ffffff',
            fontSize: 48,
            startTime: this.state.currentTime,
            duration: 5
        };

        this.state.textOverlays.push(overlay);
        this.video.renderTextOverlay(overlay);
        this.timeline.addTextClip(overlay);
        this.showToast('Text added!', 'success');
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.video.skip(e.shiftKey ? -10 : -1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.video.skip(e.shiftKey ? 10 : 1);
                    break;
                case 'KeyS':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showModal('exportModal');
                    }
                    break;
                case 'KeyZ':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.undo();
                    }
                    break;
                case 'KeyY':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.state.selectedClip) {
                        this.timeline.deleteSelectedClip();
                    }
                    break;
            }
        });
    }

    undo() {
        this.showToast('Undo', 'success');
    }

    redo() {
        this.showToast('Redo', 'success');
    }

    // Toast Notifications
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.vici = new ViciApp();
});

// Force mobile layout
if (window.innerWidth <= 768) {
    window.addEventListener('load', () => {
        // Force scrolling
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        
        const app = document.getElementById('app');
        app.style.height = 'auto';
        app.style.overflow = 'visible';
        
        const mainContent = document.querySelector('.main-content');
        mainContent.style.flexDirection = 'column';
        mainContent.style.height = 'auto';
        mainContent.style.overflow = 'visible';
        
        // Make panels scrollable
        document.querySelectorAll('.panel').forEach(panel => {
            panel.style.width = '100%';
            panel.style.height = 'auto';
            panel.style.maxHeight = '350px';
            panel.style.position = 'relative';
        });
        
        // Fix preview
        const preview = document.querySelector('.preview-section');
        preview.style.height = '400px';
        preview.style.flex = 'none';
        
        // Fix timeline
        const timeline = document.querySelector('.timeline-container');
        timeline.style.position = 'relative';
        timeline.style.height = '200px';
    });
}
