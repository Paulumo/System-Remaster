/**
 * FuelCalculator - Handles all fuel calculations for helicopter flight planning
 * Manages total fuel requirements, consumption, and remaining fuel tracking
 */

/**
 * Fuel Calculator Class
 * Provides comprehensive fuel calculations for helicopter operations
 */
export class FuelCalculator {
  constructor() {
    // Standard fuel consumption rate (kg/min)
    this.FUEL_CONSUMPTION_RATE = 5;
    
    // Fixed fuel components (kg)
    this.TAXI_FUEL = 60;           // Fixed taxi fuel
    this.FINAL_RESERVE_MINUTES = 30; // Final reserve time
    this.FINAL_RESERVE_FUEL = this.FINAL_RESERVE_MINUTES * this.FUEL_CONSUMPTION_RATE; // 150kg
    this.EXTRAS_FUEL = 80;         // Fixed extras fuel
    
    // Contingency fuel percentage
    this.CONTINGENCY_PERCENTAGE = 0.10; // 10% of trip fuel
  }

  /**
   * Calculate trip fuel based on total flight time
   * @param {number} totalFlightTime - Total flight time in minutes
   * @returns {number} Trip fuel in kg
   */
  calculateTripFuel(totalFlightTime) {
    try {
      if (totalFlightTime < 0) {
        throw new Error('Flight time cannot be negative');
      }
      
      return Math.round(totalFlightTime * this.FUEL_CONSUMPTION_RATE);
      
    } catch (error) {
      console.error('Error calculating trip fuel:', error);
      return 0;
    }
  }

  /**
   * Calculate contingency fuel (10% of trip fuel)
   * @param {number} tripFuel - Trip fuel in kg
   * @returns {number} Contingency fuel in kg
   */
  calculateContingencyFuel(tripFuel) {
    try {
      const contingencyMinutes = (tripFuel / this.FUEL_CONSUMPTION_RATE) * this.CONTINGENCY_PERCENTAGE;
      return Math.round(contingencyMinutes * this.FUEL_CONSUMPTION_RATE);
      
    } catch (error) {
      console.error('Error calculating contingency fuel:', error);
      return 0;
    }
  }

  /**
   * Calculate total fuel requirement
   * @param {number} tripFuel - Trip fuel in kg
   * @param {number} discretionFuel - Discretion fuel in kg (optional)
   * @returns {Object} Complete fuel breakdown
   */
  calculateTotalFuel(tripFuel, discretionFuel = 0) {
    try {
      const contingencyFuel = this.calculateContingencyFuel(tripFuel);
      
      const fuelBreakdown = {
        taxiFuel: this.TAXI_FUEL,
        tripFuel: tripFuel,
        finalReserveFuel: this.FINAL_RESERVE_FUEL,
        contingencyFuel: contingencyFuel,
        extrasFuel: this.EXTRAS_FUEL,
        discretionFuel: discretionFuel
      };
      
      const totalFuel = 
        fuelBreakdown.taxiFuel +
        fuelBreakdown.tripFuel +
        fuelBreakdown.finalReserveFuel +
        fuelBreakdown.contingencyFuel +
        fuelBreakdown.extrasFuel +
        fuelBreakdown.discretionFuel;
      
      const minimumRequiredFuel = totalFuel - discretionFuel;
      
      return {
        breakdown: fuelBreakdown,
        totalFuel: totalFuel,
        minimumRequiredFuel: minimumRequiredFuel,
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating total fuel:', error);
      return {
        breakdown: {
          taxiFuel: this.TAXI_FUEL,
          tripFuel: 0,
          finalReserveFuel: this.FINAL_RESERVE_FUEL,
          contingencyFuel: 0,
          extrasFuel: this.EXTRAS_FUEL,
          discretionFuel: 0
        },
        totalFuel: this.TAXI_FUEL + this.FINAL_RESERVE_FUEL + this.EXTRAS_FUEL,
        minimumRequiredFuel: this.TAXI_FUEL + this.FINAL_RESERVE_FUEL + this.EXTRAS_FUEL,
        error: error.message
      };
    }
  }

  /**
   * Calculate fuel remaining at each waypoint along the route
   * @param {Array} routeLegs - Array of route leg objects with flightTime
   * @param {Object} fuelData - Total fuel breakdown
   * @returns {Array} Array of waypoint fuel data
   */
  calculateWaypointFuelRemaining(routeLegs, fuelData) {
    try {
      if (!Array.isArray(routeLegs) || routeLegs.length === 0) {
        throw new Error('Valid route legs required');
      }

      const waypointFuelData = [];
      
      // Starting fuel after taxi (subtract taxi fuel as it's already burned)
      let currentFuel = fuelData.breakdown.tripFuel + 
                       fuelData.breakdown.finalReserveFuel + 
                       fuelData.breakdown.contingencyFuel;
      
      // Add departure point (after taxi)
      waypointFuelData.push({
        waypoint: routeLegs[0].from,
        fuelRemaining: currentFuel,
        fuelBurned: 0,
        cumulativeTime: 0,
        notes: 'After taxi fuel burn'
      });

      let cumulativeTime = 0;

      // Calculate fuel remaining at each destination waypoint
      routeLegs.forEach((leg, index) => {
        const fuelBurned = leg.flightTime * this.FUEL_CONSUMPTION_RATE;
        currentFuel -= fuelBurned;
        cumulativeTime += leg.flightTime;
        
        waypointFuelData.push({
          waypoint: leg.to,
          fuelRemaining: Math.round(currentFuel),
          fuelBurned: Math.round(fuelBurned),
          cumulativeTime: cumulativeTime,
          legDistance: leg.distance || 0,
          legTime: leg.flightTime,
          notes: index === routeLegs.length - 1 ? 'Arrival (before final reserve)' : 'En route'
        });
      });

      return {
        waypointData: waypointFuelData,
        summary: {
          startingFuel: fuelData.breakdown.tripFuel + 
                       fuelData.breakdown.finalReserveFuel + 
                       fuelData.breakdown.contingencyFuel,
          finalFuelRemaining: waypointFuelData[waypointFuelData.length - 1].fuelRemaining,
          totalFuelBurned: waypointFuelData.reduce((sum, wp) => sum + wp.fuelBurned, 0),
          finalReserveAvailable: fuelData.breakdown.finalReserveFuel
        },
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating waypoint fuel remaining:', error);
      return {
        waypointData: [],
        summary: {
          startingFuel: 0,
          finalFuelRemaining: 0,
          totalFuelBurned: 0,
          finalReserveAvailable: this.FINAL_RESERVE_FUEL
        },
        error: error.message
      };
    }
  }

  /**
   * Find critical point (hoisting site) and calculate fuel remaining there
   * @param {Array} waypointFuelData - Waypoint fuel data array
   * @param {string} criticalWaypointName - Name of critical waypoint (e.g., "CH1A07")
   * @returns {Object} Critical point fuel analysis
   */
  findCriticalPointFuel(waypointFuelData, criticalWaypointName) {
    try {
      if (!Array.isArray(waypointFuelData) || !criticalWaypointName) {
        throw new Error('Valid waypoint data and critical waypoint name required');
      }

      const criticalPoint = waypointFuelData.find(wp => 
        wp.waypoint === criticalWaypointName || 
        wp.waypoint.includes(criticalWaypointName)
      );

      if (!criticalPoint) {
        // If exact match not found, try to find wind turbine waypoint (contains numbers and letters)
        const turbinePattern = /[A-Z]+\d+[A-Z]\d+/; // Pattern like CH1A07
        const turbineWaypoint = waypointFuelData.find(wp => 
          turbinePattern.test(wp.waypoint)
        );

        if (turbineWaypoint) {
          console.log(`Critical waypoint ${criticalWaypointName} not found, using ${turbineWaypoint.waypoint}`);
          return {
            found: true,
            waypoint: turbineWaypoint.waypoint,
            fuelAtCriticalPoint: turbineWaypoint.fuelRemaining,
            timeAtCriticalPoint: turbineWaypoint.cumulativeTime,
            analysis: {
              isTurbineWaypoint: true,
              autoDetected: true,
              fuelStatus: turbineWaypoint.fuelRemaining > 0 ? 'Adequate' : 'Critical'
            }
          };
        }

        return {
          found: false,
          waypoint: criticalWaypointName,
          fuelAtCriticalPoint: 0,
          timeAtCriticalPoint: 0,
          analysis: {
            isTurbineWaypoint: false,
            autoDetected: false,
            fuelStatus: 'Unknown - waypoint not found'
          }
        };
      }

      return {
        found: true,
        waypoint: criticalPoint.waypoint,
        fuelAtCriticalPoint: criticalPoint.fuelRemaining,
        timeAtCriticalPoint: criticalPoint.cumulativeTime,
        analysis: {
          isTurbineWaypoint: /[A-Z]+\d+[A-Z]\d+/.test(criticalPoint.waypoint),
          autoDetected: false,
          fuelStatus: criticalPoint.fuelRemaining > 0 ? 'Adequate' : 'Critical',
          remainingFlightTime: this.calculateRemainingFlightCapability(criticalPoint.fuelRemaining)
        }
      };
      
    } catch (error) {
      console.error('Error finding critical point fuel:', error);
      return {
        found: false,
        waypoint: criticalWaypointName || 'Unknown',
        fuelAtCriticalPoint: 0,
        timeAtCriticalPoint: 0,
        analysis: {
          isTurbineWaypoint: false,
          autoDetected: false,
          fuelStatus: 'Error in calculation'
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate remaining flight capability based on fuel remaining
   * @param {number} fuelRemaining - Fuel remaining in kg
   * @returns {number} Flight time capability in minutes
   */
  calculateRemainingFlightCapability(fuelRemaining) {
    try {
      return Math.floor(fuelRemaining / this.FUEL_CONSUMPTION_RATE);
    } catch (error) {
      console.error('Error calculating remaining flight capability:', error);
      return 0;
    }
  }

  /**
   * Validate fuel calculation inputs
   * @param {number} flightTime - Total flight time in minutes
   * @param {number} discretionFuel - Discretion fuel in kg
   * @returns {Object} Validation result
   */
  validateInputs(flightTime, discretionFuel = 0) {
    const errors = [];
    const warnings = [];

    try {
      // Validate flight time
      if (typeof flightTime !== 'number' || flightTime < 0) {
        errors.push('Flight time must be a positive number');
      } else if (flightTime > 600) { // 10 hours seems excessive for helicopter operations
        warnings.push('Flight time exceeds 10 hours - please verify route');
      }

      // Validate discretion fuel
      if (typeof discretionFuel !== 'number' || discretionFuel < 0) {
        errors.push('Discretion fuel must be a non-negative number');
      } else if (discretionFuel > 500) { // Arbitrary high limit
        warnings.push('Discretion fuel is unusually high');
      }

      return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error: ' + error.message],
        warnings: []
      };
    }
  }

  /**
   * Generate fuel summary report
   * @param {Object} fuelCalculation - Complete fuel calculation result
   * @param {Object} criticalPointData - Critical point analysis
   * @returns {Object} Fuel summary report
   */
  generateFuelSummary(fuelCalculation, criticalPointData) {
    try {
      return {
        totalFuelRequired: fuelCalculation.totalFuel,
        minimumFuelRequired: fuelCalculation.minimumRequiredFuel,
        fuelBreakdown: fuelCalculation.breakdown,
        criticalPoint: {
          waypoint: criticalPointData.waypoint,
          fuelRemaining: criticalPointData.fuelAtCriticalPoint,
          flightTimeRemaining: this.calculateRemainingFlightCapability(criticalPointData.fuelAtCriticalPoint),
          status: criticalPointData.analysis.fuelStatus
        },
        reserves: {
          finalReserve: this.FINAL_RESERVE_FUEL,
          finalReserveMinutes: this.FINAL_RESERVE_MINUTES,
          contingencyFuel: fuelCalculation.breakdown.contingencyFuel
        },
        recommendations: this.generateRecommendations(fuelCalculation, criticalPointData),
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error generating fuel summary:', error);
      return {
        totalFuelRequired: 0,
        minimumFuelRequired: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate fuel recommendations based on calculations
   * @param {Object} fuelCalculation - Fuel calculation data
   * @param {Object} criticalPointData - Critical point data
   * @returns {Array} Array of recommendation strings
   */
  generateRecommendations(fuelCalculation, criticalPointData) {
    const recommendations = [];

    try {
      // Check critical point fuel
      if (criticalPointData.fuelAtCriticalPoint < 100) {
        recommendations.push('⚠️ Low fuel at critical point - consider reducing payload or adding discretion fuel');
      }

      // Check discretion fuel
      if (fuelCalculation.breakdown.discretionFuel === 0) {
        recommendations.push('💡 Consider adding discretion fuel for operational flexibility');
      }

      // Check total fuel vs aircraft capacity (assuming ~1200kg fuel capacity)
      if (fuelCalculation.totalFuel > 1200) {
        recommendations.push('⚠️ Total fuel exceeds typical AW169 capacity - verify fuel requirements');
      }

      // Check flight time vs fuel efficiency
      const totalTime = fuelCalculation.breakdown.tripFuel / this.FUEL_CONSUMPTION_RATE;
      if (totalTime > 240) { // 4 hours
        recommendations.push('💡 Long flight duration - consider fuel stops or route optimization');
      }

      return recommendations;
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return ['Error generating recommendations'];
    }
  }

  /**
   * Get fuel consumption rate
   * @returns {number} Fuel consumption rate in kg/min
   */
  getFuelConsumptionRate() {
    return this.FUEL_CONSUMPTION_RATE;
  }

  /**
   * Get fixed fuel components
   * @returns {Object} Fixed fuel components
   */
  getFixedFuelComponents() {
    return {
      taxiFuel: this.TAXI_FUEL,
      finalReserveFuel: this.FINAL_RESERVE_FUEL,
      finalReserveMinutes: this.FINAL_RESERVE_MINUTES,
      extrasFuel: this.EXTRAS_FUEL,
      contingencyPercentage: this.CONTINGENCY_PERCENTAGE
    };
  }
}