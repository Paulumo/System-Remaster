// Global variables
let waypointsData = [];
let waypointMarkers = [];
let searchResults = [];
let waypointCategories = new Set();
let plannedRoute = [];
let map;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the map
  // map = L.map('map').setView([24.262119465616294, 120.62441809570404], 7.6);
  map = L.map('map').setView([23.973861, 120.982000], 7.6);
  
  // Use MapTiler DataViz Light style
  // Since we can't directly access L.maptiler, we'll use a light-themed tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Add custom zoom controls functionality
  document.querySelector('[data-icon="Plus"]').parentElement.addEventListener('click', function() {
    map.zoomIn();
  });

  document.querySelector('[data-icon="Minus"]').parentElement.addEventListener('click', function() {
    map.zoomOut();
  });

  // Add location functionality
  document.querySelector('[data-icon="NavigationArrow"]').parentElement.addEventListener('click', function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        map.setView([lat, lng], 15);
        L.marker([lat, lng]).addTo(map)
          .bindPopup('Your current location')
          .openPopup();
      });
    }
  });

  // Cancel button functionality for waypoint items
  function setupCancelButtons() {
    const cancelButtons = document.querySelectorAll('.waypoint-item .shrink-0 div[data-icon="X"]');
    cancelButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Remove the waypoint item
        const waypointItem = this.closest('.waypoint-item');
        if (waypointItem) {
          waypointItem.remove();
          updateWaypointCounter();
        }
      });
    });
  }

  // Update waypoint counter
  function updateWaypointCounter() {
    const waypointItems = document.querySelectorAll('.waypoint-item');
    const counter = document.getElementById('waypoint-counter');
    const count = waypointItems.length;
    
    counter.innerHTML = `<span class="text-[#a0a9bb] text-sm">${count} waypoint${count !== 1 ? 's' : ''} have been loaded</span>`;
  }

  // Initialize cancel buttons and waypoint counter
  setupCancelButtons();
  updateWaypointCounter();

  // Flight Method button functionality
  const flightMethodButtons = document.querySelectorAll('.mb-6 .flex.gap-2 button');
  flightMethodButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Reset all buttons to inactive state
      flightMethodButtons.forEach(btn => {
        btn.className = 'flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-3 bg-[#2a2f3a] text-white text-sm font-bold leading-normal hover:bg-[#3a3f4a] transition-colors tracking-widest';
      });
      // Set clicked button to active state
      this.className = 'flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-3 bg-[#b1ccff] text-black text-sm font-bold leading-normal hover:bg-[#7b8eb2] transition-colors tracking-widest';
    });
  });

  // Disable default zoom controls since we have custom ones
  map.zoomControl.remove();

  // Show right panel on 'Continue with OFP' click
  document.getElementById('continue-ofp-btn').addEventListener('click', function() {
    document.getElementById('flight-info-panel').classList.remove('hidden');
  });

  // Calculate Panel functionality
  const calculationPanel = document.getElementById('calculation-panel');
  
  // Function to transfer flight info data to calculation panel
  function transferFlightData() {
    const picName = document.querySelector('#flight-info-panel input[placeholder="Enter PIC Name"]').value || 'Enter PIC Name';
    const sicName = document.querySelector('#flight-info-panel input[placeholder="Enter SIC Name"]').value || 'Enter SIC Name';
    const hopName = document.querySelector('#flight-info-panel input[placeholder="Enter HOP Name"]').value || 'Enter HOP Name';
    
    document.getElementById('pic-name-display').textContent = picName;
    document.getElementById('sic-name-display').textContent = sicName;
    document.getElementById('hop-name-display').textContent = hopName;
  }

  // Show calculation section when "Next" button is clicked (the blue button at bottom of flight info panel)
  document.querySelector('#flight-info-panel button[class*="bg-[#2563eb]"]').addEventListener('click', function() {
    transferFlightData();
    calculationPanel.classList.remove('hidden');
    
    // Scroll to the calculation panel smoothly
    setTimeout(() => {
      calculationPanel.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });

  // Function to calculate fuel requirements
  function calculateFuel() {
    // Fixed values
    const taxiFuel = 60; // kg
    const finalReserveFuel = 120; // kg (30 min)
    const extrasFuel = 80; // kg
    
    // Calculated values (mock calculations for now)
    const tripDuration = 45; // minutes - will be calculated from route
    const tripFuel = Math.round(tripDuration * 2.5); // kg - mock fuel consumption rate
    
    // Contingency: 10% of trip fuel
    const contingencyFuel = Math.round(tripFuel * 0.1);
    const contingencyDuration = Math.round(tripDuration * 0.1);
    
    // Discretion fuel (user input)
    const discretionFuel = parseInt(document.getElementById('discretion-fuel').value) || 50;
    
    // Total fuel
    const totalFuel = taxiFuel + tripFuel + finalReserveFuel + contingencyFuel + extrasFuel + discretionFuel;
    
    // Update UI
    document.getElementById('trip-duration').textContent = `${tripDuration} min`;
    document.getElementById('trip-fuel').textContent = `${tripFuel} kg`;
    document.getElementById('contingency-duration').textContent = `${contingencyDuration} min`;
    document.getElementById('contingency-fuel').textContent = `${contingencyFuel} kg`;
    document.getElementById('total-fuel').textContent = `${totalFuel} kg`;
    
    return totalFuel;
  }

  // Recalculate button functionality
  document.getElementById('recalculate-btn').addEventListener('click', function() {
    // Fuel calculations
    calculateFuel();
    
    // Performance calculations
    const hogeValue = document.getElementById('hoge-value');
    const payloadValue = document.getElementById('payload-value');
    
    // Mock calculation - replace with actual logic later
    const totalCrewWeight = (parseInt(document.getElementById('pic-weight').value) || 75) +
                           (parseInt(document.getElementById('sic-weight').value) || 75) +
                           (parseInt(document.getElementById('hop-weight').value) || 75);
    
    hogeValue.textContent = `${2500 - totalCrewWeight} kg`;
    payloadValue.textContent = `${1800 - totalCrewWeight} kg`;
  });

  // Auto-calculate fuel when discretion fuel changes
  document.getElementById('discretion-fuel').addEventListener('input', function() {
    calculateFuel();
  });

  // Generate OFP button functionality
  document.getElementById('generate-ofp-btn').addEventListener('click', function() {
    // Placeholder for OFP generation
    alert('OFP Generation functionality will be implemented here');
  });

  // Load and parse KML file
  loadWaypoints();

  // Initialize search functionality
  initializeSearch();
  
  // Initialize drag and drop for planned route
  initializeDragAndDrop();
});

// Function to load waypoints from KML file
async function loadWaypoints() {
  try {
    const response = await fetch('./src/Waypoint List Rev4.kml');
    const kmlText = await response.text();
    
    // Parse KML using DOMParser
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    
    // Extract placemarks
    const placemarks = kmlDoc.getElementsByTagName('Placemark');
    
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const nameElement = placemark.getElementsByTagName('name')[0];
      const descElement = placemark.getElementsByTagName('description')[0];
      const coordinatesElement = placemark.getElementsByTagName('coordinates')[0];
      
      if (nameElement && coordinatesElement) {
        const name = nameElement.textContent.trim();
        const description = descElement ? descElement.textContent.trim() : '';
        const coordinates = coordinatesElement.textContent.trim();
        
        // Parse coordinates (format: longitude,latitude,altitude)
        const coords = coordinates.split(',');
        if (coords.length >= 2) {
          const lng = parseFloat(coords[0]);
          const lat = parseFloat(coords[1]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // Determine category based on name patterns
            let category = 'Flight Point';
            if (name.match(/^(F1|F2|CH1|CH2|CF|TP|ZN|YL|XD)/)) {
              category = 'Wind Turbines';
            }
            
            waypointCategories.add(category);
            
            waypointsData.push({
              name: name,
              description: description,
              lat: lat,
              lng: lng,
              category: category
            });
          }
        }
      }
    }
    
    console.log(`Loaded ${waypointsData.length} waypoints`);
    console.log('Sample waypoint:', waypointsData[0]);
    updateWaypointCounter();
    displayWaypoints();
    
    // Initialize default waypoints first
    initializeDefaultWaypoints();
    
    // Initialize existing waypoints after data is loaded
    initializeExistingWaypoints();
    
  } catch (error) {
    console.error('Error loading waypoints:', error);
  }
}

// Function to update waypoint counter display
function updateWaypointCounter() {
  const counter = document.getElementById('waypoint-counter');
  const categoryCounts = {};
  
  waypointsData.forEach(waypoint => {
    categoryCounts[waypoint.category] = (categoryCounts[waypoint.category] || 0) + 1;
  });
  
  const categoryText = Object.entries(categoryCounts)
    .map(([category, count]) => `${count} ${category}`)
    .join(', ');
  
  counter.innerHTML = `
    <span class="text-[#a0a9bb] text-sm">
      ${waypointsData.length} waypoints loaded (${categoryText})
    </span>
  `;
}

// Function to display waypoints on map
function displayWaypoints() {
  console.log('Displaying waypoints on map...');
  
  // Clear existing markers
  waypointMarkers.forEach(marker => {
    map.removeLayer(marker);
  });
  waypointMarkers = [];
  
  // Add waypoints to map
  waypointsData.forEach((waypoint, index) => {
    // Choose icon based on category
    const iconPath = waypoint.category === 'Wind Turbines' ? './icon/blue-tag.png' : './icon/black-tag.png';
    
    if (index < 5) {
      console.log(`Adding waypoint ${waypoint.name} at [${waypoint.lat}, ${waypoint.lng}] with icon: ${iconPath}`);
    }
    
    const waypointIcon = L.icon({
      iconUrl: iconPath,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    });
    
    const marker = L.marker([waypoint.lat, waypoint.lng], {
      icon: waypointIcon
    }).addTo(map);
    
    marker.bindPopup(`
      <div class="waypoint-popup">
        <div class="waypoint-name">${waypoint.name}</div>
        <div class="waypoint-category" style="color: #2563eb; font-size: 11px; font-weight: 500; margin-bottom: 4px;">${waypoint.category}</div>
        <div class="waypoint-coords">Lat: ${waypoint.lat.toFixed(6)}</div>
        <div class="waypoint-coords">Lng: ${waypoint.lng.toFixed(6)}</div>
        ${waypoint.description ? `<div class="waypoint-desc">${waypoint.description}</div>` : ''}
        <button class="add-to-route-btn" onclick="addToRoute('${waypoint.name}', ${waypoint.lat}, ${waypoint.lng})">Add to Route</button>
      </div>
    `);
    
    waypointMarkers.push(marker);
  });
  
  console.log(`Added ${waypointMarkers.length} markers to map`);
}

// Function to initialize search functionality
function initializeSearch() {
  const searchInput = document.querySelector('input[placeholder="Search Wind Turbines..."]');
  const searchContainer = searchInput.closest('.absolute');
  
  // Update placeholder text
  searchInput.placeholder = 'Search waypoints...';
  
  // Create search results dropdown
  const resultsDropdown = document.createElement('div');
  resultsDropdown.className = 'search-results-dropdown';
  resultsDropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 16px;
    right: 16px;
    background: #20242d;
    border: 1px solid #2c333f;
    border-radius: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1002;
    display: none;
    margin-top: 4px;
  `;
  
  searchContainer.appendChild(resultsDropdown);
  
  // Search functionality
  let searchTimeout;
  searchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
      resultsDropdown.style.display = 'none';
      return;
    }
    
    searchTimeout = setTimeout(() => {
      performSearch(query, resultsDropdown);
    }, 300);
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchContainer.contains(e.target)) {
      resultsDropdown.style.display = 'none';
    }
  });
}

// Function to perform search
function performSearch(query, resultsDropdown) {
  searchResults = waypointsData.filter(waypoint => 
    waypoint.name.toLowerCase().includes(query) ||
    waypoint.description.toLowerCase().includes(query) ||
    waypoint.category.toLowerCase().includes(query)
  );
  
  displaySearchResults(searchResults, resultsDropdown);
}

// Function to display search results
function displaySearchResults(results, dropdown) {
  if (results.length === 0) {
    dropdown.innerHTML = '<div class="search-no-results">No waypoints found</div>';
    dropdown.style.display = 'block';
    return;
  }
  
  const resultsHtml = results.map((waypoint, index) => `
    <div class="search-result-item" data-index="${index}">
      <div class="search-result-name">${waypoint.name} <span style="color: #2563eb; font-size: 11px; font-weight: 500;">${waypoint.category}</span></div>
      <div class="search-result-coords">${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}</div>
      ${waypoint.description ? `<div class="search-result-desc">${waypoint.description}</div>` : ''}
    </div>
  `).join('');
  
  dropdown.innerHTML = resultsHtml;
  dropdown.style.display = 'block';
  
  // Add click event listeners to search results
  dropdown.querySelectorAll('.search-result-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      const waypoint = results[index];
      selectWaypoint(waypoint.name, waypoint.lat, waypoint.lng);
    });
  });
}

// Function to select waypoint from search
function selectWaypoint(name, lat, lng) {
  // Zoom to waypoint location
  map.setView([lat, lng], 15);
  
  // Find and open the waypoint popup with a small delay to ensure map has updated
  setTimeout(() => {
    const marker = waypointMarkers.find(m => {
      const markerPos = m.getLatLng();
      return Math.abs(markerPos.lat - lat) < 0.0001 && Math.abs(markerPos.lng - lng) < 0.0001;
    });
    
    if (marker) {
      marker.openPopup();
    }
  }, 300);
  
  // Hide search results
  const dropdown = document.querySelector('.search-results-dropdown');
  if (dropdown) {
    dropdown.style.display = 'none';
  }
  
  const searchInput = document.querySelector('input[placeholder="Search waypoints..."]');
  if (searchInput) {
    searchInput.value = '';
  }
}

// Function to add waypoint to route
function addToRoute(name, lat, lng) {
  console.log(`Adding ${name} to route`);
  
  // Find the waypoint in waypointsData to get its category
  const waypointData = waypointsData.find(wp => wp.name === name);
  const category = waypointData ? waypointData.category : 'Flight Point';
  const iconPath = category === 'Wind Turbines' ? './icon/blue-tag.png' : './icon/black-tag.png';
  
  // Add to planned route array
  const routeWaypoint = { name, lat, lng, category };
  plannedRoute.push(routeWaypoint);
  
  // Create new waypoint element
  const waypointElement = document.createElement('div');
  waypointElement.className = 'waypoint-item flex items-center gap-4 bg-[#2a2f3a] mx-4 mb-2 rounded-lg px-4 min-h-14 justify-between';
  waypointElement.dataset.waypointName = name;
  waypointElement.dataset.lat = lat;
  waypointElement.dataset.lng = lng;
  waypointElement.innerHTML = `
    <div class="drag-handle text-[#a0a9bb] mr-2 cursor-grab">
      <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M104,64a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,64Zm8,56h32a8,8,0,0,0,0-16H112a8,8,0,0,0,0,16Zm32,32H112a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm0,40H112a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Z"></path>
      </svg>
    </div>
    <img src="${iconPath}" alt="Tag" class="w-4 h-4 flex-shrink-0" />
    <p class="text-white text-base font-bold leading-normal flex-1 truncate cursor-pointer waypoint-name">${name}</p>
    <div class="shrink-0">
      <div class="text-white flex size-7 items-center justify-center hover:bg-[#3a3f4a] rounded cursor-pointer remove-waypoint" data-waypoint="${name}" data-icon="X" data-size="20px" data-weight="regular">
        <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
        </svg>
      </div>
    </div>
  `;
  
  // Add click handler for remove button
  waypointElement.querySelector('.remove-waypoint').addEventListener('click', function(e) {
    e.stopPropagation();
    // Remove the waypoint item
    waypointElement.remove();
    // Remove from planned route array
    const index = plannedRoute.findIndex(wp => wp.name === name);
    if (index > -1) {
      plannedRoute.splice(index, 1);
    }
    updateWaypointCounter();
    // Update critical point dropdown
    updateCriticalPointDropdown();
    // Update route legs display
    updateRouteLegsDisplay();
  });
  
  // Add click handler for waypoint name to zoom to location
  waypointElement.querySelector('.waypoint-name').addEventListener('click', function(e) {
    e.stopPropagation();
    zoomToWaypoint(name, lat, lng);
  });
  
  // Insert into the waypoints container
  const waypointsContainer = document.getElementById('waypoints-container');
  if (waypointsContainer) {
    waypointsContainer.appendChild(waypointElement);
  } else {
    // Fallback: Insert before the "Continue with OFP" button
    const continueButton = document.getElementById('continue-ofp-btn').parentElement;
    continueButton.parentNode.insertBefore(waypointElement, continueButton);
  }
  
  // Update waypoint counter
  updateWaypointCounter();
  
  // Close the popup
  map.closePopup();
  
  // Update critical point dropdown
  updateCriticalPointDropdown();
  
  // Update route legs display
  updateRouteLegsDisplay();
}

// Function to zoom to waypoint location
function zoomToWaypoint(name, lat, lng) {
  // Zoom to waypoint location
  map.setView([lat, lng], 15);
  
  // Find and open the waypoint popup with a small delay to ensure map has updated
  setTimeout(() => {
    const marker = waypointMarkers.find(m => {
      const markerPos = m.getLatLng();
      return Math.abs(markerPos.lat - lat) < 0.0001 && Math.abs(markerPos.lng - lng) < 0.0001;
    });
    
    if (marker) {
      marker.openPopup();
    }
  }, 300);
}

// Default route configuration - users can modify this as needed
const DEFAULT_ROUTE = [
  { name: 'RCMQ', category: 'Flight Point' },
  { name: 'Dadu', category: 'Flight Point' },
  { name: 'CH1A07', category: 'Wind Turbines' },
  { name: 'Dadu', category: 'Flight Point' },
  { name: 'RCMQ', category: 'Flight Point' }
];

// Function to initialize default waypoints dynamically
function initializeDefaultWaypoints() {
  console.log('Initializing default waypoints...');
  
  DEFAULT_ROUTE.forEach(defaultWaypoint => {
    // Find the waypoint in loaded data
    const waypointData = waypointsData.find(wp => wp.name === defaultWaypoint.name);
    
    if (waypointData) {
      console.log(`Adding default waypoint: ${waypointData.name}`);
      
      // Use the existing addToRoute function to add the waypoint
      addToRoute(waypointData.name, waypointData.lat, waypointData.lng);
    } else {
      console.warn(`Default waypoint '${defaultWaypoint.name}' not found in waypoints data`);
    }
  });
  
  console.log('Default waypoints initialization complete');
  updateCriticalPointDropdown();
  updateRouteLegsDisplay();
}

// Function to initialize existing waypoint remove buttons
function initializeExistingWaypoints() {
  const waypointsContainer = document.getElementById('waypoints-container');
  if (!waypointsContainer) return;
  
  const existingWaypoints = waypointsContainer.querySelectorAll('.waypoint-item');
  
  existingWaypoints.forEach(waypoint => {
    // Skip if this is the "Continue with OFP" button container
    if (waypoint.querySelector('#continue-ofp-btn')) return;
    
    // Add drag handle if it doesn't exist
    if (!waypoint.querySelector('.drag-handle')) {
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle text-[#a0a9bb] mr-2 cursor-grab';
      dragHandle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M104,64a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,64Zm8,56h32a8,8,0,0,0,0-16H112a8,8,0,0,0,0,16Zm32,32H112a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm0,40H112a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Z"></path>
        </svg>
      `;
      waypoint.insertBefore(dragHandle, waypoint.firstChild);
    }
    
    // Add waypoint icon if it doesn't exist
    const waypointParagraph = waypoint.querySelector('p.text-white');
    if (waypointParagraph && !waypoint.querySelector('img')) {
      const waypointName = waypointParagraph.textContent.trim();
      
      // Find waypoint data to determine category
      const waypointData = waypointsData.find(wp => wp.name === waypointName);
      const category = waypointData ? waypointData.category : 'Flight Point';
      const iconPath = category === 'Wind Turbines' ? './icon/blue-tag.png' : './icon/black-tag.png';
      
      // Create and insert icon
      const icon = document.createElement('img');
      icon.src = iconPath;
      icon.alt = category;
      icon.className = 'w-5 h-5 mr-2';
      waypoint.insertBefore(icon, waypointParagraph);
      
      // Make waypoint name clickable and add cursor pointer
      waypointParagraph.classList.add('cursor-pointer', 'waypoint-name');
      
      // Add click functionality if waypoint data exists
      if (waypointData) {
        waypointParagraph.addEventListener('click', function(e) {
          e.stopPropagation();
          zoomToWaypoint(waypointData.name, waypointData.lat, waypointData.lng);
        });
        
        // Store data attributes
        waypoint.dataset.waypointName = waypointData.name;
        waypoint.dataset.lat = waypointData.lat;
        waypoint.dataset.lng = waypointData.lng;
        
        // Add to planned route if not already there
        if (!plannedRoute.find(wp => wp.name === waypointData.name)) {
          plannedRoute.push({
            name: waypointData.name,
            lat: waypointData.lat,
            lng: waypointData.lng,
            category: waypointData.category
          });
        }
      }
    }
    
    const removeButton = waypoint.querySelector('[data-icon="X"]');
    if (removeButton && !removeButton.hasAttribute('data-initialized')) {
      removeButton.setAttribute('data-initialized', 'true');
      removeButton.parentElement.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Remove from planned route array
        const waypointName = waypoint.dataset.waypointName;
        if (waypointName) {
          const index = plannedRoute.findIndex(wp => wp.name === waypointName);
          if (index > -1) {
            plannedRoute.splice(index, 1);
          }
        }
        
        waypoint.remove();
        updateCriticalPointDropdown();
        updateRouteLegsDisplay();
      });
    }
  });
}

// Function to initialize drag and drop functionality
function initializeDragAndDrop() {
  const waypointsContainer = document.getElementById('waypoints-container');
  if (!waypointsContainer) return;
  
  // Make waypoint items draggable
  const makeWaypointsDraggable = () => {
    const waypoints = waypointsContainer.querySelectorAll('.waypoint-item');
    
    waypoints.forEach((waypoint, index) => {
      // Skip if this is the "Continue with OFP" button container
      if (waypoint.querySelector('#continue-ofp-btn')) return;
      
      waypoint.draggable = true;
      waypoint.style.cursor = 'grab';
      
      // Remove existing event listeners to prevent duplicates
      waypoint.removeEventListener('dragstart', handleDragStart);
      waypoint.removeEventListener('dragover', handleDragOver);
      waypoint.removeEventListener('dragleave', handleDragLeave);
      waypoint.removeEventListener('drop', handleDrop);
      waypoint.removeEventListener('dragend', handleDragEnd);
      
      // Add drag event listeners
      waypoint.addEventListener('dragstart', handleDragStart);
      waypoint.addEventListener('dragover', handleDragOver);
      waypoint.addEventListener('dragleave', handleDragLeave);
      waypoint.addEventListener('drop', handleDrop);
      waypoint.addEventListener('dragend', handleDragEnd);
    });
  };
  
  let draggedElement = null;
  
  function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('waypoint-dragging');
    this.style.cursor = 'grabbing';
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback for drop target
    if (this !== draggedElement) {
      this.classList.add('waypoint-drag-over');
    }
  }
  
  function handleDragLeave(e) {
    this.classList.remove('waypoint-drag-over');
  }
  
  function handleDrop(e) {
    e.preventDefault();
    
    if (this !== draggedElement) {
      const allWaypoints = [...routeContainer.querySelectorAll('.flex.items-center.gap-4')]
        .filter(wp => !wp.querySelector('#continue-ofp-btn'));
      const draggedIndex = allWaypoints.indexOf(draggedElement);
      const targetIndex = allWaypoints.indexOf(this);
      
      if (draggedIndex < targetIndex) {
        this.parentNode.insertBefore(draggedElement, this.nextSibling);
      } else {
        this.parentNode.insertBefore(draggedElement, this);
      }
    }
  }
  
  function handleDragEnd(e) {
    // Remove all drag-related classes
    this.classList.remove('waypoint-dragging');
    this.style.cursor = 'grab';
    
    // Remove drag-over class from all waypoints
    const allWaypoints = waypointsContainer.querySelectorAll('.waypoint-item');
    allWaypoints.forEach(wp => wp.classList.remove('waypoint-drag-over'));
    
    // Re-initialize drag and drop after reordering
    setTimeout(() => {
      makeWaypointsDraggable();
      initializeExistingWaypoints();
      updateCriticalPointDropdown();
      updateRouteLegsDisplay();
    }, 100);
  }
  
  // Initial setup
  makeWaypointsDraggable();
  
  // Observer to handle dynamically added waypoints
  const observer = new MutationObserver(() => {
    makeWaypointsDraggable();
  });
  
  observer.observe(waypointsContainer, {
    childList: true,
    subtree: true
  });
}

// Function to update Critical Point dropdown with current planned route waypoints
function updateCriticalPointDropdown() {
  const criticalPointSelect = document.getElementById('critical-point');
  if (!criticalPointSelect) return;
  
  // Clear existing options except the first one
  criticalPointSelect.innerHTML = '<option value="">Select Critical Point</option>';
  
  // Get current waypoints from the planned route
  const currentWaypoints = [];
  const waypointItems = document.querySelectorAll('#waypoints-container .waypoint-item');
  
  waypointItems.forEach(item => {
    const waypointName = item.dataset.waypointName;
    if (waypointName && !currentWaypoints.find(wp => wp.name === waypointName)) {
      currentWaypoints.push({
        name: waypointName,
        lat: item.dataset.lat,
        lng: item.dataset.lng
      });
    }
  });
  
  // Add waypoints to dropdown
  currentWaypoints.forEach(waypoint => {
    const option = document.createElement('option');
    option.value = waypoint.name;
    option.textContent = waypoint.name;
    criticalPointSelect.appendChild(option);
  });
  
  console.log(`Updated critical point dropdown with ${currentWaypoints.length} waypoints`);
}

// Function to display route legs in the OFP summary
function displayRouteLegs() {
  // Check if we have access to FlightCalculator (from the modules)
  if (typeof FlightCalculator === 'undefined') {
    console.warn('FlightCalculator not available, cannot display route legs');
    return;
  }
  
  try {
    // Get current waypoints from the planned route
    const currentWaypoints = [];
    const waypointItems = document.querySelectorAll('#waypoints-container .waypoint-item');
    
    waypointItems.forEach(item => {
      const waypointName = item.dataset.waypointName;
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      
      if (waypointName && !isNaN(lat) && !isNaN(lng)) {
        currentWaypoints.push({
          name: waypointName,
          lat: lat,
          lng: lng
        });
      }
    });
    
    if (currentWaypoints.length < 2) {
      console.log('Need at least 2 waypoints to display route legs');
      return;
    }
    
    // Create a simple navigation calculator for basic route leg display
    const DEG_TO_RAD = Math.PI / 180;
    const RAD_TO_DEG = 180 / Math.PI;
    const EARTH_RADIUS_NM = 3443.89849;
    const MAGNETIC_VARIATION = -5.01; // Taiwan
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const φ1 = lat1 * DEG_TO_RAD;
      const φ2 = lat2 * DEG_TO_RAD;
      const Δφ = (lat2 - lat1) * DEG_TO_RAD;
      const Δλ = (lon2 - lon1) * DEG_TO_RAD;
      
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = EARTH_RADIUS_NM * c;
      
      return Math.round(distance * 10) / 10;
    }
    
    function calculateTrueCourse(lat1, lon1, lat2, lon2) {
      const φ1 = lat1 * DEG_TO_RAD;
      const φ2 = lat2 * DEG_TO_RAD;
      const Δλ = (lon2 - lon1) * DEG_TO_RAD;
      
      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - 
                Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
      
      let bearing = Math.atan2(y, x) * RAD_TO_DEG;
      bearing = (bearing + 360) % 360;
      
      return Math.round(bearing * 10) / 10;
    }
    
    function trueToMagnetic(trueCourse) {
      let magneticCourse = trueCourse + MAGNETIC_VARIATION;
      magneticCourse = (magneticCourse + 360) % 360;
      return Math.round(magneticCourse * 10) / 10;
    }
    
    // Calculate route legs
    const routeLegs = [];
    for (let i = 0; i < currentWaypoints.length - 1; i++) {
      const from = currentWaypoints[i];
      const to = currentWaypoints[i + 1];
      
      const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng);
      const trueCourse = calculateTrueCourse(from.lat, from.lng, to.lat, to.lng);
      const magneticCourse = trueToMagnetic(trueCourse);
      
      routeLegs.push({
        from: from.name,
        to: to.name,
        distance: distance,
        magneticCourse: magneticCourse
      });
    }
    
    console.log('Route legs calculated:', routeLegs);
    
    // You can expand this to display the route legs in the UI
    // For now, we'll just log them to verify the calculations are working
    routeLegs.forEach((leg, index) => {
      console.log(`Leg ${index + 1}: ${leg.from} → ${leg.to} | ${leg.distance} NM | ${leg.magneticCourse}° (no M suffix)`);
    });
    
    return routeLegs;
    
  } catch (error) {
    console.error('Error displaying route legs:', error);
  }
}

// Function to update route leg display when waypoints change
function updateRouteLegsDisplay() {
  const routeLegs = displayRouteLegs();
  // This function will be called whenever waypoints are added/removed/reordered
  // The actual UI display would be implemented here when we know where to show the route legs
}