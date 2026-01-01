import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!match) return null

  const mime = match[1]
  const base64 = match[2]
  const buffer = Buffer.from(base64, "base64")
  return { mime, buffer }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const indexParam = url.searchParams.get("index")
  const index = indexParam ? Number(indexParam) : null

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { imageUrl: true, imageUrls: true },
    })

    if (!event) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    const src =
      typeof index === "number" && !Number.isNaN(index)
        ? Array.isArray(event.imageUrls)
          ? (event.imageUrls[index] ?? null)
          : null
        : (event.imageUrl ?? null)

    if (!src) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    if (!src.startsWith("data:")) {
      return NextResponse.redirect(new URL(src, req.url))
    }

    const parsed = parseDataUrl(src)
    if (!parsed) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    return new NextResponse(parsed.buffer, {
      headers: {
        "Content-Type": parsed.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("GET /api/events/[id]/image error:", error)
    return NextResponse.redirect(new URL("/placeholder.svg", req.url))
  }
}
