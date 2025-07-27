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
   * Calculate fuel at critical point using direct formula
   * Formula: Total Fuel - Taxi Fuel - (Cumulative Flight Time to Critical Point * 5kg/min)
   * @param {Array} routeLegs - Array of route leg objects with flightTime
   * @param {Object} fuelData - Total fuel breakdown
   * @param {string} criticalWaypointName - Name of critical waypoint
   * @returns {Object} Critical point fuel calculation result
   */
  calculateFuelAtCriticalPointDirect(routeLegs, fuelData, criticalWaypointName) {
    try {
      if (!Array.isArray(routeLegs) || routeLegs.length === 0) {
        throw new Error('Valid route legs required');
      }
      
      if (!criticalWaypointName || criticalWaypointName === 'Not identified') {
        return {
          found: false,
          waypoint: criticalWaypointName || 'Not identified',
          fuelAtCriticalPoint: 0,
          cumulativeTimeToCP: 0,
          error: 'No critical waypoint selected'
        };
      }

      // Find the critical waypoint in the route
      let criticalWaypointIndex = -1;
      let cumulativeTimeToCP = 0;
      
      // Search for exact match or partial match
      for (let i = 0; i < routeLegs.length; i++) {
        const leg = routeLegs[i];
        if (leg.to === criticalWaypointName || 
            leg.to.includes(criticalWaypointName) ||
            criticalWaypointName.includes(leg.to)) {
          criticalWaypointIndex = i;
          break;
        }
      }
      
      // If not found by name, look for wind turbine pattern
      if (criticalWaypointIndex === -1) {
        const turbinePattern = /[A-Z]+\d+[A-Z]\d+/; // Pattern like CH1A07
        for (let i = 0; i < routeLegs.length; i++) {
          const leg = routeLegs[i];
          if (turbinePattern.test(leg.to)) {
            criticalWaypointIndex = i;
            criticalWaypointName = leg.to; // Update to actual waypoint name
            break;
          }
        }
      }
      
      if (criticalWaypointIndex === -1) {
        return {
          found: false,
          waypoint: criticalWaypointName,
          fuelAtCriticalPoint: 0,
          cumulativeTimeToCP: 0,
          error: 'Critical waypoint not found in route'
        };
      }
      
      // Calculate cumulative flight time to critical point
      for (let i = 0; i <= criticalWaypointIndex; i++) {
        cumulativeTimeToCP += routeLegs[i].flightTime;
      }
      
      // Apply the direct formula: Total Fuel - Taxi Fuel - (Cumulative Time * 5kg/min)
      const fuelAtCriticalPoint = fuelData.totalFuel - 
                                  fuelData.breakdown.taxiFuel - 
                                  (cumulativeTimeToCP * this.FUEL_CONSUMPTION_RATE);
      
      return {
        found: true,
        waypoint: criticalWaypointName,
        fuelAtCriticalPoint: Math.round(fuelAtCriticalPoint),
        cumulativeTimeToCP: cumulativeTimeToCP,
        waypointIndex: criticalWaypointIndex,
        calculationMethod: 'Direct formula',
        formula: `${fuelData.totalFuel} - ${fuelData.breakdown.taxiFuel} - (${cumulativeTimeToCP} * ${this.FUEL_CONSUMPTION_RATE})`,
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating fuel at critical point (direct):', error);
      return {
        found: false,
        waypoint: criticalWaypointName || 'Unknown',
        fuelAtCriticalPoint: 0,
        cumulativeTimeToCP: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate fuel remaining at each waypoint along the route with hoisting support
   * @param {Array} routeLegs - Array of route leg objects with flightTime
   * @param {Object} fuelData - Total fuel breakdown
   * @param {string} criticalWaypointName - Name of critical waypoint for hoisting calculations
   * @param {number} hoistingTime - Hoisting time in minutes (default: 0)
   * @returns {Array} Array of waypoint fuel data with hoisting breakdown
   */
  calculateWaypointFuelRemainingWithHoisting(routeLegs, fuelData, criticalWaypointName = '', hoistingTime = 0) {
    try {
      if (!Array.isArray(routeLegs) || routeLegs.length === 0) {
        throw new Error('Valid route legs required');
      }

      const waypointFuelData = [];
      
      // Find critical waypoint index
      let criticalWaypointIndex = -1;
      if (criticalWaypointName) {
        for (let i = 0; i < routeLegs.length; i++) {
          const leg = routeLegs[i];
          if (leg.to === criticalWaypointName || 
              leg.to.includes(criticalWaypointName) ||
              criticalWaypointName.includes(leg.to)) {
            criticalWaypointIndex = i;
            break;
          }
        }
        
        // If not found by name, look for wind turbine pattern
        if (criticalWaypointIndex === -1) {
          const turbinePattern = /[A-Z]+\d+[A-Z]\d+/; // Pattern like CH1A07
          for (let i = 0; i < routeLegs.length; i++) {
            const leg = routeLegs[i];
            if (turbinePattern.test(leg.to)) {
              criticalWaypointIndex = i;
              criticalWaypointName = leg.to; // Update to actual waypoint name
              break;
            }
          }
        }
      }
      
      // Starting fuel after taxi
      let currentFuel = fuelData.totalFuel - fuelData.breakdown.taxiFuel;
      
      // Add departure point (after taxi)
      waypointFuelData.push({
        waypoint: routeLegs[0].from,
        fuelRemaining: currentFuel,
        fuelBurned: fuelData.breakdown.taxiFuel,
        cumulativeTime: 0,
        notes: 'Departure (after taxi fuel burn)'
      });

      let cumulativeTime = 0;

      // Calculate fuel remaining at each destination waypoint
      routeLegs.forEach((leg, index) => {
        const fuelBurned = leg.flightTime * this.FUEL_CONSUMPTION_RATE;
        currentFuel -= fuelBurned;
        cumulativeTime += leg.flightTime;
        
        let notes = 'En route';
        let fuelRemainingDisplay = Math.round(currentFuel);
        
        // Check if this is the critical waypoint
        if (index === criticalWaypointIndex && hoistingTime > 0) {
          const hoistingFuelBurn = hoistingTime * this.FUEL_CONSUMPTION_RATE;
          const fuelAfterHoisting = currentFuel - hoistingFuelBurn;
          
          // Add waypoint arrival entry (before hoisting)
          waypointFuelData.push({
            waypoint: leg.to,
            fuelRemaining: Math.round(currentFuel),
            fuelBurned: Math.round(fuelBurned),
            cumulativeTime: cumulativeTime,
            legDistance: leg.distance || 0,
            legTime: leg.flightTime,
            notes: 'Critical Point (arrival - before hoisting)',
            isCriticalPoint: true,
            hoistingPhase: 'arrival'
          });
          
          // Add hoisting operation entry
          waypointFuelData.push({
            waypoint: `${leg.to} (Hoisting)`,
            fuelRemaining: Math.round(fuelAfterHoisting),
            fuelBurned: Math.round(hoistingFuelBurn),
            cumulativeTime: cumulativeTime + hoistingTime,
            legDistance: 0,
            legTime: hoistingTime,
            notes: `Hoisting operation (${hoistingTime} min burn)`,
            isCriticalPoint: true,
            hoistingPhase: 'operation'
          });
          
          // Update current fuel for subsequent legs
          currentFuel = fuelAfterHoisting;
          cumulativeTime += hoistingTime;
          return; // Skip the normal waypoint entry since we added custom entries
        }
        
        // Determine final waypoint notes
        if (index === routeLegs.length - 1) {
          notes = 'Arrival (before final reserve)';
        }
        
        waypointFuelData.push({
          waypoint: leg.to,
          fuelRemaining: fuelRemainingDisplay,
          fuelBurned: Math.round(fuelBurned),
          cumulativeTime: cumulativeTime,
          legDistance: leg.distance || 0,
          legTime: leg.flightTime,
          notes: notes,
          isCriticalPoint: index === criticalWaypointIndex && hoistingTime === 0
        });
      });

      return {
        waypointData: waypointFuelData,
        summary: {
          totalFuelOnBoard: fuelData.totalFuel,
          startingFuelAfterTaxi: fuelData.totalFuel - fuelData.breakdown.taxiFuel,
          finalFuelRemaining: waypointFuelData[waypointFuelData.length - 1].fuelRemaining,
          totalFuelBurned: waypointFuelData.reduce((sum, wp) => sum + wp.fuelBurned, 0),
          finalReserveAvailable: fuelData.breakdown.finalReserveFuel,
          criticalPointData: criticalWaypointIndex >= 0 ? {
            waypoint: criticalWaypointName,
            index: criticalWaypointIndex,
            hoistingTime: hoistingTime,
            hoistingFuelBurn: hoistingTime * this.FUEL_CONSUMPTION_RATE
          } : null
        },
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating waypoint fuel remaining with hoisting:', error);
      return {
        waypointData: [],
        summary: {
          totalFuelOnBoard: 0,
          startingFuelAfterTaxi: 0,
          finalFuelRemaining: 0,
          totalFuelBurned: 0,
          finalReserveAvailable: this.FINAL_RESERVE_FUEL,
          criticalPointData: null
        },
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
      
      // Starting fuel after taxi (correct calculation: total fuel minus taxi already burned)
      let currentFuel = fuelData.totalFuel - fuelData.breakdown.taxiFuel;
      
      // Add departure point (after taxi)
      waypointFuelData.push({
        waypoint: routeLegs[0].from,
        fuelRemaining: currentFuel,
        fuelBurned: fuelData.breakdown.taxiFuel, // Show taxi fuel as burned
        cumulativeTime: 0,
        notes: 'Departure (after taxi fuel burn)'
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
          totalFuelOnBoard: fuelData.totalFuel,
          startingFuelAfterTaxi: fuelData.totalFuel - fuelData.breakdown.taxiFuel,
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
          totalFuelOnBoard: 0,
          startingFuelAfterTaxi: 0,
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
   * Uses the direct calculation method for more accurate fuel at critical point
   * Includes hoisting fuel burn calculation
   * @param {Array} routeLegs - Array of route leg objects 
   * @param {Object} fuelData - Total fuel breakdown
   * @param {string} criticalWaypointName - Name of critical waypoint (e.g., "CH1A07")
   * @param {Array} waypointFuelData - Optional: waypoint fuel data for fallback
   * @param {number} hoistingTime - Hoisting time in minutes (default: 0)
   * @returns {Object} Critical point fuel analysis with hoisting calculations
   */
  findCriticalPointFuel(routeLegs, fuelData, criticalWaypointName, waypointFuelData = null, hoistingTime = 0) {
    try {
      // Primary method: Use direct calculation
      const directResult = this.calculateFuelAtCriticalPointDirect(routeLegs, fuelData, criticalWaypointName);
      
      if (directResult.found) {
        // Calculate hoisting fuel burn
        const hoistingFuelBurn = hoistingTime * this.FUEL_CONSUMPTION_RATE;
        const fuelAfterHoisting = directResult.fuelAtCriticalPoint - hoistingFuelBurn;
        
        return {
          found: true,
          waypoint: directResult.waypoint,
          fuelAtCriticalPoint: directResult.fuelAtCriticalPoint,
          timeAtCriticalPoint: directResult.cumulativeTimeToCP,
          calculationMethod: 'Direct formula with hoisting',
          // Enhanced hoisting calculations
          hoisting: {
            hoistingTime: hoistingTime,
            hoistingFuelBurn: Math.round(hoistingFuelBurn),
            fuelAfterHoisting: Math.round(fuelAfterHoisting),
            fuelStatus: fuelAfterHoisting > 0 ? 'Adequate' : 'Critical'
          },
          analysis: {
            isTurbineWaypoint: /[A-Z]+\d+[A-Z]\d+/.test(directResult.waypoint),
            autoDetected: directResult.waypoint !== criticalWaypointName,
            fuelStatus: directResult.fuelAtCriticalPoint > 0 ? 'Adequate' : 'Critical',
            remainingFlightTime: this.calculateRemainingFlightCapability(directResult.fuelAtCriticalPoint),
            formula: directResult.formula,
            // Enhanced analysis with hoisting
            fuelAfterHoistingStatus: fuelAfterHoisting > 0 ? 'Adequate' : 'Critical',
            remainingFlightTimeAfterHoisting: this.calculateRemainingFlightCapability(fuelAfterHoisting),
            hoistingCalculation: `${directResult.fuelAtCriticalPoint} kg - (${hoistingTime} min × ${this.FUEL_CONSUMPTION_RATE} kg/min) = ${Math.round(fuelAfterHoisting)} kg`
          },
          directCalculation: directResult
        };
      }
      
      // Fallback method: Use waypoint fuel data if provided
      if (waypointFuelData && Array.isArray(waypointFuelData)) {
        const criticalPoint = waypointFuelData.find(wp => 
          wp.waypoint === criticalWaypointName || 
          wp.waypoint.includes(criticalWaypointName)
        );

        if (!criticalPoint) {
          // If exact match not found, try to find wind turbine waypoint
          const turbinePattern = /[A-Z]+\d+[A-Z]\d+/; // Pattern like CH1A07
          const turbineWaypoint = waypointFuelData.find(wp => 
            turbinePattern.test(wp.waypoint)
          );

          if (turbineWaypoint) {
            console.log(`Critical waypoint ${criticalWaypointName} not found, using ${turbineWaypoint.waypoint}`);
            
            // Calculate hoisting fuel burn for fallback method
            const hoistingFuelBurn = hoistingTime * this.FUEL_CONSUMPTION_RATE;
            const fuelAfterHoisting = turbineWaypoint.fuelRemaining - hoistingFuelBurn;
            
            return {
              found: true,
              waypoint: turbineWaypoint.waypoint,
              fuelAtCriticalPoint: turbineWaypoint.fuelRemaining,
              timeAtCriticalPoint: turbineWaypoint.cumulativeTime,
              calculationMethod: 'Waypoint interpolation (fallback) with hoisting',
              // Enhanced hoisting calculations
              hoisting: {
                hoistingTime: hoistingTime,
                hoistingFuelBurn: Math.round(hoistingFuelBurn),
                fuelAfterHoisting: Math.round(fuelAfterHoisting),
                fuelStatus: fuelAfterHoisting > 0 ? 'Adequate' : 'Critical'
              },
              analysis: {
                isTurbineWaypoint: true,
                autoDetected: true,
                fuelStatus: turbineWaypoint.fuelRemaining > 0 ? 'Adequate' : 'Critical',
                remainingFlightTime: this.calculateRemainingFlightCapability(turbineWaypoint.fuelRemaining),
                // Enhanced analysis with hoisting
                fuelAfterHoistingStatus: fuelAfterHoisting > 0 ? 'Adequate' : 'Critical',
                remainingFlightTimeAfterHoisting: this.calculateRemainingFlightCapability(fuelAfterHoisting),
                hoistingCalculation: `${turbineWaypoint.fuelRemaining} kg - (${hoistingTime} min × ${this.FUEL_CONSUMPTION_RATE} kg/min) = ${Math.round(fuelAfterHoisting)} kg`
              }
            };
          }
        } else {
          // Calculate hoisting fuel burn for exact match
          const hoistingFuelBurn = hoistingTime * this.FUEL_CONSUMPTION_RATE;
          const fuelAfterHoisting = criticalPoint.fuelRemaining - hoistingFuelBurn;
          
          return {
            found: true,
            waypoint: criticalPoint.waypoint,
            fuelAtCriticalPoint: criticalPoint.fuelRemaining,
            timeAtCriticalPoint: criticalPoint.cumulativeTime,
            calculationMethod: 'Waypoint interpolation (fallback) with hoisting',
            // Enhanced hoisting calculations
            hoisting: {
              hoistingTime: hoistingTime,
              hoistingFuelBurn: Math.round(hoistingFuelBurn),
              fuelAfterHoisting: Math.round(fuelAfterHoisting),
              fuelStatus: fuelAfterHoisting > 0 ? 'Adequate' : 'Critical'
            },
            analysis: {
              isTurbineWaypoint: /[A-Z]+\d+[A-Z]\d+/.test(criticalPoint.waypoint),
              autoDetected: false,
              fuelStatus: criticalPoint.fuelRemaining > 0 ? 'Adequate' : 'Critical',
              remainingFlightTime: this.calculateRemainingFlightCapability(criticalPoint.fuelRemaining),
              // Enhanced analysis with hoisting
              fuelAfterHoistingStatus: fuelAfterHoisting > 0 ? 'Adequate' : 'Critical',
              remainingFlightTimeAfterHoisting: this.calculateRemainingFlightCapability(fuelAfterHoisting),
              hoistingCalculation: `${criticalPoint.fuelRemaining} kg - (${hoistingTime} min × ${this.FUEL_CONSUMPTION_RATE} kg/min) = ${Math.round(fuelAfterHoisting)} kg`
            }
          };
        }
      }

      // No critical point found
      return {
        found: false,
        waypoint: criticalWaypointName || 'Unknown',
        fuelAtCriticalPoint: 0,
        timeAtCriticalPoint: 0,
        calculationMethod: 'Not found',
        analysis: {
          isTurbineWaypoint: false,
          autoDetected: false,
          fuelStatus: 'Unknown - waypoint not found in route'
        },
        error: directResult.error || 'Critical waypoint not found'
      };
      
    } catch (error) {
      console.error('Error finding critical point fuel:', error);
      return {
        found: false,
        waypoint: criticalWaypointName || 'Unknown',
        fuelAtCriticalPoint: 0,
        timeAtCriticalPoint: 0,
        calculationMethod: 'Error',
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
      const summary = {
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

      // Add hoisting information if available
      if (criticalPointData.hoisting) {
        summary.hoisting = {
          hoistingTime: criticalPointData.hoisting.hoistingTime,
          hoistingFuelBurn: criticalPointData.hoisting.hoistingFuelBurn,
          fuelAfterHoisting: criticalPointData.hoisting.fuelAfterHoisting,
          fuelStatus: criticalPointData.hoisting.fuelStatus,
          flightTimeRemainingAfterHoisting: this.calculateRemainingFlightCapability(criticalPointData.hoisting.fuelAfterHoisting),
          calculation: criticalPointData.analysis.hoistingCalculation
        };
        
        // Update critical point to show both before and after hoisting
        summary.criticalPoint.fuelAfterHoisting = criticalPointData.hoisting.fuelAfterHoisting;
        summary.criticalPoint.fuelAfterHoistingStatus = criticalPointData.hoisting.fuelStatus;
      }

      return summary;
      
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
      // Check critical point fuel (before hoisting)
      if (criticalPointData.fuelAtCriticalPoint < 100) {
        recommendations.push('⚠️ Low fuel at critical point - consider reducing payload or adding discretion fuel');
      }

      // Enhanced hoisting-specific recommendations
      if (criticalPointData.hoisting) {
        const hoisting = criticalPointData.hoisting;
        
        // Check fuel after hoisting
        if (hoisting.fuelAfterHoisting < 50) {
          recommendations.push('🚨 CRITICAL: Very low fuel after hoisting operation - immediate review required');
        } else if (hoisting.fuelAfterHoisting < 100) {
          recommendations.push('⚠️ Low fuel after hoisting - consider reducing hoisting time or adding discretion fuel');
        }
        
        // Check hoisting time reasonableness
        if (hoisting.hoistingTime > 30) {
          recommendations.push('💡 Extended hoisting time detected - verify operational requirements');
        }
        
        // Check if hoisting fuel burn exceeds 10% of critical point fuel
        const hoistingBurnPercentage = (hoisting.hoistingFuelBurn / criticalPointData.fuelAtCriticalPoint) * 100;
        if (hoistingBurnPercentage > 15) {
          recommendations.push('⚠️ Hoisting operation consumes significant fuel - consider operational efficiency');
        }
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