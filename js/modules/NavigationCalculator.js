/**
 * NavigationCalculator - Handles all navigation calculations for helicopter flight planning
 * Includes great circle navigation, magnetic variation, and wind corrections
 */

/**
 * Navigation Calculator Class
 * Provides comprehensive navigation calculations for helicopter operations
 */
export class NavigationCalculator {
  constructor() {
    // Taiwan region magnetic variation (degrees)
    this.MAGNETIC_VARIATION = +4.7;
    
    // Earth radius in nautical miles
    this.EARTH_RADIUS_NM = 3443.89849;
    
    // Standard true airspeed for AW169 operations (knots)
    this.TRUE_AIRSPEED = 120;
    
    // Conversion factors
    this.DEG_TO_RAD = Math.PI / 180;
    this.RAD_TO_DEG = 180 / Math.PI;
  }

  /**
   * Calculate great circle distance between two points
   * @param {number} lat1 - Latitude of first point (degrees)
   * @param {number} lon1 - Longitude of first point (degrees)
   * @param {number} lat2 - Latitude of second point (degrees)
   * @param {number} lon2 - Longitude of second point (degrees)
   * @returns {number} Distance in nautical miles
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    try {
      // Convert to radians
      const φ1 = lat1 * this.DEG_TO_RAD;
      const φ2 = lat2 * this.DEG_TO_RAD;
      const Δφ = (lat2 - lat1) * this.DEG_TO_RAD;
      const Δλ = (lon2 - lon1) * this.DEG_TO_RAD;

      // Haversine formula
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      // Distance in nautical miles
      const distance = this.EARTH_RADIUS_NM * c;
      
      return Math.round(distance * 10) / 10; // Round to 1 decimal place
      
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 0;
    }
  }

  /**
   * Calculate true course (bearing) between two points
   * @param {number} lat1 - Latitude of first point (degrees)
   * @param {number} lon1 - Longitude of first point (degrees)
   * @param {number} lat2 - Latitude of second point (degrees)
   * @param {number} lon2 - Longitude of second point (degrees)
   * @returns {number} True course in degrees (0-360)
   */
  calculateTrueCourse(lat1, lon1, lat2, lon2) {
    try {
      // Convert to radians
      const φ1 = lat1 * this.DEG_TO_RAD;
      const φ2 = lat2 * this.DEG_TO_RAD;
      const Δλ = (lon2 - lon1) * this.DEG_TO_RAD;

      // Calculate bearing
      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - 
                Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

      let bearing = Math.atan2(y, x) * this.RAD_TO_DEG;
      
      // Normalize to 0-360 degrees
      bearing = (bearing + 360) % 360;
      
      return Math.round(bearing * 10) / 10; // Round to 1 decimal place
      
    } catch (error) {
      console.error('Error calculating true course:', error);
      return 0;
    }
  }

  /**
   * Convert true course to magnetic course using Taiwan magnetic variation
   * @param {number} trueCourse - True course in degrees
   * @returns {number} Magnetic course in degrees (0-360)
   */
  trueToMagnetic(trueCourse) {
    try {
      let magneticCourse = trueCourse + this.MAGNETIC_VARIATION;
      
      // Normalize to 0-360 degrees
      magneticCourse = (magneticCourse + 360) % 360;
      
      return Math.round(magneticCourse * 10) / 10;
      
    } catch (error) {
      console.error('Error converting to magnetic course:', error);
      return trueCourse;
    }
  }

  /**
   * Calculate wind correction angle using provided formula
   * Formula: x = DEGREES(ASIN(Wind Speed/ True Air Speed)*SIN(Wind Direction*PI()/180-Magnetic Course Degree*PI()/180)))
   * @param {number} windSpeed - Wind speed in knots
   * @param {number} windDirection - Wind direction in degrees (from)
   * @param {number} magneticCourse - Magnetic course in degrees
   * @param {number} trueAirSpeed - True airspeed in knots (default: 120)
   * @returns {number} Wind correction angle in degrees
   */
  calculateWindCorrectionAngle(windSpeed, windDirection, magneticCourse, trueAirSpeed = this.TRUE_AIRSPEED) {
    try {
      // Handle zero wind case
      if (windSpeed === 0) {
        return 0;
      }

      // Handle impossible wind speed (greater than TAS)
      if (windSpeed >= trueAirSpeed) {
        console.warn('Wind speed exceeds true airspeed, using maximum correction');
        windSpeed = trueAirSpeed * 0.9; // Limit to 90% of TAS
      }

      // Convert to radians for calculation
      const windDirRad = windDirection * this.DEG_TO_RAD;
      const courseDirRad = magneticCourse * this.DEG_TO_RAD;
      
      // Calculate wind correction angle (formula from user)
      const sinValue = (windSpeed / trueAirSpeed) * Math.sin(windDirRad - courseDirRad);
      
      // Check if sin value is within valid range [-1, 1]
      if (Math.abs(sinValue) > 1) {
        console.warn('Invalid wind correction calculation, wind too strong for course');
        return sinValue > 0 ? 90 : -90; // Maximum correction
      }
      
      const windCorrectionAngle = Math.asin(sinValue) * this.RAD_TO_DEG;
      
      return Math.round(windCorrectionAngle * 10) / 10;
      
    } catch (error) {
      console.error('Error calculating wind correction angle:', error);
      return 0;
    }
  }

  /**
   * Calculate ground speed using provided formula
   * Formula: y = IF(Magnetic Course Degree = Wind Direction, True Air Speed - Wind Speed,
   *            (Wind Speed*(SIN(Wind Direction*PI()/180-Magnetic Course Degree*PI()/180- x *PI()/180))/SIN( x * PI()/180)))
   * @param {number} windSpeed - Wind speed in knots
   * @param {number} windDirection - Wind direction in degrees (from)
   * @param {number} magneticCourse - Magnetic course in degrees
   * @param {number} windCorrectionAngle - Wind correction angle in degrees
   * @param {number} trueAirSpeed - True airspeed in knots (default: 120)
   * @returns {number} Ground speed in knots
   */
  calculateGroundSpeed(windSpeed, windDirection, magneticCourse, windCorrectionAngle, trueAirSpeed = this.TRUE_AIRSPEED) {
    try {
      // Zero-wind case
      if (windSpeed === 0) {
        return trueAirSpeed;
      }

      // Standard wind triangle along-track ground speed
      // beta = angle between wind-from direction and course (degrees)
      const betaRad = (windDirection - magneticCourse) * this.DEG_TO_RAD;
      const wcaRad = windCorrectionAngle * this.DEG_TO_RAD;

      // GS = TAS * cos(WCA) - W * cos(beta)
      const groundSpeed = (trueAirSpeed * Math.cos(wcaRad)) - (windSpeed * Math.cos(betaRad));

      // Ensure GS is at least 1 kt and rounded to 0.1
      return Math.max(Math.round(groundSpeed * 10) / 10, 1);
      
    } catch (error) {
      console.error('Error calculating ground speed:', error);
      return trueAirSpeed; // Fallback to TAS
    }
  }

  /**
   * Calculate flight time based on distance and ground speed
   * @param {number} distance - Distance in nautical miles
   * @param {number} groundSpeed - Ground speed in knots
   * @returns {number} Flight time in minutes (rounded up)
   */
  calculateFlightTime(distance, groundSpeed) {
    try {
      if (groundSpeed <= 0) {
        console.error('Invalid ground speed for flight time calculation');
        return 0;
      }

      // Calculate time in minutes
      const timeMinutes = (distance / groundSpeed) * 60;
      
      // Round up to nearest minute as per formula: ROUNDUP((Nautical Miles/ y*60),0)
      return Math.ceil(timeMinutes);
      
    } catch (error) {
      console.error('Error calculating flight time:', error);
      return 0;
    }
  }

  /**
   * Calculate complete route leg with all navigation parameters
   * @param {Object} fromWaypoint - Starting waypoint {name, lat, lng}
   * @param {Object} toWaypoint - Destination waypoint {name, lat, lng}
   * @param {Object} windData - Wind information {speed, direction}
   * @returns {Object} Complete route leg calculation
   */
  calculateRouteLeg(fromWaypoint, toWaypoint, windData = {speed: 0, direction: 0}) {
    try {
      const { speed: windSpeed = 0, direction: windDirection = 0 } = windData;
      
      // Basic navigation calculations
      const distance = this.calculateDistance(
        fromWaypoint.lat, fromWaypoint.lng,
        toWaypoint.lat, toWaypoint.lng
      );
      
      const trueCourse = this.calculateTrueCourse(
        fromWaypoint.lat, fromWaypoint.lng,
        toWaypoint.lat, toWaypoint.lng
      );
      
      const magneticCourse = this.trueToMagnetic(trueCourse);
      
      // Wind corrections
      const windCorrectionAngle = this.calculateWindCorrectionAngle(
        windSpeed, windDirection, magneticCourse
      );
      
      const groundSpeed = this.calculateGroundSpeed(
        windSpeed, windDirection, magneticCourse, windCorrectionAngle
      );
      
      const flightTime = this.calculateFlightTime(distance, groundSpeed);
      
      return {
        from: fromWaypoint.name,
        to: toWaypoint.name,
        distance: distance, // NM
        trueCourse: trueCourse, // degrees
        magneticCourse: magneticCourse, // degrees (with Taiwan variation)
        windCorrectionAngle: windCorrectionAngle, // degrees
        groundSpeed: groundSpeed, // knots
        flightTime: flightTime, // minutes (rounded up)
        windData: {
          speed: windSpeed,
          direction: windDirection
        },
        // Additional debug data
        calculations: {
          magneticVariation: this.MAGNETIC_VARIATION,
          trueAirSpeed: this.TRUE_AIRSPEED,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Error calculating route leg:', error);
      return {
        from: fromWaypoint.name,
        to: toWaypoint.name,
        distance: 0,
        trueCourse: 0,
        magneticCourse: 0,
        windCorrectionAngle: 0,
        groundSpeed: this.TRUE_AIRSPEED,
        flightTime: 0,
        windData: windData,
        error: error.message
      };
    }
  }

  /**
   * Calculate complete route with all legs
   * @param {Array} waypoints - Array of waypoints {name, lat, lng}
   * @param {Object} windData - Wind information {speed, direction}
   * @returns {Object} Complete route calculation with all legs
   */
  calculateCompleteRoute(waypoints, windData = {speed: 0, direction: 0}) {
    try {
      if (!Array.isArray(waypoints) || waypoints.length < 2) {
        throw new Error('At least 2 waypoints required for route calculation');
      }

      const legs = [];
      let totalDistance = 0;
      let totalFlightTime = 0;

      // Calculate each leg
      for (let i = 0; i < waypoints.length - 1; i++) {
        const leg = this.calculateRouteLeg(waypoints[i], waypoints[i + 1], windData);
        legs.push(leg);
        
        totalDistance += leg.distance;
        totalFlightTime += leg.flightTime;
      }

      return {
        legs: legs,
        summary: {
          totalDistance: Math.round(totalDistance * 10) / 10, // NM
          totalFlightTime: totalFlightTime, // minutes
          averageGroundSpeed: totalDistance > 0 ? 
            Math.round((totalDistance / (totalFlightTime / 60)) * 10) / 10 : 0, // knots
          windData: windData
        },
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating complete route:', error);
      return {
        legs: [],
        summary: {
          totalDistance: 0,
          totalFlightTime: 0,
          averageGroundSpeed: 0,
          windData: windData
        },
        error: error.message
      };
    }
  }

  /**
   * Validate waypoint coordinates
   * @param {Object} waypoint - Waypoint object
   * @returns {boolean} True if valid
   */
  validateWaypoint(waypoint) {
    if (!waypoint || typeof waypoint !== 'object') {
      return false;
    }

    const { name, lat, lng } = waypoint;
    
    return (
      typeof name === 'string' && name.length > 0 &&
      typeof lat === 'number' && lat >= -90 && lat <= 90 &&
      typeof lng === 'number' && lng >= -180 && lng <= 180
    );
  }

  /**
   * Get magnetic variation for Taiwan region
   * @returns {number} Magnetic variation in degrees
   */
  getMagneticVariation() {
    return this.MAGNETIC_VARIATION;
  }

  /**
   * Get standard true airspeed
   * @returns {number} True airspeed in knots
   */
  getTrueAirspeed() {
    return this.TRUE_AIRSPEED;
  }
}