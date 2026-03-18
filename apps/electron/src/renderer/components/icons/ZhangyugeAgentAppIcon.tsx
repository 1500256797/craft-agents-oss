import brandLogo from "@/assets/logo.svg"

interface 章鱼哥AIAppIconProps {
  className?: string
  size?: number
}

/**
 * 章鱼哥AIAppIcon - Displays the current brand logo asset.
 */
export function 章鱼哥AIAppIcon({ className, size = 64 }: 章鱼哥AIAppIconProps) {
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
