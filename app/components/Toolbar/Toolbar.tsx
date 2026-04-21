'use client'

import { Undo2, Redo2, Shapes, ImageUpscale, Type, Ruler, Hand } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import './Toolbar.css'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  showBleed: boolean
  panMode: boolean
  onUndo: () => void
  onRedo: () => void
  onToggleBleed: () => void
  onAddText: () => void
  onPanModeToggle: () => void
}

export default function Toolbar({
  canUndo,
  canRedo,
  showBleed,
  panMode,
  onUndo,
  onRedo,
  onToggleBleed,
  onAddText,
  onPanModeToggle,
}: ToolbarProps) {
  const { t } = useLang()
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Rehacer"
        >
          <Redo2 size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Rehacer</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Deshacer"
        >
          <Undo2 size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Deshacer</span>
        </button>

        <button
          className="toolbar-btn"
          aria-label="Formas"
        >
          <Shapes size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Formas</span>
        </button>

        <button
          className="toolbar-btn"
          aria-label="Marco foto"
        >
          <ImageUpscale size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Marco foto</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onAddText}
          aria-label={t.text}
        >
          <Type size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.text}</span>
        </button>

        <button
          className={`toolbar-btn${showBleed ? ' toolbar-btn--active' : ''}`}
          onClick={onToggleBleed}
          aria-label={t.guides}
        >
          <Ruler size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.guides}</span>
        </button>

        <button
          className={`toolbar-btn${panMode ? ' toolbar-btn--active' : ''}`}
          onClick={onPanModeToggle}
          aria-label="Mano"
        >
          <Hand size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Mano</span>
        </button>
      </div>
    </div>
  )
}
