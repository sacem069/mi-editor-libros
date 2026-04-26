'use client'

import { useRef, useState, useEffect } from 'react'
import { Undo2, Redo2, Shapes, ImageUpscale, Type, Ruler, Hand, PaintBucket, Pipette, Grid } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import type { GridSettings } from '../Canvas/Canvas'
import './Toolbar.css'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  rulerMode: boolean
  panMode: boolean
  frameTool: boolean
  viewMode: 'editor' | 'spreads'
  pageBackground: string
  showGrid: boolean
  gridSettings: GridSettings
  onUndo: () => void
  onRedo: () => void
  onToggleRuler: () => void
  onAddText: () => void
  onPanModeToggle: () => void
  onFrameToolToggle: () => void
  onViewModeChange: (mode: 'editor' | 'spreads') => void
  onPageBgChange: (color: string) => void
  onApplyBgToAll: () => void
  onToggleGrid: () => void
  onGridSettingsChange: (s: GridSettings) => void
}

export default function Toolbar({
  canUndo,
  canRedo,
  rulerMode,
  panMode,
  frameTool,
  viewMode,
  pageBackground,
  showGrid,
  gridSettings,
  onUndo,
  onRedo,
  onToggleRuler,
  onAddText,
  onPanModeToggle,
  onFrameToolToggle,
  onViewModeChange,
  onPageBgChange,
  onApplyBgToAll,
  onToggleGrid,
  onGridSettingsChange,
}: ToolbarProps) {
  const { t } = useLang()
  const [paintOpen, setPaintOpen] = useState(false)
  const paintWrapRef  = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const [gridOpen, setGridOpen]     = useState(false)
  const gridWrapRef                 = useRef<HTMLDivElement>(null)
  const gridColorRef                = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!gridOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (gridWrapRef.current && !gridWrapRef.current.contains(e.target as Node)) {
        setGridOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [gridOpen])

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
          className={`toolbar-btn${frameTool ? ' toolbar-btn--active' : ''}`}
          onClick={onFrameToolToggle}
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
          className={`toolbar-btn${rulerMode ? ' toolbar-btn--active' : ''}`}
          onClick={onToggleRuler}
          aria-label="Regla"
        >
          <Ruler size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Regla</span>
        </button>

        <button
          className={`toolbar-btn${panMode ? ' toolbar-btn--active' : ''}`}
          onClick={onPanModeToggle}
          aria-label="Mano"
        >
          <Hand size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">Mano</span>
        </button>

        {/* Grid */}
        <div className="toolbar-grid-wrap" ref={gridWrapRef}>
          <button
            className={`toolbar-btn${showGrid ? ' toolbar-btn--active' : ''}`}
            onClick={() => {
              if (!showGrid) { onToggleGrid(); setGridOpen(true) }
              else if (gridOpen) { setGridOpen(false) }
              else { onToggleGrid() }
            }}
            aria-label="Cuadrícula"
          >
            <Grid size={22} strokeWidth={1.5} />
            <span className="toolbar-tooltip">Cuadrícula</span>
          </button>

          {gridOpen && (
            <div className="toolbar-grid-popover">
              <div className="toolbar-grid-row">
                <label className="toolbar-grid-label">Columnas</label>
                <input
                  className="toolbar-grid-number"
                  type="number" min={1} max={50}
                  value={gridSettings.cols}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, cols: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div className="toolbar-grid-row">
                <label className="toolbar-grid-label">Filas</label>
                <input
                  className="toolbar-grid-number"
                  type="number" min={1} max={50}
                  value={gridSettings.rows}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, rows: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div className="toolbar-grid-row">
                <label className="toolbar-grid-label">Color</label>
                <button
                  className="toolbar-paint-swatch toolbar-grid-swatch"
                  style={{ background: gridSettings.color }}
                  onClick={() => gridColorRef.current?.click()}
                  aria-label="Elegir color"
                />
                <input
                  ref={gridColorRef}
                  type="color"
                  value={gridSettings.color}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, color: e.target.value })}
                  className="toolbar-paint-input"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
              <div className="toolbar-grid-row toolbar-grid-row--slider">
                <label className="toolbar-grid-label">Opacidad</label>
                <input
                  className="toolbar-grid-slider"
                  type="range" min={0} max={100}
                  value={gridSettings.opacity}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, opacity: parseInt(e.target.value) })}
                />
                <span className="toolbar-grid-pct">{gridSettings.opacity}%</span>
              </div>
              <div className="toolbar-grid-row toolbar-grid-row--thickness">
                <label className="toolbar-grid-label">Grosor</label>
                <div className="toolbar-grid-toggle">
                  <button
                    className={`toolbar-grid-toggle-btn${gridSettings.thickness === 'thin' ? ' toolbar-grid-toggle-btn--active' : ''}`}
                    onClick={() => onGridSettingsChange({ ...gridSettings, thickness: 'thin' })}
                  >Fina</button>
                  <button
                    className={`toolbar-grid-toggle-btn${gridSettings.thickness === 'normal' ? ' toolbar-grid-toggle-btn--active' : ''}`}
                    onClick={() => onGridSettingsChange({ ...gridSettings, thickness: 'normal' })}
                  >Normal</button>
                </div>
              </div>
            </div>
          )}
        </div>

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
