'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  CirclePlus, CircleMinus,
} from 'lucide-react'
import './TextModal.css'

// ─── Font options ────────────────────────────────────────────────────────────

export const TEXT_FONTS = [
  { label: 'Amandine',              value: 'amandine' },
  { label: 'Costumed Hero',         value: 'CostumedHero' },
  { label: 'Overused Grotesk',      value: 'OverusedGrotesk' },
  { label: 'Helvetica Neue',        value: 'helvetica-neue-lt-pro' },
  { label: 'Times New Roman',       value: 'Times New Roman' },
  { label: 'Adobe Garamond Pro',    value: 'adobe-garamond-pro' },
  { label: 'Century Old Style',     value: 'century-old-style-std' },
  { label: 'Geller Headline',       value: 'geller-headline' },
  { label: 'Handwriting Tiffany',   value: 'adobe-handwriting-tiffany' },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextOpts {
  text:       string
  fontFamily: string
  bold:       boolean
  underline:  boolean
  textAlign:  string
  fontSize:   number
  fill:       string
}

interface Props {
  initialText:      string
  initialFont:      string
  initialBold:      boolean
  initialUnderline: boolean
  initialAlign:     string
  initialSize:      number
  initialColor:     string
  onConfirm: (opts: TextOpts) => void
  onCancel:  () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TextModal({
  initialText, initialFont, initialBold, initialUnderline,
  initialAlign, initialSize, initialColor,
  onConfirm, onCancel,
}: Props) {
  const [text,       setText]       = useState(initialText)
  const [fontFamily, setFontFamily] = useState(initialFont || TEXT_FONTS[0].value)
  const [bold,       setBold]       = useState(initialBold)
  const [underline,  setUnderline]  = useState(initialUnderline)
  const [textAlign,  setTextAlign]  = useState(initialAlign || 'left')
  const [fontSize,   setFontSize]   = useState(initialSize  || 24)
  const [fill,       setFill]       = useState(initialColor || '#191919')

  const colorInputRef = useRef<HTMLInputElement>(null)
  const textareaRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const alignments = [
    { value: 'left',    Icon: AlignLeft,    label: 'Izquierda' },
    { value: 'center',  Icon: AlignCenter,  label: 'Centro' },
    { value: 'right',   Icon: AlignRight,   label: 'Derecha' },
    { value: 'justify', Icon: AlignJustify, label: 'Justificado' },
  ] as const

  return (
    <div className="tm-overlay" onClick={onCancel}>
      <div className="tm" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="tm-header">
          <span className="tm-title">Ingresa tu texto acá:</span>
          <button className="tm-close" onClick={onCancel} aria-label="Cerrar">
            <X size={13} strokeWidth={1.8} />
          </button>
        </div>

        <div className="tm-rule" />

        {/* Toolbar */}
        <div className="tm-toolbar">

          {/* Font picker */}
          <select
            className="tm-font-select"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
          >
            {TEXT_FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <div className="tm-sep" />

          {/* B / U */}
          <button
            className={`tm-fmt${bold ? ' tm-fmt--on' : ''}`}
            onClick={() => setBold((v) => !v)}
            aria-label="Negrita"
          >
            <b>B</b>
          </button>
          <button
            className={`tm-fmt${underline ? ' tm-fmt--on' : ''}`}
            onClick={() => setUnderline((v) => !v)}
            aria-label="Subrayado"
          >
            <u>U</u>
          </button>

          <div className="tm-sep" />

          {/* Alignment */}
          {alignments.map(({ value, Icon, label }) => (
            <button
              key={value}
              className={`tm-fmt${textAlign === value ? ' tm-fmt--on' : ''}`}
              onClick={() => setTextAlign(value)}
              aria-label={label}
            >
              <Icon size={11} strokeWidth={1.5} />
            </button>
          ))}

          <div className="tm-sep" />

          {/* Font size */}
          <button
            className="tm-fmt"
            onClick={() => setFontSize((v) => Math.max(6, v - 1))}
            aria-label="Reducir tamaño"
          >
            <CircleMinus size={11} strokeWidth={1.5} />
          </button>
          <span className="tm-size">{fontSize}</span>
          <button
            className="tm-fmt"
            onClick={() => setFontSize((v) => Math.min(200, v + 1))}
            aria-label="Aumentar tamaño"
          >
            <CirclePlus size={11} strokeWidth={1.5} />
          </button>

          <div className="tm-sep" />

          {/* Color */}
          <span className="tm-color-label">Seleccione color</span>
          <button
            className="tm-color-swatch"
            style={{ background: fill }}
            onClick={() => colorInputRef.current?.click()}
            aria-label="Color de texto"
          />
          <input
            ref={colorInputRef}
            type="color"
            value={fill}
            onChange={(e) => setFill(e.target.value)}
            className="tm-color-input"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        <div className="tm-rule" />

        {/* Textarea — live preview of formatting */}
        <textarea
          ref={textareaRef}
          className="tm-body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu texto..."
          style={{
            fontFamily:     fontFamily,
            fontWeight:     bold ? 'bold' : 'normal',
            textDecoration: underline ? 'underline' : 'none',
            textAlign:      textAlign as React.CSSProperties['textAlign'],
            fontSize:       `${Math.min(Math.max(fontSize, 10), 36)}px`,
            color:          fill,
          }}
        />

        {/* Footer */}
        <div className="tm-footer">
          <button className="tm-action" onClick={onCancel}>Cancelar</button>
          <button
            className="tm-action tm-action--ok"
            onClick={() => onConfirm({ text, fontFamily, bold, underline, textAlign, fontSize, fill })}
          >
            OK
          </button>
        </div>

      </div>
    </div>
  )
}
