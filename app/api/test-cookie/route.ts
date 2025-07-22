import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  // Try to read the upsell_session cookie
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('upsell_session')
  
  // Also get all cookies for debugging
  const allCookies = cookieStore.getAll()
  
  return NextResponse.json({
    hasSession: !!sessionCookie,
    sessionValue: sessionCookie?.value ? 'present (hidden for security)' : 'not found',
    allCookies: allCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
      path: c.path
    })),
    timestamp: Date.now()
  })
}

export async function POST(request: NextRequest) {
  // Set a test cookie
  const testValue = `test-${Date.now()}`
  
  cookies().set('test_cookie', testValue, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 // 1 hour
  })
  
  return NextResponse.json({
    message: 'Test cookie set',
    value: testValue,
    timestamp: Date.now()
  })
}