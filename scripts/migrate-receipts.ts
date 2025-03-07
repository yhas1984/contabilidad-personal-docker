import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function migrateReceipts() {
  try {
    // Obtener todas las transacciones que no tienen recibo
    const transactions = await prisma.transaction.findMany({
      where: {
        receipt: null,
      },
    })

    console.log(`Encontradas ${transactions.length} transacciones sin recibo`)

    // Crear recibos para cada transacción
    for (const transaction of transactions) {
      await prisma.receipt.create({
        data: {
          receiptId: transaction.receiptId,
          transactionId: transaction.id,
        },
      })
      console.log(`Creado recibo para transacción ${transaction.id}`)
    }

    console.log("Migración completada")
  } catch (error) {
    console.error("Error durante la migración:", error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateReceipts()

