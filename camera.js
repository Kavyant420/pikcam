class CameraController {
    constructor() {
        this.stream = null;
        this.currentCamera = 'user'; // 'user' for front, 'environment' for back
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.currentMode = 'photo';
        this.flashMode = 'auto'; // 'auto', 'on', 'off'
        this.hdrEnabled = true;
        this.zoomLevel = 1;
        this.maxZoom = 8;
        this.capabilities = null;
        
        this.initializeElements();
        this.bindEvents();
        this.isInverted = false;
    }

    initializeElements() {
        this.videoElement = document.getElementById('camera-preview');
        this.canvasElement = document.getElementById('photo-canvas');
        this.shutterBtn = document.getElementById('shutter-btn');
        this.cameraSwitchBtn = document.getElementById('camera-switch-btn');
        this.flashBtn = document.getElementById('flash-btn');
        this.hdrBtn = document.getElementById('hdr-btn');
        this.zoomControls = document.getElementById('zoom-controls');
        this.zoomIndicator = document.getElementById('zoom-indicator');
        this.zoomThumb = document.getElementById('zoom-thumb');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.focusRing = document.getElementById('focus-ring');
    }
toggleInvert() {
    this.isInverted = !this.isInverted;
    this.videoElement.classList.toggle('inverted', this.isInverted);
}
    bindEvents() {
        this.shutterBtn.addEventListener('click', () => this.handleShutter());
        this.cameraSwitchBtn.addEventListener('click', () => this.switchCamera());
        this.flashBtn.addEventListener('click', () => this.toggleFlash());
        this.hdrBtn.addEventListener('click', () => this.toggleHDR());
        
        // Focus on tap
        this.videoElement.addEventListener('click', (e) => this.handleFocus(e));
        
        // Zoom controls
        this.setupZoomControls();
        
        // Mode switching
        this.setupModeSelector();
    }

    async initialize() {
        try {
            await this.startCamera();
            this.hideLoadingScreen();
            return true;
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            this.showError('Camera initialization failed. Please check permissions.');
            return false;
        }
    }

    async startCamera() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: this.currentMode === 'video'
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            // Get camera capabilities for zoom
            const videoTrack = this.stream.getVideoTracks()[0];
            this.capabilities = videoTrack.getCapabilities();
            
            if (this.capabilities.zoom) {
                this.maxZoom = this.capabilities.zoom.max;
                this.updateZoomControls();
            }
            
            await this.videoElement.play();
        } catch (error) {
            throw new Error('Camera access denied or unavailable');
        }
    }

    async switchCamera() {
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
        this.cameraSwitchBtn.style.transform = 'scale(0.95) rotateY(180deg)';
        
        setTimeout(async () => {
            await this.startCamera();
            this.cameraSwitchBtn.style.transform = '';
        }, 150);
    }

    toggleFlash() {
        const flashModes = ['auto', 'on', 'off'];
        const currentIndex = flashModes.indexOf(this.flashMode);
        this.flashMode = flashModes[(currentIndex + 1) % flashModes.length];
        
        const flashStatus = this.flashBtn.querySelector('.flash-status');
        flashStatus.textContent = this.flashMode.toUpperCase();
        
        this.flashBtn.classList.toggle('active', this.flashMode !== 'off');
        
        // Apply flash settings to video track
        if (this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            
            if (capabilities.torch) {
                videoTrack.applyConstraints({
                    advanced: [{ torch: this.flashMode === 'on' }]
                }).catch(() => {
                    // Flash not supported, ignore silently
                });
            }
        }
    }

    toggleHDR() {
        this.hdrEnabled = !this.hdrEnabled;
        this.hdrBtn.classList.toggle('active', this.hdrEnabled);
    }

    async handleShutter() {
        if (this.currentMode === 'photo') {
            await this.takePhoto();
        } else if (this.currentMode === 'video') {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        }
    }

    async takePhoto() {
        try {
            // Add shutter animation
            this.shutterBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.shutterBtn.style.transform = '';
            }, 100);

            // Flash effect
            if (this.flashMode === 'on' || this.flashMode === 'auto') {
                this.createFlashEffect();
            }

            // Capture photo
            const canvas = this.canvasElement;
            const context = canvas.getContext('2d');
            
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            // Apply HDR and other processing
            context.filter = this.hdrEnabled ? 'contrast(1.1) brightness(1.05) saturate(1.1)' : 'none';
            context.drawImage(this.videoElement, 0, 0);

            // Convert to blob without metadata for privacy
            canvas.toBlob((blob) => {
                this.saveMedia(blob, 'photo');
            }, 'image/jpeg', 0.95);
            
        } catch (error) {
            console.error('Failed to take photo:', error);
            this.showError('Failed to capture photo');
        }
    }

    startRecording() {
        try {
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                this.saveMedia(blob, 'video');
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.shutterBtn.classList.add('recording');
            this.recordingIndicator.classList.add('active');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showError('Failed to start video recording');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            this.shutterBtn.classList.remove('recording');
            this.recordingIndicator.classList.remove('active');
        }
    }

    handleFocus(event) {
        const rect = this.videoElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Show focus ring
        this.focusRing.style.left = (x - 40) + 'px';
        this.focusRing.style.top = (y - 40) + 'px';
        this.focusRing.classList.add('active');
        
        // Auto-focus effect (visual only for web)
        setTimeout(() => {
            this.focusRing.classList.add('success');
            setTimeout(() => {
                this.focusRing.classList.remove('active', 'success');
            }, 500);
        }, 200);
        
        // Apply focus constraints if supported
        if (this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            
            if (capabilities.focusMode) {
                videoTrack.applyConstraints({
                    focusMode: 'single-shot'
                }).catch(() => {
                    // Focus not supported, ignore
                });
            }
        }
    }

    setupZoomControls() {
        let isDragging = false;
        
        this.zoomThumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        this.zoomThumb.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.handleZoomDrag(e.clientY);
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                this.handleZoomDrag(e.touches[0].clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    handleZoomDrag(clientY) {
        const slider = this.zoomControls.querySelector('.zoom-slider');
        const rect = slider.getBoundingClientRect();
        const y = Math.max(0, Math.min(rect.height, rect.bottom - clientY));
        const percentage = y / rect.height;
        
        this.zoomLevel = 1 + (percentage * (this.maxZoom - 1));
        this.updateZoom();
        this.updateZoomControls();
    }

    updateZoom() {
        if (this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            
            if (capabilities.zoom) {
                videoTrack.applyConstraints({
                    advanced: [{ zoom: this.zoomLevel }]
                }).catch(() => {
                    // Zoom not supported, use CSS transform
                    this.videoElement.style.transform = `scale(${this.zoomLevel})`;
                });
            } else {
                this.videoElement.style.transform = `scale(${this.zoomLevel})`;
            }
        }
    }

    updateZoomControls() {
        const percentage = (this.zoomLevel - 1) / (this.maxZoom - 1);
        const slider = this.zoomControls.querySelector('.zoom-slider');
        const track = slider.querySelector('.zoom-track');
        const thumb = this.zoomThumb;
        
        track.style.height = `${percentage * 100}%`;
        thumb.style.top = `${(1 - percentage) * 100}%`;
        
        this.zoomIndicator.textContent = `${this.zoomLevel.toFixed(1)}x`;
    }

    setupModeSelector() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                this.switchMode(mode);
            });
        });
    }

    async switchMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });
        
        // Update shutter button
        if (mode === 'video') {
            this.shutterBtn.classList.add('video-mode');
        } else {
            this.shutterBtn.classList.remove('video-mode');
        }
        
        // Restart camera with appropriate constraints
        await this.startCamera();
    }

    createFlashEffect() {
        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            pointer-events: none;
            z-index: 9999;
            animation: flash 0.2s ease-out;
        `;
        
        document.body.appendChild(flashOverlay);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes flash {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            document.body.removeChild(flashOverlay);
            document.head.removeChild(style);
        }, 200);
    }

    saveMedia(blob, type) {
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().getTime();
        const filename = `pikcam_${type}_${timestamp}`;
        
        // Save to gallery
        if (window.galleryManager) {
            window.galleryManager.addMedia({
                url: url,
                type: type,
                filename: filename,
                timestamp: timestamp
            });
        }
        
        // Create download link for saving to device
        const a = document.createElement('a');
        a.href = url;
        a.download = filename + (type === 'photo' ? '.jpg' : '.webm');
        a.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    showError(message) {
        // Simple error display - could be enhanced with a modal
        console.error(message);
        alert(message);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
    }
}

// Export for use in main script
window.CameraController = CameraController;
