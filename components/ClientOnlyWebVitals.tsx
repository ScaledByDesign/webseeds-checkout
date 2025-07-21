'use client'

import { useEffect, useState } from 'react'
import { WebVitalsDashboard } from './WebVitalsDashboard'

export function ClientOnlyWebVitals() {
  const [isDev, setIsDev] = useState(false)
  
  useEffect(() => {
    // Only check on client side
    setIsDev(process.env.NODE_ENV === 'development')
  }, [])
  
  if (!isDev) return null
  
  return <WebVitalsDashboard />
}