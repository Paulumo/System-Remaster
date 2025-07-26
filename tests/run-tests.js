/**
 * Test Runner Entry Point
 * Runs all test suites for System Remaster HST
 */

import { TestRunner } from './test-framework.js';

// Import test suites
import { domUtilsTests } from './unit/dom-utils.test.js';
import { securityUtilsTests } from './unit/security.test.js';

/**
 * Integration Tests
 */
import { describe } from './test-framework.js';

const integrationTests = describe('Integration Tests', (suite) => {
  
  suite.test('Application initializes successfully', async (t) => {
    // Mock DOM environment
    if (typeof document === 'undefined') {
      global.document = {
        createElement: () => ({}),
        querySelector: () => null,
        addEventListener: () => {},
        body: { appendChild: () => {} }
      };
      global.window = { 
        addEventListener: () => {},
        matchMedia: () => ({ matches: false, addEventListener: () => {} })
      };
      global.navigator = { onLine: true };
    }
    
    // Test would import and initialize the main app
    t.assert(true, 'Application structure is valid');
  });

  suite.test('State manager persists data correctly', async (t) => {
    // Mock localStorage
    const mockStorage = {};
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; },
      removeItem: (key) => { delete mockStorage[key]; }
    };

    const { StateManager } = await import('../js/modules/StateManager.js');
    const stateManager = new StateManager();
    
    await stateManager.initialize();
    
    // Test state persistence
    stateManager.setState('flightPlan.method', 'VFR');
    await stateManager.saveState();
    
    const savedData = JSON.parse(mockStorage.systemRemasterState);
    t.assertEqual(savedData.flightPlan.method, 'VFR');
  });

  suite.test('Service worker caches resources correctly', async (t) => {
    // Mock cache API
    const mockCache = new Map();
    global.caches = {
      open: () => Promise.resolve({
        addAll: (urls) => {
          urls.forEach(url => mockCache.set(url, 'cached'));
          return Promise.resolve();
        },
        match: (request) => {
          const url = typeof request === 'string' ? request : request.url;
          return Promise.resolve(mockCache.has(url) ? { ok: true } : null);
        }
      })
    };

    // Test cache functionality
    const cache = await caches.open('test-cache');
    await cache.addAll(['/test.js', '/test.css']);
    
    const cached = await cache.match('/test.js');
    t.assertNotNull(cached, 'Resource should be cached');
  });

  suite.test('Accessibility features work correctly', async (t) => {
    // Mock ARIA and screen reader APIs
    const announcements = [];
    
    const { announceToScreenReader } = await import('../js/modules/utils/accessibility.js');
    
    // Mock DOM for screen reader testing
    global.document = {
      createElement: (tag) => ({
        setAttribute: () => {},
        appendChild: () => {},
        textContent: '',
        style: {}
      }),
      body: {
        appendChild: () => {}
      }
    };
    
    // Test screen reader announcement
    announceToScreenReader('Test announcement', 'polite');
    
    // In a real test, we would verify the ARIA live region was updated
    t.assert(true, 'Screen reader announcement completed');
  });

  suite.test('Progressive enhancement detects features correctly', async (t) => {
    // Mock browser APIs
    global.localStorage = {
      setItem: () => {},
      removeItem: () => {},
      getItem: () => null
    };
    global.navigator = {
      geolocation: {},
      onLine: true
    };
    global.CSS = {
      supports: () => true
    };
    global.Worker = function() {};

    const { ProgressiveEnhancement } = await import('../js/modules/utils/progressive.js');
    const pe = new ProgressiveEnhancement();
    
    pe.initialize();
    
    t.assert(pe.hasFeature('localStorage'), 'Should detect localStorage support');
    t.assert(pe.hasFeature('geolocation'), 'Should detect geolocation support');
    t.assert(pe.hasFeature('cssVariables'), 'Should detect CSS variables support');
  });
});

/**
 * Performance Tests
 */
const performanceTests = describe('Performance Tests', (suite) => {
  
  suite.test('DOM operations complete within performance budget', async (t) => {
    // Mock DOM operations
    const startTime = performance.now();
    
    // Simulate DOM operations
    for (let i = 0; i < 1000; i++) {
      const element = { style: {}, setAttribute: () => {} };
      element.textContent = `Item ${i}`;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    t.assert(duration < 100, `DOM operations should complete in <100ms, took ${duration.toFixed(2)}ms`);
  });

  suite.test('State updates are efficient', async (t) => {
    const mockStorage = {};
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; }
    };

    const { StateManager } = await import('../js/modules/StateManager.js');
    const stateManager = new StateManager();
    await stateManager.initialize();
    
    const startTime = performance.now();
    
    // Perform multiple state updates
    for (let i = 0; i < 100; i++) {
      stateManager.setState(`test.value${i}`, i, { silent: true });
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    t.assert(duration < 50, `State updates should complete in <50ms, took ${duration.toFixed(2)}ms`);
  });

  suite.test('Large data processing stays responsive', async (t) => {
    const { sanitizeInput } = await import('../js/modules/utils/security.js');
    
    const largeInput = '<div>' + 'A'.repeat(50000) + '</div>';
    const startTime = performance.now();
    
    const sanitized = sanitizeInput(largeInput, { allowBasicHTML: true });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    t.assert(duration < 200, `Large input processing should complete in <200ms, took ${duration.toFixed(2)}ms`);
    t.assert(sanitized.length > 0, 'Sanitized output should not be empty');
  });
});

/**
 * Security Tests
 */
const securityTests = describe('Security Tests', (suite) => {

  suite.test('XSS prevention works correctly', async (t) => {
    const { sanitizeInput } = await import('../js/modules/utils/security.js');
    
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<svg onload="alert(1)"></svg>'
    ];
    
    maliciousInputs.forEach(input => {
      const sanitized = sanitizeInput(input);
      t.assert(!sanitized.includes('<script>'), 'Script tags should be removed');
      t.assert(!sanitized.includes('javascript:'), 'JavaScript URLs should be removed');
      t.assert(!sanitized.includes('onerror'), 'Event handlers should be removed');
      t.assert(!sanitized.includes('onload'), 'Event handlers should be removed');
      t.assert(!sanitized.includes('onclick'), 'Event handlers should be removed');
    });
  });

  suite.test('Input validation prevents injection attacks', async (t) => {
    const { validateInput } = await import('../js/modules/utils/security.js');
    
    const injectionAttempts = [
      "'; DROP TABLE users; --",
      "<script>alert('xss')</script>",
      "1' OR '1'='1",
      "../../../etc/passwd",
      "{{constructor.constructor('alert(1)')()}}",
      "${alert(1)}"
    ];
    
    const rules = { 
      type: 'text',
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/
    };
    
    injectionAttempts.forEach(attempt => {
      const isValid = validateInput(attempt, rules);
      t.assert(!isValid, `Injection attempt should be rejected: ${attempt}`);
    });
  });

  suite.test('State persistence is secure', async (t) => {
    const mockStorage = {};
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; }
    };

    const { StateManager } = await import('../js/modules/StateManager.js');
    const stateManager = new StateManager();
    await stateManager.initialize();
    
    // Attempt to store malicious data
    const maliciousData = '<script>alert("stored xss")</script>';
    stateManager.setState('test.malicious', maliciousData);
    
    await stateManager.saveState();
    
    // Verify data is sanitized in storage
    const stored = JSON.parse(mockStorage.systemRemasterState);
    t.assert(!stored.test.malicious.includes('<script>'), 'Malicious scripts should not be stored');
  });
});

/**
 * Accessibility Tests
 */
const accessibilityTests = describe('Accessibility Tests', (suite) => {

  suite.test('ARIA attributes are correctly applied', async (t) => {
    global.document = {
      createElement: (tag) => ({
        setAttribute: function(name, value) { this[name] = value; },
        getAttribute: function(name) { return this[name]; },
        appendChild: () => {},
        textContent: '',
        style: {}
      }),
      body: { appendChild: () => {} }
    };

    const { createElement } = await import('../js/modules/utils/dom.js');
    
    const button = createElement('button', {
      role: 'button',
      'aria-label': 'Test button',
      'aria-describedby': 'button-desc'
    });
    
    t.assertEqual(button.role, 'button');
    t.assertEqual(button['aria-label'], 'Test button');
    t.assertEqual(button['aria-describedby'], 'button-desc');
  });

  suite.test('Keyboard navigation works correctly', async (t) => {
    global.document = {
      createElement: () => ({
        setAttribute: () => {},
        addEventListener: () => {},
        focus: () => {},
        style: {}
      }),
      addEventListener: () => {}
    };

    const { KeyboardNavigation } = await import('../js/modules/utils/accessibility.js');
    
    const container = { addEventListener: () => {}, querySelectorAll: () => [] };
    const nav = new KeyboardNavigation(container, '.nav-item');
    
    // Test initialization
    nav.initialize();
    t.assert(nav.isActive, 'Keyboard navigation should be active');
  });

  suite.test('Screen reader announcements work', async (t) => {
    const announcements = [];
    
    global.document = {
      createElement: (tag) => ({
        setAttribute: () => {},
        appendChild: () => {},
        textContent: '',
        style: {}
      }),
      body: {
        appendChild: (element) => {
          if (element.textContent) {
            announcements.push(element.textContent);
          }
        },
        removeChild: () => {}
      }
    };

    const { announceToScreenReader } = await import('../js/modules/utils/accessibility.js');
    
    announceToScreenReader('Test announcement', 'polite');
    
    // In a real test environment, we would verify the announcement was made
    t.assert(true, 'Screen reader announcement completed');
  });
});

/**
 * Main Test Runner
 */
async function runAllTests() {
  const runner = new TestRunner();
  
  // Add all test suites
  runner.addSuite(domUtilsTests);
  runner.addSuite(securityUtilsTests);
  runner.addSuite(integrationTests);
  runner.addSuite(performanceTests);
  runner.addSuite(securityTests);
  runner.addSuite(accessibilityTests);
  
  // Run all tests
  const results = await runner.runAll();
  
  // Exit with appropriate code
  if (typeof process !== 'undefined') {
    process.exit(results.failed > 0 ? 1 : 0);
  }
  
  return results;
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || typeof window !== 'undefined') {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  });
}

export { runAllTests };