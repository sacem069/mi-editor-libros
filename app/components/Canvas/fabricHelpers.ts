import * as fabric from 'fabric'
import type { Frame, Layout } from '../../config/layouts'

// ─── Tipos internos ─────────────────────────────────────────────────────────

type FrameData = {
  type: 'frame'
  isEmpty: boolean
  frameX: number
  frameY: number
  frameW: number
  frameH: number
}

type TextData = {
  type: 'text'
}

type FabricObjectWithData = fabric.FabricObject & { data: FrameData | TextData }

// ─── Utilidades ─────────────────────────────────────────────────────────────

function pctToPx(pct: number, total: number): number {
  return (pct / 100) * total
}

function isFrameObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'frame'
}

function isTextObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'text'
}

// ─── 1. createEmptyFrame ────────────────────────────────────────────────────

export function createEmptyFrame(
  canvas: fabric.Canvas,
  frame: Frame,
  pageW: number,
  pageH: number,
): fabric.Rect {
  const frameX = pctToPx(frame.x, pageW)
  const frameY = pctToPx(frame.y, pageH)
  const frameW = pctToPx(frame.w, pageW)
  const frameH = pctToPx(frame.h, pageH)

  const rect = new fabric.Rect({
    left:    frameX,
    top:     frameY,
    width:   frameW,
    height:  frameH,
    originX: 'left',   // explicit: left/top are the top-left corner
    originY: 'top',
    fill:         '#F0EFEB',
    stroke:       '#528ED6',
    strokeWidth:  1,
    strokeDashArray: [5, 5],
    strokeUniform:   true,  // keeps stroke 1px regardless of scale
    selectable: false,
    evented:    true,
  }) as fabric.Rect & { data: FrameData }

  rect.data = {
    type: 'frame',
    isEmpty: true,
    frameX,
    frameY,
    frameW,
    frameH,
  }

  canvas.add(rect)
  return rect
}

// ─── 2. applyLayout ─────────────────────────────────────────────────────────

export function applyLayout(
  canvas: fabric.Canvas,
  layout: Layout,
  pageW: number,
  pageH: number,
): void {
  // Elimina solo los frames (preserva textos y otros objetos)
  const existingFrames = canvas.getObjects().filter(isFrameObj)
  canvas.remove(...existingFrames)

  for (const frame of layout.frames) {
    createEmptyFrame(canvas, frame, pageW, pageH)
  }

  canvas.renderAll()
}

// ─── 3. dropPhotoOnFrame ────────────────────────────────────────────────────

export async function dropPhotoOnFrame(
  canvas: fabric.Canvas,
  frameObj: fabric.Rect,
  photoSrc: string,
  pageW: number,
  pageH: number,
): Promise<void> {
  const data = (frameObj as fabric.Rect & { data: FrameData }).data
  const { frameX, frameY, frameW, frameH } = data

  const img = await fabric.FabricImage.fromURL(photoSrc, {
    crossOrigin: 'anonymous',
  })

  // object-fit: cover — escala mínima para cubrir el frame completamente
  const scaleX = frameW / (img.width ?? 1)
  const scaleY = frameH / (img.height ?? 1)
  const scale = Math.max(scaleX, scaleY)

  img.set({
    left: frameX + frameW / 2,
    top: frameY + frameH / 2,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
  })

  // ClipPath en coordenadas absolutas del canvas
  const clipRect = new fabric.Rect({
    left: frameX,
    top: frameY,
    width: frameW,
    height: frameH,
    absolutePositioned: true,
  })
  img.clipPath = clipRect

  ;(img as unknown as FabricObjectWithData).data = {
    type: 'frame',
    isEmpty: false,
    frameX,
    frameY,
    frameW,
    frameH,
  }

  canvas.remove(frameObj)
  canvas.add(img)
  canvas.renderAll()
}

// ─── 4. findFrameAtPoint ────────────────────────────────────────────────────

export function findFrameAtPoint(
  canvas: fabric.Canvas,
  x: number,
  y: number,
): fabric.Rect | null {
  const emptyFrames = canvas.getObjects().filter((obj) => {
    const d = (obj as FabricObjectWithData).data
    return d?.type === 'frame' && d?.isEmpty === true
  }) as fabric.Rect[]

  for (const frame of emptyFrames) {
    const left = frame.left ?? 0
    const top = frame.top ?? 0
    const right = left + (frame.width ?? 0)
    const bottom = top + (frame.height ?? 0)

    if (x >= left && x <= right && y >= top && y <= bottom) {
      return frame
    }
  }

  return null
}

// ─── 5. addTextBox ──────────────────────────────────────────────────────────

export function addTextBox(
  canvas: fabric.Canvas,
  pageW: number,
  pageH: number,
): fabric.Textbox {
  const textbox = new fabric.Textbox('Tu texto aquí', {
    left: pageW / 2,
    top: pageH / 2,
    originX: 'center',
    originY: 'center',
    width: pageW * 0.5,
    fontFamily: 'amandine',
    fontSize: 24,
    fill: '#191919',
    textAlign: 'center',
  }) as fabric.Textbox & { data: TextData }

  textbox.data = { type: 'text' }

  canvas.add(textbox)
  canvas.setActiveObject(textbox)
  canvas.renderAll()
  return textbox
}

// ─── 6. serializePage ───────────────────────────────────────────────────────

type SerializedFrame = {
  frameX: number
  frameY: number
  frameW: number
  frameH: number
  isEmpty: boolean
  photo?: string
  scaleX?: number
  scaleY?: number
  imgLeft?: number
  imgTop?: number
}

type SerializedText = {
  text: string
  left: number
  top: number
  width: number
  fontSize: number
  fontFamily: string
  fill: string
}

export type PageData = {
  background: string
  pageW: number
  pageH: number
  frames: SerializedFrame[]
  texts: SerializedText[]
}

export function serializePage(
  canvas: fabric.Canvas,
  pageW: number,
  pageH: number,
): PageData {
  const frames: SerializedFrame[] = []
  const texts: SerializedText[] = []

  for (const obj of canvas.getObjects()) {
    const data = (obj as FabricObjectWithData).data

    if (data?.type === 'frame') {
      const fd = data as FrameData
      const sf: SerializedFrame = {
        frameX: fd.frameX,
        frameY: fd.frameY,
        frameW: fd.frameW,
        frameH: fd.frameH,
        isEmpty: fd.isEmpty,
      }
      if (!fd.isEmpty && obj instanceof fabric.FabricImage) {
        sf.photo = obj.getSrc()
        sf.scaleX = obj.scaleX
        sf.scaleY = obj.scaleY
        sf.imgLeft = obj.left
        sf.imgTop = obj.top
      }
      frames.push(sf)
    }

    if (data?.type === 'text' && obj instanceof fabric.Textbox) {
      texts.push({
        text: obj.text ?? '',
        left: obj.left ?? 0,
        top: obj.top ?? 0,
        width: obj.width ?? pageW * 0.5,
        fontSize: obj.fontSize ?? 24,
        fontFamily: obj.fontFamily ?? 'amandine',
        fill: (obj.fill as string) ?? '#191919',
      })
    }
  }

  const result: PageData = {
    background: '#FFFFFF',
    pageW,
    pageH,
    frames,
    texts,
  }

  console.log('SAVING PAGE:', JSON.stringify(result, null, 2))
  return result
}

// ─── 7. deserializePage ─────────────────────────────────────────────────────

export async function deserializePage(
  canvas: fabric.Canvas,
  pageData: PageData,
  pageW: number,
  pageH: number,
): Promise<void> {
  console.log('RESTORING PAGE:', JSON.stringify(pageData, null, 2))

  canvas.remove(...canvas.getObjects())

  for (const sf of pageData.frames) {
    if (sf.isEmpty) {
      const rect = new fabric.Rect({
        left:    sf.frameX,
        top:     sf.frameY,
        width:   sf.frameW,
        height:  sf.frameH,
        originX: 'left',
        originY: 'top',
        fill:         '#F0EFEB',
        stroke:       '#528ED6',
        strokeWidth:  1,
        strokeDashArray: [5, 5],
        strokeUniform:   true,
        selectable: false,
        evented:    true,
      }) as fabric.Rect & { data: FrameData }

      rect.data = {
        type: 'frame',
        isEmpty: true,
        frameX: sf.frameX,
        frameY: sf.frameY,
        frameW: sf.frameW,
        frameH: sf.frameH,
      }
      canvas.add(rect)
    } else if (sf.photo) {
      const img = await fabric.FabricImage.fromURL(sf.photo, {
        crossOrigin: 'anonymous',
      })

      img.set({
        left: sf.imgLeft ?? sf.frameX + sf.frameW / 2,
        top: sf.imgTop ?? sf.frameY + sf.frameH / 2,
        originX: 'center',
        originY: 'center',
        scaleX: sf.scaleX,
        scaleY: sf.scaleY,
      })

      const clipRect = new fabric.Rect({
        left: sf.frameX,
        top: sf.frameY,
        width: sf.frameW,
        height: sf.frameH,
        absolutePositioned: true,
      })
      img.clipPath = clipRect

      ;(img as unknown as FabricObjectWithData).data = {
        type: 'frame',
        isEmpty: false,
        frameX: sf.frameX,
        frameY: sf.frameY,
        frameW: sf.frameW,
        frameH: sf.frameH,
      }
      canvas.add(img)
    }
  }

  for (const st of pageData.texts) {
    const textbox = new fabric.Textbox(st.text, {
      left: st.left,
      top: st.top,
      width: st.width,
      fontFamily: st.fontFamily,
      fontSize: st.fontSize,
      fill: st.fill,
    }) as fabric.Textbox & { data: TextData }

    textbox.data = { type: 'text' }
    canvas.add(textbox)
  }

  canvas.renderAll()
}
