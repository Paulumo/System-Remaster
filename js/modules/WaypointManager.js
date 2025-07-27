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
      
      // CRITICAL FIX: Clear any existing route state to prevent accumulation
      console.log('🧹 Clearing route state to prevent waypoint accumulation');
      this.clearRoute(true); // Silent clear during initialization
      
      this.updateWaypointCounter();
      this.setupStateSubscriptions();
      this.setupPresetRoutes();
      this.setupCriticalPointDropdownListener();
      
      // No default route - let user choose GCH or TRN manually
      console.log('WaypointManager initialized successfully - no default route loaded');
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
   * Setup preset route buttons
   * @private
   */
  setupPresetRoutes() {
    // GCH route button
    const gchButton = domCache.get('#preset-gch-btn');
    if (gchButton) {
      const cleanup1 = addEventListenerWithCleanup(gchButton, 'click', () => {
        this.loadPresetRoute('GCH');
      });
      this.eventCleanupFunctions.push(cleanup1);
    }

    // TRN route button
    const trnButton = domCache.get('#preset-trn-btn');
    if (trnButton) {
      const cleanup2 = addEventListenerWithCleanup(trnButton, 'click', () => {
        this.loadPresetRoute('TRN');
      });
      this.eventCleanupFunctions.push(cleanup2);
    }

    // Clear All button
    const clearAllButton = domCache.get('#clear-all-btn');
    if (clearAllButton) {
      const cleanup3 = addEventListenerWithCleanup(clearAllButton, 'click', () => {
        this.clearRoute(); // Show notification when manually clicked
      });
      this.eventCleanupFunctions.push(cleanup3);
    }
  }

  /**
   * Load preset route by name
   * @param {string} routeName - Name of the preset route (GCH or TRN)
   * @param {boolean} silent - If true, don't show success/error messages (for initialization)
   */
  loadPresetRoute(routeName, silent = false) {
    try {
      console.log(`🎯 Loading preset route: ${routeName}`);
      
      let waypointNames = [];
      
      switch (routeName) {
        case 'GCH':
          waypointNames = ['RCMQ', 'Dadu', 'CH1A01', 'Dadu', 'RCMQ'];
          break;
        case 'TRN':
          waypointNames = ['RCMQ', 'System', 'Libao', 'System', 'RCMQ'];
          break;
        default:
          console.error(`Unknown preset route: ${routeName}`);
          this.showError(`Unknown preset route: ${routeName}`);
          return;
      }

      // Clear existing route first
      this.clearRoute(silent);

      // Find and add waypoints
      const waypoints = [];
      for (const name of waypointNames) {
        const waypoint = this.getWaypointByName(name);
        if (waypoint) {
          waypoints.push(waypoint);
        } else {
          console.warn(`⚠️ Waypoint not found: ${name}`);
          if (!silent) {
            this.showMessage(`Waypoint '${name}' not found in database`, 'warning');
          }
        }
      }

      // Add waypoints to route
      if (waypoints.length > 0) {
        waypoints.forEach(waypoint => {
          this.addToRouteInternal(waypoint);
        });
        
        console.log(`✅ Loaded ${routeName} preset route with ${waypoints.length} waypoints:`);
        waypoints.forEach((wp, index) => {
          console.log(`  ${index + 1}. ${wp.name} (${wp.lat}, ${wp.lng})`);
        });
        
        // Update critical point dropdown after loading preset route
        this.updateCriticalPointDropdown();
        
        if (!silent) {
          this.showMessage(`${routeName} preset route loaded successfully`, 'success');
        }
      } else {
        if (!silent) {
          this.showError(`Failed to load ${routeName} preset route - no waypoints found`);
        }
      }
      
    } catch (error) {
      console.error(`Error loading preset route ${routeName}:`, error);
      if (!silent) {
        this.showError(`Failed to load ${routeName} preset route`);
      }
    }
  }

  /**
   * Sync local route with state management
   * @private
   * @param {Array} stateRoute - Route from state
   */
  syncRouteWithState(stateRoute) {
    if (!Array.isArray(stateRoute)) return;
    
    console.log(`🔄 syncRouteWithState called with ${stateRoute.length} waypoints`);
    console.log(`🔍 Current local route length: ${this.plannedRoute.length}`);
    
    // Prevent infinite loops by checking if sync is actually needed
    if (JSON.stringify(this.plannedRoute) === JSON.stringify(stateRoute)) {
      console.log(`⚠️ Route already in sync, skipping update`);
      return;
    }
    
    // Update local route
    this.plannedRoute = [...stateRoute];
    console.log(`🔄 Local route updated to ${this.plannedRoute.length} waypoints`);
    
    this.updateWaypointCounter();
    
    // Update UI elements if needed
    this.syncRouteUI();
  }

  /**
   * Sync route UI with current state
   * @private
   */
  syncRouteUI() {
    // Update the counter and critical point dropdown to reflect current route
    this.updateWaypointCounter();
    this.updateCriticalPointDropdown();
    console.log('🔄 Route UI synced with current state');
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
      'data-waypoint-id': waypoint.id,
      'data-waypoint-name': waypoint.name
    }, 'Add to Route');
    
    // Add event listener manually to ensure proper isolation
    addButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      e.preventDefault(); // Prevent default behavior
      console.log(`🎯 Button clicked for waypoint: ${waypoint.name} (ID: ${waypoint.id})`);
      this.addToRoute(waypoint);
    });
    
    container.appendChild(addButton);
    
    return container;
  }

  /**
   * Add waypoint to planned route (internal method without UI notifications)
   * @private
   * @param {Object} waypoint - Waypoint to add
   * @returns {boolean} True if waypoint was added successfully
   */
  addToRouteInternal(waypoint) {
    try {
      console.log(`🔍 addToRouteInternal called for: ${waypoint.name}`);
      console.log(`🔍 Current plannedRoute length: ${this.plannedRoute.length}`);
      
      // CRITICAL FIX: Create unique route waypoint with sequence-based ID
      // This prevents duplicate waypoint ID conflicts when same location is added multiple times
      const routeWaypoint = {
        ...waypoint,
        routeId: `route_${waypoint.id}_${Date.now()}_${this.plannedRoute.length}`, // Unique route-specific ID
        originalId: waypoint.id, // Keep reference to original waypoint
        routeSequence: this.plannedRoute.length + 1 // Position in route
      };
      
      // Update local route array with unique route waypoint
      this.plannedRoute.push(routeWaypoint);
      
      console.log(`🔍 After push, plannedRoute length: ${this.plannedRoute.length}`);
      console.log(`🆔 Created unique route ID: ${routeWaypoint.routeId} for ${waypoint.name}`);
      
      // FIXED: Update state with complete route instead of dispatching ADD action
      // This prevents accumulation issues in StateManager
      stateManager.setState('flightPlan.route', [...this.plannedRoute]);
      
      // Create waypoint element in sidebar with unique route ID
      this.createRouteWaypointElement(routeWaypoint);
      
      // Update waypoint counter after adding (now uses DOM-based counting)
      this.updateWaypointCounter();
      
      return true;
    } catch (error) {
      console.error('Error adding waypoint to route:', error);
      return false;
    }
  }

  /**
   * Add waypoint to planned route
   * @param {Object} waypoint - Waypoint to add
   */
  addToRoute(waypoint) {
    try {
      console.log(`📍 addToRoute called for: ${waypoint.name} (ID: ${waypoint.id})`);
      console.log(`🔍 Current route length before add: ${this.plannedRoute.length}`);
      console.log('🔍 Call stack:', new Error().stack);
      
      // Validate waypoint object
      if (!waypoint || !waypoint.name || !waypoint.id) {
        console.error('❌ Invalid waypoint object:', waypoint);
        this.showError('Invalid waypoint data');
        return;
      }
      
      // DEVELOPMENT: Allow duplicate waypoints for helicopter operations
      // (helicopters often depart/arrive at same location or use same flight points)
      
      const success = this.addToRouteInternal(waypoint);
      
      if (success) {
        // Close popup
        this.mapManager.closePopups();
        
        // Log the updated route with order, name, and coordinates
        console.log(`📊 Route Waypoints (${this.plannedRoute.length} total):`);
        this.plannedRoute.forEach((wp, index) => {
          console.log(`  ${index + 1}. ${wp.name} (${wp.lat}, ${wp.lng})`);
        });
        
        this.showMessage(CONFIG.SUCCESS.WAYPOINT_ADDED, 'success');
        
        // Update critical point dropdown
        this.updateCriticalPointDropdown();
      } else {
        this.showError('Failed to add waypoint to route');
      }
      
    } catch (error) {
      console.error('Error adding waypoint to route:', error);
      console.error('Waypoint data:', waypoint);
      this.showError('Failed to add waypoint to route');
    }
  }

  /**
   * Remove waypoint from planned route
   * @param {string} waypointId - Waypoint route ID to remove (could be routeId or original id)
   */
  removeFromRoute(waypointId) {
    try {
      console.log(`🗑️ removeFromRoute called for ID: ${waypointId}`);
      console.log(`🔍 Current route length before remove: ${this.plannedRoute.length}`);
      
      // CRITICAL FIX: Find waypoint by routeId first, then fallback to original id
      // This ensures we only remove the specific route instance, not all duplicates
      let waypoint = this.plannedRoute.find(wp => wp.routeId === waypointId);
      if (!waypoint) {
        // Fallback to original id for backward compatibility
        waypoint = this.plannedRoute.find(wp => wp.id === waypointId);
      }
      
      if (waypoint) {
        // Remove only the specific waypoint by routeId (or id as fallback)
        const originalLength = this.plannedRoute.length;
        const targetId = waypoint.routeId || waypoint.id;
        
        this.plannedRoute = this.plannedRoute.filter(wp => {
          const wpId = wp.routeId || wp.id;
          return wpId !== targetId;
        });
        
        console.log(`🔍 After filter, route length: ${this.plannedRoute.length} (removed ${originalLength - this.plannedRoute.length} waypoints)`);
        console.log(`🗑️ Removed waypoint with ${waypoint.routeId ? 'routeId' : 'id'}: ${targetId}`);
        
        // FIXED: Update state with complete route instead of dispatching REMOVE action
        // This prevents accumulation issues in StateManager
        stateManager.setState('flightPlan.route', [...this.plannedRoute]);
        
        this.showMessage(CONFIG.SUCCESS.WAYPOINT_REMOVED, 'success');
        console.log(`Removed ${waypoint.name} from route`);
        
        // Update waypoint counter and critical point dropdown
        this.updateWaypointCounter();
        this.updateCriticalPointDropdown();
        
        // Log updated route
        console.log(`📊 Route after removal (${this.plannedRoute.length} total):`);
        this.plannedRoute.forEach((wp, index) => {
          console.log(`  ${index + 1}. ${wp.name} (${wp.lat}, ${wp.lng}) [${wp.routeId || wp.id}]`);
        });
      } else {
        console.warn(`⚠️ Waypoint with ID ${waypointId} not found in planned route`);
      }
    } catch (error) {
      console.error('Error removing waypoint from route:', error);
    }
  }

  /**
   * Create waypoint element in route sidebar
   * @private
   * @param {Object} waypoint - Waypoint data (may include routeId for route-specific instances)
   */
  createRouteWaypointElement(waypoint) {
    const iconPath = waypoint.category === CONFIG.CATEGORIES.WIND_TURBINES 
      ? CONFIG.FILES.ICON_BLUE_TAG 
      : CONFIG.FILES.ICON_BLACK_TAG;
    
    // CRITICAL FIX: Use routeId for DOM identification to handle duplicate waypoints
    const elementId = waypoint.routeId || waypoint.id;
    
    const waypointElement = createElement('div', {
      className: CONFIG.CLASSES.WAYPOINT_ITEM,
      dataset: {
        waypointId: elementId, // Use unique route ID
        waypointName: waypoint.name,
        lat: waypoint.lat,
        lng: waypoint.lng,
        routeId: waypoint.routeId, // Store route ID for reference
        originalId: waypoint.originalId || waypoint.id // Store original waypoint ID
      }
    });
    
    // Drag handle
    const dragHandle = createElement('div', {
      className: 'drag-handle text-[#a0a9bb] mr-2 cursor-grab'
    });
    dragHandle.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path d="
          M6 3.5
          a1.5 1.5 0 1 0 0.001 0

          M6 10.5
          a1.5 1.5 0 1 0 0.001 0

          M6 17.5
          a1.5 1.5 0 1 0 0.001 0

          M18 3.5
          a1.5 1.5 0 1 0 0.001 0

          M18 10.5
          a1.5 1.5 0 1 0 0.001 0

          M18 17.5
          a1.5 1.5 0 1 0 0.001 0
        " />
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
        // CRITICAL FIX: Use unique element ID for removal
        this.removeFromRoute(elementId);
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
   * REMOVED: generateDefaultRoute - Now starting with 0 waypoints as requested
   * Users will add waypoints manually to the planned route
   */

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
    
    // REMOVED: Auto-adding to planned route - waypoints should only be added via explicit user interaction
    // This was causing mass waypoint additions when enhancing existing sidebar elements
    
    // CRITICAL FIX: Set data attributes using original waypoint ID for existing elements
    // (These are likely from older implementation before route ID system)
    waypointElement.dataset.waypointId = waypointData.id;
    waypointElement.dataset.waypointName = waypointData.name;
    waypointElement.dataset.lat = waypointData.lat;
    waypointElement.dataset.lng = waypointData.lng;
    waypointElement.dataset.originalId = waypointData.id; // Store reference to original ID
    
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
   * Uses DOM-based counting like DragDropManager for accuracy
   */
  updateWaypointCounter() {
    const counter = domCache.get('#waypoint-counter');
    if (!counter) return;
    
    try {
      if (!this.isLoaded) {
        counter.innerHTML = '<span class="text-[#a0a9bb] text-sm">Loading waypoints...</span>';
        return;
      }
      
      // Count actual waypoint elements in DOM (same approach as DragDropManager.js:600)
      const waypointContainer = document.querySelector('.w-80.flex-shrink-0') || document.getElementById('waypoints-container');
      const waypointElements = waypointContainer ? waypointContainer.querySelectorAll('.waypoint-item') : [];
      
      // FIXED: Use DragDropManager approach - filter out continue-ofp-btn
      const routeCount = Array.from(waypointElements).filter(wp => !wp.querySelector('#continue-ofp-btn')).length;
      
      console.log(`🔍 Counter update: Found ${waypointElements.length} total elements, ${routeCount} actual waypoints`);
      
      const totalCount = this.waypointsData.length;
      
      // Category counts for all loaded waypoints
      const categoryCounts = {};
      this.waypointsData.forEach(waypoint => {
        categoryCounts[waypoint.category] = (categoryCounts[waypoint.category] || 0) + 1;
      });
      
      const categoryText = Object.entries(categoryCounts)
        .map(([category, count]) => `${count} ${category}`)
        .join(', ');
      
      // UI display removed, but keep for console logging
      console.log(`📊 Route counter updated: ${routeCount} waypoints in planned route (DOM-based count)`);
      console.log(`📊 Total waypoints available: ${totalCount} (${categoryText})`);
      
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
   * @param {boolean} silent - If true, don't show notification message
   */
  clearRoute(silent = false) {
    console.log('🧹 Clearing all waypoints from route');
    
    // Clear local route array
    this.plannedRoute = [];
    
    // Clear state management route
    stateManager.setState('flightPlan.route', []);
    
    // Clear any cached state data
    try {
      // Clear localStorage cache if it exists
      localStorage.removeItem('flightPlan');
      localStorage.removeItem('plannedRoute');
      localStorage.removeItem('waypoints');
      console.log('🧹 Cleared localStorage cache');
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
    
    // Remove all waypoint elements from sidebar
    const waypointElements = document.querySelectorAll('.waypoint-item');
    waypointElements.forEach(element => {
      if (!element.querySelector('#continue-ofp-btn')) {
        element.remove();
      }
    });
    
    this.updateWaypointCounter();
    this.updateCriticalPointDropdown();
    
    if (!silent) {
      this.showMessage('Route cleared', 'info');
    }
    
    console.log('✅ Route cleared successfully');
  }

  /**
   * Update critical point dropdown with current route waypoints
   */
  updateCriticalPointDropdown() {
    const dropdown = domCache.get('#critical-point');
    if (!dropdown) {
      console.warn('⚠️ Critical point dropdown not found, attempting direct DOM query');
      const altDropdown = document.getElementById('critical-point');
      if (!altDropdown) {
        console.error('❌ Critical point dropdown element not found in DOM');
        return;
      }
      console.log('✅ Found critical point dropdown via direct query');
      return this.updateCriticalPointDropdownDirect(altDropdown);
    }
    
    try {
      console.log(`🎯 Updating critical point dropdown with ${this.plannedRoute.length} waypoints`);
      console.log(`📋 Current route order: ${this.plannedRoute.map((wp, i) => `${i+1}.${wp.name}`).join(' → ')}`);
      
      // Store current selected value to preserve selection
      const currentValue = dropdown.value;
      
      // Clear existing options except the first one
      dropdown.innerHTML = '<option value="">Select...</option>';
      
      // CRITICAL FIX: Populate with current route waypoints using unique routeId
      // This ensures each route instance has a unique dropdown option
      
      this.plannedRoute.forEach((waypoint, index) => {
        const optionValue = waypoint.routeId || waypoint.id; // Use unique route ID
        let displayText = `${index + 1}. ${waypoint.name}`;
        
        // Note: Removed hoisting annotation from dropdown for cleaner UI
        
        const option = createElement('option', {
          value: optionValue
        }, displayText);
        dropdown.appendChild(option);
        console.log(`  Added option: ${displayText} [${optionValue}]`);
      });
      
      // Restore previously selected value if it still exists, otherwise set default
      if (currentValue && Array.from(dropdown.options).some(option => option.value === currentValue)) {
        dropdown.value = currentValue;
        console.log(`  Restored selection to: ${dropdown.selectedOptions[0]?.textContent} [${currentValue}]`);
      } else if (this.plannedRoute.length >= 3) {
        const middleIndex = Math.floor(this.plannedRoute.length / 2);
        const middleWaypoint = this.plannedRoute[middleIndex];
        const defaultValue = middleWaypoint.routeId || middleWaypoint.id;
        dropdown.value = defaultValue;
        console.log(`  Set default to: ${middleWaypoint.name} [${defaultValue}]`);
      }
      
      console.log(`✅ Updated critical point dropdown with ${this.plannedRoute.length} waypoints`);
    } catch (error) {
      console.error('Error updating critical point dropdown:', error);
    }
  }

  /**
   * Direct update for critical point dropdown (fallback method)
   * @private
   * @param {HTMLElement} dropdown - Dropdown element
   */
  updateCriticalPointDropdownDirect(dropdown) {
    try {
      console.log(`🎯 Direct update critical point dropdown with ${this.plannedRoute.length} waypoints`);
      
      // Store current selected value to preserve selection
      const currentValue = dropdown.value;
      
      // Clear existing options except the first one
      dropdown.innerHTML = '<option value="">Select...</option>';
      
      // CRITICAL FIX: Populate with current route waypoints using unique routeId
      this.plannedRoute.forEach((waypoint, index) => {
        const option = document.createElement('option');
        const optionValue = waypoint.routeId || waypoint.id; // Use unique route ID
        option.value = optionValue;
        
        let displayText = `${index + 1}. ${waypoint.name}`;
        
        // Note: Removed hoisting annotation from dropdown for cleaner UI
        
        option.textContent = displayText;
        dropdown.appendChild(option);
        console.log(`  Added option: ${displayText} [${optionValue}]`);
      });
      
      // Restore previously selected value if it still exists, otherwise set default
      if (currentValue && Array.from(dropdown.options).some(option => option.value === currentValue)) {
        dropdown.value = currentValue;
        console.log(`  Restored selection to: ${dropdown.selectedOptions[0]?.textContent} [${currentValue}]`);
      } else if (this.plannedRoute.length >= 3) {
        const middleIndex = Math.floor(this.plannedRoute.length / 2);
        const middleWaypoint = this.plannedRoute[middleIndex];
        const defaultValue = middleWaypoint.routeId || middleWaypoint.id;
        dropdown.value = defaultValue;
        console.log(`  Set default to: ${middleWaypoint.name} [${defaultValue}]`);
      }
      
      console.log(`✅ Direct updated critical point dropdown with ${this.plannedRoute.length} waypoints`);
    } catch (error) {
      console.error('Error in direct critical point dropdown update:', error);
    }
  }

  /**
   * Setup critical point dropdown event listener to update display when selection changes
   * @private
   */
  setupCriticalPointDropdownListener() {
    const dropdown = domCache.get('#critical-point') || document.getElementById('critical-point');
    if (!dropdown) {
      console.warn('⚠️ Critical point dropdown not found, cannot setup listener');
      return;
    }

    const cleanup = addEventListenerWithCleanup(dropdown, 'change', () => {
      console.log('🎯 Critical point dropdown changed, updating display');
      // Update the dropdown with the newly selected item
      this.updateCriticalPointDropdown();
    });
    
    this.eventCleanupFunctions.push(cleanup);
    console.log('✅ Critical point dropdown listener setup complete');
  }

  /**
   * Get selected critical point waypoint
   * @returns {Object|null} Selected critical point waypoint data
   */
  getSelectedCriticalPoint() {
    const dropdown = domCache.get('#critical-point');
    if (!dropdown || !dropdown.value) return null;
    
    // CRITICAL FIX: Search by routeId first, then fallback to original id
    const selectedValue = dropdown.value;
    let waypoint = this.plannedRoute.find(wp => wp.routeId === selectedValue);
    if (!waypoint) {
      waypoint = this.plannedRoute.find(wp => wp.id === selectedValue);
    }
    
    return waypoint || null;
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