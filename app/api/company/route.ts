import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    // Intentamos obtener la primera entrada (debería ser la única)
    const companyInfo = await prisma.companyInfo.findFirst()
    return NextResponse.json(companyInfo)
  } catch (error) {
    console.error("Error al obtener información de la empresa:", error)
    return NextResponse.json({ error: "Error al obtener información de la empresa" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Verificamos si ya existe una entrada
    const existingInfo = await prisma.companyInfo.findFirst()

    let companyInfo

    if (existingInfo) {
      // Actualizamos la entrada existente
      companyInfo = await prisma.companyInfo.update({
        where: { id: existingInfo.id },
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          taxId: data.taxId,
          logo: data.logo,
        },
      })
    } else {
      // Creamos una nueva entrada
      companyInfo = await prisma.companyInfo.create({
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          taxId: data.taxId,
          logo: data.logo,
        },
      })
    }

    return NextResponse.json(companyInfo)
  } catch (error) {
    console.error("Error al guardar información de la empresa:", error)
    return NextResponse.json({ error: "Error al guardar información de la empresa" }, { status: 500 })
  }
}

