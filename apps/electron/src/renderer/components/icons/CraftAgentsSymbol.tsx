import brandLogo from "@/assets/logo.svg"

interface CraftAgentsSymbolProps {
  className?: string
}

/**
 * Small brand mark used in compact UI surfaces.
 */
export function CraftAgentsSymbol({ className }: CraftAgentsSymbolProps) {
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
