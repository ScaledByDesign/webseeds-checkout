#!/usr/bin/env node

/**
 * CSS Precision Validation Script
 * Validates that our CSS implementation matches design specifications exactly
 */

const fs = require('fs');
const path = require('path');

// CSS validation results
const results = {
  variables: { missing: [], present: [], mismatched: [] },
  floatingLabels: { present: false, complete: false },
  responsiveBreakpoints: { present: false, complete: false },
  customUtilities: { missing: [], present: [] },
  errors: []
};

// Required CSS variables from design
const REQUIRED_CSS_VARIABLES = [
  '--font-sans',
  '--color-white',
  '--spacing',
  '--container-4xl',
  '--text-xl',
  '--text-2xl',
  '--text-4xl',
  '--text-5xl',
  '--font-weight-normal',
  '--font-weight-medium',
  '--font-weight-bold',
  '--leading-relaxed',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
  '--radius-4xl',
  '--default-transition-duration',
  '--default-transition-timing-function',
  '--default-font-family'
];

// Required floating label CSS patterns
const FLOATING_LABEL_PATTERNS = [
  '.floating-label-group',
  '.floating-label',
  'input:focus ~ .floating-label',
  'input:not(:placeholder-shown) ~ .floating-label',
  'select:focus ~ .floating-label',
  'select:valid ~ .floating-label'
];

/**
 * Read and parse CSS file
 */
function readCSSFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    results.errors.push(`Error reading ${filePath}: ${error.message}`);
    return '';
  }
}

/**
 * Validate CSS variables
 */
function validateCSSVariables() {
  console.log('🔍 Validating CSS variables...\n');
  
  const appCSS = readCSSFile('app/globals.css');
  
  REQUIRED_CSS_VARIABLES.forEach(variable => {
    if (appCSS.includes(variable)) {
      results.variables.present.push(variable);
    } else {
      results.variables.missing.push(variable);
    }
  });
}

/**
 * Validate floating label implementation
 */
function validateFloatingLabels() {
  console.log('🏷️  Validating floating label implementation...\n');
  
  const appCSS = readCSSFile('app/globals.css');
  
  let foundPatterns = 0;
  FLOATING_LABEL_PATTERNS.forEach(pattern => {
    if (appCSS.includes(pattern)) {
      foundPatterns++;
    }
  });
  
  results.floatingLabels.present = foundPatterns > 0;
  results.floatingLabels.complete = foundPatterns === FLOATING_LABEL_PATTERNS.length;
}

/**
 * Validate responsive breakpoints
 */
function validateResponsiveBreakpoints() {
  console.log('📱 Validating responsive breakpoints...\n');
  
  const appCSS = readCSSFile('app/globals.css');
  const tailwindConfig = readCSSFile('tailwind.config.js');
  
  // Check for responsive patterns
  const responsivePatterns = [
    '@media (max-width: 639px)',
    '@media (min-width: 640px)',
    'sm:',
    'md:',
    'lg:'
  ];
  
  let foundResponsive = 0;
  responsivePatterns.forEach(pattern => {
    if (appCSS.includes(pattern) || tailwindConfig.includes(pattern)) {
      foundResponsive++;
    }
  });
  
  results.responsiveBreakpoints.present = foundResponsive > 0;
  results.responsiveBreakpoints.complete = foundResponsive >= 3;
}

/**
 * Validate custom utilities
 */
function validateCustomUtilities() {
  console.log('🛠️  Validating custom utilities...\n');
  
  const appCSS = readCSSFile('app/globals.css');
  
  // Required custom utilities
  const customUtilities = [
    '.container',
    '.container-max',
    '.countdown-timer',
    'font-variant-numeric: tabular-nums'
  ];
  
  customUtilities.forEach(utility => {
    if (appCSS.includes(utility)) {
      results.customUtilities.present.push(utility);
    } else {
      results.customUtilities.missing.push(utility);
    }
  });
}

/**
 * Validate Tailwind configuration
 */
function validateTailwindConfig() {
  console.log('⚙️  Validating Tailwind configuration...\n');
  
  const tailwindConfig = readCSSFile('tailwind.config.js');
  
  // Check for required extensions
  const requiredExtensions = [
    'fontFamily',
    'borderWidth',
    'colors',
    'spacing'
  ];
  
  requiredExtensions.forEach(extension => {
    if (tailwindConfig.includes(extension)) {
      results.customUtilities.present.push(`Tailwind: ${extension}`);
    } else {
      results.customUtilities.missing.push(`Tailwind: ${extension}`);
    }
  });
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('📊 CSS PRECISION VALIDATION REPORT');
  console.log('=' .repeat(50));
  
  // Summary
  console.log(`\n✅ CSS Variables: ${results.variables.present.length}/${REQUIRED_CSS_VARIABLES.length}`);
  console.log(`🏷️  Floating Labels: ${results.floatingLabels.complete ? 'Complete' : 'Incomplete'}`);
  console.log(`📱 Responsive: ${results.responsiveBreakpoints.complete ? 'Complete' : 'Incomplete'}`);
  console.log(`🛠️  Custom Utilities: ${results.customUtilities.present.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  // Details
  if (results.variables.missing.length > 0) {
    console.log('\n❌ MISSING CSS VARIABLES:');
    results.variables.missing.forEach(variable => console.log(`   - ${variable}`));
  }
  
  if (results.customUtilities.missing.length > 0) {
    console.log('\n🔧 MISSING UTILITIES:');
    results.customUtilities.missing.forEach(utility => console.log(`   - ${utility}`));
  }
  
  if (results.customUtilities.present.length > 0) {
    console.log('\n✅ PRESENT UTILITIES:');
    results.customUtilities.present.forEach(utility => console.log(`   - ${utility}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // Overall status
  const isValid = 
    results.variables.missing.length === 0 &&
    results.floatingLabels.complete &&
    results.responsiveBreakpoints.complete &&
    results.errors.length === 0;
    
  console.log('\n' + '='.repeat(50));
  console.log(isValid ? '✅ CSS PRECISION VALIDATION PASSED' : '⚠️  CSS PRECISION NEEDS ATTENTION');
  console.log('='.repeat(50));
  
  return isValid;
}

/**
 * Main validation function
 */
function main() {
  console.log('🎯 Starting CSS Precision Validation...\n');
  
  validateCSSVariables();
  validateFloatingLabels();
  validateResponsiveBreakpoints();
  validateCustomUtilities();
  validateTailwindConfig();
  
  const isValid = generateReport();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateCSSVariables,
  validateFloatingLabels,
  validateResponsiveBreakpoints,
  validateCustomUtilities,
  generateReport
};
