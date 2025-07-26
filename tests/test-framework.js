/**
 * Lightweight Testing Framework for System Remaster HST
 * Simple, focused testing without external dependencies
 */

/**
 * Test Suite Runner
 */
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachFn = null;
    this.afterEachFn = null;
    this.beforeAllFn = null;
    this.afterAllFn = null;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  /**
   * Add a test to the suite
   * @param {string} description - Test description
   * @param {Function} testFn - Test function
   * @param {Object} options - Test options
   */
  test(description, testFn, options = {}) {
    this.tests.push({
      description,
      testFn,
      skip: options.skip || false,
      only: options.only || false,
      timeout: options.timeout || 5000
    });
  }

  /**
   * Skip a test
   * @param {string} description - Test description
   * @param {Function} testFn - Test function
   */
  skip(description, testFn) {
    this.test(description, testFn, { skip: true });
  }

  /**
   * Run only this test
   * @param {string} description - Test description
   * @param {Function} testFn - Test function
   */
  only(description, testFn) {
    this.test(description, testFn, { only: true });
  }

  /**
   * Setup function to run before each test
   * @param {Function} fn - Setup function
   */
  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  /**
   * Cleanup function to run after each test
   * @param {Function} fn - Cleanup function
   */
  afterEach(fn) {
    this.afterEachFn = fn;
  }

  /**
   * Setup function to run before all tests
   * @param {Function} fn - Setup function
   */
  beforeAll(fn) {
    this.beforeAllFn = fn;
  }

  /**
   * Cleanup function to run after all tests
   * @param {Function} fn - Cleanup function
   */
  afterAll(fn) {
    this.afterAllFn = fn;
  }

  /**
   * Run all tests in the suite
   * @returns {Promise<Object>} Test results
   */
  async run() {
    console.log(`\n🧪 Running test suite: ${this.name}`);
    console.log('═'.repeat(50));

    this.results.startTime = performance.now();

    try {
      // Run beforeAll hook
      if (this.beforeAllFn) {
        await this.beforeAllFn();
      }

      // Filter tests (handle 'only' flag)
      let testsToRun = this.tests;
      const onlyTests = this.tests.filter(test => test.only);
      if (onlyTests.length > 0) {
        testsToRun = onlyTests;
      }

      // Run each test
      for (const test of testsToRun) {
        await this.runSingleTest(test);
      }

      // Run afterAll hook
      if (this.afterAllFn) {
        await this.afterAllFn();
      }

    } catch (error) {
      console.error(`❌ Suite setup/teardown error: ${error.message}`);
      this.results.errors.push({
        test: 'Suite Setup/Teardown',
        error: error.message,
        stack: error.stack
      });
    }

    this.results.endTime = performance.now();
    this.results.total = this.results.passed + this.results.failed + this.results.skipped;
    
    this.printResults();
    return this.results;
  }

  /**
   * Run a single test
   * @private
   * @param {Object} test - Test configuration
   */
  async runSingleTest(test) {
    if (test.skip) {
      console.log(`⏭️  ${test.description} (skipped)`);
      this.results.skipped++;
      return;
    }

    const testContext = new TestContext();

    try {
      // Run beforeEach hook
      if (this.beforeEachFn) {
        await this.beforeEachFn();
      }

      // Run the test with timeout
      await this.runWithTimeout(
        () => test.testFn(testContext),
        test.timeout
      );

      console.log(`✅ ${test.description}`);
      this.results.passed++;

    } catch (error) {
      console.log(`❌ ${test.description}`);
      console.log(`   Error: ${error.message}`);
      
      this.results.failed++;
      this.results.errors.push({
        test: test.description,
        error: error.message,
        stack: error.stack
      });
    } finally {
      // Run afterEach hook
      try {
        if (this.afterEachFn) {
          await this.afterEachFn();
        }
      } catch (error) {
        console.error(`⚠️  afterEach error: ${error.message}`);
      }
    }
  }

  /**
   * Run function with timeout
   * @private
   * @param {Function} fn - Function to run
   * @param {number} timeout - Timeout in milliseconds
   */
  async runWithTimeout(fn, timeout) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Print test results
   * @private
   */
  printResults() {
    const duration = (this.results.endTime - this.results.startTime).toFixed(2);
    
    console.log('\n📊 Test Results:');
    console.log('─'.repeat(30));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    
    if (this.results.failed > 0) {
      console.log('\n💥 Failed Tests:');
      this.results.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
  }
}

/**
 * Test Context with assertion methods
 */
export class TestContext {
  constructor() {
    this.assertions = 0;
  }

  /**
   * Assert that value is truthy
   * @param {*} value - Value to test
   * @param {string} message - Error message
   */
  assert(value, message = 'Assertion failed') {
    this.assertions++;
    if (!value) {
      throw new Error(message);
    }
  }

  /**
   * Assert equality
   * @param {*} actual - Actual value
   * @param {*} expected - Expected value
   * @param {string} message - Error message
   */
  assertEqual(actual, expected, message) {
    this.assertions++;
    if (actual !== expected) {
      const msg = message || `Expected ${expected}, got ${actual}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert deep equality for objects
   * @param {*} actual - Actual value
   * @param {*} expected - Expected value
   * @param {string} message - Error message
   */
  assertDeepEqual(actual, expected, message) {
    this.assertions++;
    if (!this.deepEqual(actual, expected)) {
      const msg = message || `Deep equality failed: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that value is null or undefined
   * @param {*} value - Value to test
   * @param {string} message - Error message
   */
  assertNull(value, message) {
    this.assertions++;
    if (value !== null && value !== undefined) {
      const msg = message || `Expected null or undefined, got ${value}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that value is not null or undefined
   * @param {*} value - Value to test
   * @param {string} message - Error message
   */
  assertNotNull(value, message) {
    this.assertions++;
    if (value === null || value === undefined) {
      const msg = message || `Expected non-null value, got ${value}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that function throws an error
   * @param {Function} fn - Function to test
   * @param {string|RegExp} expectedError - Expected error message or pattern
   * @param {string} message - Error message
   */
  assertThrows(fn, expectedError, message) {
    this.assertions++;
    let threw = false;
    let actualError = null;

    try {
      fn();
    } catch (error) {
      threw = true;
      actualError = error;
    }

    if (!threw) {
      const msg = message || 'Expected function to throw an error';
      throw new Error(msg);
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        if (!actualError.message.includes(expectedError)) {
          throw new Error(`Expected error message to contain "${expectedError}", got "${actualError.message}"`);
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError.message)) {
          throw new Error(`Expected error message to match ${expectedError}, got "${actualError.message}"`);
        }
      }
    }
  }

  /**
   * Assert that async function throws an error
   * @param {Function} fn - Async function to test
   * @param {string|RegExp} expectedError - Expected error message or pattern
   * @param {string} message - Error message
   */
  async assertThrowsAsync(fn, expectedError, message) {
    this.assertions++;
    let threw = false;
    let actualError = null;

    try {
      await fn();
    } catch (error) {
      threw = true;
      actualError = error;
    }

    if (!threw) {
      const msg = message || 'Expected async function to throw an error';
      throw new Error(msg);
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        if (!actualError.message.includes(expectedError)) {
          throw new Error(`Expected error message to contain "${expectedError}", got "${actualError.message}"`);
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError.message)) {
          throw new Error(`Expected error message to match ${expectedError}, got "${actualError.message}"`);
        }
      }
    }
  }

  /**
   * Assert that value is instance of constructor
   * @param {*} value - Value to test
   * @param {Function} constructor - Constructor function
   * @param {string} message - Error message
   */
  assertInstanceOf(value, constructor, message) {
    this.assertions++;
    if (!(value instanceof constructor)) {
      const msg = message || `Expected instance of ${constructor.name}, got ${typeof value}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that value is of specific type
   * @param {*} value - Value to test
   * @param {string} type - Expected type
   * @param {string} message - Error message
   */
  assertType(value, type, message) {
    this.assertions++;
    if (typeof value !== type) {
      const msg = message || `Expected type ${type}, got ${typeof value}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that array contains value
   * @param {Array} array - Array to search
   * @param {*} value - Value to find
   * @param {string} message - Error message
   */
  assertContains(array, value, message) {
    this.assertions++;
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    if (!array.includes(value)) {
      const msg = message || `Expected array to contain ${value}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that string matches regular expression
   * @param {string} string - String to test
   * @param {RegExp} pattern - Regular expression
   * @param {string} message - Error message
   */
  assertMatches(string, pattern, message) {
    this.assertions++;
    if (!pattern.test(string)) {
      const msg = message || `Expected "${string}" to match ${pattern}`;
      throw new Error(msg);
    }
  }

  /**
   * Deep equality check
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean}
   */
  deepEqual(a, b) {
    if (a === b) return true;

    if (a == null || b == null) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      return true;
    }

    return false;
  }
}

/**
 * Test Runner for multiple suites
 */
export class TestRunner {
  constructor() {
    this.suites = [];
  }

  /**
   * Add test suite
   * @param {TestSuite} suite - Test suite to add
   */
  addSuite(suite) {
    this.suites.push(suite);
  }

  /**
   * Run all test suites
   * @returns {Promise<Object>} Combined results
   */
  async runAll() {
    console.log('🚀 Starting Test Runner');
    console.log('='.repeat(60));

    const startTime = performance.now();
    const allResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      suites: [],
      duration: 0
    };

    for (const suite of this.suites) {
      const result = await suite.run();
      
      allResults.passed += result.passed;
      allResults.failed += result.failed;
      allResults.skipped += result.skipped;
      allResults.total += result.total;
      allResults.suites.push({
        name: suite.name,
        ...result
      });
    }

    const endTime = performance.now();
    allResults.duration = endTime - startTime;

    this.printSummary(allResults);
    return allResults;
  }

  /**
   * Print test summary
   * @private
   * @param {Object} results - Combined results
   */
  printSummary(results) {
    console.log('\n🏁 Test Runner Summary');
    console.log('='.repeat(60));
    console.log(`📦 Suites: ${results.suites.length}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`⏱️  Total Duration: ${results.duration.toFixed(2)}ms`);
    
    const successRate = results.total > 0 
      ? (results.passed / (results.passed + results.failed) * 100).toFixed(1)
      : 0;
    console.log(`🎯 Overall Success Rate: ${successRate}%`);

    if (results.failed > 0) {
      console.log('\n💥 Failed Suites:');
      results.suites.forEach(suite => {
        if (suite.failed > 0) {
          console.log(`   • ${suite.name}: ${suite.failed} failed`);
        }
      });
    }

    console.log('\n' + (results.failed === 0 ? '🎉 All tests passed!' : '💔 Some tests failed'));
  }
}

/**
 * Mock utility for testing
 */
export class Mock {
  constructor(originalFn) {
    this.originalFn = originalFn;
    this.calls = [];
    this.returnValue = undefined;
    this.throwError = null;
    this.implementation = null;
  }

  /**
   * Set return value for mock
   * @param {*} value - Return value
   */
  returns(value) {
    this.returnValue = value;
    return this;
  }

  /**
   * Set error to throw
   * @param {Error} error - Error to throw
   */
  throws(error) {
    this.throwError = error;
    return this;
  }

  /**
   * Set custom implementation
   * @param {Function} fn - Implementation function
   */
  implementedBy(fn) {
    this.implementation = fn;
    return this;
  }

  /**
   * Mock function
   * @param {...any} args - Function arguments
   * @returns {*} Return value
   */
  fn(...args) {
    this.calls.push({
      args,
      timestamp: Date.now()
    });

    if (this.throwError) {
      throw this.throwError;
    }

    if (this.implementation) {
      return this.implementation(...args);
    }

    return this.returnValue;
  }

  /**
   * Check how many times mock was called
   * @returns {number} Call count
   */
  callCount() {
    return this.calls.length;
  }

  /**
   * Check if mock was called
   * @returns {boolean}
   */
  wasCalled() {
    return this.calls.length > 0;
  }

  /**
   * Check if mock was called with specific arguments
   * @param {...any} expectedArgs - Expected arguments
   * @returns {boolean}
   */
  wasCalledWith(...expectedArgs) {
    return this.calls.some(call => 
      call.args.length === expectedArgs.length &&
      call.args.every((arg, index) => arg === expectedArgs[index])
    );
  }

  /**
   * Get call arguments for specific call
   * @param {number} callIndex - Call index (0-based)
   * @returns {Array} Call arguments
   */
  getCall(callIndex) {
    return this.calls[callIndex]?.args || [];
  }

  /**
   * Reset mock state
   */
  reset() {
    this.calls = [];
    this.returnValue = undefined;
    this.throwError = null;
    this.implementation = null;
  }
}

/**
 * Create a mock function
 * @param {Function} originalFn - Original function (optional)
 * @returns {Mock} Mock instance
 */
export function createMock(originalFn) {
  const mock = new Mock(originalFn);
  return mock;
}

/**
 * DOM Testing Utilities
 */
export class DOMTestUtils {
  /**
   * Create test DOM element
   * @param {string} html - HTML string
   * @returns {HTMLElement} Created element
   */
  static createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
  }

  /**
   * Clean up test DOM elements
   * @param {HTMLElement} element - Element to remove
   */
  static cleanup(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Simulate click event
   * @param {HTMLElement} element - Element to click
   */
  static click(element) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
  }

  /**
   * Simulate keydown event
   * @param {HTMLElement} element - Target element
   * @param {string} key - Key to press
   * @param {Object} options - Event options
   */
  static keydown(element, key, options = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    });
    element.dispatchEvent(event);
  }

  /**
   * Simulate input event
   * @param {HTMLElement} element - Input element
   * @param {string} value - Input value
   */
  static input(element, value) {
    element.value = value;
    const event = new Event('input', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  /**
   * Wait for element to appear
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<HTMLElement>} Found element
   */
  static async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}

// Export convenience functions
export function describe(name, fn) {
  const suite = new TestSuite(name);
  fn(suite);
  return suite;
}

export function it(description, testFn) {
  // This is used within describe context
  throw new Error('it() must be called within describe()');
}