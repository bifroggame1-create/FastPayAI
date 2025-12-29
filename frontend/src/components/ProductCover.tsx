'use client'

interface ProductCoverProps {
  src: string
  alt: string
  className?: string
}

/**
 * ProductCover - Unified product image presentation
 *
 * Takes any product logo/image and presents it consistently:
 * - Fixed 1:1 aspect ratio container
 * - Neutral dark background
 * - Logo centered at 60% max size
 * - Consistent border radius
 */
export default function ProductCover({ src, alt, className = '' }: ProductCoverProps) {
  return (
    <div className={`aspect-square bg-[#1C1C21] rounded-xl flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={src || '/placeholder.jpg'}
        alt={alt}
        className="max-w-[60%] max-h-[60%] w-auto h-auto object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = '/placeholder.jpg'
        }}
      />
    </div>
  )
}
