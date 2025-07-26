/**
 * Unit Tests for DOM Utilities
 */

import { TestSuite, createMock, DOMTestUtils } from '../test-framework.js';
import { createElement, domCache, addEventListenerWithCleanup, debounce, scrollToElement } from '../../js/modules/utils/dom.js';

export const domUtilsTests = new TestSuite('DOM Utilities');

// Test createElement function
domUtilsTests.test('createElement creates element with tag name', (t) => {
  const element = createElement('div');
  t.assertInstanceOf(element, HTMLElement);
  t.assertEqual(element.tagName.toLowerCase(), 'div');
});

domUtilsTests.test('createElement sets attributes correctly', (t) => {
  const element = createElement('input', {
    type: 'text',
    id: 'test-input',
    className: 'form-control',
    'data-testid': 'test'
  });
  
  t.assertEqual(element.type, 'text');
  t.assertEqual(element.id, 'test-input');
  t.assertEqual(element.className, 'form-control');
  t.assertEqual(element.getAttribute('data-testid'), 'test');
});

domUtilsTests.test('createElement sets text content', (t) => {
  const element = createElement('p', {}, 'Hello World');
  t.assertEqual(element.textContent, 'Hello World');
});

domUtilsTests.test('createElement handles dataset attributes', (t) => {
  const element = createElement('div', {
    dataset: { userId: '123', role: 'admin' }
  });
  
  t.assertEqual(element.dataset.userId, '123');
  t.assertEqual(element.dataset.role, 'admin');
});

// Test DOM Cache
domUtilsTests.test('domCache stores and retrieves elements', (t) => {
  // Create test element
  const testElement = DOMTestUtils.createElement('<div id="cache-test">Test</div>');
  document.body.appendChild(testElement);
  
  try {
    // First call should query DOM
    const element1 = domCache.get('#cache-test');
    t.assertNotNull(element1);
    t.assertEqual(element1.id, 'cache-test');
    
    // Second call should return cached element
    const element2 = domCache.get('#cache-test');
    t.assertEqual(element1, element2); // Same reference
    
  } finally {
    DOMTestUtils.cleanup(testElement);
    domCache.clear();
  }
});

domUtilsTests.test('domCache.getAll returns array of elements', (t) => {
  // Create test elements
  const container = DOMTestUtils.createElement(`
    <div id="cache-test-container">
      <span class="test-item">Item 1</span>
      <span class="test-item">Item 2</span>
      <span class="test-item">Item 3</span>
    </div>
  `);
  document.body.appendChild(container);
  
  try {
    const elements = domCache.getAll('.test-item');
    t.assertInstanceOf(elements, Array);
    t.assertEqual(elements.length, 3);
    t.assertEqual(elements[0].textContent, 'Item 1');
    t.assertEqual(elements[2].textContent, 'Item 3');
    
  } finally {
    DOMTestUtils.cleanup(container);
    domCache.clear();
  }
});

domUtilsTests.test('domCache.clear empties the cache', (t) => {
  const testElement = DOMTestUtils.createElement('<div id="clear-test">Test</div>');
  document.body.appendChild(testElement);
  
  try {
    // Cache an element
    domCache.get('#clear-test');
    
    // Clear cache
    domCache.clear();
    
    // Next call should query DOM again (not from cache)
    const element = domCache.get('#clear-test');
    t.assertNotNull(element);
    
  } finally {
    DOMTestUtils.cleanup(testElement);
    domCache.clear();
  }
});

// Test event handling
domUtilsTests.test('addEventListenerWithCleanup adds event listener', (t) => {
  const button = DOMTestUtils.createElement('<button id="event-test">Click me</button>');
  document.body.appendChild(button);
  
  try {
    let clicked = false;
    const cleanup = addEventListenerWithCleanup(button, 'click', () => {
      clicked = true;
    });
    
    // Simulate click
    DOMTestUtils.click(button);
    t.assert(clicked, 'Event listener should be called');
    
    // Test cleanup
    clicked = false;
    cleanup();
    DOMTestUtils.click(button);
    t.assert(!clicked, 'Event listener should be removed after cleanup');
    
  } finally {
    DOMTestUtils.cleanup(button);
  }
});

// Test debounce function
domUtilsTests.test('debounce delays function execution', async (t) => {
  let callCount = 0;
  const debouncedFn = debounce(() => {
    callCount++;
  }, 100);
  
  // Call multiple times quickly
  debouncedFn();
  debouncedFn();
  debouncedFn();
  
  // Should not have been called yet
  t.assertEqual(callCount, 0);
  
  // Wait for debounce delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Should have been called once
  t.assertEqual(callCount, 1);
});

domUtilsTests.test('debounce cancels previous calls', async (t) => {
  let callCount = 0;
  const debouncedFn = debounce(() => {
    callCount++;
  }, 100);
  
  // First call
  debouncedFn();
  
  // Wait 50ms and call again (should cancel first)
  await new Promise(resolve => setTimeout(resolve, 50));
  debouncedFn();
  
  // Wait for second call to complete
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Should have been called only once (second call)
  t.assertEqual(callCount, 1);
});

// Test scrollToElement
domUtilsTests.test('scrollToElement scrolls element into view', (t) => {
  const element = DOMTestUtils.createElement('<div id="scroll-test" style="margin-top: 2000px;">Scroll target</div>');
  document.body.appendChild(element);
  
  try {
    // Mock scrollIntoView
    const originalScrollIntoView = element.scrollIntoView;
    let scrollCalled = false;
    element.scrollIntoView = createMock().implementedBy(() => {
      scrollCalled = true;
    }).fn;
    
    scrollToElement(element);
    
    t.assert(scrollCalled, 'scrollIntoView should be called');
    
    // Restore original method
    element.scrollIntoView = originalScrollIntoView;
    
  } finally {
    DOMTestUtils.cleanup(element);
  }
});

// Test error handling
domUtilsTests.test('createElement handles invalid tag names gracefully', (t) => {
  // Should not throw for invalid tag names (browser handles it)
  const element = createElement('invalid-tag');
  t.assertInstanceOf(element, HTMLElement);
  t.assertEqual(element.tagName.toLowerCase(), 'invalid-tag');
});

domUtilsTests.test('domCache handles non-existent selectors', (t) => {
  const element = domCache.get('#non-existent-element');
  t.assertNull(element);
});

domUtilsTests.test('domCache.getAll handles non-existent selectors', (t) => {
  const elements = domCache.getAll('.non-existent-class');
  t.assertInstanceOf(elements, Array);
  t.assertEqual(elements.length, 0);
});

// Test memory management
domUtilsTests.test('event cleanup prevents memory leaks', (t) => {
  const button = DOMTestUtils.createElement('<button>Test</button>');
  document.body.appendChild(button);
  
  try {
    const handler = createMock().fn;
    const cleanup = addEventListenerWithCleanup(button, 'click', handler);
    
    // Add many event listeners
    const cleanups = [];
    for (let i = 0; i < 100; i++) {
      cleanups.push(addEventListenerWithCleanup(button, 'click', () => {}));
    }
    
    // Clean up all listeners
    cleanups.forEach(cleanup => cleanup());
    cleanup();
    
    // Should not throw or cause memory issues
    DOMTestUtils.click(button);
    t.assert(!handler.wasCalled(), 'Handlers should be cleaned up');
    
  } finally {
    DOMTestUtils.cleanup(button);
  }
});

// Cleanup after all tests
domUtilsTests.afterEach(() => {
  // Clean up any remaining test elements
  const testElements = document.querySelectorAll('[id*="test"], [class*="test"]');
  testElements.forEach(element => {
    if (element.id.includes('test') || element.className.includes('test')) {
      DOMTestUtils.cleanup(element);
    }
  });
  
  // Clear DOM cache
  domCache.clear();
});