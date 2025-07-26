/**
 * SearchManager - Handles waypoint search functionality
 * Provides fast, efficient search with debouncing and result caching
 */

import { CONFIG } from '../config.js';
import { createElement, domCache, addEventListenerWithCleanup, debounce } from './utils/dom.js';
import { sanitizeInput, escapeHTML } from './utils/security.js';

export class SearchManager {
  constructor(waypointManager, mapManager) {
    this.waypointManager = waypointManager;
    this.mapManager = mapManager;
    this.searchResults = [];
    this.searchCache = new Map();
    this.searchInput = null;
    this.resultsDropdown = null;
    this.isInitialized = false;
    this.eventCleanupFunctions = [];
    
    // Debounced search function
    this.debouncedSearch = debounce(
      this.performSearch.bind(this), 
      CONFIG.UI.SEARCH_DEBOUNCE
    );
  }

  /**
   * Initialize search functionality
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.setupSearchInput();
      this.createResultsDropdown();
      this.setupEventListeners();
      this.isInitialized = true;
      
      console.log('SearchManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SearchManager:', error);
      throw error;
    }
  }

  /**
   * Setup search input field
   * @private
   */
  setupSearchInput() {
    this.searchInput = domCache.get('input[placeholder*="Search"]');
    if (!this.searchInput) {
      throw new Error('Search input not found');
    }
    
    // Update placeholder text
    this.searchInput.placeholder = 'Search waypoints...';
    this.searchInput.setAttribute('aria-label', 'Search waypoints');
    this.searchInput.setAttribute('role', 'searchbox');
    this.searchInput.setAttribute('aria-expanded', 'false');
    this.searchInput.setAttribute('aria-autocomplete', 'list');
  }

  /**
   * Create search results dropdown
   * @private
   */
  createResultsDropdown() {
    const searchContainer = this.searchInput.closest('.absolute');
    if (!searchContainer) {
      throw new Error('Search container not found');
    }
    
    this.resultsDropdown = createElement('div', {
      className: 'search-results-dropdown',
      id: 'search-results',
      role: 'listbox',
      'aria-label': 'Search results',
      style: `
        position: absolute;
        top: 100%;
        left: 16px;
        right: 16px;
        background: #20242d;
        border: 1px solid #2c333f;
        border-radius: 0.75rem;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1002;
        display: none;
        margin-top: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `
    });
    
    searchContainer.appendChild(this.resultsDropdown);
    
    // Set ARIA relationship
    this.searchInput.setAttribute('aria-owns', 'search-results');
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    if (!this.searchInput) return;
    
    // Search input events
    const cleanup1 = addEventListenerWithCleanup(this.searchInput, 'input', (e) => {
      this.handleSearchInput(e);
    });
    
    const cleanup2 = addEventListenerWithCleanup(this.searchInput, 'keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    const cleanup3 = addEventListenerWithCleanup(this.searchInput, 'focus', () => {
      if (this.searchInput.value.trim()) {
        this.showResults();
      }
    });
    
    const cleanup4 = addEventListenerWithCleanup(this.searchInput, 'blur', (e) => {
      // Delay hiding to allow clicks on results
      setTimeout(() => {
        if (!e.relatedTarget?.closest('.search-results-dropdown')) {
          this.hideResults();
        }
      }, 150);
    });
    
    // Global click handler to hide dropdown
    const cleanup5 = addEventListenerWithCleanup(document, 'click', (e) => {
      const searchContainer = this.searchInput.closest('.absolute');
      if (!searchContainer?.contains(e.target)) {
        this.hideResults();
      }
    });
    
    this.eventCleanupFunctions.push(cleanup1, cleanup2, cleanup3, cleanup4, cleanup5);
  }

  /**
   * Handle search input changes
   * @private
   * @param {Event} e - Input event
   */
  handleSearchInput(e) {
    try {
      const query = sanitizeInput(e.target.value.trim(), { maxLength: 100 });
      
      if (query.length === 0) {
        this.hideResults();
        this.searchInput.setAttribute('aria-expanded', 'false');
        return;
      }
      
      if (query.length < 2) {
        // Don't search for single characters
        return;
      }
      
      this.searchInput.setAttribute('aria-expanded', 'true');
      this.debouncedSearch(query);
      
    } catch (error) {
      console.error('Error handling search input:', error);
      this.showError('Search error occurred');
    }
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    if (!this.resultsDropdown || this.resultsDropdown.style.display === 'none') {
      return;
    }
    
    const resultItems = this.resultsDropdown.querySelectorAll('.search-result-item');
    const currentSelected = this.resultsDropdown.querySelector('.search-result-item.selected');
    let selectedIndex = currentSelected ? 
      Array.from(resultItems).indexOf(currentSelected) : -1;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, resultItems.length - 1);
        this.selectResultItem(resultItems[selectedIndex]);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        this.selectResultItem(resultItems[selectedIndex]);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (currentSelected) {
          const index = parseInt(currentSelected.dataset.index);
          if (!isNaN(index) && this.searchResults[index]) {
            this.selectWaypoint(this.searchResults[index]);
          }
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.hideResults();
        this.searchInput.blur();
        break;
    }
  }

  /**
   * Select a result item for keyboard navigation
   * @private
   * @param {HTMLElement} item - Result item to select
   */
  selectResultItem(item) {
    // Remove previous selection
    const previousSelected = this.resultsDropdown.querySelector('.search-result-item.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
      previousSelected.removeAttribute('aria-selected');
    }
    
    // Add selection to new item
    if (item) {
      item.classList.add('selected');
      item.setAttribute('aria-selected', 'true');
      item.scrollIntoView({ block: 'nearest' });
      
      // Update ARIA active descendant
      this.searchInput.setAttribute('aria-activedescendant', item.id);
    }
  }

  /**
   * Perform search operation
   * @private
   * @param {string} query - Search query
   */
  async performSearch(query) {
    try {
      const normalizedQuery = query.toLowerCase();
      
      // Check cache first
      if (this.searchCache.has(normalizedQuery)) {
        this.searchResults = this.searchCache.get(normalizedQuery);
        this.displaySearchResults();
        return;
      }
      
      // Wait for waypoints to be loaded
      if (!this.waypointManager.isWaypointsLoaded()) {
        this.showMessage('Loading waypoint data...', 'info');
        return;
      }
      
      // Perform search
      const allWaypoints = this.waypointManager.getAllWaypoints();
      this.searchResults = this.filterWaypoints(allWaypoints, normalizedQuery);
      
      // Cache results
      this.searchCache.set(normalizedQuery, this.searchResults);
      
      // Limit cache size
      if (this.searchCache.size > 50) {
        const firstKey = this.searchCache.keys().next().value;
        this.searchCache.delete(firstKey);
      }
      
      this.displaySearchResults();
      
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Search failed. Please try again.');
    }
  }

  /**
   * Filter waypoints based on search query
   * @private
   * @param {Array} waypoints - Array of waypoints to filter
   * @param {string} query - Normalized search query
   * @returns {Array} Filtered waypoints
   */
  filterWaypoints(waypoints, query) {
    const results = [];
    const exactMatches = [];
    const nameMatches = [];
    const descriptionMatches = [];
    const categoryMatches = [];
    
    waypoints.forEach(waypoint => {
      const name = waypoint.name.toLowerCase();
      const description = waypoint.description.toLowerCase();
      const category = waypoint.category.toLowerCase();
      
      // Exact name match (highest priority)
      if (name === query) {
        exactMatches.push(waypoint);
      }
      // Name starts with query
      else if (name.startsWith(query)) {
        nameMatches.push(waypoint);
      }
      // Name contains query
      else if (name.includes(query)) {
        nameMatches.push(waypoint);
      }
      // Description contains query
      else if (description.includes(query)) {
        descriptionMatches.push(waypoint);
      }
      // Category contains query
      else if (category.includes(query)) {
        categoryMatches.push(waypoint);
      }
    });
    
    // Combine results in priority order
    results.push(...exactMatches);
    results.push(...nameMatches);
    results.push(...descriptionMatches);
    results.push(...categoryMatches);
    
    // Remove duplicates and limit results
    const uniqueResults = results.filter((waypoint, index, arr) => 
      arr.findIndex(w => w.id === waypoint.id) === index
    );
    
    return uniqueResults.slice(0, CONFIG.UI.MAX_SEARCH_RESULTS);
  }

  /**
   * Display search results
   * @private
   */
  displaySearchResults() {
    if (!this.resultsDropdown) return;
    
    try {
      if (this.searchResults.length === 0) {
        this.displayNoResults();
        return;
      }
      
      // Clear previous results
      this.resultsDropdown.innerHTML = '';
      
      // Create result items
      this.searchResults.forEach((waypoint, index) => {
        const resultItem = this.createResultItem(waypoint, index);
        this.resultsDropdown.appendChild(resultItem);
      });
      
      this.showResults();
      
    } catch (error) {
      console.error('Error displaying search results:', error);
      this.displayNoResults();
    }
  }

  /**
   * Create search result item element
   * @private
   * @param {Object} waypoint - Waypoint data
   * @param {number} index - Result index
   * @returns {HTMLElement} Result item element
   */
  createResultItem(waypoint, index) {
    const itemId = `search-result-${index}`;
    
    const item = createElement('div', {
      className: 'search-result-item',
      id: itemId,
      role: 'option',
      'aria-selected': 'false',
      dataset: { index: index.toString() },
      tabindex: '-1'
    });
    
    const name = createElement('div', {
      className: 'search-result-name'
    });
    
    const nameText = createElement('span', {}, waypoint.name);
    const categoryBadge = createElement('span', {
      style: 'color: #2563eb; font-size: 11px; font-weight: 500; margin-left: 8px;'
    }, waypoint.category);
    
    name.appendChild(nameText);
    name.appendChild(categoryBadge);
    
    const coords = createElement('div', {
      className: 'search-result-coords'
    }, `${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}`);
    
    item.appendChild(name);
    item.appendChild(coords);
    
    if (waypoint.description) {
      const desc = createElement('div', {
        className: 'search-result-desc'
      }, waypoint.description);
      item.appendChild(desc);
    }
    
    // Add click handler
    const cleanup = addEventListenerWithCleanup(item, 'click', () => {
      this.selectWaypoint(waypoint);
    });
    
    // Store cleanup function for later
    item._cleanup = cleanup;
    
    return item;
  }

  /**
   * Display no results message
   * @private
   */
  displayNoResults() {
    if (!this.resultsDropdown) return;
    
    this.resultsDropdown.innerHTML = '';
    
    const noResults = createElement('div', {
      className: 'search-no-results',
      role: 'status',
      'aria-live': 'polite'
    }, CONFIG.ERRORS.WAYPOINT_NOT_FOUND || 'No waypoints found');
    
    this.resultsDropdown.appendChild(noResults);
    this.showResults();
  }

  /**
   * Show search results dropdown
   * @private
   */
  showResults() {
    if (this.resultsDropdown) {
      this.resultsDropdown.style.display = 'block';
      this.searchInput.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Hide search results dropdown
   * @private
   */
  hideResults() {
    if (this.resultsDropdown) {
      this.resultsDropdown.style.display = 'none';
      this.searchInput.setAttribute('aria-expanded', 'false');
      this.searchInput.removeAttribute('aria-activedescendant');
      
      // Clean up event listeners on result items
      const resultItems = this.resultsDropdown.querySelectorAll('.search-result-item');
      resultItems.forEach(item => {
        if (item._cleanup) {
          item._cleanup();
        }
      });
    }
  }

  /**
   * Select waypoint from search results
   * @private
   * @param {Object} waypoint - Selected waypoint
   */
  selectWaypoint(waypoint) {
    try {
      // Zoom to waypoint location
      this.mapManager.setView(waypoint.lat, waypoint.lng, CONFIG.UI.WAYPOINT_ZOOM_LEVEL);
      
      // Find and open the waypoint popup
      setTimeout(() => {
        // This would need to be coordinated with WaypointManager
        this.waypointManager.zoomToWaypoint(waypoint);
      }, CONFIG.UI.POPUP_DELAY);
      
      // Clear search and hide results
      this.searchInput.value = '';
      this.hideResults();
      
      console.log(`Selected waypoint: ${waypoint.name}`);
      
    } catch (error) {
      console.error('Error selecting waypoint:', error);
      this.showError('Failed to select waypoint');
    }
  }

  /**
   * Clear search input and results
   */
  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
      this.hideResults();
    }
  }

  /**
   * Get current search query
   * @returns {string} Current search query
   */
  getCurrentQuery() {
    return this.searchInput ? this.searchInput.value.trim() : '';
  }

  /**
   * Set search query
   * @param {string} query - Search query to set
   */
  setQuery(query) {
    if (this.searchInput) {
      this.searchInput.value = query;
      if (query.trim()) {
        this.debouncedSearch(query.trim());
      } else {
        this.hideResults();
      }
    }
  }

  /**
   * Get search results count
   * @returns {number} Number of current search results
   */
  getResultsCount() {
    return this.searchResults.length;
  }

  /**
   * Show message to user
   * @private
   * @param {string} message - Message text
   * @param {string} type - Message type
   */
  showMessage(message, type = 'info') {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    const messageDiv = createElement('div', {
      className: 'search-message-notification',
      style: `
        position: fixed;
        top: 70px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10001;
        font-size: 12px;
        max-width: 250px;
      `
    }, message);
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 2000);
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
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
    console.log('Search cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.searchCache.size,
      keys: Array.from(this.searchCache.keys())
    };
  }

  /**
   * Check if search is initialized
   * @returns {boolean} True if initialized
   */
  isSearchInitialized() {
    return this.isInitialized;
  }

  /**
   * Destroy search manager and clean up resources
   */
  destroy() {
    // Clean up event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];
    
    // Clean up result item listeners
    if (this.resultsDropdown) {
      const resultItems = this.resultsDropdown.querySelectorAll('.search-result-item');
      resultItems.forEach(item => {
        if (item._cleanup) {
          item._cleanup();
        }
      });
      
      // Remove dropdown
      if (this.resultsDropdown.parentNode) {
        this.resultsDropdown.parentNode.removeChild(this.resultsDropdown);
      }
    }
    
    // Clear data
    this.searchResults = [];
    this.searchCache.clear();
    this.searchInput = null;
    this.resultsDropdown = null;
    this.isInitialized = false;
    
    console.log('SearchManager destroyed');
  }
}