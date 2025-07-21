'use client'

import { useEffect, useState } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals'

interface MetricData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  displayName: string
  unit: string
  goodThreshold: number
  poorThreshold: number
}

export function WebVitalsDashboard() {
  const [metrics, setMetrics] = useState<Record<string, MetricData>>({})
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    const updateMetric = (metric: Metric) => {
      const metricInfo: Record<string, Partial<MetricData>> = {
        LCP: { displayName: 'Largest Contentful Paint', unit: 'ms', goodThreshold: 2500, poorThreshold: 4000 },
        CLS: { displayName: 'Cumulative Layout Shift', unit: '', goodThreshold: 0.1, poorThreshold: 0.25 },
        FCP: { displayName: 'First Contentful Paint', unit: 'ms', goodThreshold: 1800, poorThreshold: 3000 },
        TTFB: { displayName: 'Time to First Byte', unit: 'ms', goodThreshold: 800, poorThreshold: 1800 },
        INP: { displayName: 'Interaction to Next Paint', unit: 'ms', goodThreshold: 200, poorThreshold: 500 }
      }

      const info = metricInfo[metric.name] || {}
      
      setMetrics(prev => ({
        ...prev,
        [metric.name]: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating || 'needs-improvement',
          displayName: info.displayName || metric.name,
          unit: info.unit || 'ms',
          goodThreshold: info.goodThreshold || 0,
          poorThreshold: info.poorThreshold || 0
        }
      }))
    }

    // Observe all metrics
    onLCP(updateMetric)
    onCLS(updateMetric)
    onFCP(updateMetric)
    onTTFB(updateMetric)
    onINP(updateMetric)
  }, [])

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'bg-green-500'
      case 'needs-improvement': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getRatingEmoji = (rating: string) => {
    switch (rating) {
      case 'good': return '✅'
      case 'needs-improvement': return '⚠️'
      case 'poor': return '❌'
      default: return '❓'
    }
  }

  if (Object.keys(metrics).length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
        >
          📊 Web Vitals
        </button>
      ) : (
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">Web Vitals</h3>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-white text-xl"
            >
              －
            </button>
          </div>
          
          <div className="space-y-2">
            {Object.values(metrics).map((metric) => (
              <div key={metric.name} className="bg-gray-800 p-3 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <span>{getRatingEmoji(metric.rating)}</span>
                    </div>
                    <div className="text-xs text-gray-400">{metric.displayName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">
                      {metric.name === 'CLS' 
                        ? metric.value.toFixed(3) 
                        : Math.round(metric.value)}
                      {metric.unit}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded mt-1 ${getRatingColor(metric.rating)}`}>
                      {metric.rating}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-2 bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${getRatingColor(metric.rating)}`}
                    style={{
                      width: `${Math.min(100, (metric.value / metric.poorThreshold) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <div>Core Web Vitals: LCP, INP, CLS</div>
            <div>Refresh page to measure again</div>
          </div>
        </div>
      )}
    </div>
  )
}