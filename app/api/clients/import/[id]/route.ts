import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID de cliente inválido" }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error al obtener cliente:", error)
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID de cliente inválido" }, { status: 400 })
    }

    const data = await req.json()

    // Validar datos requeridos
    if (!data.name || !data.email) {
      return NextResponse.json({ message: "El nombre y el email son obligatorios" }, { status: 400 })
    }

    // Verificar si el cliente existe
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 })
    }

    // Verificar si el email ya está en uso por otro cliente
    if (data.email !== existingClient.email) {
      const emailExists = await prisma.client.findUnique({
        where: { email: data.email },
      })

      if (emailExists) {
        return NextResponse.json({ message: "Ya existe otro cliente con este email" }, { status: 400 })
      }
    }

    // Verificar si el DNI ya está en uso por otro cliente
    if (data.dni && data.dni !== existingClient.dni) {
      const dniExists = await prisma.client.findUnique({
        where: { dni: data.dni },
      })

      if (dniExists) {
        return NextResponse.json({ message: "Ya existe otro cliente con este DNI" }, { status: 400 })
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        dni: data.dni || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
        country: data.country || "España",
        notes: data.notes || null,
      },
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error("Error al actualizar cliente:", error)
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID de cliente inválido" }, { status: 400 })
    }

    // Verificar si el cliente tiene transacciones asociadas
    const transactionCount = await prisma.transaction.count({
      where: { clientId: id },
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { message: "No se puede eliminar el cliente porque tiene transacciones asociadas" },
        { status: 400 },
      )
    }

    await prisma.client.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Cliente eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar cliente:", error)
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 })
  }
}

