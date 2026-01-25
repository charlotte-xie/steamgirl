import type { ReactNode } from 'react'
import { Frame } from './Frame'

interface WidgetProps {
  children: ReactNode
  className?: string
}

export function Widget({ children, className = '' }: WidgetProps) {
  return (
    <Frame size="auto" className={`widget-panel ${className}`}>
      {children}
    </Frame>
  )
}
