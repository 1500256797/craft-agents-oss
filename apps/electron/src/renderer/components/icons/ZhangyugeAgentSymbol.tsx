import brandLogo from "@/assets/logo.png"

interface ZhangyugeAgentSymbolProps {
  className?: string
}

/**
 * Small brand mark used in compact UI surfaces.
 */
export function ZhangyugeAgentSymbol({ className }: ZhangyugeAgentSymbolProps) {
  return (
    <img
      src={brandLogo}
      alt=""
      aria-hidden="true"
      className={className ? `${className} object-contain` : 'object-contain'}
      draggable={false}
    />
  )
}
