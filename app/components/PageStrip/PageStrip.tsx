'use client'

import { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import './PageStrip.css'

interface PageStripProps {
  currentSpread: number
  totalContentSpreads: number
  onSpreadSelect: (index: number) => void
  onAddSpread: () => void
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
}: PageStripProps) {
  const spreads   = buildSpreads(totalContentSpreads)
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'nearest', behavior: 'smooth', block: 'nearest',
    })
  }, [currentSpread])

  return (
    <div className="page-strip">
      <div className="page-strip-scroll">

        {spreads.map((spread) => {
          const active = spread.index === currentSpread
          return (
            <div
              key={spread.index}
              ref={active ? activeRef : null}
              className={`page-strip-spread${active ? ' page-strip-spread--active' : ''}`}
              onClick={() => onSpreadSelect(spread.index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSpreadSelect(spread.index)}
              aria-current={active ? 'true' : undefined}
              aria-label={`${spread.left.label} – ${spread.right.label}`}
            >
              {/* Left page */}
              <div className="page-strip-page-wrap">
                <div className="page-strip-page-rect" />
                <span className={`page-strip-page-label${spread.left.special ? ' page-strip-page-label--special' : ''}`}>
                  {spread.left.label}
                </span>
              </div>

              {/* Right page */}
              <div className="page-strip-page-wrap">
                <div className="page-strip-page-rect" />
                <span className={`page-strip-page-label${spread.right.special ? ' page-strip-page-label--special' : ''}`}>
                  {spread.right.label}
                </span>
              </div>
            </div>
          )
        })}

        {/* Add spread */}
        <button
          className="page-strip-add"
          onClick={onAddSpread}
          title="Agregar 2 páginas"
          aria-label="Agregar páginas"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>

      </div>
    </div>
  )
}
