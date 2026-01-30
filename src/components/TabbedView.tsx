import { useState } from 'react'

export interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface TabbedViewProps {
  tabs: Tab[]
  defaultTab?: string
}

export function TabbedView({ tabs, defaultTab }: TabbedViewProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id)
  const current = tabs.find(t => t.id === activeTab) ?? tabs[0]

  return (
    <div className="tabbed-view">
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn${tab.id === current?.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {current?.content}
      </div>
    </div>
  )
}
