'use client'

import { Undo2, Redo2, Shapes, ImageUpscale, Type, Ruler } from 'lucide-react'
import './Toolbar.css'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  showBleed: boolean
  onUndo: () => void
  onRedo: () => void
  onToggleBleed: () => void
  onAddText: () => void
}

export default function Toolbar({
  canUndo,
  canRedo,
  showBleed,
  onUndo,
  onRedo,
  onToggleBleed,
  onAddText,
}: ToolbarProps) {
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
          aria-label="Texto"
        >
          <Type size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Texto</span>
        </button>

        <button
          className={`toolbar-btn${showBleed ? ' toolbar-btn--active' : ''}`}
          onClick={onToggleBleed}
          aria-label="Guías"
        >
          <Ruler size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Guías</span>
        </button>
      </div>
    </div>
  )
}
