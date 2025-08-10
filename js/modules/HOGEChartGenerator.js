/**
 * HOGEChartGenerator - Generates HOGE performance charts with temperature overlays
 * Creates visual representations of AW169 HOGE performance with user-defined temperature lines
 */

export class HOGEChartGenerator {
  constructor() {
    // Chart dimensions and scaling factors (A4 portrait: 210mm x 297mm = 595x842 pts)
    this.CHART_WIDTH = 595;
    this.CHART_HEIGHT = 842;
    this.MARGIN = { top: 50, right: 50, bottom: 50, left: 50 };
    
    // Base PDF path
    this.BASE_PDF_PATH = './HOGE/Figure S5-32 HOGE.pdf';
    
    // Chart coordinate system based on the PDF
    this.CHART_BOUNDS = {
      // Gross weight range in kg x 100 (33-49 on chart = 3300-4900 kg)
      weightMin: 33,
      weightMax: 49,
      // Pressure altitude in ft x 1000 (-1 to 15 = -1000 to 15000 ft)
      altitudeMin: -1,
      altitudeMax: 15
    };
    
    // Temperature curves data points from the PDF chart
    this.TEMPERATURE_CURVES = [
      {
        oat: 0,
        points: [
          { altitude: 9.2, weight: 33 },
          { altitude: 5.6, weight: 38 },
          { altitude: 2.0, weight: 43.5 },
          { altitude: 1.0, weight: 44.2 },
          { altitude: -1.0, weight: 44.7 }
        ]
      },
      {
        oat: 10,
        points: [
          { altitude: 8.0, weight: 33 },
          { altitude: 5.0, weight: 37 },
          { altitude: 1.0, weight: 43.1 },
          { altitude: 0.0, weight: 44.0 },
          { altitude: -1.0, weight: 44.3 }
        ]
      },
      {
        oat: 20,
        points: [
          { altitude: 6.6, weight: 33 },
          { altitude: 4.4, weight: 36 },
          { altitude: 0.0, weight: 42.5 },
          { altitude: -1.0, weight: 43.5 }
        ]
      },
      {
        oat: 30,
        points: [
          { altitude: 5.4, weight: 33 },
          { altitude: 2.4, weight: 37 },
          { altitude: -1.0, weight: 42 }
        ]
      },
      {
        oat: 40,
        points: [
          { altitude: 3.6, weight: 33 },
          { altitude: 1.0, weight: 36.2 },
          { altitude: -1.0, weight: 39.1 }
        ]
      }
    ];
    
    // ISA temperature lines
    this.ISA_LINES = [
      { label: 'ISA', temp: 15, color: '#059669' },
      { label: 'ISA+10', temp: 25, color: '#10b981' },
      { label: 'ISA+20', temp: 35, color: '#34d399' },
      { label: 'ISA+35', temp: 50, color: '#6ee7b7' }
    ];
    
    this.canvas = null;
    this.ctx = null;
    this.basePDFImage = null;
  }

  /**
   * Load the base PDF as an image background
   * @returns {Promise<Image>} Loaded PDF image
   */
  async loadBasePDF() {
    return new Promise((resolve, reject) => {
      // Convert PDF to image using a canvas approach or use pre-converted image
      // For now, we'll create a mock base image with the chart background
      const img = new Image();
      img.onload = () => {
        this.basePDFImage = img;
        resolve(img);
      };
      img.onerror = () => {
        console.warn('Could not load base PDF, creating synthetic background');
        // Create a synthetic background if PDF loading fails
        this.createSyntheticBackground();
        resolve(null);
      };
      
      // Try to load a pre-converted PNG version of the PDF
      img.src = './HOGE/Figure_S5-32_HOGE.png';
    });
  }

  /**
   * Create a synthetic background matching the PDF chart
   */
  createSyntheticBackground() {
    // This will create the background using our existing drawing methods
    this.basePDFImage = null; // Will trigger synthetic drawing in generateChart
  }

  /**
   * Initialize the chart canvas and context
   * @param {HTMLCanvasElement} canvasElement - Canvas element to render on
   */
  initializeCanvas(canvasElement) {
    this.canvas = canvasElement;
    this.canvas.width = this.CHART_WIDTH;
    this.canvas.height = this.CHART_HEIGHT;
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas styling
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.CHART_WIDTH, this.CHART_HEIGHT);
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
  }

  /**
   * Draw the base PDF image as background
   */
  drawBasePDF() {
    const { ctx } = this;
    
    if (this.basePDFImage) {
      // Draw the base PDF image to fill the canvas
      ctx.drawImage(this.basePDFImage, 0, 0, this.CHART_WIDTH, this.CHART_HEIGHT);
    } else {
      // Draw synthetic background if no base image
      this.drawSyntheticBackground();
    }
  }

  /**
   * Draw synthetic background matching the original PDF
   */
  drawSyntheticBackground() {
    // Fill background with white
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.CHART_WIDTH, this.CHART_HEIGHT);
    
    // Draw all the base chart elements
    this.drawGrid();
    this.drawAxes();
    this.drawTemperatureCurves();
    this.drawISALines();
    this.drawTitle();
  }

  /**
   * Convert chart coordinates to canvas coordinates
   * @param {number} weight - Gross weight in hundreds of kg (33-49)
   * @param {number} altitude - Pressure altitude in thousands of ft (-1 to 15)
   * @returns {Object} Canvas coordinates {x, y}
   */
  chartToCanvas(weight, altitude) {
    // Adjust for A4 size and proper chart area
    const chartArea = {
      left: this.CHART_WIDTH * 0.15,   // 15% from left
      right: this.CHART_WIDTH * 0.85,  // 85% from left
      top: this.CHART_HEIGHT * 0.2,    // 20% from top
      bottom: this.CHART_HEIGHT * 0.8  // 80% from top
    };
    
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    
    const x = chartArea.left + 
      ((weight - this.CHART_BOUNDS.weightMin) / (this.CHART_BOUNDS.weightMax - this.CHART_BOUNDS.weightMin)) * chartWidth;
    
    const y = chartArea.top + 
      ((this.CHART_BOUNDS.altitudeMax - altitude) / (this.CHART_BOUNDS.altitudeMax - this.CHART_BOUNDS.altitudeMin)) * chartHeight;
    
    return { x, y };
  }

  /**
   * Draw the chart grid and axes
   */
  drawGrid() {
    const { ctx } = this;
    const chartWidth = this.CHART_WIDTH - this.MARGIN.left - this.MARGIN.right;
    const chartHeight = this.CHART_HEIGHT - this.MARGIN.top - this.MARGIN.bottom;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines (weight)
    for (let weight = this.CHART_BOUNDS.weightMin; weight <= this.CHART_BOUNDS.weightMax; weight += 2) {
      const { x } = this.chartToCanvas(weight, 0);
      ctx.beginPath();
      ctx.moveTo(x, this.MARGIN.top);
      ctx.lineTo(x, this.MARGIN.top + chartHeight);
      ctx.stroke();
    }
    
    // Horizontal grid lines (altitude)
    for (let alt = this.CHART_BOUNDS.altitudeMin; alt <= this.CHART_BOUNDS.altitudeMax; alt += 2) {
      const { y } = this.chartToCanvas(0, alt);
      ctx.beginPath();
      ctx.moveTo(this.MARGIN.left, y);
      ctx.lineTo(this.MARGIN.left + chartWidth, y);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(this.MARGIN.left, this.MARGIN.top + chartHeight);
    ctx.lineTo(this.MARGIN.left + chartWidth, this.MARGIN.top + chartHeight);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(this.MARGIN.left, this.MARGIN.top);
    ctx.lineTo(this.MARGIN.left, this.MARGIN.top + chartHeight);
    ctx.stroke();
  }

  /**
   * Draw axis labels and scales
   */
  drawAxes() {
    const { ctx } = this;
    const chartWidth = this.CHART_WIDTH - this.MARGIN.left - this.MARGIN.right;
    const chartHeight = this.CHART_HEIGHT - this.MARGIN.top - this.MARGIN.bottom;
    
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels (gross weight)
    for (let weight = this.CHART_BOUNDS.weightMin; weight <= this.CHART_BOUNDS.weightMax; weight += 2) {
      const { x } = this.chartToCanvas(weight, 0);
      ctx.fillText(weight.toString(), x, this.MARGIN.top + chartHeight + 20);
    }
    
    // X-axis title
    ctx.font = '14px Arial';
    ctx.fillText('GROSS WEIGHT [kg x 100]', 
      this.MARGIN.left + chartWidth / 2, 
      this.MARGIN.top + chartHeight + 50);
    
    // Y-axis labels (altitude)
    ctx.textAlign = 'right';
    ctx.font = '12px Arial';
    for (let alt = this.CHART_BOUNDS.altitudeMin; alt <= this.CHART_BOUNDS.altitudeMax; alt += 2) {
      const { y } = this.chartToCanvas(0, alt);
      ctx.fillText(alt.toString(), this.MARGIN.left - 10, y + 4);
    }
    
    // Y-axis title (rotated)
    ctx.save();
    ctx.translate(20, this.MARGIN.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PRESSURE ALTITUDE [ft x 1000]', 0, 0);
    ctx.restore();
  }

  /**
   * Draw temperature curves
   */
  drawTemperatureCurves() {
    const { ctx } = this;
    
    this.TEMPERATURE_CURVES.forEach(curve => {
      if (curve.points.length < 2) return;
      
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const firstPoint = this.chartToCanvas(curve.points[0].weight, curve.points[0].altitude);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      for (let i = 1; i < curve.points.length; i++) {
        const point = this.chartToCanvas(curve.points[i].weight, curve.points[i].altitude);
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.stroke();
      
      // Add temperature label at the end of the curve
      const lastPoint = curve.points[curve.points.length - 1];
      const labelPos = this.chartToCanvas(lastPoint.weight, lastPoint.altitude);
      
      ctx.fillStyle = curve.color;
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${curve.temp}°C`, labelPos.x + 5, labelPos.y);
    });
  }

  /**
   * Draw ISA reference lines
   */
  drawISALines() {
    const { ctx } = this;
    
    this.ISA_LINES.forEach(isaLine => {
      // Find corresponding temperature curve or interpolate
      const curve = this.findTemperatureCurve(isaLine.temp);
      if (curve && curve.points.length >= 2) {
        ctx.strokeStyle = isaLine.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        const firstPoint = this.chartToCanvas(curve.points[0].weight, curve.points[0].altitude);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < curve.points.length; i++) {
          const point = this.chartToCanvas(curve.points[i].weight, curve.points[i].altitude);
          ctx.lineTo(point.x, point.y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add ISA label
        const midPoint = curve.points[Math.floor(curve.points.length / 2)];
        const labelPos = this.chartToCanvas(midPoint.weight, midPoint.altitude);
        
        ctx.fillStyle = isaLine.color;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isaLine.label, labelPos.x, labelPos.y - 10);
      }
    });
  }

  /**
   * Find or interpolate temperature curve for given temperature
   * @param {number} temperature - Temperature in Celsius
   * @returns {Object} Temperature curve data
   */
  findTemperatureCurve(temperature) {
    // Find exact match
    const exactMatch = this.TEMPERATURE_CURVES.find(curve => curve.temp === temperature);
    if (exactMatch) return exactMatch;
    
    // Find bounding curves for interpolation
    const sortedCurves = this.TEMPERATURE_CURVES.slice().sort((a, b) => a.temp - b.temp);
    let lowerCurve = null, upperCurve = null;
    
    for (let i = 0; i < sortedCurves.length - 1; i++) {
      if (sortedCurves[i].temp <= temperature && sortedCurves[i + 1].temp >= temperature) {
        lowerCurve = sortedCurves[i];
        upperCurve = sortedCurves[i + 1];
        break;
      }
    }
    
    if (!lowerCurve || !upperCurve) {
      // Use closest curve if outside range
      return sortedCurves.reduce((prev, current) => 
        Math.abs(current.temp - temperature) < Math.abs(prev.temp - temperature) ? current : prev
      );
    }
    
    // Interpolate between curves
    const ratio = (temperature - lowerCurve.temp) / (upperCurve.temp - lowerCurve.temp);
    const interpolatedPoints = [];
    
    const minPoints = Math.min(lowerCurve.points.length, upperCurve.points.length);
    for (let i = 0; i < minPoints; i++) {
      const lowerPoint = lowerCurve.points[i];
      const upperPoint = upperCurve.points[i];
      
      interpolatedPoints.push({
        weight: lowerPoint.weight + (upperPoint.weight - lowerPoint.weight) * ratio,
        altitude: lowerPoint.altitude + (upperPoint.altitude - lowerPoint.altitude) * ratio
      });
    }
    
    return {
      temp: temperature,
      color: '#ef4444',
      points: interpolatedPoints
    };
  }

  /**
   * Draw the red horizontal line at specified altitude (300 ft = 0.3 on chart)
   * @param {number} altitudeFt - Altitude in feet (default 300)
   */
  drawAltitudeLine(altitudeFt = 300) {
    const { ctx } = this;
    
    // Convert altitude to chart units (300 ft = 0.3 in thousands)
    const altitudeChart = altitudeFt / 1000;
    
    // Get the chart area bounds
    const chartArea = {
      left: this.CHART_WIDTH * 0.15,
      right: this.CHART_WIDTH * 0.85,
      top: this.CHART_HEIGHT * 0.2,
      bottom: this.CHART_HEIGHT * 0.8
    };
    
    // Calculate y position using the chart coordinate system
    const { y } = this.chartToCanvas(this.CHART_BOUNDS.weightMin, altitudeChart);
    
    // Draw red horizontal line across the chart area
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    
    // Add altitude label on the right side
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${altitudeFt} ft`, chartArea.right + 10, y + 5);
  }

  /**
   * Draw chart title and headers
   */
  drawTitle() {
    const { ctx } = this;
    
    // Main title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HOVER CEILING OUT OF GROUND EFFECT', 
      this.CHART_WIDTH / 2, 25);
    
    // Subtitle
    ctx.font = '14px Arial';
    ctx.fillText('UNFACTORED HEADWIND - OEI 2.5 min', 
      this.CHART_WIDTH / 2, 45);
    
    // Enhanced performance note
    ctx.font = '12px Arial';
    ctx.fillText('ENHANCED PERFORMANCE', 
      this.CHART_WIDTH / 2, 65);
  }

  /**
   * Add user input information panel
   * @param {number} temperature - User input temperature
   * @param {number} altitude - Altitude in feet (default 300)
   */
  drawUserInputPanel(temperature, altitude = 300) {
    const { ctx } = this;
    const panelX = this.CHART_WIDTH - this.MARGIN.right + 20;
    const panelY = this.MARGIN.top + 20;
    
    // Panel background
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillRect(panelX, panelY, 120, 100);
    ctx.strokeRect(panelX, panelY, 120, 100);
    
    // Panel title
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('USER INPUT', panelX + 10, panelY + 20);
    
    // Temperature
    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial';
    ctx.fillText(`Temperature: ${temperature}°C`, panelX + 10, panelY + 40);
    
    // Altitude
    ctx.fillText(`Altitude: ${altitude} ft`, panelX + 10, panelY + 55);
    
    // Date/time
    const now = new Date();
    ctx.font = '9px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`Generated: ${now.toLocaleString()}`, panelX + 10, panelY + 85);
  }

  /**
   * Generate the complete HOGE chart
   * @param {HTMLCanvasElement} canvasElement - Canvas to render on
   * @param {number} temperature - User input temperature in Celsius
   * @param {number} altitude - Altitude in feet (default 300)
   * @returns {Promise<void>}
   */
  async generateChart(canvasElement, temperature = 25, altitude = 300) {
    try {
      this.initializeCanvas(canvasElement);
      
      // Load base PDF first
      await this.loadBasePDF();
      
      // Draw base PDF background
      this.drawBasePDF();
      
      // Only draw the overlay elements
      this.drawAltitudeLine(altitude);
      this.drawUserInputPanel(temperature, altitude);
      
      console.log(`HOGE chart generated with temperature ${temperature}°C at ${altitude} ft`);
      
    } catch (error) {
      console.error('Error generating HOGE chart:', error);
      throw error;
    }
  }

  /**
   * Convert canvas to PDF blob for download
   * @param {string} filename - PDF filename
   * @returns {Promise<Blob>} PDF blob
   */
  async generatePDF(filename = 'hoge_chart.pdf') {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call generateChart first.');
    }
    
    try {
      // Convert canvas to data URL
      const imageDataURL = this.canvas.toDataURL('image/png', 1.0);
      
      // Create PDF using browser's built-in PDF capabilities
      // This creates a data URL that can be downloaded
      const pdfContent = this.createPDFContent(imageDataURL, filename);
      
      // Return as blob for download
      return new Promise((resolve) => {
        this.canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Create PDF content HTML for printing/saving
   * @param {string} imageDataURL - Canvas image as data URL
   * @param {string} filename - PDF filename
   * @returns {string} HTML content for PDF
   */
  createPDFContent(imageDataURL, filename) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: Arial, sans-serif;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .chart-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
          }
          .chart-image {
            max-width: 100%;
            height: auto;
            border: 1px solid #ccc;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AW169 HOGE Performance Chart</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="chart-container">
          <img src="${imageDataURL}" alt="HOGE Chart" class="chart-image">
        </div>
        <div class="footer">
          <p>System Remaster HST - Helicopter Flight Planning System</p>
          <p>Chart based on AW169 RFM Figure S5-32</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Download chart as PNG image
   * @param {string} filename - Image filename
   */
  downloadAsImage(filename = 'hoge_chart.png') {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call generateChart first.');
    }
    
    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  }

  /**
   * Open chart in new window for printing as PDF
   */
  openForPDF() {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call generateChart first.');
    }
    
    const imageDataURL = this.canvas.toDataURL('image/png', 1.0);
    const htmlContent = this.createPDFContent(imageDataURL, 'HOGE_Chart.pdf');
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      newWindow.print();
    }, 1000);
  }

  /**
   * Find intersection points between temperature curve and altitude line
   * @param {number} temperature - Temperature in Celsius
   * @param {number} altitude - Altitude in feet
   * @returns {Array} Array of intersection weights
   */
  findIntersections(temperature, altitude) {
    const curve = this.findTemperatureCurve(temperature);
    const altitudeChart = altitude / 1000; // Convert to chart units
    const intersections = [];
    
    if (curve && curve.points) {
      for (let i = 0; i < curve.points.length - 1; i++) {
        const p1 = curve.points[i];
        const p2 = curve.points[i + 1];
        
        // Check if altitude line intersects this segment
        if ((p1.altitude <= altitudeChart && p2.altitude >= altitudeChart) ||
            (p1.altitude >= altitudeChart && p2.altitude <= altitudeChart)) {
          
          // Linear interpolation to find exact intersection weight
          const ratio = (altitudeChart - p1.altitude) / (p2.altitude - p1.altitude);
          const intersectionWeight = p1.weight + (p2.weight - p1.weight) * ratio;
          intersections.push(intersectionWeight * 100); // Convert to actual kg
        }
      }
    }
    
    return intersections;
  }
}