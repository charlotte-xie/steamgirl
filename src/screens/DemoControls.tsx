import { Tooltip } from '../components/Tooltip'
import { Button } from '../components/Button'
import { useNavigate } from 'react-router-dom'

export function DemoControls() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', height: '100vh', width: '100vw', overflow: 'auto' }}>
      <div className="button-row">
        <Tooltip
          content={
            <div>
              <h2>Pressure Gauge</h2>
              <p className="text-muted">
                Standard mouse-over demo. Replace this with game tooltips, item details, etc.
              </p>
            </div>
          }
        >
          <Button color="#f97316">Hover over this control</Button>
        </Tooltip>
        <div className="card-component">
          <div className="card-content">
            <h4 className="card-title">Card</h4>
            <p className="card-description">Card description here</p>
          </div>
        </div>
        <Button disabled>Disabled button</Button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button color="#6b7280" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    </div>
  )
}


