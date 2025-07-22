import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { NMIService } from '@/src/services/nmi/NMIService';
import { capturePaymentError } from '@/src/lib/sentry';

// Schema for CollectJS token validation
const tokenValidationSchema = z.object({
  paymentToken: z.string().min(1, 'Payment token is required'),
  sessionId: z.string().optional(),
  validateOnly: z.boolean().default(false),
});

interface TokenizeResponse {
  success: boolean;
  valid?: boolean;
  message: string;
  tokenInfo?: {
    lastFour?: string;
    cardType?: string;
    expiryMonth?: string;
    expiryYear?: string;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TokenizeResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = tokenValidationSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid request data',
            error: error.errors[0].message,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const nmiService = NMIService.getInstance();

    // Check if NMI is properly configured
    if (!nmiService.validateConfig()) {
      capturePaymentError(
        new Error('NMI service not properly configured'),
        {
          sessionId: validatedData.sessionId,
          step: 'tokenization_validation',
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: 'Payment service configuration error',
          error: 'SERVICE_CONFIG_ERROR',
        },
        { status: 500 }
      );
    }

    if (validatedData.validateOnly) {
      // Simple token format validation
      const tokenValid = validatedData.paymentToken.length > 10 && 
                        !validatedData.paymentToken.includes(' ');

      return NextResponse.json({
        success: true,
        valid: tokenValid,
        message: tokenValid ? 'Token format is valid' : 'Invalid token format',
      });
    }

    // For actual tokenization, we would typically:
    // 1. Validate the token with NMI
    // 2. Optionally create a temporary authorization
    // 3. Return card information if available

    // Since CollectJS tokens are already secure, we'll just validate the format
    // and return success. The actual processing happens in the payment workflow.

    const isValidFormat = validatedData.paymentToken.length > 10 &&
                         validatedData.paymentToken.match(/^[a-zA-Z0-9-_]+$/);

    if (!isValidFormat) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token format',
          error: 'INVALID_TOKEN_FORMAT',
        },
        { status: 400 }
      );
    }

    // In a real implementation, you might extract card info from the token
    // For now, we'll return a successful validation
    return NextResponse.json({
      success: true,
      valid: true,
      message: 'Payment token validated successfully',
      tokenInfo: {
        // These would come from actual token validation
        // lastFour: '****',
        // cardType: 'Unknown',
        // expiryMonth: '**',
        // expiryYear: '**',
      },
    });

  } catch (error) {
    console.error('Tokenization error:', error);

    capturePaymentError(error as Error, {
      step: 'tokenization',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Token validation failed',
        error: 'TOKENIZATION_ERROR',
      },
      { status: 500 }
    );
  }
}

// Callback endpoint for CollectJS
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('payment_token');
    const sessionId = searchParams.get('session_id');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing payment token' },
        { status: 400 }
      );
    }

    // Handle CollectJS callback
    // This would typically be called by CollectJS after tokenization
    return NextResponse.json({
      success: true,
      message: 'Token received successfully',
      token,
      sessionId,
    });

  } catch (error) {
    console.error('CollectJS callback error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// Utility function to validate CollectJS token format
function isValidCollectJSToken(token: string): boolean {
  // CollectJS tokens typically follow a specific format
  // This is a basic validation - adjust based on actual NMI token format
  return token.length >= 20 && 
         token.length <= 100 && 
         /^[a-zA-Z0-9_-]+$/.test(token);
}

// Get CollectJS configuration for frontend
export async function HEAD(): Promise<NextResponse> {
  try {
    const nmiService = NMIService.getInstance();
    const config = nmiService.getCollectJSConfig();

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-CollectJS-URL': config.url,
        'X-CollectJS-Environment': config.environment,
        'X-CollectJS-Variant': config.variant,
        // Don't expose the public key in headers for security
      },
    });

  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}