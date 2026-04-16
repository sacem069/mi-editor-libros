'use client'

import { useState } from 'react'
import { LAYOUTS, getLayoutsByCantidad } from '../../config/layouts'
import type { Layout } from '../../config/layouts'
import './LayoutPanel.css'

export type { Layout }

interface LayoutPanelProps {
  selectedPhotoCount: number
  selectedLayoutId: string | null
  onPhotoCountChange: (count: number) => void
  onLayoutSelect: (layout: Layout) => void
}

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
}: LayoutPanelProps) {
  const [displayFilter, setDisplayFilter] = useState<number | 'all'>(selectedPhotoCount)

  const layouts = displayFilter === 'all' ? LAYOUTS : getLayoutsByCantidad(displayFilter)

  return (
    <aside className="layout-panel">
      {/* ── Header ── */}
      <div className="layout-panel-header">
        <span className="layout-panel-title">Layouts</span>
        <div className="layout-panel-bar" />
      </div>

      {/* ── Selector de cantidad de fotos ── */}
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

      {/* ── Todos ── */}
      <div className="layout-all-row">
        <button
          className={`layout-all-btn${displayFilter === 'all' ? ' layout-all-btn--active' : ''}`}
          onClick={() => setDisplayFilter('all')}
        >
          todos
        </button>
      </div>

      {/* ── Grid de layouts ── */}
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
    </aside>
  )
}
