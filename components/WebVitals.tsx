'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

export function WebVitals() {
  useEffect(() => {
    // Log to console with color coding
    const logMetric = (metric: any) => {
      const value = Math.round(metric.value)
      const rating = metric.rating || 'needs-improvement'
      
      // Color based on rating
      const colors = {
        good: '#0CCE6A',
        'needs-improvement': '#FFA400',
        poor: '#FF4E42'
      }
      
      console.log(
        `%c[Web Vitals] ${metric.name}: ${value}${metric.name === 'CLS' ? '' : 'ms'} (${rating})`,
        `color: ${colors[rating as keyof typeof colors]}; font-weight: bold;`,
        metric
      )
    }

    // Core Web Vitals
    onLCP(logMetric) // Largest Contentful Paint
    onINP(logMetric) // Interaction to Next Paint (replaced FID)
    onCLS(logMetric) // Cumulative Layout Shift
    
    // Additional metrics
    onFCP(logMetric) // First Contentful Paint
    onTTFB(logMetric) // Time to First Byte
  }, [])

  return null
}

// Optional: Export a function to manually report vitals
export function reportWebVitals(metric: any) {
  // You can send metrics to analytics here
  console.log(metric)
}