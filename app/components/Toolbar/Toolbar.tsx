'use client'

import { useRef, useState, useEffect } from 'react'
import { Undo2, Redo2, Shapes, ImageUpscale, Type, Ruler, Hand, PaintBucket, Pipette } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import './Toolbar.css'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  showBleed: boolean
  panMode: boolean
  viewMode: 'editor' | 'spreads'
  pageBackground: string
  onUndo: () => void
  onRedo: () => void
  onToggleBleed: () => void
  onAddText: () => void
  onPanModeToggle: () => void
  onViewModeChange: (mode: 'editor' | 'spreads') => void
  onPageBgChange: (color: string) => void
  onApplyBgToAll: () => void
}

export default function Toolbar({
  canUndo,
  canRedo,
  showBleed,
  panMode,
  viewMode,
  pageBackground,
  onUndo,
  onRedo,
  onToggleBleed,
  onAddText,
  onPanModeToggle,
  onViewModeChange,
  onPageBgChange,
  onApplyBgToAll,
}: ToolbarProps) {
  const { t } = useLang()
  const [paintOpen, setPaintOpen] = useState(false)
  const paintWrapRef  = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!paintOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (paintWrapRef.current && !paintWrapRef.current.contains(e.target as Node)) {
        setPaintOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [paintOpen])

  const handleEyedropper = async () => {
    type EyeDropperAPI = { open: () => Promise<{ sRGBHex: string }> }
    const EyeDropperCtor = (window as Window & { EyeDropper?: new () => EyeDropperAPI }).EyeDropper
    if (!EyeDropperCtor) return
    setPaintOpen(false)
    try {
      const result = await new EyeDropperCtor().open()
      onPageBgChange(result.sRGBHex)
    } catch {
      // user cancelled
    }
  }

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

        {/* Paint bucket */}
        <div className="toolbar-paint-wrap" ref={paintWrapRef}>
          <button
            className={`toolbar-btn${paintOpen ? ' toolbar-btn--active' : ''}`}
            onClick={() => setPaintOpen((v) => !v)}
            aria-label="Color de fondo"
          >
            <PaintBucket size={22} strokeWidth={1.5} />
            <span className="toolbar-tooltip">Color de fondo</span>
          </button>

          {paintOpen && (
            <div className="toolbar-paint-popover">
              <div className="toolbar-paint-row">
                <button
                  className="toolbar-paint-swatch"
                  style={{ background: pageBackground }}
                  onClick={() => colorInputRef.current?.click()}
                  aria-label="Abrir selector de color"
                />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={pageBackground.startsWith('#') ? pageBackground : '#ffffff'}
                  onChange={(e) => onPageBgChange(e.target.value)}
                  className="toolbar-paint-input"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <button
                  className="toolbar-paint-eyedropper"
                  onClick={handleEyedropper}
                  aria-label="Cuentagotas"
                >
                  <Pipette size={15} strokeWidth={1.5} />
                </button>
              </div>
              <button
                className="toolbar-paint-apply-all"
                onClick={() => { onApplyBgToAll(); setPaintOpen(false) }}
              >
                Aplicar a todas
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-view-toggle">
        <button
          className={`toolbar-view-btn${viewMode === 'editor' ? ' toolbar-view-btn--active' : ''}`}
          onClick={() => onViewModeChange('editor')}
          aria-label="Vista de edición"
        >
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button
          className={`toolbar-view-btn${viewMode === 'spreads' ? ' toolbar-view-btn--active' : ''}`}
          onClick={() => onViewModeChange('spreads')}
          aria-label="Vista de spreads"
        >
          <svg width="17" height="13" viewBox="0 0 17 13" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="9.5" y="0.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="0.5" y="7.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="9.5" y="7.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
