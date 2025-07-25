# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **System Remaster of HST** - a helicopter flight planning and operations management system. The project consists of a web-based interface for flight planning, crew management, and operational flight plan (OFP) generation.

## Architecture

### Frontend Structure
- **`form.html`**: Main application interface with three key sections:
  - Left sidebar: Planned route management with waypoint list (RCMQ, DADU, CH1A07)
  - Center area: Interactive map using Leaflet.js for geographical navigation
  - Right sidebar: Flight information input form (initially hidden, shown after "Continue with OFP")

- **`script.js`**: Core JavaScript functionality handling:
  - Leaflet map initialization centered on Taiwan coordinates (23.973861, 120.982000)
  - Custom map controls (zoom in/out, location services)
  - Flight method selection (VFR, OS, FR)
  - Panel toggling for flight information input

### Key Components

**Map System**:
- Uses Leaflet.js with CartoDB light theme tiles
- Custom zoom controls replace default Leaflet controls
- Geolocation support for current position marking
- Taiwan-focused coordinate system

**Flight Planning Interface**:
- Waypoint management with removable route points
- Flight crew input fields: PIC, SIC, HOP, DISP, CUST
- Flight method selection buttons with active state management
- Helicopter callsign input
- OFP generation workflow

**Styling**: 
- TailwindCSS for responsive design
- Dark theme with blue accent colors (#1a2741, #2563eb)
- Custom fonts: Space Grotesk and Noto Sans

## Development Commands

This project uses static HTML/CSS/JavaScript without a build system. Development can be done by:
- Opening `form.html` directly in a web browser
- Using a local web server for development (e.g., `python -m http.server` or `npx serve`)

## Key Considerations

- The application is focused on helicopter operations and flight planning
- Taiwan-centric mapping coordinates and waypoints
- No backend dependencies - purely client-side application
- Responsive design optimized for desktop flight planning workflows