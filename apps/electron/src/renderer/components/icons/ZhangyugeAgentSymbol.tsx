import brandLogo from "@/assets/logo.svg"

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
      className={className}
      draggable={false}
    />
  )
}
