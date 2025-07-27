/**
 * Configuration file for System Remaster HST
 * Contains all application constants and settings
 */

export const CONFIG = {
  // Map settings
  MAP: {
    CENTER: [23.973861, 120.982000], // Taiwan coordinates
    ZOOM: 7.6,
    MAX_ZOOM: 19,
    TILE_URL: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    ATTRIBUTION: '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },

  // File paths
  FILES: {
    KML_WAYPOINTS: './src/Waypoint List Rev4.kml',
    ICON_BLACK_TAG: './icon/black-tag.png',
    ICON_BLUE_TAG: './icon/blue-tag.png',
    ICON_HELI: './icon/heli.png',
    ICON_HOIST_BAG: './icon/hoist-bag.png'
  },

  // Flight calculations
  FLIGHT: {
    TAXI_FUEL: 60, // kg
    FINAL_RESERVE_FUEL: 120, // kg (30 min)
    EXTRAS_FUEL: 80, // kg
    FUEL_CONSUMPTION_RATE: 2.5, // kg per minute
    CONTINGENCY_RATE: 0.1, // 10%
    DEFAULT_CREW_WEIGHT: 75, // kg
    BASE_HOGE: 2500, // kg
    BASE_PAYLOAD: 1800 // kg
  },

  // UI settings
  UI: {
    SEARCH_DEBOUNCE: 300, // ms
    ANIMATION_DELAY: 100, // ms
    POPUP_DELAY: 300, // ms
    MAX_SEARCH_RESULTS: 50,
    WAYPOINT_ZOOM_LEVEL: 15
  },

  // CSS classes
  CLASSES: {
    WAYPOINT_ITEM: 'waypoint-item flex items-center gap-4 bg-[#2a2f3a] mx-4 mb-2 rounded-lg px-4 min-h-14 justify-between',
    WAYPOINT_DRAGGING: 'waypoint-dragging',
    WAYPOINT_DRAG_OVER: 'waypoint-drag-over',
    WAYPOINT_DROP_TARGET: 'waypoint-drop-target',
    WAYPOINT_DROP_SUCCESS: 'waypoint-drop-success',
    WAYPOINT_REORDER_COMPLETE: 'waypoint-reorder-complete',
    WAYPOINT_POSITION_CHANGE: 'waypoint-position-change',
    WAYPOINT_SMOOTH_INSERT: 'waypoint-smooth-insert',
    WAYPOINT_DRAG_INVALID: 'waypoint-drag-invalid',
    FLIGHT_METHOD_ACTIVE: 'flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-3 bg-[#b1ccff] text-black text-sm font-bold leading-normal hover:bg-[#7b8eb2] transition-colors tracking-widest',
    FLIGHT_METHOD_INACTIVE: 'flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-3 bg-[#2a2f3a] text-white text-sm font-bold leading-normal hover:bg-[#3a3f4a] transition-colors tracking-widest'
  },

  // Error messages
  ERRORS: {
    KML_LOAD_FAILED: 'Failed to load waypoint data. Please check your internet connection and try again.',
    GEOLOCATION_DENIED: 'Location access denied. Please enable location services to use this feature.',
    GEOLOCATION_UNAVAILABLE: 'Location services are not available on this device.',
    CALCULATION_ERROR: 'Error calculating flight performance. Please check your inputs and try again.',
    WAYPOINT_NOT_FOUND: 'Waypoint not found. Please try a different search term.',
    INVALID_INPUT: 'Please enter valid numeric values.',
    DRAG_DROP_ERROR: 'Error reordering waypoints. Please try again.'
  },

  // Success messages
  SUCCESS: {
    WAYPOINT_ADDED: 'Waypoint added to route successfully',
    WAYPOINT_REMOVED: 'Waypoint removed from route',
    CALCULATION_COMPLETE: 'Flight calculations completed successfully',
    DATA_SAVED: 'Flight data saved successfully'
  },

  // Waypoint categories
  CATEGORIES: {
    WIND_TURBINES: 'Wind Turbines',
    FLIGHT_POINT: 'Flight Point'
  },

  // Regular expressions for waypoint categorization
  PATTERNS: {
    WIND_TURBINE: /^(F1|F2|CH1|CH2|CF|TP|ZN|YL|XD)/
  }
};