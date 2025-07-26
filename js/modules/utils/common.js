/**
 * Common Utility Functions
 * Reusable components and utilities to eliminate code duplication
 */

import { createElement, addEventListenerWithCleanup } from './dom.js';
import { sanitizeInput } from './security.js';
import { announceToScreenReader } from './accessibility.js';

/**
 * Generic Modal Component
 * Reusable modal with focus management and accessibility
 */
export class Modal {
  constructor(options = {}) {
    this.options = {
      title: 'Modal',
      closable: true,
      backdrop: true,
      keyboard: true,
      maxWidth: '800px',
      ...options
    };
    
    this.element = null;
    this.focusTrap = null;
    this.previousFocus = null;
    this.isOpen = false;
    this.onClose = null;
    this.eventCleanups = [];
  }

  /**
   * Create modal DOM structure
   * @private
   */
  create() {
    // Modal overlay
    this.element = createElement('div', {
      className: 'modal-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title',
      'aria-describedby': 'modal-body',
      style: `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        transition: opacity 0.3s ease;
      `
    });

    // Modal content
    const content = createElement('div', {
      className: 'modal-content',
      style: `
        background: var(--color-surface);
        border-radius: var(--border-radius-xl);
        max-width: ${this.options.maxWidth};
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      `
    });

    // Modal header
    const header = createElement('div', {
      className: 'modal-header',
      style: `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-2xl);
        border-bottom: 1px solid var(--color-border);
      `
    });

    this.titleElement = createElement('h2', {
      id: 'modal-title',
      className: 'modal-title',
      style: `
        font-size: var(--font-size-xl);
        font-weight: bold;
        color: var(--color-text-primary);
        margin: 0;
      `
    }, this.options.title);

    if (this.options.closable) {
      this.closeButton = createElement('button', {
        className: 'modal-close',
        'aria-label': 'Close modal',
        style: `
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          padding: var(--spacing-sm);
          border-radius: var(--border-radius-sm);
          transition: color var(--transition-normal);
        `
      });

      this.closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
          <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
        </svg>
      `;

      const closeCleanup = addEventListenerWithCleanup(this.closeButton, 'click', () => {
        this.close();
      });
      this.eventCleanups.push(closeCleanup);

      header.appendChild(this.titleElement);
      header.appendChild(this.closeButton);
    } else {
      header.appendChild(this.titleElement);
    }

    // Modal body
    this.bodyElement = createElement('div', {
      id: 'modal-body',
      className: 'modal-body',
      style: `
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-2xl);
      `
    });

    // Modal footer (optional)
    this.footerElement = createElement('div', {
      className: 'modal-footer',
      style: `
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-md);
        padding: var(--spacing-2xl);
        border-top: 1px solid var(--color-border);
      `
    });

    // Assemble modal
    content.appendChild(header);
    content.appendChild(this.bodyElement);
    content.appendChild(this.footerElement);
    this.element.appendChild(content);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup modal event listeners
   * @private
   */
  setupEventListeners() {
    // Click outside to close
    if (this.options.backdrop) {
      const backdropCleanup = addEventListenerWithCleanup(this.element, 'click', (e) => {
        if (e.target === this.element) {
          this.close();
        }
      });
      this.eventCleanups.push(backdropCleanup);
    }

    // Keyboard events
    if (this.options.keyboard) {
      const keyboardCleanup = addEventListenerWithCleanup(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
      this.eventCleanups.push(keyboardCleanup);
    }
  }

  /**
   * Set modal content
   * @param {string|HTMLElement} content - Content to display
   */
  setContent(content) {
    if (!this.bodyElement) return;
    
    this.bodyElement.innerHTML = '';
    
    if (typeof content === 'string') {
      this.bodyElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.bodyElement.appendChild(content);
    }
  }

  /**
   * Set modal footer
   * @param {HTMLElement|Array<HTMLElement>} buttons - Footer buttons
   */
  setFooter(buttons) {
    if (!this.footerElement) return;
    
    this.footerElement.innerHTML = '';
    
    if (Array.isArray(buttons)) {
      buttons.forEach(button => {
        if (button instanceof HTMLElement) {
          this.footerElement.appendChild(button);
        }
      });
    } else if (buttons instanceof HTMLElement) {
      this.footerElement.appendChild(buttons);
    }
  }

  /**
   * Open modal
   * @param {Function} onClose - Optional callback when modal is closed
   */
  open(onClose = null) {
    if (this.isOpen) return;

    if (!this.element) {
      this.create();
    }

    this.onClose = onClose;
    this.previousFocus = document.activeElement;
    
    // Add to DOM
    document.body.appendChild(this.element);
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    
    // Animate in
    requestAnimationFrame(() => {
      this.element.style.opacity = '1';
      const content = this.element.querySelector('.modal-content');
      if (content) {
        content.style.transform = 'scale(1)';
      }
    });

    // Focus management
    setTimeout(() => {
      const firstFocusable = this.element.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      } else if (this.closeButton) {
        this.closeButton.focus();
      }
    }, 100);

    this.isOpen = true;
    
    // Announce to screen readers
    announceToScreenReader(`Modal opened: ${this.options.title}`, 'polite');
  }

  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;

    // Animate out
    this.element.style.opacity = '0';
    const content = this.element.querySelector('.modal-content');
    if (content) {
      content.style.transform = 'scale(0.9)';
    }

    setTimeout(() => {
      // Remove from DOM
      if (this.element && this.element.parentNode) {
        document.body.removeChild(this.element);
      }
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus
      if (this.previousFocus && this.previousFocus.focus) {
        this.previousFocus.focus();
      }
      
      this.isOpen = false;
      
      // Call onClose callback
      if (this.onClose && typeof this.onClose === 'function') {
        this.onClose();
      }
      
      // Announce to screen readers
      announceToScreenReader('Modal closed', 'polite');
      
    }, 300);
  }

  /**
   * Update modal title
   * @param {string} title - New title
   */
  setTitle(title) {
    this.options.title = title;
    if (this.titleElement) {
      this.titleElement.textContent = title;
    }
  }

  /**
   * Check if modal is open
   * @returns {boolean}
   */
  isModalOpen() {
    return this.isOpen;
  }

  /**
   * Destroy modal and clean up resources
   */
  destroy() {
    this.close();
    
    // Clean up event listeners
    this.eventCleanups.forEach(cleanup => cleanup());
    this.eventCleanups = [];
    
    // Reset properties
    this.element = null;
    this.titleElement = null;
    this.bodyElement = null;
    this.footerElement = null;
    this.closeButton = null;
    this.onClose = null;
    this.previousFocus = null;
  }
}

/**
 * Generic Form Component
 * Reusable form with validation and accessibility
 */
export class Form {
  constructor(options = {}) {
    this.options = {
      className: 'form',
      validate: true,
      submitButton: true,
      ...options
    };
    
    this.element = null;
    this.fields = new Map();
    this.validators = new Map();
    this.eventCleanups = [];
    this.onSubmit = null;
  }

  /**
   * Create form element
   * @private
   */
  create() {
    this.element = createElement('form', {
      className: this.options.className,
      novalidate: this.options.validate
    });

    const formCleanup = addEventListenerWithCleanup(this.element, 'submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    this.eventCleanups.push(formCleanup);

    return this.element;
  }

  /**
   * Add field to form
   * @param {string} name - Field name
   * @param {Object} config - Field configuration
   */
  addField(name, config) {
    const {
      type = 'text',
      label = '',
      placeholder = '',
      required = false,
      validator = null,
      className = 'form-group'
    } = config;

    // Create field container
    const fieldContainer = createElement('div', { className });

    // Create label
    if (label) {
      const labelElement = createElement('label', {
        className: 'form-label',
        htmlFor: name
      }, label);
      fieldContainer.appendChild(labelElement);
    }

    // Create input
    const input = createElement('input', {
      type,
      id: name,
      name,
      className: 'form-input',
      placeholder,
      required,
      'aria-describedby': required ? `${name}-error` : undefined
    });

    // Create error container
    const errorElement = createElement('div', {
      id: `${name}-error`,
      className: 'field-error',
      style: 'display: none;',
      role: 'alert',
      'aria-live': 'polite'
    });

    fieldContainer.appendChild(input);
    fieldContainer.appendChild(errorElement);
    this.element.appendChild(fieldContainer);

    // Store references
    this.fields.set(name, {
      input,
      error: errorElement,
      container: fieldContainer,
      config
    });

    if (validator) {
      this.validators.set(name, validator);
    }

    // Add real-time validation
    if (this.options.validate) {
      const validateCleanup = addEventListenerWithCleanup(input, 'blur', () => {
        this.validateField(name);
      });
      
      const clearCleanup = addEventListenerWithCleanup(input, 'input', () => {
        this.clearFieldError(name);
      });
      
      this.eventCleanups.push(validateCleanup, clearCleanup);
    }

    return input;
  }

  /**
   * Validate single field
   * @param {string} name - Field name
   * @returns {boolean}
   */
  validateField(name) {
    const field = this.fields.get(name);
    if (!field) return true;

    const { input, error, config } = field;
    const value = input.value.trim();

    // Clear previous errors
    this.clearFieldError(name);

    // Required validation
    if (config.required && !value) {
      this.showFieldError(name, `${config.label || name} is required`);
      return false;
    }

    // Custom validator
    const validator = this.validators.get(name);
    if (validator && value) {
      const result = validator(value);
      if (!result.isValid) {
        this.showFieldError(name, result.message);
        return false;
      }
    }

    // Show success state
    input.classList.add('success');
    return true;
  }

  /**
   * Show field error
   * @param {string} name - Field name
   * @param {string} message - Error message
   */
  showFieldError(name, message) {
    const field = this.fields.get(name);
    if (!field) return;

    const { input, error } = field;
    
    input.classList.add('error');
    input.classList.remove('success');
    error.textContent = message;
    error.style.display = 'flex';
    
    // Announce error to screen readers
    announceToScreenReader(`Error in ${name}: ${message}`, 'assertive');
  }

  /**
   * Clear field error
   * @param {string} name - Field name
   */
  clearFieldError(name) {
    const field = this.fields.get(name);
    if (!field) return;

    const { input, error } = field;
    
    input.classList.remove('error');
    error.style.display = 'none';
    error.textContent = '';
  }

  /**
   * Validate entire form
   * @returns {boolean}
   */
  validate() {
    let isValid = true;

    for (const [name] of this.fields) {
      if (!this.validateField(name)) {
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Get form data
   * @returns {Object}
   */
  getData() {
    const data = {};
    
    for (const [name, field] of this.fields) {
      data[name] = sanitizeInput(field.input.value, { maxLength: 255 });
    }
    
    return data;
  }

  /**
   * Set form data
   * @param {Object} data - Form data
   */
  setData(data) {
    for (const [name, value] of Object.entries(data)) {
      const field = this.fields.get(name);
      if (field) {
        field.input.value = value || '';
      }
    }
  }

  /**
   * Handle form submission
   * @private
   */
  handleSubmit() {
    if (this.options.validate && !this.validate()) {
      announceToScreenReader('Please correct the errors in the form', 'assertive');
      return;
    }

    const data = this.getData();
    
    if (this.onSubmit && typeof this.onSubmit === 'function') {
      this.onSubmit(data);
    }
  }

  /**
   * Set submit handler
   * @param {Function} handler - Submit handler
   */
  setSubmitHandler(handler) {
    this.onSubmit = handler;
  }

  /**
   * Reset form
   */
  reset() {
    if (this.element) {
      this.element.reset();
    }

    // Clear all errors
    for (const [name] of this.fields) {
      this.clearFieldError(name);
    }
  }

  /**
   * Get form element
   * @returns {HTMLElement}
   */
  getElement() {
    if (!this.element) {
      this.create();
    }
    return this.element;
  }

  /**
   * Destroy form and clean up resources
   */
  destroy() {
    // Clean up event listeners
    this.eventCleanups.forEach(cleanup => cleanup());
    this.eventCleanups = [];
    
    // Clear data
    this.fields.clear();
    this.validators.clear();
    this.element = null;
    this.onSubmit = null;
  }
}

/**
 * Generic Notification System
 * Reusable toast notifications with accessibility
 */
export class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.maxNotifications = 5;
    this.defaultDuration = 5000;
    
    this.createContainer();
  }

  /**
   * Create notification container
   * @private
   */
  createContainer() {
    this.container = createElement('div', {
      id: 'notification-container',
      'aria-live': 'polite',
      'aria-atomic': 'false',
      style: `
        position: fixed;
        top: var(--spacing-xl);
        right: var(--spacing-xl);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        max-width: 400px;
        pointer-events: none;
      `
    });

    document.body.appendChild(this.container);
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {Object} options - Notification options
   * @returns {string} Notification ID
   */
  show(message, options = {}) {
    const {
      type = 'info',
      duration = this.defaultDuration,
      closable = true,
      actions = []
    } = options;

    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Remove oldest notification if at limit
    if (this.notifications.size >= this.maxNotifications) {
      const oldestId = this.notifications.keys().next().value;
      this.hide(oldestId);
    }

    // Create notification element
    const notification = this.createNotification(id, message, type, closable, actions);
    
    // Add to container
    this.container.appendChild(notification);
    
    // Store reference
    this.notifications.set(id, {
      element: notification,
      timer: duration > 0 ? setTimeout(() => this.hide(id), duration) : null
    });

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Announce to screen readers
    announceToScreenReader(`${type}: ${message}`, type === 'error' ? 'assertive' : 'polite');

    return id;
  }

  /**
   * Create notification element
   * @private
   */
  createNotification(id, message, type, closable, actions) {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };

    const notification = createElement('div', {
      id,
      className: `notification notification-${type}`,
      role: 'alert',
      style: `
        background: ${colors[type]};
        color: white;
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-md);
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: auto;
        font-size: var(--font-size-base);
        font-weight: 500;
      `
    });

    // Message content
    const content = createElement('div', {
      className: 'notification-content',
      style: 'flex: 1;'
    }, message);

    notification.appendChild(content);

    // Actions
    if (actions.length > 0) {
      const actionContainer = createElement('div', {
        className: 'notification-actions',
        style: 'display: flex; gap: var(--spacing-sm);'
      });

      actions.forEach(action => {
        const button = createElement('button', {
          className: 'notification-action',
          style: `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: var(--border-radius-sm);
            cursor: pointer;
            font-size: var(--font-size-sm);
            transition: background-color var(--transition-normal);
          `
        }, action.label);

        const cleanup = addEventListenerWithCleanup(button, 'click', () => {
          if (action.handler) action.handler();
          this.hide(id);
        });

        // Store cleanup function
        button._cleanup = cleanup;
        actionContainer.appendChild(button);
      });

      notification.appendChild(actionContainer);
    }

    // Close button
    if (closable) {
      const closeButton = createElement('button', {
        className: 'notification-close',
        'aria-label': 'Close notification',
        style: `
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: var(--spacing-xs);
          border-radius: var(--border-radius-sm);
          opacity: 0.8;
          transition: opacity var(--transition-normal);
        `
      });

      closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
          <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
        </svg>
      `;

      const closeCleanup = addEventListenerWithCleanup(closeButton, 'click', () => {
        this.hide(id);
      });

      closeButton._cleanup = closeCleanup;
      notification.appendChild(closeButton);
    }

    return notification;
  }

  /**
   * Hide notification
   * @param {string} id - Notification ID
   */
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const { element, timer } = notification;

    // Clear timer
    if (timer) {
      clearTimeout(timer);
    }

    // Animate out
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';

    setTimeout(() => {
      // Clean up action button event listeners
      const actionButtons = element.querySelectorAll('.notification-action, .notification-close');
      actionButtons.forEach(button => {
        if (button._cleanup) {
          button._cleanup();
        }
      });

      // Remove from DOM
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }

      // Remove from tracking
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Hide all notifications
   */
  hideAll() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.hide(id));
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   * @param {Object} options - Additional options
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   */
  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error', duration: 0 });
  }

  /**
   * Show warning notification
   * @param {string} message - Warning message
   * @param {Object} options - Additional options
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  /**
   * Show info notification
   * @param {string} message - Info message
   * @param {Object} options - Additional options
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * Destroy notification manager
   */
  destroy() {
    this.hideAll();
    
    if (this.container && this.container.parentNode) {
      document.body.removeChild(this.container);
    }
    
    this.container = null;
    this.notifications.clear();
  }
}

// Create singleton notification manager
export const notificationManager = new NotificationManager();

/**
 * Utility function to create reusable buttons
 * @param {Object} config - Button configuration
 * @returns {HTMLElement} Button element
 */
export function createButton(config) {
  const {
    text = 'Button',
    type = 'button',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    icon = null,
    onClick = null,
    className = '',
    ...attributes
  } = config;

  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    error: 'btn-error'
  };

  const button = createElement('button', {
    type,
    className: `btn ${variantClasses[variant]} ${sizeClasses[size]} ${className}`,
    disabled,
    ...attributes
  });

  // Add icon if provided
  if (icon) {
    const iconElement = typeof icon === 'string' 
      ? createElement('span', { innerHTML: icon })
      : icon;
    button.appendChild(iconElement);
  }

  // Add text
  const textElement = createElement('span', {}, text);
  button.appendChild(textElement);

  // Add click handler
  if (onClick && typeof onClick === 'function') {
    const cleanup = addEventListenerWithCleanup(button, 'click', onClick);
    button._cleanup = cleanup;
  }

  return button;
}

/**
 * Utility function to create loading spinner
 * @param {Object} options - Spinner options
 * @returns {HTMLElement} Spinner element
 */
export function createLoadingSpinner(options = {}) {
  const {
    size = '16px',
    color = 'currentColor',
    className = 'loading-spinner'
  } = options;

  return createElement('div', {
    className,
    'aria-label': 'Loading',
    role: 'status',
    style: `
      width: ${size};
      height: ${size};
      border: 2px solid transparent;
      border-top: 2px solid ${color};
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `
  });
}

/**
 * Debounced function executor
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function (...args) {
    const context = this;
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

/**
 * Throttled function executor
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const context = this;
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(context, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}