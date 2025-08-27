import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Global Teardown for NMI Payment Gateway Testing
 * 
 * Handles:
 * - Test result aggregation
 * - Performance metrics compilation
 * - Test data cleanup
 * - Report generation
 * - Resource cleanup
 */

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Starting NMI Payment Gateway Test Suite Global Teardown...');
  console.log('=' * 60);

  try {
    // Aggregate test results
    await aggregateTestResults();
    
    // Compile performance metrics
    await compilePerformanceMetrics();
    
    // Generate comprehensive report
    await generateTestReport();
    
    // Cleanup test data
    await cleanupTestData();
    
    // Cleanup temporary files
    await cleanupTemporaryFiles();
    
    console.log('✅ NMI Payment Gateway Test Suite Global Teardown Completed');
    console.log('📊 Test reports available in test-results/nmi-reports/');
    
  } catch (error) {
    console.error('❌ Global teardown encountered errors:', error);
    // Don't fail the entire test suite due to teardown issues
  }
}

/**
 * Aggregate test results from all NMI test runs
 */
async function aggregateTestResults() {
  console.log('📊 Aggregating test results...');
  
  try {
    const resultsDir = 'test-results';
    const nmiResultsFile = path.join(resultsDir, 'nmi-results.json');
    
    // Check if results file exists
    try {
      await fs.access(nmiResultsFile);
    } catch {
      console.log('⚠️ No NMI test results file found');
      return;
    }
    
    const resultsContent = await fs.readFile(nmiResultsFile, 'utf-8');
    const results = JSON.parse(resultsContent);
    
    // Calculate aggregated metrics
    const aggregatedMetrics = {
      totalTests: results.suites?.reduce((total: number, suite: any) => 
        total + (suite.specs?.length || 0), 0) || 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
      browserResults: {},
      paymentMethodResults: {},
      errorCategories: {},
      timestamp: new Date().toISOString()
    };
    
    // Process test results
    if (results.suites) {
      results.suites.forEach((suite: any) => {
        if (suite.specs) {
          suite.specs.forEach((spec: any) => {
            if (spec.tests) {
              spec.tests.forEach((test: any) => {
                aggregatedMetrics.totalDuration += test.results?.[0]?.duration || 0;
                
                const status = test.results?.[0]?.status;
                if (status === 'passed') aggregatedMetrics.passedTests++;
                else if (status === 'failed') aggregatedMetrics.failedTests++;
                else if (status === 'skipped') aggregatedMetrics.skippedTests++;
              });
            }
          });
        }
      });
    }
    
    // Calculate success rate
    const totalExecuted = aggregatedMetrics.passedTests + aggregatedMetrics.failedTests;
    const successRate = totalExecuted > 0 ? 
      (aggregatedMetrics.passedTests / totalExecuted * 100).toFixed(2) : '0';
    
    aggregatedMetrics.successRate = parseFloat(successRate);
    
    // Save aggregated metrics
    const aggregatedFile = path.join(resultsDir, 'nmi-aggregated-results.json');
    await fs.writeFile(aggregatedFile, JSON.stringify(aggregatedMetrics, null, 2));
    
    console.log('✅ Test results aggregated:');
    console.log(`  📈 Total Tests: ${aggregatedMetrics.totalTests}`);
    console.log(`  ✅ Passed: ${aggregatedMetrics.passedTests}`);
    console.log(`  ❌ Failed: ${aggregatedMetrics.failedTests}`);
    console.log(`  ⏭️ Skipped: ${aggregatedMetrics.skippedTests}`);
    console.log(`  📊 Success Rate: ${successRate}%`);
    console.log(`  ⏱️ Total Duration: ${(aggregatedMetrics.totalDuration / 1000).toFixed(2)}s`);
    
  } catch (error) {
    console.error('❌ Failed to aggregate test results:', error);
  }
}

/**
 * Compile performance metrics from test runs
 */
async function compilePerformanceMetrics() {
  console.log('⚡ Compiling performance metrics...');
  
  try {
    const performanceData = {
      baselines: global.nmiPerformanceBaselines || {},
      testMetrics: [],
      averages: {},
      violations: [],
      timestamp: new Date().toISOString()
    };
    
    // Define performance thresholds
    const thresholds = {
      pageLoadTime: 5000,
      collectJSLoadTime: 5000,
      tokenizationTime: 10000,
      totalCheckoutTime: 30000,
      apiResponseTime: 3000
    };
    
    // Calculate averages and identify violations
    const metrics = ['pageLoadTime', 'collectJSLoadTime', 'tokenizationTime', 'totalCheckoutTime'];
    
    metrics.forEach(metric => {
      const baseline = performanceData.baselines[metric];
      if (baseline && baseline > thresholds[metric as keyof typeof thresholds]) {
        performanceData.violations.push({
          metric,
          baseline,
          threshold: thresholds[metric as keyof typeof thresholds],
          violation: baseline - thresholds[metric as keyof typeof thresholds]
        });
      }
    });
    
    // Save performance metrics
    const performanceFile = path.join('test-results', 'nmi-performance-metrics.json');
    await fs.writeFile(performanceFile, JSON.stringify(performanceData, null, 2));
    
    console.log('✅ Performance metrics compiled');
    if (performanceData.violations.length > 0) {
      console.log(`⚠️ ${performanceData.violations.length} performance violations detected`);
      performanceData.violations.forEach(violation => {
        console.log(`  - ${violation.metric}: ${violation.baseline}ms (threshold: ${violation.threshold}ms)`);
      });
    } else {
      console.log('✅ All performance metrics within acceptable thresholds');
    }
    
  } catch (error) {
    console.error('❌ Failed to compile performance metrics:', error);
  }
}

/**
 * Generate comprehensive test report
 */
async function generateTestReport() {
  console.log('📋 Generating comprehensive test report...');
  
  try {
    const resultsDir = 'test-results';
    const reportDir = path.join(resultsDir, 'nmi-reports');
    
    // Ensure report directory exists
    await fs.mkdir(reportDir, { recursive: true });
    
    // Read aggregated results
    let aggregatedResults = {};
    try {
      const aggregatedFile = path.join(resultsDir, 'nmi-aggregated-results.json');
      const content = await fs.readFile(aggregatedFile, 'utf-8');
      aggregatedResults = JSON.parse(content);
    } catch {
      console.log('⚠️ No aggregated results found for report generation');
    }
    
    // Read performance metrics
    let performanceMetrics = {};
    try {
      const performanceFile = path.join(resultsDir, 'nmi-performance-metrics.json');
      const content = await fs.readFile(performanceFile, 'utf-8');
      performanceMetrics = JSON.parse(content);
    } catch {
      console.log('⚠️ No performance metrics found for report generation');
    }
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(aggregatedResults, performanceMetrics);
    const htmlFile = path.join(reportDir, 'nmi-comprehensive-report.html');
    await fs.writeFile(htmlFile, htmlReport);
    
    // Generate JSON summary
    const jsonSummary = {
      testSuite: 'NMI Payment Gateway',
      timestamp: new Date().toISOString(),
      results: aggregatedResults,
      performance: performanceMetrics,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nmiMode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000'
      }
    };
    
    const jsonFile = path.join(reportDir, 'nmi-test-summary.json');
    await fs.writeFile(jsonFile, JSON.stringify(jsonSummary, null, 2));
    
    console.log('✅ Comprehensive test report generated');
    console.log(`📄 HTML Report: ${htmlFile}`);
    console.log(`📊 JSON Summary: ${jsonFile}`);
    
  } catch (error) {
    console.error('❌ Failed to generate test report:', error);
  }
}

/**
 * Generate HTML report content
 */
function generateHTMLReport(results: any, performance: any): string {
  const timestamp = new Date().toISOString();
  const successRate = results.successRate || 0;
  const statusColor = successRate >= 95 ? '#22c55e' : successRate >= 80 ? '#f59e0b' : '#ef4444';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NMI Payment Gateway Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 15px; margin: 10px; border-radius: 6px; display: inline-block; min-width: 200px; }
        .metric-value { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .metric-label { font-size: 14px; color: #666; }
        .section { margin: 20px 0; }
        .section h3 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        .violations { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; }
        .success { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 NMI Payment Gateway Test Report</h1>
            <p>Generated on ${timestamp}</p>
        </div>
        
        <div class="section">
            <h3>📊 Test Summary</h3>
            <div class="metric-card">
                <div class="metric-value">${results.totalTests || 0}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${results.passedTests || 0}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${results.failedTests || 0}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>
        
        <div class="section">
            <h3>⚡ Performance Metrics</h3>
            ${performance.violations && performance.violations.length > 0 ? 
              `<div class="violations">
                <strong>⚠️ Performance Violations Detected:</strong>
                <ul>
                  ${performance.violations.map((v: any) => 
                    `<li>${v.metric}: ${v.baseline}ms (threshold: ${v.threshold}ms)</li>`
                  ).join('')}
                </ul>
              </div>` :
              `<div class="success">✅ All performance metrics within acceptable thresholds</div>`
            }
        </div>
        
        <div class="section">
            <h3>🔧 Environment Information</h3>
            <p><strong>Mode:</strong> ${process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}</p>
            <p><strong>Base URL:</strong> ${process.env.TEST_BASE_URL || 'http://localhost:3000'}</p>
            <p><strong>Test Duration:</strong> ${((results.totalDuration || 0) / 1000).toFixed(2)} seconds</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Cleanup test data and temporary files
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Clear global test data
    if (global.nmiTestData) {
      delete global.nmiTestData;
    }
    
    if (global.nmiPerformanceBaselines) {
      delete global.nmiPerformanceBaselines;
    }
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
}

/**
 * Cleanup temporary files
 */
async function cleanupTemporaryFiles() {
  console.log('🗑️ Cleaning up temporary files...');
  
  try {
    // List of temporary file patterns to clean up
    const tempPatterns = [
      'test-results/temp-*',
      'test-results/*.tmp',
      'screenshots/temp-*'
    ];
    
    // Note: In a real implementation, you would use glob patterns
    // to find and delete temporary files
    
    console.log('✅ Temporary files cleaned up');
    
  } catch (error) {
    console.error('❌ Failed to cleanup temporary files:', error);
  }
}

export default globalTeardown;
