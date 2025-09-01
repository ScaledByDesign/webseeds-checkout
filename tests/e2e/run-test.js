#!/usr/bin/env node

/**
 * Individual Test Runner
 * Usage: node run-test.js [test-name]
 * Example: node run-test.js declined
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const availableTests = {
  'complete': 'test-complete-flow-fresh.js',
  'baseline': 'test-complete-flow-fresh.js',
  'success': 'test-complete-flow-fresh.js',
  
  'declined': 'test-declined-transaction.js',
  'decline': 'test-declined-transaction.js',
  
  'duplicate': 'test-duplicate-transaction.js',
  'dupe': 'test-duplicate-transaction.js',
  
  'invalid': 'test-invalid-card.js',
  'validation': 'test-invalid-card.js',
  
  'cards': 'test-card-types.js',
  'types': 'test-card-types.js',
  'compatibility': 'test-card-types.js',
  
  'all': 'run-all-tests.js'
};

function showUsage() {
  console.log('🧪 WEBSEEDS CHECKOUT - Individual Test Runner');
  console.log('═'.repeat(50));
  console.log('');
  console.log('Usage: node run-test.js [test-name]');
  console.log('');
  console.log('Available tests:');
  console.log('');
  
  const testGroups = {
    'Success Flow': ['complete', 'baseline', 'success'],
    'Error Handling': ['declined', 'decline', 'duplicate', 'dupe'],
    'Validation': ['invalid', 'validation'],
    'Compatibility': ['cards', 'types', 'compatibility'],
    'All Tests': ['all']
  };
  
  Object.entries(testGroups).forEach(([group, tests]) => {
    console.log(`📋 ${group}:`);
    tests.forEach(test => {
      const file = availableTests[test];
      console.log(`   ${test.padEnd(12)} → ${file}`);
    });
    console.log('');
  });
  
  console.log('Examples:');
  console.log('   node run-test.js complete    # Run successful flow test');
  console.log('   node run-test.js declined    # Run declined transaction test');
  console.log('   node run-test.js duplicate   # Run duplicate handling test');
  console.log('   node run-test.js cards       # Run card types test');
  console.log('   node run-test.js all         # Run all tests');
  console.log('');
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running test: ${testFile}`);
    console.log('─'.repeat(50));
    
    const testPath = path.join(__dirname, testFile);
    
    if (!fs.existsSync(testPath)) {
      console.log(`❌ Test file not found: ${testFile}`);
      reject(new Error(`Test file not found: ${testFile}`));
      return;
    }
    
    const startTime = Date.now();
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    
    child.on('close', (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log('');
      console.log('═'.repeat(50));
      
      if (code === 0) {
        console.log(`✅ Test completed successfully (${duration}s)`);
        resolve(code);
      } else {
        console.log(`❌ Test failed with exit code ${code} (${duration}s)`);
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ Failed to run test: ${error.message}`);
      reject(error);
    });
  });
}

async function main() {
  const testName = process.argv[2];
  
  if (!testName) {
    showUsage();
    process.exit(1);
  }
  
  const testFile = availableTests[testName.toLowerCase()];
  
  if (!testFile) {
    console.log(`❌ Unknown test: ${testName}`);
    console.log('');
    showUsage();
    process.exit(1);
  }
  
  try {
    console.log(`📅 Started: ${new Date().toLocaleString()}`);
    console.log('');
    
    await runTest(testFile);
    
    console.log('');
    console.log(`📅 Finished: ${new Date().toLocaleString()}`);
    console.log('🎉 Test execution completed!');
    
  } catch (error) {
    console.log('');
    console.log(`📅 Failed: ${new Date().toLocaleString()}`);
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
