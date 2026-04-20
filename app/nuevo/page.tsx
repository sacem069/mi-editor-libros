'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Monitor } from 'lucide-react'
import './nuevo.css'

// ── Types ────────────────────────────────────────────────────────────────────

type Photo = {
  id:     string
  src:    string
  name:   string
  width:  number
  height: number
}

interface BookSize {
  id:    string
  nombre: string
  dims:   string
  price:  string
  img:    string
}

interface BookDetails {
  nombre:    string
  disenadora: string
  tapa:       string
  acabado:    string
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BOOK_SIZES: BookSize[] = [
  { id: 'chico',    nombre: 'CHICO HORIZONTAL',  dims: '21 x 14,8 CM', price: '$75.500',  img: '/chico.png'    },
  { id: 'mediano',  nombre: 'MEDIANO HORIZONTAL', dims: '28 x 21,6 CM', price: '$81.500',  img: '/mediano.png'  },
  { id: 'grande',   nombre: 'GRANDE HORIZONTAL',  dims: '41 x 29 CM',   price: '$100.000', img: '/grande.png'   },
  { id: 'vertical', nombre: 'VERTICAL',           dims: '21,6 x 28 CM', price: '$81.500',  img: '/vertical.png' },
  { id: 'cuadrado', nombre: 'CUADRADO',           dims: '29 x 29 CM',   price: '$97.000',  img: '/cuadrado.png' },
]

// ── Upload helper (mirrors PhotoPanel logic) ──────────────────────────────────

async function uploadFile(file: File): Promise<Photo> {
  const form = new FormData()
  form.append('file', file)
  const res  = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json() as { url?: string; width?: number; height?: number; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed')
  return { id: crypto.randomUUID(), src: data.url, name: file.name, width: data.width ?? 0, height: data.height ?? 0 }
}

// ── Shared Topbar ─────────────────────────────────────────────────────────────

function NuevoTopbar() {
  return (
    <header className="nuevo-topbar">
      <Image src="/LogoZeika.png" alt="Zeika" width={36} height={36} />
      <span className="nuevo-topbar-spacer" />
      <span className="nuevo-topbar-username">MAIKA</span>
      <div className="nuevo-avatar">M</div>
    </header>
  )
}

// ── Shared Footer ─────────────────────────────────────────────────────────────

interface FooterProps {
  onCancel:     () => void
  onNext:       () => void
  nextDisabled: boolean
  nextLabel?:   string
}

function NuevoFooter({ onCancel, onNext, nextDisabled, nextLabel = 'SIGUIENTE' }: FooterProps) {
  return (
    <footer className="nuevo-footer">
      <button className="nuevo-btn nuevo-btn--secondary" onClick={onCancel}>ATRÁS</button>
      <button className="nuevo-btn nuevo-btn--primary" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </button>
    </footer>
  )
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="nuevo-body">
      <h1 className="nuevo-step-title">1. ELEGÍ TU TAMAÑO</h1>
      <div className="nuevo-size-cards">
        {BOOK_SIZES.map((book) => (
          <button
            key={book.id}
            className={`nuevo-size-card${selected === book.id ? ' nuevo-size-card--selected' : ''}`}
            onClick={() => onSelect(book.id)}
          >
            <div className="nuevo-size-card-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={book.img} alt={book.nombre} className={`nuevo-size-card-img${book.id === 'vertical' ? ' nuevo-size-card-img--vertical' : ''}`} />
            </div>
            <div className="nuevo-size-card-info">
              <div className="nuevo-size-card-name-row">
                <span className="nuevo-size-card-name">{book.nombre}</span>
                <span className="nuevo-size-card-dims">{book.dims}</span>
              </div>
              <div className="nuevo-size-card-divider" />
              <span className="nuevo-size-card-price">{book.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

interface Step2Props {
  selectedBook: BookSize | null
  details:      BookDetails
  onChange:     (k: keyof BookDetails, v: string) => void
}

function Step2({ selectedBook, details, onChange }: Step2Props) {
  return (
    <div className="nuevo-body">
      <h1 className="nuevo-step-title">2. DETALLES DEL PEDIDO</h1>
      <div className="nuevo-details-layout">
        {/* Form */}
        <div className="nuevo-form">
          <div className="nuevo-field">
            <label className="nuevo-label">NOMBRE</label>
            <input
              className="nuevo-input"
              type="text"
              value={details.nombre}
              onChange={(e) => onChange('nombre', e.target.value)}
              placeholder=""
            />
          </div>
          <div className="nuevo-field">
            <label className="nuevo-label">DISEÑADORA</label>
            <select className="nuevo-select" value={details.disenadora} onChange={(e) => onChange('disenadora', e.target.value)}>
              <option value="Maika">Maika</option>
              <option value="Vicky">Vicky</option>
              <option value="Jose">Jose</option>
            </select>
          </div>
          <div className="nuevo-field">
            <label className="nuevo-label">TAPA</label>
            <select className="nuevo-select" value={details.tapa} onChange={(e) => onChange('tapa', e.target.value)}>
              <option value="Tapa Dura">Tapa Dura</option>
              <option value="Tapa Blanda">Tapa Blanda</option>
            </select>
          </div>
          <div className="nuevo-field">
            <label className="nuevo-label">ACABADO DE TAPA</label>
            <select className="nuevo-select" value={details.acabado} onChange={(e) => onChange('acabado', e.target.value)}>
              <option value="Laminado Mate">Laminado Mate</option>
              <option value="Laminado Brillo">Laminado Brillo</option>
            </select>
          </div>
        </div>

        {/* Preview — same structure as Step 1 cards */}
        <div className="nuevo-preview-wrap">
          {selectedBook && (
            <div className="nuevo-preview-card">
              <div className="nuevo-size-card-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedBook.img}
                  alt={selectedBook.nombre}
                  className={`nuevo-size-card-img${selectedBook.id === 'vertical' ? ' nuevo-size-card-img--vertical' : ''}`}
                />
              </div>
              <div className="nuevo-size-card-info">
                <div className="nuevo-size-card-name-row">
                  <span className="nuevo-size-card-name">{selectedBook.nombre}</span>
                  <span className="nuevo-size-card-dims">{selectedBook.dims}</span>
                </div>
                <div className="nuevo-size-card-divider" />
                <span className="nuevo-size-card-price">{selectedBook.price}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

interface Step3Props {
  photos:       Photo[]
  uploading:    boolean
  onUpload:     (files: FileList) => void
}

function Step3({ photos, uploading, onUpload }: Step3Props) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const moreRef     = useRef<HTMLInputElement>(null)
  const ACCEPTED    = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onUpload(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="nuevo-body nuevo-body--photos">
      <h1 className="nuevo-step-title">3. CARGÁ TUS FOTOS</h1>

      {photos.length === 0 && !uploading ? (
        <div className="nuevo-upload-empty">
          <Monitor size={52} strokeWidth={1} color="#aaa" />
          <p className="nuevo-upload-empty-text">SUBIR FOTOS DESDE COMPUTADORA</p>
          <button className="nuevo-upload-btn" onClick={() => inputRef.current?.click()}>
            SUBIR FOTOS
          </button>
        </div>
      ) : (
        <div className="nuevo-photo-grid">
          {uploading && (
            <div className="nuevo-photo-thumb nuevo-photo-thumb--uploading">
              <div className="nuevo-photo-spinner" />
            </div>
          )}
          {photos.map((p) => (
            <div key={p.id} className="nuevo-photo-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.name} className="nuevo-photo-thumb-img" />
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="nuevo-file-input" onChange={handleChange} />
      <input ref={moreRef}  type="file" accept={ACCEPTED} multiple className="nuevo-file-input" onChange={handleChange} />

      {photos.length > 0 && (
        <button className="nuevo-cargar-mas" onClick={() => moreRef.current?.click()}>
          <Monitor size={18} strokeWidth={1.5} />
          Cargar más
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NuevoPage() {
  const router = useRouter()
  const [step,         setStep]         = useState(1)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [details,      setDetails]      = useState<BookDetails>({
    nombre:    '',
    disenadora: 'Maika',
    tapa:       'Tapa Dura',
    acabado:    'Laminado Mate',
  })
  const [photos,    setPhotos]    = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)

  const selectedBook = BOOK_SIZES.find((b) => b.id === selectedSize) ?? null

  const handleDetailChange = (k: keyof BookDetails, v: string) => setDetails((d) => ({ ...d, [k]: v }))

  const handleUpload = useCallback(async (files: FileList) => {
    const arr = Array.from(files)
    setUploading(true)
    const results = await Promise.allSettled(arr.map(uploadFile))
    const uploaded: Photo[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') uploaded.push(r.value)
    }
    setPhotos((prev) => [...prev, ...uploaded])
    setUploading(false)
  }, [])

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      sessionStorage.setItem('zeika_photos', JSON.stringify(photos))
      router.push('/editor')
    }
  }

  const handleCancel = () => {
    if (step > 1) setStep(step - 1)
    else router.push('/dashboard')
  }

  const nextDisabled =
    (step === 1 && !selectedSize) ||
    (step === 3 && photos.length === 0 && !uploading)

  const nextLabel = step === 3 ? 'ABRIR EDITOR' : 'SIGUIENTE'

  return (
    <div className="nuevo-root">
      <NuevoTopbar />

      {step === 1 && (
        <Step1 selected={selectedSize} onSelect={setSelectedSize} />
      )}
      {step === 2 && (
        <Step2 selectedBook={selectedBook} details={details} onChange={handleDetailChange} />
      )}
      {step === 3 && (
        <Step3 photos={photos} uploading={uploading} onUpload={handleUpload} />
      )}

      <NuevoFooter
        onCancel={handleCancel}
        onNext={handleNext}
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
      />
    </div>
  )
}
