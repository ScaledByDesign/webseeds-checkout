import { NMIService } from './NMIService';
import { VaultParams, VaultResult } from './types';
import { capturePaymentError } from '@/src/lib/sentry';
import { inngest } from '@/src/lib/inngest';

interface VaultCustomer {
  vaultId: string;
  email: string;
  firstName: string;
  lastName: string;
  lastFour: string;
  cardType: string;
  expiryMonth: string;
  expiryYear: string;
  createdAt: Date;
  sessionId: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class NMICustomerVaultService {
  private static instance: NMICustomerVaultService;
  private nmiService: NMIService;
  private retryConfig: RetryConfig;

  private constructor() {
    this.nmiService = NMIService.getInstance();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
    };
  }

  public static getInstance(): NMICustomerVaultService {
    if (!NMICustomerVaultService.instance) {
      NMICustomerVaultService.instance = new NMICustomerVaultService();
    }
    return NMICustomerVaultService.instance;
  }

  /**
   * Create customer vault with retry logic
   */
  async createVault(params: VaultParams): Promise<VaultResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.attemptVaultCreation(params);
        
        if (result.success) {
          // Emit success event
          await this.emitVaultCreatedEvent(result, params.sessionId);
          return result;
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(result.errorCode || '')) {
          // Non-retryable error, fail immediately
          await this.emitVaultFailedEvent(result.error || 'Vault creation failed', params.sessionId);
          return result;
        }
        
        lastError = new Error(result.error || 'Vault creation failed');
        
        // If not the last attempt, wait before retrying
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.calculateBackoffDelay(attempt));
        }
        
      } catch (error) {
        lastError = error as Error;
        
        capturePaymentError(lastError, {
          sessionId: params.sessionId,
          step: 'vault_creation',
          attempt,
        });
        
        // If not the last attempt, wait before retrying
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.calculateBackoffDelay(attempt));
        }
      }
    }
    
    // All retries exhausted
    const failureResult: VaultResult = {
      success: false,
      error: 'Max retries exceeded for vault creation',
      errorCode: 'MAX_RETRIES_EXCEEDED',
    };
    
    await this.emitVaultFailedEvent(lastError?.message || 'Max retries exceeded', params.sessionId);
    return failureResult;
  }

  /**
   * Process one-click payment using existing vault
   */
  async processOneClickPayment(
    vaultId: string,
    amount: number,
    orderId: string,
    sessionId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const result = await this.nmiService.processVaultPayment(vaultId, amount, orderId);
      
      if (result.success) {
        await this.emitOneClickSuccessEvent({
          sessionId,
          transactionId: result.transactionId || '',
          vaultId,
          amount,
        });
      } else {
        await this.emitOneClickFailedEvent({
          sessionId,
          vaultId,
          amount,
          error: result.error || 'One-click payment failed',
        });
      }
      
      return {
        success: result.success,
        transactionId: result.transactionId,
        error: result.error,
      };
      
    } catch (error) {
      capturePaymentError(error as Error, {
        sessionId,
        step: 'one_click_payment',
        amount,
      });
      
      const errorMessage = 'One-click payment processing failed';
      await this.emitOneClickFailedEvent({
        sessionId,
        vaultId,
        amount,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate vault exists and is accessible
   */
  async validateVault(vaultId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Attempt a $0.01 authorization to validate the vault
      const result = await this.nmiService.processVaultPayment(vaultId, 0.01, `VALIDATE-${Date.now()}`);
      
      return {
        valid: result.success,
        error: result.success ? undefined : result.error,
      };
      
    } catch (error) {
      return {
        valid: false,
        error: 'Vault validation failed',
      };
    }
  }

  /**
   * Get vault information (mock implementation - would typically come from database)
   */
  async getVaultInfo(vaultId: string): Promise<VaultCustomer | null> {
    // In a real implementation, this would query a database
    // For now, returning mock data structure
    return null;
  }

  /**
   * Delete customer vault
   */
  async deleteVault(vaultId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // NMI doesn't have a direct delete API, but we can mark it as inactive
      // In a real implementation, you'd update your database to mark as deleted
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete vault',
      };
    }
  }

  /**
   * Attempt vault creation (single try)
   */
  private async attemptVaultCreation(params: VaultParams): Promise<VaultResult> {
    return await this.nmiService.createCustomerVault(params);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorCode: string): boolean {
    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
      'TEMPORARY_ERROR',
      '3', // Generic error that might be temporary
    ];
    
    return retryableCodes.includes(errorCode);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Delay execution
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emit vault created event
   */
  private async emitVaultCreatedEvent(result: VaultResult, sessionId: string): Promise<void> {
    try {
      await inngest.send({
        name: 'webseed/vault.created',
        data: {
          sessionId,
          vaultId: result.vaultId!,
          lastFour: result.lastFour!,
          cardType: result.cardType!,
          expiryMonth: result.expiryMonth!,
          expiryYear: result.expiryYear!,
        },
      });
    } catch (error) {
      // Don't fail vault creation if event emission fails
      console.error('Failed to emit vault created event:', error);
    }
  }

  /**
   * Emit vault creation failed event
   */
  private async emitVaultFailedEvent(error: string, sessionId: string): Promise<void> {
    try {
      await inngest.send({
        name: 'webseed/vault.failed',
        data: {
          sessionId,
          error,
        },
      });
    } catch (err) {
      console.error('Failed to emit vault failed event:', err);
    }
  }

  /**
   * Emit one-click payment success event
   */
  private async emitOneClickSuccessEvent(data: {
    sessionId: string;
    transactionId: string;
    vaultId: string;
    amount: number;
  }): Promise<void> {
    try {
      await inngest.send({
        name: 'webseed/upsell.payment.succeeded',
        data,
      });
    } catch (error) {
      console.error('Failed to emit one-click success event:', error);
    }
  }

  /**
   * Emit one-click payment failed event
   */
  private async emitOneClickFailedEvent(data: {
    sessionId: string;
    vaultId: string;
    amount: number;
    error: string;
  }): Promise<void> {
    try {
      await inngest.send({
        name: 'webseed/upsell.payment.failed',
        data,
      });
    } catch (error) {
      console.error('Failed to emit one-click failed event:', error);
    }
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }
}