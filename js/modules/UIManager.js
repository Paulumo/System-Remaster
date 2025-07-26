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
      return false;
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
   * Perform flight calculations
   * @private
   */
  performCalculations() {
    try {
      if (!this.flightCalculator) {
        this.showError('Flight calculator not available');
        return;
      }
      
      // Calculate fuel
      const fuelResult = this.flightCalculator.calculateFuel();
      if (!fuelResult.success) {
        this.showError(fuelResult.error);
        return;
      }
      
      // Calculate performance
      const performanceResult = this.flightCalculator.calculatePerformance();
      if (!performanceResult.success) {
        this.showError(performanceResult.error);
        return;
      }
      
      // Update UI with results
      this.updateCalculationDisplay(fuelResult, performanceResult);
      
      this.showMessage(CONFIG.SUCCESS.CALCULATION_COMPLETE, 'success');
      
    } catch (error) {
      console.error('Error performing calculations:', error);
      this.showError(CONFIG.ERRORS.CALCULATION_ERROR);
    }
  }

  /**
   * Update calculation display with results
   * @private
   * @param {Object} fuelResult - Fuel calculation results
   * @param {Object} performanceResult - Performance calculation results
   */
  updateCalculationDisplay(fuelResult, performanceResult) {
    try {
      const fuel = fuelResult.fuel;
      const performance = performanceResult.performance;
      
      // Update fuel displays
      const tripDuration = domCache.get('#trip-duration');
      const tripFuel = domCache.get('#trip-fuel');
      const contingencyDuration = domCache.get('#contingency-duration');
      const contingencyFuel = domCache.get('#contingency-fuel');
      const totalFuel = domCache.get('#total-fuel');
      
      if (tripDuration) tripDuration.textContent = `${Math.round(fuelResult.tripTime)} min`;
      if (tripFuel) tripFuel.textContent = `${fuel.trip} kg`;
      if (contingencyDuration) contingencyDuration.textContent = `${Math.round(fuelResult.tripTime * 0.1)} min`;
      if (contingencyFuel) contingencyFuel.textContent = `${fuel.contingency} kg`;
      if (totalFuel) totalFuel.textContent = `${fuel.total} kg`;
      
      // Update performance displays
      const hogeValue = domCache.get('#hoge-value');
      const payloadValue = domCache.get('#payload-value');
      
      if (hogeValue) hogeValue.textContent = `${performance.hoge} kg`;
      if (payloadValue) payloadValue.textContent = `${performance.payload} kg`;
      
      // Update status indicator color based on performance
      const statusIndicator = document.querySelector('.w-2.h-2.bg-\\[\\#16a34a\\]');
      if (statusIndicator && (performance.hoge < 100 || performance.payload < 100)) {
        statusIndicator.className = 'w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse';
      }
      
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
   * Generate OFP (Operational Flight Plan)
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
      
      // Generate flight summary
      const summary = this.flightCalculator.generateFlightSummary();
      
      // For now, show a detailed summary
      // In a real implementation, this would generate a PDF or formatted document
      this.showOFPSummary(summary);
      
    } catch (error) {
      console.error('Error generating OFP:', error);
      this.showError('Failed to generate OFP');
    }
  }

  /**
   * Show OFP summary modal/dialog
   * @private
   * @param {Object} summary - Flight summary data
   */
  showOFPSummary(summary) {
    // Create modal overlay
    const modal = createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center',
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
      className: 'text-white text-xl font-bold'
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
    
    // Add summary sections
    Object.entries(summary).forEach(([section, data]) => {
      const sectionDiv = createElement('div', {
        className: 'bg-[#20242d] rounded-lg p-4'
      });
      
      const sectionTitle = createElement('h3', {
        className: 'text-[#2563eb] font-semibold mb-2 capitalize'
      }, section.replace(/([A-Z])/g, ' $1'));
      
      sectionDiv.appendChild(sectionTitle);
      
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.entries(data).forEach(([key, value]) => {
          const item = createElement('div', {
            className: 'flex justify-between py-1'
          });
          
          const label = createElement('span', {
            className: 'text-[#a0a9bb]'
          }, key.replace(/([A-Z])/g, ' $1'));
          
          const valueSpan = createElement('span', {}, 
            Array.isArray(value) ? value.join(', ') : value.toString()
          );
          
          item.appendChild(label);
          item.appendChild(valueSpan);
          sectionDiv.appendChild(item);
        });
      } else if (Array.isArray(data)) {
        data.forEach(item => {
          const itemDiv = createElement('div', {
            className: 'py-1 text-[#a0a9bb]'
          }, item);
          sectionDiv.appendChild(itemDiv);
        });
      }
      
      body.appendChild(sectionDiv);
    });
    
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
        z-index: 10002;
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