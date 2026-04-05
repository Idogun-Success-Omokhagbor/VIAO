import { NextResponse } from "next/server"

import { parseStoredImageDataUrl } from "@/lib/image-utils"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export const runtime = "nodejs"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(req.url)
  const indexParam = url.searchParams.get("index")
  const index = indexParam ? Number(indexParam) : null

  try {
    const session = await getSessionUser()
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { imageUrl: true, imageUrls: true, organizerId: true, status: true },
    })

    if (!event) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    const canAccessDraft = session?.sub === event.organizerId || session?.role === "ADMIN"
    if (event.status === "DRAFT" && !canAccessDraft) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    const src =
      typeof index === "number" && Number.isInteger(index) && index >= 0
        ? Array.isArray(event.imageUrls)
          ? (event.imageUrls[index] ?? null)
          : null
        : (event.imageUrl ?? null)

    if (!src) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    if (!src.startsWith("data:")) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    const parsed = parseStoredImageDataUrl(src)
    if (!parsed) {
      return NextResponse.redirect(new URL("/placeholder.svg", req.url))
    }

    return new NextResponse(new Uint8Array(parsed.buffer), {
      headers: {
        "Content-Type": parsed.mime,
        "Cache-Control": event.status === "PUBLISHED" ? "public, max-age=31536000, immutable" : "private, no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/events/[id]/image error:", error)
    return NextResponse.redirect(new URL("/placeholder.svg", req.url))
  }
}
