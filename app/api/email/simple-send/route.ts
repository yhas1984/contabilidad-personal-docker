import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import prisma from "@/lib/prisma"
import { generateSimplePDF } from "@/utils/simple-pdf"

export async function POST(req: Request) {
  try {
    const { receiptId } = await req.json()

    if (!receiptId) {
      return NextResponse.json({ error: "Se requiere ID de recibo" }, { status: 400 })
    }

    // Buscar la transacción
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

    // Generar un PDF simple
    const pdfDataUri = generateSimplePDF(
      transaction.receiptId,
      transaction.client.name,
      transaction.date,
      transaction.eurosReceived,
      transaction.bsDelivered,
      transaction.exchangeRate,
    )

    // Extraer el contenido base64
    const base64Data = pdfDataUri.split(",")[1]
    const pdfBuffer = Buffer.from(base64Data, "base64")

    // Configurar el transportador de correo
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
      port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465),
      secure: process.env.EMAIL_SECURE === "true" || process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
      },
      debug: true,
      logger: true,
    })

    // Enviar el correo
    const info = await transporter.sendMail({
      from: `"${companyInfo.name}" <${process.env.EMAIL_USER}>`,
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
</div>
      `,
      attachments: [
        {
          filename: `recibo-${transaction.receiptId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    // Actualizar la transacción
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { emailSent: true },
    })

    return NextResponse.json({
      success: true,
      message: "Correo enviado correctamente con PDF simple",
      messageId: info.messageId,
    })
  } catch (error) {
    console.error("Error al enviar el correo:", error)
    return NextResponse.json(
      { error: `Error al enviar el correo: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

