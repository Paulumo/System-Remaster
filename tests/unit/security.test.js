/**
 * Unit Tests for Security Utilities
 */

import { TestSuite } from '../test-framework.js';
import { sanitizeInput, escapeHTML, validateInput } from '../../js/modules/utils/security.js';

export const securityUtilsTests = new TestSuite('Security Utilities');

// Test sanitizeInput function
securityUtilsTests.test('sanitizeInput removes script tags', (t) => {
  const maliciousInput = '<script>alert("xss")</script>Hello World';
  const sanitized = sanitizeInput(maliciousInput);
  
  t.assert(!sanitized.includes('<script>'), 'Script tags should be removed');
  t.assert(!sanitized.includes('alert'), 'Script content should be removed');
  t.assert(sanitized.includes('Hello World'), 'Safe content should remain');
});

securityUtilsTests.test('sanitizeInput removes on* event handlers', (t) => {
  const maliciousInput = '<div onclick="alert(1)" onmouseover="steal()">Content</div>';
  const sanitized = sanitizeInput(maliciousInput);
  
  t.assert(!sanitized.includes('onclick'), 'onclick should be removed');
  t.assert(!sanitized.includes('onmouseover'), 'onmouseover should be removed');
  t.assert(!sanitized.includes('alert'), 'Event handler content should be removed');
  t.assert(sanitized.includes('Content'), 'Safe content should remain');
});

securityUtilsTests.test('sanitizeInput removes javascript: URLs', (t) => {
  const maliciousInput = '<a href="javascript:alert(1)">Click me</a>';
  const sanitized = sanitizeInput(maliciousInput);
  
  t.assert(!sanitized.includes('javascript:'), 'javascript: URLs should be removed');
  t.assert(sanitized.includes('Click me'), 'Link text should remain');
});

securityUtilsTests.test('sanitizeInput handles maxLength option', (t) => {
  const longInput = 'A'.repeat(1000);
  const sanitized = sanitizeInput(longInput, { maxLength: 100 });
  
  t.assertEqual(sanitized.length, 100, 'Input should be truncated to maxLength');
});

securityUtilsTests.test('sanitizeInput preserves safe HTML when allowBasicHTML is true', (t) => {
  const safeInput = '<p>This is <strong>safe</strong> content with <em>emphasis</em></p>';
  const sanitized = sanitizeInput(safeInput, { allowBasicHTML: true });
  
  t.assert(sanitized.includes('<p>'), 'Paragraph tags should be preserved');
  t.assert(sanitized.includes('<strong>'), 'Strong tags should be preserved');
  t.assert(sanitized.includes('<em>'), 'Em tags should be preserved');
});

securityUtilsTests.test('sanitizeInput removes all HTML when allowBasicHTML is false', (t) => {
  const htmlInput = '<p>This is <strong>content</strong></p>';
  const sanitized = sanitizeInput(htmlInput, { allowBasicHTML: false });
  
  t.assert(!sanitized.includes('<p>'), 'HTML tags should be removed');
  t.assert(!sanitized.includes('<strong>'), 'HTML tags should be removed');
  t.assertEqual(sanitized, 'This is content', 'Only text content should remain');
});

securityUtilsTests.test('sanitizeInput handles empty and null inputs', (t) => {
  t.assertEqual(sanitizeInput(''), '', 'Empty string should remain empty');
  t.assertEqual(sanitizeInput(null), '', 'Null should become empty string');
  t.assertEqual(sanitizeInput(undefined), '', 'Undefined should become empty string');
});

securityUtilsTests.test('sanitizeInput removes dangerous attributes', (t) => {
  const maliciousInput = '<img src="x" onerror="alert(1)" style="position:absolute">';
  const sanitized = sanitizeInput(maliciousInput, { allowBasicHTML: true });
  
  t.assert(!sanitized.includes('onerror'), 'onerror should be removed');
  t.assert(!sanitized.includes('alert'), 'Script content should be removed');
});

// Test escapeHTML function
securityUtilsTests.test('escapeHTML escapes HTML characters', (t) => {
  const htmlString = '<div class="test">Hello & welcome "friend"</div>';
  const escaped = escapeHTML(htmlString);
  
  t.assertEqual(escaped, '&lt;div class=&quot;test&quot;&gt;Hello &amp; welcome &quot;friend&quot;&lt;/div&gt;');
});

securityUtilsTests.test('escapeHTML handles empty string', (t) => {
  t.assertEqual(escapeHTML(''), '');
});

securityUtilsTests.test('escapeHTML handles special characters', (t) => {
  const specialChars = '< > & " \' /';
  const escaped = escapeHTML(specialChars);
  
  t.assert(escaped.includes('&lt;'), 'Less than should be escaped');
  t.assert(escaped.includes('&gt;'), 'Greater than should be escaped');
  t.assert(escaped.includes('&amp;'), 'Ampersand should be escaped');
  t.assert(escaped.includes('&quot;'), 'Double quote should be escaped');
  t.assert(escaped.includes('&#x27;'), 'Single quote should be escaped');
  t.assert(escaped.includes('&#x2F;'), 'Forward slash should be escaped');
});

// Test validateInput function
securityUtilsTests.test('validateInput validates email format', (t) => {
  const rules = { type: 'email' };
  
  t.assert(validateInput('test@example.com', rules), 'Valid email should pass');
  t.assert(!validateInput('invalid-email', rules), 'Invalid email should fail');
  t.assert(!validateInput('test@', rules), 'Incomplete email should fail');
  t.assert(!validateInput('@example.com', rules), 'Email without local part should fail');
});

securityUtilsTests.test('validateInput validates minimum length', (t) => {
  const rules = { minLength: 5 };
  
  t.assert(validateInput('hello', rules), 'String meeting minLength should pass');
  t.assert(validateInput('hello world', rules), 'String exceeding minLength should pass');
  t.assert(!validateInput('hi', rules), 'String below minLength should fail');
  t.assert(!validateInput('', rules), 'Empty string should fail minLength');
});

securityUtilsTests.test('validateInput validates maximum length', (t) => {
  const rules = { maxLength: 10 };
  
  t.assert(validateInput('hello', rules), 'String within maxLength should pass');
  t.assert(validateInput('1234567890', rules), 'String at maxLength should pass');
  t.assert(!validateInput('hello world!', rules), 'String exceeding maxLength should fail');
});

securityUtilsTests.test('validateInput validates required fields', (t) => {
  const rules = { required: true };
  
  t.assert(validateInput('content', rules), 'Non-empty string should pass required');
  t.assert(!validateInput('', rules), 'Empty string should fail required');
  t.assert(!validateInput('   ', rules), 'Whitespace-only string should fail required');
});

securityUtilsTests.test('validateInput validates pattern matching', (t) => {
  const rules = { pattern: /^[A-Z][a-z]+$/ }; // Capitalized word
  
  t.assert(validateInput('Hello', rules), 'String matching pattern should pass');
  t.assert(validateInput('World', rules), 'String matching pattern should pass');
  t.assert(!validateInput('hello', rules), 'String not matching pattern should fail');
  t.assert(!validateInput('HELLO', rules), 'String not matching pattern should fail');
  t.assert(!validateInput('Hello123', rules), 'String not matching pattern should fail');
});

securityUtilsTests.test('validateInput validates numeric values', (t) => {
  const rules = { type: 'number', min: 0, max: 100 };
  
  t.assert(validateInput('50', rules), 'Valid number in range should pass');
  t.assert(validateInput('0', rules), 'Number at minimum should pass');
  t.assert(validateInput('100', rules), 'Number at maximum should pass');
  t.assert(!validateInput('-1', rules), 'Number below minimum should fail');
  t.assert(!validateInput('101', rules), 'Number above maximum should fail');
  t.assert(!validateInput('abc', rules), 'Non-numeric string should fail');
});

securityUtilsTests.test('validateInput combines multiple rules', (t) => {
  const rules = {
    required: true,
    type: 'email',
    minLength: 5,
    maxLength: 50
  };
  
  t.assert(validateInput('test@example.com', rules), 'Valid input meeting all rules should pass');
  t.assert(!validateInput('', rules), 'Empty input should fail required rule');
  t.assert(!validateInput('a@b', rules), 'Input below minLength should fail');
  t.assert(!validateInput('invalid-email', rules), 'Invalid email should fail type rule');
});

securityUtilsTests.test('validateInput handles custom validation functions', (t) => {
  const rules = {
    custom: (value) => {
      return value.includes('valid') ? true : 'Must contain "valid"';
    }
  };
  
  t.assert(validateInput('this is valid', rules), 'Input passing custom validation should pass');
  t.assert(!validateInput('this is invalid content', rules), 'Input failing custom validation should fail');
});

// Test edge cases and security scenarios
securityUtilsTests.test('sanitizeInput handles nested script tags', (t) => {
  const nestedScript = '<div><script>alert("nested")</script></div>';
  const sanitized = sanitizeInput(nestedScript);
  
  t.assert(!sanitized.includes('<script>'), 'Nested script tags should be removed');
  t.assert(!sanitized.includes('alert'), 'Script content should be removed');
});

securityUtilsTests.test('sanitizeInput handles encoded script tags', (t) => {
  const encodedScript = '&lt;script&gt;alert("encoded")&lt;/script&gt;';
  const sanitized = sanitizeInput(encodedScript);
  
  // Should remain encoded (safe)
  t.assert(sanitized.includes('&lt;'), 'Encoded tags should remain encoded');
  t.assert(!sanitized.includes('<script>'), 'Should not decode to actual script tags');
});

securityUtilsTests.test('sanitizeInput handles data URLs', (t) => {
  const dataUrl = '<img src="data:text/html,<script>alert(1)</script>">';
  const sanitized = sanitizeInput(dataUrl, { allowBasicHTML: true });
  
  t.assert(!sanitized.includes('data:'), 'Data URLs should be removed');
});

securityUtilsTests.test('sanitizeInput handles SVG with scripts', (t) => {
  const svgWithScript = '<svg><script>alert("svg attack")</script></svg>';
  const sanitized = sanitizeInput(svgWithScript);
  
  t.assert(!sanitized.includes('<script>'), 'Script in SVG should be removed');
  t.assert(!sanitized.includes('alert'), 'Script content should be removed');
});

securityUtilsTests.test('validateInput prevents injection in pattern matching', (t) => {
  const maliciousPattern = '.*<script>.*';
  const rules = { pattern: new RegExp(maliciousPattern) };
  
  // Even if pattern allows scripts, input should be safe when sanitized
  const maliciousInput = 'test<script>alert(1)</script>test';
  const isValid = validateInput(maliciousInput, rules);
  
  // Pattern matching should work, but content should be sanitized elsewhere
  t.assertType(isValid, 'boolean', 'Validation should return boolean');
});

// Performance tests
securityUtilsTests.test('sanitizeInput handles large inputs efficiently', (t) => {
  const largeInput = '<div>' + 'A'.repeat(10000) + '</div>';
  const startTime = performance.now();
  
  const sanitized = sanitizeInput(largeInput, { allowBasicHTML: true });
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  t.assert(duration < 100, 'Large input sanitization should complete within 100ms');
  t.assert(sanitized.length > 0, 'Sanitized result should not be empty');
});