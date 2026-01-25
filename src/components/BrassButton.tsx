import type { ReactNode } from 'react'

type BrassButtonProps = {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  /** Primary buttons get bright brass, secondary get subdued copper */
  variant?: 'primary' | 'secondary'
}

export function BrassButton({ children, disabled, onClick, variant = 'secondary' }: BrassButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      type="button"
      className={`brass-button ${isPrimary ? 'primary' : 'secondary'}`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  )
}
