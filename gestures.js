class GestureHandler {
    constructor(cameraController) {
        this.camera = cameraController;
        this.isZoomControlsVisible = false;
        this.lastTouchDistance = 0;
        this.initialZoomLevel = 1;
        
        this.initializeGestures();
    }

    initializeGestures() {
        this.setupPinchZoom();
        this.setupDoubleTap();
        this.setupSwipeGestures();
        this.setupZoomControlsVisibility();
    }

    setupPinchZoom() {
        const videoElement = this.camera.videoElement;
        let lastTouchDistance = 0;
        
        videoElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                lastTouchDistance = this.getTouchDistance(e.touches);
                this.initialZoomLevel = this.camera.zoomLevel;
                this.showZoomControls();
            }
        });
        
        videoElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = this.getTouchDistance(e.touches);
                const scale = currentDistance / lastTouchDistance;
                
                let newZoomLevel = this.initialZoomLevel * scale;
                newZoomLevel = Math.max(1, Math.min(this.camera.maxZoom, newZoomLevel));
                
                this.camera.zoomLevel = newZoomLevel;
                this.camera.updateZoom();
                this.camera.updateZoomControls();
            }
        });
        
        videoElement.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                setTimeout(() => {
                    this.hideZoomControls();
                }, 2000);
            }
        });

        // Mouse wheel zoom for desktop
        videoElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            let newZoomLevel = this.camera.zoomLevel + delta;
            newZoomLevel = Math.max(1, Math.min(this.camera.maxZoom, newZoomLevel));
            
            this.camera.zoomLevel = newZoomLevel;
            this.camera.updateZoom();
            this.camera.updateZoomControls();
            
            this.showZoomControls();
            setTimeout(() => {
                this.hideZoomControls();
            }, 2000);
        });
    }

    setupDoubleTap() {
        const videoElement = this.camera.videoElement;
        let lastTapTime = 0;
        
        videoElement.addEventListener('touchend', (e) => {
            if (e.touches.length === 0 && e.changedTouches.length === 1) {
                const currentTime = Date.now();
                const tapLength = currentTime - lastTapTime;
                
                if (tapLength < 500 && tapLength > 0) {
                    // Double tap detected
                    e.preventDefault();
                    this.handleDoubleTap();
                }
                lastTapTime = currentTime;
            }
        });
    }

    handleDoubleTap() {
        // Toggle between 1x and 2x zoom
        const targetZoom = this.camera.zoomLevel > 1.5 ? 1 : 2;
        this.animateZoom(this.camera.zoomLevel, targetZoom);
    }

    animateZoom(fromZoom, toZoom) {
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            this.camera.zoomLevel = fromZoom + (toZoom - fromZoom) * easedProgress;
            this.camera.updateZoom();
            this.camera.updateZoomControls();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        this.showZoomControls();
        animate();
        
        setTimeout(() => {
            this.hideZoomControls();
        }, 1000);
    }

    setupSwipeGestures() {
        const modeSelector = document.querySelector('.mode-selector');
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        
        modeSelector.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = false;
        });
        
        modeSelector.addEventListener('touchmove', (e) => {
            if (!isDragging) {
                const deltaX = Math.abs(e.touches[0].clientX - startX);
                const deltaY = Math.abs(e.touches[0].clientY - startY);
                
                if (deltaX > 10 || deltaY > 10) {
                    isDragging = true;
                }
            }
        });
        
        modeSelector.addEventListener('touchend', (e) => {
            if (!isDragging) {
                const deltaX = e.changedTouches[0].clientX - startX;
                
                if (Math.abs(deltaX) > 50) {
                    this.handleModeSwipe(deltaX > 0 ? 'right' : 'left');
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    this.handleModeSwipe('left');
                    break;
                case 'ArrowRight':
                    this.handleModeSwipe('right');
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.camera.handleShutter();
                    break;
                case 'f':
                case 'F':
                    this.camera.toggleFlash();
                    break;
                case 'g':
                case 'G':
                    this.toggleGrid();
                    break;
                case 'c':
                case 'C':
                    this.camera.switchCamera();
                    break;
            }
        });
    }

    handleModeSwipe(direction) {
        const modes = ['video', 'photo', 'portrait'];
        const currentMode = this.camera.currentMode;
        const currentIndex = modes.indexOf(currentMode);
        
        let newIndex;
        if (direction === 'left') {
            newIndex = Math.max(0, currentIndex - 1);
        } else {
            newIndex = Math.min(modes.length - 1, currentIndex + 1);
        }
        
        if (newIndex !== currentIndex) {
            this.camera.switchMode(modes[newIndex]);
        }
    }

    setupZoomControlsVisibility() {
        let hideTimeout;
        
        const showZoomControls = () => {
            this.isZoomControlsVisible = true;
            this.camera.zoomControls.classList.add('active');
            
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                this.hideZoomControls();
            }, 3000);
        };
        
        const hideZoomControls = () => {
            this.isZoomControlsVisible = false;
            this.camera.zoomControls.classList.remove('active');
        };
        
        this.showZoomControls = showZoomControls;
        this.hideZoomControls = hideZoomControls;
        
        // Show on interaction
        this.camera.videoElement.addEventListener('touchstart', () => {
            if (this.camera.zoomLevel > 1) {
                showZoomControls();
            }
        });
    }

    toggleGrid() {
        const gridOverlay = document.getElementById('grid-overlay');
        const gridBtn = document.getElementById('grid-btn');
        
        gridOverlay.classList.toggle('active');
        gridBtn.classList.toggle('active');
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Export for use in main script
window.GestureHandler = GestureHandler;
