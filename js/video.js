/**
 * Vici Video Editor - Video Manager
 * Handles video loading, playback, and processing
 */

export class VideoManager {
    constructor(app) {
        this.app = app;
        this.video = document.getElementById('previewVideo');
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.placeholder = document.getElementById('previewPlaceholder');
        this.mediaItems = [];
        this.animationFrame = null;
        this.textOverlays = [];

        this.setupVideoEvents();
    }

    setupVideoEvents() {
        this.video.addEventListener('loadedmetadata', () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.app.updateTime(0, this.video.duration);
            this.placeholder.classList.add('hidden');
            this.video.classList.remove('hidden');
        });

        this.video.addEventListener('timeupdate', () => {
            this.app.updateTime(this.video.currentTime, this.video.duration);
        });

        this.video.addEventListener('play', () => {
            this.app.setPlaying(true);
            this.startRenderLoop();
        });

        this.video.addEventListener('pause', () => {
            this.app.setPlaying(false);
            this.stopRenderLoop();
        });

        this.video.addEventListener('ended', () => {
            this.app.setPlaying(false);
            this.stopRenderLoop();
        });
    }

    async addMedia(file) {
        const url = URL.createObjectURL(file);
        const mediaItem = {
            id: Date.now(),
            name: file.name,
            type: file.type,
            url: url,
            duration: 0,
            thumbnail: null
        };

        // Get video duration and thumbnail
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.muted = true;

        await new Promise((resolve) => {
            tempVideo.addEventListener('loadedmetadata', () => {
                mediaItem.duration = tempVideo.duration;
                
                // Generate thumbnail
                tempVideo.currentTime = 1;
                tempVideo.addEventListener('seeked', () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 160;
                    canvas.height = 90;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                    mediaItem.thumbnail = canvas.toDataURL();
                    resolve();
                }, { once: true });
            });
        });

        this.mediaItems.push(mediaItem);
        this.renderMediaLibrary();
        this.app.showToast(`Added: ${file.name}`, 'success');

        // Auto-load first video
        if (this.mediaItems.length === 1) {
            this.loadVideo(mediaItem);
        }
    }

    renderMediaLibrary() {
        const grid = document.getElementById('mediaGrid');
        grid.innerHTML = '';

        this.mediaItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'media-item';
            div.draggable = true;
            div.dataset.id = item.id;
            div.innerHTML = `
                <img src="${item.thumbnail}" alt="${item.name}">
                <span class="media-item-duration">${this.formatDuration(item.duration)}</span>
            `;

            div.addEventListener('click', () => this.loadVideo(item));
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = 'copy';
            });

            grid.appendChild(div);
        });
    }

    loadVideo(item) {
        this.video.src = item.url;
        this.video.load();
        this.currentMedia = item;
        
        // Add to timeline if not already there
        if (!this.app.state.clips.find(c => c.mediaId === item.id)) {
            this.app.timeline.addClip(item);
        }
    }

    play() {
        if (this.video.src) {
            this.video.play();
        }
    }

    pause() {
        this.video.pause();
    }

    skip(seconds) {
        if (this.video.src) {
            this.video.currentTime = Math.max(0, Math.min(
                this.video.duration,
                this.video.currentTime + seconds
            ));
        }
    }

    seekTo(time) {
        if (this.video.src) {
            this.video.currentTime = time;
        }
    }

    setVolume(volume) {
        this.video.volume = volume;
    }

    setPlaybackRate(rate) {
        this.video.playbackRate = rate;
    }

    toggleFullscreen() {
        const container = document.querySelector('.preview-wrapper');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    }

    updateTransform() {
        const { scale, rotation } = this.app.state.transform;
        this.video.style.transform = `scale(${scale/100}) rotate(${rotation}deg)`;
    }

    // Render loop for canvas effects
    startRenderLoop() {
        const render = () => {
            if (!this.video.paused && !this.video.ended) {
                this.renderFrame();
                this.animationFrame = requestAnimationFrame(render);
            }
        };
        render();
    }

    stopRenderLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    renderFrame() {
        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Apply effects via CSS (more performant)
        const effects = this.app.state.effects;
        let filter = '';
        
        if (effects.brightness !== 0) {
            filter += `brightness(${1 + effects.brightness/100}) `;
        }
        if (effects.contrast !== 0) {
            filter += `contrast(${1 + effects.contrast/100}) `;
        }
        if (effects.saturation !== 0) {
            filter += `saturate(${1 + effects.saturation/100}) `;
        }
        if (effects.blur) {
            filter += 'blur(2px) ';
        }

        this.canvas.style.filter = filter.trim() || 'none';

        // Render text overlays
        this.renderTextOverlays();
    }

    renderTextOverlay(overlay) {
        this.textOverlays.push(overlay);
    }

    renderTextOverlays() {
        const currentTime = this.video.currentTime;
        
        this.textOverlays.forEach(overlay => {
            if (currentTime >= overlay.startTime && 
                currentTime <= overlay.startTime + overlay.duration) {
                this.drawText(overlay);
            }
        });
    }

    drawText(overlay) {
        this.ctx.save();
        
        // Font settings based on style
        const styles = {
            title: { size: 64, weight: '700' },
            subtitle: { size: 48, weight: '500' },
            caption: { size: 32, weight: '400' },
            quote: { size: 40, weight: '400', italic: true }
        };

        const style = styles[overlay.style] || styles.title;
        const fontStyle = style.italic ? 'italic ' : '';
        
        this.ctx.font = `${fontStyle}${style.weight} ${style.size}px Inter, sans-serif`;
        this.ctx.fillStyle = overlay.color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add text shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        const x = (overlay.x / 100) * this.canvas.width;
        const y = (overlay.y / 100) * this.canvas.height;
        
        this.ctx.fillText(overlay.content, x, y);
        this.ctx.restore();
    }

    // Export functionality
    async export() {
        const quality = document.querySelector('.export-option.active')?.dataset.quality || '1080';
        const progressEl = document.getElementById('exportProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressEl.classList.remove('hidden');
        document.getElementById('confirmExportBtn').disabled = true;

        // Simulate export process
        for (let i = 0; i <= 100; i += 2) {
            await new Promise(r => setTimeout(r, 50));
            progressFill.style.width = `${i}%`;
            
            if (i < 30) progressText.textContent = 'Processing video...';
            else if (i < 60) progressText.textContent = 'Applying effects...';
            else if (i < 90) progressText.textContent = 'Encoding...';
            else progressText.textContent = 'Finalizing...';
        }

        progressText.textContent = 'Export complete!';
        
        // Create download
        if (this.video.src) {
            const a = document.createElement('a');
            a.href = this.video.src;
            a.download = `vici-export-${quality}p.mp4`;
            a.click();
        }

        setTimeout(() => {
            this.app.hideModal('exportModal');
            progressEl.classList.add('hidden');
            progressFill.style.width = '0%';
            document.getElementById('confirmExportBtn').disabled = false;
            this.app.showToast('Video exported successfully!', 'success');
        }, 1000);
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
