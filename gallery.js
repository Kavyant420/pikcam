class GalleryManager {
    constructor() {
        this.media = [];
        this.selectedItems = [];
        this.isOpen = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadFromStorage();
    }

    initializeElements() {
        this.galleryBtn = document.getElementById('gallery-btn');
        this.galleryModal = document.getElementById('gallery-modal');
        this.galleryGrid = document.getElementById('gallery-grid');
        this.closeBtn = document.getElementById('close-gallery');
        this.deleteBtn = document.getElementById('delete-selected');
        this.galleryPreview = this.galleryBtn.querySelector('.gallery-preview');
    }

    bindEvents() {
        this.galleryBtn.addEventListener('click', () => this.openGallery());
        this.closeBtn.addEventListener('click', () => this.closeGallery());
        this.deleteBtn.addEventListener('click', () => this.deleteSelected());
        
        // Close on background tap
        this.galleryModal.addEventListener('click', (e) => {
            if (e.target === this.galleryModal) {
                this.closeGallery();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeGallery();
            }
        });
    }

    addMedia(mediaData) {
        this.media.unshift(mediaData);
        this.saveToStorage();
        this.updateGalleryPreview();
        this.renderGallery();
    }

    openGallery() {
        this.isOpen = true;
        this.galleryModal.classList.add('active');
        this.renderGallery();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeGallery() {
        this.isOpen = false;
        this.galleryModal.classList.remove('active');
        this.selectedItems = [];
        
        // Re-enable body scroll
        document.body.style.overflow = '';
    }

    renderGallery() {
        this.galleryGrid.innerHTML = '';
        
        if (this.media.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: rgba(255, 255, 255, 0.5);
                    text-align: center;
                    grid-column: 1 / -1;
                ">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin-bottom: 16px;">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                        <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p style="font-size: 16px; font-weight: 500; margin-bottom: 4px;">No photos or videos</p>
                    <p style="font-size: 14px;">Start capturing memories with Pikcam</p>
                </div>
            `;
            this.galleryGrid.appendChild(emptyState);
            return;
        }
        
        this.media.forEach((item, index) => {
            const mediaItem = this.createMediaItem(item, index);
            this.galleryGrid.appendChild(mediaItem);
        });
    }

    createMediaItem(mediaData, index) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = index;
        
        if (mediaData.type === 'photo') {
            const img = document.createElement('img');
            img.src = mediaData.url;
            img.alt = mediaData.filename;
            item.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = mediaData.url;
            video.muted = true;
            video.preload = 'metadata';
            
            // Add play indicator
            const playIcon = document.createElement('div');
            playIcon.innerHTML = `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 32px;
                    height: 32px;
                    background: rgba(0, 0, 0, 0.6);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                </div>
            `;
            item.style.position = 'relative';
            item.appendChild(video);
            item.appendChild(playIcon);
        }
        
        // Add selection overlay
        const selectionOverlay = document.createElement('div');
        selectionOverlay.className = 'selection-overlay';
        selectionOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 215, 0, 0.3);
            border: 2px solid #FFD700;
            border-radius: 8px;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        item.appendChild(selectionOverlay);
        
        // Bind events
        item.addEventListener('click', (e) => this.handleItemClick(e, mediaData, index));
        item.addEventListener('contextmenu', (e) => this.handleItemLongPress(e, index));
        
        return item;
    }

    handleItemClick(event, mediaData, index) {
        if (this.selectedItems.length > 0) {
            // Selection mode
            this.toggleSelection(index);
        } else {
            // View mode
            this.viewMedia(mediaData);
        }
    }

    handleItemLongPress(event, index) {
        event.preventDefault();
        this.toggleSelection(index);
    }

    toggleSelection(index) {
        const itemIndex = this.selectedItems.indexOf(index);
        const item = document.querySelector(`.gallery-item[data-index="${index}"]`);
        const overlay = item.querySelector('.selection-overlay');
        
        if (itemIndex === -1) {
            this.selectedItems.push(index);
            overlay.style.opacity = '1';
        } else {
            this.selectedItems.splice(itemIndex, 1);
            overlay.style.opacity = '0';
        }
        
        this.updateDeleteButton();
    }

    updateDeleteButton() {
        const hasSelection = this.selectedItems.length > 0;
        this.deleteBtn.style.opacity = hasSelection ? '1' : '0.5';
        this.deleteBtn.style.pointerEvents = hasSelection ? 'auto' : 'none';
    }

    deleteSelected() {
        if (this.selectedItems.length === 0) return;
        
        const confirmDelete = confirm(`Delete ${this.selectedItems.length} item(s)?`);
        if (!confirmDelete) return;
        
        // Sort indices in descending order to avoid index shifts
        this.selectedItems.sort((a, b) => b - a);
        
        this.selectedItems.forEach(index => {
            const mediaData = this.media[index];
            
            // Revoke object URL to free memory
            if (mediaData.url) {
                URL.revokeObjectURL(mediaData.url);
            }
            
            // Remove from array
            this.media.splice(index, 1);
        });
        
        this.selectedItems = [];
        this.saveToStorage();
        this.updateGalleryPreview();
        this.renderGallery();
        this.updateDeleteButton();
    }

    viewMedia(mediaData) {
        // Simple full-screen viewer
        const viewer = document.createElement('div');
        viewer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;
        
        if (mediaData.type === 'photo') {
            const img = document.createElement('img');
            img.src = mediaData.url;
            img.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            `;
            viewer.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = mediaData.url;
            video.controls = true;
            video.autoplay = true;
            video.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
            `;
            viewer.appendChild(video);
        }
        
        viewer.addEventListener('click', () => {
            document.body.removeChild(viewer);
            document.body.style.overflow = '';
        });
        
        document.body.appendChild(viewer);
        document.body.style.overflow = 'hidden';
    }

    updateGalleryPreview() {
        if (this.media.length > 0) {
            const latestMedia = this.media[0];
            
            if (latestMedia.type === 'photo') {
                this.galleryPreview.innerHTML = `
                    <img src="${latestMedia.url}" style="
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 8px;
                    " alt="Latest photo">
                `;
            } else {
                this.galleryPreview.innerHTML = `
                    <video src="${latestMedia.url}" style="
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 8px;
                    " muted preload="metadata"></video>
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 12px;
                    ">▶</div>
                `;
            }
        } else {
            this.galleryPreview.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        }
    }

    saveToStorage() {
        try {
            // Save only metadata, not actual media (URLs are blob URLs)
            const mediaMetadata = this.media.map(item => ({
                filename: item.filename,
                type: item.type,
                timestamp: item.timestamp
            }));
            localStorage.setItem('pikcam_gallery', JSON.stringify(mediaMetadata));
        } catch (error) {
            console.warn('Failed to save gallery to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('pikcam_gallery');
            if (saved) {
                const mediaMetadata = JSON.parse(saved);
                // Note: We can't restore blob URLs, so this is mainly for metadata
                // In a real app, you'd integrate with device storage or cloud storage
            }
        } catch (error) {
            console.warn('Failed to load gallery from localStorage:', error);
        }
    }
}

// Export for use in main script
window.GalleryManager = GalleryManager;
