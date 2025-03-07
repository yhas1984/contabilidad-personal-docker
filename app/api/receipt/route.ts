import { NextResponse } from "next/server"

// En una aplicación real, esto sería una base de datos
const receipts = new Map<string, any>()

export async function POST(req: Request) {
  const receipt = await req.json()
  const receiptId = receipt.receiptId

  receipts.set(receiptId, receipt)

  return NextResponse.json({ receiptId })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Receipt ID is required" }, { status: 400 })
  }

  const receipt = receipts.get(id)

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  return NextResponse.json(receipt)
}

