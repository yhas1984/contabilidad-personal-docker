const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("Inicializando la base de datos...")

  try {
    // Crear información de la empresa por defecto
    const companyInfo = await prisma.companyInfo.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: "Tu Envío Express",
        address: "Calle Principal 123, Ciudad",
        phone: "+34 600 000 000",
        email: "info@tuenvioexpress.com",
        taxId: "B12345678",
        logo: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-03-05%20at%2015.49.43-VeSWtgiGyFD1UUtA0GyTFx1Qhtx4Sq.jpeg",
      },
    })

    console.log("Información de la empresa creada:", companyInfo)

    // Crear un cliente de ejemplo
    const client = await prisma.client.upsert({
      where: { email: "cliente@ejemplo.com" },
      update: {},
      create: {
        name: "Cliente Ejemplo",
        email: "cliente@ejemplo.com",
        dni: "12345678A",
        phone: "+34 600 111 222",
        address: "Calle Secundaria 456",
        city: "Madrid",
        postalCode: "28001",
        country: "España",
        notes: "Cliente de ejemplo para pruebas",
      },
    })

    console.log("Cliente de ejemplo creado:", client)

    // Crear una transacción de ejemplo
    const receiptId = `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const now = new Date()

    const transaction = await prisma.transaction.upsert({
      where: { receiptId },
      update: {},
      create: {
        date: now,
        clientId: client.id,
        eurosReceived: 100,
        bsDelivered: 3500,
        bsCost: 90,
        exchangeRate: 35,
        profit: 10,
        profitPercentage: 11.11,
        ipAddress: "127.0.0.1",
        timestamp: now,
        receiptId: receiptId,
      },
    })

    console.log("Transacción de ejemplo creada:", transaction)

    // Crear un recibo para la transacción
    const receipt = await prisma.receipt.upsert({
      where: { transactionId: transaction.id },
      update: {},
      create: {
        receiptId: receiptId,
        transactionId: transaction.id,
      },
    })

    console.log("Recibo de ejemplo creado:", receipt)

    console.log("Base de datos inicializada correctamente")
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

