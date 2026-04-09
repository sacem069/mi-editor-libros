'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { CirclePlus, ListFilter, Check } from 'lucide-react'
import './PhotoPanel.css'

export type Photo = {
  id:     string
  src:    string   // Cloudinary URL
  name:   string
  width:  number
  height: number
}

interface PhotoPanelProps {
  photos:       Photo[]
  usedPhotoIds: Set<string>
  onUpload:     (photos: Photo[]) => void
  onPhotoClick: (photo: Photo) => void
}

type SortBy     = 'fecha' | 'nombre'
type ShowFilter = 'todas' | 'usadas' | 'sin-usar'

export default function PhotoPanel({
  photos,
  usedPhotoIds,
  onUpload,
  onPhotoClick,
}: PhotoPanelProps) {
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const filterWrapRef = useRef<HTMLDivElement>(null)

  const [filterOpen,    setFilterOpen]    = useState(false)
  const [sortBy,        setSortBy]        = useState<SortBy>('fecha')
  const [showFilter,    setShowFilter]    = useState<ShowFilter>('todas')
  const [uploadingIds,  setUploadingIds]  = useState<Set<string>>(new Set())

  // ── Close filter panel on outside click ──────────────────────────────────

  useEffect(() => {
    if (!filterOpen) return
    const handleClick = (e: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return
      e.target.value = ''

      // Create placeholder IDs so we can show spinners immediately
      const placeholders = files.map((file) => ({
        tempId: crypto.randomUUID(),
        file,
      }))

      setUploadingIds((prev) => {
        const next = new Set(prev)
        placeholders.forEach(({ tempId }) => next.add(tempId))
        return next
      })

      const uploaded = await Promise.all(
        placeholders.map(async ({ tempId, file }) => {
          const form = new FormData()
          form.append('file', file)

          const res  = await fetch('/api/upload', { method: 'POST', body: form })
          const data = await res.json() as {
            url:      string
            publicId: string
            width:    number
            height:   number
          }

          setUploadingIds((prev) => {
            const next = new Set(prev)
            next.delete(tempId)
            return next
          })

          return {
            id:     tempId,
            src:    data.url,
            name:   file.name,
            width:  data.width,
            height: data.height,
          } satisfies Photo
        }),
      )

      onUpload(uploaded)
    },
    [onUpload],
  )

  const openFilePicker = () => fileInputRef.current?.click()

  // ── Drag start ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, photo: Photo) => {
      e.dataTransfer.setData('text/plain', photo.src)
      e.dataTransfer.setData('application/zeika-photo-id', photo.id)
      e.dataTransfer.effectAllowed = 'copy'
    },
    [],
  )

  // ── Filtered + sorted photo list ──────────────────────────────────────────

  const visiblePhotos = photos
    .filter((p) => {
      if (showFilter === 'usadas')   return usedPhotoIds.has(p.id)
      if (showFilter === 'sin-usar') return !usedPhotoIds.has(p.id)
      return true
    })
    .sort((a, b) =>
      sortBy === 'nombre' ? a.name.localeCompare(b.name) : 0,
    )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="photo-panel">
      {/* ── Acciones superiores ── */}
      <div className="photo-panel-actions">
        <button className="photo-action-btn" onClick={openFilePicker}>
          <CirclePlus size={24} strokeWidth={1.5} />
          <span>Subir fotos</span>
        </button>

        {/* Filter button + dropdown */}
        <div className="photo-filter-wrap" ref={filterWrapRef}>
          <button
            className={`photo-action-btn${filterOpen ? ' photo-action-btn--active' : ''}`}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <ListFilter size={24} strokeWidth={1.5} />
            <span>Ordenar / Filtrar</span>
          </button>

          {filterOpen && (
            <div className="photo-filter-panel">
              <p className="photo-filter-heading">Ordenar por</p>
              <div className="photo-filter-underline" />
              <button
                className={`photo-filter-option${sortBy === 'fecha' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setSortBy('fecha')}
              >
                Fecha Agregada
              </button>
              <button
                className={`photo-filter-option${sortBy === 'nombre' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setSortBy('nombre')}
              >
                Nombre
              </button>

              <p className="photo-filter-heading photo-filter-heading--spaced">Mostrar/Ocultar</p>
              <div className="photo-filter-underline" />
              <button
                className={`photo-filter-option${showFilter === 'todas' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setShowFilter('todas')}
              >
                Todas
              </button>
              <button
                className={`photo-filter-option${showFilter === 'usadas' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setShowFilter('usadas')}
              >
                Usadas
              </button>
              <button
                className={`photo-filter-option${showFilter === 'sin-usar' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setShowFilter('sin-usar')}
              >
                Sin Usar
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        className="photo-file-input"
        onChange={handleFileChange}
      />

      {/* ── Auto-crear ── */}
      <div className="photo-panel-autocreate-row">
        <button className="photo-autocreate-btn">Auto-crear</button>
      </div>

      {/* ── Contador ── */}
      <div className="photo-panel-counter">
        {photos.length} fotos
      </div>

      {/* ── Separator bar ── */}
      <div className="photo-panel-bar" />

      {/* ── Grid de fotos ── */}
      <div className="photo-grid">
        {/* Uploading placeholders */}
        {Array.from(uploadingIds).map((id) => (
          <div key={id} className="photo-thumb photo-thumb--uploading">
            <div className="photo-thumb-spinner" />
          </div>
        ))}

        {visiblePhotos.map((photo) => {
          const isUsed = usedPhotoIds.has(photo.id)
          return (
            <div
              key={photo.id}
              className="photo-thumb"
              draggable
              onDragStart={(e) => handleDragStart(e, photo)}
              onClick={() => onPhotoClick(photo)}
              title={photo.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.name} className="photo-thumb-img" />

              {isUsed && (
                <div className="photo-thumb-used" aria-label="Foto usada">
                  <Check size={10} strokeWidth={3} color="#fff" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
