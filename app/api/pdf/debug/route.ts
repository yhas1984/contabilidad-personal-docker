// Add the export config to mark this route as dynamic
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { jsPDF } from "jspdf"
import nodemailer from "nodemailer"

export async function GET(req: Request) {
  try {
    // Obtener la URL de la solicitud para extraer parámetros de consulta
    const url = new URL(req.url)
    const testEmail = url.searchParams.get("email") || "test@example.com"
    const sendEmail = url.searchParams.get("send") === "true"

    // Crear un PDF de prueba simple
    const doc = new jsPDF()

    // Añadir contenido básico
    doc.setFontSize(16)
    doc.text("PDF de Prueba", 105, 20, { align: "center" })

    doc.setFontSize(12)
    doc.text("Este es un PDF de prueba para verificar la generación y envío.", 105, 30, { align: "center" })

    doc.setFontSize(10)
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, 40, { align: "center" })

    // Añadir un rectángulo para verificar que los gráficos funcionan
    doc.setDrawColor(0, 0, 200)
    doc.setFillColor(230, 230, 250)
    doc.roundedRect(50, 50, 110, 50, 3, 3, "FD")

    doc.setTextColor(0, 0, 200)
    doc.text("Si puedes ver este texto y el rectángulo azul,", 105, 70, { align: "center" })
    doc.text("el PDF se está generando correctamente.", 105, 80, { align: "center" })

    // Obtener el PDF como data URI
    const pdfDataUri = doc.output("datauristring")
    console.log("PDF generado con formato:", pdfDataUri.substring(0, 50) + "...")

    // Extraer el contenido base64
    const base64Data = pdfDataUri.split(",")[1]
    const pdfBuffer = Buffer.from(base64Data, "base64")

    // Si se solicita enviar un correo
    if (sendEmail) {
      // Configurar el transportador de correo
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.hostinger.com",
        port: Number(process.env.EMAIL_PORT || 465),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER || "contacto@tuenvioexpress.es",
          pass: process.env.EMAIL_PASSWORD,
        },
        debug: true,
        logger: true,
      })

      // Enviar el correo con el PDF adjunto
      const info = await transporter.sendMail({
        from: `"Tu Envío Express" <${process.env.EMAIL_USER}>`,
        to: testEmail,
        subject: "Prueba de PDF - Debug",
        text: "Este es un correo de prueba con un PDF adjunto para depuración.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #3b82f6;">Prueba de PDF - Debug</h2>
            <p>Este es un correo de prueba con un PDF adjunto para depuración.</p>
            <p>Si puedes abrir el PDF adjunto, la generación y envío están funcionando correctamente.</p>
          </div>
        `,
        attachments: [
          {
            filename: "prueba-debug.pdf",
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      })

      return NextResponse.json({
        success: true,
        message: "PDF generado y enviado correctamente",
        pdfSize: pdfBuffer.length,
        emailSent: true,
        messageId: info.messageId,
        sentTo: testEmail,
      })
    }

    // Si no se solicita enviar correo, solo devolver el PDF
    return NextResponse.json({
      success: true,
      message: "PDF generado correctamente",
      pdfSize: pdfBuffer.length,
      pdfDataUri: pdfDataUri,
    })
  } catch (error) {
    console.error("Error en la depuración de PDF:", error)
    return NextResponse.json(
      {
        error: `Error en la depuración de PDF: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}


