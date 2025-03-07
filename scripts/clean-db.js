const { PrismaClient } = require("@prisma/client")
const readline = require("readline")

const prisma = new PrismaClient()
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function main() {
  console.log("🧹 Limpieza de base de datos")
  console.log("---------------------------")

  const transactionCount = await prisma.transaction.count()
  console.log(`Hay ${transactionCount} transacciones en la base de datos.`)

  rl.question("¿Quieres eliminar TODAS las transacciones? (s/n): ", async (answer) => {
    if (answer.toLowerCase() === "s") {
      try {
        // Eliminar transacciones
        const result = await prisma.transaction.deleteMany({})
        console.log(`✅ ${result.count} transacciones eliminadas exitosamente`)

        // Verificar que se eliminaron todas
        const remainingCount = await prisma.transaction.count()
        if (remainingCount === 0) {
          console.log("✅ Verificación exitosa: No quedan transacciones en la base de datos")
        } else {
          console.log(`⚠️ Advertencia: Todavía quedan ${remainingCount} transacciones en la base de datos`)
        }
      } catch (error) {
        console.error("❌ Error al eliminar transacciones:", error)
      } finally {
        await prisma.$disconnect()
        rl.close()
      }
    } else {
      console.log("Operación cancelada.")
      await prisma.$disconnect()
      rl.close()
    }
  })
}

main()

