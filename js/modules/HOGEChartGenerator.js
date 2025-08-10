/**
 * HOGEChartGenerator
 * Lightweight helper to reference and open the HOGE performance PDF
 * located at `./HOGE/Figure S5-32 HOGE.pdf`.
 *
 * Note: We intentionally avoid bundling PDF.js here to keep the
 * footprint small. We open the PDF directly and use inline embeds
 * for previews.
 */

export class HOGEChartGenerator {
  /**
   * @param {Object} [options]
   * @param {string} [options.pdfPath]
   */
  constructor(options = {}) {
    this.imagePath = options.imagePath || './src/Figure S5-32 HOGE-1.jpg';
    
    // HOGE OAT line data points (temperature vs gross weight capacity)

    this.HOGE_OAT_LINES = [
      {
        oat: 0,
        points: [
          { alt: 9.2, weight: 33 },
          { alt: 5.6, weight: 38 },
          { alt: 2.0, weight: 43.5 },
          { alt: 1.0, weight: 44.2 },
          { alt: -1.0, weight: 44.7 }
        ]
      },
      {
        oat: 10,
        points: [
          { alt: 8.0, weight: 33 },
          { alt: 5.0, weight: 37 },
          { alt: 1.0, weight: 43.1 },
          { alt: 0.0, weight: 44.0 },
          { alt: -1.0, weight: 44.3 }
        ]
      },
      {
        oat: 20,
        points: [
          { alt: 6.6, weight: 33 },
          { alt: 4.4, weight: 36 },
          { alt: 0.0, weight: 42.5 },
          { alt: -1.0, weight: 43.5 }
        ]
      },
      {
        oat: 30,
        points: [
          { alt: 5.4, weight: 33 },
          { alt: 2.4, weight: 37 },
          { alt: -1.0, weight: 42 }
        ]
      },
      {
        oat: 40,
        points: [
          { alt: 3.48, weight: 33 },
          { alt: 1.2, weight: 36.2 },
          { alt: 0.6, weight: 37 },
          { alt: -1.0, weight: 39.2 }
        ]
      }
    ];
  }

  /**
   * Returns the URL to the HOGE image
   * @returns {string}
   */
  getImageUrl() {
    return this.imagePath;
  }

  /**
   * Opens the performance image in a new tab/window.
   * 
   * @param {Object} params
   * @param {number} [params.temperature]
   * @param {number} [params.altitude]
   * @param {string} [params.filename]
   */
  async openPerformancePDF(params = {}) {
    // Generate enhanced image with overlay first
    try {
      const enhancedImageUrl = await this.generateEnhancedImage();
      const win = window.open(enhancedImageUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = enhancedImageUrl;
      }
    } catch (error) {
      console.error('Failed to generate enhanced image, opening original:', error);
      const url = this.getImageUrl();
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = url;
      }
    }
  }

  /**
   * Builds HTML string for embedding the enhanced image.
   * @param {number} widthPx
   * @param {number} heightPx
   * @returns {string}
   */
  getEmbedHTML(widthPx, heightPx) {
    const safeWidth = Math.max(200, Math.floor(widthPx || 800));
    const safeHeight = Math.max(200, Math.floor(heightPx || 600));
  
    // Generate enhanced image with overlay
    this.generateEnhancedImage().then(enhancedImageUrl => {
      // Update the image src when enhanced version is ready
      const preview = document.getElementById('hoge-preview-popover');
      if (preview) {
        const img = preview.querySelector('img');
        if (img) {
          img.src = enhancedImageUrl;
        }
      }
    }).catch(err => {
      console.warn('Failed to generate enhanced image, using original:', err);
    });
  
    // Return original image initially, will be updated when enhanced image is ready
    const originalUrl = this.getImageUrl();
  
    return `
      <img
        src="${originalUrl}"
        style="width:100%;height:100%;border:0;object-fit:contain;object-position:top left;"
        alt="HOGE Performance Chart"
      />
    `;
  }

  /**
   * Generates an enhanced image by combining the base JPG with red line overlay
   * @returns {Promise<string>} Promise that resolves to the URL of the enhanced image
   */
  async generateEnhancedImage() {
    try {
      // Get current temperature from DOM (default to 25°C if not available)
      const tempInput = document.getElementById('temperature');
      const temperature = tempInput ? parseFloat(tempInput.value) || 25 : 25;
      
      // Fixed altitude for calculations (convert 300ft to thousands)
      const altitude = 0.3; // 300 ft = 0.3 (in thousands of feet)
      
      // Load the base image
      const baseImage = await this.loadBaseImage();
      
      // Create canvas with same dimensions as base image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = baseImage.naturalWidth || baseImage.width;
      canvas.height = baseImage.naturalHeight || baseImage.height;
      
      // Draw the base image
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      
      // Calculate chart dimensions based on image size - MODIFY THESE VALUES TO CHANGE CHART SIZE
      const chartLeft = canvas.width * 0.208; // 20.8% from left - increase to move chart right
      const chartRight = canvas.width * 0.728; // 72.8% from left - increase to make chart wider
      const chartTop = canvas.height * 0.272; // 27.2% from top - increase to move chart down
      const chartBottom = canvas.height * 0.653; // 65.3% from top - increase to make chart taller
      
      const chartWidth = chartRight - chartLeft;
      const chartHeight = chartBottom - chartTop;
      
      // Pressure altitude range mapping (-1 to 15 ft x1000) - Y-axis
      const altMin = -1;
      const altMax = 15;
      const altRange = altMax - altMin;
      
      // Weight range mapping (33 to 49 x100 lbs) - X-axis
      const weightMin = 33;
      const weightMax = 49;
      const weightRange = weightMax - weightMin;
      
      // Calculate positions for 300ft altitude line and temperature intersection
      const altitudeRatio = (altitude - altMin) / altRange;
      const altY = chartBottom - (altitudeRatio * chartHeight);
      
      const weight = this.interpolateWeightAtAltitude(temperature, altitude);
      const weightRatio = (weight - weightMin) / weightRange;
      const weightX = chartLeft + (weightRatio * chartWidth);
      
      // Find intersection point with temperature gradient line for the horizontal line endpoint
      const tempIntersectionX = weightX; // This is where the temperature gradient intersects at 300ft altitude
      
      // Draw chart grid and axes with 100% opacity
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      // ctx.setLineDash([]);
      
      // Draw four corner markers
      const cornerSize = 10;
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(chartLeft - cornerSize, chartTop);
      ctx.lineTo(chartLeft + cornerSize, chartTop);
      ctx.moveTo(chartLeft, chartTop - cornerSize);
      ctx.lineTo(chartLeft, chartTop + cornerSize);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(chartRight - cornerSize, chartTop);
      ctx.lineTo(chartRight + cornerSize, chartTop);
      ctx.moveTo(chartRight, chartTop - cornerSize);
      ctx.lineTo(chartRight, chartTop + cornerSize);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(chartLeft - cornerSize, chartBottom);
      ctx.lineTo(chartLeft + cornerSize, chartBottom);
      ctx.moveTo(chartLeft, chartBottom - cornerSize);
      ctx.lineTo(chartLeft, chartBottom + cornerSize);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(chartRight - cornerSize, chartBottom);
      ctx.lineTo(chartRight + cornerSize, chartBottom);
      ctx.moveTo(chartRight, chartBottom - cornerSize);
      ctx.lineTo(chartRight, chartBottom + cornerSize);
      ctx.stroke();
      
      // Draw grid lines - vertical (weight)
      for (let w = weightMin; w <= weightMax; w += 2) { // Every 2 units (x100 lbs)
        const gridX = chartLeft + ((w - weightMin) / weightRange) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(gridX, chartTop);
        ctx.lineTo(gridX, chartBottom);
        ctx.stroke();
      }
      
      // Draw grid lines - horizontal (pressure altitude)
      for (let a = altMin; a <= altMax; a += 2) { // Every 2 units (x1000 ft)
        const gridY = chartBottom - ((a - altMin) / altRange) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(chartLeft, gridY);
        ctx.lineTo(chartRight, gridY);
        ctx.stroke();
      }
      
      // Draw temperature gradient lines using HOGE_OAT_LINES data
      const tempColors = ['#0066cc', '#0080ff', '#00aaff', '#ff6600', '#ff0000']; // Blue to red gradient
      this.HOGE_OAT_LINES.forEach((tempLine, index) => {
        ctx.strokeStyle = tempColors[index] || '#666666';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        let firstPoint = true;
        tempLine.points.forEach(point => {
          const x = chartLeft + ((point.weight - weightMin) / weightRange) * chartWidth;
          const y = chartBottom - ((point.alt - altMin) / altRange) * chartHeight;
          
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // Add temperature label at the end of each line
        const lastPoint = tempLine.points[tempLine.points.length - 1];
        const labelX = chartLeft + ((lastPoint.weight - weightMin) / weightRange) * chartWidth;
        const labelY = chartBottom - ((lastPoint.alt - altMin) / altRange) * chartHeight;
        
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = tempColors[index] || '#666666';
        ctx.textAlign = 'left';
        ctx.fillText(`${tempLine.oat}°C`, labelX + 5, labelY - 5);
      });
      
      // Reset styles for axis labels
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      
      // Draw X-axis labels (weight)
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.textAlign = 'center';
      for (let w = weightMin; w <= weightMax; w += 2) {
        const labelX = chartLeft + ((w - weightMin) / weightRange) * chartWidth;
        ctx.fillText(`${w}`, labelX, chartBottom + 25);
      }
      
      // Draw Y-axis labels (pressure altitude)
      ctx.textAlign = 'end';
      for (let a = altMin; a <= altMax; a += 2) {
        const labelY = chartBottom - ((a - altMin) / altRange) * chartHeight;
        ctx.fillText(`${a}`, chartLeft - 10, labelY + 5);
      }
      
      // Draw axis titles with 100% opacity
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      
      // X-axis title (Weight)
      // ctx.fillText('Gross Weight (x100 lbs)', (chartLeft + chartRight) / 2, chartBottom + 50);
      
      // Y-axis title (Pressure Altitude)
      ctx.save();
      ctx.translate(chartLeft - 60, (chartTop + chartBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Pressure Altitude (ft x 1000)', 0, 0);
      ctx.restore();
      
      // Draw red overlay lines with 100% opacity for 300ft altitude line
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.setLineDash([]); // Solid line
      
      // Horizontal line at 300ft altitude - stops at temperature intersection
      ctx.beginPath();
      ctx.moveTo(chartLeft, altY);
      ctx.lineTo(tempIntersectionX, altY);
      ctx.stroke();
      
      // Vertical line from intersection to X-axis
      ctx.beginPath();
      ctx.moveTo(weightX, altY);
      ctx.lineTo(weightX, chartBottom);
      ctx.stroke();
      
      // No intersection dot - removed as requested
      
      // Add labels with semi-transparent background
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white background
      
      // Altitude label background (300ft)
      const altText = `300ft`;
      const altMetrics = ctx.measureText(altText);
      ctx.fillRect(chartLeft - altMetrics.width - 25, altY - 12, altMetrics.width + 10, 24);
      
      // Altitude label text
      ctx.fillStyle = 'red';
      ctx.textAlign = 'end';
      ctx.fillText(altText, chartLeft - 15, altY + 6);
      
      // Weight label background (multiply by 100 to show actual pounds)
      const actualWeight = (weight * 100).toFixed(0); // Convert to actual pounds
      const weightText = `${actualWeight}`;
      const weightMetrics = ctx.measureText(weightText);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(weightX - weightMetrics.width/2 - 5, chartBottom + 5, weightMetrics.width + 10, 24);
      
      // Weight label text
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText(weightText, weightX, chartBottom + 22);
      
      // Temperature indicator at intersection point
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const tempText = `${temperature}°C`;
      const tempMetrics = ctx.measureText(tempText);
      ctx.fillRect(weightX + 10, altY - 12, tempMetrics.width + 10, 24);
      
      ctx.fillStyle = 'red';
      ctx.textAlign = 'left';
      ctx.fillText(tempText, weightX + 15, altY + 6);
      
      // ====== SECOND CHART: WIND SPEED vs WEIGHT (BOTTOM CHART) ======
      
      // Calculate bottom chart dimensions - MODIFY THESE VALUES TO CHANGE BOTTOM CHART SIZE
      const bottomChartLeft = canvas.width * 0.208; // 20.8% from left - increase to move chart right
      const bottomChartRight = canvas.width * 0.728; // 72.8% from left - increase to make chart wider
      const bottomChartTop = canvas.height * 0.272; // 27.2% from top - increase to move chart down
      const bottomChartBottom = canvas.height * 0.653; // 65.3% from top - increase to make chart taller
      
      const bottomChartWidth = bottomChartRight - bottomChartLeft;
      const bottomChartHeight = bottomChartBottom - bottomChartTop;
      
      // Wind speed levels (non-constant intervals: 5, 10, 20, 50 kts)
      const windSpeedLevels = [5, 10, 20, 50];
      const weightRangeMin = 3400; // kg
      const weightRangeMax = 4600; // kg
      const weightRangeSpan = weightRangeMax - weightRangeMin;
      
      // Get current wind speed from DOM (default to 0 if not available)
      const windSpeedInput = document.getElementById('wind-speed');
      const currentWindSpeed = windSpeedInput ? parseFloat(windSpeedInput.value) || 0 : 0;
      
      // Get wind benefits from DOM (default to 75%)
      const windBenefitsInput = document.getElementById('wind-benefits');
      const windBenefits = windBenefitsInput ? parseFloat(windBenefitsInput.value) || 75 : 75;
      
      // Draw bottom chart grid with 50% opacity
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      
      // Draw four corner markers for bottom chart
      const bottomCornerSize = 10;
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(bottomChartLeft - bottomCornerSize, bottomChartTop);
      ctx.lineTo(bottomChartLeft + bottomCornerSize, bottomChartTop);
      ctx.moveTo(bottomChartLeft, bottomChartTop - bottomCornerSize);
      ctx.lineTo(bottomChartLeft, bottomChartTop + bottomCornerSize);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(bottomChartRight - bottomCornerSize, bottomChartTop);
      ctx.lineTo(bottomChartRight + bottomCornerSize, bottomChartTop);
      ctx.moveTo(bottomChartRight, bottomChartTop - bottomCornerSize);
      ctx.lineTo(bottomChartRight, bottomChartTop + bottomCornerSize);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(bottomChartLeft - bottomCornerSize, bottomChartBottom);
      ctx.lineTo(bottomChartLeft + bottomCornerSize, bottomChartBottom);
      ctx.moveTo(bottomChartLeft, bottomChartBottom - bottomCornerSize);
      ctx.lineTo(bottomChartLeft, bottomChartBottom + bottomCornerSize);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(bottomChartRight - bottomCornerSize, bottomChartBottom);
      ctx.lineTo(bottomChartRight + bottomCornerSize, bottomChartBottom);
      ctx.moveTo(bottomChartRight, bottomChartBottom - bottomCornerSize);
      ctx.lineTo(bottomChartRight, bottomChartBottom + bottomCornerSize);
      ctx.stroke();
      
      // Draw vertical grid lines (weight) - every 100 kg
      for (let w = weightRangeMin; w <= weightRangeMax; w += 100) {
        const gridX = bottomChartLeft + ((w - weightRangeMin) / weightRangeSpan) * bottomChartWidth;
        ctx.beginPath();
        ctx.moveTo(gridX, bottomChartTop);
        ctx.lineTo(gridX, bottomChartBottom);
        ctx.stroke();
      }
      
      // Draw horizontal grid lines for wind speed levels (non-constant intervals)
      windSpeedLevels.forEach(windSpeed => {
        const windY = this._mapWindSpeedToY(windSpeed, bottomChartTop, bottomChartBottom);
        ctx.beginPath();
        ctx.moveTo(bottomChartLeft, windY);
        ctx.lineTo(bottomChartRight, windY);
        ctx.stroke();
      });
      
      // Draw X-axis labels (weight) for bottom chart - MOVED TO TOP
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.textAlign = 'center';
      for (let w = weightRangeMin; w <= weightRangeMax; w += 200) { // Every 200 kg for cleaner labels
        const labelX = bottomChartLeft + ((w - weightRangeMin) / weightRangeSpan) * bottomChartWidth;
        ctx.fillText(`${w}`, labelX, bottomChartTop - 10); // Moved to top
      }
      
      // Draw Y-axis labels (wind speed) for bottom chart
      ctx.textAlign = 'end';
      windSpeedLevels.forEach(windSpeed => {
        const labelY = this._mapWindSpeedToY(windSpeed, bottomChartTop, bottomChartBottom);
        ctx.fillText(`${windSpeed}`, bottomChartLeft - 10, labelY + 5);
      });
      
      // Draw axis titles for bottom chart
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      
      // X-axis title (Weight) - MOVED TO TOP
      ctx.fillText('Gross Weight (kg)', (bottomChartLeft + bottomChartRight) / 2, bottomChartTop - 35);
      
      // Y-axis title (Wind Speed)
      ctx.save();
      ctx.translate(bottomChartLeft - 60, (bottomChartTop + bottomChartBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Wind Speed (kts)', 0, 0);
      ctx.restore();
      
      // Draw wind speed curves using HOGE_HEADWIND_INCREASES data
      ctx.globalAlpha = 1.0;
      const windColors = ['#0066cc', '#00aaff', '#ff6600', '#ff0000']; // Blue to red for different wind speeds
      
      windSpeedLevels.forEach((targetWindSpeed, index) => {
        ctx.strokeStyle = windColors[index] || '#666666';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        let firstPoint = true;
        
        // Generate curve points across weight range
        for (let w = weightRangeMin; w <= weightRangeMax; w += 50) {
          const windY = this._mapWindSpeedToY(targetWindSpeed, bottomChartTop, bottomChartBottom);
          const weightX = bottomChartLeft + ((w - weightRangeMin) / weightRangeSpan) * bottomChartWidth;
          
          if (firstPoint) {
            ctx.moveTo(weightX, windY);
            firstPoint = false;
          } else {
            ctx.lineTo(weightX, windY);
          }
        }
        ctx.stroke();
        
        // Add wind speed label at the end of each line
        const labelX = bottomChartRight + 5;
        const labelY = this._mapWindSpeedToY(targetWindSpeed, bottomChartTop, bottomChartBottom);
        
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = windColors[index] || '#666666';
        ctx.textAlign = 'left';
        ctx.fillText(`${targetWindSpeed} kts`, labelX, labelY + 5);
      });
      
      // Draw red overlay lines for current wind speed - always show for testing
      // Force show red lines with default values for now
      const displayWindSpeed = currentWindSpeed || 10; // Use 10 kts as default if no wind speed
      
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.setLineDash([]); // Solid line
      
      // Calculate wind speed adjustment for typical weight (4000kg)
      const windAdjustment = this._calculateWindSpeedAdjustment(displayWindSpeed, 4000, windBenefits);
      const adjustedWeight = 4000 + windAdjustment;
      
      const currentWindY = this._mapWindSpeedToY(displayWindSpeed, bottomChartTop, bottomChartBottom);
      const adjustedWeightX = bottomChartLeft + ((adjustedWeight - weightRangeMin) / weightRangeSpan) * bottomChartWidth;
      
      // Horizontal line at current wind speed - stops at weight intersection
      ctx.beginPath();
      ctx.moveTo(bottomChartLeft, currentWindY);
      ctx.lineTo(adjustedWeightX, currentWindY);
      ctx.stroke();
      
      // Vertical line from intersection to X-axis (TOP)
      ctx.beginPath();
      ctx.moveTo(adjustedWeightX, currentWindY);
      ctx.lineTo(adjustedWeightX, bottomChartTop);
      ctx.stroke();
      
      // Add labels for bottom chart
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      // Wind speed label
      const windText = `${displayWindSpeed} kts`;
      const windMetrics = ctx.measureText(windText);
      ctx.fillRect(bottomChartLeft - windMetrics.width - 25, currentWindY - 12, windMetrics.width + 10, 24);
      
      ctx.fillStyle = 'red';
      ctx.textAlign = 'end';
      ctx.fillText(windText, bottomChartLeft - 15, currentWindY + 6);
      
      // Weight label - MOVED TO TOP
      const adjustedWeightText = `${adjustedWeight.toFixed(0)}`;
      const adjustedWeightMetrics = ctx.measureText(adjustedWeightText);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(adjustedWeightX - adjustedWeightMetrics.width/2 - 5, bottomChartTop - 35, adjustedWeightMetrics.width + 10, 24);
      
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText(adjustedWeightText, adjustedWeightX, bottomChartTop - 18);
      
      // Wind benefits label at intersection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const benefitsText = `${windBenefits}%`;
      const benefitsMetrics = ctx.measureText(benefitsText);
      ctx.fillRect(adjustedWeightX + 10, currentWindY - 12, benefitsMetrics.width + 10, 24);
      
      ctx.fillStyle = 'red';
      ctx.textAlign = 'left';
      ctx.fillText(benefitsText, adjustedWeightX + 15, currentWindY + 6);
      
      // Convert canvas to blob and create object URL
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            // Store URL for cleanup later
            if (this.generatedImageUrl) {
              URL.revokeObjectURL(this.generatedImageUrl);
            }
            this.generatedImageUrl = url;
            resolve(url);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.95); // High quality JPEG
      });
      
    } catch (error) {
      console.error('Error generating enhanced image:', error);
      throw error;
    }
  }

  /**
   * Loads the base HOGE image
   * @returns {Promise<HTMLImageElement>} Promise that resolves to the loaded image
   */
  async loadBaseImage() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable cross-origin for canvas
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load base image'));
      img.src = this.getImageUrl();
    });
  }


  /**
   * Interpolates weight from temperature and altitude using HOGE_OAT_LINES data
   * @param {number} temperature - Temperature in Celsius (0-40°C)
   * @param {number} altitude - Altitude in thousands of feet
   * @returns {number} Interpolated weight (x100 lbs)
   */
  interpolateWeightAtAltitude(temperature, altitude) {
    const data = this.HOGE_OAT_LINES;
    
    // Clamp temperature to available range (0-40°C)
    const clampedTemp = Math.max(0, Math.min(40, temperature));
    
    // Find the two OAT lines that bracket our temperature
    let lowerLine = null;
    let upperLine = null;
    
    for (let i = 0; i < data.length - 1; i++) {
      if (clampedTemp >= data[i].oat && clampedTemp <= data[i + 1].oat) {
        lowerLine = data[i];
        upperLine = data[i + 1];
        break;
      }
    }
    
    // If exact match or outside range, use single line
    if (!lowerLine || !upperLine) {
      const exactLine = data.find(line => line.oat === clampedTemp);
      if (exactLine) {
        return this.interpolateWeightFromAltitude(exactLine.points, altitude);
      }
      // Use nearest line if outside range
      if (clampedTemp <= data[0].oat) {
        return this.interpolateWeightFromAltitude(data[0].points, altitude);
      } else {
        return this.interpolateWeightFromAltitude(data[data.length - 1].points, altitude);
      }
    }
    
    // Interpolate between two OAT lines
    const tempRatio = (clampedTemp - lowerLine.oat) / (upperLine.oat - lowerLine.oat);
    const lowerWeight = this.interpolateWeightFromAltitude(lowerLine.points, altitude);
    const upperWeight = this.interpolateWeightFromAltitude(upperLine.points, altitude);
    
    return lowerWeight + tempRatio * (upperWeight - lowerWeight);
  }

  /**
   * Interpolates weight from altitude using a single OAT line's points
   * @param {Array} points - Array of {alt, weight} points for a specific OAT
   * @param {number} altitude - Altitude in thousands of feet
   * @returns {number} Interpolated weight (x100 lbs)
   */
  interpolateWeightFromAltitude(points, altitude) {
    // Sort points by altitude (ascending)
    const sortedPoints = [...points].sort((a, b) => a.alt - b.alt);
    
    // If altitude is outside range, use nearest point
    if (altitude <= sortedPoints[0].alt) {
      return sortedPoints[0].weight;
    }
    if (altitude >= sortedPoints[sortedPoints.length - 1].alt) {
      return sortedPoints[sortedPoints.length - 1].weight;
    }
    
    // Find surrounding points for interpolation
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (altitude >= sortedPoints[i].alt && altitude <= sortedPoints[i + 1].alt) {
        // Linear interpolation
        const altRatio = (altitude - sortedPoints[i].alt) / (sortedPoints[i + 1].alt - sortedPoints[i].alt);
        return sortedPoints[i].weight + altRatio * (sortedPoints[i + 1].weight - sortedPoints[i].weight);
      }
    }
    
    // Fallback (should not reach here)
    return 40; // Default weight value
  }

  /**
   * Maps wind speed to Y coordinate using non-linear scale (5 at top, 50 at bottom)
   * @param {number} windSpeed - Wind speed in knots
   * @param {number} chartTop - Top Y coordinate of chart
   * @param {number} chartBottom - Bottom Y coordinate of chart
   * @returns {number} Y coordinate for the wind speed
   */
  _mapWindSpeedToY(windSpeed, chartTop, chartBottom) {
    const windSpeedLevels = [5, 10, 20, 50]; // 5 at top, 50 at bottom
    const chartHeight = chartBottom - chartTop;
    
    // Find position within the non-linear scale (flipped: 5 at top, 50 at bottom)
    if (windSpeed <= windSpeedLevels[0]) {
      // Below minimum (5), place at top
      return chartTop;
    }
    
    if (windSpeed >= windSpeedLevels[windSpeedLevels.length - 1]) {
      // Above maximum (50), place at bottom
      return chartBottom;
    }
    
    // Find which interval the wind speed falls into
    for (let i = 0; i < windSpeedLevels.length - 1; i++) {
      if (windSpeed >= windSpeedLevels[i] && windSpeed <= windSpeedLevels[i + 1]) {
        // Linear interpolation within this interval
        const lowerSpeed = windSpeedLevels[i];
        const upperSpeed = windSpeedLevels[i + 1];
        const ratio = (windSpeed - lowerSpeed) / (upperSpeed - lowerSpeed);
        
        // Each interval takes equal vertical space (flipped)
        const intervalHeight = chartHeight / (windSpeedLevels.length - 1);
        const intervalStart = chartTop + i * intervalHeight;
        const intervalEnd = chartTop + (i + 1) * intervalHeight;
        
        return intervalStart + ratio * intervalHeight;
      }
    }
    
    // Fallback
    return chartTop;
  }
  
  /**
   * Calculates wind speed adjustment using HOGE_HEADWIND_INCREASES data
   * @param {number} windSpeed - Wind speed in knots
   * @param {number} baseWeight - Base aircraft weight in kg
   * @param {number} windBenefits - Wind benefits percentage (0-100)
   * @returns {number} Weight adjustment in kg
   */
  _calculateWindSpeedAdjustment(windSpeed, baseWeight, windBenefits = 75) {
    // This is a simplified version - in reality you'd need the full HOGE_HEADWIND_INCREASES data
    // For now, we'll simulate the adjustment based on wind speed
    
    const windSpeedIndex = Math.min(Math.floor(windSpeed), 50); // Clamp to max 50 kts
    const weightIndex = Math.floor((Math.min(Math.max(baseWeight, 3400), 4400) - 3400) / 100); // Map weight to index
    
    // Simplified calculation - in reality this would use the full HOGE_HEADWIND_INCREASES array
    let baseAdjustment = 0;
    if (windSpeed <= 5) {
      baseAdjustment = windSpeed * 20; // ~100 kg at 5 kts
    } else if (windSpeed <= 10) {
      baseAdjustment = 100 + (windSpeed - 5) * 30; // 100 + up to 150 more
    } else if (windSpeed <= 20) {
      baseAdjustment = 250 + (windSpeed - 10) * 50; // 250 + up to 500 more
    } else {
      baseAdjustment = 750 + (windSpeed - 20) * 100; // 750 + up to 3000 more
    }
    
    // Apply wind benefits percentage
    const windBenefitsDecimal = Math.max(0, Math.min(100, windBenefits)) / 100;
    return baseAdjustment * windBenefitsDecimal;
  }

  /**
   * Cleanup generated image URLs to free memory
   */
  cleanup() {
    if (this.generatedImageUrl) {
      URL.revokeObjectURL(this.generatedImageUrl);
      this.generatedImageUrl = null;
    }
  }

}



