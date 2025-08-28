import { serve } from 'inngest/next';
import { inngest } from '@/src/lib/inngest';

// Import workflow functions
import { paymentProcessor, upsellProcessor } from '@/src/inngest/functions/payment-processor';
import { konnectiveSync, konnectiveUpsellSync, konnectiveRetrySync } from '@/src/inngest/functions/konnective-sync';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Payment processing workflows
    paymentProcessor,
    upsellProcessor,
    
    // Konnective CRM sync workflows
    konnectiveSync,
    konnectiveUpsellSync,
    konnectiveRetrySync,
  ],
});