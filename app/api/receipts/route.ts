import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    // Obtener transacciones (no hay modelo Receipt)
    const transactions = await prisma.transaction.findMany({
      include: {
        client: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    // Transformar los datos para que coincidan con el formato esperado en el frontend
    const formattedTransactions = transactions.map((transaction) => {
      // Convertir el ID a string antes de usar substring
      const idString = String(transaction.id)

      return {
        id: transaction.id,
        receiptId: transaction.receiptId || `REC-${idString.substring(0, 8).toUpperCase()}`,
        createdAt: transaction.timestamp.toISOString(),
        transaction: {
          id: transaction.id,
          date: transaction.date.toISOString(),
          eurosReceived: transaction.eurosReceived,
          bsDelivered: transaction.bsDelivered,
          client: {
            name: transaction.client.name,
          },
        },
      }
    })

    return NextResponse.json(formattedTransactions)
  } catch (error) {
    console.error("Error al obtener recibos:", error)
    return NextResponse.json({ error: "Error al obtener recibos" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json()

    // Obtener la transacción
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        client: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
    }

    // Convertir el ID a string antes de usar substring
    const idString = String(transaction.id)

    // Como no hay modelo Receipt, simplemente devolvemos la transacción formateada como recibo
    const formattedReceipt = {
      id: transaction.id,
      receiptId: transaction.receiptId || `REC-${idString.substring(0, 8).toUpperCase()}`,
      createdAt: transaction.timestamp.toISOString(),
      transaction: {
        id: transaction.id,
        date: transaction.date.toISOString(),
        eurosReceived: transaction.eurosReceived,
        bsDelivered: transaction.bsDelivered,
        client: {
          name: transaction.client.name,
        },
      },
    }

    return NextResponse.json(formattedReceipt)
  } catch (error) {
    console.error("Error al crear recibo:", error)
    return NextResponse.json({ error: "Error al crear recibo" }, { status: 500 })
  }
}

