#!/usr/bin/env python3
"""
Magnetic Course Degree Calculator
Calculates the magnetic course degree between two coordinates for helicopter navigation.

Usage: python magn_dgr_cal.py
Input format: hh.hhhh (e.g., 23.9739 for latitude, 120.9820 for longitude)
Magnetic variation: -4.1 degrees (regional setting)
"""

import math

class MagneticCourseCalculator:
    def __init__(self):
        # Regional magnetic variation (degrees)
        self.MAGNETIC_VARIATION = -4.1
        
        # Earth radius in nautical miles  
        self.EARTH_RADIUS_NM = 3443.89849
        
        # Conversion factors
        self.DEG_TO_RAD = math.pi / 180
        self.RAD_TO_DEG = 180 / math.pi
    
    def calculate_true_course(self, lat1, lon1, lat2, lon2):
        """
        Calculate true course (bearing) between two points using great circle navigation
        
        Args:
            lat1 (float): Latitude of starting point (degrees)
            lon1 (float): Longitude of starting point (degrees) 
            lat2 (float): Latitude of destination point (degrees)
            lon2 (float): Longitude of destination point (degrees)
            
        Returns:
            float: True course in degrees (0-360)
        """
        try:
            # Convert to radians
            phi1 = lat1 * self.DEG_TO_RAD
            phi2 = lat2 * self.DEG_TO_RAD
            delta_lambda = (lon2 - lon1) * self.DEG_TO_RAD
            
            # Calculate true course using spherical trigonometry
            y = math.sin(delta_lambda) * math.cos(phi2)
            x = (math.cos(phi1) * math.sin(phi2) - 
                 math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
            
            # Calculate bearing in radians, then convert to degrees
            bearing_rad = math.atan2(y, x)
            bearing_deg = bearing_rad * self.RAD_TO_DEG
            
            # Normalize to 0-360 degrees
            true_course = (bearing_deg + 360) % 360
            
            return round(true_course, 1)
            
        except Exception as e:
            print(f"Error calculating true course: {e}")
            return 0
    
    def calculate_magnetic_course(self, lat1, lon1, lat2, lon2):
        """
        Calculate magnetic course by applying magnetic variation to true course
        
        Args:
            lat1 (float): Latitude of starting point (degrees)
            lon1 (float): Longitude of starting point (degrees) 
            lat2 (float): Latitude of destination point (degrees)
            lon2 (float): Longitude of destination point (degrees)
            
        Returns:
            tuple: (true_course, magnetic_course) in degrees
        """
        # Calculate true course
        true_course = self.calculate_true_course(lat1, lon1, lat2, lon2)
        
        # Apply magnetic variation
        # Magnetic Course = True Course + Magnetic Variation
        magnetic_course = true_course + self.MAGNETIC_VARIATION
        
        # Normalize to 0-360 degrees
        magnetic_course = (magnetic_course + 360) % 360
        
        return true_course, round(magnetic_course, 1)
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate great circle distance between two points
        
        Args:
            lat1 (float): Latitude of starting point (degrees)
            lon1 (float): Longitude of starting point (degrees) 
            lat2 (float): Latitude of destination point (degrees)
            lon2 (float): Longitude of destination point (degrees)
            
        Returns:
            float: Distance in nautical miles
        """
        try:
            # Convert to radians
            phi1 = lat1 * self.DEG_TO_RAD
            phi2 = lat2 * self.DEG_TO_RAD
            delta_phi = (lat2 - lat1) * self.DEG_TO_RAD
            delta_lambda = (lon2 - lon1) * self.DEG_TO_RAD

            # Haversine formula
            a = (math.sin(delta_phi/2) * math.sin(delta_phi/2) +
                 math.cos(phi1) * math.cos(phi2) *
                 math.sin(delta_lambda/2) * math.sin(delta_lambda/2))
            
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

            # Distance in nautical miles
            distance = self.EARTH_RADIUS_NM * c
            
            return round(distance, 1)
            
        except Exception as e:
            print(f"Error calculating distance: {e}")
            return 0

def get_coordinate_input(prompt_text):
    """
    Get coordinate input from user with validation
    
    Args:
        prompt_text (str): Prompt message for user
        
    Returns:
        float: Validated coordinate value
    """
    while True:
        try:
            coord_str = input(prompt_text).strip()
            coord_value = float(coord_str)
            
            # Basic validation for reasonable coordinate ranges
            if abs(coord_value) > 180:
                print("⚠️  Invalid coordinate. Please enter a value between -180 and 180.")
                continue
                
            return coord_value
            
        except ValueError:
            print("⚠️  Invalid format. Please enter coordinates in hh.hhhh format (e.g., 23.9739)")
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            exit(0)

def main():
    """
    Main function for interactive coordinate input and calculation
    """
    print("🧭 Magnetic Course Degree Calculator")
    print("=" * 50)
    print("Calculate magnetic course between two coordinates")
    print(f"Magnetic Variation: {-4.1}° (regional setting)")
    print("Input format: hh.hhhh (e.g., 23.9739)")
    print("=" * 50)
    
    calculator = MagneticCourseCalculator()
    
    try:
        # Get starting point coordinates
        print("\n📍 Starting Point (FROM):")
        lat1 = get_coordinate_input("  Latitude:  ")
        lon1 = get_coordinate_input("  Longitude: ")
        
        # Get destination coordinates  
        print("\n📍 Destination Point (TO):")
        lat2 = get_coordinate_input("  Latitude:  ")
        lon2 = get_coordinate_input("  Longitude: ")
        
        # Calculate courses and distance
        true_course, magnetic_course = calculator.calculate_magnetic_course(lat1, lon1, lat2, lon2)
        distance = calculator.calculate_distance(lat1, lon1, lat2, lon2)
        
        # Display results
        print("\n" + "=" * 50)
        print("📊 CALCULATION RESULTS")
        print("=" * 50)
        print(f"From: {lat1:8.4f}°, {lon1:9.4f}°")
        print(f"To:   {lat2:8.4f}°, {lon2:9.4f}°")
        print("-" * 50)
        print(f"Distance:        {distance:6.1f} NM")
        print(f"True Course:     {true_course:6.1f}°")
        print(f"Magnetic Course: {magnetic_course:6.1f}°")
        print(f"Magnetic Var:    {calculator.MAGNETIC_VARIATION:6.1f}°")
        print("=" * 50)
        
        # Ask if user wants to calculate another route
        print("\n📝 Calculate another route? (y/n): ", end="")
        if input().lower().startswith('y'):
            print("\n")
            main()  # Recursive call for another calculation
        else:
            print("\n👋 Thank you for using Magnetic Course Calculator!")
            
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")

if __name__ == "__main__":
    main()