/**
 * Validation utilities for form inputs and data validation
 * Provides comprehensive validation with user-friendly error messages
 */

import { CONFIG } from '../../config.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {string} message - Error message if validation failed
 * @property {*} value - Processed/sanitized value
 */

/**
 * Base validator class
 */
class Validator {
  constructor(value, fieldName = 'Field') {
    this.value = value;
    this.fieldName = fieldName;
    this.rules = [];
  }
  
  /**
   * Add required validation
   * @param {string} message - Custom error message
   * @returns {Validator} This validator for chaining
   */
  required(message = null) {
    this.rules.push({
      test: (value) => value !== null && value !== undefined && String(value).trim() !== '',
      message: message || `${this.fieldName} is required`
    });
    return this;
  }
  
  /**
   * Add numeric validation
   * @param {string} message - Custom error message
   * @returns {Validator} This validator for chaining
   */
  numeric(message = null) {
    this.rules.push({
      test: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
      message: message || `${this.fieldName} must be a valid number`
    });
    return this;
  }
  
  /**
   * Add minimum value validation
   * @param {number} min - Minimum value
   * @param {string} message - Custom error message
   * @returns {Validator} This validator for chaining
   */
  min(min, message = null) {
    this.rules.push({
      test: (value) => parseFloat(value) >= min,
      message: message || `${this.fieldName} must be at least ${min}`
    });
    return this;
  }
  
  /**
   * Add maximum value validation
   * @param {number} max - Maximum value
   * @param {string} message - Custom error message
   * @returns {Validator} This validator for chaining
   */
  max(max, message = null) {
    this.rules.push({
      test: (value) => parseFloat(value) <= max,
      message: message || `${this.fieldName} must be at most ${max}`
    });
    return this;
  }
  
  /**
   * Add string length validation
   * @param {number} minLength - Minimum length
   * @param {number} maxLength - Maximum length
   * @param {string} message - Custom error message
   * @returns {Validator} This validator for chaining
   */
  length(minLength, maxLength = null, message = null) {
    this.rules.push({
      test: (value) => {
        const str = String(value);
        const valid = str.length >= minLength && (maxLength === null || str.length <= maxLength);
        return valid;
      },
      message: message || `${this.fieldName} must be between ${minLength} and ${maxLength || 'unlimited'} characters`
    });
    return this;
  }
  
  /**
   * Add email validation
   * @param {string} message - Custom error message
   * @returns {Validator} This validator for chaining
   */
  email(message = null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.rules.push({
      test: (value) => emailRegex.test(String(value)),
      message: message || `${this.fieldName} must be a valid email address`
    });
    return this;
  }
  
  /**
   * Add custom validation rule
   * @param {Function} testFn - Test function that returns boolean
   * @param {string} message - Error message
   * @returns {Validator} This validator for chaining
   */
  custom(testFn, message) {
    this.rules.push({
      test: testFn,
      message: message
    });
    return this;
  }
  
  /**
   * Execute validation
   * @returns {ValidationResult} Validation result
   */
  validate() {
    let processedValue = this.value;
    
    // Skip validation if value is empty and not required
    const hasRequiredRule = this.rules.some(rule => rule.message.includes('required'));
    if (!hasRequiredRule && (this.value === null || this.value === undefined || String(this.value).trim() === '')) {
      return {
        isValid: true,
        message: '',
        value: processedValue
      };
    }
    
    for (const rule of this.rules) {
      if (!rule.test(this.value)) {
        return {
          isValid: false,
          message: rule.message,
          value: null
        };
      }
    }
    
    // Process value based on validation type
    if (this.rules.some(rule => rule.message.includes('number'))) {
      processedValue = parseFloat(this.value);
    }
    
    return {
      isValid: true,
      message: '',
      value: processedValue
    };
  }
}

/**
 * Create a new validator
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Validator} New validator instance
 */
export function validate(value, fieldName = 'Field') {
  return new Validator(value, fieldName);
}

/**
 * Validate flight crew weight
 * @param {number} weight - Weight value
 * @param {string} crewRole - Role name (PIC, SIC, HOP)
 * @returns {ValidationResult} Validation result
 */
export function validateCrewWeight(weight, crewRole) {
  return validate(weight, `${crewRole} weight`)
    .required()
    .numeric()
    .min(30, `${crewRole} weight must be at least 30 kg`)
    .max(150, `${crewRole} weight must be at most 150 kg`)
    .validate();
}

/**
 * Validate weather data
 * @param {Object} weatherData - Weather data object
 * @returns {Object} Validation results for each field
 */
export function validateWeatherData(weatherData) {
  const results = {};
  
  results.windSpeed = validate(weatherData.windSpeed, 'Wind speed')
    .numeric()
    .min(0, 'Wind speed cannot be negative')
    .max(100, 'Wind speed seems unrealistic (max 100 kts)')
    .validate();
    
  results.windDirection = validate(weatherData.windDirection, 'Wind direction')
    .numeric()
    .min(0, 'Wind direction must be between 0 and 360 degrees')
    .max(360, 'Wind direction must be between 0 and 360 degrees')
    .validate();
    
  results.temperature = validate(weatherData.temperature, 'Temperature')
    .numeric()
    .min(-50, 'Temperature seems too low (min -50°C)')
    .max(60, 'Temperature seems too high (max 60°C)')
    .validate();
    
  results.windBenefits = validate(weatherData.windBenefits, 'Wind benefits')
    .numeric()
    .min(0, 'Wind benefits cannot be negative')
    .max(100, 'Wind benefits cannot exceed 100%')
    .validate();
  
  return results;
}

/**
 * Validate helicopter callsign
 * @param {string} callsign - Callsign value
 * @returns {ValidationResult} Validation result
 */
export function validateCallsign(callsign) {
  return validate(callsign, 'Helicopter callsign')
    .required()
    .length(2, 10, 'Callsign must be between 2 and 10 characters')
    .custom(
      (value) => /^[A-Z0-9-]+$/i.test(value),
      'Callsign can only contain letters, numbers, and hyphens'
    )
    .validate();
}

/**
 * Validate crew member name
 * @param {string} name - Name value
 * @param {string} role - Crew role
 * @returns {ValidationResult} Validation result
 */
export function validateCrewName(name, role) {
  return validate(name, `${role} name`)
    .required()
    .length(2, 50, `${role} name must be between 2 and 50 characters`)
    .custom(
      (value) => /^[A-Za-z\s.'-]+$/.test(value),
      `${role} name can only contain letters, spaces, periods, apostrophes, and hyphens`
    )
    .validate();
}

/**
 * Validate fuel amount
 * @param {number} fuel - Fuel amount in kg
 * @param {string} fuelType - Type of fuel (discretion, etc.)
 * @returns {ValidationResult} Validation result
 */
export function validateFuelAmount(fuel, fuelType = 'fuel') {
  return validate(fuel, fuelType)
    .numeric()
    .min(0, `${fuelType} cannot be negative`)
    .max(2000, `${fuelType} seems unrealistic (max 2000 kg)`)
    .validate();
}

/**
 * Show validation error on form field
 * @param {HTMLElement} field - Form field element
 * @param {string} message - Error message
 */
export function showFieldError(field, message) {
  // Remove existing error
  clearFieldError(field);
  
  // Add error class
  field.classList.add('border-red-500', 'bg-red-50');
  field.setAttribute('aria-invalid', 'true');
  
  // Create error message element
  const errorElement = document.createElement('div');
  errorElement.className = 'text-red-500 text-sm mt-1 field-error';
  errorElement.textContent = message;
  errorElement.setAttribute('role', 'alert');
  
  // Insert error message after field
  field.parentNode.insertBefore(errorElement, field.nextSibling);
  
  // Set ARIA description
  const errorId = `error-${Date.now()}`;
  errorElement.id = errorId;
  field.setAttribute('aria-describedby', errorId);
}

/**
 * Clear validation error from form field
 * @param {HTMLElement} field - Form field element
 */
export function clearFieldError(field) {
  // Remove error classes
  field.classList.remove('border-red-500', 'bg-red-50');
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-describedby');
  
  // Remove error message
  const errorElement = field.parentNode.querySelector('.field-error');
  if (errorElement) {
    errorElement.remove();
  }
}

/**
 * Show field success state
 * @param {HTMLElement} field - Form field element
 */
export function showFieldSuccess(field) {
  clearFieldError(field);
  field.classList.add('border-green-500');
  
  // Remove success state after a delay
  setTimeout(() => {
    field.classList.remove('border-green-500');
  }, 2000);
}

/**
 * Validate form data and show errors
 * @param {Object} formData - Form data to validate
 * @param {Object} validationRules - Validation rules mapping
 * @param {HTMLElement} form - Form element
 * @returns {boolean} True if all validations pass
 */
export function validateForm(formData, validationRules, form) {
  let allValid = true;
  
  Object.entries(validationRules).forEach(([fieldName, validationFn]) => {
    const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
    if (!field) return;
    
    const result = validationFn(formData[fieldName]);
    
    if (result.isValid) {
      showFieldSuccess(field);
    } else {
      showFieldError(field, result.message);
      allValid = false;
    }
  });
  
  return allValid;
}