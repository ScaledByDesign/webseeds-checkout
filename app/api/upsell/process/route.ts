import { NextRequest, NextResponse } from 'next/server';
import { funnelSessionManager } from '@/lib/funnel-session';
import { NMIService } from '@/services/nmi/NMIService';
import { inngest } from '@/lib/inngest';
import { capturePaymentError } from '@/lib/sentry';
import * as Sentry from '@sentry/nextjs';

interface UpsellProcessRequest {
  sessionId: string;
  productCode: string;
  amount: number;
  bottles: number;
  step: number;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productCode, amount, bottles, step }: UpsellProcessRequest = await request.json();

    // Validate input
    if (!sessionId || !productCode || !amount || !bottles) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session data
    const session = funnelSessionManager.getSession(sessionId);
    if (!session || !session.vaultId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session or missing payment method' },
        { status: 400 }
      );
    }

    const transaction = Sentry.startTransaction({
      name: 'upsell.process',
      op: 'upsell',
      data: {
        sessionId,
        productCode,
        amount,
        bottles,
        step,
      },
    });

    try {
      // Process upsell payment using stored vault
      const nmiService = NMIService.getInstance();
      
      const paymentResult = await nmiService.processVaultPayment({
        vaultId: session.vaultId,
        amount,
        orderDescription: `RetinaClear ${bottles} Bottle Upsell - ${productCode}`,
        customerInfo: session.customerInfo!,
        orderData: {
          products: [{
            id: productCode,
            name: `RetinaClear ${bottles} Bottle Package`,
            price: amount,
            quantity: 1,
          }],
        },
      });

      if (!paymentResult.success) {
        transaction.setStatus('payment_declined');
        capturePaymentError(
          new Error(paymentResult.error || 'Upsell payment failed'),
          {
            sessionId,
            productCode,
            amount,
            vaultId: session.vaultId,
            step: 'upsell_payment',
          }
        );

        return NextResponse.json({
          success: false,
          error: paymentResult.error || 'Payment failed',
        });
      }

      // Update session with upsell info
      const updatedSession = {
        ...session,
        upsells: [
          ...(session.upsells || []),
          {
            step,
            productCode,
            amount,
            bottles,
            transactionId: paymentResult.transactionId,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      funnelSessionManager.updateSession(sessionId, updatedSession);

      // Send event to trigger upsell sync
      await inngest.send({
        name: 'webseed/upsell.completed',
        data: {
          sessionId,
          transactionId: paymentResult.transactionId!,
          productId: productCode,
          amount,
          upsellStep: step,
          orderId: session.orderId,
          customerInfo: session.customerInfo,
        },
      });

      transaction.setStatus('ok');
      Sentry.addBreadcrumb({
        message: 'Upsell processed successfully',
        level: 'info',
        data: {
          sessionId,
          productCode,
          transactionId: paymentResult.transactionId,
          amount,
        },
      });

      return NextResponse.json({
        success: true,
        transactionId: paymentResult.transactionId,
        amount,
        productCode,
      });

    } catch (error) {
      transaction.setStatus('internal_error');
      capturePaymentError(
        error as Error,
        {
          sessionId,
          productCode,
          amount,
          step: 'upsell_processing',
        }
      );

      console.error('Upsell processing error:', error);
      return NextResponse.json(
        { success: false, error: 'Payment processing failed' },
        { status: 500 }
      );
    } finally {
      transaction.finish();
    }

  } catch (error) {
    console.error('Upsell API error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}