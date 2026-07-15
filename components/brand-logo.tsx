import Image from 'next/image'

type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({
  compact = false,
  className = '',
}: BrandLogoProps) {
  if (compact) {
    return (
      <Image
        src="/logo/logo-square.png"
        alt="Moto /=\\ Viaggi"
        width={48}
        height={48}
        priority
        className={`rounded-xl ${className}`}
      />
    )
  }

  return (
    <Image
      src="/logo/logo-horizontal.png"
      alt="Moto /=\\ Viaggi"
      width={420}
      height={108}
      priority
      className={`h-auto w-auto max-w-full ${className}`}
    />
  )
}
