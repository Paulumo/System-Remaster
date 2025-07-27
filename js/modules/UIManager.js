/**
 * UIManager - Handles UI interactions and state management
 * Manages form interactions, panel visibility, and user interface updates
 */

import { CONFIG } from '../config.js';
import { createElement, domCache, addEventListenerWithCleanup, scrollToElement } from './utils/dom.js';
import { validateCrewName, validateCallsign, showFieldError, clearFieldError, showFieldSuccess } from './utils/validation.js';
import { sanitizeInput } from './utils/security.js';
import { stateManager } from './StateManager.js';

export class UIManager {
  constructor(flightCalculator) {
    this.flightCalculator = flightCalculator;
    this.currentPanel = 'route'; // route, flight-info, calculation
    this.flightMethod = null;
    this.eventCleanupFunctions = [];
    this.stateUnsubscribeFunctions = [];
    this.isInitialized = false;
    this.needsCalculationUpdate = false;
    
    // Set up automatic UI updates when FlightCalculator completes calculations
    if (this.flightCalculator && typeof this.flightCalculator.setUIUpdateCallback === 'function') {
      this.flightCalculator.setUIUpdateCallback(() => {
        this.autoUpdateCalculationDisplay();
      });
      console.log('✅ FlightCalculator UI update callback connected');
    }
  }

  /**
   * Initialize UI manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.setupFlightMethodButtons();
      this.setupPanelTransitions();
      this.setupFormValidation();
      this.setupCalculationPanel();
      this.setupStateSubscriptions();
      this.isInitialized = true;
      
      console.log('UIManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize UIManager:', error);
      throw error;
    }
  }

  /**
   * Setup state management subscriptions
   * @private
   */
  setupStateSubscriptions() {
    // Subscribe to flight method changes
    const unsubscribeMethod = stateManager.subscribe('flightPlan.method', (method) => {
      if (method && method !== this.flightMethod) {
        this.updateFlightMethodUI(method);
        this.flightMethod = method;
      }
    });
    this.stateUnsubscribeFunctions.push(unsubscribeMethod);

    // Subscribe to UI panel changes
    const unsubscribePanel = stateManager.subscribe('ui.currentPanel', (panel) => {
      if (panel !== this.currentPanel) {
        this.switchToPanel(panel);
      }
    });
    this.stateUnsubscribeFunctions.push(unsubscribePanel);

    // Subscribe to crew changes
    ['pic', 'sic', 'hop', 'disp', 'cust'].forEach(role => {
      const unsubscribeCrew = stateManager.subscribe(`flightPlan.crew.${role}`, (crewData) => {
        this.updateCrewField(role, crewData);
      });
      this.stateUnsubscribeFunctions.push(unsubscribeCrew);
    });
  }

  /**
   * Update flight method UI based on state
   * @private
   * @param {string} method - Flight method
   */
  updateFlightMethodUI(method) {
    const flightMethodButtons = domCache.getAll('.mb-6 .flex.gap-2 button');
    flightMethodButtons.forEach(btn => {
      if (btn.textContent.trim() === method) {
        this.selectFlightMethodSilent(btn);
      }
    });
  }

  /**
   * Update crew field UI based on state
   * @private
   * @param {string} role - Crew role
   * @param {Object} crewData - Crew data
   */
  updateCrewField(role, crewData) {
    if (!crewData) return;

    const nameField = domCache.get(`input[data-crew-role="${role}"][data-field="name"]`);
    const weightField = domCache.get(`input[data-crew-role="${role}"][data-field="weight"]`);

    if (nameField && crewData.name !== nameField.value) {
      nameField.value = crewData.name;
    }

    if (weightField && crewData.weight !== parseFloat(weightField.value)) {
      weightField.value = crewData.weight;
    }
  }

  /**
   * Setup flight method selection buttons
   * @private
   */
  setupFlightMethodButtons() {
    const flightMethodButtons = domCache.getAll('.mb-6 .flex.gap-2 button');
    
    flightMethodButtons.forEach(button => {
      const cleanup = addEventListenerWithCleanup(button, 'click', () => {
        this.selectFlightMethod(button);
      });
      this.eventCleanupFunctions.push(cleanup);
      
      // Add ARIA attributes
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.setAttribute('tabindex', '0');
      
      // Add keyboard support
      const keyboardCleanup = addEventListenerWithCleanup(button, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectFlightMethod(button);
        }
      });
      this.eventCleanupFunctions.push(keyboardCleanup);
    });
    
    // Set up radio group
    const buttonContainer = flightMethodButtons[0]?.parentElement;
    if (buttonContainer) {
      buttonContainer.setAttribute('role', 'radiogroup');
      buttonContainer.setAttribute('aria-label', 'Flight method selection');
    }
  }

  /**
   * Select flight method
   * @private
   * @param {HTMLElement} selectedButton - Selected button element
   */
  selectFlightMethod(selectedButton) {
    try {
      const method = selectedButton.textContent.trim();
      
      // Dispatch state update
      stateManager.dispatch('SET_FLIGHT_METHOD', method);
      
      // Update UI
      this.selectFlightMethodSilent(selectedButton);
      
      console.log(`Flight method selected: ${method}`);
      
      // Show success feedback
      this.showMessage(`${method} selected`, 'success');
      
    } catch (error) {
      console.error('Error selecting flight method:', error);
      this.showError('Failed to select flight method');
    }
  }

  /**
   * Select flight method without triggering state updates (for internal sync)
   * @private
   * @param {HTMLElement} selectedButton - Selected button element
   */
  selectFlightMethodSilent(selectedButton) {
    try {
      const flightMethodButtons = domCache.getAll('.mb-6 .flex.gap-2 button');
      
      // Reset all buttons to inactive state
      flightMethodButtons.forEach(btn => {
        btn.className = CONFIG.CLASSES.FLIGHT_METHOD_INACTIVE;
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', '-1');
      });
      
      // Set clicked button to active state
      selectedButton.className = CONFIG.CLASSES.FLIGHT_METHOD_ACTIVE;
      selectedButton.setAttribute('aria-checked', 'true');
      selectedButton.setAttribute('tabindex', '0');
      
    } catch (error) {
      console.error('Error selecting flight method silently:', error);
    }
  }

  /**
   * Setup panel transitions
   * @private
   */
  setupPanelTransitions() {
    // Continue with OFP button
    const continueBtn = domCache.get('#continue-ofp-btn');
    if (continueBtn) {
      const cleanup1 = addEventListenerWithCleanup(continueBtn, 'click', (e) => {
        e.preventDefault(); // Prevent any form submission
        e.stopPropagation(); // Stop event bubbling
        this.showFlightInfoPanel();
      });
      this.eventCleanupFunctions.push(cleanup1);
      
      // Ensure button type is button, not submit
      continueBtn.setAttribute('type', 'button');
      continueBtn.setAttribute('aria-describedby', 'flight-info-panel');
    }
    
    // Next button in flight info panel
    const nextBtn = domCache.get('#flight-info-panel button[class*="bg-[#2563eb]"]');
    if (nextBtn) {
      const cleanup2 = addEventListenerWithCleanup(nextBtn, 'click', (e) => {
        e.preventDefault(); // Prevent any form submission
        e.stopPropagation(); // Stop event bubbling
        this.showCalculationPanel();
      });
      this.eventCleanupFunctions.push(cleanup2);
      
      // Ensure button type is button, not submit
      nextBtn.setAttribute('type', 'button');
      nextBtn.setAttribute('aria-describedby', 'calculation-panel');
      
      console.log('Next button event handler attached');
    } else {
      console.warn('Next button not found');
    }
  }

  /**
   * Show flight info panel
   * @private
   */
  showFlightInfoPanel() {
    try {
      const flightInfoPanel = domCache.get('#flight-info-panel');
      if (flightInfoPanel) {
        flightInfoPanel.classList.remove('hidden');
        flightInfoPanel.setAttribute('aria-hidden', 'false');
        this.currentPanel = 'flight-info';
        
        // Focus first input for accessibility
        const firstInput = flightInfoPanel.querySelector('input');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 100);
        }
        
        console.log('Flight info panel shown');
      }
    } catch (error) {
      console.error('Error showing flight info panel:', error);
    }
  }

  /**
   * Show calculation panel
   * @private
   */
  showCalculationPanel() {
    try {
      // Validate flight info first
      if (!this.validateFlightInfo()) {
        return;
      }
      
      // Transfer flight data to calculation panel
      this.transferFlightData();
      
      const calculationPanel = domCache.get('#calculation-panel');
      if (calculationPanel) {
        calculationPanel.classList.remove('hidden');
        calculationPanel.setAttribute('aria-hidden', 'false');
        this.currentPanel = 'calculation';
        
        // Always perform calculations when showing calculation panel to ensure current data
        console.log('🔄 Updating calculation display on panel switch');
        this.performCalculations();
        this.needsCalculationUpdate = false;
        
        // Scroll to the calculation panel smoothly
        setTimeout(() => {
          scrollToElement(calculationPanel);
          
          // Announce to screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Flight calculation panel is now open';
          document.body.appendChild(announcement);
          
          setTimeout(() => {
            document.body.removeChild(announcement);
          }, 1000);
        }, CONFIG.UI.ANIMATION_DELAY);
        
        console.log('Calculation panel shown');
      }
    } catch (error) {
      console.error('Error showing calculation panel:', error);
    }
  }

  /**
   * Validate flight info form
   * @private
   * @returns {boolean} True if valid
   */
  validateFlightInfo() {
    // DEVELOPMENT MODE: Skip validation, always return true
    // Just ensure flight method is selected for UI consistency
    if (!this.flightMethod) {
      this.showError('Please select a flight method');
      return true;
    }
    
    return true;
  }

  /**
   * Transfer flight data to calculation panel
   * @private
   */
  transferFlightData() {
    try {
      const flightInfoPanel = domCache.get('#flight-info-panel');
      if (!flightInfoPanel) return;
      
      // Get flight info data with fallback to placeholder text
      const picInput = flightInfoPanel.querySelector('input[placeholder="Enter PIC Name"]');
      const sicInput = flightInfoPanel.querySelector('input[placeholder="Enter SIC Name"]');
      const hopInput = flightInfoPanel.querySelector('input[placeholder="Enter HOP Name"]');
      const dispInput = flightInfoPanel.querySelector('input[placeholder="Enter DISP Name"]');
      const custInput = flightInfoPanel.querySelector('input[placeholder="Enter Customer Name"]');
      
      const picName = sanitizeInput(picInput?.value, { maxLength: 50 }) || picInput?.placeholder || 'Enter PIC Name';
      const sicName = sanitizeInput(sicInput?.value, { maxLength: 50 }) || sicInput?.placeholder || 'Enter SIC Name';
      const hopName = sanitizeInput(hopInput?.value, { maxLength: 50 }) || hopInput?.placeholder || 'Enter HOP Name';
      const dispName = sanitizeInput(dispInput?.value, { maxLength: 50 }) || dispInput?.placeholder || 'Enter DISP Name';
      const custName = sanitizeInput(custInput?.value, { maxLength: 50 }) || custInput?.placeholder || 'Enter Customer Name';
      
      // Update calculation panel displays
      const picDisplay = domCache.get('#pic-name-display');
      const sicDisplay = domCache.get('#sic-name-display');
      const hopDisplay = domCache.get('#hop-name-display');
      const dispDisplay = domCache.get('#disp-name-display');
      const custDisplay = domCache.get('#cust-name-display');
      
      if (picDisplay) picDisplay.textContent = picName;
      if (sicDisplay) sicDisplay.textContent = sicName;
      if (hopDisplay) hopDisplay.textContent = hopName;
      if (dispDisplay) dispDisplay.textContent = dispName;
      if (custDisplay) custDisplay.textContent = custName;
      
      // Update flight calculator with crew names
      if (this.flightCalculator) {
        this.flightCalculator.updateCrewData({ role: 'pic', name: picName, weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT });
        this.flightCalculator.updateCrewData({ role: 'sic', name: sicName, weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT });
        this.flightCalculator.updateCrewData({ role: 'hop', name: hopName, weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT });
        this.flightCalculator.updateCrewData({ role: 'disp', name: dispName, weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT });
        this.flightCalculator.updateCrewData({ role: 'cust', name: custName, weight: CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT });
      }
      
      console.log('Flight data transferred to calculation panel');
      
    } catch (error) {
      console.error('Error transferring flight data:', error);
    }
  }

  /**
   * Setup form validation
   * @private
   */
  setupFormValidation() {
    const flightInfoPanel = domCache.get('#flight-info-panel');
    if (!flightInfoPanel) return;
    
    // Real-time validation for inputs
    const inputs = flightInfoPanel.querySelectorAll('input');
    inputs.forEach(input => {
      const cleanup = addEventListenerWithCleanup(input, 'blur', () => {
        this.validateSingleField(input);
      });
      this.eventCleanupFunctions.push(cleanup);
      
      // Clear errors on input
      const inputCleanup = addEventListenerWithCleanup(input, 'input', () => {
        clearFieldError(input);
      });
      this.eventCleanupFunctions.push(inputCleanup);
    });
  }

  /**
   * Validate single form field (disabled during development)
   * @private
   * @param {HTMLElement} field - Input field to validate
   */
  validateSingleField(field) {
    try {
      // DEVELOPMENT MODE: Skip validation, just clear any existing errors
      clearFieldError(field);
    } catch (error) {
      console.error('Error validating field:', error);
    }
  }

  /**
   * Setup calculation panel functionality
   * @private
   */
  setupCalculationPanel() {
    // Recalculate button
    const recalculateBtn = domCache.get('#recalculate-btn');
    if (recalculateBtn) {
      const cleanup1 = addEventListenerWithCleanup(recalculateBtn, 'click', () => {
        this.performCalculations();
      });
      this.eventCleanupFunctions.push(cleanup1);
    }
    
    // Generate OFP button
    const generateBtn = domCache.get('#generate-ofp-btn');
    if (generateBtn) {
      const cleanup2 = addEventListenerWithCleanup(generateBtn, 'click', () => {
        this.generateOFP();
      });
      this.eventCleanupFunctions.push(cleanup2);
    }
    
    // Discretion fuel input
    const discretionInput = domCache.get('#discretion-fuel');
    if (discretionInput) {
      const cleanup3 = addEventListenerWithCleanup(discretionInput, 'input', () => {
        this.updateDiscretionFuel();
      });
      this.eventCleanupFunctions.push(cleanup3);
    }
    
    // Hoisting time input - auto-trigger calculations
    const hoistingTimeInput = domCache.get('#hoisting-time');
    if (hoistingTimeInput) {
      const cleanup4 = addEventListenerWithCleanup(hoistingTimeInput, 'input', () => {
        const hoistingTime = parseInt(hoistingTimeInput.value) || 0;
        console.log(`🕐 Hoisting time changed to ${hoistingTime} minutes, triggering recalculation`);
        
        // Update any display elements immediately if needed
        if (this.currentPanel === 'calculation') {
          this.performCalculations();
        }
      });
      this.eventCleanupFunctions.push(cleanup4);
      
      // Also trigger on blur to ensure calculation happens when user leaves field
      const cleanup5 = addEventListenerWithCleanup(hoistingTimeInput, 'blur', () => {
        if (this.currentPanel === 'calculation') {
          this.performCalculations();
        }
      });
      this.eventCleanupFunctions.push(cleanup5);
    }
    
    // Weight inputs
    const weightInputs = ['#pic-weight', '#sic-weight', '#hop-weight'];
    weightInputs.forEach(selector => {
      const input = domCache.get(selector);
      if (input) {
        const cleanup = addEventListenerWithCleanup(input, 'input', () => {
          this.updateCrewWeight(input);
        });
        this.eventCleanupFunctions.push(cleanup);
      }
    });
    
    // Weather inputs
    const weatherInputs = ['#wind-speed', '#wind-direction', '#temperature', '#wind-benefits'];
    weatherInputs.forEach(selector => {
      const input = domCache.get(selector);
      if (input) {
        const cleanup = addEventListenerWithCleanup(input, 'input', () => {
          this.updateWeatherData();
        });
        this.eventCleanupFunctions.push(cleanup);
      }
    });
  }

  /**
   * Auto-update calculation display when FlightCalculator completes calculations
   * @private
   */
  autoUpdateCalculationDisplay() {
    try {
      if (!this.flightCalculator) {
        console.warn('FlightCalculator not available for auto-update');
        return;
      }
      
      // Update immediately if we're on calculation panel, or store flag for later
      if (this.currentPanel === 'calculation') {
        console.log('🔄 Auto-updating calculation display');
        this.performCalculations();
      } else {
        console.log('💡 Calculation completed, but not on calculation panel - will update when panel opens');
        this.needsCalculationUpdate = true;
      }
      
    } catch (error) {
      console.error('Error in auto-update calculation display:', error);
    }
  }

  /**
   * Perform comprehensive flight calculations
   * @private
   */
  performCalculations() {
    try {
      if (!this.flightCalculator) {
        this.showError('Flight calculator not available');
        return;
      }
      
      // Calculate fuel with waypoint-by-waypoint tracking
      const fuelResult = this.flightCalculator.calculateFuel();
      if (!fuelResult.success) {
        this.showError(fuelResult.error);
        return;
      }
      
      // Calculate comprehensive performance (DOM, HOGE, Payload)
      const performanceResult = this.flightCalculator.calculatePerformance();
      if (!performanceResult.success) {
        this.showError(performanceResult.error);
        return;
      }
      
      // Update UI with comprehensive results
      this.updateCalculationDisplay(fuelResult, performanceResult);
      
      // Generate detailed analysis for advanced users
      const analysisResult = this.flightCalculator.generateComprehensiveAnalysis();
      if (analysisResult.success) {
        console.log('📊 Flight Analysis:', analysisResult.analysis);
        
        // Show any critical warnings or recommendations
        this.displayAnalysisWarnings(analysisResult.analysis);
      }
      
      this.showMessage('Flight calculations completed successfully', 'success');
      
    } catch (error) {
      console.error('Error performing calculations:', error);
      this.showError('Calculation failed. Please check your route and inputs.');
    }
  }

  /**
   * Update calculation display with comprehensive results
   * @private
   * @param {Object} fuelResult - Fuel calculation results
   * @param {Object} performanceResult - Performance calculation results
   */
  updateCalculationDisplay(fuelResult, performanceResult) {
    try {
      const fuel = fuelResult.fuel;
      const performance = performanceResult.performance;
      const calculations = performanceResult.calculations;
      
      // Update fuel displays with detailed breakdown
      const tripDuration = domCache.get('#trip-duration');
      const tripFuel = domCache.get('#trip-fuel');
      const contingencyDuration = domCache.get('#contingency-duration');
      const contingencyFuel = domCache.get('#contingency-fuel');
      const totalFuel = domCache.get('#total-fuel');
      
      if (tripDuration) tripDuration.textContent = `${fuelResult.tripTime} min`;
      if (tripFuel) tripFuel.textContent = `${fuel.trip} kg`;
      if (contingencyDuration) contingencyDuration.textContent = `${Math.round(fuelResult.tripTime * 0.1)} min`;
      if (contingencyFuel) contingencyFuel.textContent = `${fuel.contingency} kg`;
      if (totalFuel) totalFuel.textContent = `${fuel.total} kg`;
      
      // Update performance displays with new comprehensive data
      const hogeValue = domCache.get('#hoge-value');
      const payloadValue = domCache.get('#payload-value');
      
      if (hogeValue) {
        hogeValue.textContent = `${performance.hoge} kg`;
        // Add hover tooltip with calculation details
        hogeValue.title = `HOGE calculated with temperature ${calculations?.hoge?.conditions?.temperature || 25}°C, DOM ${performance.dom} kg`;
      }
      
      if (payloadValue) {
        payloadValue.textContent = `${performance.payloadAvailable} kg`;
        // Add hover tooltip with calculation breakdown
        payloadValue.title = `Available Payload = HOGE (${performance.hoge}kg) - Fuel at Critical Point (${performance.fuelAtCriticalPoint}kg) - DOM (${performance.dom}kg)`;
      }
      
      // Update status indicator and message based on comprehensive analysis
      this.updateStatusIndicator(performance, fuel);
      
      // Display additional calculation details if elements exist
      this.updateDetailedCalculationInfo(fuelResult, performanceResult);
      
      console.log('✅ Calculation display updated with comprehensive results');
      
    } catch (error) {
      console.error('Error updating calculation display:', error);
    }
  }

  /**
   * Update discretion fuel
   * @private
   */
  updateDiscretionFuel() {
    try {
      const discretionInput = domCache.get('#discretion-fuel');
      if (!discretionInput || !this.flightCalculator) return;
      
      const value = parseFloat(discretionInput.value) || 0;
      const result = this.flightCalculator.updateDiscretionFuel(value);
      
      if (!result.success) {
        showFieldError(discretionInput, result.error);
      } else {
        clearFieldError(discretionInput);
        // Trigger recalculation
        this.performCalculations();
      }
    } catch (error) {
      console.error('Error updating discretion fuel:', error);
    }
  }

  /**
   * Update crew weight
   * @private
   * @param {HTMLElement} input - Weight input element
   */
  updateCrewWeight(input) {
    try {
      if (!this.flightCalculator) return;
      
      const value = parseFloat(input.value) || CONFIG.FLIGHT.DEFAULT_CREW_WEIGHT;
      let role;
      
      if (input.id === 'pic-weight') role = 'pic';
      else if (input.id === 'sic-weight') role = 'sic';
      else if (input.id === 'hop-weight') role = 'hop';
      
      if (role) {
        const result = this.flightCalculator.updateCrewData({ 
          role, 
          weight: value,
          name: this.flightCalculator.getCrewData()[role]?.name || ''
        });
        
        if (!result.success) {
          showFieldError(input, result.error);
        } else {
          clearFieldError(input);
          // Trigger recalculation
          this.performCalculations();
        }
      }
    } catch (error) {
      console.error('Error updating crew weight:', error);
    }
  }

  /**
   * Update weather data
   * @private
   */
  updateWeatherData() {
    try {
      if (!this.flightCalculator) return;
      
      const windSpeed = parseFloat(domCache.get('#wind-speed')?.value) || 0;
      const windDirection = parseFloat(domCache.get('#wind-direction')?.value) || 0;
      const temperature = parseFloat(domCache.get('#temperature')?.value) || 25;
      const windBenefits = parseFloat(domCache.get('#wind-benefits')?.value) || 75;
      
      const result = this.flightCalculator.updateWeatherData({
        windSpeed,
        windDirection,
        temperature,
        windBenefits
      });
      
      if (!result.success) {
        if (result.errors) {
          result.errors.forEach(error => {
            const input = domCache.get(`#${error.field.replace('Data', '').replace(/([A-Z])/g, '-$1').toLowerCase()}`);
            if (input) {
              showFieldError(input, error.message);
            }
          });
        }
      } else {
        // Clear any existing errors
        ['#wind-speed', '#wind-direction', '#temperature', '#wind-benefits'].forEach(selector => {
          const input = domCache.get(selector);
          if (input) clearFieldError(input);
        });
        
        // Trigger recalculation
        this.performCalculations();
      }
    } catch (error) {
      console.error('Error updating weather data:', error);
    }
  }

  /**
   * Update status indicator based on performance analysis
   * @private
   * @param {Object} performance - Performance data
   * @param {Object} fuel - Fuel data
   */
  updateStatusIndicator(performance, fuel) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (!statusDot || !statusText) return;
    
    let status = 'success';
    let message = 'Performance calculations ready';
    let dotClass = 'w-2 h-2 bg-[#16a34a] rounded-full animate-pulse';
    
    // Check for critical conditions
    if (performance.payloadAvailable < 100) {
      status = 'critical';
      message = 'Critical: Very low payload capacity';
      dotClass = 'w-2 h-2 bg-[#ef4444] rounded-full animate-pulse';
    } else if (performance.payloadAvailable < 300) {
      status = 'warning';
      message = 'Warning: Limited payload capacity';
      dotClass = 'w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse';
    } else if (performance.fuelAtCriticalPoint < 100) {
      status = 'warning';
      message = 'Warning: Low fuel at critical point';
      dotClass = 'w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse';
    }
    
    statusDot.className = dotClass;
    statusText.textContent = message;
  }
  
  /**
   * Update detailed calculation information
   * @private
   * @param {Object} fuelResult - Fuel calculation results
   * @param {Object} performanceResult - Performance calculation results
   */
  updateDetailedCalculationInfo(fuelResult, performanceResult) {
    try {
      // Add route analysis information if route data exists
      if (fuelResult.waypointFuelData && fuelResult.waypointFuelData.length > 0) {
        console.log('🗺️ Route Analysis:');
        fuelResult.waypointFuelData.forEach(wp => {
          console.log(`  ${wp.waypoint}: ${wp.fuelRemaining}kg fuel, ${wp.cumulativeTime}min`);
        });
      }
      
      // Add critical point analysis
      if (fuelResult.criticalPointFuel) {
        console.log(`🔴 Critical Point Fuel: ${fuelResult.criticalPointFuel}kg`);
      }
      
      // Add DOM breakdown
      const performance = performanceResult.performance;
      console.log(`⚙️ Performance Summary:`);
      console.log(`  DOM: ${performance.dom}kg (Empty: ${performance.aircraftEmptyWeight}kg + Crew: ${performance.totalCrewWeight}kg)`);
      console.log(`  HOGE: ${performance.hoge}kg`);
      console.log(`  Payload Available: ${performance.payloadAvailable}kg`);
      
    } catch (error) {
      console.error('Error updating detailed calculation info:', error);
    }
  }
  
  /**
   * Display analysis warnings and recommendations
   * @private
   * @param {Object} analysis - Comprehensive flight analysis
   */
  displayAnalysisWarnings(analysis) {
    try {
      // Display critical limitations
      if (analysis.limitations && analysis.limitations.length > 0) {
        analysis.limitations.forEach(limitation => {
          if (limitation.severity === 'Critical') {
            this.showError(`Critical: ${limitation.message}`);
          } else if (limitation.severity === 'High') {
            this.showMessage(`⚠️ ${limitation.message}`, 'warning');
          }
        });
      }
      
      // Display key recommendations (limit to most important)
      if (analysis.recommendations && analysis.recommendations.length > 0) {
        const keyRecommendations = analysis.recommendations.slice(0, 2); // Show top 2
        keyRecommendations.forEach(recommendation => {
          console.log(`💡 Recommendation: ${recommendation}`);
        });
      }
      
    } catch (error) {
      console.error('Error displaying analysis warnings:', error);
    }
  }
  
  /**
   * Generate comprehensive OFP (Operational Flight Plan)
   * @private
   */
  generateOFP() {
    try {
      if (!this.flightCalculator) {
        this.showError('Flight calculator not available');
        return;
      }
      
      // Validate all data first
      const validation = this.flightCalculator.validateAllData();
      if (!validation.isValid) {
        this.showError('Please correct all validation errors before generating OFP');
        return;
      }
      
      // Generate comprehensive flight summary
      const summary = this.flightCalculator.generateFlightSummary();
      
      // Generate route analysis
      const routeAnalysis = this.flightCalculator.getRouteAnalysis();
      
      // Show comprehensive OFP summary
      this.showOFPSummary(summary, routeAnalysis);
      
    } catch (error) {
      console.error('Error generating OFP:', error);
      this.showError('Failed to generate OFP');
    }
  }

  /**
   * Show comprehensive OFP summary modal/dialog
   * @private
   * @param {Object} summary - Flight summary data
   * @param {Object} routeAnalysis - Route analysis data (optional)
   */
  showOFPSummary(summary, routeAnalysis = null) {
    // Create modal overlay
    const modal = createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center z-[1001]',
      style: 'backdrop-filter: blur(4px);'
    });
    
    // Create modal content
    const content = createElement('div', {
      className: 'bg-[#1c1f26] rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto',
      style: 'box-shadow: 0 20px 60px rgba(0,0,0,0.5);'
    });
    
    // Modal header
    const header = createElement('div', {
      className: 'flex items-center justify-between mb-6'
    });
    
    const title = createElement('h2', {
      className: 'text-white text-xl font-bold z-[10000]'
    }, 'Operational Flight Plan Summary');
    
    const closeBtn = createElement('button', {
      className: 'text-[#a0a9bb] hover:text-white transition-colors',
      onClick: () => document.body.removeChild(modal)
    });
    closeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
        <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
      </svg>
    `;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Modal body with summary
    const body = createElement('div', {
      className: 'space-y-4 text-white'
    });
    
    // Add comprehensive summary sections
    this.addOFPSection(body, 'Flight Information', {
      'Route': `${summary.route.waypointCount} waypoints, ${summary.route.totalDistance}, ${summary.route.totalFlightTime}`,
      'Critical Point': summary.route.criticalPoint || 'Not identified'
    });
    
    // Route Legs Section
    if (summary.route.legs && summary.route.legs.length > 0) {
      const routeSection = createElement('div', {
        className: 'bg-[#20242d] rounded-lg p-4'
      });
      
      const routeTitle = createElement('h3', {
        className: 'text-[#2563eb] font-semibold mb-2'
      }, 'Route Legs');
      routeSection.appendChild(routeTitle);
      
      summary.route.legs.forEach((leg, index) => {
        const legDiv = createElement('div', {
          className: 'flex justify-between py-1 text-sm border-b border-[#2c333f] last:border-b-0'
        });
        
        const legInfo = createElement('span', {
          className: 'text-[#a0a9bb]'
        }, `${leg.from} → ${leg.to}`);
        
        const legDetails = createElement('span', {
          className: 'text-white'
        }, `${leg.distance}, ${leg.course}, ${leg.time}`);
        
        legDiv.appendChild(legInfo);
        legDiv.appendChild(legDetails);
        routeSection.appendChild(legDiv);
      });
      
      body.appendChild(routeSection);
    }
    
    // Fuel Analysis Section
    this.addOFPSection(body, 'Fuel Analysis', {
      'Total Required': summary.fuel.total,
      'Minimum Required': summary.fuel.minimumRequired,
      'At Critical Point': summary.fuel.atCriticalPoint,
      'Breakdown': `Taxi: ${summary.fuel.breakdown.taxi}, Trip: ${summary.fuel.breakdown.trip}, Reserves: ${summary.fuel.breakdown.finalReserve} + ${summary.fuel.breakdown.contingency}`
    });
    
    // Performance Section
    this.addOFPSection(body, 'Performance', {
      'HOGE Capacity': summary.performance.hoge,
      'Payload Available': summary.performance.payloadAvailable,
      'DOM': `${summary.crew.dom} (${summary.performance.aircraftEmptyWeight} + ${summary.performance.totalWeight - summary.performance.aircraftEmptyWeight})`,
      'Status': summary.performance.status?.message || 'Normal'
    });
    
    // Weather & Navigation Section
    this.addOFPSection(body, 'Weather & Navigation', {
      'Temperature': summary.weather.temperature,
      'Wind': summary.weather.wind,
      'Magnetic Variation': summary.weather.magneticVariation,
      'True Airspeed': summary.calculations.trueAirspeed,
      'Fuel Consumption': summary.calculations.fuelConsumptionRate
    });
    
    // Waypoint Fuel Analysis (if available)
    if (summary.fuel.waypointFuel && summary.fuel.waypointFuel.length > 0) {
      const fuelSection = createElement('div', {
        className: 'bg-[#20242d] rounded-lg p-4'
      });
      
      const fuelTitle = createElement('h3', {
        className: 'text-[#2563eb] font-semibold mb-2'
      }, 'Fuel Remaining at Waypoints');
      fuelSection.appendChild(fuelTitle);
      
      summary.fuel.waypointFuel.forEach(wp => {
        const wpDiv = createElement('div', {
          className: 'flex justify-between py-1 text-sm'
        });
        
        const wpName = createElement('span', {
          className: 'text-[#a0a9bb]'
        }, wp.waypoint);
        
        const wpFuel = createElement('span', {
          className: 'text-white'
        }, `${wp.fuelRemaining} @ ${wp.time}`);
        
        wpDiv.appendChild(wpName);
        wpDiv.appendChild(wpFuel);
        fuelSection.appendChild(wpDiv);
      });
      
      body.appendChild(fuelSection);
    }
    
    // Modal footer
    const footer = createElement('div', {
      className: 'flex justify-end gap-3 mt-6'
    });
    
    const printBtn = createElement('button', {
      className: 'px-4 py-2 bg-[#2a2f3a] text-white rounded-lg hover:bg-[#3a3f4a] transition-colors',
      onClick: () => window.print()
    }, 'Print');
    
    const closeFooterBtn = createElement('button', {
      className: 'px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors',
      onClick: () => document.body.removeChild(modal)
    }, 'Close');
    
    footer.appendChild(printBtn);
    footer.appendChild(closeFooterBtn);
    
    // Assemble modal
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);
    
    // Add to document
    document.body.appendChild(modal);
    
    // Focus management
    closeBtn.focus();
    
    // Close on escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Get current panel
   * @returns {string} Current panel name
   */
  getCurrentPanel() {
    return this.currentPanel;
  }

  /**
   * Get selected flight method
   * @returns {string|null} Selected flight method
   */
  getFlightMethod() {
    return this.flightMethod;
  }

  /**
   * Show message to user
   * @private
   * @param {string} message - Message text
   * @param {string} type - Message type
   */
  showMessage(message, type = 'info') {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    const messageDiv = createElement('div', {
      className: 'ui-message-notification',
      style: `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10010;
        font-size: 14px;
        font-weight: 500;
        min-width: 200px;
        text-align: center;
      `
    }, message);
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  /**
   * Show error message
   * @private
   * @param {string} message - Error message
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * Helper method to create OFP sections
   * @private
   * @param {HTMLElement} container - Container element
   * @param {string} title - Section title
   * @param {Object} data - Section data
   */
  addOFPSection(container, title, data) {
    const sectionDiv = createElement('div', {
      className: 'bg-[#20242d] rounded-lg p-4'
    });
    
    const sectionTitle = createElement('h3', {
      className: 'text-[#2563eb] font-semibold mb-2'
    }, title);
    
    sectionDiv.appendChild(sectionTitle);
    
    Object.entries(data).forEach(([key, value]) => {
      const item = createElement('div', {
        className: 'flex justify-between py-1'
      });
      
      const label = createElement('span', {
        className: 'text-[#a0a9bb] text-sm'
      }, key);
      
      const valueSpan = createElement('span', {
        className: 'text-white text-sm font-medium'
      }, value.toString());
      
      item.appendChild(label);
      item.appendChild(valueSpan);
      sectionDiv.appendChild(item);
    });
    
    container.appendChild(sectionDiv);
  }

  /**
   * Check if UI manager is initialized
   * @returns {boolean} True if initialized
   */
  isUIInitialized() {
    return this.isInitialized;
  }

  /**
   * Destroy UI manager and clean up resources
   */
  destroy() {
    // Clean up event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];
    
    // Clean up state subscriptions
    this.stateUnsubscribeFunctions.forEach(cleanup => cleanup());
    this.stateUnsubscribeFunctions = [];
    
    // Clear form validations
    const inputs = document.querySelectorAll('#flight-info-panel input, #calculation-panel input');
    inputs.forEach(input => {
      clearFieldError(input);
    });
    
    // Reset state
    this.currentPanel = 'route';
    this.flightMethod = null;
    this.isInitialized = false;
    
    console.log('UIManager destroyed');
  }
}