/**
 * Progressive Enhancement Utilities
 * Provides fallback functionality and graceful degradation
 */

/**
 * Progressive Enhancement Manager
 * Handles feature detection and graceful degradation
 */
export class ProgressiveEnhancement {
  constructor() {
    this.features = new Map();
    this.fallbacks = new Map();
    this.isEnhanced = false;
  }

  /**
   * Initialize progressive enhancement
   */
  initialize() {
    try {
      // Detect browser capabilities
      this.detectFeatures();
      
      // Apply enhancements based on capabilities
      this.applyEnhancements();
      
      // Setup fallback strategies
      this.setupFallbacks();
      
      this.isEnhanced = true;
      console.log('Progressive enhancement initialized');
      
    } catch (error) {
      console.error('Error initializing progressive enhancement:', error);
      this.enableBasicFallbacks();
    }
  }

  /**
   * Detect browser features and capabilities
   * @private
   */
  detectFeatures() {
    // JavaScript support (if we're here, it's supported)
    this.features.set('javascript', true);
    
    // ES6 modules support
    this.features.set('modules', typeof Symbol !== 'undefined' && typeof Promise !== 'undefined');
    
    // Local storage support
    this.features.set('localStorage', this.testLocalStorage());
    
    // Geolocation support
    this.features.set('geolocation', 'geolocation' in navigator);
    
    // File API support
    this.features.set('fileAPI', window.File && window.FileReader && window.FileList);
    
    // Intersection Observer support
    this.features.set('intersectionObserver', 'IntersectionObserver' in window);
    
    // Web Workers support
    this.features.set('webWorkers', typeof Worker !== 'undefined');
    
    // CSS Custom Properties support
    this.features.set('cssVariables', CSS && CSS.supports && CSS.supports('color', 'var(--test)'));
    
    // Flexbox support
    this.features.set('flexbox', CSS && CSS.supports && CSS.supports('display', 'flex'));
    
    // Grid support
    this.features.set('grid', CSS && CSS.supports && CSS.supports('display', 'grid'));
    
    // Touch support
    this.features.set('touch', 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    console.log('Detected features:', Object.fromEntries(this.features));
  }

  /**
   * Test localStorage availability
   * @private
   * @returns {boolean}
   */
  testLocalStorage() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply progressive enhancements
   * @private
   */
  applyEnhancements() {
    // Remove noscript elements since JS is working
    this.removeNoScriptElements();
    
    // Enable enhanced features based on capabilities
    if (this.hasFeature('localStorage')) {
      this.enableStorageFeatures();
    }
    
    if (this.hasFeature('geolocation')) {
      this.enableLocationFeatures();
    }
    
    if (this.hasFeature('intersectionObserver')) {
      this.enableLazyLoading();
    }
    
    if (this.hasFeature('touch')) {
      this.enableTouchFeatures();
    }
    
    // Add enhanced class to body
    document.body.classList.add('js-enhanced');
  }

  /**
   * Remove noscript elements
   * @private
   */
  removeNoScriptElements() {
    const noscriptElements = document.querySelectorAll('noscript');
    noscriptElements.forEach(element => {
      // Keep the element but hide it
      element.style.display = 'none';
    });
  }

  /**
   * Enable storage-dependent features
   * @private
   */
  enableStorageFeatures() {
    try {
      // Enable preferences storage
      document.body.classList.add('storage-enabled');
      
      // Initialize user preferences
      this.initializeUserPreferences();
      
      console.log('Storage features enabled');
    } catch (error) {
      console.error('Error enabling storage features:', error);
    }
  }

  /**
   * Enable location-dependent features
   * @private
   */
  enableLocationFeatures() {
    try {
      // Show location-based controls
      const locationControls = document.querySelectorAll('.location-control');
      locationControls.forEach(control => {
        control.style.display = 'flex';
        control.setAttribute('aria-hidden', 'false');
      });
      
      console.log('Location features enabled');
    } catch (error) {
      console.error('Error enabling location features:', error);
    }
  }

  /**
   * Enable lazy loading features
   * @private
   */
  enableLazyLoading() {
    try {
      // Add lazy loading class
      document.body.classList.add('lazy-loading-enabled');
      
      console.log('Lazy loading features enabled');
    } catch (error) {
      console.error('Error enabling lazy loading:', error);
    }
  }

  /**
   * Enable touch-specific features
   * @private
   */
  enableTouchFeatures() {
    try {
      // Add touch class for touch-specific styles
      document.body.classList.add('touch-enabled');
      
      // Increase touch targets
      const style = document.createElement('style');
      style.textContent = `
        .touch-enabled button,
        .touch-enabled .clickable {
          min-height: 44px;
          min-width: 44px;
        }
        
        .touch-enabled .search-result-item {
          padding: 16px;
        }
      `;
      document.head.appendChild(style);
      
      console.log('Touch features enabled');
    } catch (error) {
      console.error('Error enabling touch features:', error);
    }
  }

  /**
   * Initialize user preferences
   * @private
   */
  initializeUserPreferences() {
    try {
      const prefs = this.getUserPreferences();
      
      // Apply saved preferences
      if (prefs.darkMode !== undefined) {
        document.body.classList.toggle('dark-mode', prefs.darkMode);
      }
      
      if (prefs.reducedMotion) {
        document.body.classList.add('reduce-motion');
      }
      
      if (prefs.fontSize) {
        document.documentElement.style.fontSize = prefs.fontSize;
      }
      
    } catch (error) {
      console.error('Error initializing user preferences:', error);
    }
  }

  /**
   * Setup fallback strategies
   * @private
   */
  setupFallbacks() {
    // Map search fallback
    this.fallbacks.set('mapSearch', () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]');
      if (searchInput) {
        // Provide basic form submission fallback
        const form = document.createElement('form');
        form.action = '#';
        form.method = 'get';
        
        searchInput.parentNode.insertBefore(form, searchInput);
        form.appendChild(searchInput);
        
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.textContent = 'Search';
        submitBtn.style.marginLeft = '8px';
        form.appendChild(submitBtn);
      }
    });

    // Flight method selection fallback
    this.fallbacks.set('flightMethod', () => {
      const methodButtons = document.querySelectorAll('.flight-method-btn');
      if (methodButtons.length > 0) {
        // Convert to radio buttons for better fallback
        const form = document.createElement('form');
        const fieldset = document.createElement('fieldset');
        const legend = document.createElement('legend');
        
        legend.textContent = 'Select Flight Method';
        fieldset.appendChild(legend);
        
        methodButtons.forEach((button, index) => {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'flight-method';
          radio.value = button.textContent.trim();
          radio.id = `flight-method-${index}`;
          
          const label = document.createElement('label');
          label.htmlFor = radio.id;
          label.textContent = button.textContent.trim();
          label.style.marginLeft = '8px';
          label.style.marginRight = '16px';
          
          const wrapper = document.createElement('div');
          wrapper.style.marginBottom = '8px';
          wrapper.appendChild(radio);
          wrapper.appendChild(label);
          
          fieldset.appendChild(wrapper);
        });
        
        form.appendChild(fieldset);
        
        // Replace button container with form
        const buttonContainer = methodButtons[0].parentElement;
        buttonContainer.parentNode.insertBefore(form, buttonContainer);
        buttonContainer.style.display = 'none';
      }
    });

    // Form validation fallback
    this.fallbacks.set('formValidation', () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        // Add HTML5 validation attributes
        const requiredInputs = form.querySelectorAll('input[data-required="true"]');
        requiredInputs.forEach(input => {
          input.required = true;
        });
        
        // Add pattern validation where applicable
        const emailInputs = form.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
          input.pattern = '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
        });
      });
    });
  }

  /**
   * Enable basic fallbacks when enhancement fails
   * @private
   */
  enableBasicFallbacks() {
    try {
      // Show noscript content
      const noscriptElements = document.querySelectorAll('noscript');
      noscriptElements.forEach(element => {
        const content = element.innerHTML;
        const div = document.createElement('div');
        div.innerHTML = content;
        div.className = 'noscript-fallback';
        element.parentNode.insertBefore(div, element.nextSibling);
      });
      
      // Enable all fallbacks
      this.fallbacks.forEach((fallback, name) => {
        try {
          fallback();
          console.log(`Fallback enabled: ${name}`);
        } catch (error) {
          console.error(`Error enabling fallback ${name}:`, error);
        }
      });
      
      console.log('Basic fallbacks enabled');
    } catch (error) {
      console.error('Error enabling basic fallbacks:', error);
    }
  }

  /**
   * Check if a feature is supported
   * @param {string} featureName - Name of the feature
   * @returns {boolean}
   */
  hasFeature(featureName) {
    return this.features.get(featureName) === true;
  }

  /**
   * Get user preferences from storage
   * @returns {Object}
   */
  getUserPreferences() {
    if (!this.hasFeature('localStorage')) {
      return {};
    }
    
    try {
      const prefs = localStorage.getItem('userPreferences');
      return prefs ? JSON.parse(prefs) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save user preferences to storage
   * @param {Object} preferences - Preferences to save
   */
  saveUserPreferences(preferences) {
    if (!this.hasFeature('localStorage')) {
      console.warn('Cannot save preferences: localStorage not available');
      return;
    }
    
    try {
      const current = this.getUserPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem('userPreferences', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  /**
   * Enable a fallback strategy
   * @param {string} name - Fallback name
   */
  enableFallback(name) {
    const fallback = this.fallbacks.get(name);
    if (fallback) {
      try {
        fallback();
        console.log(`Fallback enabled: ${name}`);
      } catch (error) {
        console.error(`Error enabling fallback ${name}:`, error);
      }
    }
  }

  /**
   * Check if enhancement is active
   * @returns {boolean}
   */
  isEnhancementActive() {
    return this.isEnhanced;
  }

  /**
   * Get all detected features
   * @returns {Object}
   */
  getFeatures() {
    return Object.fromEntries(this.features);
  }
}

/**
 * No-JavaScript fallback content manager
 */
export class NoScriptManager {
  /**
   * Create noscript fallback content for essential functionality
   */
  static createFallbackContent() {
    // Create noscript element for main functionality
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `
      <div class="noscript-notice" style="
        background: #f59e0b;
        color: white;
        padding: 16px;
        text-align: center;
        margin: 16px;
        border-radius: 8px;
        font-weight: 500;
      ">
        <p>This application requires JavaScript for full functionality.</p>
        <p>Please enable JavaScript in your browser for the best experience.</p>
      </div>
      
      <div class="noscript-fallback" style="
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: sans-serif;
        line-height: 1.6;
      ">
        <h2>System Remaster HST - Flight Planning</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Basic Flight Planning Form</h3>
          <form method="post" action="#">
            <div style="margin-bottom: 16px;">
              <label for="noscript-pic" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Pilot in Command (PIC):
              </label>
              <input type="text" id="noscript-pic" name="pic" required
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            
            <div style="margin-bottom: 16px;">
              <label for="noscript-callsign" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Aircraft Callsign:
              </label>
              <input type="text" id="noscript-callsign" name="callsign"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            
            <fieldset style="border: 1px solid #ccc; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
              <legend style="font-weight: 500;">Flight Method:</legend>
              <div style="margin: 8px 0;">
                <input type="radio" id="noscript-vfr" name="flight-method" value="VFR" required>
                <label for="noscript-vfr" style="margin-left: 8px;">VFR</label>
              </div>
              <div style="margin: 8px 0;">
                <input type="radio" id="noscript-os" name="flight-method" value="OS" required>
                <label for="noscript-os" style="margin-left: 8px;">OS</label>
              </div>
              <div style="margin: 8px 0;">
                <input type="radio" id="noscript-fr" name="flight-method" value="FR" required>
                <label for="noscript-fr" style="margin-left: 8px;">FR</label>
              </div>
            </fieldset>
            
            <div style="margin-bottom: 16px;">
              <label for="noscript-route" style="display: block; margin-bottom: 4px; font-weight: 500;">
                Planned Route (separate waypoints with commas):
              </label>
              <textarea id="noscript-route" name="route" rows="3"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                placeholder="RCMQ, DADU, CH1A07"></textarea>
            </div>
            
            <button type="submit" style="
              background: #2563eb;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
              font-weight: 500;
            ">Create Flight Plan</button>
          </form>
        </div>
        
        <div style="background: #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Manual Flight Planning Steps</h3>
          <ol style="padding-left: 20px;">
            <li>Verify pilot certification and currency</li>
            <li>Check aircraft maintenance status and documentation</li>
            <li>Review weather conditions and forecasts</li>
            <li>Plan route and calculate fuel requirements</li>
            <li>Determine weight and balance</li>
            <li>File flight plan if required</li>
            <li>Complete pre-flight inspection</li>
          </ol>
        </div>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Contact Information</h3>
          <p>For assistance with flight planning, please contact operations:</p>
          <ul style="list-style: none; padding-left: 0;">
            <li>📞 Emergency: Contact your local flight operations</li>
            <li>📧 Email: Use your organization's flight planning procedures</li>
            <li>📋 Manual: Refer to your flight operations manual</li>
          </ul>
        </div>
      </div>
    `;
    
    // Insert at the beginning of body
    document.body.insertBefore(noscript, document.body.firstChild);
  }
  
  /**
   * Create service worker fallback notification
   */
  static createOfflineNotice() {
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 16px;
        border-radius: 8px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-family: sans-serif;
      ">
        <p style="margin: 0; font-size: 14px;">
          Offline functionality is not available without JavaScript.
        </p>
      </div>
    `;
    
    document.body.appendChild(noscript);
  }
}

// Create and export singleton
export const progressiveEnhancement = new ProgressiveEnhancement();