/**
 * WaypointManager - Handles waypoint data loading, storage, and display
 * Manages KML file parsing, waypoint categorization, and marker creation
 */

import { CONFIG } from '../config.js';
import { createElement, domCache, addEventListenerWithCleanup } from './utils/dom.js';
import { sanitizeHTML, escapeHTML } from './utils/security.js';
import { stateManager } from './StateManager.js';

export class WaypointManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.waypointsData = [];
    this.waypointMarkers = [];
    this.waypointCategories = new Set();
    this.plannedRoute = [];
    this.isLoaded = false;
    this.eventCleanupFunctions = [];
    this.stateUnsubscribeFunctions = [];
  }

  /**
   * Initialize waypoint manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.loadWaypoints();
      this.displayWaypoints();
      this.initializeExistingWaypoints();
      this.updateWaypointCounter();
      this.setupStateSubscriptions();
      
      console.log('WaypointManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WaypointManager:', error);
      this.showError(CONFIG.ERRORS.KML_LOAD_FAILED);
      throw error;
    }
  }

  /**
   * Setup state management subscriptions
   * @private
   */
  setupStateSubscriptions() {
    // Subscribe to route changes
    const unsubscribeRoute = stateManager.subscribe('flightPlan.route', (newRoute) => {
      this.syncRouteWithState(newRoute);
    });
    this.stateUnsubscribeFunctions.push(unsubscribeRoute);

    // Subscribe to selected waypoint changes
    const unsubscribeSelected = stateManager.subscribe('ui.selectedWaypoint', (waypoint) => {
      if (waypoint) {
        this.zoomToWaypoint(waypoint);
      }
    });
    this.stateUnsubscribeFunctions.push(unsubscribeSelected);
  }

  /**
   * Sync local route with state management
   * @private
   * @param {Array} stateRoute - Route from state
   */
  syncRouteWithState(stateRoute) {
    if (!Array.isArray(stateRoute)) return;
    
    // Update local route
    this.plannedRoute = [...stateRoute];
    this.updateWaypointCounter();
    
    // Update UI elements if needed
    this.syncRouteUI();
  }

  /**
   * Sync route UI with current state
   * @private
   */
  syncRouteUI() {
    // This could update the sidebar waypoint list
    // For now, we'll just update the counter
    this.updateWaypointCounter();
  }

  /**
   * Load waypoints from KML file
   * @returns {Promise<void>}
   */
  async loadWaypoints() {
    try {
      const response = await fetch(CONFIG.FILES.KML_WAYPOINTS);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const kmlText = await response.text();
      await this.parseKML(kmlText);
      
      this.isLoaded = true;
      console.log(`Loaded ${this.waypointsData.length} waypoints`);
      
    } catch (error) {
      console.error('Error loading waypoints:', error);
      throw new Error(`Failed to load waypoint data: ${error.message}`);
    }
  }

  /**
   * Parse KML file and extract waypoint data
   * @private
   * @param {string} kmlText - KML file content
   */
  async parseKML(kmlText) {
    try {
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = kmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('KML parsing failed: Invalid XML format');
      }
      
      const placemarks = kmlDoc.getElementsByTagName('Placemark');
      this.waypointsData = [];
      this.waypointCategories.clear();
      
      for (let i = 0; i < placemarks.length; i++) {
        const waypoint = await this.parsePlacemark(placemarks[i]);
        if (waypoint) {
          this.waypointsData.push(waypoint);
          this.waypointCategories.add(waypoint.category);
        }
      }
      
      if (this.waypointsData.length === 0) {
        throw new Error('No valid waypoints found in KML file');
      }
      
    } catch (error) {
      console.error('KML parsing error:', error);
      throw error;
    }
  }

  /**
   * Parse individual placemark from KML
   * @private
   * @param {Element} placemark - Placemark XML element
   * @returns {Object|null} Waypoint data or null if invalid
   */
  async parsePlacemark(placemark) {
    try {
      const nameElement = placemark.getElementsByTagName('name')[0];
      const descElement = placemark.getElementsByTagName('description')[0];
      const coordinatesElement = placemark.getElementsByTagName('coordinates')[0];
      
      if (!nameElement || !coordinatesElement) {
        return null;
      }
      
      const name = escapeHTML(nameElement.textContent.trim());
      const description = descElement ? escapeHTML(descElement.textContent.trim()) : '';
      const coordinates = coordinatesElement.textContent.trim();
      
      // Parse coordinates (format: longitude,latitude,altitude)
      const coords = coordinates.split(',');
      if (coords.length < 2) {
        console.warn(`Invalid coordinates for waypoint ${name}: ${coordinates}`);
        return null;
      }
      
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn(`Invalid numeric coordinates for waypoint ${name}: lat=${lat}, lng=${lng}`);
        return null;
      }
      
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn(`Coordinates out of range for waypoint ${name}: lat=${lat}, lng=${lng}`);
        return null;
      }
      
      // Determine category based on name patterns
      const category = this.categorizeWaypoint(name);
      
      return {
        name,
        description,
        lat,
        lng,
        category,
        id: this.generateWaypointId(name, lat, lng)
      };
      
    } catch (error) {
      console.error('Error parsing placemark:', error);
      return null;
    }
  }

  /**
   * Categorize waypoint based on name patterns
   * @private
   * @param {string} name - Waypoint name
   * @returns {string} Category name
   */
  categorizeWaypoint(name) {
    if (CONFIG.PATTERNS.WIND_TURBINE.test(name)) {
      return CONFIG.CATEGORIES.WIND_TURBINES;
    }
    return CONFIG.CATEGORIES.FLIGHT_POINT;
  }

  /**
   * Generate unique ID for waypoint
   * @private
   * @param {string} name - Waypoint name
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} Unique ID
   */
  generateWaypointId(name, lat, lng) {
    return `wp_${name}_${lat.toFixed(6)}_${lng.toFixed(6)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Display waypoints on map
   */
  displayWaypoints() {
    if (!this.mapManager.isMapInitialized()) {
      console.warn('Map not initialized, cannot display waypoints');
      return;
    }
    
    console.log('Displaying waypoints on map...');
    
    // Clear existing markers
    this.waypointMarkers.forEach(marker => {
      this.mapManager.removeMarker(marker);
    });
    this.waypointMarkers = [];
    
    // Add waypoints to map
    this.waypointsData.forEach((waypoint, index) => {
      try {
        const marker = this.createWaypointMarker(waypoint);
        if (marker) {
          this.waypointMarkers.push(marker);
        }
      } catch (error) {
        console.error(`Error creating marker for waypoint ${waypoint.name}:`, error);
      }
    });
    
    console.log(`Added ${this.waypointMarkers.length} markers to map`);
  }

  /**
   * Create marker for waypoint
   * @private
   * @param {Object} waypoint - Waypoint data
   * @returns {L.Marker|null} Created marker
   */
  createWaypointMarker(waypoint) {
    try {
      // Choose icon based on category
      const iconPath = waypoint.category === CONFIG.CATEGORIES.WIND_TURBINES 
        ? CONFIG.FILES.ICON_BLUE_TAG 
        : CONFIG.FILES.ICON_BLACK_TAG;
      
      const waypointIcon = L.icon({
        iconUrl: iconPath,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
      });
      
      const marker = this.mapManager.addMarker(waypoint.lat, waypoint.lng, {
        icon: waypointIcon,
        title: waypoint.name
      });
      
      if (marker) {
        const popupContent = this.createPopupContent(waypoint);
        marker.bindPopup(popupContent, {
          maxWidth: 250,
          className: 'waypoint-popup'
        });
        
        // Store waypoint reference
        marker.waypointData = waypoint;
      }
      
      return marker;
      
    } catch (error) {
      console.error(`Error creating marker for ${waypoint.name}:`, error);
      return null;
    }
  }

  /**
   * Create popup content for waypoint marker
   * @private
   * @param {Object} waypoint - Waypoint data
   * @returns {HTMLElement} Popup content element
   */
  createPopupContent(waypoint) {
    const container = createElement('div', { className: 'waypoint-popup' });
    
    const name = createElement('div', { className: 'waypoint-name' }, waypoint.name);
    const category = createElement('div', {
      className: 'waypoint-category',
      style: 'color: #2563eb; font-size: 11px; font-weight: 500; margin-bottom: 4px;'
    }, waypoint.category);
    
    const latCoord = createElement('div', { className: 'waypoint-coords' }, 
      `Lat: ${waypoint.lat.toFixed(6)}`);
    const lngCoord = createElement('div', { className: 'waypoint-coords' }, 
      `Lng: ${waypoint.lng.toFixed(6)}`);
    
    container.appendChild(name);
    container.appendChild(category);
    container.appendChild(latCoord);
    container.appendChild(lngCoord);
    
    if (waypoint.description) {
      const desc = createElement('div', { className: 'waypoint-desc' }, waypoint.description);
      container.appendChild(desc);
    }
    
    const addButton = createElement('button', {
      className: 'add-to-route-btn',
      onClick: () => this.addToRoute(waypoint)
    }, 'Add to Route');
    
    container.appendChild(addButton);
    
    return container;
  }

  /**
   * Add waypoint to planned route
   * @param {Object} waypoint - Waypoint to add
   */
  addToRoute(waypoint) {
    try {
      console.log(`Adding ${waypoint.name} to route`);
      
      // DEVELOPMENT: Allow duplicate waypoints for helicopter operations
      // (helicopters often depart/arrive at same location or use same flight points)
      
      // Dispatch state update
      stateManager.dispatch('ADD_WAYPOINT_TO_ROUTE', waypoint);
      
      // Create waypoint element in sidebar
      this.createRouteWaypointElement(waypoint);
      
      // Close popup
      this.mapManager.closePopups();
      
      this.showMessage(CONFIG.SUCCESS.WAYPOINT_ADDED, 'success');
      
    } catch (error) {
      console.error('Error adding waypoint to route:', error);
      this.showError('Failed to add waypoint to route');
    }
  }

  /**
   * Remove waypoint from planned route
   * @param {string} waypointId - Waypoint ID to remove
   */
  removeFromRoute(waypointId) {
    try {
      const waypoint = this.plannedRoute.find(wp => wp.id === waypointId);
      if (waypoint) {
        // Dispatch state update
        stateManager.dispatch('REMOVE_WAYPOINT_FROM_ROUTE', waypointId);
        
        this.showMessage(CONFIG.SUCCESS.WAYPOINT_REMOVED, 'success');
        console.log(`Removed ${waypoint.name} from route`);
      }
    } catch (error) {
      console.error('Error removing waypoint from route:', error);
    }
  }

  /**
   * Create waypoint element in route sidebar
   * @private
   * @param {Object} waypoint - Waypoint data
   */
  createRouteWaypointElement(waypoint) {
    const iconPath = waypoint.category === CONFIG.CATEGORIES.WIND_TURBINES 
      ? CONFIG.FILES.ICON_BLUE_TAG 
      : CONFIG.FILES.ICON_BLACK_TAG;
    
    const waypointElement = createElement('div', {
      className: CONFIG.CLASSES.WAYPOINT_ITEM,
      dataset: {
        waypointId: waypoint.id,
        waypointName: waypoint.name,
        lat: waypoint.lat,
        lng: waypoint.lng
      }
    });
    
    // Drag handle
    const dragHandle = createElement('div', {
      className: 'drag-handle text-[#a0a9bb] mr-2 cursor-grab'
    });
    dragHandle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M104,64a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,64Zm8,56h32a8,8,0,0,0,0-16H112a8,8,0,0,0,0,16Zm32,32H112a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm0,40H112a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Z"></path>
      </svg>
    `;
    
    // Icon
    const icon = createElement('img', {
      src: iconPath,
      alt: 'Tag',
      className: 'w-4 h-4 flex-shrink-0'
    });
    
    // Name (clickable)
    const nameElement = createElement('p', {
      className: 'text-white text-base font-bold leading-normal flex-1 truncate cursor-pointer waypoint-name',
      onClick: () => this.zoomToWaypoint(waypoint)
    }, waypoint.name);
    
    // Remove button container
    const removeContainer = createElement('div', { className: 'shrink-0' });
    const removeButton = createElement('div', {
      className: 'text-white flex size-7 items-center justify-center hover:bg-[#3a3f4a] rounded cursor-pointer',
      onClick: (e) => {
        e.stopPropagation();
        this.removeFromRoute(waypoint.id);
        waypointElement.remove();
      }
    });
    
    removeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
      </svg>
    `;
    
    removeContainer.appendChild(removeButton);
    
    // Assemble element
    waypointElement.appendChild(dragHandle);
    waypointElement.appendChild(icon);
    waypointElement.appendChild(nameElement);
    waypointElement.appendChild(removeContainer);
    
    // Insert before the "Continue with OFP" button
    const continueButton = domCache.get('#continue-ofp-btn');
    if (continueButton) {
      const continueContainer = continueButton.parentElement;
      continueContainer.parentNode.insertBefore(waypointElement, continueContainer);
    }
  }

  /**
   * Zoom to waypoint location on map
   * @param {Object} waypoint - Waypoint data
   */
  zoomToWaypoint(waypoint) {
    try {
      // Zoom to waypoint location
      this.mapManager.setView(waypoint.lat, waypoint.lng, CONFIG.UI.WAYPOINT_ZOOM_LEVEL);
      
      // Find and open the waypoint popup
      setTimeout(() => {
        const marker = this.waypointMarkers.find(m => {
          const markerPos = m.getLatLng();
          return Math.abs(markerPos.lat - waypoint.lat) < 0.0001 && 
                 Math.abs(markerPos.lng - waypoint.lng) < 0.0001;
        });
        
        if (marker) {
          marker.openPopup();
        }
      }, CONFIG.UI.POPUP_DELAY);
      
    } catch (error) {
      console.error('Error zooming to waypoint:', error);
    }
  }

  /**
   * Initialize existing waypoints in the sidebar
   */
  initializeExistingWaypoints() {
    const leftSidebar = domCache.get('.w-80.flex-shrink-0');
    if (!leftSidebar) return;
    
    const existingWaypoints = leftSidebar.querySelectorAll('.waypoint-item');
    
    existingWaypoints.forEach(waypointElement => {
      try {
        this.enhanceExistingWaypoint(waypointElement);
      } catch (error) {
        console.error('Error enhancing existing waypoint:', error);
      }
    });
  }

  /**
   * Enhance existing waypoint elements with proper functionality
   * @private
   * @param {HTMLElement} waypointElement - Existing waypoint element
   */
  enhanceExistingWaypoint(waypointElement) {
    // Skip if this is the "Continue with OFP" button container
    if (waypointElement.querySelector('#continue-ofp-btn')) return;
    
    const waypointParagraph = waypointElement.querySelector('p.text-white');
    if (!waypointParagraph) return;
    
    const waypointName = waypointParagraph.textContent.trim();
    
    // Find waypoint data
    const waypointData = this.waypointsData.find(wp => wp.name === waypointName);
    if (!waypointData) {
      console.warn(`Waypoint data not found for: ${waypointName}`);
      return;
    }
    
    // Add to planned route if not already there
    if (!this.plannedRoute.find(wp => wp.id === waypointData.id)) {
      this.plannedRoute.push(waypointData);
    }
    
    // Set data attributes
    waypointElement.dataset.waypointId = waypointData.id;
    waypointElement.dataset.waypointName = waypointData.name;
    waypointElement.dataset.lat = waypointData.lat;
    waypointElement.dataset.lng = waypointData.lng;
    
    // Make waypoint name clickable
    waypointParagraph.classList.add('cursor-pointer', 'waypoint-name');
    const cleanup1 = addEventListenerWithCleanup(waypointParagraph, 'click', (e) => {
      e.stopPropagation();
      this.zoomToWaypoint(waypointData);
    });
    this.eventCleanupFunctions.push(cleanup1);
    
    // Add remove button functionality
    const removeButton = waypointElement.querySelector('[data-icon="X"]');
    if (removeButton && !removeButton.hasAttribute('data-initialized')) {
      removeButton.setAttribute('data-initialized', 'true');
      const cleanup2 = addEventListenerWithCleanup(removeButton.parentElement, 'click', (e) => {
        e.stopPropagation();
        this.removeFromRoute(waypointData.id);
        waypointElement.remove();
      });
      this.eventCleanupFunctions.push(cleanup2);
    }
  }

  /**
   * Update waypoint counter display
   */
  updateWaypointCounter() {
    const counter = domCache.get('#waypoint-counter');
    if (!counter) return;
    
    try {
      if (!this.isLoaded) {
        counter.innerHTML = '<span class="text-[#a0a9bb] text-sm">Loading waypoints...</span>';
        return;
      }
      
      const routeCount = this.plannedRoute.length;
      const totalCount = this.waypointsData.length;
      
      // Category counts for all waypoints
      const categoryCounts = {};
      this.waypointsData.forEach(waypoint => {
        categoryCounts[waypoint.category] = (categoryCounts[waypoint.category] || 0) + 1;
      });
      
      const categoryText = Object.entries(categoryCounts)
        .map(([category, count]) => `${count} ${category}`)
        .join(', ');
      
      counter.innerHTML = `
        <span class="text-[#a0a9bb] text-sm">
          ${routeCount} waypoint${routeCount !== 1 ? 's' : ''} in route | 
          ${totalCount} total (${categoryText})
        </span>
      `;
      
    } catch (error) {
      console.error('Error updating waypoint counter:', error);
    }
  }

  /**
   * Get waypoint by ID
   * @param {string} waypointId - Waypoint ID
   * @returns {Object|null} Waypoint data or null
   */
  getWaypointById(waypointId) {
    return this.waypointsData.find(wp => wp.id === waypointId) || null;
  }

  /**
   * Get waypoint by name
   * @param {string} name - Waypoint name
   * @returns {Object|null} Waypoint data or null
   */
  getWaypointByName(name) {
    return this.waypointsData.find(wp => wp.name === name) || null;
  }

  /**
   * Get all waypoints
   * @returns {Array} Array of waypoint data
   */
  getAllWaypoints() {
    return [...this.waypointsData];
  }

  /**
   * Get planned route
   * @returns {Array} Array of waypoints in planned route
   */
  getPlannedRoute() {
    return [...this.plannedRoute];
  }

  /**
   * Get waypoints by category
   * @param {string} category - Category name
   * @returns {Array} Array of waypoints in category
   */
  getWaypointsByCategory(category) {
    return this.waypointsData.filter(wp => wp.category === category);
  }

  /**
   * Get all categories
   * @returns {Set} Set of category names
   */
  getCategories() {
    return new Set(this.waypointCategories);
  }

  /**
   * Show message to user
   * @private
   * @param {string} message - Message text
   * @param {string} type - Message type (success, warning, error)
   */
  showMessage(message, type = 'info') {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    const messageDiv = createElement('div', {
      className: 'waypoint-message-notification',
      style: `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        font-size: 14px;
        line-height: 1.4;
      `
    }, message);
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
    
    // Allow manual close
    const cleanup = addEventListenerWithCleanup(messageDiv, 'click', () => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    });
    
    // Clean up after removal
    setTimeout(() => cleanup(), 3000);
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
   * Clear all waypoints from route
   */
  clearRoute() {
    this.plannedRoute = [];
    
    // Remove all waypoint elements from sidebar
    const waypointElements = document.querySelectorAll('.waypoint-item');
    waypointElements.forEach(element => {
      if (!element.querySelector('#continue-ofp-btn')) {
        element.remove();
      }
    });
    
    this.updateWaypointCounter();
    this.showMessage('Route cleared', 'info');
  }

  /**
   * Check if waypoints are loaded
   * @returns {boolean} True if loaded
   */
  isWaypointsLoaded() {
    return this.isLoaded;
  }

  /**
   * Destroy waypoint manager and clean up resources
   */
  destroy() {
    // Clean up event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];
    
    // Clean up state subscriptions
    this.stateUnsubscribeFunctions.forEach(cleanup => cleanup());
    this.stateUnsubscribeFunctions = [];
    
    // Clear markers from map
    this.waypointMarkers.forEach(marker => {
      this.mapManager.removeMarker(marker);
    });
    
    // Clear data
    this.waypointsData = [];
    this.waypointMarkers = [];
    this.waypointCategories.clear();
    this.plannedRoute = [];
    this.isLoaded = false;
    
    console.log('WaypointManager destroyed');
  }
}