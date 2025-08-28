import { supabaseAdmin, FunnelSession, SessionCreateData } from './supabase';

export class DatabaseSessionManager {
  /**
   * Create a new session in the database
   */
  async createSession(data: SessionCreateData): Promise<FunnelSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    
    // Generate session ID
    const sessionId = `ws_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total amount
    const amount = data.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    
    const sessionData = {
      id: sessionId,
      email: data.email,
      customer_info: data.customerInfo || {},
      products: data.products,
      status: 'pending' as const,
      amount,
      current_step: 'checkout',
      upsells_accepted: [],
      upsells_declined: [],
      coupon_code: data.couponCode || null,
      metadata: data.metadata || {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    console.log('🔄 Creating session in database:', sessionId);

    const { data: session, error } = await supabaseAdmin
      .from('funnel_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    console.log('✅ Session created successfully:', session.id);
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<FunnelSession | null> {
    console.log('🔍 Getting session from database:', sessionId);

    const { data: session, error } = await supabaseAdmin
      .from('funnel_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log('⚠️ Session not found:', sessionId);
        return null;
      }
      console.error('❌ Failed to get session:', error);
      throw new Error(`Failed to get session: ${error.message}`);
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      console.log('⏰ Session expired:', sessionId);
      await this.updateSession(sessionId, { status: 'expired' });
      return null;
    }

    console.log('✅ Session retrieved successfully:', session.id);
    return session;
  }

  /**
   * Update a session
   */
  async updateSession(sessionId: string, updates: Partial<FunnelSession>): Promise<FunnelSession | null> {
    console.log('🔄 Updating session:', sessionId, updates);

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data: session, error } = await supabaseAdmin
      .from('funnel_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }

    console.log('✅ Session updated successfully:', session.id);
    return session;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('funnel_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to delete session:', error);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('funnel_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get sessions by status
   */
  async getSessionsByStatus(status: FunnelSession['status']): Promise<FunnelSession[]> {
    const { data: sessions, error } = await supabaseAdmin
      .from('funnel_sessions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get sessions by status:', error);
      throw new Error(`Failed to get sessions by status: ${error.message}`);
    }

    return sessions || [];
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: FunnelSession['status']): Promise<FunnelSession | null> {
    return this.updateSession(sessionId, { status });
  }

  /**
   * Add payment information to session
   */
  async addPaymentInfo(sessionId: string, paymentToken: string, transactionId?: string): Promise<FunnelSession | null> {
    return this.updateSession(sessionId, {
      payment_token: paymentToken,
      transaction_id: transactionId,
      status: 'processing',
      current_step: 'payment_processing'
    });
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string, transactionId: string, vaultId?: string): Promise<FunnelSession | null> {
    return this.updateSession(sessionId, {
      transaction_id: transactionId,
      vault_id: vaultId,
      status: 'completed',
      current_step: 'completed'
    });
  }

  /**
   * Mark session as failed
   */
  async failSession(sessionId: string, error: string): Promise<FunnelSession | null> {
    return this.updateSession(sessionId, {
      status: 'failed',
      current_step: 'failed',
      metadata: {
        error,
        failed_at: new Date().toISOString()
      }
    });
  }
}

// Export singleton instance
export const databaseSessionManager = new DatabaseSessionManager();
