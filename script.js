document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map
    var map = L.map('map').setView([24.262119465616294, 120.62441809570404], 7.3
    );
    
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

    // Disable default zoom controls since we have custom ones
    map.zoomControl.remove();
  });