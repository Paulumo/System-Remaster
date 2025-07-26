/**
 * Main Application Entry Point
 * Initializes and coordinates all modules for the System Remaster HST application
 */

import { CONFIG } from './config.js';
import { MapManager } from './modules/MapManager.js';
import { WaypointManager } from './modules/WaypointManager.js';
import { SearchManager } from './modules/SearchManager.js';
import { FlightCalculator } from './modules/FlightCalculator.js';
import { UIManager } from './modules/UIManager.js';
import { DragDropManager } from './modules/DragDropManager.js';
import { stateManager } from './modules/StateManager.js';
import { domCache } from './modules/utils/dom.js';
import { liveRegionManager, highContrastManager, announceToScreenReader } from './modules/utils/accessibility.js';
import { progressiveEnhancement, NoScriptManager } from './modules/utils/progressive.js';
import { notificationManager } from './modules/utils/common.js';

/**
 * Main Application Class
 * Manages the lifecycle and coordination of all application modules
 */
class SystemRemasterApp {
  constructor() {
    this.modules = {};
    this.isInitialized = false;
    this.initializationStartTime = null;
    this.errorHandler = this.createGlobalErrorHandler();
  }

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.initializationStartTime = performance.now();
      console.log('🚁 Starting System Remaster HST initialization...');

      // Initialize progressive enhancement first
      progressiveEnhancement.initialize();

      // Initialize state management
      await stateManager.initialize();

      // Show loading indicator
      this.showLoadingIndicator();

      // Initialize accessibility features
      this.initializeAccessibilityFeatures();

      // Setup PWA features
      await this.setupPWAFeatures();

      // Initialize modules in dependency order
      await this.initializeModules();

      // Setup global error handling
      this.setupGlobalErrorHandling();

      // Setup module coordination
      this.setupModuleCoordination();

      // Setup state management integration
      this.setupStateIntegration();

      // Setup accessibility enhancements
      this.setupAccessibilityEnhancements();

      // Setup logo refresh functionality
      this.setupLogoRefresh();

      // Mark as initialized
      this.isInitialized = true;

      // Hide loading indicator
      this.hideLoadingIndicator();

      // Calculate and log initialization time
      const initTime = performance.now() - this.initializationStartTime;
      console.log(`✅ System Remaster HST initialized successfully in ${initTime.toFixed(1)}ms`);

      // Announce to screen readers
      announceToScreenReader('System Remaster HST flight planning application is ready', 'polite');

      // Show success notification
      notificationManager.success('System ready for flight planning');

    } catch (error) {
      console.error('❌ Failed to initialize System Remaster HST:', error);
      this.hideLoadingIndicator();
      this.showCriticalError('Failed to initialize application', error);
      
      // Announce error to screen readers
      announceToScreenReader('Application failed to initialize. Please reload the page.', 'assertive');
      
      throw error;
    }
  }

  /**
   * Initialize all modules in the correct order
   * @private
   */
  async initializeModules() {
    try {
      // Phase 1: Core modules (no dependencies)
      console.log('Initializing core modules...');
      
      this.modules.flightCalculator = new FlightCalculator();
      await this.modules.flightCalculator.initialize();

      this.modules.mapManager = new MapManager();
      await this.modules.mapManager.initialize();

      // Phase 2: Dependent modules
      console.log('Initializing dependent modules...');

      this.modules.waypointManager = new WaypointManager(this.modules.mapManager);
      await this.modules.waypointManager.initialize();

      this.modules.searchManager = new SearchManager(
        this.modules.waypointManager,
        this.modules.mapManager
      );
      await this.modules.searchManager.initialize();

      this.modules.uiManager = new UIManager(this.modules.flightCalculator);
      await this.modules.uiManager.initialize();

      this.modules.dragDropManager = new DragDropManager(this.modules.waypointManager);
      await this.modules.dragDropManager.initialize();

      console.log('All modules initialized successfully');

    } catch (error) {
      console.error('Error initializing modules:', error);
      throw new Error(`Module initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize accessibility features
   * @private
   */
  initializeAccessibilityFeatures() {
    try {
      // Create noscript fallback content
      NoScriptManager.createFallbackContent();
      NoScriptManager.createOfflineNotice();
      
      // Initialize live regions for screen readers
      // These are already initialized in the import
      
      // Setup high contrast support
      highContrastManager.onChange((isHighContrast) => {
        this.handleHighContrastChange(isHighContrast);
      });
      
      console.log('Accessibility features initialized');
      
    } catch (error) {
      console.error('Error initializing accessibility features:', error);
    }
  }

  /**
   * Setup accessibility enhancements
   * @private
   */
  setupAccessibilityEnhancements() {
    try {
      // Add skip links if not already present
      this.addSkipLinks();
      
      // Setup keyboard navigation helpers
      this.setupKeyboardNavigation();
      
      // Setup focus management
      this.setupFocusManagement();
      
      // Initialize ARIA live regions for dynamic updates
      this.setupLiveRegions();
      
      console.log('Accessibility enhancements setup complete');
      
    } catch (error) {
      console.error('Error setting up accessibility enhancements:', error);
    }
  }

  /**
   * Add skip links for keyboard navigation
   * @private
   */
  addSkipLinks() {
    try {
      if (!document.querySelector('.skip-link')) {
        const skipToMain = document.createElement('a');
        skipToMain.href = '#main-content';
        skipToMain.className = 'skip-link';
        skipToMain.textContent = 'Skip to main content';
        
        const skipToNav = document.createElement('a');
        skipToNav.href = '#waypoint-search';
        skipToNav.className = 'skip-link';
        skipToNav.textContent = 'Skip to waypoint search';
        
        document.body.insertBefore(skipToMain, document.body.firstChild);
        document.body.insertBefore(skipToNav, document.body.firstChild);
        
        // Ensure main content has proper ID
        const mainContent = document.querySelector('.flex.h-screen') || document.querySelector('main');
        if (mainContent && !mainContent.id) {
          mainContent.id = 'main-content';
        }
      }
    } catch (error) {
      console.error('Error adding skip links:', error);
    }
  }

  /**
   * Setup global keyboard navigation
   * @private
   */
  setupKeyboardNavigation() {
    try {
      // Global keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Alt + S to focus search
        if (e.altKey && e.key === 's') {
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Search"]');
          if (searchInput) {
            searchInput.focus();
            announceToScreenReader('Search focused', 'polite');
          }
        }
        
        // Alt + M to focus map
        if (e.altKey && e.key === 'm') {
          e.preventDefault();
          const map = document.querySelector('#map');
          if (map) {
            map.focus();
            announceToScreenReader('Map focused', 'polite');
          }
        }
        
        // Escape to close any open modals or dropdowns
        if (e.key === 'Escape') {
          this.handleEscapeKey();
        }
      });
      
      console.log('Global keyboard navigation setup');
      
    } catch (error) {
      console.error('Error setting up keyboard navigation:', error);
    }
  }

  /**
   * Setup focus management
   * @private
   */
  setupFocusManagement() {
    try {
      // Track focus for better accessibility
      let focusHistory = [];
      
      document.addEventListener('focusin', (e) => {
        focusHistory.push(e.target);
        // Keep only last 10 focus events
        if (focusHistory.length > 10) {
          focusHistory.shift();
        }
      });
      
      // Store focus history on the app instance
      this.focusHistory = focusHistory;
      
      console.log('Focus management setup');
      
    } catch (error) {
      console.error('Error setting up focus management:', error);
    }
  }

  /**
   * Setup ARIA live regions for dynamic content
   * @private
   */
  setupLiveRegions() {
    try {
      // Live regions are already created by the accessibility module
      // Just ensure they're working properly
      
      // Test the live region
      setTimeout(() => {
        liveRegionManager.announce('Flight planning system accessible features loaded', 'polite');
      }, 1000);
      
      console.log('Live regions setup complete');
      
    } catch (error) {
      console.error('Error setting up live regions:', error);
    }
  }

  /**
   * Handle high contrast mode changes
   * @private
   */
  handleHighContrastChange(isHighContrast) {
    try {
      if (isHighContrast) {
        document.body.classList.add('high-contrast-mode');
        liveRegionManager.announce('High contrast mode enabled', 'polite');
      } else {
        document.body.classList.remove('high-contrast-mode');
        liveRegionManager.announce('High contrast mode disabled', 'polite');
      }
    } catch (error) {
      console.error('Error handling high contrast change:', error);
    }
  }

  /**
   * Handle escape key press
   * @private
   */
  handleEscapeKey() {
    try {
      // Close any open modals
      const modals = document.querySelectorAll('.modal-overlay, .fixed.inset-0');
      modals.forEach(modal => {
        if (modal.style.display !== 'none') {
          modal.style.display = 'none';
          announceToScreenReader('Modal closed', 'polite');
        }
      });
      
      // Close search dropdown
      const searchDropdown = document.querySelector('.search-results-dropdown');
      if (searchDropdown && searchDropdown.style.display !== 'none') {
        searchDropdown.style.display = 'none';
        announceToScreenReader('Search results closed', 'polite');
      }
      
    } catch (error) {
      console.error('Error handling escape key:', error);
    }
  }

  /**
   * Setup logo refresh functionality
   * @private
   */
  setupLogoRefresh() {
    try {
      const logoImage = document.querySelector('.logo-image');
      if (logoImage) {
        logoImage.addEventListener('click', () => {
          window.location.reload();
        });
        
        // Add visual feedback
        logoImage.style.cursor = 'pointer';
        logoImage.title = 'Click to refresh page';
        logoImage.setAttribute('aria-label', 'Click to refresh the application');
        
        console.log('✅ Logo refresh functionality enabled');
      } else {
        console.warn('Logo image not found');
      }
    } catch (error) {
      console.error('Error setting up logo refresh functionality:', error);
    }
  }

  /**
   * Setup PWA features
   * @private
   */
  async setupPWAFeatures() {
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                notificationManager.info('App update available! Refresh to get the latest version.', {
                  duration: 0,
                  actions: [
                    {
                      label: 'Refresh',
                      handler: () => window.location.reload()
                    }
                  ]
                });
              }
            }
          });
        });
      }
      
      // Setup background sync if supported
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        console.log('✅ Background sync supported');
      }
      
      // Setup push notifications if supported
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          // Don't request permission automatically, wait for user action
          console.log('📬 Push notifications available (permission not granted)');
        } else if (Notification.permission === 'granted') {
          console.log('✅ Push notifications enabled');
        } else {
          console.log('❌ Push notifications denied');
        }
      }
      
      // Setup install prompt
      this.setupInstallPrompt();
      
      console.log('✅ PWA features initialized');
      
    } catch (error) {
      console.error('❌ Error setting up PWA features:', error);
      // Don't throw - PWA features are optional
    }
  }

  /**
   * Setup install prompt for PWA
   * @private
   */
  setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install notification
      notificationManager.info('Install System Remaster HST for offline access', {
        duration: 10000,
        actions: [
          {
            label: 'Install',
            handler: async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`PWA install outcome: ${outcome}`);
                deferredPrompt = null;
              }
            }
          }
        ]
      });
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      notificationManager.success('App installed! You can now use it offline.');
      deferredPrompt = null;
    });
  }

  /**
   * Setup state management integration
   * @private
   */
  setupStateIntegration() {
    try {
      // Subscribe to state changes for key application data
      stateManager.subscribe('flightPlan.*', (newValue, previousValue, path) => {
        console.log(`Flight plan updated: ${path}`, newValue);
        
        // Announce important changes to screen readers
        if (path === 'flightPlan.method') {
          announceToScreenReader(`Flight method changed to ${newValue}`, 'polite');
        } else if (path === 'flightPlan.route') {
          const routeLength = Array.isArray(newValue) ? newValue.length : 0;
          announceToScreenReader(`Route updated, ${routeLength} waypoints`, 'polite');
        }
      });
      
      // Subscribe to UI state changes
      stateManager.subscribe('ui.currentPanel', (newPanel) => {
        console.log(`UI panel changed to: ${newPanel}`);
        document.body.setAttribute('data-current-panel', newPanel);
      });
      
      // Subscribe to system errors
      stateManager.subscribe('system.errors', (errors) => {
        if (Array.isArray(errors) && errors.length > 0) {
          const latestError = errors[errors.length - 1];
          notificationManager.error(latestError.message, {
            actions: [
              {
                label: 'Details',
                handler: () => console.error('Error details:', latestError)
              }
            ]
          });
        }
      });
      
      // Subscribe to online/offline status
      stateManager.subscribe('system.isOnline', (isOnline) => {
        document.body.setAttribute('data-online', isOnline);
        
        if (isOnline) {
          notificationManager.success('Connection restored');
        } else {
          notificationManager.warning('Working offline - some features may be limited');
        }
      });
      
      // Initialize state with current values
      stateManager.setState('ui.currentPanel', 'route');
      stateManager.setState('system.isOnline', navigator.onLine);
      
      console.log('✅ State integration setup complete');
      
    } catch (error) {
      console.error('❌ Error setting up state integration:', error);
    }
  }

  /**
   * Setup coordination between modules
   * @private
   */
  setupModuleCoordination() {
    try {
      // Update flight calculator when route changes via state management instead of method wrapping
      if (this.modules.waypointManager && this.modules.flightCalculator) {
        // Subscribe to state changes instead of wrapping methods to avoid recursion
        stateManager.subscribe('flightPlan.route', (newRoute) => {
          console.log('🧮 Updating flight calculator with new route:', newRoute ? newRoute.length : 0, 'waypoints');
          this.modules.flightCalculator.updateRouteData(newRoute || []);
        });
        
        console.log('✅ Flight calculator coordination setup via state management');
      }

      // Coordinate search with waypoint selection
      if (this.modules.searchManager && this.modules.waypointManager) {
        // Search manager already has waypoint manager reference for coordination
        console.log('Search-Waypoint coordination established');
      }

      // Update UI when calculations change
      if (this.modules.uiManager && this.modules.flightCalculator) {
        // UI manager already has flight calculator reference
        console.log('UI-Calculator coordination established');
      }

      console.log('Module coordination setup complete');

    } catch (error) {
      console.error('Error setting up module coordination:', error);
    }
  }

  /**
   * Create global error handler
   * @private
   * @returns {Function} Error handler function
   */
  createGlobalErrorHandler() {
    return (error, context = 'Unknown') => {
      console.error(`[${context}] Application error:`, error);
      
      // Don't show errors during initialization to avoid spam
      if (this.isInitialized) {
        this.showError(`An error occurred: ${error.message}`);
      }
      
      // Log to external service in production
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        // this.logErrorToService(error, context);
      }
    };
  }

  /**
   * Setup global error handling
   * @private
   */
  setupGlobalErrorHandling() {
    try {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.errorHandler(event.reason, 'Unhandled Promise Rejection');
        event.preventDefault(); // Prevent default browser handling
      });

      // Handle uncaught errors
      window.addEventListener('error', (event) => {
        this.errorHandler(event.error || event.message, 'Uncaught Error');
      });

      console.log('Global error handling setup complete');

    } catch (error) {
      console.error('Error setting up global error handling:', error);
    }
  }

  /**
   * Show loading indicator
   * @private
   */
  showLoadingIndicator() {
    try {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'app-loading-indicator';
      loadingDiv.className = 'fixed inset-0 bg-[#15181e] z-50 flex items-center justify-center';
      loadingDiv.innerHTML = `
        <div class="text-center">
          <div class="w-16 h-16 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div class="text-white text-lg font-medium">Loading System Remaster HST...</div>
          <div class="text-[#a0a9bb] text-sm mt-2">Initializing flight planning system</div>
        </div>
      `;
      
      document.body.appendChild(loadingDiv);

    } catch (error) {
      console.error('Error showing loading indicator:', error);
    }
  }

  /**
   * Hide loading indicator
   * @private
   */
  hideLoadingIndicator() {
    try {
      const loadingDiv = document.getElementById('app-loading-indicator');
      if (loadingDiv) {
        loadingDiv.style.opacity = '0';
        loadingDiv.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
          if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error hiding loading indicator:', error);
    }
  }

  /**
   * Show success message
   * @private
   * @param {string} message - Success message
   * @param {string} type - Message type
   */
  showMessage(message, type = 'info') {
    try {
      const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      };

      const messageDiv = document.createElement('div');
      messageDiv.className = 'app-message-notification';
      messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10003;
        font-size: 14px;
        font-weight: 500;
        min-width: 250px;
        text-align: center;
        animation: slideDown 0.3s ease;
      `;
      messageDiv.textContent = message;

      // Add slide down animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      document.body.appendChild(messageDiv);

      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.style.animation = 'slideUp 0.3s ease';
          setTimeout(() => {
            if (messageDiv.parentNode) {
              messageDiv.parentNode.removeChild(messageDiv);
            }
          }, 300);
        }
      }, 3000);

    } catch (error) {
      console.error('Error showing message:', error);
    }
  }

  /**
   * Show error message
   * @private
   * @param {string} message - Error message
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * Show critical error that prevents app functionality
   * @private
   * @param {string} message - Error message
   * @param {Error} error - Original error object
   */
  showCriticalError(message, error) {
    try {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed inset-0 bg-[#15181e] z-50 flex items-center justify-center';
      errorDiv.innerHTML = `
        <div class="bg-[#1c1f26] rounded-xl p-8 max-w-md w-full mx-4 text-center border border-red-500">
          <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 256 256">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/>
            </svg>
          </div>
          <h2 class="text-white text-xl font-bold mb-4">System Error</h2>
          <p class="text-[#a0a9bb] mb-6">${message}</p>
          <button onclick="window.location.reload()" class="bg-[#2563eb] text-white px-6 py-2 rounded-lg hover:bg-[#1d4ed8] transition-colors">
            Reload Application
          </button>
          <details class="mt-4 text-left">
            <summary class="text-[#a0a9bb] text-sm cursor-pointer">Technical Details</summary>
            <pre class="text-red-400 text-xs mt-2 p-2 bg-[#20242d] rounded overflow-auto max-h-32">${error.stack || error.message}</pre>
          </details>
        </div>
      `;

      document.body.appendChild(errorDiv);

    } catch (err) {
      console.error('Error showing critical error:', err);
      // Fallback to alert if DOM manipulation fails
      alert(`Critical Error: ${message}\n\nPlease reload the page.`);
    }
  }

  /**
   * Get module instance
   * @param {string} moduleName - Name of the module
   * @returns {Object|null} Module instance or null if not found
   */
  getModule(moduleName) {
    return this.modules[moduleName] || null;
  }

  /**
   * Get all modules
   * @returns {Object} All module instances
   */
  getAllModules() {
    return { ...this.modules };
  }

  /**
   * Check if application is initialized
   * @returns {boolean} True if initialized
   */
  isAppInitialized() {
    return this.isInitialized;
  }

  /**
   * Get initialization time
   * @returns {number|null} Initialization time in milliseconds or null if not initialized
   */
  getInitializationTime() {
    return this.initializationStartTime ? 
      performance.now() - this.initializationStartTime : null;
  }

  /**
   * Destroy the application and clean up resources
   */
  async destroy() {
    try {
      console.log('🔄 Destroying System Remaster HST...');

      // Destroy modules in reverse order
      const moduleOrder = [
        'dragDropManager',
        'uiManager', 
        'searchManager',
        'waypointManager',
        'mapManager',
        'flightCalculator'
      ];

      for (const moduleName of moduleOrder) {
        if (this.modules[moduleName] && typeof this.modules[moduleName].destroy === 'function') {
          try {
            this.modules[moduleName].destroy();
            console.log(`✓ ${moduleName} destroyed`);
          } catch (error) {
            console.error(`Error destroying ${moduleName}:`, error);
          }
        }
      }

      // Clear modules
      this.modules = {};

      // Clear DOM cache
      domCache.clear();

      // Clean up accessibility features
      liveRegionManager.destroy();
      
      // Remove event listeners
      window.removeEventListener('unhandledrejection', this.errorHandler);
      window.removeEventListener('error', this.errorHandler);

      // Reset state
      this.isInitialized = false;
      this.initializationStartTime = null;

      console.log('✅ System Remaster HST destroyed successfully');

    } catch (error) {
      console.error('❌ Error during application destruction:', error);
      throw error;
    }
  }

  /**
   * Restart the application
   */
  async restart() {
    try {
      console.log('🔄 Restarting System Remaster HST...');
      
      await this.destroy();
      await this.initialize();
      
      this.showMessage('Application restarted successfully', 'success');
      
    } catch (error) {
      console.error('Error restarting application:', error);
      this.showCriticalError('Failed to restart application', error);
      throw error;
    }
  }
}

/**
 * Initialize the application when DOM is ready
 */
async function initializeApp() {
  try {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Create and initialize app instance
    window.SystemRemasterApp = new SystemRemasterApp();
    await window.SystemRemasterApp.initialize();

    // Add development helpers
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔧 Development mode active');
      
      // Add global shortcuts for debugging
      window.app = window.SystemRemasterApp;
      window.modules = window.SystemRemasterApp.getAllModules();
      window.config = CONFIG;
      
      // Add restart shortcut
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
          e.preventDefault();
          window.SystemRemasterApp.restart();
        }
      });
      
      console.log('🔍 Debug helpers available: window.app, window.modules, window.config');
      console.log('⌨️ Keyboard shortcuts: Ctrl+Shift+R to restart');
    }

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    // Show fallback error message
    document.body.innerHTML = `
      <div class="fixed inset-0 bg-[#15181e] flex items-center justify-center">
        <div class="bg-[#1c1f26] rounded-xl p-8 max-w-md w-full mx-4 text-center border border-red-500">
          <h2 class="text-white text-xl font-bold mb-4">Initialization Failed</h2>
          <p class="text-[#a0a9bb] mb-6">The System Remaster HST application failed to start.</p>
          <button onclick="window.location.reload()" class="bg-[#2563eb] text-white px-6 py-2 rounded-lg hover:bg-[#1d4ed8] transition-colors">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}

// Start the application
initializeApp();

export { SystemRemasterApp };