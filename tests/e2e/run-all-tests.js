const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Test Suite Runner
 * Executes all E2E tests in sequence and generates a comprehensive report
 */

const tests = [
  {
    name: 'Complete Flow (Baseline)',
    file: 'test-complete-flow-fresh.js',
    description: 'Full successful checkout + upsell flow',
    category: 'success'
  },
  {
    name: 'Declined Transaction',
    file: 'test-declined-transaction.js',
    description: 'Amount < $1.00 triggers card declined',
    category: 'error'
  },
  {
    name: 'Duplicate Transaction',
    file: 'test-duplicate-transaction.js',
    description: 'Duplicate orders redirect to upsell (no error)',
    category: 'error'
  },
  {
    name: 'Invalid Card Numbers',
    file: 'test-invalid-card.js',
    description: 'Various invalid card scenarios',
    category: 'validation'
  },
  {
    name: 'Card Types Support',
    file: 'test-card-types.js',
    description: 'Visa, MasterCard, Amex, Discover, etc.',
    category: 'compatibility'
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`🚀 Running: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    const testPath = path.join(__dirname, test.file);
    
    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      console.log(`❌ Test file not found: ${test.file}`);
      resolve({
        ...test,
        status: 'MISSING',
        duration: 0,
        output: 'Test file not found'
      });
      return;
    }

    const child = spawn('node', [testPath], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '../..')
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const status = code === 0 ? 'PASSED' : 'FAILED';
      
      console.log('');
      console.log(`${status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${status} (${Math.round(duration/1000)}s)`);
      console.log('═'.repeat(60));
      console.log('');

      resolve({
        ...test,
        status,
        duration,
        output,
        errorOutput,
        exitCode: code
      });
    });

    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      console.log('═'.repeat(60));
      console.log('');

      resolve({
        ...test,
        status: 'ERROR',
        duration,
        output,
        errorOutput: error.message,
        exitCode: -1
      });
    });
  });
}

function generateReport(results) {
  console.log('📊 TEST SUITE RESULTS');
  console.log('═'.repeat(80));
  console.log('');

  // Summary stats
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const missing = results.filter(r => r.status === 'MISSING').length;
  const total = results.length;

  console.log(`📈 SUMMARY: ${passed}/${total} tests passed`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   🚫 Errors: ${errors}`);
  console.log(`   📁 Missing: ${missing}`);
  console.log('');

  // Category breakdown
  const categories = {};
  results.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = { passed: 0, total: 0 };
    }
    categories[result.category].total++;
    if (result.status === 'PASSED') {
      categories[result.category].passed++;
    }
  });

  console.log('📋 BY CATEGORY:');
  Object.entries(categories).forEach(([category, stats]) => {
    const percentage = Math.round((stats.passed / stats.total) * 100);
    console.log(`   ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
  });
  console.log('');

  // Detailed results
  console.log('📝 DETAILED RESULTS:');
  results.forEach((result, index) => {
    const icon = result.status === 'PASSED' ? '✅' : 
                 result.status === 'FAILED' ? '❌' : 
                 result.status === 'ERROR' ? '🚫' : '📁';
    
    const duration = Math.round(result.duration / 1000);
    console.log(`${icon} ${result.name} (${duration}s)`);
    console.log(`   📝 ${result.description}`);
    console.log(`   📁 ${result.file}`);
    
    if (result.status !== 'PASSED') {
      console.log(`   ❌ Status: ${result.status}`);
      if (result.errorOutput) {
        const errorLines = result.errorOutput.split('\n').slice(0, 3);
        errorLines.forEach(line => {
          if (line.trim()) {
            console.log(`   └─ ${line.trim()}`);
          }
        });
      }
    }
    console.log('');
  });

  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  if (failed > 0) {
    console.log('   🔧 Review failed tests for error handling improvements');
  }
  if (errors > 0) {
    console.log('   🐛 Fix test execution errors before deployment');
  }
  if (missing > 0) {
    console.log('   📝 Create missing test files for complete coverage');
  }
  if (passed === total) {
    console.log('   🎉 All tests passing! Ready for deployment');
  }
  console.log('');

  // Save report to file
  const reportPath = path.join(__dirname, '../reports/test-suite-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, errors, missing },
    categories,
    results
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`💾 Report saved: ${reportPath}`);
}

async function main() {
  console.log('🧪 WEBSEEDS CHECKOUT - E2E TEST SUITE');
  console.log('═'.repeat(80));
  console.log('🎯 Testing enhanced error handling and user experience');
  console.log('📋 Based on NMI testing documentation scenarios');
  console.log('');
  console.log(`📅 Started: ${new Date().toLocaleString()}`);
  console.log(`📁 Tests: ${tests.length} total`);
  console.log('');

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  generateReport(results);

  console.log('🏁 Test suite completed!');
  console.log(`📅 Finished: ${new Date().toLocaleString()}`);
  
  // Exit with appropriate code
  const hasFailures = results.some(r => r.status !== 'PASSED');
  process.exit(hasFailures ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test suite interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test suite terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
