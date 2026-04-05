import { NextResponse } from "next/server"

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  void req
  void params
  return NextResponse.json({ error: "Boosting is now handled via Stripe Checkout" }, { status: 410 })
}
