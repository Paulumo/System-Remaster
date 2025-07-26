/**
 * Accessibility Utility Functions
 * Provides enhanced accessibility features and ARIA management
 */

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Announcement priority ('polite' | 'assertive')
 * @param {number} delay - Delay before removal (ms)
 */
export function announceToScreenReader(message, priority = 'polite', delay = 2000) {
  try {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (announcement.parentNode) {
        document.body.removeChild(announcement);
      }
    }, delay);
    
  } catch (error) {
    console.error('Error announcing to screen reader:', error);
  }
}

/**
 * Manage focus trap for modals and dialogs
 * @param {HTMLElement} container - Container element to trap focus within
 * @param {HTMLElement} firstFocusable - First focusable element (optional)
 */
export class FocusTrap {
  constructor(container, firstFocusable = null) {
    this.container = container;
    this.firstFocusable = firstFocusable;
    this.previousActiveElement = document.activeElement;
    this.isActive = false;
    
    this.focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');
  }
  
  /**
   * Activate focus trap
   */
  activate() {
    try {
      if (this.isActive) return;
      
      this.isActive = true;
      this.focusableElements = this.container.querySelectorAll(this.focusableSelectors);
      
      if (this.focusableElements.length === 0) {
        console.warn('No focusable elements found in focus trap container');
        return;
      }
      
      this.firstElement = this.firstFocusable || this.focusableElements[0];
      this.lastElement = this.focusableElements[this.focusableElements.length - 1];
      
      // Focus first element
      this.firstElement.focus();
      
      // Add event listener for tab key
      this.handleKeyDown = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', this.handleKeyDown);
      
    } catch (error) {
      console.error('Error activating focus trap:', error);
    }
  }
  
  /**
   * Deactivate focus trap
   */
  deactivate() {
    try {
      if (!this.isActive) return;
      
      this.isActive = false;
      document.removeEventListener('keydown', this.handleKeyDown);
      
      // Return focus to previous element
      if (this.previousActiveElement && this.previousActiveElement.focus) {
        this.previousActiveElement.focus();
      }
      
    } catch (error) {
      console.error('Error deactivating focus trap:', error);
    }
  }
  
  /**
   * Handle keydown events for focus management
   * @private
   */
  handleKeyDown(event) {
    if (event.key !== 'Tab') return;
    
    const isTabPressed = event.key === 'Tab';
    const isShiftPressed = event.shiftKey;
    
    if (!isTabPressed) return;
    
    if (isShiftPressed) {
      // Shift + Tab - moving backwards
      if (document.activeElement === this.firstElement) {
        event.preventDefault();
        this.lastElement.focus();
      }
    } else {
      // Tab - moving forwards
      if (document.activeElement === this.lastElement) {
        event.preventDefault();
        this.firstElement.focus();
      }
    }
  }
}

/**
 * Enhanced keyboard navigation for custom components
 * @param {HTMLElement} container - Container with navigation items
 * @param {string} itemSelector - Selector for navigable items
 * @param {Object} options - Navigation options
 */
export class KeyboardNavigation {
  constructor(container, itemSelector, options = {}) {
    this.container = container;
    this.itemSelector = itemSelector;
    this.options = {
      wrap: true,
      homeEndKeys: true,
      arrowKeys: true,
      ...options
    };
    
    this.currentIndex = -1;
    this.items = [];
    this.isActive = false;
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }
  
  /**
   * Initialize keyboard navigation
   */
  initialize() {
    try {
      this.updateItems();
      
      if (this.items.length === 0) {
        console.warn('No navigable items found');
        return;
      }
      
      this.container.addEventListener('keydown', this.handleKeyDown);
      this.isActive = true;
      
      // Set initial ARIA attributes
      this.updateAriaAttributes();
      
    } catch (error) {
      console.error('Error initializing keyboard navigation:', error);
    }
  }
  
  /**
   * Update items list
   */
  updateItems() {
    this.items = Array.from(this.container.querySelectorAll(this.itemSelector));
    this.items.forEach((item, index) => {
      item.setAttribute('data-nav-index', index);
      if (!item.hasAttribute('tabindex')) {
        item.setAttribute('tabindex', '-1');
      }
    });
  }
  
  /**
   * Handle keyboard navigation
   * @private
   */
  handleKeyDown(event) {
    if (!this.options.arrowKeys && !['Home', 'End'].includes(event.key)) {
      return;
    }
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.moveToNext();
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.moveToPrevious();
        break;
        
      case 'Home':
        if (this.options.homeEndKeys) {
          event.preventDefault();
          this.moveToFirst();
        }
        break;
        
      case 'End':
        if (this.options.homeEndKeys) {
          event.preventDefault();
          this.moveToLast();
        }
        break;
    }
  }
  
  /**
   * Move to next item
   */
  moveToNext() {
    const nextIndex = this.options.wrap
      ? (this.currentIndex + 1) % this.items.length
      : Math.min(this.currentIndex + 1, this.items.length - 1);
    
    this.setCurrentIndex(nextIndex);
  }
  
  /**
   * Move to previous item
   */
  moveToPrevious() {
    const prevIndex = this.options.wrap
      ? this.currentIndex <= 0 ? this.items.length - 1 : this.currentIndex - 1
      : Math.max(this.currentIndex - 1, 0);
    
    this.setCurrentIndex(prevIndex);
  }
  
  /**
   * Move to first item
   */
  moveToFirst() {
    this.setCurrentIndex(0);
  }
  
  /**
   * Move to last item
   */
  moveToLast() {
    this.setCurrentIndex(this.items.length - 1);
  }
  
  /**
   * Set current index and focus
   */
  setCurrentIndex(index) {
    if (index < 0 || index >= this.items.length) return;
    
    // Remove focus from previous item
    if (this.currentIndex >= 0 && this.items[this.currentIndex]) {
      this.items[this.currentIndex].setAttribute('tabindex', '-1');
      this.items[this.currentIndex].classList.remove('keyboard-focused');
    }
    
    // Set focus to new item
    this.currentIndex = index;
    const currentItem = this.items[this.currentIndex];
    currentItem.setAttribute('tabindex', '0');
    currentItem.classList.add('keyboard-focused');
    currentItem.focus();
    
    // Update ARIA attributes
    this.updateAriaAttributes();
  }
  
  /**
   * Update ARIA attributes
   * @private
   */
  updateAriaAttributes() {
    this.items.forEach((item, index) => {
      item.setAttribute('aria-setsize', this.items.length);
      item.setAttribute('aria-posinset', index + 1);
    });
  }
  
  /**
   * Destroy keyboard navigation
   */
  destroy() {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    this.items.forEach(item => {
      item.removeAttribute('data-nav-index');
      item.removeAttribute('tabindex');
      item.removeAttribute('aria-setsize');
      item.removeAttribute('aria-posinset');
      item.classList.remove('keyboard-focused');
    });
    this.isActive = false;
  }
}

/**
 * Skip link functionality for better keyboard navigation
 * @param {string} targetId - ID of the target element to skip to
 * @param {string} linkText - Text for the skip link
 * @returns {HTMLElement} Skip link element
 */
export function createSkipLink(targetId, linkText = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = linkText;
  skipLink.className = 'skip-link';
  
  // Add styles if not already present
  if (!document.querySelector('#skip-link-styles')) {
    const style = document.createElement('style');
    style.id = 'skip-link-styles';
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #2563eb;
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        transition: top 0.2s ease;
      }
      .skip-link:focus {
        top: 6px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add click handler
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  
  return skipLink;
}

/**
 * Manage ARIA live regions for dynamic content updates
 */
export class LiveRegionManager {
  constructor() {
    this.regions = new Map();
    this.createDefaultRegions();
  }
  
  /**
   * Create default live regions
   * @private
   */
  createDefaultRegions() {
    // Polite region for non-urgent updates
    this.createRegion('polite', 'polite');
    
    // Assertive region for urgent updates
    this.createRegion('assertive', 'assertive');
    
    // Status region for status updates
    this.createRegion('status', 'polite');
  }
  
  /**
   * Create a live region
   * @param {string} id - Region ID
   * @param {string} politeness - ARIA live politeness level
   */
  createRegion(id, politeness = 'polite') {
    if (this.regions.has(id)) {
      console.warn(`Live region '${id}' already exists`);
      return;
    }
    
    const region = document.createElement('div');
    region.id = `live-region-${id}`;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    
    document.body.appendChild(region);
    this.regions.set(id, region);
  }
  
  /**
   * Announce message in a live region
   * @param {string} message - Message to announce
   * @param {string} regionId - Region ID to use
   * @param {number} clearDelay - Delay before clearing message
   */
  announce(message, regionId = 'polite', clearDelay = 2000) {
    const region = this.regions.get(regionId);
    if (!region) {
      console.error(`Live region '${regionId}' not found`);
      return;
    }
    
    // Clear previous message
    region.textContent = '';
    
    // Add new message with slight delay to ensure it's announced
    setTimeout(() => {
      region.textContent = message;
      
      // Clear message after delay
      if (clearDelay > 0) {
        setTimeout(() => {
          region.textContent = '';
        }, clearDelay);
      }
    }, 10);
  }
  
  /**
   * Remove a live region
   * @param {string} id - Region ID to remove
   */
  removeRegion(id) {
    const region = this.regions.get(id);
    if (region && region.parentNode) {
      region.parentNode.removeChild(region);
      this.regions.delete(id);
    }
  }
  
  /**
   * Clean up all live regions
   */
  destroy() {
    this.regions.forEach((region, id) => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.regions.clear();
  }
}

/**
 * High contrast mode detection and support
 */
export class HighContrastManager {
  constructor() {
    this.isHighContrast = false;
    this.callbacks = new Set();
    this.init();
  }
  
  /**
   * Initialize high contrast detection
   * @private
   */
  init() {
    // Check for high contrast preference
    this.checkHighContrast();
    
    // Listen for changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      mediaQuery.addEventListener('change', () => {
        this.checkHighContrast();
      });
    }
  }
  
  /**
   * Check high contrast preference
   * @private
   */
  checkHighContrast() {
    const wasHighContrast = this.isHighContrast;
    
    if (window.matchMedia) {
      this.isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    }
    
    // Apply changes if state changed
    if (wasHighContrast !== this.isHighContrast) {
      this.applyHighContrast();
      this.notifyCallbacks();
    }
  }
  
  /**
   * Apply high contrast styles
   * @private
   */
  applyHighContrast() {
    const body = document.body;
    
    if (this.isHighContrast) {
      body.classList.add('high-contrast');
      console.log('High contrast mode enabled');
    } else {
      body.classList.remove('high-contrast');
      console.log('High contrast mode disabled');
    }
  }
  
  /**
   * Add callback for high contrast changes
   * @param {Function} callback - Callback function
   */
  onChange(callback) {
    this.callbacks.add(callback);
  }
  
  /**
   * Remove callback
   * @param {Function} callback - Callback function to remove
   */
  offChange(callback) {
    this.callbacks.delete(callback);
  }
  
  /**
   * Notify all callbacks
   * @private
   */
  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.isHighContrast);
      } catch (error) {
        console.error('Error in high contrast callback:', error);
      }
    });
  }
}

// Create and export singleton instances
export const liveRegionManager = new LiveRegionManager();
export const highContrastManager = new HighContrastManager();