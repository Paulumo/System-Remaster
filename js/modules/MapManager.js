/**
 * MapManager - Handles all map-related functionality
 * Manages Leaflet map instance, controls, and map interactions
 */

import { CONFIG } from '../config.js';
import { domCache, addEventListenerWithCleanup, scrollToElement } from './utils/dom.js';

export class MapManager {
  constructor() {
    this.map = null;
    this.currentLocationMarker = null;
    this.eventCleanupFunctions = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the map
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.warn('MapManager already initialized');
        return;
      }

      await this.createMap();
      this.setupCustomControls();
      this.setupEventListeners();
      this.isInitialized = true;
      
      console.log('MapManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MapManager:', error);
      this.showError(CONFIG.ERRORS.MAP_INIT_FAILED || 'Failed to initialize map');
      throw error;
    }
  }

  /**
   * Create the Leaflet map instance
   * @private
   */
  async createMap() {
    const mapContainer = domCache.get('#map');
    if (!mapContainer) {
      throw new Error('Map container not found');
    }

    // Initialize map with Taiwan coordinates
    this.map = L.map('map', {
      center: CONFIG.MAP.CENTER,
      zoom: CONFIG.MAP.ZOOM,
      zoomControl: false, // We'll use custom controls
      attributionControl: true,
      preferCanvas: true // Better performance for many markers
    });

    // Add tile layer
    const tileLayer = L.tileLayer(CONFIG.MAP.TILE_URL, {
      maxZoom: CONFIG.MAP.MAX_ZOOM,
      attribution: CONFIG.MAP.ATTRIBUTION,
      subdomains: 'abcd'
    });

    await new Promise((resolve, reject) => {
      tileLayer.on('load', resolve);
      tileLayer.on('error', reject);
      tileLayer.addTo(this.map);
      
      // Resolve after a timeout in case load event doesn't fire
      setTimeout(resolve, 3000);
    });
  }

  /**
   * Setup custom map controls
   * @private
   */
  setupCustomControls() {
    // Zoom in button (first zoom control button)
    const zoomControls = document.querySelectorAll('.zoom-control');
    const zoomInButton = zoomControls[0]; // First button is zoom in
    if (zoomInButton) {
      const cleanup1 = addEventListenerWithCleanup(zoomInButton, 'click', () => {
        this.zoomIn();
      });
      this.eventCleanupFunctions.push(cleanup1);
      console.log('Zoom in button connected');
    }

    // Zoom out button (second zoom control button)
    const zoomOutButton = zoomControls[1]; // Second button is zoom out
    if (zoomOutButton) {
      const cleanup2 = addEventListenerWithCleanup(zoomOutButton, 'click', () => {
        this.zoomOut();
      });
      this.eventCleanupFunctions.push(cleanup2);
      console.log('Zoom out button connected');
    }

    // Location button
    const locationButton = document.querySelector('.location-control');
    if (locationButton) {
      const cleanup3 = addEventListenerWithCleanup(locationButton, 'click', () => {
        this.getCurrentLocation();
      });
      this.eventCleanupFunctions.push(cleanup3);
      console.log('Location button connected');
    } else {
      console.warn('Location button not found');
    }
  }

  /**
   * Setup map event listeners
   * @private
   */
  setupEventListeners() {
    if (!this.map) return;

    // Map click handler
    this.map.on('click', (e) => {
      this.onMapClick(e);
    });

    // Map zoom handler
    this.map.on('zoomend', () => {
      this.onZoomChange();
    });

    // Map move handler
    this.map.on('moveend', () => {
      this.onMapMove();
    });
  }

  /**
   * Zoom in the map
   */
  zoomIn() {
    if (!this.map) return;
    
    try {
      this.map.zoomIn();
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  }

  /**
   * Zoom out the map
   */
  zoomOut() {  
    if (!this.map) return;
    
    try {
      this.map.zoomOut();
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  }

  /**
   * Get current location and center map
   */
  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError(CONFIG.ERRORS.GEOLOCATION_UNAVAILABLE);
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude: lat, longitude: lng } = position.coords;
      
      // Remove existing location marker
      if (this.currentLocationMarker) {
        this.map.removeLayer(this.currentLocationMarker);
      }

      // Add new location marker
      this.currentLocationMarker = L.marker([lat, lng], {
        icon: this.createLocationIcon()
      }).addTo(this.map);

      this.currentLocationMarker.bindPopup('Your current location').openPopup();
      
      // Center map on location
      this.map.setView([lat, lng], CONFIG.UI.WAYPOINT_ZOOM_LEVEL);
      
    } catch (error) {
      console.error('Geolocation error:', error);
      
      let errorMessage;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = CONFIG.ERRORS.GEOLOCATION_DENIED;
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = CONFIG.ERRORS.GEOLOCATION_UNAVAILABLE;
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again.';
          break;
        default:
          errorMessage = 'Unable to get your location. Please try again.';
      }
      
      this.showError(errorMessage);
    }
  }

  /**
   * Create location icon for current position marker
   * @private
   * @returns {L.Icon} Leaflet icon
   */
  createLocationIcon() {
    return L.divIcon({
      className: 'current-location-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #2563eb;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  /**
   * Set map view to specific coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude  
   * @param {number} zoom - Zoom level (optional)
   */
  setView(lat, lng, zoom = CONFIG.UI.WAYPOINT_ZOOM_LEVEL) {
    if (!this.map) return;
    
    try {
      this.map.setView([lat, lng], zoom);
    } catch (error) {
      console.error('Error setting map view:', error);
    }
  }

  /**
   * Get current map bounds
   * @returns {L.LatLngBounds|null} Map bounds
   */
  getBounds() {
    return this.map ? this.map.getBounds() : null;
  }

  /**
   * Get current map center
   * @returns {L.LatLng|null} Map center
   */
  getCenter() {
    return this.map ? this.map.getCenter() : null;
  }

  /**
   * Get current zoom level
   * @returns {number|null} Zoom level
   */
  getZoom() {
    return this.map ? this.map.getZoom() : null;
  }

  /**
   * Add marker to map
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} options - Marker options
   * @returns {L.Marker|null} Created marker
   */
  addMarker(lat, lng, options = {}) {
    if (!this.map) return null;
    
    try {
      const marker = L.marker([lat, lng], options);
      marker.addTo(this.map);
      return marker;
    } catch (error) {
      console.error('Error adding marker:', error);
      return null;
    }
  }

  /**
   * Remove marker from map
   * @param {L.Marker} marker - Marker to remove
   */
  removeMarker(marker) {
    if (!this.map || !marker) return;
    
    try {
      this.map.removeLayer(marker);
    } catch (error) {
      console.error('Error removing marker:', error);
    }
  }

  /**
   * Close all open popups
   */
  closePopups() {
    if (this.map) {
      this.map.closePopup();
    }
  }

  /**
   * Handle map click events
   * @private
   * @param {L.MouseEvent} e - Leaflet mouse event
   */
  onMapClick(e) {
    // Override in subclasses or add event listeners externally
    console.log('Map clicked at:', e.latlng);
  }

  /**
   * Handle map zoom changes
   * @private
   */
  onZoomChange() {
    // Override in subclasses or add event listeners externally
    console.log('Map zoom changed to:', this.getZoom());
  }

  /**
   * Handle map move events
   * @private
   */
  onMapMove() {
    // Override in subclasses or add event listeners externally
    console.log('Map moved to:', this.getCenter());
  }

  /**
   * Show error message to user
   * @private
   * @param {string} message - Error message
   */
  showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'map-error-notification';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
      line-height: 1.4;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
    
    // Allow manual close
    errorDiv.addEventListener('click', () => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    });
  }

  /**
   * Get map instance (for external use)
   * @returns {L.Map|null} Leaflet map instance
   */
  getMapInstance() {
    return this.map;
  }

  /**
   * Check if map is initialized
   * @returns {boolean} True if initialized
   */
  isMapInitialized() {
    return this.isInitialized && this.map !== null;
  }

  /**
   * Destroy the map manager and clean up resources
   */
  destroy() {
    // Clean up event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];
    
    // Remove current location marker
    if (this.currentLocationMarker && this.map) {
      this.map.removeLayer(this.currentLocationMarker);
      this.currentLocationMarker = null;
    }
    
    // Remove map instance
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    this.isInitialized = false;
    console.log('MapManager destroyed');
  }
}