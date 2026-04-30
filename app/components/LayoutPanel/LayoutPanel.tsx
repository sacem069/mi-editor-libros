'use client'

import { useState } from 'react'
import { LAYOUTS, getLayoutsByCantidad } from '../../config/layouts'
import type { Layout } from '../../config/layouts'
import { useLang } from '../../context/LanguageContext'
import './LayoutPanel.css'

export type { Layout }

interface LayoutPanelProps {
  selectedPhotoCount: number
  selectedLayoutId: string | null
  onPhotoCountChange: (count: number) => void
  onLayoutSelect: (layout: Layout) => void
  onAddTexture?: (url: string) => void
}

const TEXTURES = Array.from({ length: 9 }, (_, i) => `/text${i + 1}.jpg`)

type MainTab = 'layouts' | 'fondos' | 'deco'
type FondosSubTab = 'texturas' | 'fondos'
type DecoSubTab = 'stickers' | 'graficos'

const PHOTO_COUNTS = [1, 2, 3, 4, 5]

function LayoutThumbnail({ layout }: { layout: Layout }) {
  return (
    <div className="layout-thumb-aspect">
      <div className="layout-thumb-inner">
        {layout.frames.map((frame, i) => (
          <div
            key={i}
            className="layout-thumb-frame"
            style={{
              left:   `${(frame.x * 100).toFixed(4)}%`,
              top:    `${(frame.y * 100).toFixed(4)}%`,
              width:  `${(frame.w * 100).toFixed(4)}%`,
              height: `${(frame.h * 100).toFixed(4)}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function LayoutPanel({
  selectedPhotoCount,
  selectedLayoutId,
  onPhotoCountChange,
  onLayoutSelect,
  onAddTexture,
}: LayoutPanelProps) {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState<MainTab>('layouts')
  const [fondosSubTab, setFondosSubTab] = useState<FondosSubTab>('texturas')
  const [decoSubTab, setDecoSubTab] = useState<DecoSubTab>('stickers')
  const [displayFilter, setDisplayFilter] = useState<number | 'all'>(selectedPhotoCount)

  const layouts = displayFilter === 'all' ? LAYOUTS : getLayoutsByCantidad(displayFilter)

  return (
    <aside className="layout-panel">

      {/* ── Main tabs ── */}
      <div className="panel-tabs">
        <button
          className={`panel-tab${activeTab === 'layouts' ? ' panel-tab--active' : ''}`}
          onClick={() => setActiveTab('layouts')}
        >
          Layouts
        </button>
        <button
          className={`panel-tab${activeTab === 'fondos' ? ' panel-tab--active' : ''}`}
          onClick={() => setActiveTab('fondos')}
        >
          Fondos
        </button>
        <button
          className={`panel-tab${activeTab === 'deco' ? ' panel-tab--active' : ''}`}
          onClick={() => setActiveTab('deco')}
        >
          Deco
        </button>
      </div>

      {/* ── Layouts tab ── */}
      {activeTab === 'layouts' && (
        <>
          <div className="layout-count-selector">
            {PHOTO_COUNTS.map((count) => (
              <button
                key={count}
                className={`layout-count-btn${displayFilter === count ? ' layout-count-btn--active' : ''}`}
                onClick={() => { onPhotoCountChange(count); setDisplayFilter(count) }}
                aria-label={`${count} foto${count > 1 ? 's' : ''}`}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="layout-all-row">
            <button
              className={`layout-all-btn${displayFilter === 'all' ? ' layout-all-btn--active' : ''}`}
              onClick={() => setDisplayFilter('all')}
            >
              {t.all}
            </button>
          </div>
          <div className="layout-grid">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                className={`layout-thumb${selectedLayoutId === layout.id ? ' layout-thumb--selected' : ''}`}
                onClick={() => onLayoutSelect(layout)}
                aria-label={layout.nombre}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/zeika-layout', layout.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
              >
                <LayoutThumbnail layout={layout} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Fondos tab ── */}
      {activeTab === 'fondos' && (
        <>
          <div className="panel-subtabs">
            <button
              className={`panel-subtab${fondosSubTab === 'texturas' ? ' panel-subtab--active' : ''}`}
              onClick={() => setFondosSubTab('texturas')}
            >
              Texturas
            </button>
            <button
              className={`panel-subtab${fondosSubTab === 'fondos' ? ' panel-subtab--active' : ''}`}
              onClick={() => setFondosSubTab('fondos')}
            >
              Fondos
            </button>
          </div>
          <div className="panel-content-grid">
            {fondosSubTab === 'texturas' ? (
              <div className="texture-grid">
                {TEXTURES.map((url) => (
                  <div
                    key={url}
                    className="texture-thumb"
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={() => onAddTexture?.(url)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddTexture?.(url)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', url)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <img src={url} alt="" className="texture-img" draggable={false} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-empty">Próximamente</p>
            )}
          </div>
        </>
      )}

      {/* ── Deco tab ── */}
      {activeTab === 'deco' && (
        <>
          <div className="panel-subtabs">
            <button
              className={`panel-subtab${decoSubTab === 'stickers' ? ' panel-subtab--active' : ''}`}
              onClick={() => setDecoSubTab('stickers')}
            >
              Stickers
            </button>
            <button
              className={`panel-subtab${decoSubTab === 'graficos' ? ' panel-subtab--active' : ''}`}
              onClick={() => setDecoSubTab('graficos')}
            >
              Gráficos
            </button>
          </div>
          <div className="panel-content-grid">
            <p className="panel-empty">Próximamente</p>
          </div>
        </>
      )}

    </aside>
  )
}
