import { type NextRequest, NextResponse } from "next/server"

import { MAX_IMAGE_UPLOAD_BYTES, normalizeImageMimeType, sniffImageMime } from "@/lib/image-utils"
import { getSessionUser } from "@/lib/session"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const declaredMime = normalizeImageMimeType(file.type)
    if (!declaredMime) {
      return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 2MB)" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const detectedMime = sniffImageMime(buffer)
    if (!detectedMime || detectedMime !== declaredMime) {
      return NextResponse.json({ error: "Unsupported or invalid image file" }, { status: 400 })
    }

    const base64 = buffer.toString("base64")
    const dataUrl = `data:${detectedMime};base64,${base64}`

    return NextResponse.json({ url: dataUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
