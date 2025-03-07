import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { receiptId: params.id },
      include: { client: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error al obtener recibo:", error)
    return NextResponse.json({ error: "Error al obtener recibo" }, { status: 500 })
  }
}

