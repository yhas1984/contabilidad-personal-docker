import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const filePath = path.join(process.cwd(), "public", "pdfs", `receipt-${params.id}.pdf`)
    const fileBuffer = await readFile(filePath)

    const response = new NextResponse(fileBuffer)
    response.headers.set("Content-Type", "application/pdf")
    response.headers.set("Content-Disposition", `inline; filename="receipt-${params.id}.pdf"`)

    return response
  } catch (error) {
    console.error("Error al leer el PDF:", error)
    return new NextResponse("PDF no encontrado", { status: 404 })
  }
}

