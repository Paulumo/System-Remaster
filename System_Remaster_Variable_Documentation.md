# System Remaster HST - Variable Documentation

**Generated on:** July 28, 2025
**Purpose:** Comprehensive documentation of all variables throughout the codebase  
**Project:** AW169 Helicopter Flight Planning System for Wind Turbine Operations in Taiwan

---

## Table of Contents

1. [Configuration Variables](#configuration-variables)
2. [Core Application Variables](#core-application-variables)
3. [State Management Variables](#state-management-variables)
4. [Navigation & Mapping Variables](#navigation--mapping-variables)
5. [Flight Calculation Variables](#flight-calculation-variables)
6. [Fuel Management Variables](#fuel-management-variables)
7. [Performance Calculation Variables](#performance-calculation-variables)
8. [User Interface Variables](#user-interface-variables)
9. [Waypoint Management Variables](#waypoint-management-variables)
10. [Drag & Drop Variables](#drag--drop-variables)
11. [Utility Variables](#utility-variables)
12. [Accessibility Variables](#accessibility-variables)
13. [Validation Variables](#validation-variables)
14. [Variable Relationship Graph](#variable-relationship-graph)

---

## Configuration Variables

### `js/config.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `CONFIG` | Object | Master configuration object | Complex object | Global configuration |
| `CONFIG.MAP.CENTER` | Array | Taiwan map center coordinates | `[23.973861, 120.982000]` | Leaflet map initialization |
| `CONFIG.MAP.ZOOM` | Number | Default map zoom level | `7.6` | Map display control |
| `CONFIG.MAP.MIN_ZOOM` | Number | Minimum allowed zoom | `5` | Map interaction limits |
| `CONFIG.MAP.MAX_ZOOM` | Number | Maximum allowed zoom | `18` | Map interaction limits |
| `CONFIG.FLIGHT.TAXI_FUEL` | Number | Fixed taxi fuel consumption | `60` kg | Fuel calculations |
| `CONFIG.FLIGHT.FINAL_RESERVE_FUEL` | Number | Final reserve fuel | `120` kg | Safety fuel planning |
| `CONFIG.FLIGHT.FUEL_CONSUMPTION_RATE` | Number | Fuel burn rate | `5` kg/min | Flight time calculations |
| `CONFIG.FLIGHT.TRUE_AIRSPEED` | Number | AW169 cruising speed | `120` kts | Navigation calculations |
| `CONFIG.FLIGHT.MAGNETIC_VARIATION` | Number | Taiwan magnetic variation | `+4.7` degrees | Course corrections |
| `CONFIG.PERFORMANCE.AIRCRAFT_EMPTY_WEIGHT` | Number | AW169 empty weight | `3427` kg | Weight & balance |
| `CONFIG.PERFORMANCE.DEFAULT_CREW_WEIGHT` | Number | Standard crew member weight | `85` kg | Performance calculations |
| `CONFIG.UI.SEARCH_DEBOUNCE` | Number | Search input delay | `300` ms | Performance optimization |
| `CONFIG.UI.ANIMATION_DURATION` | Number | UI animation timing | `300` ms | User experience |
| `CONFIG.CLASSES.*` | String | CSS class names | Various | UI styling and states |
| `CONFIG.ERRORS.*` | String | Error message templates | Various | User feedback |

---

## Core Application Variables

### `js/main.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `SystemRemasterApp` | Class | Main application controller | N/A | System orchestration |
| `modules` | Object | Module registry | `{}` | Module management |
| `isInitialized` | Boolean | App initialization state | `false` | Lifecycle control |
| `isServiceWorkerRegistered` | Boolean | PWA service worker status | `false` | Progressive web app |
| `serviceWorkerRegistration` | Object | SW registration object | `null` | PWA functionality |
| `initializationPromise` | Promise | Async init tracker | `null` | Load coordination |
| `moduleLoadOrder` | Array | Module dependency order | Predefined array | Bootstrap sequence |

---

## State Management Variables

### `js/modules/StateManager.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `state` | Object | Application state store | `{}` | Centralized data |
| `listeners` | Map | State change listeners | `new Map()` | Reactive updates |
| `defaultState` | Object | Initial state structure | Complex object | State initialization |
| `storageKey` | String | localStorage key | `'systemRemaster_state'` | Data persistence |
| `state.flightPlan.route` | Array | Planned waypoint route | `[]` | Flight planning |
| `state.flightPlan.method` | String | Route planning method | `null` | UI state tracking |
| `state.weather.windSpeed` | Number | Current wind speed | `0` | Weather conditions |
| `state.weather.windDirection` | Number | Wind direction degrees | `0` | Navigation calculations |
| `state.weather.temperature` | Number | Temperature celsius | `25` | Performance factors |
| `state.crew.*` | Object | Crew member data | Various | Personnel tracking |
| `state.aircraft.callsign` | String | Aircraft identifier | `''` | Flight identification |

---

## Navigation & Mapping Variables

### `js/modules/MapManager.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `map` | Object | Leaflet map instance | `null` | Map display control |
| `currentLocationMarker` | Object | User location marker | `null` | Position tracking |
| `mapContainer` | HTMLElement | Map DOM container | `null` | UI integration |
| `isInitialized` | Boolean | Map setup status | `false` | Lifecycle management |
| `locationWatchId` | Number | Geolocation watch ID | `null` | Location tracking |
| `userLocation` | Object | Current user coordinates | `null` | Position services |
| `isLocationTracking` | Boolean | Location service state | `false` | GPS tracking |

### `js/modules/NavigationCalculator.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `MAGNETIC_VARIATION` | Number | Taiwan magnetic variation | `+4.7` degrees | Course calculations |
| `EARTH_RADIUS_NM` | Number | Earth radius nautical miles | `3443.89849` | Great circle math |
| `TRUE_AIRSPEED` | Number | AW169 standard TAS | `120` kts | Wind corrections |
| `DEG_TO_RAD` | Number | Degree to radian conversion | `Math.PI / 180` | Trigonometric calculations |
| `RAD_TO_DEG` | Number | Radian to degree conversion | `180 / Math.PI` | Angle conversions |

---

## Flight Calculation Variables

### `js/modules/FlightCalculator.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `navigationCalculator` | Object | Navigation calculation engine | NavigationCalculator instance | Route calculations |
| `fuelCalculator` | Object | Fuel calculation engine | FuelCalculator instance | Fuel planning |
| `performanceCalculator` | Object | Performance calculation engine | PerformanceCalculator instance | Weight & balance |
| `lastCalculationData` | Object | Cached calculation results | `null` | Performance optimization |
| `isCalculating` | Boolean | Calculation in progress flag | `false` | UI state management |

---

## Fuel Management Variables

### `js/modules/FuelCalculator.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `FUEL_CONSUMPTION_RATE` | Number | Fuel burn rate kg/min | `5` | Flight time fuel calculations |
| `TAXI_FUEL` | Number | Fixed taxi fuel kg | `60` | Ground operations |
| `FINAL_RESERVE_MINUTES` | Number | Final reserve time | `30` minutes | Safety reserves |
| `FINAL_RESERVE_FUEL` | Number | Final reserve fuel kg | `150` | Emergency fuel |
| `EXTRAS_FUEL` | Number | Additional fuel kg | `80` | Operational margins |
| `CONTINGENCY_PERCENTAGE` | Number | Contingency fuel ratio | `0.10` (10%) | Risk mitigation |

---

## Performance Calculation Variables

### `js/modules/PerformanceCalculator.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `AIRCRAFT_EMPTY_WEIGHT` | Number | AW169 empty weight kg | `3427` | Weight calculations |
| `DEFAULT_CREW_WEIGHT` | Number | Standard crew weight kg | `85` | Personnel calculations |
| `PRESSURE_ALTITUDE` | Number | Taiwan operations altitude ft | `300` | Performance corrections |
| `CREW_POSITIONS` | Array | Crew role identifiers | `['pic', 'sic', 'hop']` | Personnel management |
| `STANDARD_TEMPERATURE` | Number | Standard temperature C | `25` | Performance baseline |
| `HOGE_PLACEHOLDER` | Number | Placeholder HOGE weight kg | `4200` | Performance calculations |

---

## User Interface Variables

### `js/modules/UIManager.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `currentStep` | String | Current UI workflow step | `'route-planning'` | Step management |
| `isFlightInfoVisible` | Boolean | Flight info panel state | `false` | UI visibility |
| `isCalculationsVisible` | Boolean | Calculations panel state | `false` | UI visibility |
| `eventCleanupFunctions` | Array | Event listener cleanup | `[]` | Memory management |
| `formElements` | Object | Cached form elements | `{}` | DOM optimization |
| `mutationObserver` | Object | DOM change observer | `null` | Dynamic content |

---

## Waypoint Management Variables

### `js/modules/WaypointManager.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `waypointsData` | Array | All available waypoints | `[]` | Route planning |
| `plannedRoute` | Array | Selected route waypoints | `[]` | Flight planning |
| `kmlUrl` | String | Waypoint data source | `'src/Waypoint List Rev4.kml'` | Data loading |
| `mapManager` | Object | Map manager reference | Map manager instance | UI integration |
| `isDataLoaded` | Boolean | Waypoint data status | `false` | Loading state |
| `windTurbinePattern` | RegExp | Wind turbine ID pattern | `/[A-Z]+\d+[A-Z]\d+/` | Critical point detection |

---

## Drag & Drop Variables

### `js/modules/DragDropManager.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `draggedElement` | HTMLElement | Currently dragged element | `null` | Drag state |
| `draggedIndex` | Number | Index of dragged element | `-1` | Position tracking |
| `dropTarget` | HTMLElement | Current drop target | `null` | Drop validation |
| `routeContainer` | HTMLElement | Route list container | `null` | UI integration |
| `isInitialized` | Boolean | Drag drop setup state | `false` | Lifecycle management |
| `eventCleanupFunctions` | Array | Event cleanup array | `[]` | Memory management |
| `mutationObserver` | MutationObserver | DOM change observer | `null` | Dynamic updates |
| `touchStartY` | Number | Touch start Y coordinate | `0` | Touch support |
| `touchCurrentY` | Number | Current touch Y coordinate | `0` | Touch tracking |
| `isTouchDragging` | Boolean | Touch drag state | `false` | Mobile interaction |

---

## Utility Variables

### `js/modules/utils/common.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `Modal.options` | Object | Modal configuration | Various defaults | UI components |
| `Modal.element` | HTMLElement | Modal DOM element | `null` | Modal management |
| `Modal.isOpen` | Boolean | Modal visibility state | `false` | UI state |
| `Form.fields` | Map | Form field registry | `new Map()` | Form management |
| `Form.validators` | Map | Field validators | `new Map()` | Data validation |
| `NotificationManager.notifications` | Map | Active notifications | `new Map()` | User feedback |
| `NotificationManager.maxNotifications` | Number | Maximum concurrent notifications | `5` | UI limits |

### `js/modules/utils/dom.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `DOMCache.cache` | Map | Element cache store | `new Map()` | Performance optimization |
| `domCache` | DOMCache | Singleton cache instance | `new DOMCache()` | Global DOM caching |

---

## Accessibility Variables

### `js/modules/utils/accessibility.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `FocusTrap.container` | HTMLElement | Focus trap container | Container element | Modal accessibility |
| `FocusTrap.isActive` | Boolean | Focus trap state | `false` | Accessibility management |
| `FocusTrap.focusableSelectors` | String | Focusable element CSS selectors | Predefined string | Focus management |
| `KeyboardNavigation.currentIndex` | Number | Current navigation index | `-1` | Keyboard navigation |
| `LiveRegionManager.regions` | Map | ARIA live regions | `new Map()` | Screen reader support |
| `HighContrastManager.isHighContrast` | Boolean | High contrast mode state | `false` | Visual accessibility |

---

## Validation Variables

### `js/modules/utils/validation.js`

| Variable | Type | Purpose | Default Value | Usage Context |
|----------|------|---------|---------------|---------------|
| `Validator.value` | Any | Value being validated | Provided value | Data validation |
| `Validator.fieldName` | String | Field name for errors | `'Field'` | Error messaging |
| `Validator.rules` | Array | Validation rules array | `[]` | Validation logic |

---

## Variable Relationship Graph

```
System Remaster HST - Variable Relationship Flow

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    CONFIG       │────│  SystemRemaster │────│  StateManager   │
│  (Global Setup) │    │      App        │    │ (Central State) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MapManager    │    │ WaypointManager │    │  UIManager      │
│ (Map Display)   │────│ (Route Data)    │────│ (UI Control)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │FlightCalculator │              │
         │              │ (Orchestrator)  │              │
         │              └─────────────────┘              │
         │                       │                       │
         │              ┌────────┼────────┐              │
         │              ▼        ▼        ▼              │
         │    ┌─────────────┐ ┌─────────┐ ┌─────────────┐│
         │    │NavigationCalc│ │FuelCalc │ │Performance  ││
         │    │             │ │         │ │Calculator   ││
         │    └─────────────┘ └─────────┘ └─────────────┘│
         │                                               │
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│DragDropManager  │                           │  SearchManager  │
│(Route Ordering) │                           │(Waypoint Search)│
└─────────────────┘                           └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Utility Layer                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │    DOM      │ │Accessibility│ │ Validation  │ │   Common    ││
│  │ Utilities   │ │  Support    │ │   System    │ │ Components  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘

Key Data Flow Relationships:

1. CONFIG → All modules (configuration inheritance)
2. StateManager ↔ All modules (reactive state updates)
3. WaypointManager → FlightCalculator (route data)
4. NavigationCalculator → FuelCalculator (flight times)
5. FuelCalculator → PerformanceCalculator (fuel weights)
6. MapManager ↔ WaypointManager (visual route display)
7. UIManager → All modules (user interaction coordination)
8. DragDropManager → WaypointManager (route reordering)
9. SearchManager → WaypointManager (waypoint selection)
```

---

## Key Variable Dependencies 

### Critical Path Variables
These variables form the core data flow for flight planning:

1. **Route Planning**: `waypointsData` → `plannedRoute` → `state.flightPlan.route`
2. **Navigation**: `MAGNETIC_VARIATION` → `trueCourse` → `magneticCourse` → `windCorrectionAngle`
3. **Fuel Calculation**: `FUEL_CONSUMPTION_RATE` → `tripFuel` → `totalFuel` → `fuelAtCriticalPoint`
4. **Performance**: `AIRCRAFT_EMPTY_WEIGHT` → `dom` → `availablePayload` → `taskSpecialistLoading`

### State Synchronization Variables
Variables that must remain synchronized across modules:

- `state.flightPlan.route` ↔ `plannedRoute` ↔ route display
- `state.weather.*` ↔ navigation calculations ↔ fuel planning
- `state.crew.*` ↔ performance calculations ↔ weight & balance

### UI State Variables
Variables controlling user interface visibility and interaction:

- `currentStep` → panel visibility → user workflow
- `isInitialized` → module readiness → feature availability
- `draggedElement` → visual feedback → user experience

---

## Variable Naming Conventions

### Patterns Used
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `FUEL_CONSUMPTION_RATE`)
- **Class Properties**: `camelCase` (e.g., `plannedRoute`)
- **Private Methods**: `camelCase` (e.g., `calculateDistance`)
- **Boolean Flags**: `is/has/can` prefix (e.g., `isInitialized`, `hasData`)
- **Event Handlers**: `handle` prefix (e.g., `handleDragStart`)
- **DOM Elements**: descriptive names (e.g., `routeContainer`, `mapElement`)

### Variable Lifecycle
1. **Initialization**: Set to default values in constructor
2. **Loading**: Populated during async operations
3. **Active**: Updated during user interactions
4. **Cleanup**: Reset/cleared during destroy operations

---

*This documentation provides a comprehensive overview of all variables in the System Remaster HST codebase. Each variable plays a specific role in the helicopter flight planning system, from basic configuration to complex flight calculations for AW169 operations in Taiwan airspace.*