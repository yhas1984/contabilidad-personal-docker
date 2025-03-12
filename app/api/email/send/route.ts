import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { receiptId, pdfDataUri } = await req.json()

    if (!receiptId) {
      return NextResponse.json({ error: "Se requiere ID de recibo" }, { status: 400 })
    }

    if (!pdfDataUri) {
      return NextResponse.json({ error: "Se requiere PDF" }, { status: 400 })
    }

    // Imprimir información de depuración sobre el formato del PDF
    console.log("Tipo de pdfDataUri:", typeof pdfDataUri)
    console.log("Longitud de pdfDataUri:", pdfDataUri.length)
    console.log("Primeros 50 caracteres:", pdfDataUri.substring(0, 50))

    // Buscar la transacción para obtener los datos del cliente
    const transaction = await prisma.transaction.findFirst({
      where: { receiptId },
      include: { client: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })
    }

    // Obtener la información de la empresa
    const companyInfo = await prisma.companyInfo.findFirst()

    if (!companyInfo) {
      return NextResponse.json({ error: "Información de la empresa no encontrada" }, { status: 404 })
    }

    // Configurar el transportador de correo
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.hostinger.com",
      port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465),
      secure: process.env.EMAIL_SECURE === "true" || process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER || "contacto@tuenvioexpress.es",
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false,
      },
    })

    // Procesar el PDF - Versión más flexible
    let pdfBuffer

    try {
      // Extraer el contenido base64 del dataURI de manera más permisiva
      console.log("Recibido pdfDataUri con longitud:", pdfDataUri.length)
      console.log("Primeros 50 caracteres:", pdfDataUri.substring(0, 50))

      let base64Data
      // Verificar si es un data URI completo
      if (pdfDataUri.startsWith("data:application/pdf;base64,")) {
        console.log("Formato reconocido: data:application/pdf;base64,")
        base64Data = pdfDataUri.replace(/^data:application\/pdf;base64,/, "")
      } else if (pdfDataUri.startsWith("data:")) {
        // Otros formatos de data URI
        console.log("Formato data URI detectado, intentando extraer")
        const matches = pdfDataUri.match(/^data:([^;]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          console.log(`Detectado formato data URI: ${matches[1]}`)
          base64Data = matches[2]
        } else {
          console.error("Formato de data URI no estándar, intentando procesar como base64 directo")
          // Intentar extraer solo la parte base64 si hay una coma
          const commaIndex = pdfDataUri.indexOf(",")
          if (commaIndex !== -1) {
            base64Data = pdfDataUri.substring(commaIndex + 1)
            console.log("Extrayendo datos después de la coma")
          } else {
            // Asumir que todo es base64
            base64Data = pdfDataUri
            console.log("Usando datos completos como base64")
          }
        }
      } else {
        // Asumir que es directamente base64
        console.log("Asumiendo que los datos son directamente base64")
        base64Data = pdfDataUri
      }

      // Verificar que los datos base64 sean válidos de manera más permisiva
      try {
        // Limpiar posibles espacios o caracteres no válidos
        base64Data = base64Data.trim()

        // Verificar longitud mínima
        if (base64Data.length < 10) {
          console.error("Los datos base64 son demasiado cortos")
          return NextResponse.json({ error: "Datos de PDF demasiado cortos o vacíos" }, { status: 400 })
        }

        // Intentar crear el buffer con los datos base64
        console.log("Longitud de base64Data:", base64Data.length)
        console.log("Primeros 50 caracteres de base64Data:", base64Data.substring(0, 50))

        // Crear el buffer con los datos base64
        pdfBuffer = Buffer.from(base64Data, "base64")

        // Verificar que el buffer tenga un tamaño razonable
        if (pdfBuffer.length < 100) {
          console.error("El buffer del PDF es demasiado pequeño, posiblemente corrupto")
          return NextResponse.json({ error: "PDF corrupto o incompleto" }, { status: 400 })
        }

        console.log(`Tamaño del buffer PDF: ${pdfBuffer.length} bytes`)
      } catch (error) {
        console.error("Error al procesar el PDF:", error)
        return NextResponse.json(
          { error: `Error al procesar el PDF: ${error instanceof Error ? error.message : String(error)}` },
          { status: 500 },
        )
      }

      // Verificar que el buffer tenga un tamaño razonable
      if (!pdfBuffer || pdfBuffer.length < 100) {
        console.error("El buffer del PDF es demasiado pequeño o inválido:", pdfBuffer?.length || 0)

        // Generar un PDF simple como alternativa
        const { jsPDF } = await import("jspdf")
        const doc = new jsPDF()

        doc.setFontSize(16)
        doc.text("Recibo de Transacción", 105, 20, { align: "center" })

        doc.setFontSize(12)
        doc.text(`ID de Recibo: ${transaction.receiptId}`, 105, 40, { align: "center" })
        doc.text(`Cliente: ${transaction.client.name}`, 105, 50, { align: "center" })
        doc.text(`Fecha: ${new Date(transaction.date).toLocaleDateString()}`, 105, 60, { align: "center" })
        doc.text(`Euros: ${transaction.eurosReceived}`, 105, 70, { align: "center" })
        doc.text(`Bolívares: ${transaction.bsDelivered}`, 105, 80, { align: "center" })

        doc.text("Este es un recibo generado automáticamente.", 105, 100, { align: "center" })
        doc.text("El PDF original no pudo ser procesado correctamente.", 105, 110, { align: "center" })

        // Convertir a buffer
        const pdfOutput = doc.output("arraybuffer")
        pdfBuffer = Buffer.from(pdfOutput)

        console.log("Generado PDF alternativo de emergencia")
      } else {
        console.log(`PDF procesado correctamente. Tamaño: ${pdfBuffer.length} bytes`)
      }
    } catch (error) {
      console.error("Error al procesar el PDF:", error)
      return NextResponse.json(
        { error: `Error al procesar el PDF: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 },
      )
    }

    // Actualizar la configuración del remitente
    const mailOptions = {
      from: `"${companyInfo.name}" <${process.env.SMTP_FROM || process.env.EMAIL_USER}>`,
      to: transaction.client.email,
      subject: `Recibo de transacción #${transaction.receiptId}`,
      text: `
Estimado/a ${transaction.client.name},

Adjunto encontrará el recibo de su transacción realizada el ${new Date(transaction.date).toLocaleDateString()}.

Detalles de la transacción:
- Número de recibo: ${transaction.receiptId}
- Euros enviados: ${transaction.eurosReceived} €
- Bolívares recibidos: ${transaction.bsDelivered} Bs
- Tasa de cambio: ${transaction.exchangeRate.toFixed(2)} Bs/€

Gracias por confiar en nosotros.

Atentamente,
${companyInfo.name}
${companyInfo.phone}
${companyInfo.email}
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
  <h2 style="color: #f59e0b;">Recibo de Transacción</h2>
  <p>Estimado/a ${transaction.client.name},</p>
  <p>Adjunto encontrará el recibo de su transacción realizada el ${new Date(transaction.date).toLocaleDateString()}.</p>
  
  <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3 style="margin-top: 0; color: #4b5563;">Detalles de la transacción:</h3>
    <ul style="list-style-type: none; padding-left: 0;">
      <li style="padding: 5px 0;"><strong>Número de recibo:</strong> ${transaction.receiptId}</li>
      <li style="padding: 5px 0;"><strong>Euros enviados:</strong> ${transaction.eurosReceived} €</li>
      <li style="padding: 5px 0;"><strong>Bolívares recibidos:</strong> ${transaction.bsDelivered} Bs</li>
      <li style="padding: 5px 0;"><strong>Tasa de cambio:</strong> ${transaction.exchangeRate.toFixed(2)} Bs/€</li>
    </ul>
  </div>
  
  <p>Gracias por confiar en nosotros.</p>
  
  <p style="margin-top: 20px;">Atentamente,<br>
  ${companyInfo.name}<br>
  ${companyInfo.phone}<br>
  ${companyInfo.email}</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #6b7280;">
    <p>Este correo electrónico y cualquier archivo adjunto son confidenciales y pueden estar protegidos por la ley.</p>
  </div>
</div>
      `,
      attachments: [
        {
          filename: `recibo-${transaction.receiptId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    }

    try {
      // Verificar la conexión antes de enviar
      await transporter.verify()
      console.log("Conexión SMTP verificada correctamente")

      // Enviar el correo
      const info = await transporter.sendMail(mailOptions)
      console.log("Correo enviado:", info.messageId)

      // Actualizar la transacción para marcar que se envió el recibo
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { emailSent: true },
      })

      return NextResponse.json({ success: true, message: "Correo enviado correctamente", messageId: info.messageId })
    } catch (smtpError) {
      console.error("Error SMTP:", smtpError)
      return NextResponse.json(
        { error: `Error de conexión SMTP: ${smtpError instanceof Error ? smtpError.message : String(smtpError)}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error al enviar el correo:", error)
    return NextResponse.json(
      { error: `Error al enviar el correo: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

