#!/usr/bin/env node

/**
 * Asset Validation Script
 * Validates all assets are properly synchronized and optimized
 */

const fs = require('fs');
const path = require('path');

// Asset directories
const DESIGN_ASSETS_DIR = 'public/design/assets/images';
const APP_ASSETS_DIR = 'public/assets/images';

// Required assets for checkout page
const REQUIRED_ASSETS = [
  // Brand assets
  'Logo.svg',
  'lock.svg',
  
  // Payment icons
  'visa.svg',
  'mastercard.svg',
  'american-express.svg',
  'PayPal.svg',
  'applypay.svg',
  'googlepay.svg',
  
  // Security badges
  'mcafee-seeklogo.svg',
  'Norton.svg',
  'Truste.svg',
  
  // UI elements
  'check.svg',
  'check-dark.svg',
  'info.svg',
  'star.svg',
  
  // Product images
  '6-bottles.png',
  '6-bottles.webp',
  'bonus-call.png',
  'bonus-call.webp',
  'bonus-ebooks.png',
  'bonus-ebooks.webp',
  'money-back.png',
  'money-back.webp',
  
  // Customer photos
  'olivia.png',
  'olivia.webp',
  'emily.png',
  'emily.webp'
];

// Asset validation results
const results = {
  missing: [],
  present: [],
  webpOptimized: [],
  needsOptimization: [],
  errors: []
};

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Validate required assets
 */
function validateRequiredAssets() {
  console.log('🔍 Validating required assets...\n');
  
  REQUIRED_ASSETS.forEach(asset => {
    const assetPath = path.join(APP_ASSETS_DIR, asset);
    
    if (fileExists(assetPath)) {
      results.present.push(asset);
      
      // Check for WebP optimization
      if (asset.endsWith('.png')) {
        const webpPath = assetPath.replace('.png', '.webp');
        if (fileExists(webpPath)) {
          results.webpOptimized.push(asset);
        } else {
          results.needsOptimization.push(asset);
        }
      }
    } else {
      results.missing.push(asset);
    }
  });
}

/**
 * Check asset synchronization with design
 */
function checkAssetSync() {
  console.log('🔄 Checking asset synchronization...\n');
  
  try {
    const designAssets = fs.readdirSync(DESIGN_ASSETS_DIR);
    const appAssets = fs.readdirSync(APP_ASSETS_DIR);
    
    // Check for missing assets from design
    designAssets.forEach(asset => {
      if (!appAssets.includes(asset)) {
        results.missing.push(`Missing from app: ${asset}`);
      }
    });
    
    // Check for extra assets in app
    appAssets.forEach(asset => {
      if (!designAssets.includes(asset) && !asset.includes('-big') && asset !== 'ApplePay.svg') {
        console.log(`ℹ️  Extra asset in app: ${asset}`);
      }
    });
    
  } catch (error) {
    results.errors.push(`Error checking sync: ${error.message}`);
  }
}

/**
 * Validate asset optimization
 */
function validateOptimization() {
  console.log('⚡ Validating asset optimization...\n');
  
  REQUIRED_ASSETS.forEach(asset => {
    const assetPath = path.join(APP_ASSETS_DIR, asset);
    
    if (fileExists(assetPath)) {
      const size = getFileSize(assetPath);
      
      // Check for large files that might need optimization
      if (asset.endsWith('.png') && size > 100000) { // 100KB
        results.needsOptimization.push(`Large PNG: ${asset} (${Math.round(size/1024)}KB)`);
      }
      
      if (asset.endsWith('.svg') && size > 50000) { // 50KB
        results.needsOptimization.push(`Large SVG: ${asset} (${Math.round(size/1024)}KB)`);
      }
    }
  });
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('📊 ASSET VALIDATION REPORT');
  console.log('=' .repeat(50));
  
  // Summary
  console.log(`\n✅ Assets Present: ${results.present.length}/${REQUIRED_ASSETS.length}`);
  console.log(`🚀 WebP Optimized: ${results.webpOptimized.length}`);
  console.log(`⚠️  Missing Assets: ${results.missing.length}`);
  console.log(`🔧 Need Optimization: ${results.needsOptimization.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  // Details
  if (results.missing.length > 0) {
    console.log('\n❌ MISSING ASSETS:');
    results.missing.forEach(asset => console.log(`   - ${asset}`));
  }
  
  if (results.needsOptimization.length > 0) {
    console.log('\n🔧 OPTIMIZATION NEEDED:');
    results.needsOptimization.forEach(asset => console.log(`   - ${asset}`));
  }
  
  if (results.webpOptimized.length > 0) {
    console.log('\n🚀 WEBP OPTIMIZED:');
    results.webpOptimized.forEach(asset => console.log(`   - ${asset}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // Overall status
  const isValid = results.missing.length === 0 && results.errors.length === 0;
  console.log('\n' + '='.repeat(50));
  console.log(isValid ? '✅ ASSET VALIDATION PASSED' : '❌ ASSET VALIDATION FAILED');
  console.log('='.repeat(50));
  
  return isValid;
}

/**
 * Main validation function
 */
function main() {
  console.log('🎯 Starting Asset Validation...\n');
  
  validateRequiredAssets();
  checkAssetSync();
  validateOptimization();
  
  const isValid = generateReport();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateRequiredAssets,
  checkAssetSync,
  validateOptimization,
  generateReport
};
