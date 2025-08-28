#!/usr/bin/env node

/**
 * Header Implementation Validation Script
 * Validates that header implementation matches design exactly
 */

const fs = require('fs');

// Validation results
const results = {
  structure: { matches: [], mismatches: [] },
  classes: { matches: [], mismatches: [] },
  attributes: { matches: [], mismatches: [] },
  content: { matches: [], mismatches: [] },
  errors: []
};

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    results.errors.push(`Error reading ${filePath}: ${error.message}`);
    return '';
  }
}

/**
 * Validate header structure
 */
function validateHeaderStructure() {
  console.log('🏗️  Validating header structure...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const appCode = readFile('app/checkout/page.tsx');
  
  // Key structural elements to validate
  const structuralElements = [
    'header',
    'container-max',
    'container',
    'flex flex-col-reverse md:flex-row',
    'justify-between items-center',
    'pt-10 pb-5 sm:py-10 md:py-0',
    'gap-2.75',
    'justify-center md:justify-start',
    'items-end w-full md:w-auto'
  ];
  
  structuralElements.forEach(element => {
    const inDesign = designHTML.includes(element);
    const inApp = appCode.includes(element);
    
    if (inDesign && inApp) {
      results.structure.matches.push(element);
    } else if (inDesign && !inApp) {
      results.structure.mismatches.push(`Missing in app: ${element}`);
    } else if (!inDesign && inApp) {
      results.structure.mismatches.push(`Extra in app: ${element}`);
    }
  });
}

/**
 * Validate CSS classes
 */
function validateCSSClasses() {
  console.log('🎨 Validating CSS classes...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const appCode = readFile('app/checkout/page.tsx');
  
  // Critical CSS classes from design
  const criticalClasses = [
    'pb-4 py-0 md:py-8 lg:py-6',
    'md:border-b-3 border-[#CDCDCD]',
    'max-w-full w-110',
    'chidden md:flex hidden sm:flex',
    'gap-2.75 -mt-3',
    'font-medium text-[2rem] text-[#373737]',
    'whitespace-nowrap',
    'w-6 -mt-3',
    'flex items-center gap-6.5',
    'w-full md:w-auto justify-center',
    'bg-[#e4e4e4] md:bg-transparent',
    'font-medium sm:text-[3rem] text-[2.5rem]',
    'text-[#976987]',
    'py-5.5 px-6 md:bg-[#986988]',
    'font-bold text-[#bf4e6f] md:text-white',
    'text-[4.5rem] leading-none rounded-2xl',
    'countdown-timer'
  ];
  
  criticalClasses.forEach(className => {
    const inDesign = designHTML.includes(className);
    const inApp = appCode.includes(className);
    
    if (inDesign && inApp) {
      results.classes.matches.push(className);
    } else if (inDesign && !inApp) {
      results.classes.mismatches.push(`Missing class: ${className}`);
    }
  });
}

/**
 * Validate attributes
 */
function validateAttributes() {
  console.log('🔧 Validating attributes...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const appCode = readFile('app/checkout/page.tsx');
  
  // Critical attributes
  const criticalAttributes = [
    'loading="eager"',
    'alt="Fitspresso Logo"',
    'alt="Secure"',
    'width="220"',
    'height="60"',
    'width="28"',
    'height="28"',
    'role="timer"',
    'aria-live="polite"',
    'aria-label="Special offer time remaining"',
    'id="minutes"',
    'id="seconds"'
  ];
  
  criticalAttributes.forEach(attr => {
    const inDesign = designHTML.includes(attr);
    const inApp = appCode.includes(attr) || appCode.includes(attr.replace(/"/g, '{').replace(/"/g, '}'));
    
    if (inDesign && inApp) {
      results.attributes.matches.push(attr);
    } else if (inDesign && !inApp) {
      results.attributes.mismatches.push(`Missing attribute: ${attr}`);
    }
  });
}

/**
 * Validate content
 */
function validateContent() {
  console.log('📝 Validating content...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const appCode = readFile('app/checkout/page.tsx');
  
  // Critical content elements
  const contentElements = [
    'Secure Checkout',
    'Special Price Reserved For',
    'Fitspresso Logo',
    'assets/images/Logo.svg',
    'assets/images/lock.svg'
  ];
  
  contentElements.forEach(content => {
    const inDesign = designHTML.includes(content);
    const inApp = appCode.includes(content) || appCode.includes(content.replace('assets/', '/assets/'));
    
    if (inDesign && inApp) {
      results.content.matches.push(content);
    } else if (inDesign && !inApp) {
      results.content.mismatches.push(`Missing content: ${content}`);
    }
  });
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('📊 HEADER IMPLEMENTATION VALIDATION REPORT');
  console.log('=' .repeat(50));
  
  // Summary
  const totalStructure = results.structure.matches.length + results.structure.mismatches.length;
  const totalClasses = results.classes.matches.length + results.classes.mismatches.length;
  const totalAttributes = results.attributes.matches.length + results.attributes.mismatches.length;
  const totalContent = results.content.matches.length + results.content.mismatches.length;
  
  console.log(`\n🏗️  Structure: ${results.structure.matches.length}/${totalStructure} matches`);
  console.log(`🎨 CSS Classes: ${results.classes.matches.length}/${totalClasses} matches`);
  console.log(`🔧 Attributes: ${results.attributes.matches.length}/${totalAttributes} matches`);
  console.log(`📝 Content: ${results.content.matches.length}/${totalContent} matches`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  // Details
  if (results.structure.mismatches.length > 0) {
    console.log('\n❌ STRUCTURE MISMATCHES:');
    results.structure.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.classes.mismatches.length > 0) {
    console.log('\n❌ CLASS MISMATCHES:');
    results.classes.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.attributes.mismatches.length > 0) {
    console.log('\n❌ ATTRIBUTE MISMATCHES:');
    results.attributes.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.content.mismatches.length > 0) {
    console.log('\n❌ CONTENT MISMATCHES:');
    results.content.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // Overall status
  const totalMismatches = 
    results.structure.mismatches.length +
    results.classes.mismatches.length +
    results.attributes.mismatches.length +
    results.content.mismatches.length +
    results.errors.length;
    
  const isValid = totalMismatches === 0;
  
  console.log('\n' + '='.repeat(50));
  console.log(isValid ? '✅ HEADER IMPLEMENTATION PERFECT' : '⚠️  HEADER NEEDS ATTENTION');
  console.log('='.repeat(50));
  
  return isValid;
}

/**
 * Main validation function
 */
function main() {
  console.log('🎯 Starting Header Implementation Validation...\n');
  
  validateHeaderStructure();
  validateCSSClasses();
  validateAttributes();
  validateContent();
  
  const isValid = generateReport();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateHeaderStructure,
  validateCSSClasses,
  validateAttributes,
  validateContent,
  generateReport
};
