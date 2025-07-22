import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/src/lib/inngest';
import { captureIntegrationError } from '@/src/lib/sentry';
import crypto from 'crypto';

interface WebhookParams {
  params: {
    provider: string;
  };
}

interface NMIWebhookData {
  type: 'transaction' | 'subscription' | 'customer' | 'refund';
  transaction_id?: string;
  customer_vault_id?: string;
  order_id?: string;
  amount?: string;
  status?: 'approved' | 'declined' | 'error';
  response?: string;
  responsetext?: string;
  timestamp?: string;
  [key: string]: any;
}

interface KonnectiveWebhookData {
  event_type: 'order.created' | 'order.updated' | 'customer.created' | 'customer.updated';
  order_id?: string;
  customer_id?: string;
  campaign_id?: string;
  transaction_id?: string;
  status?: string;
  timestamp?: string;
  [key: string]: any;
}

export async function POST(
  request: NextRequest,
  { params }: WebhookParams
): Promise<NextResponse> {
  const { provider } = params;

  try {
    // Get request body and headers
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // Verify webhook signature based on provider
    const isValid = await verifyWebhookSignature(provider, body, headers);
    
    if (!isValid) {
      captureIntegrationError(
        new Error('Webhook signature verification failed'),
        provider,
        'webhook_verification',
        { provider, bodyLength: body.length }
      );

      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook data based on provider
    let webhookData: any;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      // Some providers send URL-encoded data
      webhookData = Object.fromEntries(new URLSearchParams(body));
    }

    // Process webhook based on provider
    switch (provider.toLowerCase()) {
      case 'nmi':
        await processNMIWebhook(webhookData);
        break;
      
      case 'konnective':
        await processKonnectiveWebhook(webhookData);
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown provider' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error(`${provider} webhook error:`, error);

    captureIntegrationError(
      error as Error,
      provider,
      'webhook_processing',
      { provider }
    );

    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Process NMI webhook
 */
async function processNMIWebhook(data: NMIWebhookData): Promise<void> {
  try {
    switch (data.type) {
      case 'transaction':
        await handleNMITransactionWebhook(data);
        break;
      
      case 'customer':
        await handleNMICustomerWebhook(data);
        break;
      
      case 'refund':
        await handleNMIRefundWebhook(data);
        break;
      
      default:
        console.log('Unknown NMI webhook type:', data.type);
    }
  } catch (error) {
    captureIntegrationError(
      error as Error,
      'nmi',
      'webhook_processing',
      { webhookType: data.type, transactionId: data.transaction_id }
    );
    throw error;
  }
}

/**
 * Process Konnective webhook
 */
async function processKonnectiveWebhook(data: KonnectiveWebhookData): Promise<void> {
  try {
    switch (data.event_type) {
      case 'order.created':
      case 'order.updated':
        await handleKonnectiveOrderWebhook(data);
        break;
      
      case 'customer.created':
      case 'customer.updated':
        await handleKonnectiveCustomerWebhook(data);
        break;
      
      default:
        console.log('Unknown Konnective webhook type:', data.event_type);
    }
  } catch (error) {
    captureIntegrationError(
      error as Error,
      'konnective',
      'webhook_processing',
      { eventType: data.event_type, orderId: data.order_id }
    );
    throw error;
  }
}

/**
 * Handle NMI transaction webhook
 */
async function handleNMITransactionWebhook(data: NMIWebhookData): Promise<void> {
  if (!data.transaction_id) {
    console.error('NMI transaction webhook missing transaction_id');
    return;
  }

  const eventName = data.status === 'approved' 
    ? 'webseed/payment.webhook.success'
    : 'webseed/payment.webhook.failed';

  await inngest.send({
    name: eventName,
    data: {
      provider: 'nmi',
      transactionId: data.transaction_id,
      orderId: data.order_id,
      amount: parseFloat(data.amount || '0'),
      status: data.status || 'unknown',
      vaultId: data.customer_vault_id,
      responseText: data.responsetext,
      timestamp: data.timestamp || new Date().toISOString(),
      rawWebhookData: data,
    },
  });
}

/**
 * Handle NMI customer webhook
 */
async function handleNMICustomerWebhook(data: NMIWebhookData): Promise<void> {
  if (!data.customer_vault_id) {
    console.error('NMI customer webhook missing customer_vault_id');
    return;
  }

  await inngest.send({
    name: 'webseed/vault.webhook.updated',
    data: {
      provider: 'nmi',
      vaultId: data.customer_vault_id,
      timestamp: data.timestamp || new Date().toISOString(),
      rawWebhookData: data,
    },
  });
}

/**
 * Handle NMI refund webhook
 */
async function handleNMIRefundWebhook(data: NMIWebhookData): Promise<void> {
  await inngest.send({
    name: 'webseed/payment.webhook.refund',
    data: {
      provider: 'nmi',
      transactionId: data.transaction_id,
      orderId: data.order_id,
      amount: parseFloat(data.amount || '0'),
      timestamp: data.timestamp || new Date().toISOString(),
      rawWebhookData: data,
    },
  });
}

/**
 * Handle Konnective order webhook
 */
async function handleKonnectiveOrderWebhook(data: KonnectiveWebhookData): Promise<void> {
  if (!data.order_id) {
    console.error('Konnective order webhook missing order_id');
    return;
  }

  const eventName = data.event_type === 'order.created'
    ? 'webseed/konnective.webhook.order.created'
    : 'webseed/konnective.webhook.order.updated';

  await inngest.send({
    name: eventName,
    data: {
      provider: 'konnective',
      orderId: data.order_id,
      customerId: data.customer_id,
      campaignId: data.campaign_id,
      transactionId: data.transaction_id,
      status: data.status,
      timestamp: data.timestamp || new Date().toISOString(),
      rawWebhookData: data,
    },
  });
}

/**
 * Handle Konnective customer webhook
 */
async function handleKonnectiveCustomerWebhook(data: KonnectiveWebhookData): Promise<void> {
  if (!data.customer_id) {
    console.error('Konnective customer webhook missing customer_id');
    return;
  }

  const eventName = data.event_type === 'customer.created'
    ? 'webseed/konnective.webhook.customer.created'
    : 'webseed/konnective.webhook.customer.updated';

  await inngest.send({
    name: eventName,
    data: {
      provider: 'konnective',
      customerId: data.customer_id,
      timestamp: data.timestamp || new Date().toISOString(),
      rawWebhookData: data,
    },
  });
}

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(
  provider: string,
  body: string,
  headers: Record<string, string>
): Promise<boolean> {
  try {
    switch (provider.toLowerCase()) {
      case 'nmi':
        return verifyNMISignature(body, headers);
      
      case 'konnective':
        return verifyKonnectiveSignature(body, headers);
      
      default:
        // For unknown providers, allow in development but deny in production
        return process.env.NODE_ENV !== 'production';
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Verify NMI webhook signature
 */
function verifyNMISignature(body: string, headers: Record<string, string>): boolean {
  const signature = headers['x-nmi-signature'] || headers['X-NMI-Signature'];
  const webhookSecret = process.env.NMI_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    // Allow in development without secret
    return process.env.NODE_ENV !== 'production';
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Verify Konnective webhook signature
 */
function verifyKonnectiveSignature(body: string, headers: Record<string, string>): boolean {
  const signature = headers['x-konnective-signature'] || headers['X-Konnective-Signature'];
  const webhookSecret = process.env.KONNECTIVE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    // Allow in development without secret
    return process.env.NODE_ENV !== 'production';
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Handle GET requests for webhook URL verification
export async function GET(
  request: NextRequest,
  { params }: WebhookParams
): Promise<NextResponse> {
  const { provider } = params;
  const { searchParams } = new URL(request.url);

  // Handle webhook URL verification challenges
  const challenge = searchParams.get('hub.challenge') || searchParams.get('challenge');
  
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({
    success: true,
    message: `${provider} webhook endpoint is active`,
    timestamp: new Date().toISOString(),
  });
}

// Handle preflight requests for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-NMI-Signature, X-Konnective-Signature',
    },
  });
}