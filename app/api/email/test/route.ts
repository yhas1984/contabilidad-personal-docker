// Add the export config to mark this route as dynamic
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function GET(req: Request) {
  try {
    // Obtener la URL de la solicitud para extraer parámetros de consulta
    const url = new URL(req.url)
    const testEmail = url.searchParams.get("email") || "test@example.com"

    // Mostrar las variables de entorno (sin mostrar contraseñas completas)
    console.log("Configuración SMTP:")
    console.log("HOST:", process.env.SMTP_HOST || process.env.EMAIL_HOST)
    console.log("PORT:", process.env.SMTP_PORT || process.env.EMAIL_PORT)
    console.log("SECURE:", process.env.SMTP_SECURE || process.env.EMAIL_SECURE)
    console.log("USER:", process.env.SMTP_USER || process.env.EMAIL_USER)
    console.log("FROM:", process.env.SMTP_FROM)

    // Configurar el transportador de correo con opciones de depuración
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465),
      secure: process.env.SMTP_SECURE === "true" || process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 60000, // 60 segundos
      greetingTimeout: 30000, // 30 segundos
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false,
      },
    })

    // Verificar la conexión
    console.log("Verificando conexión SMTP...")
    const verifyResult = await transporter.verify()
    console.log("Verificación de conexión:", verifyResult)

    // Parámetro para enviar un correo de prueba
    const sendTestEmail = url.searchParams.get("send") === "true"

    if (sendTestEmail) {
      console.log(`Enviando correo de prueba a ${testEmail}...`)

      // Enviar un correo de prueba
      const info = await transporter.sendMail({
        from: `"Tu Envío Express" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: testEmail,
        subject: "Prueba de configuración SMTP",
        text: "Si estás recibiendo este correo, la configuración SMTP está funcionando correctamente.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #3b82f6;">Prueba de configuración SMTP</h2>
            <p>Si estás recibiendo este correo, la configuración SMTP está funcionando correctamente.</p>
            <p>Detalles de la configuración:</p>
            <ul>
              <li>Host: ${process.env.SMTP_HOST || process.env.EMAIL_HOST}</li>
              <li>Puerto: ${process.env.SMTP_PORT || process.env.EMAIL_PORT}</li>
              <li>Usuario: ${process.env.SMTP_USER || process.env.EMAIL_USER}</li>
              <li>Remitente: ${process.env.SMTP_FROM || process.env.SMTP_USER}</li>
            </ul>
            <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
              Este es un correo automático de prueba. Por favor, no responda a este mensaje.
            </p>
          </div>
        `,
      })

      console.log("Correo enviado:", info.messageId)

      return NextResponse.json({
        success: true,
        message: "Conexión SMTP verificada y correo de prueba enviado correctamente",
        emailSent: true,
        messageId: info.messageId,
        sentTo: testEmail,
        config: {
          host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
          port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465),
          secure: process.env.SMTP_SECURE === "true" || process.env.EMAIL_SECURE === "true",
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          from: process.env.SMTP_FROM,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Conexión SMTP verificada correctamente",
      config: {
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
        port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465),
        secure: process.env.SMTP_SECURE === "true" || process.env.EMAIL_SECURE === "true",
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        from: process.env.SMTP_FROM,
      },
    })
  } catch (error) {
    console.error("Error al verificar la conexión SMTP:", error)
    return NextResponse.json(
      {
        error: `Error al verificar la conexión SMTP: ${error instanceof Error ? error.message : String(error)}`,
        config: {
          host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
          port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465),
          secure: process.env.SMTP_SECURE === "true" || process.env.EMAIL_SECURE === "true",
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          from: process.env.SMTP_FROM,
        },
      },
      { status: 500 },
    )
  }
}

