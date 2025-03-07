import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { generateFinancialReportPDF } from "@/utils/pdf-service"

export async function POST(req: Request) {
  try {
    console.log("Iniciando generación de reporte...")

    // Obtener los parámetros del cuerpo de la solicitud
    const body = await req.json()

    // Extraer las fechas, permitiendo ambos formatos de nombres de parámetros
    // para mantener compatibilidad
    const start = body.start || body.startDate
    const end = body.end || body.endDate

    console.log(`Fechas recibidas: ${start} a ${end}`)

    // Validar que ambas fechas estén presentes
    if (!start || !end) {
      console.error("Error: Fechas inválidas - Ambas fechas son requeridas")
      return NextResponse.json({ error: "Fechas inválidas: Ambas fechas son requeridas" }, { status: 400 })
    }

    // Convertir las fechas de string a Date
    const startDate = new Date(start)
    const endDate = new Date(end)

    // Asegurarse de que endDate sea el final del día para incluir todas las transacciones de ese día
    endDate.setHours(23, 59, 59, 999)

    // Validar que las fechas sean válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Error: Fechas inválidas - Formato de fecha incorrecto")
      return NextResponse.json({ error: "Fechas inválidas: Formato de fecha incorrecto" }, { status: 400 })
    }

    // Validar que la fecha de inicio no sea posterior a la fecha de fin
    if (startDate > endDate) {
      console.error("Error: Fechas inválidas - La fecha de inicio es posterior a la fecha de fin")
      return NextResponse.json(
        { error: "Fechas inválidas: La fecha de inicio es posterior a la fecha de fin" },
        { status: 400 },
      )
    }

    console.log("Consultando transacciones en la base de datos...")

    // Obtener las transacciones en el rango de fechas
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        date: "asc",
      },
    })

    console.log(`Se encontraron ${transactions.length} transacciones`)

    // Verificar si hay transacciones en el rango de fechas
    if (transactions.length === 0) {
      console.error("Error: No hay transacciones en el rango de fechas seleccionado")
      return NextResponse.json({ error: "No hay transacciones en el rango de fechas seleccionado" }, { status: 404 })
    }

    console.log("Consultando información de la empresa...")

    // Obtener la información de la empresa
    const companyInfo = await prisma.companyInfo.findFirst()

    if (!companyInfo) {
      console.error("Error: No se encontró información de la empresa")
      return NextResponse.json({ error: "No se encontró información de la empresa" }, { status: 404 })
    }

    // Crear una versión segura de la información de la empresa
    const safeCompanyInfo = {
      ...companyInfo,
      logo: companyInfo.logo ?? undefined,
    }

    console.log("Generando PDF del reporte...")

    try {
      // Generar el PDF con la información segura
      const result = await generateFinancialReportPDF(safeCompanyInfo, transactions, start, end, {
        filename: `reporte-financiero-${start}-a-${end}.pdf`,
      })

      console.log(`Resultado de generación de PDF: ${result.success ? "Éxito" : "Error"}`)

      if (!result.success) {
        throw new Error(result.error || "Error desconocido al generar el PDF")
      }

      // Si es un PDF válido (dataURI)
      if (
        result.contentType === "application/pdf" &&
        typeof result.data === "string" &&
        result.data.startsWith("data:application/pdf;base64,")
      ) {
        console.log("Enviando PDF como respuesta binaria...")

        // Extraer la parte base64 del dataURI
        const base64Data = result.data.split(",")[1]
        const pdfBuffer = Buffer.from(base64Data, "base64")

        // Devolver el PDF con los encabezados adecuados
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${result.filename}"`,
          },
        })
      }

      // Si es un PDF válido (blob o arraybuffer)
      if (
        result.contentType === "application/pdf" &&
        (result.data instanceof Blob || result.data instanceof ArrayBuffer)
      ) {
        console.log("Enviando PDF como respuesta binaria desde Blob/ArrayBuffer...")

        // Convertir a Buffer
        let pdfBuffer: Buffer

        if (result.data instanceof Blob) {
          const arrayBuffer = await result.data.arrayBuffer()
          pdfBuffer = Buffer.from(arrayBuffer)
        } else {
          pdfBuffer = Buffer.from(result.data)
        }

        // Devolver el PDF con los encabezados adecuados
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${result.filename}"`,
          },
        })
      }

      // Si no es un PDF válido, devolver el resultado como JSON
      console.log("Enviando resultado como JSON...")
      return NextResponse.json({
        success: result.success,
        pdfDataUri: typeof result.data === "string" ? result.data : undefined,
        message: result.warnings?.join(", ") || "Se ha generado el reporte",
        contentType: result.contentType,
        filename: result.filename,
      })
    } catch (error) {
      console.error("Error al generar el PDF:", error)

      // Crear un objeto JSON con los datos del reporte como alternativa
      const reportData = {
        companyInfo: safeCompanyInfo,
        period: { startDate: start, endDate: end },
        summary: {
          totalEurosReceived: transactions.reduce((sum, t) => sum + t.eurosReceived, 0),
          totalBsDelivered: transactions.reduce((sum, t) => sum + t.bsDelivered, 0),
          totalProfit: transactions.reduce((sum, t) => sum + (t.profit || 0), 0),
          avgProfitPercentage:
            transactions.length > 0
              ? transactions.reduce((sum, t) => sum + (t.profitPercentage || 0), 0) / transactions.length
              : 0,
          transactionCount: transactions.length,
        },
        // Incluir solo los primeros 5 registros para el preview
        previewTransactions: transactions.slice(0, 5).map((t) => ({
          id: t.id,
          date: t.date,
          clientName: t.client.name,
          eurosReceived: t.eurosReceived,
          bsDelivered: t.bsDelivered,
          exchangeRate: t.exchangeRate,
          profit: t.profit || 0,
          profitPercentage: t.profitPercentage || 0,
        })),
      }

      // Convertir a base64 para simular un PDF
      const jsonString = JSON.stringify(reportData)
      const base64Data = Buffer.from(jsonString).toString("base64")
      const dataUri = `data:application/json;base64,${base64Data}`

      return NextResponse.json({
        success: false,
        pdfDataUri: dataUri,
        error: error instanceof Error ? error.message : "Error al generar el PDF",
        message: "Se ha generado una versión simplificada del reporte debido a un error en la generación del PDF",
      })
    }
  } catch (error) {
    console.error("Error general al generar reporte:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar reporte",
      },
      { status: 500 },
    )
  }
}
