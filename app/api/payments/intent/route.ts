"use server"

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  void req
  return NextResponse.json({ error: "Payments are disabled in local-only mode" }, { status: 501 })
}
