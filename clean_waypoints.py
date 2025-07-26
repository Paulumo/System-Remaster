#!/usr/bin/env python3
"""
Script to remove hardcoded waypoint items from index.html
"""

import re

# Read the HTML file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match waypoint-item divs with their full content
# This pattern matches from <div class="waypoint-item" ... > to its closing </div>
waypoint_pattern = r'<div class="waypoint-item[^>]*>.*?</div>\s*(?=\n|<|$)'

# Remove all waypoint items (both inside and outside waypoint-list)
cleaned_content = re.sub(waypoint_pattern, '', content, flags=re.DOTALL | re.MULTILINE)

# Also clean up any duplicate waypoint items that might be outside the list
# Remove extra empty lines that might result from deletions
cleaned_content = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned_content)

# Write the cleaned content back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(cleaned_content)

print("✅ Removed all hardcoded waypoint items from index.html")