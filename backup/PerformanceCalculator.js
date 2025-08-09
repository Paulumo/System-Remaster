/**
 * PerformanceCalculator - Handles helicopter performance calculations
 * Manages HOGE calculations, payload analysis, and weight & balance
 */

/**
 * Performance Calculator Class
 * Provides helicopter performance calculations for AW169 operations
 */
export class PerformanceCalculator {
  constructor() {
    // AW169 aircraft specifications
    this.AIRCRAFT_EMPTY_WEIGHT = 3427; // kg
    this.DEFAULT_CREW_WEIGHT = 85; // kg per person
    this.PRESSURE_ALTITUDE = 300; // ft (Taiwan operations)
    
    // Standard crew positions
    this.CREW_POSITIONS = ['pic', 'sic', 'hop'];
    
    // Temperature assumptions (will be user input later)
    this.STANDARD_TEMPERATURE = 25; // Celsius
    
    // HOGE calculation will be implemented with RFM data later
    this.HOGE_PLACEHOLDER = 4200; // kg (placeholder value)
  }

  /**
   * Calculate Dry Operating Mass (DOM)
   * DOM = Aircraft Empty Weight + PIC + SIC + HOP
   * @param {Object} crewWeights - Crew weight data {pic: 85, sic: 85, hop: 85}
   * @returns {Object} DOM calculation result
   */
  calculateDOM(crewWeights = {}) {
    try {
      const crew = {
        pic: crewWeights.pic || this.DEFAULT_CREW_WEIGHT,
        sic: crewWeights.sic || this.DEFAULT_CREW_WEIGHT,
        hop: crewWeights.hop || this.DEFAULT_CREW_WEIGHT
      };

      const totalCrewWeight = crew.pic + crew.sic + crew.hop;
      const dom = this.AIRCRAFT_EMPTY_WEIGHT + totalCrewWeight;

      return {
        aircraftEmptyWeight: this.AIRCRAFT_EMPTY_WEIGHT,
        crewWeights: crew,
        totalCrewWeight: totalCrewWeight,
        dom: dom,
        breakdown: {
          'Aircraft Empty Weight': this.AIRCRAFT_EMPTY_WEIGHT,
          'PIC Weight': crew.pic,
          'SIC Weight': crew.sic,
          'HOP Weight': crew.hop,
          'Total DOM': dom
        },
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating DOM:', error);
      return {
        aircraftEmptyWeight: this.AIRCRAFT_EMPTY_WEIGHT,
        crewWeights: {},
        totalCrewWeight: 0,
        dom: this.AIRCRAFT_EMPTY_WEIGHT,
        error: error.message
      };
    }
  }

  /**
   * Calculate HOGE (Hover Out of Ground Effect) - Placeholder implementation
   * This will be replaced with actual RFM graph calculations
   * @param {number} temperature - Temperature in Celsius
   * @param {number} pressureAltitude - Pressure altitude in feet
   * @param {number} aircraftWeight - Current aircraft weight in kg
   * @returns {Object} HOGE calculation result
   */
  calculateHOGE(temperature = this.STANDARD_TEMPERATURE, pressureAltitude = this.PRESSURE_ALTITUDE, aircraftWeight = 4000) {
    try {
      // PLACEHOLDER IMPLEMENTATION
      // This will be replaced with actual RFM graph interpolation
      
      // For now, using a simplified calculation based on standard conditions
      // Real implementation will use AW169 RFM performance charts
      
      let hogeWeight = this.HOGE_PLACEHOLDER;
      
      // Simple adjustments for temperature and altitude (placeholder logic)
      // Higher temperature reduces performance
      const tempAdjustment = (temperature - 15) * -2; // -2kg per degree above ISA
      
      // Higher altitude reduces performance  
      const altitudeAdjustment = (pressureAltitude / 1000) * -20; // -20kg per 1000ft
      
      hogeWeight = hogeWeight + tempAdjustment + altitudeAdjustment;
      
      // Ensure HOGE is not negative or unrealistic
      hogeWeight = Math.max(hogeWeight, 3000);
      hogeWeight = Math.min(hogeWeight, 5000);

      return {
        hogeWeight: Math.round(hogeWeight),
        conditions: {
          temperature: temperature,
          pressureAltitude: pressureAltitude,
          aircraftWeight: aircraftWeight
        },
        adjustments: {
          temperatureAdjustment: Math.round(tempAdjustment),
          altitudeAdjustment: Math.round(altitudeAdjustment),
          baseHOGE: this.HOGE_PLACEHOLDER
        },
        notes: [
          'PLACEHOLDER CALCULATION - Awaiting RFM implementation',
          'Based on simplified performance model',
          'Real implementation will use AW169 RFM performance charts'
        ],
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating HOGE:', error);
      return {
        hogeWeight: this.HOGE_PLACEHOLDER,
        conditions: {
          temperature: temperature,
          pressureAltitude: pressureAltitude,
          aircraftWeight: aircraftWeight
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate Available Payload
   * Available Payload = HOGE - Fuel at Critical Point - DOM
   * @param {number} hogeWeight - HOGE weight in kg
   * @param {number} fuelAtCriticalPoint - Fuel remaining at critical point in kg
   * @param {number} dom - Dry Operating Mass in kg
   * @returns {Object} Payload calculation result
   */
  calculateAvailablePayload(hogeWeight, fuelAtCriticalPoint, dom) {
    try {
      const availablePayload = hogeWeight - fuelAtCriticalPoint - dom;
      
      return {
        hogeWeight: hogeWeight,
        fuelAtCriticalPoint: fuelAtCriticalPoint,
        dom: dom,
        availablePayload: Math.round(availablePayload),
        breakdown: {
          'HOGE Weight': hogeWeight,
          'Less: Fuel at Critical Point': -fuelAtCriticalPoint,
          'Less: Dry Operating Mass': -dom,
          'Available Payload': Math.round(availablePayload)
        },
        status: this.getPayloadStatus(availablePayload),
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating available payload:', error);
      return {
        hogeWeight: hogeWeight || 0,
        fuelAtCriticalPoint: fuelAtCriticalPoint || 0,
        dom: dom || 0,
        availablePayload: 0,
        error: error.message
      };
    }
  }

  /**
   * Determine payload status based on available payload
   * @param {number} availablePayload - Available payload in kg
   * @returns {Object} Payload status information
   */
  getPayloadStatus(availablePayload) {
    let status, color, message;
    
    if (availablePayload < 100) {
      status = 'Critical';
      color = '#ef4444'; // Red
      message = 'Very low payload capacity - review flight plan';
    } else if (availablePayload < 300) {
      status = 'Limited';
      color = '#f59e0b'; // Orange
      message = 'Limited payload capacity - plan carefully';
    } else if (availablePayload < 600) {
      status = 'Adequate';
      color = '#10b981'; // Green
      message = 'Adequate payload capacity for operations';
    } else {
      status = 'Excellent';
      color = '#06b6d4'; // Cyan
      message = 'Excellent payload capacity';
    }
    
    return { status, color, message };
  }

  /**
   * Calculate task specialist loading
   * @param {Array} taskSpecialists - Array of task specialist data
   * @param {number} availablePayload - Available payload in kg
   * @returns {Object} Task specialist loading analysis
   */
  calculateTaskSpecialistLoading(taskSpecialists = [], availablePayload = 0) {
    try {
      const specialists = taskSpecialists.map((specialist, index) => ({
        id: specialist.id || `ts_${index + 1}`,
        name: specialist.name || `Task Specialist ${index + 1}`,
        weight: specialist.weight || 85,
        cargoWeight: specialist.cargoWeight || 15, // Default cargo bag weight
        totalWeight: (specialist.weight || 85) + (specialist.cargoWeight || 15)
      }));

      const totalSpecialistWeight = specialists.reduce((sum, spec) => sum + spec.totalWeight, 0);
      const remainingPayload = availablePayload - totalSpecialistWeight;

      return {
        specialists: specialists,
        summary: {
          specialistCount: specialists.length,
          totalSpecialistWeight: totalSpecialistWeight,
          availablePayload: availablePayload,
          remainingPayload: remainingPayload,
          canAccommodate: remainingPayload >= 0
        },
        breakdown: {
          'Available Payload': availablePayload,
          'Task Specialists': specialists.length,
          'Total Specialist Weight': totalSpecialistWeight,
          'Remaining Payload': remainingPayload
        },
        status: this.getLoadingStatus(remainingPayload),
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating task specialist loading:', error);
      return {
        specialists: [],
        summary: {
          specialistCount: 0,
          totalSpecialistWeight: 0,
          availablePayload: availablePayload,
          remainingPayload: availablePayload,
          canAccommodate: true
        },
        error: error.message
      };
    }
  }

  /**
   * Get loading status based on remaining payload
   * @param {number} remainingPayload - Remaining payload after loading
   * @returns {Object} Loading status information
   */
  getLoadingStatus(remainingPayload) {
    let status, color, message;
    
    if (remainingPayload < 0) {
      status = 'Overweight';
      color = '#ef4444'; // Red
      message = 'Payload exceeds capacity - reduce load or adjust plan';
    } else if (remainingPayload < 50) {
      status = 'At Limit';
      color = '#f59e0b'; // Orange
      message = 'At payload limit - no additional capacity';
    } else if (remainingPayload < 200) {
      status = 'Good';
      color = '#10b981'; // Green
      message = 'Good loading with some reserve capacity';
    } else {
      status = 'Excellent';
      color = '#06b6d4'; // Cyan
      message = 'Excellent loading with substantial reserve';
    }
    
    return { status, color, message };
  }

  /**
   * Generate comprehensive performance analysis
   * @param {Object} performanceData - All performance calculation data
   * @returns {Object} Complete performance analysis
   */
  generatePerformanceAnalysis(performanceData) {
    try {
      const {
        domData,
        hogeData,
        payloadData,
        specialistData,
        criticalPointData
      } = performanceData;

      return {
        summary: {
          aircraftWeight: domData.dom + (specialistData?.summary.totalSpecialistWeight || 0),
          hogeCapacity: hogeData.hogeWeight,
          payloadCapacity: payloadData.availablePayload,
          payloadUsed: specialistData?.summary.totalSpecialistWeight || 0,
          payloadRemaining: payloadData.availablePayload - (specialistData?.summary.totalSpecialistWeight || 0),
          fuelAtCriticalPoint: criticalPointData?.fuelAtCriticalPoint || 0
        },
        limitations: this.identifyLimitations(performanceData),
        recommendations: this.generatePerformanceRecommendations(performanceData),
        criticalChecks: this.performCriticalChecks(performanceData),
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error generating performance analysis:', error);
      return {
        summary: {},
        limitations: [],
        recommendations: [],
        criticalChecks: [],
        error: error.message
      };
    }
  }

  /**
   * Identify performance limitations
   * @param {Object} performanceData - Performance data
   * @returns {Array} Array of limitation objects
   */
  identifyLimitations(performanceData) {
    const limitations = [];

    try {
      const { hogeData, payloadData, specialistData } = performanceData;

      // HOGE limitation
      if (hogeData.hogeWeight < 4000) {
        limitations.push({
          type: 'HOGE',
          severity: 'High',
          message: 'HOGE performance below optimal - consider conditions',
          value: hogeData.hogeWeight
        });
      }

      // Payload limitation
      if (payloadData.availablePayload < 300) {
        limitations.push({
          type: 'Payload',
          severity: 'Medium',
          message: 'Limited payload capacity available',
          value: payloadData.availablePayload
        });
      }

      // Loading limitation
      if (specialistData && specialistData.summary.remainingPayload < 0) {
        limitations.push({
          type: 'Overweight',
          severity: 'Critical',
          message: 'Planned loading exceeds aircraft capacity',
          value: specialistData.summary.remainingPayload
        });
      }

      return limitations;
      
    } catch (error) {
      console.error('Error identifying limitations:', error);
      return [];
    }
  }

  /**
   * Generate performance recommendations
   * @param {Object} performanceData - Performance data
   * @returns {Array} Array of recommendation strings
   */
  generatePerformanceRecommendations(performanceData) {
    const recommendations = [];

    try {
      const { hogeData, payloadData, specialistData, criticalPointData } = performanceData;

      // HOGE recommendations
      if (hogeData.hogeWeight < 4000) {
        recommendations.push('Consider delaying flight for better atmospheric conditions');
        recommendations.push('Review fuel loading to optimize HOGE performance');
      }

      // Payload recommendations
      if (payloadData.availablePayload < 400) {
        recommendations.push('Consider reducing discretion fuel to increase payload');
        recommendations.push('Evaluate route optimization to reduce fuel requirements');
      }

      // Fuel recommendations
      if (criticalPointData && criticalPointData.fuelAtCriticalPoint < 150) {
        recommendations.push('Review fuel planning - critical point fuel is low');
      }

      // Loading recommendations
      if (specialistData && specialistData.summary.remainingPayload < 50) {
        recommendations.push('Review task specialist equipment to reduce weight');
        recommendations.push('Consider multiple trips if payload is insufficient');
      }

      return recommendations;
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Perform critical safety checks
   * @param {Object} performanceData - Performance data
   * @returns {Array} Array of critical check results
   */
  performCriticalChecks(performanceData) {
    const checks = [];

    try {
      const { domData, hogeData, payloadData, specialistData } = performanceData;

      // Weight & Balance Check
      const totalWeight = domData.dom + (specialistData?.summary.totalSpecialistWeight || 0);
      checks.push({
        check: 'Weight & Balance',
        passed: totalWeight <= hogeData.hogeWeight,
        value: totalWeight,
        limit: hogeData.hogeWeight,
        message: totalWeight <= hogeData.hogeWeight ? 
          'Within limits' : 'Exceeds HOGE capacity'
      });

      // Payload Check
      checks.push({
        check: 'Payload Capacity',
        passed: payloadData.availablePayload >= 0,
        value: payloadData.availablePayload,
        limit: payloadData.availablePayload,
        message: payloadData.availablePayload >= 0 ? 
          'Payload available' : 'No payload capacity'
      });

      // Loading Check
      if (specialistData) {
        checks.push({
          check: 'Task Specialist Loading',
          passed: specialistData.summary.canAccommodate,
          value: specialistData.summary.totalSpecialistWeight,
          limit: payloadData.availablePayload,
          message: specialistData.summary.canAccommodate ? 
            'Can accommodate all specialists' : 'Cannot accommodate all specialists'
        });
      }

      return checks;
      
    } catch (error) {
      console.error('Error performing critical checks:', error);
      return [];
    }
  }

  /**
   * Validate performance calculation inputs
   * @param {Object} inputs - Input parameters
   * @returns {Object} Validation result
   */
  validateInputs(inputs) {
    const errors = [];
    const warnings = [];

    try {
      const { temperature, pressureAltitude, crewWeights, fuelAtCriticalPoint } = inputs;

      // Temperature validation
      if (typeof temperature === 'number') {
        if (temperature < -20 || temperature > 50) {
          warnings.push('Temperature outside normal operating range');
        }
      }

      // Pressure altitude validation
      if (typeof pressureAltitude === 'number') {
        if (pressureAltitude < 0) {
          errors.push('Pressure altitude cannot be negative');
        } else if (pressureAltitude > 10000) {
          warnings.push('High pressure altitude - performance significantly affected');
        }
      }

      // Crew weights validation
      if (crewWeights) {
        Object.entries(crewWeights).forEach(([position, weight]) => {
          if (typeof weight === 'number') {
            if (weight < 50 || weight > 150) {
              warnings.push(`${position.toUpperCase()} weight outside normal range`);
            }
          }
        });
      }

      // Fuel validation
      if (typeof fuelAtCriticalPoint === 'number') {
        if (fuelAtCriticalPoint < 0) {
          errors.push('Fuel at critical point cannot be negative');
        } else if (fuelAtCriticalPoint < 100) {
          warnings.push('Very low fuel at critical point');
        }
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
   * Get aircraft specifications
   * @returns {Object} Aircraft specifications
   */
  getAircraftSpecs() {
    return {
      emptyWeight: this.AIRCRAFT_EMPTY_WEIGHT,
      defaultCrewWeight: this.DEFAULT_CREW_WEIGHT,
      pressureAltitude: this.PRESSURE_ALTITUDE,
      standardTemperature: this.STANDARD_TEMPERATURE,
      crewPositions: this.CREW_POSITIONS
    };
  }
}