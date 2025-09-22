// Main Application Controller
class PikcamApp {
    constructor() {
        this.camera = null;
        this.gallery = null;
        this.gestures = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Check for required APIs
            if (!this.checkBrowserSupport()) {
                this.showUnsupportedBrowser();
                return;
            }

            // Initialize components
            this.camera = new window.CameraController();
            this.gallery = new window.GalleryManager();
            
            // Make gallery available globally for camera to access
            window.galleryManager = this.gallery;
            
            // Initialize camera
            const cameraReady = await this.camera.initialize();
            
            if (cameraReady) {
                // Initialize gestures after camera is ready
                this.gestures = new window.GestureHandler(this.camera);
                
                // Setup additional event listeners
                this.setupGlobalEvents();
                
                this.isInitialized = true;
                console.log('Pikcam initialized successfully');
            } else {
                throw new Error('Camera initialization failed');
            }
            
        } catch (error) {
            console.error('Failed to initialize Pikcam:', error);
            this.showInitializationError(error.message);
        }
    }

    checkBrowserSupport() {
        // Check for required APIs
        const requiredAPIs = [
            'navigator.mediaDevices',
            'navigator.mediaDevices.getUserMedia',
            'MediaRecorder',
            'URL.createObjectURL'
        ];
        
        for (const api of requiredAPIs) {
            if (!this.getNestedProperty(window, api)) {
                console.error(`Missing required API: ${api}`);
                return false;
            }
        }
        
        return true;
    }

    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    setupGlobalEvents() {
        // Handle visibility changes to pause/resume camera
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.camera) {
                // Pause video stream when app is hidden
                if (this.camera.videoElement.srcObject) {
                    this.camera.videoElement.pause();
                }
            } else if (!document.hidden && this.camera) {
                // Resume video stream when app becomes visible
                if (this.camera.videoElement.srcObject) {
                    this.camera.videoElement.play();
                }
            }
        });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.camera && this.camera.stream) {
                    // Restart camera to adjust to new orientation
                    this.camera.startCamera();
                }
            }, 500);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.debounce(() => {
                if (this.camera) {
                    this.camera.updateZoomControls();
                }
            }, 250)();
        });

        // Prevent context menu on long press (mobile)
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.camera-container')) {
                e.preventDefault();
            }
        });

        // Handle beforeunload to clean up resources
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Setup grid toggle
        const gridBtn = document.getElementById('grid-btn');
        gridBtn.addEventListener('click', () => {
            const gridOverlay = document.getElementById('grid-overlay');
            gridOverlay.classList.toggle('active');
            gridBtn.classList.toggle('active');
        });
    }

    showUnsupportedBrowser() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingContent = loadingScreen.querySelector('.loading-content');
        
        loadingContent.innerHTML = `
            <div style="text-align: center; color: #fff;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom: 24px; color: #FF3B30;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Unsupported Browser</h1>
                <p style="font-size: 16px; color: rgba(255, 255, 255, 0.8); line-height: 1.5; max-width: 300px; margin: 0 auto;">
                    Pikcam requires a modern browser with camera support. Please use the latest version of Chrome, Safari, or Firefox.
                </p>
            </div>
        `;
    }

    showInitializationError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingContent = loadingScreen.querySelector('.loading-content');
        
        loadingContent.innerHTML = `
            <div style="text-align: center; color: #fff;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom: 24px; color: #FF9500;">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 9v4" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 17h.01" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Camera Error</h1>
                <p style="font-size: 16px; color: rgba(255, 255, 255, 0.8); line-height: 1.5; max-width: 320px; margin: 0 auto 24px;">
                    ${message}
                </p>
                <button onclick="window.location.reload()" style="
                    background: #FFD700;
                    color: #000;
                    border: none;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Try Again
                </button>
            </div>
        `;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    cleanup() {
        if (this.camera && this.camera.stream) {
            this.camera.stream.getTracks().forEach(track => track.stop());
        }
        
        // Clean up any blob URLs in gallery
        if (this.gallery && this.gallery.media) {
            this.gallery.media.forEach(item => {
                if (item.url && item.url.startsWith('blob:')) {
                    URL.revokeObjectURL(item.url);
                }
            });
        }
    }
}

// Service Worker Registration for PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully');
            })
            .catch((error) => {
                console.log('Service Worker registration failed');
            });
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PikcamApp();
    });
} else {
    new PikcamApp();
}

// Handle device permissions
async function requestPermissions() {
    try {
        // Request camera and microphone permissions
        await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        return true;
    } catch (error) {
        console.error('Permission denied:', error);
        return false;
    }
}

// Export for global access
window.PikcamApp = PikcamApp;
