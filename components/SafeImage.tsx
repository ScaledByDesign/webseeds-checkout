'use client'

import Image from 'next/image'
import { useState } from 'react'

interface SafeImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  fallbackSrc?: string
}

export default function SafeImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  fallbackSrc 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    console.warn(`Image failed to load: ${imgSrc}`)
    
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      console.log(`Trying fallback image: ${fallbackSrc}`)
      setImgSrc(fallbackSrc)
      return
    }
    
    // Try WebP version if original was PNG
    if (imgSrc.endsWith('.png')) {
      const webpSrc = imgSrc.replace('.png', '.webp')
      console.log(`Trying WebP version: ${webpSrc}`)
      setImgSrc(webpSrc)
      return
    }
    
    // Try PNG version if original was WebP
    if (imgSrc.endsWith('.webp')) {
      const pngSrc = imgSrc.replace('.webp', '.png')
      console.log(`Trying PNG version: ${pngSrc}`)
      setImgSrc(pngSrc)
      return
    }
    
    setHasError(true)
  }

  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center text-gray-500 text-sm ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div>Image not found</div>
          <div className="text-xs mt-1">{alt}</div>
        </div>
      </div>
    )
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={handleError}
      onLoad={() => {
        if (imgSrc !== src) {
          console.log(`Successfully loaded fallback image: ${imgSrc}`)
        }
      }}
    />
  )
}
