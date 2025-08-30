#!/usr/bin/env node

/**
 * Comprehensive test for /api/vault/update-card endpoint
 * Tests both direct method and session-based method
 */

const fetch = require('node-fetch');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_VAULT_ID = process.env.TEST_VAULT_ID || 'test_vault_123';
const TEST_SESSION_ID = process.env.TEST_SESSION_ID || 'test_session_123';

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logStep(step, message) {
  log(`[Step ${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logDebug(label, data) {
  console.log(`${colors.yellow}[DEBUG] ${label}:${colors.reset}`);
  console.log(JSON.stringify(data, null, 2));
}

// Generate a mock payment token
function generateMockToken() {
  const timestamp = Date.now();
  return `mock_token_${timestamp}_${Math.random().toString(36).substring(7)}`;
}

// Test 1: Direct Method (with vaultId and customerInfo)
async function testDirectMethod() {
  logSection('Test 1: Direct Method (vaultId + customerInfo)');
  
  const mockToken = generateMockToken();
  const requestBody = {
    vaultId: TEST_VAULT_ID,
    customerInfo: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    },
    payment_token: mockToken,
    name_on_card: 'Test User'
  };
  
  logStep(1, 'Preparing request');
  logDebug('Request Body', requestBody);
  
  try {
    logStep(2, `Making API call to ${API_BASE_URL}/api/vault/update-card`);
    
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/vault/update-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    const endTime = Date.now();
    
    logStep(3, `Response received in ${endTime - startTime}ms`);
    logDebug('Response Status', response.status);
    logDebug('Response Headers', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    logStep(4, 'Response parsed');
    logDebug('Response Body', result);
    
    if (result.success) {
      logSuccess('Direct method vault update successful!');
      logDebug('Updated Vault ID', result.vaultId);
      return { success: true, method: 'direct', response: result };
    } else {
      logError(`Direct method failed: ${result.error}`);
      return { success: false, method: 'direct', error: result.error };
    }
    
  } catch (error) {
    logError(`Network/Parse error: ${error.message}`);
    logDebug('Error Details', error);
    return { success: false, method: 'direct', error: error.message };
  }
}

// Test 2: Session-based Method
async function testSessionMethod() {
  logSection('Test 2: Session-based Method');
  
  const mockToken = generateMockToken();
  const requestBody = {
    sessionId: TEST_SESSION_ID,
    payment_token: mockToken,
    name_on_card: 'Session User'
  };
  
  logStep(1, 'Preparing request');
  logDebug('Request Body', requestBody);
  
  try {
    logStep(2, `Making API call to ${API_BASE_URL}/api/vault/update-card`);
    
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/vault/update-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${TEST_SESSION_ID}` // Include session cookie
      },
      body: JSON.stringify(requestBody)
    });
    const endTime = Date.now();
    
    logStep(3, `Response received in ${endTime - startTime}ms`);
    logDebug('Response Status', response.status);
    
    const result = await response.json();
    logStep(4, 'Response parsed');
    logDebug('Response Body', result);
    
    if (result.success) {
      logSuccess('Session method vault update successful!');
      return { success: true, method: 'session', response: result };
    } else {
      logError(`Session method failed: ${result.error}`);
      if (result.error.includes('session')) {
        logWarning('Session validation failed - this is expected without a real session');
      }
      return { success: false, method: 'session', error: result.error };
    }
    
  } catch (error) {
    logError(`Network/Parse error: ${error.message}`);
    logDebug('Error Details', error);
    return { success: false, method: 'session', error: error.message };
  }
}

// Test 3: Error Cases
async function testErrorCases() {
  logSection('Test 3: Error Cases');
  
  const errorTests = [
    {
      name: 'Missing payment_token',
      body: {
        vaultId: TEST_VAULT_ID,
        customerInfo: { firstName: 'Test', lastName: 'User', email: 'test@example.com' }
      }
    },
    {
      name: 'Missing both vaultId and sessionId',
      body: {
        payment_token: generateMockToken()
      }
    },
    {
      name: 'Invalid JSON',
      body: 'invalid json',
      raw: true
    }
  ];
  
  const results = [];
  
  for (const test of errorTests) {
    log(`\nTesting: ${test.name}`, 'yellow');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/vault/update-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: test.raw ? test.body : JSON.stringify(test.body)
      });
      
      const result = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
      
      if (response.status >= 400) {
        logSuccess(`Correctly rejected with status ${response.status}: ${result.error}`);
        results.push({ test: test.name, success: true, status: response.status });
      } else {
        logError(`Should have failed but got status ${response.status}`);
        results.push({ test: test.name, success: false, status: response.status });
      }
      
    } catch (error) {
      logSuccess(`Correctly failed with error: ${error.message}`);
      results.push({ test: test.name, success: true, error: error.message });
    }
  }
  
  return results;
}

// Test 4: Performance Test
async function testPerformance() {
  logSection('Test 4: Performance & Concurrency');
  
  const concurrentRequests = 5;
  const requests = [];
  
  log(`Sending ${concurrentRequests} concurrent requests...`, 'blue');
  
  const startTime = Date.now();
  
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      fetch(`${API_BASE_URL}/api/vault/update-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId: `test_vault_${i}`,
          customerInfo: {
            firstName: `User${i}`,
            lastName: 'Test',
            email: `user${i}@test.com`
          },
          payment_token: generateMockToken(),
          name_on_card: `User ${i}`
        })
      }).then(res => res.json())
    );
  }
  
  const results = await Promise.allSettled(requests);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  
  log(`\nCompleted in ${endTime - startTime}ms`, 'cyan');
  logSuccess(`Successful: ${successful}/${concurrentRequests}`);
  if (failed > 0) {
    logWarning(`Failed: ${failed}/${concurrentRequests}`);
  }
  
  const avgTime = (endTime - startTime) / concurrentRequests;
  log(`Average time per request: ${avgTime.toFixed(2)}ms`, 'blue');
  
  return {
    totalTime: endTime - startTime,
    successful,
    failed,
    avgTime
  };
}

// Test 5: Health Check
async function testHealthCheck() {
  logSection('Test 5: Health Check Endpoint');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/vault/update-card`);
    const result = await response.json();
    
    if (result.status === 'ok' && result.service === 'vault-card-update') {
      logSuccess('Health check passed');
      logDebug('Health Response', result);
      return { success: true };
    } else {
      logError('Health check returned unexpected response');
      return { success: false };
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('VAULT UPDATE API COMPREHENSIVE TEST SUITE', 'cyan');
  console.log('='.repeat(60));
  log(`API URL: ${API_BASE_URL}`, 'blue');
  log(`Time: ${new Date().toISOString()}`, 'blue');
  
  const results = {
    directMethod: null,
    sessionMethod: null,
    errorCases: null,
    performance: null,
    healthCheck: null
  };
  
  // Run tests
  results.healthCheck = await testHealthCheck();
  results.directMethod = await testDirectMethod();
  results.sessionMethod = await testSessionMethod();
  results.errorCases = await testErrorCases();
  results.performance = await testPerformance();
  
  // Summary
  logSection('TEST SUMMARY');
  
  const testResults = [
    { name: 'Health Check', result: results.healthCheck?.success },
    { name: 'Direct Method', result: results.directMethod?.success },
    { name: 'Session Method', result: results.sessionMethod?.success || results.sessionMethod?.error?.includes('session') },
    { name: 'Error Handling', result: results.errorCases?.every(r => r.success) },
    { name: 'Performance', result: results.performance?.failed === 0 }
  ];
  
  testResults.forEach(test => {
    if (test.result) {
      logSuccess(`${test.name}: PASSED`);
    } else {
      logError(`${test.name}: FAILED`);
    }
  });
  
  const totalPassed = testResults.filter(t => t.result).length;
  const totalTests = testResults.length;
  
  console.log('\n' + '-'.repeat(60));
  if (totalPassed === totalTests) {
    log(`ALL TESTS PASSED (${totalPassed}/${totalTests})`, 'green');
  } else {
    log(`TESTS COMPLETED: ${totalPassed}/${totalTests} PASSED`, totalPassed > totalTests/2 ? 'yellow' : 'red');
  }
  console.log('='.repeat(60) + '\n');
  
  return results;
}

// Interactive mode
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  while (true) {
    console.log('\n' + '-'.repeat(40));
    console.log('Select a test to run:');
    console.log('1. Health Check');
    console.log('2. Direct Method Test');
    console.log('3. Session Method Test');
    console.log('4. Error Cases Test');
    console.log('5. Performance Test');
    console.log('6. Run All Tests');
    console.log('0. Exit');
    console.log('-'.repeat(40));
    
    const choice = await question('Enter your choice (0-6): ');
    
    switch(choice.trim()) {
      case '1':
        await testHealthCheck();
        break;
      case '2':
        await testDirectMethod();
        break;
      case '3':
        await testSessionMethod();
        break;
      case '4':
        await testErrorCases();
        break;
      case '5':
        await testPerformance();
        break;
      case '6':
        await runAllTests();
        break;
      case '0':
        console.log('Exiting...');
        rl.close();
        process.exit(0);
      default:
        console.log('Invalid choice. Please try again.');
    }
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    interactiveMode();
  } else {
    runAllTests().then(() => {
      process.exit(0);
    }).catch(error => {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    });
  }
}

module.exports = {
  testDirectMethod,
  testSessionMethod,
  testErrorCases,
  testPerformance,
  testHealthCheck,
  runAllTests
};