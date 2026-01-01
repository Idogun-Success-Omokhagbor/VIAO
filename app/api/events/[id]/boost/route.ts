import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  void req
  void params
  return NextResponse.json({ error: "Boosting is now handled via Stripe Checkout" }, { status: 410 })
}
