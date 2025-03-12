import { NextResponse } from "next/server"
import { jsPDF } from "jspdf"

// Add the export config to mark this route as dynamic
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    // Crear un PDF de prueba simple
    const doc = new jsPDF()

    // Añadir contenido básico
    doc.setFontSize(16)
    doc.text("PDF de Prueba", 105, 20, { align: "center" })

    doc.setFontSize(12)
    doc.text("Este es un PDF de prueba para verificar la generación y descarga.", 105, 30, { align: "center" })

    doc.setFontSize(10)
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, 40, { align: "center" })

    // Añadir un rectángulo para verificar que los gráficos funcionan
    doc.setDrawColor(0, 0, 200)
    doc.setFillColor(230, 230, 250)
    doc.roundedRect(50, 50, 110, 50, 3, 3, "FD")

    doc.setTextColor(0, 0, 200)
    doc.text("Si puedes ver este texto y el rectángulo azul,", 105, 70, { align: "center" })
    doc.text("el PDF se está generando correctamente.", 105, 80, { align: "center" })

    // Añadir metadatos
    doc.setProperties({
      title: "PDF de Prueba",
      subject: "Verificación de generación de PDF",
      author: "Tu Envío Express",
      keywords: "prueba, pdf, verificación",
      creator: "API de Prueba",
    })

    // Obtener el PDF como data URI
    const pdfDataUri = doc.output("datauristring")

    // Obtener el PDF como buffer para verificar el tamaño
    const pdfBuffer = Buffer.from(pdfDataUri.split(",")[1], "base64")

    return NextResponse.json({
      success: true,
      message: "PDF de prueba generado correctamente",
      pdfSize: pdfBuffer.length,
      pdfDataUri: pdfDataUri,
      instructions: "Para descargar el PDF, haz clic en el enlace o copia el valor de pdfDataUri",
    })
  } catch (error) {
    console.error("Error al generar el PDF de prueba:", error)
    return NextResponse.json(
      {
        error: `Error al generar el PDF de prueba: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

