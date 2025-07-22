import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const SECRET_KEY = process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
const key = new TextEncoder().encode(SECRET_KEY)

// Simple in-memory session cache as fallback (in production, use Redis or similar)
const sessionCache = new Map<string, SessionData>()

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of sessionCache.entries()) {
    if (now > session.expiresAt) {
      sessionCache.delete(sessionId)
      console.log('🗑️ Cleaned up expired session from cache:', sessionId)
    }
  }
}, 5 * 60 * 1000)

export interface SessionData {
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
}

export async function createSession(data: Omit<SessionData, 'createdAt' | 'expiresAt'>): Promise<string> {
  const now = Date.now()
  const sessionData: SessionData = {
    ...data,
    createdAt: now,
    expiresAt: now + (30 * 60 * 1000) // 30 minutes
  }

  // Create JWT token
  const token = await new SignJWT({ ...sessionData })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(key)

  // Set cookie with more lenient settings for development
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 60, // 30 minutes in seconds
    path: '/',
    // Add domain if needed for cross-subdomain
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  }
  
  cookies().set('upsell_session', token, cookieOptions)

  // Also store in memory cache as fallback
  sessionCache.set(sessionData.id, sessionData)

  console.log(`🍪 Session cookie created for ${data.email}`)
  console.log('💾 Session also stored in cache with ID:', sessionData.id)
  console.log('🍪 Cookie options:', cookieOptions)
  console.log('🍪 Token length:', token.length)
  return data.id
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    console.log('🍪 All available cookies:', allCookies.map(c => c.name))
    
    const token = cookieStore.get('upsell_session')?.value

    if (!token) {
      console.log('🍪 No session cookie found')
      console.log('🍪 Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
      console.log('💾 Session cache has', sessionCache.size, 'entries')
      return null
    }

    console.log('🍪 Found session token, length:', token.length)

    // Verify and decode JWT
    const { payload } = await jwtVerify(token, key)
    const sessionData = payload as unknown as SessionData

    // Check if expired
    if (Date.now() > sessionData.expiresAt) {
      console.log('⏰ Session expired:', {
        now: Date.now(),
        expiresAt: sessionData.expiresAt,
        expiredBy: Date.now() - sessionData.expiresAt
      })
      deleteSession()
      sessionCache.delete(sessionData.id)
      return null
    }

    console.log('🍪 Session retrieved from cookie:', {
      email: sessionData.email,
      id: sessionData.id,
      vaultId: sessionData.vaultId,
      createdAt: new Date(sessionData.createdAt).toISOString(),
      expiresAt: new Date(sessionData.expiresAt).toISOString()
    })
    return sessionData
  } catch (error) {
    console.error('🍪 Error reading session:', error)
    if (error instanceof Error) {
      console.error('🍪 Error details:', error.message)
    }
    return null
  }
}

// Alternative session getter that can use session ID as fallback
export function getSessionById(sessionId: string): SessionData | null {
  const session = sessionCache.get(sessionId)
  if (session && Date.now() <= session.expiresAt) {
    console.log('💾 Session found in cache for ID:', sessionId)
    return session
  }
  
  if (session) {
    console.log('💾 Session in cache expired, removing:', sessionId)
    sessionCache.delete(sessionId)
  } else {
    console.log('💾 No session found in cache for ID:', sessionId)
  }
  
  return null
}

export function deleteSession(): void {
  cookies().delete('upsell_session')
  console.log('🗑️ Session cookie deleted')
}