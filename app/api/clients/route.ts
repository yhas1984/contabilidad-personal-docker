import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const clients = await prisma.client.findMany()
    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error al obtener clientes:", error)
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, email } = await req.json()
    const client = await prisma.client.create({
      data: { name, email },
    })
    return NextResponse.json(client)
  } catch (error) {
    console.error("Error al crear cliente:", error)
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 })
  }
}

