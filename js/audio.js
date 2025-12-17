/**
 * Vici Video Editor - Audio Manager
 * Handles audio processing, effects, and background music
 */

export class AudioManager {
    constructor(app) {
        this.app = app;
        this.video = document.getElementById('previewVideo');
        this.audioContext = null;
        this.masterGain = null;
        this.audioTracks = [];
        
        this.initAudioContext();
    }

    initAudioContext() {
        // Create audio context on user interaction
        const initContext = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                
                // Connect video to audio context
                if (this.video.src) {
                    this.connectVideo();
                }
            }
            document.removeEventListener('click', initContext);
        };
        
        document.addEventListener('click', initContext);
    }

    connectVideo() {
        if (!this.audioContext) return;
        
        try {
            const source = this.audioContext.createMediaElementSource(this.video);
            source.connect(this.masterGain);
        } catch (e) {
            // Video already connected or error
            console.log('Audio connection:', e.message);
        }
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = volume;
        }
        this.video.volume = volume;
    }

    applyAudioEffect(effect) {
        switch (effect) {
            case 'fade-in':
                this.applyFadeIn();
                break;
            case 'fade-out':
                this.applyFadeOut();
                break;
            case 'mute':
                this.toggleMute();
                break;
        }
    }

    applyFadeIn() {
        const startTime = this.video.currentTime;
        const duration = 2; // 2 second fade
        
        // Store fade settings for export
        const fade = {
            type: 'fade-in',
            startTime,
            duration
        };
        
        // Visual feedback
        this.animateVolumeChange(0, 1, duration);
        this.app.showToast('Fade in applied', 'success');
    }

    applyFadeOut() {
        const startTime = this.video.currentTime;
        const duration = 2;
        
        // Visual feedback
        this.animateVolumeChange(1, 0, duration);
        this.app.showToast('Fade out applied', 'success');
    }

    animateVolumeChange(from, to, duration) {
        const startTime = performance.now();
        const durationMs = duration * 1000;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            
            const volume = from + (to - from) * progress;
            this.video.volume = volume;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.app.showToast(this.video.muted ? 'Muted' : 'Unmuted', 'success');
    }

    async addBackgroundMusic() {
        // Create file input for music
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const url = URL.createObjectURL(file);
            const audio = new Audio(url);
            
            audio.addEventListener('loadedmetadata', () => {
                const track = {
                    id: Date.now(),
                    name: file.name,
                    url: url,
                    audio: audio,
                    duration: audio.duration,
                    volume: 0.5,
                    startTime: 0
                };
                
                this.audioTracks.push(track);
                
                // Add to timeline
                this.app.state.clips.push({
                    id: track.id,
                    type: 'audio',
                    name: file.name,
                    track: 'audio',
                    startTime: 0,
                    duration: audio.duration
                });
                
                this.app.timeline.renderClips();
                this.app.showToast(`Added: ${file.name}`, 'success');
            });
        };
        
        input.click();
    }

    playAudioTrack(trackId) {
        const track = this.audioTracks.find(t => t.id === trackId);
        if (!track) return;
        
        track.audio.currentTime = 0;
        track.audio.volume = track.volume;
        track.audio.play();
    }

    pauseAudioTrack(trackId) {
        const track = this.audioTracks.find(t => t.id === trackId);
        if (track) {
            track.audio.pause();
        }
    }

    setTrackVolume(trackId, volume) {
        const track = this.audioTracks.find(t => t.id === trackId);
        if (track) {
            track.volume = volume;
            track.audio.volume = volume;
        }
    }

    removeTrack(trackId) {
        const index = this.audioTracks.findIndex(t => t.id === trackId);
        if (index !== -1) {
            this.audioTracks[index].audio.pause();
            URL.revokeObjectURL(this.audioTracks[index].url);
            this.audioTracks.splice(index, 1);
        }
    }

    // Sync audio tracks with video playback
    syncWithVideo() {
        this.video.addEventListener('play', () => {
            this.audioTracks.forEach(track => {
                if (this.video.currentTime >= track.startTime) {
                    track.audio.currentTime = this.video.currentTime - track.startTime;
                    track.audio.play();
                }
            });
        });

        this.video.addEventListener('pause', () => {
            this.audioTracks.forEach(track => {
                track.audio.pause();
            });
        });

        this.video.addEventListener('seeked', () => {
            this.audioTracks.forEach(track => {
                const relativeTime = this.video.currentTime - track.startTime;
                if (relativeTime >= 0 && relativeTime <= track.duration) {
                    track.audio.currentTime = relativeTime;
                }
            });
        });
    }

    // Generate waveform visualization
    generateWaveform(audioBuffer, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;
        
        ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
        
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            const barHeight = Math.max(1, (max - min) * amp);
            ctx.fillRect(i, amp - barHeight / 2, 1, barHeight);
        }
        
        return canvas.toDataURL();
    }

    // Audio analysis for visualizations
    createAnalyzer() {
        if (!this.audioContext) return null;
        
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        this.masterGain.connect(analyser);
        
        return {
            analyser,
            dataArray: new Uint8Array(analyser.frequencyBinCount),
            getFrequencyData: function() {
                this.analyser.getByteFrequencyData(this.dataArray);
                return this.dataArray;
            }
        };
    }
}
