import math

def calculate_flight_time():
    # Constants
    magnetic_variation = 0 # degrees
    true_air_speed = 120  # example TAS in knots (you can change or let user input)

    # # User input
    # wind_dir = float(input("Enter wind direction (degrees): "))
    # wind_speed = float(input("Enter wind speed (knots): "))
    # mag_course = float(input("Enter magnetic course (degrees): "))
    # distance_nm = float(input("Enter distance (nautical miles): "))


     # User input
    wind_dir = float(180)
    wind_speed = float(90)
    mag_course = float(86)
    distance_nm = float(37.2)

    # Convert magnetic course to true course
    true_course = mag_course - magnetic_variation

    # Convert degrees to radians
    wind_dir_rad = math.radians(wind_dir)
    true_course_rad = math.radians(true_course)

    # Wind Correction Angle (in degrees)
    try:
        wca_rad = math.asin((wind_speed / true_air_speed) * math.sin(wind_dir_rad - true_course_rad))
        print(round(math.asin((wind_speed / true_air_speed)), 9))
        print(round(math.sin(wind_dir_rad - true_course_rad), 9))
        print(round(math.degrees(wca_rad), 9))

    except ValueError:
        print("Invalid input: wind speed too high relative to TAS.")
        return

    wca_deg = math.degrees(wca_rad)

    # Ground speed calculation
    if round(math.degrees(true_course_rad), 1) == round(wind_dir, 1):
        ground_speed = true_air_speed - wind_speed
    else:
        try:
            ground_speed = (wind_speed * math.sin(wind_dir_rad - true_course_rad - wca_rad)) / math.sin(wca_rad)
        except ZeroDivisionError:
            print("Ground speed calculation failed due to angle conditions.")
            return

    # Flight time in minutes (rounded up)
    if ground_speed <= 0:
        print("Error: Ground speed too low or negative.")
        return
    flight_time = math.ceil((distance_nm / ground_speed) * 60)

    # Output
    print(f"\n✅ Results:")
    print(f"WCA: {wca_deg:.2f}°")
    print(f"Ground Speed : {ground_speed:.2f} knots")
    # print(f"True Air Speed: {true_air_speed:.2f} knots")
    print(f"True Course: {true_course:.2f}°")
    # print(f"Wind Correction Angle: {wca_deg:.2f}°")
    # print(f"Ground Speed: {ground_speed:.2f} knots")
    print(f"Estimated Flight Time: {flight_time} minutes")

# Run the calculator
calculate_flight_time()
