'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import './PageStrip.css'

interface PageStripProps {
  currentSpread: number
  totalContentSpreads: number
  onSpreadSelect: (index: number) => void
  onAddSpread: () => void
  onDeleteSpread?: (index: number) => void
  onLayoutDrop?: (spreadIndex: number, layoutId: string) => void
}

type PageInfo  = { label: string; special: boolean }
type SpreadDef = { index: number; left: PageInfo; right: PageInfo }

function buildSpreads(total: number): SpreadDef[] {
  const lastLeftNum = total * 2 + 2   // e.g. 13*2+2 = 28

  const items: SpreadDef[] = [
    { index: 0, left:  { label: 'Contra', special: true },
                right: { label: 'Tapa',   special: true } },
    { index: 1, left:  { label: 'Inside', special: true },
                right: { label: '01',     special: false } },
  ]

  for (let i = 0; i < total; i++) {
    const si    = i + 2
    const left  = 2 * (si - 1)
    const right = left + 1
    items.push({
      index: si,
      left:  { label: String(left).padStart(2, '0'),  special: false },
      right: { label: String(right).padStart(2, '0'), special: false },
    })
  }

  items.push({
    index: total + 2,
    left:  { label: String(lastLeftNum).padStart(2, '0'), special: false },
    right: { label: 'Outside', special: true },
  })

  return items
}

export default function PageStrip({
  currentSpread,
  totalContentSpreads,
  onSpreadSelect,
  onAddSpread,
  onDeleteSpread,
  onLayoutDrop,
}: PageStripProps) {
  const spreads    = buildSpreads(totalContentSpreads)
  const activeRef  = useRef<HTMLDivElement>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex]       = useState<number | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'nearest', behavior: 'smooth', block: 'nearest',
    })
  }, [currentSpread])

  // A spread is variable (deletable) if it's not one of the 3 fixed ones
  const isVariable = (spreadIndex: number) =>
    spreadIndex >= 2 && spreadIndex <= totalContentSpreads + 1

  const canDelete = totalContentSpreads > 13

  // ── Drag handlers for layout drop ─────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent, spreadIndex: number) => {
    const layoutId = e.dataTransfer.types.includes('application/zeika-layout')
    if (!layoutId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverIndex(spreadIndex)
  }

  const handleDragLeave = () => setDragOverIndex(null)

  const handleDrop = (e: React.DragEvent, spreadIndex: number) => {
    setDragOverIndex(null)
    const layoutId = e.dataTransfer.getData('application/zeika-layout')
    if (!layoutId || !onLayoutDrop) return
    e.preventDefault()
    onLayoutDrop(spreadIndex, layoutId)
  }

  return (
    <div className="page-strip">

      {/* Fixed left section — always visible */}
      <div className="page-strip-fixed">
        <button
          className="page-strip-add"
          onClick={onAddSpread}
          title="Agregar 2 páginas"
          aria-label="Agregar páginas"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Scrollable spreads */}
      <div className="page-strip-scroll">
        {spreads.map((spread) => {
          const active   = spread.index === currentSpread
          const variable = isVariable(spread.index)
          const dragOver = dragOverIndex === spread.index

          return (
            <div
              key={spread.index}
              ref={active ? activeRef : null}
              className={[
                'page-strip-spread',
                active   ? 'page-strip-spread--active'   : '',
                dragOver ? 'page-strip-spread--drag-over' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSpreadSelect(spread.index)}
              onMouseEnter={() => setHoverIndex(spread.index)}
              onMouseLeave={() => setHoverIndex(null)}
              onDragOver={(e) => handleDragOver(e, spread.index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, spread.index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSpreadSelect(spread.index)}
              aria-current={active ? 'true' : undefined}
              aria-label={`${spread.left.label} – ${spread.right.label}`}
            >
              {/* Delete button — only for variable spreads */}
              {variable && canDelete && hoverIndex === spread.index && onDeleteSpread && (
                <button
                  className="page-strip-delete"
                  onClick={(e) => { e.stopPropagation(); onDeleteSpread(spread.index) }}
                  aria-label="Eliminar spread"
                  title="Eliminar"
                >
                  <X size={8} strokeWidth={2.5} />
                </button>
              )}

              {/* Left page */}
              <div className="page-strip-page-wrap">
                <span className={`page-strip-page-label${spread.left.special ? ' page-strip-page-label--special' : ''}`}>
                  {spread.left.label}
                </span>
                <div className="page-strip-page-rect" />
              </div>

              {/* Right page */}
              <div className="page-strip-page-wrap page-strip-page-wrap--right">
                <span className={`page-strip-page-label${spread.right.special ? ' page-strip-page-label--special' : ''}`}>
                  {spread.right.label}
                </span>
                <div className="page-strip-page-rect" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
