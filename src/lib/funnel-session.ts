interface FunnelSessionData {
  id: string;
  email: string;
  customerInfo?: {
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  vaultId?: string;
  transactionId?: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  amount: number;
  currentStep: 'checkout' | 'processing' | 'upsell-1' | 'upsell-2' | 'success';
  upsellsAccepted: string[];
  upsellsDeclined: string[];
  upsells?: Array<{
    step: number;
    productCode: string;
    amount: number;
    bottles: number;
    transactionId: string;
    timestamp: string;
  }>;
  orderId?: string;
  couponCode?: string;
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingInfo?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

interface SessionStorage {
  [sessionId: string]: FunnelSessionData;
}

export class FunnelSessionManager {
  private static instance: FunnelSessionManager;
  private sessions: SessionStorage = {};
  private readonly EXPIRY_HOURS = 24;
  private readonly STORAGE_KEY = 'webseed_funnel_sessions';
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    // Initialize with existing sessions from localStorage (browser only)
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      this.startCleanupInterval();
    }
  }

  public static getInstance(): FunnelSessionManager {
    if (!FunnelSessionManager.instance) {
      FunnelSessionManager.instance = new FunnelSessionManager();
    }
    return FunnelSessionManager.instance;
  }

  /**
   * Create a new funnel session
   */
  createSession(data: {
    email: string;
    products: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    customerInfo?: FunnelSessionData['customerInfo'];
    couponCode?: string;
    metadata?: Record<string, any>;
  }): FunnelSessionData {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.EXPIRY_HOURS * 60 * 60 * 1000));
    
    const totalAmount = data.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);

    const session: FunnelSessionData = {
      id: sessionId,
      email: data.email,
      customerInfo: data.customerInfo,
      products: data.products,
      status: 'initiated',
      amount: totalAmount,
      currentStep: 'checkout',
      upsellsAccepted: [],
      upsellsDeclined: [],
      couponCode: data.couponCode,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata: data.metadata,
    };

    this.sessions[sessionId] = session;
    this.saveToLocalStorage();

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): FunnelSessionData | null {
    const session = this.sessions[sessionId];
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update existing session
   */
  updateSession(sessionId: string, updates: Partial<FunnelSessionData>): FunnelSessionData | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    this.sessions[sessionId] = updatedSession;
    this.saveToLocalStorage();

    return updatedSession;
  }

  /**
   * Set session status
   */
  setSessionStatus(sessionId: string, status: FunnelSessionData['status']): FunnelSessionData | null {
    return this.updateSession(sessionId, { status });
  }

  /**
   * Set current step
   */
  setCurrentStep(sessionId: string, step: FunnelSessionData['currentStep']): FunnelSessionData | null {
    return this.updateSession(sessionId, { currentStep: step });
  }

  /**
   * Add vault ID to session
   */
  setVaultId(sessionId: string, vaultId: string): FunnelSessionData | null {
    return this.updateSession(sessionId, { vaultId });
  }

  /**
   * Add transaction ID to session
   */
  setTransactionId(sessionId: string, transactionId: string): FunnelSessionData | null {
    return this.updateSession(sessionId, { transactionId });
  }

  /**
   * Record upsell acceptance
   */
  acceptUpsell(sessionId: string, productId: string): FunnelSessionData | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const upsellsAccepted = [...session.upsellsAccepted];
    const upsellsDeclined = session.upsellsDeclined.filter(id => id !== productId);

    if (!upsellsAccepted.includes(productId)) {
      upsellsAccepted.push(productId);
    }

    return this.updateSession(sessionId, {
      upsellsAccepted,
      upsellsDeclined,
    });
  }

  /**
   * Record upsell decline
   */
  declineUpsell(sessionId: string, productId: string): FunnelSessionData | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const upsellsDeclined = [...session.upsellsDeclined];
    const upsellsAccepted = session.upsellsAccepted.filter(id => id !== productId);

    if (!upsellsDeclined.includes(productId)) {
      upsellsDeclined.push(productId);
    }

    return this.updateSession(sessionId, {
      upsellsAccepted,
      upsellsDeclined,
    });
  }

  /**
   * Add billing information
   */
  setBillingInfo(sessionId: string, billingInfo: FunnelSessionData['billingInfo']): FunnelSessionData | null {
    return this.updateSession(sessionId, { billingInfo });
  }

  /**
   * Add shipping information
   */
  setShippingInfo(sessionId: string, shippingInfo: FunnelSessionData['shippingInfo']): FunnelSessionData | null {
    return this.updateSession(sessionId, { shippingInfo });
  }

  /**
   * Get all sessions for a specific email
   */
  getSessionsByEmail(email: string): FunnelSessionData[] {
    return Object.values(this.sessions)
      .filter(session => session.email === email && new Date() <= session.expiresAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    if (this.sessions[sessionId]) {
      delete this.sessions[sessionId];
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of Object.entries(this.sessions)) {
      if (now > session.expiresAt) {
        delete this.sessions[sessionId];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveToLocalStorage();
    }

    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    byStatus: Record<string, number>;
    byStep: Record<string, number>;
    expired: number;
  } {
    const now = new Date();
    const sessions = Object.values(this.sessions);
    
    const stats = {
      total: sessions.length,
      byStatus: {} as Record<string, number>,
      byStep: {} as Record<string, number>,
      expired: 0,
    };

    sessions.forEach(session => {
      if (now > session.expiresAt) {
        stats.expired++;
        return;
      }

      stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1;
      stats.byStep[session.currentStep] = (stats.byStep[session.currentStep] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `ws_${timestamp}_${randomPart}`;
  }

  /**
   * Load sessions from localStorage (browser only)
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedSessions = JSON.parse(stored);
        
        // Convert date strings back to Date objects
        for (const [sessionId, session] of Object.entries(parsedSessions)) {
          const sessionData = session as any;
          sessionData.createdAt = new Date(sessionData.createdAt);
          sessionData.updatedAt = new Date(sessionData.updatedAt);
          sessionData.expiresAt = new Date(sessionData.expiresAt);
          this.sessions[sessionId] = sessionData;
        }

        // Clean up expired sessions on load
        this.cleanupExpiredSessions();
      }
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Save sessions to localStorage (browser only)
   */
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Failed to save sessions to localStorage:', error);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up expired sessions every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Get all active sessions (for debugging)
   */
  getAllActiveSessions(): FunnelSessionData[] {
    const now = new Date();
    return Object.values(this.sessions)
      .filter(session => now <= session.expiresAt)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

// Export singleton instance
export const funnelSessionManager = FunnelSessionManager.getInstance();