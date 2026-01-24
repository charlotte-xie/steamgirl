import { useState } from 'react'
import { Button } from '../components/Button'
import { CenteredContent } from '../components/CenteredContent'
import { AvatarPanel } from '../components/AvatarPanel'

export type Specialty = 'Aetherics' | 'Mechanics' | 'Flirtation'

interface SpecialtyInfo {
  name: Specialty
  description: string
  bonuses: string[]
}

const SPECIALTIES: SpecialtyInfo[] = [
  {
    name: 'Aetherics',
    description: 'You have an affinity for the mystical arts of Aetheria, sensing the unseen forces that power the city.',
    bonuses: ['+10 Aetherics', '+5 Perception'],
  },
  {
    name: 'Mechanics',
    description: 'Gears and cogs speak to you. You understand the intricate clockwork that makes Aetheria tick.',
    bonuses: ['+10 Mechanics', '+5 Wits'],
  },
  {
    name: 'Flirtation',
    description: "You weren't always the best student, but your winning smile has got you this far!",
    bonuses: ['+10 Flirtation', '+5 Charm'],
  },
]

interface NewCharacterScreenProps {
  onStart: (name: string, specialty: Specialty | null) => void
  onCancel: () => void
}

export function NewCharacterScreen({ onStart, onCancel }: NewCharacterScreenProps) {
  const [playerName, setPlayerName] = useState('Elise')
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null)

  const trimmedName = playerName.trim()
  const isValidName = trimmedName.length > 0

  const handleStart = () => {
    if (isValidName) {
      onStart(trimmedName, selectedSpecialty)
    }
  }

  const selectedInfo = selectedSpecialty ? SPECIALTIES.find((s) => s.name === selectedSpecialty) : null

  return (
    <CenteredContent>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-lg)', alignItems: 'stretch' }}>
        {/* Avatar Panel */}
        <AvatarPanel nameOverride={trimmedName || '???'} />

        {/* Character Creation Panel */}
        <div className="panel-elevated" style={{ padding: 'var(--space-lg)', width: '500px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>New Character</h2>

        {/* Player Name Input */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label
            htmlFor="player-name"
            style={{ display: 'block', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}
          >
            Character Name
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Elise"
            style={{
              width: '100%',
              padding: 'var(--space-sm)',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {/* Specialty Selection */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-muted)' }}>
            Starting Specialty (optional)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
            {SPECIALTIES.map((specialty) => {
              const isSelected = selectedSpecialty === specialty.name
              return (
                <button
                  key={specialty.name}
                  type="button"
                  onClick={() => setSelectedSpecialty(isSelected ? null : specialty.name)}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: isSelected ? 'var(--bg-panel)' : 'var(--bg-panel-soft)',
                    border: '2px solid',
                    borderColor: isSelected ? 'var(--border-main)' : 'var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    transition: 'background 0.2s ease, border-color 0.2s ease',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {specialty.name}
                </button>
              )
            })}
          </div>
          {/* Fixed-height description box to prevent layout shift */}
          <div
            style={{
              marginTop: 'var(--space-sm)',
              padding: 'var(--space-sm)',
              background: 'var(--bg-panel-soft)',
              borderRadius: 'var(--radius-sm)',
              minHeight: '5.5em',
            }}
          >
            {selectedInfo ? (
              <>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                  {selectedInfo.description}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>{selectedInfo.bonuses.join(', ')}</div>
              </>
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No specialty chosen - no starting bonuses
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
          <Button color="#6b7280" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="#22c55e" disabled={!isValidName} onClick={handleStart}>
            Start Game
          </Button>
        </div>
        </div>
      </div>
    </CenteredContent>
  )
}
