import type { CSSProperties, ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  /** Bright accent color, e.g. "#ff8800" */
  color?: string
  /** Tooltip text shown on hover */
  title?: string
}

function darkenHex(hex: string, factor = 0.3): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex

  const num = parseInt(normalized, 16)
  const r = Math.floor(((num >> 16) & 0xff) * factor)
  const g = Math.floor(((num >> 8) & 0xff) * factor)
  const b = Math.floor((num & 0xff) * factor)

  const toHex = (value: number) => value.toString(16).padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function Button({ children, disabled, onClick, color = '#fbbf24', title }: ButtonProps) {
  const isDisabled = Boolean(disabled)
  const hasCustomColor = color !== undefined

  const accent = isDisabled
    ? hasCustomColor
      ? color
      : '#9ca3af'
    : color

  const background = isDisabled
    ? hasCustomColor
      ? darkenHex(color, 0.25)
      : '#2b3533'
    : darkenHex(color, 0.25)

  const style: CSSProperties = {
    color: accent,
    borderColor: accent,
    backgroundColor: background,
  }

  return (
    <button
      type="button"
      className="button-base button-primary"
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      style={style}
      title={title}
    >
      {children}
    </button>
  )
}

