import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { supabaseAdmin, FunnelSession, SessionCreateData } from './supabase'

// Unified session data interface that combines all session types
export interface UnifiedSessionData {
  // Core identifiers
  id: string
  email: string
  
  // Customer information (unified from database and funnel sessions)
  customerInfo?: {
    firstName?: string
    lastName?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  
  // Product and transaction data
  products: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  
  // Status and flow control
  status: 'pending' | 'initiated' | 'processing' | 'completed' | 'failed' | 'expired'
  currentStep: 'checkout' | 'processing' | 'payment_processing' | 'upsell-1' | 'upsell-2' | 'success' | 'completed' | 'failed'
  
  // Financial data
  amount: number
  couponCode?: string
  
  // Payment and vault information
  vaultId?: string
  customerId?: string
  transactionId?: string
  paymentToken?: string
  
  // Upsell tracking
  upsellsAccepted: string[]
  upsellsDeclined: string[]
  upsells?: Array<{
    step: number
    productCode: string
    amount: number
    bottles: number
    transactionId: string
    timestamp: string
  }>
  
  // Order information
  orderId?: string
  billingInfo?: {
    address: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  shippingInfo?: {
    firstName: string
    lastName: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  
  // State management
  state?: string
  lastVaultUpdate?: number
  
  // Timestamps
  createdAt: Date | number
  updatedAt: Date | number
  expiresAt: Date | number
  
  // Flexible metadata
  metadata?: Record<string, any>
}

// Storage tier configuration
export interface StorageTierConfig {
  useDatabase: boolean
  useCookies: boolean
  useMemoryCache: boolean
  useLocalStorage: boolean // for client-side
}

// Default storage configuration - all tiers enabled
const DEFAULT_STORAGE_CONFIG: StorageTierConfig = {
  useDatabase: true,
  useCookies: true,
  useMemoryCache: true,
  useLocalStorage: false, // disabled by default for server-side safety
}

/**
 * Unified Session Manager
 * 
 * Consolidates all session management systems into a single, consistent API
 * with multi-tier storage (Database -> Cookie -> Memory -> LocalStorage)
 * 
 * Features:
 * - Multi-tier storage with configurable fallbacks
 * - Backward compatibility with existing session systems  
 * - Automatic data synchronization between tiers
 * - Consistent interface across all storage types
 * - Built-in session expiration and cleanup
 * - JWT-based cookie sessions with security headers
 * - Database persistence via Supabase
 * - In-memory caching for performance
 */
export class UnifiedSessionManager {
  private static instance: UnifiedSessionManager
  private memoryCache = new Map<string, UnifiedSessionData>()
  private readonly secretKey: Uint8Array
  private readonly COOKIE_NAME = 'unified_session'
  private readonly EXPIRY_HOURS = 24
  private cleanupInterval?: NodeJS.Timeout
  
  constructor(private config: StorageTierConfig = DEFAULT_STORAGE_CONFIG) {
    const secretKey = process.env.SESSION_SECRET || 'unified-session-key-change-in-production'
    this.secretKey = new TextEncoder().encode(secretKey)
    
    // Start cleanup process for memory cache
    if (this.config.useMemoryCache) {
      this.startCleanupInterval()
    }
  }
  
  /**
   * Get singleton instance with default configuration
   */
  static getInstance(config?: StorageTierConfig): UnifiedSessionManager {
    if (!UnifiedSessionManager.instance) {
      UnifiedSessionManager.instance = new UnifiedSessionManager(config)
    }
    return UnifiedSessionManager.instance
  }
  
  /**
   * Create a new unified session with multi-tier storage
   */
  async createSession(data: {
    email: string
    customerInfo?: UnifiedSessionData['customerInfo']
    products: UnifiedSessionData['products']
    couponCode?: string
    vaultId?: string
    customerId?: string
    metadata?: Record<string, any>
  }): Promise<UnifiedSessionData> {
    const sessionId = this.generateSessionId()
    const now = Date.now()
    const expiresAt = now + (this.EXPIRY_HOURS * 60 * 60 * 1000)
    const amount = data.products.reduce((sum, product) => sum + (product.price * product.quantity), 0)
    
    const sessionData: UnifiedSessionData = {
      id: sessionId,
      email: data.email,
      customerInfo: data.customerInfo,
      products: data.products,
      status: 'pending',
      currentStep: 'checkout',
      amount,
      couponCode: data.couponCode,
      vaultId: data.vaultId,
      customerId: data.customerId,
      upsellsAccepted: [],
      upsellsDeclined: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata: data.metadata,
    }
    
    console.log('🔄 Creating unified session:', sessionId)
    
    // Store across all enabled tiers
    await this.storeInAllTiers(sessionData)
    
    console.log('✅ Unified session created successfully:', sessionId)
    return sessionData
  }
  
  /**
   * Get session by ID with multi-tier fallback lookup
   */
  async getSession(sessionId?: string): Promise<UnifiedSessionData | null> {
    console.log('🔍 Getting unified session:', sessionId || 'from cookie')
    
    // Strategy 1: Get from cookie if no sessionId provided
    if (!sessionId) {
      const cookieSession = await this.getFromCookie()
      if (cookieSession) {
        console.log('✅ Session found in cookie:', cookieSession.id)
        return cookieSession
      }
    }
    
    // Strategy 2: Look up by specific sessionId across all tiers
    if (sessionId) {
      // Try memory cache first (fastest)
      if (this.config.useMemoryCache) {
        const cachedSession = this.memoryCache.get(sessionId)
        if (cachedSession && this.isSessionValid(cachedSession)) {
          console.log('💾 Session found in memory cache:', sessionId)
          return cachedSession
        }
      }
      
      // Try database (most authoritative)
      if (this.config.useDatabase) {
        try {
          const dbSession = await this.getFromDatabase(sessionId)
          if (dbSession && this.isSessionValid(dbSession)) {
            // Sync back to faster tiers
            await this.syncToFasterTiers(dbSession)
            console.log('🗄️ Session found in database:', sessionId)
            return dbSession
          }
        } catch (error) {
          console.error('❌ Database lookup failed:', error)
        }
      }
    }
    
    console.log('⚠️ Session not found:', sessionId || 'cookie lookup')
    return null
  }
  
  /**
   * Update session with multi-tier synchronization
   */
  async updateSession(sessionId: string, updates: Partial<UnifiedSessionData>): Promise<UnifiedSessionData | null> {
    console.log('🔄 Updating unified session:', sessionId, Object.keys(updates))
    
    // Get current session
    const currentSession = await this.getSession(sessionId)
    if (!currentSession) {
      console.log('⚠️ Session not found for update:', sessionId)
      return null
    }
    
    // Apply updates
    const updatedSession: UnifiedSessionData = {
      ...currentSession,
      ...updates,
      updatedAt: Date.now(),
    }
    
    // Store across all tiers
    await this.storeInAllTiers(updatedSession)
    
    console.log('✅ Session updated successfully:', sessionId)
    return updatedSession
  }
  
  /**
   * Delete session from all tiers
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    console.log('🗑️ Deleting unified session:', sessionId)
    
    let success = true
    
    // Remove from memory cache
    if (this.config.useMemoryCache) {
      this.memoryCache.delete(sessionId)
    }
    
    // Remove from database
    if (this.config.useDatabase) {
      try {
        const { error } = await supabaseAdmin
          .from('funnel_sessions')
          .delete()
          .eq('id', sessionId)
          
        if (error) {
          console.error('❌ Failed to delete from database:', error)
          success = false
        }
      } catch (error) {
        console.error('❌ Database delete failed:', error)
        success = false
      }
    }
    
    // Clear cookie if it matches this session
    if (this.config.useCookies) {
      try {
        const cookieSession = await this.getFromCookie()
        if (cookieSession?.id === sessionId) {
          await this.clearCookie()
        }
      } catch (error) {
        console.error('❌ Cookie clearing failed:', error)
      }
    }
    
    console.log('✅ Session deletion completed:', sessionId, 'success:', success)
    return success
  }
  
  /**
   * Cleanup expired sessions across all tiers
   */
  async cleanupExpiredSessions(): Promise<number> {
    console.log('🧹 Running unified session cleanup')
    
    let cleanedCount = 0
    const now = Date.now()
    
    // Clean memory cache
    if (this.config.useMemoryCache) {
      for (const sessionId of Array.from(this.memoryCache.keys())) {
        const session = this.memoryCache.get(sessionId)
        if (session && now > (typeof session.expiresAt === 'number' ? session.expiresAt : session.expiresAt.getTime())) {
          this.memoryCache.delete(sessionId)
          cleanedCount++
        }
      }
    }
    
    // Clean database
    if (this.config.useDatabase) {
      try {
        const { data, error } = await supabaseAdmin
          .from('funnel_sessions')
          .delete()
          .lt('expires_at', new Date().toISOString())
          .select('id')
          
        if (!error && data) {
          cleanedCount += data.length
        }
      } catch (error) {
        console.error('❌ Database cleanup failed:', error)
      }
    }
    
    console.log(`🧹 Cleanup completed: ${cleanedCount} expired sessions removed`)
    return cleanedCount
  }
  
  // =============================================================================
  // BACKWARD COMPATIBILITY METHODS
  // These methods provide compatibility with existing session systems
  // =============================================================================
  
  /**
   * DatabaseSessionManager compatibility
   */
  async createDatabaseSession(data: SessionCreateData): Promise<FunnelSession> {
    const unifiedSession = await this.createSession({
      email: data.email,
      customerInfo: data.customerInfo,
      products: data.products,
      couponCode: data.couponCode,
      metadata: data.metadata,
    })
    
    return this.toFunnelSession(unifiedSession)
  }
  
  async getDatabaseSession(sessionId: string): Promise<FunnelSession | null> {
    const session = await this.getSession(sessionId)
    return session ? this.toFunnelSession(session) : null
  }
  
  async updateDatabaseSession(sessionId: string, updates: Partial<FunnelSession>): Promise<FunnelSession | null> {
    const unifiedUpdates = this.fromFunnelSession(updates)
    const updatedSession = await this.updateSession(sessionId, unifiedUpdates)
    return updatedSession ? this.toFunnelSession(updatedSession) : null
  }
  
  /**
   * CookieSessionManager compatibility
   */
  async createCookieSession(data: {
    id: string
    vaultId: string
    customerId: string
    email: string
    firstName: string
    lastName: string
    transactionId: string
    state?: string
  }): Promise<string> {
    const unifiedSession = await this.createSession({
      email: data.email,
      customerInfo: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      products: [], // Empty products for cookie-only sessions
      vaultId: data.vaultId,
      customerId: data.customerId,
      metadata: {
        transactionId: data.transactionId,
        state: data.state,
      },
    })
    
    return unifiedSession.id
  }
  
  async getCookieSession(): Promise<{
    id: string
    vaultId: string
    customerId: string
    email: string
    firstName: string
    lastName: string
    transactionId: string
    state?: string
    createdAt: number
    expiresAt: number
    lastVaultUpdate?: number
  } | null> {
    const session = await this.getSession()
    if (!session || !session.vaultId || !session.customerId) {
      return null
    }
    
    return {
      id: session.id,
      vaultId: session.vaultId,
      customerId: session.customerId,
      email: session.email,
      firstName: session.customerInfo?.firstName || '',
      lastName: session.customerInfo?.lastName || '',
      transactionId: session.metadata?.transactionId || session.transactionId || '',
      state: session.state || session.metadata?.state,
      createdAt: typeof session.createdAt === 'number' ? session.createdAt : session.createdAt.getTime(),
      expiresAt: typeof session.expiresAt === 'number' ? session.expiresAt : session.expiresAt.getTime(),
      lastVaultUpdate: session.lastVaultUpdate,
    }
  }
  
  /**
   * FunnelSessionManager compatibility
   */
  createFunnelSession(data: {
    email: string
    products: Array<{ id: string; name: string; price: number; quantity: number }>
    customerInfo?: any
    couponCode?: string
    metadata?: Record<string, any>
  }): Promise<UnifiedSessionData> {
    return this.createSession(data)
  }
  
  getFunnelSession(sessionId: string): Promise<UnifiedSessionData | null> {
    return this.getSession(sessionId)
  }
  
  updateFunnelSession(sessionId: string, updates: Partial<UnifiedSessionData>): Promise<UnifiedSessionData | null> {
    return this.updateSession(sessionId, updates)
  }
  
  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================
  
  private async storeInAllTiers(sessionData: UnifiedSessionData): Promise<void> {
    const errors: string[] = []
    
    // Store in memory cache (fastest)
    if (this.config.useMemoryCache) {
      this.memoryCache.set(sessionData.id, sessionData)
    }
    
    // Store in database (most reliable)
    if (this.config.useDatabase) {
      try {
        await this.storeInDatabase(sessionData)
      } catch (error) {
        const errorMsg = `Database storage failed: ${error}`
        console.error('❌', errorMsg)
        errors.push(errorMsg)
      }
    }
    
    // Store in cookie (for session continuity)
    if (this.config.useCookies) {
      try {
        await this.storeCookie(sessionData)
      } catch (error) {
        const errorMsg = `Cookie storage failed: ${error}`
        console.error('❌', errorMsg)
        errors.push(errorMsg)
      }
    }
    
    if (errors.length > 0) {
      console.warn('⚠️ Some storage tiers failed:', errors)
    }
  }
  
  private async storeInDatabase(sessionData: UnifiedSessionData): Promise<void> {
    const dbSession = this.toFunnelSession(sessionData)
    
    const { error } = await supabaseAdmin
      .from('funnel_sessions')
      .upsert(dbSession, { onConflict: 'id' })
    
    if (error) {
      throw new Error(`Database storage failed: ${error.message}`)
    }
  }
  
  private async storeCookie(sessionData: UnifiedSessionData): Promise<void> {
    // Create minimal payload for cookie (size limitations)
    const cookiePayload = {
      id: sessionData.id,
      email: sessionData.email,
      vaultId: sessionData.vaultId,
      customerId: sessionData.customerId,
      createdAt: typeof sessionData.createdAt === 'number' ? sessionData.createdAt : sessionData.createdAt.getTime(),
      expiresAt: typeof sessionData.expiresAt === 'number' ? sessionData.expiresAt : sessionData.expiresAt.getTime(),
    }
    
    const token = await new SignJWT(cookiePayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.EXPIRY_HOURS}h`)
      .sign(this.secretKey)
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: this.EXPIRY_HOURS * 60 * 60,
      path: '/',
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    }
    
    const cookieStore = await cookies()
    cookieStore.set(this.COOKIE_NAME, token, cookieOptions)
  }
  
  private async getFromDatabase(sessionId: string): Promise<UnifiedSessionData | null> {
    const { data: session, error } = await supabaseAdmin
      .from('funnel_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (error || !session) {
      return null
    }
    
    const unified = this.fromFunnelSession(session)
    // Ensure required fields are present
    if (!unified.id || !unified.email || !unified.products) {
      return null
    }
    
    return unified as UnifiedSessionData
  }
  
  private async getFromCookie(): Promise<UnifiedSessionData | null> {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get(this.COOKIE_NAME)?.value
      
      if (!token) {
        return null
      }
      
      const { payload } = await jwtVerify(token, this.secretKey)
      const sessionId = (payload as any).id
      
      if (!sessionId) {
        return null
      }
      
      // Cookie contains minimal data, so we need to get full data from other tiers
      return await this.getSession(sessionId)
    } catch (error) {
      console.error('❌ Cookie verification failed:', error)
      return null
    }
  }
  
  private async clearCookie(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(this.COOKIE_NAME)
  }
  
  private async syncToFasterTiers(sessionData: UnifiedSessionData): Promise<void> {
    // Sync to memory cache if enabled
    if (this.config.useMemoryCache) {
      this.memoryCache.set(sessionData.id, sessionData)
    }
    
    // Sync to cookie if enabled
    if (this.config.useCookies) {
      try {
        await this.storeCookie(sessionData)
      } catch (error) {
        console.error('❌ Cookie sync failed:', error)
      }
    }
  }
  
  private isSessionValid(session: UnifiedSessionData): boolean {
    const now = Date.now()
    const expiresAt = typeof session.expiresAt === 'number' ? session.expiresAt : session.expiresAt.getTime()
    return now <= expiresAt
  }
  
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substr(2, 9)
    return `unified_${timestamp}_${randomPart}`
  }
  
  private toFunnelSession(session: UnifiedSessionData): FunnelSession {
    return {
      id: session.id,
      email: session.email,
      customer_info: session.customerInfo || {},
      products: session.products,
      status: session.status === 'initiated' ? 'pending' : session.status,
      amount: session.amount,
      current_step: session.currentStep,
      upsells_accepted: session.upsellsAccepted,
      upsells_declined: session.upsellsDeclined,
      vault_id: session.vaultId,
      transaction_id: session.transactionId,
      payment_token: session.paymentToken,
      coupon_code: session.couponCode,
      metadata: session.metadata,
      created_at: typeof session.createdAt === 'number' 
        ? new Date(session.createdAt).toISOString() 
        : session.createdAt.toISOString(),
      updated_at: typeof session.updatedAt === 'number'
        ? new Date(session.updatedAt).toISOString()
        : session.updatedAt.toISOString(),
      expires_at: typeof session.expiresAt === 'number'
        ? new Date(session.expiresAt).toISOString()
        : session.expiresAt.toISOString(),
    }
  }
  
  private fromFunnelSession(session: Partial<FunnelSession>): Partial<UnifiedSessionData> {
    const result: Partial<UnifiedSessionData> = {}
    
    if (session.id) result.id = session.id
    if (session.email) result.email = session.email
    if (session.customer_info) result.customerInfo = session.customer_info
    if (session.products) result.products = session.products
    if (session.status) result.status = session.status
    if (session.amount !== undefined) result.amount = session.amount
    if (session.current_step) {
      // Map database current_step to our currentStep enum
      const stepMapping: Record<string, UnifiedSessionData['currentStep']> = {
        'checkout': 'checkout',
        'processing': 'processing', 
        'payment_processing': 'payment_processing',
        'upsell-1': 'upsell-1',
        'upsell-2': 'upsell-2',
        'success': 'success',
        'completed': 'completed',
        'failed': 'failed'
      }
      result.currentStep = stepMapping[session.current_step] || 'checkout'
    }
    if (session.upsells_accepted) result.upsellsAccepted = session.upsells_accepted
    if (session.upsells_declined) result.upsellsDeclined = session.upsells_declined
    if (session.vault_id) result.vaultId = session.vault_id
    if (session.transaction_id) result.transactionId = session.transaction_id
    if (session.payment_token) result.paymentToken = session.payment_token
    if (session.coupon_code) result.couponCode = session.coupon_code
    if (session.metadata) result.metadata = session.metadata
    
    if (session.created_at) {
      result.createdAt = new Date(session.created_at)
    }
    if (session.updated_at) {
      result.updatedAt = new Date(session.updated_at)
    }
    if (session.expires_at) {
      result.expiresAt = new Date(session.expires_at)
    }
    
    return result
  }
  
  private startCleanupInterval(): void {
    // Clean up expired sessions every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, 60 * 60 * 1000)
  }
  
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }
}

// Export singleton instance
export const unifiedSessionManager = UnifiedSessionManager.getInstance()

// Export backward compatibility instances
export const legacyDatabaseSessionManager = {
  createSession: (data: SessionCreateData) => unifiedSessionManager.createDatabaseSession(data),
  getSession: (sessionId: string) => unifiedSessionManager.getDatabaseSession(sessionId),
  updateSession: (sessionId: string, updates: Partial<FunnelSession>) => 
    unifiedSessionManager.updateDatabaseSession(sessionId, updates),
  deleteSession: (sessionId: string) => unifiedSessionManager.deleteSession(sessionId),
  cleanupExpiredSessions: () => unifiedSessionManager.cleanupExpiredSessions(),
  getSessionsByStatus: async (status: FunnelSession['status']) => {
    console.warn('⚠️ getSessionsByStatus not yet implemented in unified manager')
    return []
  },
  updateSessionStatus: (sessionId: string, status: FunnelSession['status']) =>
    unifiedSessionManager.updateSession(sessionId, { status }),
  addPaymentInfo: (sessionId: string, paymentToken: string, transactionId?: string) =>
    unifiedSessionManager.updateSession(sessionId, { 
      paymentToken, 
      transactionId, 
      status: 'processing', 
      currentStep: 'payment_processing' 
    }),
  completeSession: (sessionId: string, transactionId: string, vaultId?: string) =>
    unifiedSessionManager.updateSession(sessionId, { 
      transactionId, 
      vaultId, 
      status: 'completed', 
      currentStep: 'completed' 
    }),
  failSession: (sessionId: string, error: string) =>
    unifiedSessionManager.updateSession(sessionId, { 
      status: 'failed', 
      currentStep: 'failed',
      metadata: { error, failed_at: new Date().toISOString() }
    }),
}

export const legacyCookieSessionManager = {
  createSession: (data: {
    id: string
    vaultId: string
    customerId: string
    email: string
    firstName: string
    lastName: string
    transactionId: string
    state?: string
  }) => unifiedSessionManager.createCookieSession(data),
  getSession: () => unifiedSessionManager.getCookieSession(),
  getSessionById: (sessionId: string) => unifiedSessionManager.getSession(sessionId),
  updateSession: (updatedData: any) => 
    unifiedSessionManager.updateSession(updatedData.id, updatedData),
  deleteSession: () => {
    // For cookie deletion, we need to clear by finding current session
    unifiedSessionManager.getCookieSession().then(session => {
      if (session) {
        unifiedSessionManager.deleteSession(session.id)
      }
    })
  },
}

export const legacyFunnelSessionManager = {
  getInstance: () => ({
    createSession: (data: {
      email: string
      products: Array<{ id: string; name: string; price: number; quantity: number }>
      customerInfo?: any
      couponCode?: string
      metadata?: Record<string, any>
    }) => unifiedSessionManager.createFunnelSession(data),
    getSession: (sessionId: string) => unifiedSessionManager.getFunnelSession(sessionId),
    updateSession: (sessionId: string, updates: Partial<UnifiedSessionData>) =>
      unifiedSessionManager.updateFunnelSession(sessionId, updates),
    deleteSession: (sessionId: string) => unifiedSessionManager.deleteSession(sessionId),
    setSessionStatus: (sessionId: string, status: any) =>
      unifiedSessionManager.updateSession(sessionId, { status }),
    setCurrentStep: (sessionId: string, step: any) =>
      unifiedSessionManager.updateSession(sessionId, { currentStep: step }),
    setVaultId: (sessionId: string, vaultId: string) =>
      unifiedSessionManager.updateSession(sessionId, { vaultId }),
    setTransactionId: (sessionId: string, transactionId: string) =>
      unifiedSessionManager.updateSession(sessionId, { transactionId }),
    // Add other methods as needed for full compatibility
  }),
}