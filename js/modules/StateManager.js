/**
 * StateManager - Centralized state management with persistence
 * Provides reactive state management, local storage persistence, and event-driven updates
 */

import { CONFIG } from '../config.js';
import { sanitizeInput } from './utils/security.js';
import { announceToScreenReader } from './utils/accessibility.js';

/**
 * Central State Manager
 * Manages application state with persistence and reactivity
 */
export class StateManager {
  constructor() {
    this.state = {};
    this.listeners = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.storageKey = 'systemRemasterState';
    this.isInitialized = false;
    
    // Default state structure
    this.defaultState = {
      // Flight planning state
      flightPlan: {
        route: [],
        method: null, // VFR, OS, FR
        crew: {
          pic: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
          sic: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
          hop: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
          disp: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
          cust: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT }
        },
        aircraft: {
          callsign: '',
          type: 'helicopter',
          performance: {}
        },
        weather: {
          windSpeed: 0,
          windDirection: 0,
          temperature: 25,
          windBenefits: 75
        },
        fuel: {
          trip: 0,
          contingency: 0,
          discretion: 0,
          total: 0
        },
        performance: {
          hoge: 0,
          payload: 0
        }
      },
      
      // UI state
      ui: {
        currentPanel: 'route',
        searchQuery: '',
        selectedWaypoint: null,
        isCalculationPanelVisible: false,
        isFlightInfoPanelVisible: false,
        mapView: {
          lat: CONFIG.MAP.CENTER_LAT,
          lng: CONFIG.MAP.CENTER_LNG,
          zoom: CONFIG.MAP.DEFAULT_ZOOM
        }
      },
      
      // User preferences
      preferences: {
        theme: 'dark',
        units: 'metric',
        language: 'en',
        accessibility: {
          reducedMotion: false,
          highContrast: false,
          screenReader: false
        },
        notifications: {
          enabled: true,
          duration: 5000
        }
      },
      
      // System state
      system: {
        isOnline: navigator.onLine,
        lastSaved: null,
        version: '1.0.0',
        errors: [],
        warnings: []
      }
    };
  }

  /**
   * Initialize state manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load persisted state
      await this.loadState();
      
      // Setup online/offline detection
      this.setupNetworkListeners();
      
      // Setup auto-save
      this.setupAutoSave();
      
      this.isInitialized = true;
      console.log('StateManager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize StateManager:', error);
      // Initialize with default state if loading fails
      this.state = { ...this.defaultState };
      throw error;
    }
  }

  /**
   * Get current state or specific path
   * @param {string} path - Dot notation path (e.g., 'flightPlan.route')
   * @returns {*} State value
   */
  getState(path = null) {
    if (!path) {
      return { ...this.state };
    }
    
    return this.getNestedValue(this.state, path);
  }

  /**
   * Set state value with path
   * @param {string} path - Dot notation path
   * @param {*} value - New value
   * @param {Object} options - Update options
   */
  setState(path, value, options = {}) {
    const {
      silent = false,
      validate = true,
      sanitize = true,
      addToHistory = true
    } = options;

    try {
      // Validate and sanitize if needed
      let processedValue = value;
      
      if (sanitize && typeof value === 'string') {
        processedValue = sanitizeInput(value, { maxLength: 1000 });
      }
      
      if (validate && !this.validateStateChange(path, processedValue)) {
        throw new Error(`Invalid state change: ${path} = ${processedValue}`);
      }

      // Store previous state for history
      if (addToHistory) {
        this.addToHistory();
      }

      // Run middleware before state change
      const middlewareContext = {
        path,
        value: processedValue,
        previousValue: this.getNestedValue(this.state, path),
        timestamp: Date.now()
      };

      for (const middleware of this.middleware) {
        middleware.before?.(middlewareContext);
      }

      // Update state
      this.setNestedValue(this.state, path, processedValue);

      // Run middleware after state change
      for (const middleware of this.middleware) {
        middleware.after?.(middlewareContext);
      }

      // Notify listeners
      if (!silent) {
        this.notifyListeners(path, processedValue, middlewareContext.previousValue);
      }

      // Auto-save if configured
      if (this.shouldAutoSave(path)) {
        this.saveState();
      }

    } catch (error) {
      console.error('Error setting state:', error);
      this.addError('State Update Error', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch (or '*' for all changes)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(callback);
        if (pathListeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Dispatch action with reducer pattern
   * @param {string} type - Action type
   * @param {*} payload - Action payload
   */
  dispatch(type, payload = null) {
    try {
      const action = { type, payload, timestamp: Date.now() };
      
      switch (type) {
        case 'SET_FLIGHT_METHOD':
          this.setState('flightPlan.method', payload);
          announceToScreenReader(`Flight method set to ${payload}`, 'polite');
          break;
          
        case 'ADD_WAYPOINT_TO_ROUTE':
          const currentRoute = this.getState('flightPlan.route') || [];
          this.setState('flightPlan.route', [...currentRoute, payload]);
          announceToScreenReader(`Waypoint ${payload.name} added to route`, 'polite');
          break;
          
        case 'REMOVE_WAYPOINT_FROM_ROUTE':
          const route = this.getState('flightPlan.route') || [];
          const filteredRoute = route.filter(wp => wp.id !== payload);
          this.setState('flightPlan.route', filteredRoute);
          announceToScreenReader('Waypoint removed from route', 'polite');
          break;
          
        case 'UPDATE_CREW_MEMBER':
          this.setState(`flightPlan.crew.${payload.role}`, payload.data);
          break;
          
        case 'UPDATE_WEATHER':
          this.setState('flightPlan.weather', { ...this.getState('flightPlan.weather'), ...payload });
          break;
          
        case 'UPDATE_FUEL_CALCULATION':
          this.setState('flightPlan.fuel', payload);
          break;
          
        case 'UPDATE_PERFORMANCE_CALCULATION':
          this.setState('flightPlan.performance', payload);
          break;
          
        case 'SET_UI_PANEL':
          this.setState('ui.currentPanel', payload);
          break;
          
        case 'SET_SEARCH_QUERY':
          this.setState('ui.searchQuery', payload);
          break;
          
        case 'SET_MAP_VIEW':
          this.setState('ui.mapView', payload);
          break;
          
        case 'UPDATE_PREFERENCES':
          this.setState('preferences', { ...this.getState('preferences'), ...payload });
          break;
          
        case 'ADD_ERROR':
          this.addError(payload.title, payload.message);
          break;
          
        case 'CLEAR_ERRORS':
          this.setState('system.errors', []);
          break;
          
        case 'SET_ONLINE_STATUS':
          this.setState('system.isOnline', payload);
          if (payload) {
            announceToScreenReader('Connection restored', 'polite');
          } else {
            announceToScreenReader('Connection lost', 'assertive');
          }
          break;
          
        default:
          console.warn(`Unknown action type: ${type}`);
      }
      
    } catch (error) {
      console.error(`Error dispatching action ${type}:`, error);
      this.addError('Action Error', `Failed to execute ${type}: ${error.message}`);
    }
  }

  /**
   * Add middleware for state changes
   * @param {Object} middleware - Middleware object with before/after hooks
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Get state selector function
   * @param {string} path - Path to select
   * @returns {Function} Selector function
   */
  createSelector(path) {
    return () => this.getState(path);
  }

  /**
   * Persist state to localStorage
   * @returns {Promise<void>}
   */
  async saveState() {
    try {
      if (!this.supportsLocalStorage()) {
        console.warn('localStorage not available, skipping state persistence');
        return;
      }

      const stateToSave = {
        ...this.state,
        system: {
          ...this.state.system,
          lastSaved: Date.now()
        }
      };

      const serialized = JSON.stringify(stateToSave);
      localStorage.setItem(this.storageKey, serialized);
      
      console.log('State saved to localStorage');
      
    } catch (error) {
      console.error('Error saving state:', error);
      this.addError('Save Error', 'Failed to save application state');
    }
  }

  /**
   * Load state from localStorage
   * @returns {Promise<void>}
   */
  async loadState() {
    try {
      if (!this.supportsLocalStorage()) {
        this.state = { ...this.defaultState };
        return;
      }

      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Merge with default state to handle version updates
        this.state = this.mergeStates(this.defaultState, parsed);
        
        console.log('State loaded from localStorage');
      } else {
        this.state = { ...this.defaultState };
        console.log('No saved state found, using defaults');
      }
      
    } catch (error) {
      console.error('Error loading state:', error);
      this.state = { ...this.defaultState };
      this.addError('Load Error', 'Failed to load saved state, using defaults');
    }
  }

  /**
   * Clear all persisted state
   */
  clearPersistedState() {
    try {
      if (this.supportsLocalStorage()) {
        localStorage.removeItem(this.storageKey);
      }
      this.state = { ...this.defaultState };
      this.history = [];
      
      announceToScreenReader('Application state cleared', 'polite');
      console.log('State cleared');
      
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  }

  /**
   * Undo last state change
   */
  undo() {
    if (this.history.length === 0) {
      console.warn('No history available for undo');
      return false;
    }

    const previousState = this.history.pop();
    this.state = previousState;
    
    // Notify all listeners
    this.notifyListeners('*', this.state, null);
    
    announceToScreenReader('Action undone', 'polite');
    return true;
  }

  /**
   * Get application statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      stateSize: JSON.stringify(this.state).length,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
      historySize: this.history.length,
      lastSaved: this.getState('system.lastSaved'),
      errorCount: this.getState('system.errors').length,
      isOnline: this.getState('system.isOnline')
    };
  }

  /**
   * Export state for backup
   * @returns {string} JSON string of current state
   */
  exportState() {
    try {
      return JSON.stringify(this.state, null, 2);
    } catch (error) {
      console.error('Error exporting state:', error);
      throw new Error('Failed to export state');
    }
  }

  /**
   * Import state from backup
   * @param {string} stateJson - JSON string of state
   */
  importState(stateJson) {
    try {
      const imported = JSON.parse(stateJson);
      
      // Validate imported state structure
      if (!this.validateStateStructure(imported)) {
        throw new Error('Invalid state structure');
      }
      
      this.addToHistory();
      this.state = this.mergeStates(this.defaultState, imported);
      
      // Notify all listeners
      this.notifyListeners('*', this.state, null);
      
      announceToScreenReader('State imported successfully', 'polite');
      
    } catch (error) {
      console.error('Error importing state:', error);
      this.addError('Import Error', 'Failed to import state: ' + error.message);
      throw error;
    }
  }

  /**
   * Check if state manager is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Destroy state manager and clean up
   */
  destroy() {
    try {
      // Save final state
      this.saveState();
      
      // Clear all listeners
      this.listeners.clear();
      
      // Clear middleware
      this.middleware = [];
      
      // Clear history
      this.history = [];
      
      // Remove network listeners
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      
      this.isInitialized = false;
      
      console.log('StateManager destroyed');
      
    } catch (error) {
      console.error('Error destroying StateManager:', error);
    }
  }

  // Private methods

  /**
   * Get nested value from object using dot notation
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   * @private
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Notify state change listeners
   * @private
   */
  notifyListeners(path, newValue, previousValue) {
    // Notify specific path listeners
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.forEach(callback => {
        try {
          callback(newValue, previousValue, path);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    }

    // Notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(this.state, path, newValue, previousValue);
        } catch (error) {
          console.error('Error in global state listener:', error);
        }
      });
    }
  }

  /**
   * Add state to history for undo functionality
   * @private
   */
  addToHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Validate state change
   * @private
   */
  validateStateChange(path, value) {
    // Add validation rules as needed
    if (path === 'flightPlan.method') {
      return ['VFR', 'OS', 'FR'].includes(value);
    }
    
    if (path.includes('weight')) {
      return typeof value === 'number' && value >= 0 && value <= 500;
    }
    
    return true;
  }

  /**
   * Check if auto-save should be triggered
   * @private
   */
  shouldAutoSave(path) {
    // Don't auto-save UI state changes
    if (path.startsWith('ui.')) {
      return false;
    }
    
    // Auto-save important flight planning data
    return path.startsWith('flightPlan.') || path.startsWith('preferences.');
  }

  /**
   * Setup network status listeners
   * @private
   */
  setupNetworkListeners() {
    this.handleOnline = () => this.dispatch('SET_ONLINE_STATUS', true);
    this.handleOffline = () => this.dispatch('SET_ONLINE_STATUS', false);
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Setup auto-save functionality
   * @private
   */
  setupAutoSave() {
    // Save state every 30 seconds
    setInterval(() => {
      if (this.isInitialized) {
        this.saveState();
      }
    }, 30000);
  }

  /**
   * Check localStorage support
   * @private
   */
  supportsLocalStorage() {
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
   * Merge two state objects
   * @private
   */
  mergeStates(defaultState, savedState) {
    const merged = { ...defaultState };
    
    for (const [key, value] of Object.entries(savedState)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergeStates(defaultState[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  /**
   * Validate state structure
   * @private
   */
  validateStateStructure(state) {
    const requiredKeys = ['flightPlan', 'ui', 'preferences', 'system'];
    return requiredKeys.every(key => state.hasOwnProperty(key));
  }

  /**
   * Add error to system state
   * @private
   */
  addError(title, message) {
    const error = {
      id: Date.now() + Math.random(),
      title,
      message,
      timestamp: Date.now()
    };
    
    const currentErrors = this.getState('system.errors') || [];
    this.setState('system.errors', [...currentErrors, error], { silent: true });
    
    // Limit error history
    if (currentErrors.length > 50) {
      this.setState('system.errors', currentErrors.slice(-25), { silent: true });
    }
  }
}

// Create and export singleton instance
export const stateManager = new StateManager();