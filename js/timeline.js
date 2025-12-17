/**
 * Vici Video Editor - Timeline Manager
 * Handles timeline rendering, clips, and interactions
 */

export class TimelineManager {
    constructor(app) {
        this.app = app;
        this.currentTool = 'select';
        this.zoom = 5;
        this.pixelsPerSecond = 50;
        this.isDragging = false;
        this.dragClip = null;
        this.dragOffset = 0;

        this.wrapper = document.querySelector('.timeline-wrapper');
        this.ruler = document.getElementById('timelineRuler');
        this.playhead = document.getElementById('playhead');
        this.videoTrack = document.getElementById('videoTrack');
        this.audioTrack = document.getElementById('audioTrack');
        this.textTrack = document.getElementById('textTrack');

        this.setupDragDrop();
        this.setupPlayheadDrag();
    }

    initRuler() {
        this.updateZoom(this.zoom);
    }

    updateZoom(zoomLevel) {
        this.zoom = zoomLevel;
        this.pixelsPerSecond = 20 + (zoomLevel * 15);
        this.renderRuler();
        this.renderClips();
    }

    renderRuler() {
        this.ruler.innerHTML = '';
        const duration = this.app.state.duration || 60; // Default 60 seconds
        const width = duration * this.pixelsPerSecond;

        this.ruler.style.width = `${width + 80}px`;

        // Create time marks
        const interval = this.zoom < 3 ? 10 : this.zoom < 6 ? 5 : 1;
        
        for (let time = 0; time <= duration; time += interval) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark ruler-mark-major';
            mark.style.left = `${80 + time * this.pixelsPerSecond}px`;
            mark.innerHTML = `<span class="ruler-label">${this.formatTime(time)}</span>`;
            this.ruler.appendChild(mark);

            // Minor marks
            if (interval >= 5) {
                for (let minor = 1; minor < interval; minor++) {
                    const minorMark = document.createElement('div');
                    minorMark.className = 'ruler-mark ruler-mark-minor';
                    minorMark.style.left = `${80 + (time + minor) * this.pixelsPerSecond}px`;
                    this.ruler.appendChild(minorMark);
                }
            }
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    addClip(mediaItem) {
        const clip = {
            id: Date.now(),
            mediaId: mediaItem.id,
            name: mediaItem.name,
            track: 'video',
            startTime: this.getNextAvailablePosition('video'),
            duration: mediaItem.duration,
            thumbnail: mediaItem.thumbnail,
            trimStart: 0,
            trimEnd: 0
        };

        this.app.state.clips.push(clip);
        this.renderClips();
        this.app.showToast('Clip added to timeline', 'success');
    }

    addTextClip(overlay) {
        const clip = {
            id: overlay.id,
            type: 'text',
            name: overlay.content.substring(0, 20) + '...',
            track: 'text',
            startTime: overlay.startTime,
            duration: overlay.duration
        };

        this.app.state.clips.push(clip);
        this.renderClips();
    }

    getNextAvailablePosition(track) {
        const trackClips = this.app.state.clips.filter(c => c.track === track);
        if (trackClips.length === 0) return 0;
        
        const lastClip = trackClips.reduce((a, b) => 
            (a.startTime + a.duration) > (b.startTime + b.duration) ? a : b
        );
        return lastClip.startTime + lastClip.duration;
    }

    renderClips() {
        // Clear tracks
        this.videoTrack.innerHTML = '';
        this.audioTrack.innerHTML = '';
        this.textTrack.innerHTML = '';

        // Update track width
        const duration = this.app.state.duration || 60;
        const width = duration * this.pixelsPerSecond;
        
        [this.videoTrack, this.audioTrack, this.textTrack].forEach(track => {
            track.style.width = `${width}px`;
        });

        // Render each clip
        this.app.state.clips.forEach(clip => {
            this.renderClip(clip);
        });
    }

    renderClip(clip) {
        const track = clip.track === 'video' ? this.videoTrack : 
                      clip.track === 'audio' ? this.audioTrack : this.textTrack;

        const clipEl = document.createElement('div');
        clipEl.className = `clip ${clip.type === 'text' ? 'clip-text' : clip.track === 'audio' ? 'clip-audio' : ''}`;
        clipEl.dataset.id = clip.id;
        clipEl.style.left = `${clip.startTime * this.pixelsPerSecond}px`;
        clipEl.style.width = `${clip.duration * this.pixelsPerSecond}px`;

        if (this.app.state.selectedClip === clip.id) {
            clipEl.classList.add('selected');
        }

        clipEl.innerHTML = `
            <div class="clip-handle clip-handle-left"></div>
            <div class="clip-content">
                ${clip.thumbnail ? `<img class="clip-thumbnail" src="${clip.thumbnail}" alt="">` : ''}
                <div class="clip-info">
                    <div class="clip-name">${clip.name}</div>
                    <div class="clip-duration">${this.formatTime(clip.duration)}</div>
                </div>
            </div>
            <div class="clip-handle clip-handle-right"></div>
        `;

        // Click to select
        clipEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectClip(clip.id);
        });

        // Drag to move
        clipEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('clip-handle')) return;
            this.startDrag(e, clip, clipEl);
        });

        // Trim handles
        const leftHandle = clipEl.querySelector('.clip-handle-left');
        const rightHandle = clipEl.querySelector('.clip-handle-right');

        leftHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startTrim(e, clip, clipEl, 'left');
        });

        rightHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startTrim(e, clip, clipEl, 'right');
        });

        track.appendChild(clipEl);
    }

    selectClip(clipId) {
        this.app.state.selectedClip = clipId;
        document.querySelectorAll('.clip').forEach(el => {
            el.classList.toggle('selected', el.dataset.id == clipId);
        });
    }

    startDrag(e, clip, clipEl) {
        this.isDragging = true;
        this.dragClip = clip;
        this.dragElement = clipEl;
        this.dragOffset = e.clientX - clipEl.getBoundingClientRect().left;

        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('mouseup', this.endDrag);
    }

    onDrag = (e) => {
        if (!this.isDragging || !this.dragClip) return;

        const trackRect = this.videoTrack.getBoundingClientRect();
        const newLeft = e.clientX - trackRect.left - this.dragOffset;
        const newTime = Math.max(0, newLeft / this.pixelsPerSecond);

        this.dragClip.startTime = newTime;
        this.dragElement.style.left = `${newTime * this.pixelsPerSecond}px`;
    }

    endDrag = () => {
        this.isDragging = false;
        this.dragClip = null;
        this.dragElement = null;
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.endDrag);
    }

    startTrim(e, clip, clipEl, side) {
        const startX = e.clientX;
        const startWidth = clip.duration * this.pixelsPerSecond;
        const startLeft = clip.startTime * this.pixelsPerSecond;

        const onTrim = (moveE) => {
            const delta = moveE.clientX - startX;
            
            if (side === 'left') {
                const newLeft = Math.max(0, startLeft + delta);
                const newWidth = startWidth - delta;
                if (newWidth > 30) {
                    clip.startTime = newLeft / this.pixelsPerSecond;
                    clip.duration = newWidth / this.pixelsPerSecond;
                    clipEl.style.left = `${newLeft}px`;
                    clipEl.style.width = `${newWidth}px`;
                }
            } else {
                const newWidth = Math.max(30, startWidth + delta);
                clip.duration = newWidth / this.pixelsPerSecond;
                clipEl.style.width = `${newWidth}px`;
            }
        };

        const endTrim = () => {
            document.removeEventListener('mousemove', onTrim);
            document.removeEventListener('mouseup', endTrim);
        };

        document.addEventListener('mousemove', onTrim);
        document.addEventListener('mouseup', endTrim);
    }

    setupDragDrop() {
        [this.videoTrack, this.audioTrack].forEach(track => {
            track.addEventListener('dragover', (e) => {
                e.preventDefault();
                track.classList.add('drag-over');
            });

            track.addEventListener('dragleave', () => {
                track.classList.remove('drag-over');
            });

            track.addEventListener('drop', (e) => {
                e.preventDefault();
                track.classList.remove('drag-over');
                
                try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    const rect = track.getBoundingClientRect();
                    const dropX = e.clientX - rect.left;
                    const dropTime = dropX / this.pixelsPerSecond;

                    const clip = {
                        id: Date.now(),
                        mediaId: data.id,
                        name: data.name,
                        track: track.id.replace('Track', ''),
                        startTime: Math.max(0, dropTime),
                        duration: data.duration,
                        thumbnail: data.thumbnail
                    };

                    this.app.state.clips.push(clip);
                    this.renderClips();
                } catch (err) {
                    console.error('Drop error:', err);
                }
            });
        });
    }

    setupPlayheadDrag() {
        let isDragging = false;

        this.ruler.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.movePlayhead(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.movePlayhead(e);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    movePlayhead(e) {
        const rect = this.ruler.getBoundingClientRect();
        const x = e.clientX - rect.left - 80;
        const time = Math.max(0, x / this.pixelsPerSecond);
        
        if (time <= this.app.state.duration) {
            this.app.video.seekTo(time);
        }
    }

    updatePlayhead(currentTime, duration) {
        const position = 80 + currentTime * this.pixelsPerSecond;
        this.playhead.style.left = `${position}px`;
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    splitClip() {
        const selectedId = this.app.state.selectedClip;
        if (!selectedId) {
            this.app.showToast('Select a clip to split', 'warning');
            return;
        }

        const clipIndex = this.app.state.clips.findIndex(c => c.id === selectedId);
        if (clipIndex === -1) return;

        const clip = this.app.state.clips[clipIndex];
        const splitTime = this.app.state.currentTime;

        // Check if split point is within the clip
        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
            this.app.showToast('Move playhead inside clip to split', 'warning');
            return;
        }

        const splitPoint = splitTime - clip.startTime;
        
        // Create second clip
        const newClip = {
            ...clip,
            id: Date.now(),
            startTime: splitTime,
            duration: clip.duration - splitPoint
        };

        // Modify original clip
        clip.duration = splitPoint;

        this.app.state.clips.push(newClip);
        this.renderClips();
        this.app.showToast('Clip split', 'success');
    }

    deleteSelectedClip() {
        const selectedId = this.app.state.selectedClip;
        if (!selectedId) {
            this.app.showToast('Select a clip to delete', 'warning');
            return;
        }

        this.app.state.clips = this.app.state.clips.filter(c => c.id !== selectedId);
        this.app.state.selectedClip = null;
        this.renderClips();
        this.app.showToast('Clip deleted', 'success');
    }

    zoomIn() {
        this.updateZoom(Math.min(10, this.zoom + 1));
        document.getElementById('zoomSlider').value = this.zoom;
    }

    zoomOut() {
        this.updateZoom(Math.max(1, this.zoom - 1));
        document.getElementById('zoomSlider').value = this.zoom;
    }

    setZoom(level) {
        this.updateZoom(level);
    }
}
