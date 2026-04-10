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

type PhotoData = {
  type: 'photo'
  frameX: number
  frameY: number
  frameW: number
  frameH: number
  naturalW: number  // intrinsic pixel width of the source image
  naturalH: number  // intrinsic pixel height of the source image
  imgLeft: number   // current center-X of image (updated as user pans in content mode)
  imgTop: number    // current center-Y of image
}

type TextData = {
  type: 'text'
}

type FabricObjectWithData = fabric.FabricObject & { data: FrameData | PhotoData | TextData }

// ─── Utilidades ─────────────────────────────────────────────────────────────

function pctToPx(pct: number, total: number): number {
  return pct * total
}

function isFrameObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'frame'
}

function isPhotoObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'photo'
}

function isTextObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'text'
}

// Build an absolutePositioned clipPath rect from frame coords.
// absolutePositioned:true means Fabric clips in canvas coordinates,
// so the clip region stays fixed even as the image's left/top changes.
function makeClipRect(frameX: number, frameY: number, frameW: number, frameH: number): fabric.Rect {
  return new fabric.Rect({
    originX: 'left',
    originY: 'top',
    left:   frameX,
    top:    frameY,
    width:  frameW,
    height: frameH,
    absolutePositioned: true,
  })
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
    originX: 'left',
    originY: 'top',
    fill:         '#F0EFEB',
    stroke:       '#528ED6',
    strokeWidth:  1,
    strokeDashArray: [5, 5],
    strokeUniform:   true,
    selectable:    true,
    evented:       true,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX:  true,
    lockScalingY:  true,
    lockRotation:  true,
    hoverCursor:   'default',
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

// ─── 1b. restoreEmptyFrame ───────────────────────────────────────────────────
// Re-creates the dashed placeholder rect after a photo is deleted.

export function restoreEmptyFrame(
  canvas: fabric.Canvas,
  data: { frameX: number; frameY: number; frameW: number; frameH: number },
): void {
  const rect = new fabric.Rect({
    left:    data.frameX,
    top:     data.frameY,
    width:   data.frameW,
    height:  data.frameH,
    originX: 'left',
    originY: 'top',
    fill:         '#F0EFEB',
    stroke:       '#528ED6',
    strokeWidth:  1,
    strokeDashArray: [5, 5],
    strokeUniform:   true,
    selectable:    true,
    evented:       true,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX:  true,
    lockScalingY:  true,
    lockRotation:  true,
    hoverCursor:   'default',
  }) as fabric.Rect & { data: FrameData }

  rect.data = {
    type:    'frame',
    isEmpty: true,
    frameX:  data.frameX,
    frameY:  data.frameY,
    frameW:  data.frameW,
    frameH:  data.frameH,
  }

  canvas.add(rect)
}

// ─── 2. applyLayout ─────────────────────────────────────────────────────────

export function applyLayout(
  canvas: fabric.Canvas,
  layout: Layout,
  pageW: number,
  pageH: number,
): void {
  // Remove empty frames and any placed photos; preserve text objects
  const toRemove = canvas.getObjects().filter((o) => isFrameObj(o) || isPhotoObj(o))
  canvas.remove(...toRemove)

  for (const frame of layout.frames) {
    createEmptyFrame(canvas, frame, pageW, pageH)
  }

  canvas.renderAll()
}

// ─── 3. dropPhotoOnFrame ────────────────────────────────────────────────────
// Uses clipPath (absolutePositioned:true) for clipping. The image is centered
// at the frame with virtual dims (width = frameW/scale, height = frameH/scale)
// so selection handles sit exactly at the frame corners.
// Pan mode moves obj.left/top; clipPath stays fixed at the original frame coords.

export async function dropPhotoOnFrame(
  canvas: fabric.Canvas,
  frameObj: fabric.Rect,
  photoSrc: string,
  _pageW: number,
  _pageH: number,
): Promise<void> {
  // Step 1: capture frame coordinates BEFORE removing it.
  const boundingRect = frameObj.getBoundingRect()
  const frameX = boundingRect.left
  const frameY = boundingRect.top
  const frameW = boundingRect.width
  const frameH = boundingRect.height

  // Step 2: load image
  const img = await fabric.FabricImage.fromURL(photoSrc, {
    crossOrigin: 'anonymous',
  })

  // Step 3: natural image dimensions
  const naturalW = img.width  || img.getScaledWidth()
  const naturalH = img.height || img.getScaledHeight()

  // Step 4: object-fit: cover scale so the shorter axis fills the frame
  const scale = Math.max(frameW / naturalW, frameH / naturalH)

  // Step 5: virtual dimensions — rendered size = virt * scale = frame size.
  // Handles sit at frame corners; no cropX/cropY needed.
  const virtW = frameW / scale
  const virtH = frameH / scale

  img.set({
    originX: 'center',
    originY: 'center',
    left:    frameX + frameW / 2,
    top:     frameY + frameH / 2,
    scaleX:  scale,
    scaleY:  scale,
    width:   virtW,
    height:  virtH,
    selectable:        true,
    evented:           true,
    borderColor:       '#528ED6',
    borderScaleFactor: 2,
  })

  // Step 6: clip to frame region (absolutePositioned → stays fixed as image moves)
  img.clipPath = makeClipRect(frameX, frameY, frameW, frameH)

  // All 8 resize handles + rotate
  img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })

  ;(img as unknown as fabric.FabricObject & { data: PhotoData }).data = {
    type:    'photo',
    frameX,
    frameY,
    frameW,
    frameH,
    naturalW,
    naturalH,
    imgLeft: frameX + frameW / 2,
    imgTop:  frameY + frameH / 2,
  }

  // Remove frame AFTER coordinates captured, then add image
  canvas.remove(frameObj)
  canvas.add(img)
  canvas.setActiveObject(img)
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
  naturalW?: number
  naturalH?: number
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
      frames.push({
        frameX:  fd.frameX,
        frameY:  fd.frameY,
        frameW:  fd.frameW,
        frameH:  fd.frameH,
        isEmpty: true,
      })
    }

    if (data?.type === 'photo' && obj instanceof fabric.FabricImage) {
      const pd = data as PhotoData
      frames.push({
        frameX:   pd.frameX,
        frameY:   pd.frameY,
        frameW:   pd.frameW,
        frameH:   pd.frameH,
        isEmpty:  false,
        photo:    obj.getSrc(),
        scaleX:   obj.scaleX,
        scaleY:   obj.scaleY,
        imgLeft:  obj.left,
        imgTop:   obj.top,
        naturalW: pd.naturalW,
        naturalH: pd.naturalH,
      })
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

  return {
    background: '#FFFFFF',
    pageW,
    pageH,
    frames,
    texts,
  }
}

// ─── 7. deserializePage ─────────────────────────────────────────────────────

export async function deserializePage(
  canvas: fabric.Canvas,
  pageData: PageData,
  pageW: number,
  pageH: number,
): Promise<void> {
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
        selectable:    true,
        evented:       true,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX:  true,
        lockScalingY:  true,
        lockRotation:  true,
        hoverCursor:   'default',
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

      const scale    = sf.scaleX ?? 1
      const naturalW = sf.naturalW ?? (img.width  || img.getScaledWidth())
      const naturalH = sf.naturalH ?? (img.height || img.getScaledHeight())
      const virtW    = sf.frameW / scale
      const virtH    = sf.frameH / scale

      img.set({
        originX:           'center',
        originY:           'center',
        left:              sf.imgLeft ?? sf.frameX + sf.frameW / 2,
        top:               sf.imgTop  ?? sf.frameY + sf.frameH / 2,
        scaleX:            scale,
        scaleY:            sf.scaleY ?? scale,
        width:             virtW,
        height:            virtH,
        selectable:        true,
        evented:           true,
        borderColor:       '#528ED6',
        borderScaleFactor: 2,
      })

      img.clipPath = makeClipRect(sf.frameX, sf.frameY, sf.frameW, sf.frameH)
      img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })

      ;(img as unknown as fabric.FabricObject & { data: PhotoData }).data = {
        type:    'photo',
        frameX:  sf.frameX,
        frameY:  sf.frameY,
        frameW:  sf.frameW,
        frameH:  sf.frameH,
        naturalW,
        naturalH,
        imgLeft: sf.imgLeft ?? sf.frameX + sf.frameW / 2,
        imgTop:  sf.imgTop  ?? sf.frameY + sf.frameH / 2,
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
