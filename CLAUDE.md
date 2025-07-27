# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **System Remaster of HST** - a comprehensive helicopter flight planning and operations management system specifically designed for **AW169 helicopter operations** conducting **wind turbine maintenance flights** in Taiwan airspace.

The system generates **Operational Flight Plans (OFP)** with detailed flight calculations including navigation, fuel planning, weight & balance, and payload management for helicopter crews.

## Mission Profile

**Primary Operations**: Wind turbine maintenance and inspection flights
- **Typical Route**: RCMQ (departure) → Dadu (transit) → (wind turbine/critical point) → Dadu (return transit) → RCMQ (arrival)
- **Aircraft Type**: AW169 helicopter
- **Crew Configuration**: PIC (Pilot in Command), SIC (Second in Command), HOP (Hoist Operator)
- **Payload**: 3 Task Specialists (wind turbine technicians) + equipment/cargo bags
- **Critical Point**: Usually the wind turbine hoisting site (e.g., CH1A07)

## Architecture

### Frontend Structure
- **`index.html`**: Main application interface with progressive enhancement workflow:
  - **Left sidebar**: Planned route management with drag-and-drop waypoint list
  - **Center area**: Interactive Leaflet.js map centered on Taiwan with waypoint search
  - **Right sidebar**: Flight information input (shown after "Continue with OFP")
  - **Bottom panel**: Comprehensive flight calculations (shown after flight info input)

- **JavaScript Modules** (ES6 module structure):
  - **`js/main.js`**: Application entry point and module coordination
  - **`js/modules/MapManager.js`**: Leaflet map management
  - **`js/modules/WaypointManager.js`**: KML waypoint loading and route management
  - **`js/modules/SearchManager.js`**: Waypoint search functionality
  - **`js/modules/FlightCalculator.js`**: Core flight calculations orchestrator
  - **`js/modules/NavigationCalculator.js`**: Great circle navigation with wind corrections
  - **`js/modules/FuelCalculator.js`**: Comprehensive fuel planning
  - **`js/modules/PerformanceCalculator.js`**: HOGE, DOM, and payload calculations
  - **`js/modules/UIManager.js`**: User interface state management
  - **`js/modules/DragDropManager.js`**: Waypoint reordering functionality
  - **`js/modules/StateManager.js`**: Centralized state management with persistence

### Key Flight Calculations Required

**1. Navigation Calculations**:
- Great circle distance and bearing between waypoints
- Magnetic variation for Taiwan region (-4.6°)
- Wind correction using provided formulas:
  - Wind Correction Angle: `Wind Correction Angle = DEGREES(ASIN(Wind Speed/True Air Speed)*SIN(Wind Direction*PI()/180-Magnetic Course Degree*PI()/180))`
  - Ground Speed: `Ground Speed = IF(Magnetic Course = Wind Direction, TAS - Wind Speed, (Wind Speed*SIN(Wind Direction*PI()/180-Mag Course*PI()/180- Wind Correction Angle *PI()/180))/SIN( Wind Correction Angle *PI()/180))`
- Flight time calculation: `ROUNDUP((Nautical Miles/Ground Speed*60),0)` minutes

**2. Fuel Calculations**:
- **Fixed Components**: Taxi (60kg), Final Reserve (150kg/30min), Extras (80kg)
- **Calculated Components**: Trip fuel (flight_time_minutes * 5kg/min), Contingency (10% of trip fuel)
- **Variable**: Discretion fuel (pilot decision)
- **Total Fuel** = Taxi + Trip + Final Reserve + Contingency + Extras + Discretion
- **Fuel remaining at each waypoint** with critical point analysis
- **Fuel remaining at Critical Point** : Total fuel - Taxi Fuel - Enroute fuel to Critical Point

**3. Performance Calculations**:
- **DOM (Dry Operating Mass)** = Aircraft Empty Weight (3427kg) + PIC + SIC + HOP weights
- **HOGE (Hover Out of Ground Effect)** = RFM-based calculation (placeholder: temperature/altitude adjustments)
- **Available Payload** = HOGE - Fuel at Critical Point - DOM
- **Task Specialist Loading**: 3 specialists + cargo bags validation against available payload

**4. Critical Point Analysis**:
- Automatic detection of wind turbine waypoints (pattern: CH1A07, F1B02, etc.)
- Fuel remaining calculation at critical point
- Performance validation at critical point conditions

### Data Sources

**Waypoints**: 
- `src/Waypoint List Rev4.kml` - KML file containing Taiwan flight waypoints
- Categories: "Wind Turbines" (CH1*, F1*, etc.) and "Flight Point" (RCMQ, Dadu, etc.)

**Aircraft Specifications** (AW169):
- Empty Weight: 3427 kg
- Default Crew Weights: PIC/SIC/HOP: 75-85 kg each
- Fuel Consumption: 5 kg/min
- True Airspeed: 120 kts
- Base HOGE: ~4200-4800 kg (conditions dependent)

### Styling & UI
- **TailwindCSS** with custom CSS variables for dark theme
- **Color Scheme**: Dark background (#15181e) with blue accents (#2563eb)
- **Fonts**: Space Grotesk (primary), Noto Sans (fallback)
- **Responsive Design**: Desktop-first for flight planning workflows
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## Development Workflow

### Project Structure
```
/
├── index.html                 # Main application entry
├── script.js                 # Legacy script (being modularized)
├── css/
│   ├── main.css              # CSS variables and base styles
│   └── components.css        # Component-specific styles
├── js/
│   ├── main.js               # ES6 module entry point
│   ├── config.js             # Application configuration
│   └── modules/              # Modular JavaScript architecture
└── src/
    └── Waypoint List Rev4.kml # Taiwan waypoint data
```

### Development Commands
- **Local Development**: `python -m http.server` or `npx serve`
- **No Build System**: Pure ES6 modules with static files
- **Browser Requirements**: Modern browsers with ES6 module support

## Implementation Priorities

### Phase 1: Core Calculations (MVP for OFP Generation)
1. **Navigation Calculator**: Implement wind correction formulas and route leg calculations
2. **Fuel Calculator**: Complete fuel breakdown with waypoint-by-waypoint tracking
3. **Performance Calculator**: DOM calculation and placeholder HOGE
4. **Integration**: Wire calculations into UI panels

### Phase 2: Enhanced Features
1. **HOGE Implementation**: Replace placeholder with actual AW169 RFM interpolation
2. **Payload Management**: Task specialist loading with weight validation
3. **OFP Generation**: Comprehensive flight plan output matching real OFP format
4. **Critical Point Analysis**: Advanced fuel and performance validation

### Phase 3: Polish & Optimization
1. **State Persistence**: Save/load flight plans
2. **Error Handling**: Comprehensive validation and user feedback
3. **Accessibility**: Enhanced keyboard navigation and screen reader support
4. **Performance**: Optimize calculations and UI responsiveness

## Key Technical Requirements

- **Wind Correction**: Must use exact formulas provided for AW169 operations
- **Fuel Planning**: 5kg/min consumption rate with all regulatory reserves
- **Weight & Balance**: Precise DOM and payload calculations for safety
- **Taiwan Operations**: Magnetic variation -5.01°, RCMQ-based operations
- **Real-time Calculations**: All values update dynamically as inputs change
- **Professional UI**: Match quality and precision of actual flight planning tools

## Before Starting Work
- Always start in plan mode to create a detailed implementation plan
- Write the plan to `.claude/tasks/TASK_NAME.md` with technical specifications
- Create a todo list in `.claude/todos/TO_DO.md` and update progress regularly
- Research any unfamiliar aviation calculations or regulations
- Focus on MVP: generating accurate OFP with core flight calculations
- Get plan approval before implementing

## While Implementing
- Update the plan as work progresses
- Test calculations against known values from the provided OFP example
- Ensure all formulas match exactly with provided specifications
- Maintain modular architecture for easy testing and maintenance
- Document complex aviation calculations with clear comments

## After Work
- Update `.claude/tasks/WORK_LOG.md` with timestamp and detailed summary
- Include any calculation validation performed
- Note any deviations from original plan and reasoning
- Document any aviation-specific knowledge gained during implementation