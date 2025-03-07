import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { clients } = await req.json()

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ message: "No se proporcionaron clientes válidos" }, { status: 400 })
    }

    let imported = 0
    let duplicates = 0

    for (const client of clients) {
      // Validar datos requeridos
      if (!client.name || !client.email) {
        continue
      }

      try {
        // Verificar si el cliente ya existe por email
        const existingEmail = await prisma.client.findUnique({
          where: { email: client.email },
        })

        if (existingEmail) {
          duplicates++
          continue
        }

        // Verificar si el cliente ya existe por DNI (si se proporciona)
        if (client.dni) {
          const existingDni = await prisma.client.findUnique({
            where: { dni: client.dni },
          })

          if (existingDni) {
            duplicates++
            continue
          }
        }

        // Crear el cliente
        await prisma.client.create({
          data: {
            name: client.name,
            email: client.email,
            dni: client.dni || null,
            phone: client.phone || null,
            address: client.address || null,
            city: client.city || null,
            postalCode: client.postalCode || null,
            country: client.country || "España",
            notes: client.notes || null,
          },
        })

        imported++
      } catch (error) {
        console.error("Error al importar cliente:", error)
        // Continuamos con el siguiente cliente
      }
    }

    return NextResponse.json({
      message: "Importación completada",
      imported,
      duplicates,
    })
  } catch (error) {
    console.error("Error al importar clientes:", error)
    return NextResponse.json({ error: "Error al importar clientes" }, { status: 500 })
  }
}


