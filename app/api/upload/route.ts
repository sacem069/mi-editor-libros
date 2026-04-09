import { v2 as cloudinary } from 'cloudinary'
import { NextRequest, NextResponse } from 'next/server'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type) && file.type !== '') {
    return NextResponse.json({ error: 'Formato no permitido' }, { status: 400 })
  }

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{
    secure_url: string
    public_id:  string
    width:      number
    height:     number
  }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder:          'zeika/fotos',
        resource_type:   'image',
        format:          'jpg',
        transformation:  [{ format: 'jpg', quality: 'auto' }],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Upload failed'))
        else resolve(result as typeof result & { width: number; height: number })
      },
    ).end(buffer)
  })

  const jpgUrl = result.secure_url.replace(/\.[^.]+$/, '.jpg')

  return NextResponse.json({
    url:      jpgUrl,
    publicId: result.public_id,
    width:    result.width,
    height:   result.height,
  })
}
