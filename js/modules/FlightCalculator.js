/**
 * FlightCalculator - Handles flight performance calculations
 * Manages fuel calculations, weight and balance, and performance computations
 * Integrates NavigationCalculator, FuelCalculator, and PerformanceCalculator
 */

import { CONFIG } from '../config.js';
import { domCache } from './utils/dom.js';
import { validateCrewWeight, validateWeatherData, validateFuelAmount } from './utils/validation.js';
import { NavigationCalculator } from './NavigationCalculator.js';
import { FuelCalculator } from './FuelCalculator.js';
import { PerformanceCalculator } from './PerformanceCalculator.js';

export class FlightCalculator {
  constructor() {
    // Initialize calculation engines
    this.navigationCalculator = new NavigationCalculator();
    this.fuelCalculator = new FuelCalculator();
    this.performanceCalculator = new PerformanceCalculator();
    
    this.flightData = {
      crew: {
        pic: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
        sic: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
        hop: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT }
      },
      weather: {
        windSpeed: 0,
        windDirection: 0,
        temperature: 25,
        windBenefits: 75
      },
      fuel: {
        taxi: CONFIG.FLIGHT.TAXI_FUEL,
        trip: 0,
        finalReserve: CONFIG.FLIGHT.FINAL_RESERVE_FUEL,
        contingency: 0,
        extras: CONFIG.FLIGHT.EXTRAS_FUEL,
        discretion: 50,
        total: 0
      },
      route: {
        waypoints: [],
        legs: [],
        totalDistance: 0,
        totalFlightTime: 0,
        waypointFuelData: []
      },
      performance: {
        dom: 0,
        hoge: 0,
        payloadAvailable: 0,
        payloadUsed: 0,
        fuelAtCriticalPoint: 0,
        criticalPointAnalysis: {}
      }
    };
    
    // Store last calculation results for debugging
    this.lastCalculationResults = {
      navigation: null,
      fuel: null,
      performance: null,
      timestamp: null
    };
    
    // UI update callback
    this.uiUpdateCallback = null;
    
    this.isInitialized = false;
  }

  /**
   * Initialize flight calculator
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.isInitialized = true;
      console.log('FlightCalculator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FlightCalculator:', error);
      throw error;
    }
  }

  /**
   * Set UI update callback for automatic display updates
   * @param {Function} callback - Function to call when calculations update
   */
  setUIUpdateCallback(callback) {
    this.uiUpdateCallback = callback;
  }

  /**
   * Notify UI to update after calculations
   * @private
   */
  notifyCalculationUpdate() {
    try {
      if (this.uiUpdateCallback && typeof this.uiUpdateCallback === 'function') {
        console.log('🔄 Triggering UI update after calculation');
        this.uiUpdateCallback();
      }
    } catch (error) {
      console.error('Error notifying UI update:', error);
    }
  }

  /**
   * Update crew data
   * @param {Object} crewData - Crew member data
   * @param {string} crewData.role - Crew role (pic, sic, hop)
   * @param {string} crewData.name - Crew member name
   * @param {number} crewData.weight - Crew member weight in kg
   * @returns {Object} Validation result
   */
  updateCrewData(crewData) {
    try {
      const { role, name, weight } = crewData;
      
      if (!['pic', 'sic', 'hop'].includes(role)) {
        throw new Error(`Invalid crew role: ${role}`);
      }
      
      // Validate weight
      const validation = validateCrewWeight(weight, role.toUpperCase());
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.message,
          field: `${role}-weight`
        };
      }
      
      // Update data
      this.flightData.crew[role] = {
        name: name || this.flightData.crew[role].name,
        weight: validation.value
      };
      
      // Recalculate performance
      this.calculatePerformance();
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating crew data:', error);
      return {
        success: false,
        error: 'Failed to update crew data'
      };
    }
  }

  /**
   * Update weather data with real-time recalculation
   * @param {Object} weatherData - Weather data
   * @returns {Object} Validation result
   */
  updateWeatherData(weatherData) {
    try {
      const validation = validateWeatherData(weatherData);
      
      // Check if all validations passed
      const errors = Object.entries(validation)
        .filter(([_, result]) => !result.isValid)
        .map(([field, result]) => ({ field, message: result.message }));
      
      if (errors.length > 0) {
        return {
          success: false,
          errors: errors
        };
      }
      
      // Update weather data with validated values
      Object.entries(validation).forEach(([field, result]) => {
        if (result.isValid && result.value !== null) {
          const weatherField = field.replace(/([A-Z])/g, (match, letter) => 
            letter.toLowerCase()
          );
          this.flightData.weather[weatherField] = result.value;
        }
      });
      
      // Recalculate route with new wind data (if route exists)
      if (this.flightData.route.waypoints.length >= 2) {
        this.updateRouteData(this.flightData.route.waypoints);
      } else {
        // Just recalculate fuel and performance
        this.calculateFuel();
        this.calculatePerformance();
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating weather data:', error);
      return {
        success: false,
        error: 'Failed to update weather data'
      };
    }
  }

  /**
   * Update route data with comprehensive navigation calculations
   * @param {Array} waypoints - Array of waypoint objects {name, lat, lng}
   */
  updateRouteData(waypoints) {
    try {
      this.flightData.route.waypoints = [...waypoints];
      
      if (waypoints.length < 2) {
        // Reset route data if insufficient waypoints
        this.flightData.route.legs = [];
        this.flightData.route.totalDistance = 0;
        this.flightData.route.totalFlightTime = 0;
        this.flightData.route.waypointFuelData = [];
        return;
      }
      
      // Calculate complete route with wind corrections
      const windData = {
        speed: this.flightData.weather.windSpeed,
        direction: this.flightData.weather.windDirection
      };
      
      const routeCalculation = this.navigationCalculator.calculateCompleteRoute(waypoints, windData);
      this.lastCalculationResults.navigation = routeCalculation;
      
      // Update route data
      this.flightData.route.legs = routeCalculation.legs;
      this.flightData.route.totalDistance = routeCalculation.summary.totalDistance; // NM
      this.flightData.route.totalFlightTime = routeCalculation.summary.totalFlightTime; // minutes
      
      // Recalculate fuel and performance based on new route
      this.calculateFuel();
      this.calculatePerformance();
      
      // Trigger UI update after route calculations
      this.notifyCalculationUpdate();
      
      console.log(`Route updated: ${waypoints.length} waypoints, ${routeCalculation.summary.totalDistance.toFixed(1)} NM, ${routeCalculation.summary.totalFlightTime} min`);
      
    } catch (error) {
      console.error('Error updating route data:', error);
    }
  }

  /**
   * Get hoisting time from UI input
   * @returns {number} Hoisting time in minutes
   */
  getHoistingTime() {
    try {
      const hoistingInput = document.getElementById('hoisting-time');
      if (!hoistingInput) {
        return 0;
      }
      
      const hoistingTime = parseInt(hoistingInput.value) || 0;
      return Math.max(0, hoistingTime); // Ensure non-negative, no upper limit
      
    } catch (error) {
      console.error('Error getting hoisting time:', error);
      return 0;
    }
  }

  /**
   * Get critical point from UI dropdown
   * @returns {string} Selected critical point or 'Not identified'
   */
  getCriticalPointFromUI() {
    try {
      const criticalPointSelect = document.getElementById('critical-point');
      if (!criticalPointSelect) {
        return 'Not identified';
      }
      
      const selectedValue = criticalPointSelect.value;
      if (!selectedValue || selectedValue === '') {
        return 'Not identified';
      }
      
      // CRITICAL FIX: Handle both route IDs and original waypoint IDs
      // For route IDs (route_wp_Name_...), extract the waypoint name
      if (selectedValue.startsWith('route_wp_')) {
        const parts = selectedValue.split('_');
        if (parts.length >= 3) {
          return parts[2]; // Return waypoint name from route ID
        }
      }
      
      // For original waypoint IDs (wp_Name_lat_lng_format)
      if (selectedValue.startsWith('wp_')) {
        const parts = selectedValue.split('_');
        if (parts.length >= 2) {
          return parts[1]; // Return just the waypoint name
        }
      }
      
      // If not in expected format, return the selected text from option
      const selectedOption = criticalPointSelect.selectedOptions[0];
      if (selectedOption && selectedOption.textContent) {
        // Extract name from "1. Waypoint Name" format
        const optionText = selectedOption.textContent.trim();
        const match = optionText.match(/^\d+\.\s*(.+)$/);
        if (match) {
          return match[1]; // Return waypoint name without sequence number
        }
        return optionText;
      }
      
      return selectedValue;
      
    } catch (error) {
      console.error('Error getting critical point from UI:', error);
      return 'Not identified';
    }
  }

  /**
   * Find critical waypoint (wind turbine) in the route
   * @private
   * @returns {string} Critical waypoint name or empty string
   */
  findCriticalWaypoint() {
    try {
      const waypoints = this.flightData.route.waypoints;
      
      // Look for wind turbine pattern (e.g., CH1A07, TW1B23, etc.)
      const turbinePattern = /[A-Z]+\d+[A-Z]\d+/;
      
      const criticalWaypoint = waypoints.find(wp => 
        turbinePattern.test(wp.name)
      );
      
      return criticalWaypoint ? criticalWaypoint.name : '';
      
    } catch (error) {
      console.error('Error finding critical waypoint:', error);
      return '';
    }
  }

  /**
   * Calculate task specialist loading
   * @param {Array} taskSpecialists - Array of task specialist data
   * @returns {Object} Loading calculation result
   */
  calculateTaskSpecialistLoading(taskSpecialists = []) {
    try {
      const availablePayload = this.flightData.performance.payloadAvailable;
      
      const loadingResult = this.performanceCalculator.calculateTaskSpecialistLoading(
        taskSpecialists,
        availablePayload
      );
      
      // Update payload used
      this.flightData.performance.payloadUsed = loadingResult.summary.totalSpecialistWeight;
      
      return {
        success: true,
        loading: loadingResult
      };
      
    } catch (error) {
      console.error('Error calculating task specialist loading:', error);
      return {
        success: false,
        error: 'Failed to calculate task specialist loading'
      };
    }
  }

  /**
   * Generate comprehensive flight analysis
   * @returns {Object} Complete flight analysis
   */
  generateComprehensiveAnalysis() {
    try {
      const performanceData = {
        domData: this.lastCalculationResults.performance?.dom,
        hogeData: this.lastCalculationResults.performance?.hoge,
        payloadData: this.lastCalculationResults.performance?.payload,
        specialistData: null, // Will be added when specialists are loaded
        criticalPointData: this.flightData.performance.criticalPointAnalysis
      };
      
      const analysis = this.performanceCalculator.generatePerformanceAnalysis(performanceData);
      
      return {
        success: true,
        analysis: analysis,
        flightData: this.getFlightData(),
        calculations: this.lastCalculationResults
      };
      
    } catch (error) {
      console.error('Error generating comprehensive analysis:', error);
      return {
        success: false,
        error: 'Failed to generate flight analysis'
      };
    }
  }

  /**
   * Calculate comprehensive fuel requirements
   * @returns {Object} Fuel calculation results
   */
  calculateFuel() {
    try {
      const route = this.flightData.route;
      const routeFlightTime = route.totalFlightTime || 0;
      const hoistingTime = this.getHoistingTime();
      const totalFlightTime = routeFlightTime + hoistingTime;
      
      if (routeFlightTime === 0) {
        console.warn('No route data available for fuel calculation');
        return {
          success: false,
          error: 'No route data available'
        };
      }
      
      console.log(`💡 Fuel calculation: Route time ${routeFlightTime} min + Hoisting time ${hoistingTime} min = Total ${totalFlightTime} min`);
      
      // Calculate trip fuel based on actual flight time including hoisting
      const tripFuel = this.fuelCalculator.calculateTripFuel(totalFlightTime);
      
      // Calculate total fuel with all components
      const fuelCalculation = this.fuelCalculator.calculateTotalFuel(tripFuel, this.flightData.fuel.discretion);
      this.lastCalculationResults.fuel = fuelCalculation;
      
      // Update flight data with calculated values
      const breakdown = fuelCalculation.breakdown;
      this.flightData.fuel = {
        taxi: breakdown.taxiFuel,
        trip: breakdown.tripFuel,
        finalReserve: breakdown.finalReserveFuel,
        contingency: breakdown.contingencyFuel,
        extras: breakdown.extrasFuel,
        discretion: breakdown.discretionFuel,
        total: fuelCalculation.totalFuel
      };
      
      // Calculate fuel remaining at each waypoint
      if (route.legs.length > 0) {
        const waypointFuelResult = this.fuelCalculator.calculateWaypointFuelRemaining(route.legs, fuelCalculation);
        this.flightData.route.waypointFuelData = waypointFuelResult.waypointData;
        
        // Find critical point fuel (look for wind turbine waypoint)
        const criticalPointResult = this.fuelCalculator.findCriticalPointFuel(
          waypointFuelResult.waypointData,
          this.findCriticalWaypoint()
        );
        
        this.flightData.performance.fuelAtCriticalPoint = criticalPointResult.fuelAtCriticalPoint;
        this.flightData.performance.criticalPointAnalysis = criticalPointResult;
      }
      
      console.log(`Fuel calculated: Trip ${breakdown.tripFuel}kg, Total ${fuelCalculation.totalFuel}kg`);
      
      return {
        success: true,
        fuel: { ...this.flightData.fuel },
        tripTime: totalFlightTime,
        waypointFuelData: this.flightData.route.waypointFuelData,
        criticalPointFuel: this.flightData.performance.fuelAtCriticalPoint
      };
      
    } catch (error) {
      console.error('Error calculating fuel:', error);
      return {
        success: false,
        error: CONFIG.ERRORS.CALCULATION_ERROR || 'Fuel calculation failed'
      };
    }
  }

  /**
   * Update discretion fuel
   * @param {number} discretionFuel - Discretion fuel amount in kg
   * @returns {Object} Validation result
   */
  updateDiscretionFuel(discretionFuel) {
    try {
      const validation = validateFuelAmount(discretionFuel, 'Discretion fuel');
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.message
        };
      }
      
      this.flightData.fuel.discretion = validation.value;
      
      // Recalculate total fuel
      this.calculateFuel();
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating discretion fuel:', error);
      return {
        success: false,
        error: 'Failed to update discretion fuel'
      };
    }
  }

  /**
   * Calculate comprehensive flight performance (DOM, HOGE, and payload)
   * @returns {Object} Performance calculation results
   */
  calculatePerformance() {
    try {
      const crew = this.flightData.crew;
      const weather = this.flightData.weather;
      const fuelAtCriticalPoint = this.flightData.performance.fuelAtCriticalPoint;
      
      // Calculate DOM (Dry Operating Mass)
      const crewWeights = {
        pic: crew.pic.weight,
        sic: crew.sic.weight,
        hop: crew.hop.weight
      };
      
      const domCalculation = this.performanceCalculator.calculateDOM(crewWeights);
      
      // Calculate HOGE with current conditions
      const hogeCalculation = this.performanceCalculator.calculateHOGE(
        weather.temperature,
        this.performanceCalculator.getAircraftSpecs().pressureAltitude,
        domCalculation.dom + fuelAtCriticalPoint
      );
      
      // Calculate available payload
      const payloadCalculation = this.performanceCalculator.calculateAvailablePayload(
        hogeCalculation.hogeWeight,
        fuelAtCriticalPoint,
        domCalculation.dom
      );
      
      this.lastCalculationResults.performance = {
        dom: domCalculation,
        hoge: hogeCalculation,
        payload: payloadCalculation
      };
      
      // Update performance data
      this.flightData.performance = {
        dom: domCalculation.dom,
        hoge: hogeCalculation.hogeWeight,
        payloadAvailable: payloadCalculation.availablePayload,
        payloadUsed: 0, // Will be updated when task specialists are added
        fuelAtCriticalPoint: fuelAtCriticalPoint,
        criticalPointAnalysis: this.flightData.performance.criticalPointAnalysis,
        // Additional performance data
        totalCrewWeight: domCalculation.totalCrewWeight,
        aircraftEmptyWeight: domCalculation.aircraftEmptyWeight,
        payloadStatus: payloadCalculation.status
      };
      
      console.log(`Performance calculated: DOM ${domCalculation.dom}kg, HOGE ${hogeCalculation.hogeWeight}kg, Payload Available ${payloadCalculation.availablePayload}kg`);
      
      return {
        success: true,
        performance: { ...this.flightData.performance },
        calculations: {
          dom: domCalculation,
          hoge: hogeCalculation,
          payload: payloadCalculation
        }
      };
      
    } catch (error) {
      console.error('Error calculating performance:', error);
      return {
        success: false,
        error: CONFIG.ERRORS.CALCULATION_ERROR || 'Performance calculation failed'
      };
    }
  }

  /**
   * Get all flight data
   * @returns {Object} Complete flight data
   */
  getFlightData() {
    return JSON.parse(JSON.stringify(this.flightData));
  }

  /**
   * Get crew data
   * @returns {Object} Crew data
   */
  getCrewData() {
    return { ...this.flightData.crew };
  }

  /**
   * Get fuel data
   * @returns {Object} Fuel data
   */
  getFuelData() {
    return { ...this.flightData.fuel };
  }

  /**
   * Get performance data
   * @returns {Object} Performance data
   */
  getPerformanceData() {
    return { ...this.flightData.performance };
  }

  /**
   * Get detailed route analysis
   * @returns {Object} Route analysis with legs and fuel data
   */
  getRouteAnalysis() {
    return {
      waypoints: this.flightData.route.waypoints,
      legs: this.flightData.route.legs,
      summary: {
        totalDistance: this.flightData.route.totalDistance,
        totalFlightTime: this.flightData.route.totalFlightTime,
        waypointCount: this.flightData.route.waypoints.length
      },
      fuelData: this.flightData.route.waypointFuelData,
      criticalPoint: this.flightData.performance.criticalPointAnalysis
    };
  }

  /**
   * Get calculation engine instances (for advanced usage)
   * @returns {Object} Calculator instances
   */
  getCalculators() {
    return {
      navigation: this.navigationCalculator,
      fuel: this.fuelCalculator,
      performance: this.performanceCalculator
    };
  }

  /**
   * Get last calculation results (for debugging)
   * @returns {Object} Last calculation results
   */
  getLastCalculationResults() {
    return { ...this.lastCalculationResults };
  }

  /**
   * Get weather data
   * @returns {Object} Weather data
   */
  getWeatherData() {
    return { ...this.flightData.weather };
  }

  /**
   * Get route data
   * @returns {Object} Route data
   */
  getRouteData() {
    return { ...this.flightData.route };
  }

  /**
   * Validate all flight data
   * @returns {Object} Validation results
   */
  validateAllData() {
    const errors = [];
    
    // Validate crew weights
    Object.entries(this.flightData.crew).forEach(([role, data]) => {
      const validation = validateCrewWeight(data.weight, role.toUpperCase());
      if (!validation.isValid) {
        errors.push({
          field: `crew.${role}.weight`,
          message: validation.message
        });
      }
    });
    
    // Validate weather data
    const weatherValidation = validateWeatherData(this.flightData.weather);
    Object.entries(weatherValidation).forEach(([field, result]) => {
      if (!result.isValid) {
        errors.push({
          field: `weather.${field}`,
          message: result.message
        });
      }
    });
    
    // Validate fuel data
    const fuelValidation = validateFuelAmount(this.flightData.fuel.discretion, 'Discretion fuel');
    if (!fuelValidation.isValid) {
      errors.push({
        field: 'fuel.discretion',
        message: fuelValidation.message
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate comprehensive flight summary for OFP
   * @returns {Object} Flight summary data
   */
  generateFlightSummary() {
    const data = this.flightData;
    const hoistingTime = this.getHoistingTime();
    const totalTimeWithHoisting = data.route.totalFlightTime + hoistingTime;
    
    return {
      route: {
        waypointCount: data.route.waypoints.length,
        totalDistance: `${data.route.totalDistance.toFixed(1)} NM`,
        totalFlightTime: `${totalTimeWithHoisting} min`,
        legs: data.route.legs.map(leg => ({
          from: leg.from,
          to: leg.to,
          distance: `${leg.distance} NM`,
          course: `${leg.magneticCourse}°M`,
          time: `${leg.flightTime} min`
        })),
        criticalPoint: this.getCriticalPointFromUI()
      },
      crew: {
        totalWeight: `${data.performance.totalCrewWeight} kg`,
        dom: `${data.performance.dom} kg`,
        members: Object.entries(data.crew)
          .filter(([_, member]) => member.name)
          .map(([role, member]) => `${role.toUpperCase()}: ${member.name} (${member.weight}kg)`)
      },
      fuel: {
        total: `${data.fuel.total} kg`,
        minimumRequired: `${data.fuel.total - data.fuel.discretion} kg`,
        atCriticalPoint: `${data.performance.fuelAtCriticalPoint} kg`,
        breakdown: {
          taxi: `${data.fuel.taxi} kg`,
          trip: `${data.fuel.trip} kg`,
          finalReserve: `${data.fuel.finalReserve} kg`,
          contingency: `${data.fuel.contingency} kg`,
          extras: `${data.fuel.extras} kg`,
          discretion: `${data.fuel.discretion} kg`
        },
        waypointFuel: data.route.waypointFuelData.map(wp => ({
          waypoint: wp.waypoint,
          fuelRemaining: `${wp.fuelRemaining} kg`,
          time: `${wp.cumulativeTime} min`
        }))
      },
      performance: {
        hoge: `${data.performance.hoge} kg`,
        payloadAvailable: `${data.performance.payloadAvailable} kg`,
        payloadUsed: `${data.performance.payloadUsed} kg`,
        aircraftEmptyWeight: `${data.performance.aircraftEmptyWeight} kg`,
        status: data.performance.payloadStatus
      },
      weather: {
        temperature: `${data.weather.temperature}°C`,
        wind: `${data.weather.windSpeed}kts @ ${data.weather.windDirection}°`,
        magneticVariation: `${this.navigationCalculator.getMagneticVariation()}°`,
        benefits: `${data.weather.windBenefits}% wind benefits`
      },
      calculations: {
        navigationMethod: 'Great Circle with Wind Corrections',
        fuelConsumptionRate: `${this.fuelCalculator.getFuelConsumptionRate()} kg/min`,
        trueAirspeed: `${this.navigationCalculator.getTrueAirspeed()} kts`,
        pressureAltitude: `${this.performanceCalculator.getAircraftSpecs().pressureAltitude} ft`
      }
    };
  }

  /**
   * Reset all flight data to defaults
   */
  reset() {
    this.flightData = {
      crew: {
        pic: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
        sic: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT },
        hop: { name: '', weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT }
      },
      weather: {
        windSpeed: 0,
        windDirection: 0,
        temperature: 25,
        windBenefits: 75
      },
      fuel: {
        taxi: CONFIG.FLIGHT.TAXI_FUEL,
        trip: 0,
        finalReserve: CONFIG.FLIGHT.FINAL_RESERVE_FUEL,
        contingency: 0,
        extras: CONFIG.FLIGHT.EXTRAS_FUEL,
        discretion: 50,
        total: 0
      },
      route: {
        waypoints: [],
        legs: [],
        totalDistance: 0,
        totalFlightTime: 0,
        waypointFuelData: []
      },
      performance: {
        dom: 0,
        hoge: 0,
        payloadAvailable: 0,
        payloadUsed: 0,
        fuelAtCriticalPoint: 0,
        criticalPointAnalysis: {}
      }
    };
    
    // Reset calculation results
    this.lastCalculationResults = {
      navigation: null,
      fuel: null,
      performance: null,
      timestamp: null
    };
    
    console.log('Flight calculator reset to defaults');
  }

  /**
   * Check if calculator is initialized
   * @returns {boolean} True if initialized
   */
  isCalculatorInitialized() {
    return this.isInitialized;
  }

  /**
   * Destroy flight calculator and clean up resources
   */
  destroy() {
    this.reset();
    this.isInitialized = false;
    console.log('FlightCalculator destroyed');
  }
}