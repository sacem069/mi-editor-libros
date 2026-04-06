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
          title="Rehacer"
          aria-label="Rehacer"
        >
          <Redo2 size={18} strokeWidth={1.5} />
          <span>Rehacer</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer"
          aria-label="Deshacer"
        >
          <Undo2 size={18} strokeWidth={1.5} />
          <span>Deshacer</span>
        </button>

        <button
          className="toolbar-btn"
          title="Formas"
          aria-label="Formas"
        >
          <Shapes size={18} strokeWidth={1.5} />
          <span>Formas</span>
        </button>

        <button
          className="toolbar-btn"
          title="Marco foto"
          aria-label="Marco foto"
        >
          <ImageUpscale size={18} strokeWidth={1.5} />
          <span>Marco foto</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onAddText}
          title="Texto"
          aria-label="Texto"
        >
          <Type size={18} strokeWidth={1.5} />
          <span>Texto</span>
        </button>

        <button
          className={`toolbar-btn${showBleed ? ' toolbar-btn--active' : ''}`}
          onClick={onToggleBleed}
          title="Guías de sangrado"
          aria-label="Guías"
        >
          <Ruler size={18} strokeWidth={1.5} />
          <span>Guías</span>
        </button>
      </div>
    </div>
  )
}
