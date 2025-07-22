// Debug script to check NMI configuration
console.log('🔍 Debugging NMI Configuration');
console.log('================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NMI_SECURITY_KEY:', process.env.NMI_SECURITY_KEY ? '✅ Set' : '❌ Not set');
console.log('NEXT_PUBLIC_NMI_PUBLIC_KEY:', process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY ? '✅ Set' : '❌ Not set');
console.log('NEXT_PUBLIC_NMI_TOKENIZATION_KEY:', process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY ? '✅ Set' : '❌ Not set');
console.log('NEXT_PUBLIC_COLLECT_JS_URL:', process.env.NEXT_PUBLIC_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js');

// Load .env.local file
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('\n📄 .env.local NMI Keys:');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('NMI') || line.includes('COLLECT_JS')) {
      if (line.startsWith('#')) {
        console.log('  (commented)', line);
      } else {
        const [key, value] = line.split('=');
        if (key && value) {
          console.log(`  ${key.trim()}: ${value.trim().substring(0, 20)}...`);
        }
      }
    }
  });
} catch (error) {
  console.error('❌ Could not read .env.local:', error.message);
}

console.log('\n💡 CollectJS Configuration Tips:');
console.log('1. Tokenization key must be valid for your NMI account');
console.log('2. The key format should be: xxxxxx-xxxxxx-xxxxxx-xxxxxx');
console.log('3. PaymentRequestAbstraction error often means:');
console.log('   - Invalid tokenization key');
console.log('   - Browser Payment Request API conflicts');
console.log('   - Missing required CollectJS parameters');

console.log('\n🔧 Recommended Fix:');
console.log('Add these options to CollectJS.configure():');
console.log(`
window.CollectJS.configure({
  variant: 'inline',
  styleSniffer: true,
  tokenizationKey: 'your-key-here',
  // Disable Payment Request API
  paymentRequestOptions: false,
  googlePay: false,
  applePay: false,
  fields: {
    // ... field config
  }
});
`);

console.log('\n✅ Next Steps:');
console.log('1. Verify tokenization key is correct in NMI gateway');
console.log('2. Update CollectJS configuration to disable Payment Request API');
console.log('3. Clear browser cache and retry');