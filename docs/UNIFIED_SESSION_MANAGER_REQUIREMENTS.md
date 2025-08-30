# Unified Session Manager Requirements

## Overview

This document defines the technical requirements for implementing a unified session management system to replace the current fragmented approach involving 4 separate session systems.

## Current State Analysis

### Problems Identified
1. **Data Inconsistency**: Different field names and data models across systems
2. **Performance Issues**: Redundant lookups and multiple storage systems
3. **Maintenance Complexity**: 4 separate codebases with different patterns
4. **Debugging Difficulty**: Session state scattered across multiple systems
5. **Security Gaps**: Inconsistent authentication and session validation

### Migration Benefits
- **Performance**: 40-50% reduction in session lookup time
- **Reliability**: 60-80% reduction in session-related bugs
- **Maintainability**: Single codebase for all session operations
- **Security**: Unified authentication and validation model

## Technical Architecture Requirements

### 1. Multi-Tier Storage Strategy

```typescript
interface StorageTier {
  name: 'cache' | 'shared' | 'persistent';
  technology: 'memory' | 'redis' | 'database';
  ttl: number; // seconds
  capacity: number; // max entries
  primary: boolean;
}
```

#### Tier Configuration
- **L1 Cache**: In-memory Map (10-second TTL, 1000 entries max)
- **L2 Shared**: Redis/Upstash (30-minute TTL, unlimited)
- **L3 Persistent**: Supabase (24-hour TTL, unlimited)

#### Access Pattern
```typescript
async getSession(id: string): Promise<Session | null> {
  // L1: Check memory cache
  let session = memoryCache.get(id);
  if (session && !isExpired(session)) return session;
  
  // L2: Check shared cache
  session = await redisCache.get(id);
  if (session && !isExpired(session)) {
    memoryCache.set(id, session);
    return session;
  }
  
  // L3: Check database
  session = await database.getSession(id);
  if (session && !isExpired(session)) {
    await redisCache.set(id, session);
    memoryCache.set(id, session);
    return session;
  }
  
  return null;
}
```

### 2. Unified Data Model

```typescript
export interface UnifiedSession {
  // Core Identity
  id: string; // Format: ws_${timestamp}_${random}
  email: string;
  
  // Timing & Lifecycle
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  
  // Status & Flow
  status: SessionStatus;
  currentStep: FlowStep;
  flowMetadata: FlowMetadata;
  
  // Customer Information (normalized)
  customer: CustomerInfo;
  
  // Commerce Data
  products: Product[];
  totalAmount: number;
  currency: string; // Default: 'USD'
  
  // Payment Integration
  vaultId?: string;
  customerId?: string;
  transactionId?: string;
  paymentToken?: string;
  
  // Upsell Management
  upsells: UpsellState;
  
  // Security & Audit
  ipAddress?: string;
  userAgent?: string;
  
  // Extensible metadata
  metadata: Record<string, unknown>;
  
  // System fields
  version: number; // For optimistic locking
  source: SessionSource; // 'api' | 'client' | 'migration'
}

// Supporting Types
export enum SessionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum FlowStep {
  CHECKOUT = 'checkout',
  PAYMENT_PROCESSING = 'payment_processing',
  UPSELL_1 = 'upsell_1',
  UPSELL_2 = 'upsell_2',
  SUCCESS = 'success',
  FAILED = 'failed'
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsellState {
  accepted: UpsellRecord[];
  declined: string[]; // Product IDs
  available: string[]; // Product IDs
  currentOffer?: string; // Product ID
}

export interface UpsellRecord {
  productId: string;
  step: number;
  amount: number;
  quantity: number;
  transactionId?: string;
  timestamp: Date;
}

export interface FlowMetadata {
  startedAt: Date;
  stepsCompleted: FlowStep[];
  currentStepStartedAt: Date;
  abandonedAt?: Date;
  completedAt?: Date;
}

export enum SessionSource {
  API = 'api',
  CLIENT = 'client',
  MIGRATION = 'migration',
  WEBHOOK = 'webhook'
}
```

### 3. Core API Interface

```typescript
export interface IUnifiedSessionManager {
  // Session Lifecycle
  createSession(data: CreateSessionData): Promise<UnifiedSession>;
  getSession(id: string): Promise<UnifiedSession | null>;
  updateSession(id: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession | null>;
  deleteSession(id: string): Promise<boolean>;
  
  // Session Validation
  validateSession(id: string): Promise<SessionValidation>;
  extendSession(id: string, duration?: number): Promise<UnifiedSession | null>;
  
  // Batch Operations
  getSessions(ids: string[]): Promise<(UnifiedSession | null)[]>;
  deleteSessions(ids: string[]): Promise<boolean[]>;
  
  // Query Operations
  getSessionsByEmail(email: string): Promise<UnifiedSession[]>;
  getSessionsByStatus(status: SessionStatus): Promise<UnifiedSession[]>;
  getActiveSessionsCount(): Promise<number>;
  
  // Maintenance Operations
  cleanupExpiredSessions(): Promise<number>;
  getSessionStats(): Promise<SessionStats>;
  
  // Event System
  on(event: SessionEvent, handler: SessionEventHandler): void;
  off(event: SessionEvent, handler: SessionEventHandler): void;
  
  // Cache Management
  invalidateCache(id: string): Promise<void>;
  warmCache(ids: string[]): Promise<void>;
  getCacheStats(): CacheStats;
}

// Supporting Interfaces
export interface CreateSessionData {
  email: string;
  customer: CustomerInfo;
  products: Product[];
  metadata?: Record<string, unknown>;
  expirationHours?: number; // Default: 24
  source?: SessionSource;
}

export interface SessionValidation {
  valid: boolean;
  reason?: string;
  expiresAt?: Date;
  warningsAt?: Date; // When to warn about expiration
}

export interface SessionStats {
  total: number;
  byStatus: Record<SessionStatus, number>;
  byStep: Record<FlowStep, number>;
  averageLifetime: number; // milliseconds
  conversionRate: number; // percentage
  abandonmentRate: number; // percentage
}

export enum SessionEvent {
  CREATED = 'session:created',
  UPDATED = 'session:updated',
  EXPIRED = 'session:expired',
  DELETED = 'session:deleted',
  ACCESSED = 'session:accessed',
  STATUS_CHANGED = 'session:status_changed',
  STEP_CHANGED = 'session:step_changed'
}

export type SessionEventHandler = (session: UnifiedSession, metadata?: Record<string, unknown>) => void;

export interface CacheStats {
  l1: { hits: number; misses: number; size: number; };
  l2: { hits: number; misses: number; size: number; };
  l3: { hits: number; misses: number; };
  hitRate: number; // percentage
}
```

### 4. Configuration System

```typescript
export interface SessionManagerConfig {
  // Storage Configuration
  storage: {
    database: {
      client: 'supabase';
      url: string;
      serviceKey: string;
      tableName: string; // Default: 'unified_sessions'
    };
    cache: {
      provider: 'redis' | 'upstash' | 'memory';
      url?: string;
      token?: string;
      keyPrefix: string; // Default: 'session:'
    };
    memory: {
      enabled: boolean;
      maxSize: number; // Default: 1000
      ttlSeconds: number; // Default: 600 (10 minutes)
    };
  };
  
  // Session Configuration
  sessions: {
    defaultExpirationHours: number; // Default: 24
    maxExpirationHours: number; // Default: 168 (7 days)
    cleanupIntervalMinutes: number; // Default: 60
    warningBeforeExpirationMinutes: number; // Default: 30
  };
  
  // Performance Configuration
  performance: {
    batchSize: number; // Default: 100
    maxConcurrentOperations: number; // Default: 10
    timeoutMs: number; // Default: 5000
  };
  
  // Security Configuration
  security: {
    encryptionKey?: string;
    hashSalt?: string;
    auditLogging: boolean; // Default: true
    ipTracking: boolean; // Default: true
  };
  
  // Development Configuration
  development: {
    enableDebugLogging: boolean;
    enableMetrics: boolean;
    enableEventing: boolean;
  };
}
```

### 5. Error Handling Requirements

```typescript
export enum SessionErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONCURRENCY_ERROR = 'CONCURRENCY_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export class SessionError extends Error {
  constructor(
    public code: SessionErrorCode,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

// Error Handling Strategy
export interface ErrorHandlingStrategy {
  retryAttempts: number;
  retryDelayMs: number;
  fallbackToCache: boolean;
  fallbackToDatabase: boolean;
  logErrors: boolean;
  notifyOnCritical: boolean;
}
```

### 6. Logging and Monitoring Requirements

```typescript
export interface SessionLogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  audit(action: string, sessionId: string, context?: LogContext): void;
}

export interface LogContext {
  sessionId?: string;
  email?: string;
  operation?: string;
  duration?: number;
  cacheHit?: boolean;
  source?: SessionSource;
  [key: string]: unknown;
}

// Metrics Interface
export interface SessionMetrics {
  incrementCounter(metric: string, tags?: Record<string, string>): void;
  recordHistogram(metric: string, value: number, tags?: Record<string, string>): void;
  recordGauge(metric: string, value: number, tags?: Record<string, string>): void;
}

// Required Metrics
const METRICS = {
  SESSION_CREATED: 'session.created',
  SESSION_RETRIEVED: 'session.retrieved',
  SESSION_UPDATED: 'session.updated',
  SESSION_DELETED: 'session.deleted',
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  DATABASE_QUERY_DURATION: 'database.query.duration',
  CACHE_OPERATION_DURATION: 'cache.operation.duration',
  SESSION_LIFETIME: 'session.lifetime',
  ERROR_COUNT: 'error.count'
} as const;
```

## Implementation Requirements

### 1. Migration Strategy

#### Phase 1: Parallel Implementation (Weeks 1-2)
- Implement `UnifiedSessionManager` class
- Add comprehensive test coverage
- Create migration utilities
- Deploy alongside existing systems

#### Phase 2: Gradual Migration (Weeks 3-4)
- Migrate database session endpoints first
- Update cookie session integration
- Migrate upsell process (most complex)
- Update funnel client-side logic

#### Phase 3: Cleanup (Week 5)
- Remove legacy session managers
- Clean up unused dependencies
- Update documentation

### 2. Backward Compatibility Requirements

```typescript
// Adapter for existing systems
export class LegacySessionAdapter {
  // Convert from database session format
  static fromDatabaseSession(dbSession: FunnelSession): UnifiedSession;
  
  // Convert from cookie session format
  static fromCookieSession(cookieSession: SessionData): UnifiedSession;
  
  // Convert from funnel session format
  static fromFunnelSession(funnelSession: FunnelSessionData): UnifiedSession;
  
  // Convert to legacy formats for gradual migration
  static toDatabaseSession(session: UnifiedSession): FunnelSession;
  static toCookieSession(session: UnifiedSession): SessionData;
  static toFunnelSession(session: UnifiedSession): FunnelSessionData;
}
```

### 3. Testing Requirements

```typescript
describe('UnifiedSessionManager', () => {
  describe('Core Operations', () => {
    it('should create sessions with valid data');
    it('should retrieve sessions by ID');
    it('should update sessions atomically');
    it('should delete sessions completely');
    it('should handle concurrent updates correctly');
  });
  
  describe('Cache Integration', () => {
    it('should prioritize cache over database');
    it('should fall back to database when cache fails');
    it('should sync data across cache tiers');
    it('should handle cache invalidation');
  });
  
  describe('Expiration Management', () => {
    it('should respect expiration times');
    it('should clean up expired sessions');
    it('should extend session expiration');
    it('should trigger expiration events');
  });
  
  describe('Error Handling', () => {
    it('should handle database failures gracefully');
    it('should handle cache failures gracefully');
    it('should retry failed operations');
    it('should provide meaningful error messages');
  });
  
  describe('Performance', () => {
    it('should meet response time requirements (<10ms cache hit)');
    it('should handle high concurrency');
    it('should manage memory usage efficiently');
    it('should batch operations effectively');
  });
});
```

### 4. Performance Requirements

| Operation | Target Time | Fallback Time | SLA |
|-----------|-------------|---------------|-----|
| Cache Hit | <10ms | N/A | 99.9% |
| Cache Miss (DB query) | <100ms | <500ms | 99.5% |
| Session Create | <200ms | <1000ms | 99.0% |
| Session Update | <50ms | <200ms | 99.5% |
| Batch Cleanup | <5s | <30s | 95.0% |

### 5. Security Requirements

- **Encryption**: All session data encrypted at rest
- **Authentication**: Session tokens cryptographically signed
- **Authorization**: Role-based access to session operations
- **Audit Logging**: All session operations logged with user context
- **Data Retention**: Automatic cleanup of expired session data
- **GDPR Compliance**: Data deletion on request, minimal data collection

### 6. Deployment Requirements

- **Zero-Downtime Migration**: Gradual rollout with feature flags
- **Rollback Plan**: Ability to revert to legacy systems
- **Monitoring**: Comprehensive metrics and alerting
- **Documentation**: API documentation and migration guide
- **Load Testing**: Performance validation under realistic loads

## Success Criteria

### Functional Requirements ✅
- [ ] All legacy session functionality preserved
- [ ] Data consistency across all operations
- [ ] Proper expiration and cleanup handling
- [ ] Event system for session lifecycle tracking
- [ ] Migration utilities for existing data

### Performance Requirements ✅
- [ ] <10ms response time for cache hits
- [ ] <100ms response time for database queries
- [ ] 40-50% overall performance improvement
- [ ] Support for 1000+ concurrent sessions
- [ ] Efficient memory usage (<100MB baseline)

### Reliability Requirements ✅
- [ ] 99.9% uptime for session operations
- [ ] Graceful degradation during failures
- [ ] Automatic recovery from temporary outages
- [ ] 60-80% reduction in session-related bugs
- [ ] Comprehensive error logging and monitoring

### Maintainability Requirements ✅
- [ ] Single codebase for all session operations
- [ ] Comprehensive test coverage (>95%)
- [ ] Clear documentation and examples
- [ ] Easy configuration and deployment
- [ ] Backward compatibility during transition

This unified session manager will provide a solid foundation for reliable, performant, and maintainable session management across the entire application.