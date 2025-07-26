# System Remaster HST - API Documentation

## Overview

The System Remaster HST is a modular helicopter flight planning application built with ES6 modules, comprehensive error handling, and accessibility-first design.

## Architecture

### Core Modules

#### 1. SystemRemasterApp (main.js)
**Main application orchestrator that manages module lifecycle and coordination.**

```javascript
class SystemRemasterApp {
  constructor()
  async initialize() // Initialize all modules and setup coordination
  async destroy()     // Clean up all resources and modules
  async restart()     // Restart the entire application
  getModule(name)     // Get specific module instance
  getAllModules()     // Get all module instances
}
```

**Key Features:**
- Progressive enhancement initialization
- Accessibility feature setup
- Global error handling
- Module coordination and dependency management
- Performance monitoring with initialization timing

#### 2. MapManager (js/modules/MapManager.js)
**Manages Leaflet map initialization, controls, and map interactions.**

```javascript
class MapManager {
  async initialize()              // Initialize Leaflet map
  setView(lat, lng, zoom)        // Set map view with animation
  addMarker(lat, lng, options)   // Add marker to map
  removeMarker(markerId)         // Remove marker by ID
  fitBounds(bounds)              // Fit map to bounds
  getCurrentView()               // Get current map view
  destroy()                      // Clean up map resources
}
```

**Key Features:**
- Taiwan-focused coordinate system (23.973861, 120.982000)
- Custom zoom controls with accessibility
- Geolocation support with error handling
- Performance optimized tile loading
- Keyboard navigation support

#### 3. WaypointManager (js/modules/WaypointManager.js)
**Handles waypoint data loading, display, and route management.**

```javascript
class WaypointManager {
  constructor(mapManager)
  async initialize()                    // Load waypoint data
  async loadWaypoints()                // Load KML waypoint data
  displayWaypoints()                   // Display waypoints on map
  addToRoute(waypoint)                 // Add waypoint to planned route
  removeFromRoute(waypointId)          // Remove waypoint from route
  getPlannedRoute()                    // Get current planned route
  getAllWaypoints()                    // Get all available waypoints
  zoomToWaypoint(waypoint)            // Zoom to specific waypoint
}
```

**Key Features:**
- KML file parsing with error handling
- Interactive waypoint popups with accessibility
- Route management with drag-and-drop support
- Waypoint categorization and filtering
- Real-time route updates

#### 4. SearchManager (js/modules/SearchManager.js)
**Provides fast, debounced waypoint search with keyboard navigation.**

```javascript
class SearchManager {
  constructor(waypointManager, mapManager)
  async initialize()                    // Setup search functionality
  performSearch(query)                 // Execute search query
  clearSearch()                        // Clear search input
  setQuery(query)                     // Set search query programmatically
  getCurrentQuery()                   // Get current search query
  getResultsCount()                   // Get number of search results
}
```

**Key Features:**
- Debounced search with 300ms delay
- Result caching for improved performance
- Full keyboard navigation (arrows, Enter, Escape)
- ARIA-compliant search results
- Priority-based result ranking (exact → name → description → category)

#### 5. UIManager (js/modules/UIManager.js)
**Manages UI interactions, form validation, and panel transitions.**

```javascript
class UIManager {
  constructor(flightCalculator)
  async initialize()                    // Setup UI interactions
  selectFlightMethod(button)           // Handle flight method selection
  showFlightInfoPanel()               // Display flight information panel
  showCalculationPanel()              // Display calculation panel
  validateFlightInfo()                // Validate flight info form
  performCalculations()               // Execute flight calculations
  generateOFP()                       // Generate Operational Flight Plan
}
```

**Key Features:**
- Flight method selection (VFR, OS, FR) with radio group behavior
- Real-time form validation with accessibility
- Panel transitions with smooth animations
- Crew weight and weather data management
- OFP generation with modal display

#### 6. FlightCalculator (js/modules/FlightCalculator.js)
**Handles flight performance calculations and fuel planning.**

```javascript
class FlightCalculator {
  async initialize()                    // Initialize calculator
  calculateFuel()                      // Calculate fuel requirements
  calculatePerformance()               // Calculate performance metrics
  updateRouteData(route)              // Update route information
  updateCrewData(crewMember)          // Update crew weight data
  updateWeatherData(weather)          // Update weather conditions
  validateAllData()                   // Validate all input data
  generateFlightSummary()             // Generate comprehensive flight summary
}
```

**Key Features:**
- Fuel calculation with contingency planning
- Performance calculation (HOGE, payload)
- Weather impact assessment
- Crew weight management
- Route distance and time calculations

#### 7. DragDropManager (js/modules/DragDropManager.js)
**Provides accessible drag-and-drop functionality for waypoint reordering.**

```javascript
class DragDropManager {
  constructor(waypointManager)
  async initialize()                    // Setup drag-and-drop
  enableDragDrop(container)            // Enable drag-and-drop on container
  handleDragStart(e)                   // Handle drag start event
  handleDrop(e)                        // Handle drop event
  destroy()                           // Clean up drag-and-drop
}
```

**Key Features:**
- Touch and mouse drag support
- Keyboard reordering with arrow keys
- Visual feedback during drag operations
- Accessibility announcements
- Drop zone highlighting

### Utility Modules

#### DOM Utilities (js/modules/utils/dom.js)
**Core DOM manipulation utilities with performance optimization.**

```javascript
// DOM Element Creation
createElement(tag, attributes, textContent)

// DOM Caching System
domCache.get(selector)          // Get cached element
domCache.getAll(selector)       // Get cached element list
domCache.clear()                // Clear cache

// Event Management
addEventListenerWithCleanup(element, event, handler)

// Performance Utilities
debounce(func, delay)           // Debounce function execution
scrollToElement(element)        // Smooth scroll to element
```

#### Security Utilities (js/modules/utils/security.js)
**Input sanitization and XSS prevention utilities.**

```javascript
sanitizeInput(input, options)   // Sanitize user input
escapeHTML(text)               // Escape HTML characters
validateInput(input, rules)     // Validate input against rules
```

#### Validation Utilities (js/modules/utils/validation.js)
**Form validation with accessibility support.**

```javascript
validateCrewName(name, role)    // Validate crew member name
validateCallsign(callsign)     // Validate aircraft callsign
showFieldError(field, message) // Display field error
showFieldSuccess(field)        // Display field success
clearFieldError(field)         // Clear field error
```

#### Accessibility Utilities (js/modules/utils/accessibility.js)
**Comprehensive accessibility features and ARIA management.**

```javascript
// Screen Reader Support
announceToScreenReader(message, priority)

// Focus Management
class FocusTrap {
  activate()    // Activate focus trap
  deactivate()  // Deactivate focus trap
}

// Keyboard Navigation
class KeyboardNavigation {
  initialize()         // Setup keyboard navigation
  moveToNext()        // Move to next item
  moveToPrevious()    // Move to previous item
}

// Live Regions
class LiveRegionManager {
  announce(message, regionId)  // Announce to live region
  createRegion(id, politeness) // Create new live region
}
```

#### Progressive Enhancement (js/modules/utils/progressive.js)
**Feature detection and graceful degradation utilities.**

```javascript
class ProgressiveEnhancement {
  initialize()           // Initialize enhancement
  detectFeatures()       // Detect browser capabilities
  hasFeature(name)       // Check if feature is supported
  enableFallback(name)   // Enable specific fallback
}

class NoScriptManager {
  static createFallbackContent()  // Create noscript content
  static createOfflineNotice()    // Create offline notice
}
```

#### Common Components (js/modules/utils/common.js)
**Reusable UI components and utilities.**

```javascript
// Modal Component
class Modal {
  open(onClose)          // Open modal with callback
  close()               // Close modal
  setContent(content)   // Set modal content
  setTitle(title)       // Update modal title
}

// Form Component
class Form {
  addField(name, config)  // Add form field
  validate()             // Validate entire form
  getData()              // Get form data
  setData(data)          // Set form data
}

// Notification System
class NotificationManager {
  show(message, options)  // Show notification
  success(message)        // Show success notification
  error(message)          // Show error notification
  hide(id)               // Hide specific notification
}

// Utility Functions
createButton(config)       // Create styled button
createLoadingSpinner()     // Create loading spinner
debounce(func, delay)      // Debounce function
throttle(func, delay)      // Throttle function
```

## Configuration

### CONFIG Object (js/config.js)
**Centralized configuration management.**

```javascript
export const CONFIG = {
  // Map Settings
  MAP: {
    CENTER_LAT: 23.973861,
    CENTER_LNG: 120.982000,
    DEFAULT_ZOOM: 8,
    WAYPOINT_ZOOM: 12
  },
  
  // UI Settings
  UI: {
    SEARCH_DEBOUNCE: 300,
    MAX_SEARCH_RESULTS: 10,
    ANIMATION_DELAY: 150,
    POPUP_DELAY: 200
  },
  
  // Flight Settings
  FLIGHT: {
    DEFAULT_CREW_WEIGHT: 70,
    FUEL_RESERVE_PERCENT: 10,
    CONTINGENCY_PERCENT: 5
  },
  
  // Error Messages
  ERRORS: {
    WAYPOINT_NOT_FOUND: "No waypoints found matching your search",
    CALCULATION_ERROR: "Error performing flight calculations",
    VALIDATION_ERROR: "Please correct the errors below"
  },
  
  // CSS Classes
  CLASSES: {
    FLIGHT_METHOD_ACTIVE: "flight-method-active",
    FLIGHT_METHOD_INACTIVE: "flight-method-inactive"
  }
}
```

## Event System

### Global Events
- **Module Initialization**: Each module fires initialization events
- **Route Updates**: Waypoint additions/removals trigger route recalculation
- **Search Events**: Debounced search with result updates
- **Form Validation**: Real-time validation with accessibility announcements
- **Error Handling**: Global error boundary with user-friendly messages

### Accessibility Events
- **Screen Reader Announcements**: Dynamic content changes announced
- **Keyboard Navigation**: Full keyboard support with focus management
- **High Contrast**: Automatic detection and style application
- **Focus Trapping**: Modal and dropdown focus management

## Performance Features

### Optimization Strategies
1. **DOM Caching**: Frequently accessed elements cached for performance
2. **Debounced Operations**: Search and input handling optimized
3. **Lazy Loading**: Resources loaded on demand
4. **Event Cleanup**: Automatic event listener cleanup to prevent memory leaks
5. **Module Splitting**: Code split into focused, reusable modules

### Metrics Tracking
- Initialization time monitoring
- Error rate tracking
- Performance budget enforcement
- Resource usage optimization

## Error Handling

### Error Types
1. **Initialization Errors**: Module startup failures with fallback strategies
2. **Network Errors**: API and resource loading failures with retry logic
3. **Validation Errors**: User input validation with accessible error messages
4. **Runtime Errors**: Global error boundary with graceful degradation
5. **Security Errors**: Input sanitization and XSS prevention

### Error Recovery
- Automatic retry mechanisms for transient failures
- Graceful degradation for missing features
- User-friendly error messages with actionable guidance
- Logging and monitoring for production debugging

## Browser Compatibility

### Supported Features
- **ES6 Modules**: Modern JavaScript module system
- **CSS Custom Properties**: Dynamic theming support
- **Intersection Observer**: Performance optimized scrolling
- **Local Storage**: User preference persistence
- **Geolocation API**: Current location detection
- **File API**: KML file processing

### Fallback Strategies
- **No JavaScript**: Comprehensive noscript fallback forms
- **Limited Storage**: Graceful degradation without localStorage
- **No Geolocation**: Manual location input options
- **Legacy Browsers**: Basic functionality maintenance

## Security Features

### Input Validation
- All user inputs sanitized against XSS attacks
- File upload validation and processing
- Form validation with server-side equivalent patterns
- SQL injection prevention through parameterized queries

### Content Security
- Secure DOM manipulation without innerHTML where possible
- External resource integrity checks
- HTTPS enforcement for production deployments
- Sensitive data handling with encryption

## Deployment

### Build Process
1. **ES6 Module Bundling**: Optimized module concatenation
2. **CSS Optimization**: Minification and purging
3. **Asset Optimization**: Image compression and caching
4. **Performance Budgets**: Size and speed constraints enforced

### Production Configuration
- Error logging and monitoring setup
- Performance tracking implementation
- Security headers configuration
- CDN integration for static assets

---

*This documentation is automatically updated with each release. For the latest version, check the repository documentation.*