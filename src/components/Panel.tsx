interface PanelProps {
  children: React.ReactNode
  className?: string
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div className={`panel${className ? ' ' + className : ''}`}>
      {children}
    </div>
  )
}
