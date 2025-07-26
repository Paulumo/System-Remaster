/**
 * FlightCalculator - Handles flight performance calculations
 * Manages fuel calculations, weight and balance, and performance computations
 */

import { CONFIG } from '../config.js';
import { domCache } from './utils/dom.js';
import { validateCrewWeight, validateWeatherData, validateFuelAmount } from './utils/validation.js';

export class FlightCalculator {
  constructor() {
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
        totalDistance: 0,
        estimatedTime: 0
      },
      performance: {
        hoge: 0,
        payload: 0,
        totalWeight: 0
      }
    };
    
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
   * Update weather data
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
      
      // Recalculate fuel and performance
      this.calculateFuel();
      this.calculatePerformance();
      
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
   * Update route data
   * @param {Array} waypoints - Array of waypoint objects
   */
  updateRouteData(waypoints) {
    try {
      this.flightData.route.waypoints = [...waypoints];
      
      // Calculate route distance and time
      const { distance, time } = this.calculateRouteMetrics(waypoints);
      this.flightData.route.totalDistance = distance;
      this.flightData.route.estimatedTime = time;
      
      // Recalculate fuel based on new route
      this.calculateFuel();
      this.calculatePerformance();
      
      console.log(`Route updated: ${waypoints.length} waypoints, ${distance.toFixed(1)} km, ${time.toFixed(0)} min`);
      
    } catch (error) {
      console.error('Error updating route data:', error);
    }
  }

  /**
   * Calculate route metrics (distance and time)
   * @private
   * @param {Array} waypoints - Array of waypoints
   * @returns {Object} Distance in km and time in minutes
   */
  calculateRouteMetrics(waypoints) {
    if (waypoints.length < 2) {
      return { distance: 0, time: 0 };
    }
    
    let totalDistance = 0;
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      const distance = this.calculateDistance(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i + 1].lat, waypoints[i + 1].lng
      );
      totalDistance += distance;
    }
    
    // Estimate flight time based on average helicopter speed (120 km/h)
    const averageSpeed = 120; // km/h
    const estimatedTime = (totalDistance / averageSpeed) * 60; // minutes
    
    return {
      distance: totalDistance,
      time: estimatedTime
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @private
   * @param {number} lat1 - First point latitude
   * @param {number} lng1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lng2 - Second point longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @private
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate fuel requirements
   * @returns {Object} Fuel calculation results
   */
  calculateFuel() {
    try {
      const fuel = this.flightData.fuel;
      const route = this.flightData.route;
      const weather = this.flightData.weather;
      
      // Calculate trip fuel based on estimated time
      const tripTime = route.estimatedTime || 45; // Default 45 minutes if no route
      
      // Apply weather benefits (wind benefits affect fuel consumption)
      const weatherFactor = 1 - (weather.windBenefits / 100 * 0.1); // Up to 10% reduction
      const fuelConsumptionRate = CONFIG.FLIGHT.FUEL_CONSUMPTION_RATE * weatherFactor;
      
      fuel.trip = Math.round(tripTime * fuelConsumptionRate);
      
      // Calculate contingency fuel (10% of trip fuel)
      fuel.contingency = Math.round(fuel.trip * CONFIG.FLIGHT.CONTINGENCY_RATE);
      
      // Calculate total fuel
      fuel.total = fuel.taxi + fuel.trip + fuel.finalReserve + 
                  fuel.contingency + fuel.extras + fuel.discretion;
      
      console.log(`Fuel calculated: Trip ${fuel.trip}kg, Total ${fuel.total}kg`);
      
      return {
        success: true,
        fuel: { ...fuel },
        tripTime: tripTime
      };
      
    } catch (error) {
      console.error('Error calculating fuel:', error);
      return {
        success: false,
        error: CONFIG.ERRORS.CALCULATION_ERROR
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
   * Calculate flight performance (HOGE and payload)
   * @returns {Object} Performance calculation results
   */
  calculatePerformance() {
    try {
      const crew = this.flightData.crew;
      const fuel = this.flightData.fuel;
      const weather = this.flightData.weather;
      
      // Calculate total crew weight
      const totalCrewWeight = crew.pic.weight + crew.sic.weight + crew.hop.weight;
      
      // Temperature effect on performance (simplified model)
      const temperatureEffect = 1 - (weather.temperature - 15) * 0.01; // 1% per degree C above 15°C
      const densityAltitudeEffect = Math.max(0.8, temperatureEffect);
      
      // Calculate HOGE (Hover Out of Ground Effect)
      // Base HOGE minus crew weight and fuel, adjusted for density altitude
      const hogeBase = CONFIG.FLIGHT.BASE_HOGE * densityAltitudeEffect;
      const hoge = Math.round(hogeBase - totalCrewWeight - fuel.total);
      
      // Calculate available payload
      // Base payload capacity minus crew weight and fuel
      const payloadBase = CONFIG.FLIGHT.BASE_PAYLOAD * densityAltitudeEffect;
      const payload = Math.round(payloadBase - totalCrewWeight - fuel.total);
      
      // Calculate total aircraft weight
      const emptyWeight = 1500; // kg (example empty weight)
      const totalWeight = emptyWeight + totalCrewWeight + fuel.total;
      
      // Update performance data
      this.flightData.performance = {
        hoge: Math.max(0, hoge),
        payload: Math.max(0, payload),
        totalWeight: totalWeight,
        totalCrewWeight: totalCrewWeight,
        densityAltitudeEffect: densityAltitudeEffect
      };
      
      console.log(`Performance calculated: HOGE ${hoge}kg, Payload ${payload}kg`);
      
      return {
        success: true,
        performance: { ...this.flightData.performance }
      };
      
    } catch (error) {
      console.error('Error calculating performance:', error);
      return {
        success: false,
        error: CONFIG.ERRORS.CALCULATION_ERROR
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
   * Generate flight summary
   * @returns {Object} Flight summary data
   */
  generateFlightSummary() {
    const data = this.flightData;
    
    return {
      route: {
        waypointCount: data.route.waypoints.length,
        totalDistance: `${data.route.totalDistance.toFixed(1)} km`,
        estimatedTime: `${Math.round(data.route.estimatedTime)} min`
      },
      crew: {
        totalWeight: `${data.performance.totalCrewWeight} kg`,
        members: Object.entries(data.crew)
          .filter(([_, member]) => member.name)
          .map(([role, member]) => `${role.toUpperCase()}: ${member.name} (${member.weight}kg)`)
      },
      fuel: {
        total: `${data.fuel.total} kg`,
        breakdown: {
          trip: `${data.fuel.trip} kg`,
          reserves: `${data.fuel.finalReserve + data.fuel.contingency} kg`,
          other: `${data.fuel.taxi + data.fuel.extras + data.fuel.discretion} kg`
        }
      },
      performance: {
        hoge: `${data.performance.hoge} kg`,
        payload: `${data.performance.payload} kg`,
        totalWeight: `${data.performance.totalWeight} kg`
      },
      weather: {
        conditions: `${data.weather.temperature}°C, Wind ${data.weather.windSpeed}kts @ ${data.weather.windDirection}°`,
        benefits: `${data.weather.windBenefits}% wind benefits`
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
        totalDistance: 0,
        estimatedTime: 0
      },
      performance: {
        hoge: 0,
        payload: 0,
        totalWeight: 0
      }
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