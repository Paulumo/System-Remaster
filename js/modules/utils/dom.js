/**
 * DOM Utility functions for safe and efficient DOM manipulation
 * Provides secure methods to prevent XSS and improve performance
 */

/**
 * Safely create an HTML element with attributes and children
 * @param {string} tagName - The HTML tag name
 * @param {Object} attributes - Object containing attributes to set
 * @param {...(string|HTMLElement)} children - Child elements or text content
 * @returns {HTMLElement} The created element
 */
export function createElement(tagName, attributes = {}, ...children) {
  const element = document.createElement(tagName);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Safely set text content (prevents XSS)
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to set
 */
export function setTextContent(element, text) {
  element.textContent = text || '';
}

/**
 * Safely set HTML content with sanitization
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content to set
 */
export function setHTMLContent(element, html) {
  // Basic HTML sanitization - remove script tags and on* attributes
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, '');
  
  element.innerHTML = sanitized;
}

/**
 * Efficiently query and cache DOM elements
 */
class DOMCache {
  constructor() {
    this.cache = new Map();
  }
  
  /**
   * Get element by selector with caching
   * @param {string} selector - CSS selector
   * @param {HTMLElement} context - Context element (default: document)
   * @returns {HTMLElement|null} Found element or null
   */
  get(selector, context = document) {
    const key = `${selector}:${context.id || 'document'}`;
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      // Verify cached element is still in DOM
      if (cached && document.contains(cached)) {
        return cached;
      }
      this.cache.delete(key);
    }
    
    const element = context.querySelector(selector);
    if (element) {
      this.cache.set(key, element);
    }
    
    return element;
  }
  
  /**
   * Get all elements by selector with caching
   * @param {string} selector - CSS selector
   * @param {HTMLElement} context - Context element (default: document)
   * @returns {NodeList} Found elements
   */
  getAll(selector, context = document) {
    // Don't cache NodeLists as they can change
    return context.querySelectorAll(selector);
  }
  
  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Remove specific selector from cache
   * @param {string} selector - CSS selector to remove
   * @param {HTMLElement} context - Context element
   */
  remove(selector, context = document) {
    const key = `${selector}:${context.id || 'document'}`;
    this.cache.delete(key);
  }
}

// Create singleton instance
export const domCache = new DOMCache();

/**
 * Add event listener with automatic cleanup
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 * @returns {Function} Cleanup function
 */
export function addEventListenerWithCleanup(element, event, handler, options = {}) {
  element.addEventListener(event, handler, options);
  
  return () => {
    element.removeEventListener(event, handler, options);
  };
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function to limit function execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if element is visible in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if visible
 */
export function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Smooth scroll to element
 * @param {HTMLElement} element - Target element
 * @param {Object} options - Scroll options
 */
export function scrollToElement(element, options = {}) {
  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest'
  };
  
  element.scrollIntoView({ ...defaultOptions, ...options });
}