/**
 * Security utilities for preventing XSS and ensuring safe data handling
 * Provides functions for input sanitization and secure DOM manipulation
 */

/**
 * HTML entities for encoding
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') {
    return String(text);
  }
  
  return text.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Sanitize HTML content by removing dangerous elements and attributes
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (typeof html !== 'string') {
    return '';
  }
  
  // Create a temporary DOM element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove all script tags
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove dangerous attributes
  const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'];
  const allElements = temp.querySelectorAll('*');
  
  allElements.forEach(element => {
    // Remove dangerous attributes
    dangerousAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });
    
    // Remove any attribute that starts with 'on'
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
    
    // Remove javascript: URLs
    ['href', 'src', 'action'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value && value.toLowerCase().startsWith('javascript:')) {
        element.removeAttribute(attr);
      }
    });
  });
  
  return temp.innerHTML;
}

/**
 * Validate and sanitize user input
 * @param {string} input - User input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, options = {}) {
  const {
    allowHTML = false,
    maxLength = 1000,
    allowedChars = null
  } = options;
  
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Filter allowed characters if specified
  if (allowedChars) {
    const regex = new RegExp(`[^${allowedChars}]`, 'g');
    sanitized = sanitized.replace(regex, '');
  }
  
  // Escape HTML if not allowed
  if (!allowHTML) {
    sanitized = escapeHTML(sanitized);
  } else {
    sanitized = sanitizeHTML(sanitized);
  }
  
  return sanitized;
}

/**
 * Validate file name to prevent path traversal attacks
 * @param {string} filename - File name to validate
 * @returns {boolean} True if filename is safe
 */
export function isValidFilename(filename) {
  if (typeof filename !== 'string' || filename.length === 0) {
    return false;
  }
  
  // Check for path traversal attempts
  const dangerousPatterns = [
    /\.\./,          // Parent directory traversal
    /[\/\\]/,        // Path separators
    /^[.-]/,         // Starting with dot or dash
    /[\x00-\x1f]/,   // Control characters
    /[<>:"|?*]/      // Invalid filename characters
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(filename));
}

/**
 * Generate a secure random ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID
 */
export function generateSecureId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}

/**
 * Content Security Policy utilities
 */
export class CSPHelper {
  /**
   * Check if inline styles are allowed by CSP
   * @returns {boolean} True if inline styles are allowed
   */
  static isInlineStyleAllowed() {
    try {
      const testElement = document.createElement('div');
      testElement.style.display = 'none';
      document.body.appendChild(testElement);
      const allowed = testElement.style.display === 'none';
      document.body.removeChild(testElement);
      return allowed;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Apply styles safely considering CSP
   * @param {HTMLElement} element - Target element
   * @param {Object} styles - Styles to apply
   */
  static applyStyles(element, styles) {
    if (this.isInlineStyleAllowed()) {
      Object.assign(element.style, styles);
    } else {
      // Add class-based styles as fallback
      Object.entries(styles).forEach(([property, value]) => {
        element.style.setProperty(property, value);
      });
    }
  }
}

/**
 * URL validation utilities
 */
export class URLValidator {
  /**
   * List of allowed protocols
   */
  static ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:'];
  
  /**
   * Validate URL for safety
   * @param {string} url - URL to validate
   * @param {Array} allowedProtocols - Allowed protocols (optional)
   * @returns {boolean} True if URL is safe
   */
  static isValidURL(url, allowedProtocols = this.ALLOWED_PROTOCOLS) {
    try {
      const urlObj = new URL(url);
      return allowedProtocols.includes(urlObj.protocol);
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Sanitize URL to prevent XSS
   * @param {string} url - URL to sanitize
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static sanitizeURL(url) {
    if (!this.isValidURL(url)) {
      return null;
    }
    
    try {
      const urlObj = new URL(url);
      // Remove any javascript: protocol attempts
      if (urlObj.protocol === 'javascript:') {
        return null;
      }
      return urlObj.toString();
    } catch (e) {
      return null;
    }
  }
}

/**
 * Rate limiting for preventing abuse
 */
export class RateLimiter {
  constructor(maxRequests = 100, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }
  
  /**
   * Check if request is allowed
   * @param {string} identifier - Request identifier (IP, user ID, etc.)
   * @returns {boolean} True if request is allowed
   */
  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside time window
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  /**
   * Get remaining requests for identifier
   * @param {string} identifier - Request identifier
   * @returns {number} Remaining requests
   */
  getRemainingRequests(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
  
  /**
   * Clear all rate limit data
   */
  clear() {
    this.requests.clear();
  }
}

/**
 * Input validation patterns
 */
export const VALIDATION_PATTERNS = {
  // Safe filename pattern (letters, numbers, dots, hyphens, underscores)
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  
  // Basic email pattern
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Alphanumeric with spaces
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,
  
  // Numbers only
  NUMERIC: /^[0-9]+$/,
  
  // Decimal numbers
  DECIMAL: /^[0-9]+(\.[0-9]+)?$/,
  
  // Hexadecimal color
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  
  // Aircraft callsign (letters, numbers, hyphens)
  CALLSIGN: /^[A-Z0-9-]+$/i
};

/**
 * Validate input against pattern
 * @param {string} input - Input to validate
 * @param {RegExp} pattern - Pattern to match against
 * @returns {boolean} True if input matches pattern
 */
export function validatePattern(input, pattern) {
  return typeof input === 'string' && pattern.test(input);
}