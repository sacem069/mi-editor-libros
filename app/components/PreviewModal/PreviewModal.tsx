'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  MessageSquare, Pencil,
  ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { deserializePage } from '../Canvas/fabricHelpers'
import type { PageData } from '../Canvas/fabricHelpers'
import { BOOK_SIZE } from '../../config/bookSize'
import './PreviewModal.css'

type SpreadData = { left: PageData; right: PageData }

interface Props {
  spreadsData:   Record<number, SpreadData>
  totalSpreads:  number
  initialSpread: number
  onClose:       () => void
}

const PAGE_W = BOOK_SIZE.widthPx
const PAGE_H = BOOK_SIZE.heightPx

const EMPTY_PAGE: PageData = {
  background: '#ffffff',
  pageW: PAGE_W,
  pageH: PAGE_H,
  frames: [],
  texts:  [],
}

const TITLEBAR_H = 50
const CONTROLS_H = 64

export default function PreviewModal({
  spreadsData,
  totalSpreads,
  initialSpread,
  onClose,
}: Props) {
  const [spread,      setSpread]      = useState(initialSpread)
  const [scale,       setScale]       = useState(0.5)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loading,     setLoading]     = useState(false)

  const leftEl  = useRef<HTMLCanvasElement>(null)
  const rightEl = useRef<HTMLCanvasElement>(null)
  const leftFc  = useRef<fabric.Canvas | null>(null)
  const rightFc = useRef<fabric.Canvas | null>(null)

  // ── Scale ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const compute = () => {
      const maxH = Math.min(
        window.innerHeight * 0.72,
        window.innerHeight - TITLEBAR_H - CONTROLS_H - 32,
      )
      const maxW = window.innerWidth * 0.78
      const s    = Math.min(maxH / PAGE_H, maxW / (PAGE_W * 2))
      setScale(Math.max(s, 0.15))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // ── Init Fabric canvases once — never remounted ────────────────────────────
  useEffect(() => {
    if (!leftEl.current || !rightEl.current) return
    leftFc.current  = new fabric.Canvas(leftEl.current,  { selection: false, renderOnAddRemove: false })
    rightFc.current = new fabric.Canvas(rightEl.current, { selection: false, renderOnAddRemove: false })
    setCanvasReady(true)
    return () => {
      leftFc.current?.dispose()
      rightFc.current?.dispose()
      leftFc.current  = null
      rightFc.current = null
    }
  }, [])

  // ── Load spread whenever it changes ───────────────────────────────────────
  useEffect(() => {
    if (!canvasReady) return
    const lc = leftFc.current
    const rc = rightFc.current
    if (!lc || !rc) return

    let cancelled = false
    setLoading(true)

    const data  = spreadsData[spread]
    const lData = data?.left  ?? EMPTY_PAGE
    const rData = data?.right ?? EMPTY_PAGE

    const timer = setTimeout(() => {
      if (cancelled) return
      Promise.all([
        deserializePage(lc, lData, PAGE_W, PAGE_H),
        deserializePage(rc, rData, PAGE_W, PAGE_H),
      ]).then(() => {
        if (cancelled) return
        for (const fc of [lc, rc]) {
          fc.getObjects().forEach((o) =>
            o.set({ selectable: false, evented: false, hoverCursor: 'default' }),
          )
          fc.renderAll()
        }
        if (!cancelled) setLoading(false)
      }).catch(() => { if (!cancelled) setLoading(false) })
    }, 100)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [spread, spreadsData, canvasReady])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const go = useCallback((delta: number) => {
    const newS = Math.max(0, Math.min(totalSpreads - 1, spread + delta))
    if (newS === spread) return
    setSpread(newS)
  }, [spread, totalSpreads])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { onClose(); return }
      if (e.key === 'ArrowLeft')  go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const canvasW = Math.round(PAGE_W * scale)
  const canvasH = Math.round(PAGE_H * scale)
  const spineW  = Math.round(canvasW * 0.11)
  const pageL   = spread * 2 + 1
  const pageR   = spread * 2 + 2

  return (
    <div className="preview-overlay">

      {/* ── Title bar ── */}
      <div className="preview-titlebar">
        <span className="preview-title">Previsualización 2D</span>
        <div className="preview-titlebar-actions">
          <button className="preview-icon-btn" disabled>
            <MessageSquare size={18} strokeWidth={1.5} />
            <span>Comentar</span>
          </button>
          <button className="preview-icon-btn" disabled>
            <Pencil size={18} strokeWidth={1.5} />
            <span>Dibujar</span>
          </button>
        </div>
      </div>

      {/* ── Stage ── */}
      <div className="preview-stage">
        <div className="preview-spread" style={{ width: canvasW * 2 }}>

          {/* Left page */}
          <div className="preview-page-wrap" style={{ width: canvasW, height: canvasH }}>
            <div className="preview-page-inner" style={{ transform: `scale(${scale})` }}>
              <canvas ref={leftEl} width={PAGE_W} height={PAGE_H} />
            </div>
          </div>

          {/* Right page */}
          <div className="preview-page-wrap" style={{ width: canvasW, height: canvasH }}>
            <div className="preview-page-inner" style={{ transform: `scale(${scale})` }}>
              <canvas ref={rightEl} width={PAGE_W} height={PAGE_H} />
            </div>
          </div>

          {/* Spine binding shadow — absolute, centered on the seam */}
          <div className="preview-spine" style={{ width: spineW, height: canvasH }} />

        </div>

        {loading && <div className="preview-loading" />}
      </div>

      {/* ── Bottom controls ── */}
      <div className="preview-controls">
        <div className="preview-nav">
          <button
            className="preview-nav-btn"
            onClick={() => go(-totalSpreads)}
            disabled={spread === 0}
            title="Primera página"
          >
            <ChevronsLeft size={15} strokeWidth={1.5} />
          </button>
          <button
            className="preview-nav-btn"
            onClick={() => go(-1)}
            disabled={spread === 0}
            title="Anterior"
          >
            <ChevronLeft size={15} strokeWidth={1.5} />
          </button>
          <span className="preview-page-label">Página {pageL} — {pageR}</span>
          <button
            className="preview-nav-btn"
            onClick={() => go(1)}
            disabled={spread === totalSpreads - 1}
            title="Siguiente"
          >
            <ChevronRight size={15} strokeWidth={1.5} />
          </button>
          <button
            className="preview-nav-btn"
            onClick={() => go(totalSpreads)}
            disabled={spread === totalSpreads - 1}
            title="Última página"
          >
            <ChevronsRight size={15} strokeWidth={1.5} />
          </button>
        </div>
        <button className="preview-close-btn" onClick={onClose}>Cerrar</button>
      </div>

    </div>
  )
}
