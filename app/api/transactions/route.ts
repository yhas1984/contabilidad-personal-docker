import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { client: true },
    })
    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error al obtener transacciones:", error)
    return NextResponse.json({ error: "Error al obtener transacciones" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const transactionData = await req.json()
    const transaction = await prisma.transaction.create({
      data: transactionData,
      include: { client: true },
    })
    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error al crear transacción:", error)
    return NextResponse.json({ error: "Error al crear transacción" }, { status: 500 })
  }
}




