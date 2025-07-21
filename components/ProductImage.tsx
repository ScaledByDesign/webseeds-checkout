import Image from 'next/image'

interface ProductImageProps {
  bottles: number
  className?: string
}

export default function ProductImage({ bottles, className = "" }: ProductImageProps) {
  // For now, we'll use the 6-bottles image for all options
  // In a real implementation, you'd have different images for each package
  return (
    <div className={`relative ${className}`}>
      <Image 
        src="/assets/images/6-bottles.png" 
        alt={`${bottles} Bottle${bottles > 1 ? 's' : ''} Package`}
        width={200} 
        height={200}
        className="w-full h-auto"
      />
      {bottles === 12 && (
        <div className="absolute -top-2 -right-2 bg-purple-976987 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl">
          x2
        </div>
      )}
      {bottles === 1 && (
        <div className="absolute inset-0 bg-white bg-opacity-40" />
      )}
    </div>
  )
}