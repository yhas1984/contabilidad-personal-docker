import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { writeFile } from "fs/promises"
import path from "path"
import { mkdir } from "fs/promises"

export async function POST(req: Request) {
  try {
    const { pdfBase64, receiptId } = await req.json()

    // Eliminamos el prefijo de data URL si existe
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "")

    // Aseguramos que el directorio existe
    const pdfDirectory = path.join(process.cwd(), "public", "pdfs")
    try {
      await mkdir(pdfDirectory, { recursive: true })
    } catch (error) {
      // Ignoramos el error si el directorio ya existe
    }

    // Creamos el nombre del archivo
    const fileName = `receipt-${receiptId}.pdf`
    const filePath = path.join(pdfDirectory, fileName)

    // Guardamos el archivo
    await writeFile(filePath, Buffer.from(base64Data, "base64"))

    // URL de la API para servir el PDF
    const pdfUrl = `/api/pdf/${receiptId}`

    // Actualizamos la transacción con la URL del PDF
    await prisma.transaction.update({
      where: { receiptId },
      data: { pdfUrl },
    })

    return NextResponse.json({ pdfUrl })
  } catch (error) {
    console.error("Error al guardar el PDF:", error)
    return NextResponse.json({ error: "Error al guardar el PDF" }, { status: 500 })
  }
}

