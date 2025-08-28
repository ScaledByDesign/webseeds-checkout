#!/usr/bin/env node

/**
 * Form Perfection Validation Script
 * Validates that form implementation matches design exactly
 */

const fs = require('fs');

// Validation results
const results = {
  formFields: { matches: [], mismatches: [] },
  buttonStyling: { matches: [], mismatches: [] },
  floatingLabels: { matches: [], mismatches: [] },
  responsiveLayout: { matches: [], mismatches: [] },
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
 * Validate form fields
 */
function validateFormFields() {
  console.log('📝 Validating form fields...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const formComponent = readFile('components/NewDesignCheckoutForm.tsx');
  
  // Required form fields from design
  const requiredFields = [
    'email',
    'address', 
    'apartment',
    'city',
    'state',
    'zipCode',
    'country',
    'phone'
  ];
  
  requiredFields.forEach(field => {
    const inDesign = designHTML.includes(`id="${field}"`) || designHTML.includes(`name="${field}"`);
    const inForm = formComponent.includes(`id="${field}"`) || formComponent.includes(`name="${field}"`);
    
    if (inDesign && inForm) {
      results.formFields.matches.push(field);
    } else if (inDesign && !inForm) {
      results.formFields.mismatches.push(`Missing field: ${field}`);
    }
  });
}

/**
 * Validate button styling
 */
function validateButtonStyling() {
  console.log('🔘 Validating button styling...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const formComponent = readFile('components/NewDesignCheckoutForm.tsx');
  
  // Critical button styles from design
  const buttonStyles = [
    'Place Your Order',
    'py-12',
    'w-full',
    'rounded-full',
    'bg-[#F6C657]',
    'text-center',
    'font-bold',
    'text-[3.7rem]',
    'text-[#373737]',
    'leading-none',
    'aria-label="Place Your Order - Total $294"'
  ];
  
  buttonStyles.forEach(style => {
    const inDesign = designHTML.includes(style);
    const inForm = formComponent.includes(style);
    
    if (inDesign && inForm) {
      results.buttonStyling.matches.push(style);
    } else if (inDesign && !inForm) {
      results.buttonStyling.mismatches.push(`Missing button style: ${style}`);
    }
  });
}

/**
 * Validate floating labels
 */
function validateFloatingLabels() {
  console.log('🏷️  Validating floating labels...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const formComponent = readFile('components/NewDesignCheckoutForm.tsx');
  const globalCSS = readFile('app/globals.css');
  
  // Floating label patterns
  const floatingLabelPatterns = [
    'floating-label-group',
    'floating-label',
    'FloatingLabelInput',
    'FloatingLabelSelect'
  ];
  
  floatingLabelPatterns.forEach(pattern => {
    const inDesign = designHTML.includes(pattern);
    const inForm = formComponent.includes(pattern);
    const inCSS = globalCSS.includes(pattern);
    
    if ((inDesign || pattern.startsWith('Floating')) && (inForm || inCSS)) {
      results.floatingLabels.matches.push(pattern);
    } else if (inDesign && !inForm && !inCSS) {
      results.floatingLabels.mismatches.push(`Missing floating label: ${pattern}`);
    }
  });
}

/**
 * Validate responsive layout
 */
function validateResponsiveLayout() {
  console.log('📱 Validating responsive layout...\n');
  
  const designHTML = readFile('public/design/checkout.html');
  const formComponent = readFile('components/NewDesignCheckoutForm.tsx');
  
  // Responsive layout patterns
  const responsivePatterns = [
    'sm:flex',
    'justify-between',
    'gap-7',
    'space-y-8',
    'sm:space-y-0',
    'w-full',
    'sm:text-',
    'text-[2.6rem]',
    'sm:text-[1.94rem]'
  ];
  
  responsivePatterns.forEach(pattern => {
    const inDesign = designHTML.includes(pattern);
    const inForm = formComponent.includes(pattern);
    
    if (inDesign && inForm) {
      results.responsiveLayout.matches.push(pattern);
    } else if (inDesign && !inForm) {
      results.responsiveLayout.mismatches.push(`Missing responsive pattern: ${pattern}`);
    }
  });
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('📊 FORM PERFECTION VALIDATION REPORT');
  console.log('=' .repeat(50));
  
  // Summary
  const totalFields = results.formFields.matches.length + results.formFields.mismatches.length;
  const totalButton = results.buttonStyling.matches.length + results.buttonStyling.mismatches.length;
  const totalLabels = results.floatingLabels.matches.length + results.floatingLabels.mismatches.length;
  const totalResponsive = results.responsiveLayout.matches.length + results.responsiveLayout.mismatches.length;
  
  console.log(`\n📝 Form Fields: ${results.formFields.matches.length}/${totalFields} matches`);
  console.log(`🔘 Button Styling: ${results.buttonStyling.matches.length}/${totalButton} matches`);
  console.log(`🏷️  Floating Labels: ${results.floatingLabels.matches.length}/${totalLabels} matches`);
  console.log(`📱 Responsive Layout: ${results.responsiveLayout.matches.length}/${totalResponsive} matches`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  // Details
  if (results.formFields.mismatches.length > 0) {
    console.log('\n❌ FORM FIELD MISMATCHES:');
    results.formFields.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.buttonStyling.mismatches.length > 0) {
    console.log('\n❌ BUTTON STYLING MISMATCHES:');
    results.buttonStyling.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.floatingLabels.mismatches.length > 0) {
    console.log('\n❌ FLOATING LABEL MISMATCHES:');
    results.floatingLabels.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.responsiveLayout.mismatches.length > 0) {
    console.log('\n❌ RESPONSIVE LAYOUT MISMATCHES:');
    results.responsiveLayout.mismatches.forEach(mismatch => console.log(`   - ${mismatch}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // Success details
  if (results.formFields.matches.length > 0) {
    console.log('\n✅ FORM FIELDS PERFECT:');
    results.formFields.matches.forEach(match => console.log(`   - ${match}`));
  }
  
  if (results.buttonStyling.matches.length > 0) {
    console.log('\n✅ BUTTON STYLING PERFECT:');
    results.buttonStyling.matches.forEach(match => console.log(`   - ${match}`));
  }
  
  // Overall status
  const totalMismatches = 
    results.formFields.mismatches.length +
    results.buttonStyling.mismatches.length +
    results.floatingLabels.mismatches.length +
    results.responsiveLayout.mismatches.length +
    results.errors.length;
    
  const isValid = totalMismatches === 0;
  
  console.log('\n' + '='.repeat(50));
  console.log(isValid ? '✅ FORM IMPLEMENTATION PERFECT' : '⚠️  FORM NEEDS ATTENTION');
  console.log('='.repeat(50));
  
  return isValid;
}

/**
 * Main validation function
 */
function main() {
  console.log('🎯 Starting Form Perfection Validation...\n');
  
  validateFormFields();
  validateButtonStyling();
  validateFloatingLabels();
  validateResponsiveLayout();
  
  const isValid = generateReport();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateFormFields,
  validateButtonStyling,
  validateFloatingLabels,
  validateResponsiveLayout,
  generateReport
};
