#!/usr/bin/env python3
"""
Script to remove hardcoded waypoint items from index.html
"""

# Read the HTML file
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the waypoint list section and clean it
new_lines = []
in_waypoint_item = False
waypoint_item_depth = 0

for i, line in enumerate(lines):
    # Check if we're starting a waypoint-item div
    if 'class="waypoint-item' in line:
        in_waypoint_item = True
        waypoint_item_depth = 1
        continue
    
    # If we're inside a waypoint item, count div depth
    if in_waypoint_item:
        # Count opening divs
        waypoint_item_depth += line.count('<div')
        # Count closing divs
        waypoint_item_depth -= line.count('</div>')
        
        # If depth reaches 0, we've closed the waypoint item
        if waypoint_item_depth <= 0:
            in_waypoint_item = False
            waypoint_item_depth = 0
        continue
    
    # If we're not in a waypoint item, keep the line
    new_lines.append(line)

# Write the cleaned content back
with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Removed all hardcoded waypoint items from index.html")