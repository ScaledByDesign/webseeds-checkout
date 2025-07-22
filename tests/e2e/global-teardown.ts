import { FullConfig } from '@playwright/test';

/**
 * Global teardown for BrowserStack E2E tests
 * 
 * This runs once after all tests complete and handles:
 * - Cleanup of test data
 * - BrowserStack session cleanup
 * - Report generation
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for BrowserStack E2E tests...');

  try {
    // Clean up any test data that was created during testing
    console.log('📋 Cleaning up test data...');
    
    // You can add cleanup logic here:
    // - Delete test user accounts
    // - Clean up test orders
    // - Reset database state
    // - Clean up uploaded files
    
    // Generate test report summary
    console.log('📈 Generating test report summary...');
    
    // You can add report generation logic here:
    // - Aggregate test results
    // - Generate custom reports
    // - Send notifications
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Error during global teardown:');
    console.error(error);
    
    // Don't exit with error code as this might mask test failures
    // Just log the error and continue
  }

  console.log('🏁 BrowserStack E2E test session finished\n');
}

export default globalTeardown;