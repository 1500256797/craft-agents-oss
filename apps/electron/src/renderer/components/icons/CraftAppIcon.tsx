import brandLogo from "@/assets/logo.svg"

interface CraftAppIconProps {
  className?: string
  size?: number
}

/**
 * CraftAppIcon - Displays the current brand logo asset.
 */
export function CraftAppIcon({ className, size = 64 }: CraftAppIconProps) {
  return (
    <img
      src={brandLogo}
      alt="Logo"
      width={size}
      height={size}
      className={className}
    />
  )
}
