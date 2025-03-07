/**
 * Servicio centralizado para la generación y gestión de PDFs
 */
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import type { UserOptions } from "jspdf-autotable"
import { validateData } from "./file-validator"

// Add the missing type declaration for jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF
  }
}

// Verificar si estamos en el navegador o en el servidor
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

// Interfaz para opciones de generación de PDF
export interface PDFGenerationOptions {
  forceClientSide?: boolean
  enableValidation?: boolean
  outputFormat?: "datauri" | "blob" | "arraybuffer"
  filename?: string
  autoDownload?: boolean
}

// Interfaz para resultado de generación de PDF
export interface PDFGenerationResult {
  success: boolean
  data?: string | Blob | ArrayBuffer
  error?: string
  warnings?: string[]
  contentType: string
  filename?: string
}

/**
 * Genera un PDF de reporte financiero
 */
export async function generateFinancialReportPDF(
  companyInfo: any,
  transactions: any[],
  startDate: string,
  endDate: string,
  options: PDFGenerationOptions = {},
): Promise<PDFGenerationResult> {
  console.log("Entorno de ejecución:", isBrowser ? "Navegador" : "Servidor")

  // Opciones por defecto
  const defaultOptions: PDFGenerationOptions = {
    forceClientSide: false,
    enableValidation: true,
    outputFormat: "datauri",
    autoDownload: false,
  }

  const finalOptions = { ...defaultOptions, ...options }

  // Validar datos si está habilitado
  if (finalOptions.enableValidation) {
    const validationResult = await validateData({ companyInfo, transactions, startDate, endDate }, "report")

    if (!validationResult.isValid) {
      return {
        success: false,
        error: `Validación fallida: ${validationResult.errors.join(", ")}`,
        warnings: validationResult.warnings,
        contentType: "application/json",
      }
    }

    if (validationResult.warnings.length > 0) {
      console.warn("Advertencias de validación:", validationResult.warnings)
    }
  }

  // Si estamos en el servidor y no se fuerza el lado del cliente, generar JSON
  if (!isBrowser && !finalOptions.forceClientSide) {
    return generateServerSideReport(companyInfo, transactions, startDate, endDate, finalOptions)
  }

  // Estamos en el navegador o se fuerza el lado del cliente
  try {
    return await generateClientSideReport(companyInfo, transactions, startDate, endDate, finalOptions)
  } catch (error) {
    console.error("Error al generar el PDF en el cliente:", error)

    // Si falla en el cliente y estamos en el servidor, intentar generar JSON
    if (!isBrowser) {
      return generateServerSideReport(companyInfo, transactions, startDate, endDate, finalOptions)
    }

    // Si estamos en el cliente, devolver error
    return {
      success: false,
      error: `Error al generar el PDF: ${error instanceof Error ? error.message : String(error)}`,
      contentType: "application/json",
    }
  }
}

/**
 * Genera un reporte en formato JSON en el servidor
 */
async function generateServerSideReport(
  companyInfo: any,
  transactions: any[],
  startDate: string,
  endDate: string,
  options: PDFGenerationOptions,
): Promise<PDFGenerationResult> {
  try {
    console.log("Generando reporte en formato JSON (servidor)")

    // Crear un objeto JSON con los datos del reporte
    const reportData = {
      companyInfo,
      period: { startDate, endDate },
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

    // Intentar generar un PDF simple en el servidor si es posible
    try {
      // Importar jsPDF dinámicamente en el servidor
      const { jsPDF } = await import("jspdf")

      // Crear un nuevo documento
      const doc = new jsPDF()

      // Añadir título
      doc.setFontSize(18)
      doc.text("Reporte Financiero", 105, 20, { align: "center" })

      // Añadir período
      doc.setFontSize(12)
      doc.text(`Período: ${startDate} - ${endDate}`, 105, 30, { align: "center" })

      // Añadir resumen
      doc.setFontSize(14)
      doc.text("Resumen", 20, 40)

      // Calcular totales
      const totalEurosReceived = transactions.reduce((sum, t) => sum + t.eurosReceived, 0)
      const totalBsDelivered = transactions.reduce((sum, t) => sum + t.bsDelivered, 0)
      const totalProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0)

      doc.setFontSize(10)
      doc.text(`Total Transacciones: ${transactions.length}`, 20, 50)
      doc.text(`Total Euros Recibidos: ${totalEurosReceived.toFixed(2)} EUR`, 20, 60)
      doc.text(`Total Bs Entregados: ${totalBsDelivered.toFixed(2)} VES`, 20, 70)
      doc.text(`Beneficio Total: ${totalProfit.toFixed(2)} EUR`, 20, 80)

      // Añadir nota
      doc.setFontSize(9)
      doc.text("Este es un reporte simplificado generado en el servidor.", 105, 100, { align: "center" })
      doc.text("Para un reporte completo, por favor descárguelo desde el navegador.", 105, 110, { align: "center" })

      // Convertir a base64
      const pdfOutput = doc.output("datauristring")

      return {
        success: true,
        data: pdfOutput,
        contentType: "application/pdf",
        filename: options.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`,
      }
    } catch (error) {
      console.error("Error al generar PDF en el servidor, devolviendo JSON:", error)

      // Si falla la generación del PDF, devolver JSON
      const jsonString = JSON.stringify(reportData)
      const base64Data = Buffer.from(jsonString).toString("base64")
      const dataUri = `data:application/json;base64,${base64Data}`

      return {
        success: true,
        data: dataUri,
        warnings: ["Se ha generado una versión JSON del reporte debido a limitaciones del servidor"],
        contentType: "application/json",
        filename: options.filename || `reporte-financiero-${startDate}-a-${endDate}.json`,
      }
    }
  } catch (error) {
    console.error("Error al generar el reporte en el servidor:", error)
    return {
      success: false,
      error: `Error al generar el reporte en el servidor: ${error instanceof Error ? error.message : String(error)}`,
      contentType: "application/json",
    }
  }
}

/**
 * Genera un reporte en formato PDF en el cliente
 */
async function generateClientSideReport(
  companyInfo: any,
  transactions: any[],
  startDate: string,
  endDate: string,
  options: PDFGenerationOptions,
): Promise<PDFGenerationResult> {
  try {
    console.log("Generando reporte en formato PDF (navegador)")

    // Verificar que jsPDF esté disponible
    if (typeof jsPDF === "undefined") {
      throw new Error("jsPDF no está disponible en este entorno")
    }

    // Crear un nuevo documento PDF
    const doc = new jsPDF()

    // Configurar fuentes y colores
    const primaryColor = "#3b82f6" // Azul
    const secondaryColor = "#10b981" // Verde
    const accentColor = "#8b5cf6" // Púrpura

    // Añadir logo si existe
    if (companyInfo.logo) {
      try {
        // Cargar la imagen del logo de forma síncrona
        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous" // Importante para evitar problemas CORS

          img.onload = () => {
            try {
              // Calcular dimensiones para mantener la proporción
              const imgWidth = 30 // Reducido de 40 a 30
              const imgHeight = (img.height * imgWidth) / img.width

              // Añadir la imagen al PDF
              doc.addImage(img, "PNG", 15, 15, imgWidth, imgHeight)
              resolve()
            } catch (error) {
              console.error("Error al añadir la imagen al PDF:", error)
              resolve() // Continuamos aunque haya error
            }
          }

          img.onerror = (error) => {
            console.error("Error al cargar el logo:", error)
            resolve() // Continuamos aunque haya error
          }

          // Asignar la URL después de configurar los handlers
          img.src = companyInfo.logo

          // Si la imagen ya está en caché, el evento onload podría no dispararse
          if (img.complete) {
            try {
              const imgWidth = 30
              const imgHeight = (img.height * imgWidth) / img.width
              doc.addImage(img, "PNG", 15, 15, imgWidth, imgHeight)
              resolve()
            } catch (error) {
              console.error("Error al añadir la imagen al PDF (caché):", error)
              resolve()
            }
          }
        })
      } catch (error) {
        console.error("Error general al procesar el logo:", error)
        // Continuar sin el logo
      }
    }

    // Añadir encabezado con información de la empresa
    doc.setFontSize(18)
    doc.setTextColor(primaryColor)
    doc.text(companyInfo.name, 60, 20)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(companyInfo.address, 60, 25)
    doc.text(`Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`, 60, 30)
    doc.text(`NIF: ${companyInfo.taxId}`, 60, 35)

    // Añadir título del reporte
    doc.setFontSize(16)
    doc.setTextColor(accentColor)
    doc.text("Reporte Financiero", 105, 50, { align: "center" })

    // Añadir período del reporte
    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(`Período: ${formatDate(startDate)} - ${formatDate(endDate)}`, 105, 58, { align: "center" })

    // Calcular totales
    let totalEurosReceived = 0
    let totalBsDelivered = 0
    let totalProfit = 0

    transactions.forEach((transaction) => {
      totalEurosReceived += transaction.eurosReceived
      totalBsDelivered += transaction.bsDelivered
      totalProfit += transaction.profit || 0
    })

    // Añadir resumen financiero
    doc.setFillColor(245, 247, 250) // Color de fondo claro
    doc.roundedRect(15, 65, 180, 30, 3, 3, "F")

    doc.setFontSize(12)
    doc.setTextColor(primaryColor)
    doc.text("Resumen Financiero", 20, 75)

    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.text(`Total Euros Recibidos: ${formatCurrency(totalEurosReceived, "EUR")}`, 20, 82)
    doc.text(`Total Bs Entregados: ${formatCurrency(totalBsDelivered, "VES")}`, 80, 82)
    doc.text(`Beneficio Total: ${formatCurrency(totalProfit, "EUR")}`, 150, 82)

    // Calcular rentabilidad promedio
    const avgProfitPercentage =
      transactions.length > 0
        ? transactions.reduce((sum, t) => sum + (t.profitPercentage || 0), 0) / transactions.length
        : 0

    doc.text(`Rentabilidad Promedio: ${avgProfitPercentage.toFixed(2)}%`, 20, 89)

    // Añadir tabla de transacciones
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor)
    doc.text("Detalle de Transacciones", 15, 105)

    // Configurar la tabla
    const tableColumn = ["Fecha", "Cliente", "Euros", "Bs", "Tasa", "Beneficio", "% Benef."]

    const tableRows = transactions.map((transaction) => [
      formatDate(transaction.date.toString()),
      transaction.client.name,
      formatCurrency(transaction.eurosReceived, "EUR").replace("€", ""),
      formatCurrency(transaction.bsDelivered, "VES").replace("VES", ""),
      transaction.exchangeRate.toFixed(2),
      formatCurrency(transaction.profit || 0, "EUR").replace("€", ""),
      `${(transaction.profitPercentage || 0).toFixed(2)}%`,
    ])

    // Verificar si autoTable está disponible
    if (typeof doc.autoTable === "function") {
      // Usar autoTable si está disponible
      console.log("Usando autoTable para la tabla del reporte")
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 110,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [220, 220, 220],
        },
        headStyles: {
          fillColor: [
            Number.parseInt(primaryColor.substring(1, 3), 16),
            Number.parseInt(primaryColor.substring(3, 5), 16),
            Number.parseInt(primaryColor.substring(5, 7), 16),
          ],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
      })
    } else {
      // Si autoTable no está disponible, crear una tabla manual básica
      console.warn("autoTable no está disponible, creando tabla manual")
      let yPos = 110
      const cellHeight = 8
      const cellPadding = 2

      // Encabezado
      doc.setFillColor(59, 130, 246) // Color azul primario
      doc.setTextColor(255, 255, 255) // Texto blanco
      doc.rect(15, yPos, 180, cellHeight, "F")

      let xPos = 15
      const columnWidths = [25, 40, 20, 25, 20, 25, 25] // Ancho de cada columna

      // Cabeceras de la tabla
      doc.setFontSize(8)
      for (let i = 0; i < tableColumn.length; i++) {
        doc.text(tableColumn[i], xPos + cellPadding, yPos + cellPadding + 4)
        xPos += columnWidths[i]
      }

      yPos += cellHeight

      // Filas de datos
      doc.setTextColor(80)
      for (let i = 0; i < Math.min(tableRows.length, 20); i++) {
        // Limitamos a 20 filas para no desbordar la página
        xPos = 15

        // Alternar colores de fondo
        if (i % 2 === 0) {
          doc.setFillColor(245, 247, 250)
          doc.rect(15, yPos, 180, cellHeight, "F")
        }

        for (let j = 0; j < tableRows[i].length; j++) {
          doc.text(tableRows[i][j].toString(), xPos + cellPadding, yPos + cellPadding + 4)
          xPos += columnWidths[j]
        }

        yPos += cellHeight

        // Si llegamos al final de la página, detenemos
        if (yPos > 270) {
          doc.text("... y más registros", 105, yPos + 5, { align: "center" })
          break
        }
      }
    }

    // Añadir pie de página
    const pageCount = 1 // Valor fijo para simplificar

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-ES")} | Página 1 de ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" },
    )

    // Generar el resultado según el formato solicitado
    let result: PDFGenerationResult

    switch (options.outputFormat) {
      case "blob":
        const blob = doc.output("blob")
        result = {
          success: true,
          data: blob,
          contentType: "application/pdf",
          filename: options.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`,
        }
        break
      case "arraybuffer":
        const buffer = doc.output("arraybuffer")
        result = {
          success: true,
          data: buffer,
          contentType: "application/pdf",
          filename: options.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`,
        }
        break
      case "datauri":
      default:
        const dataUri = doc.output("datauristring")
        result = {
          success: true,
          data: dataUri,
          contentType: "application/pdf",
          filename: options.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`,
        }
    }

    // Descargar automáticamente si se solicita
    if (options.autoDownload && isBrowser && result.data) {
      downloadFile(
        result.data,
        result.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`,
        result.contentType,
      )
    }

    return result
  } catch (error) {
    console.error("Error al generar el PDF en el cliente:", error)
    return {
      success: false,
      error: `Error al generar el PDF en el cliente: ${error instanceof Error ? error.message : String(error)}`,
      contentType: "application/json",
    }
  }
}

/**
 * Genera un PDF de recibo
 */
export async function generateReceiptPDF(
  companyInfo: any,
  client: any,
  transactionData: {
    receiptId: string
    date: string | Date
    eurosReceived: number
    bsDelivered: number
    exchangeRate: number
    timestamp: string
    profit?: number
    profitPercentage?: number
  },
  options: PDFGenerationOptions = {},
): Promise<PDFGenerationResult> {
  // Esta función solo debe ejecutarse en el navegador
  if (!isBrowser && !options.forceClientSide) {
    return {
      success: false,
      error: "La generación de recibos solo está disponible en el navegador",
      contentType: "application/json",
    }
  }

  // Opciones por defecto
  const defaultOptions: PDFGenerationOptions = {
    forceClientSide: true,
    enableValidation: true,
    outputFormat: "datauri",
    autoDownload: false,
  }

  const finalOptions = { ...defaultOptions, ...options }

  // Validar datos si está habilitado
  if (finalOptions.enableValidation) {
    const validationResult = await validateData({ companyInfo, client, transactionData }, "receipt")

    if (!validationResult.isValid) {
      return {
        success: false,
        error: `Validación fallida: ${validationResult.errors.join(", ")}`,
        warnings: validationResult.warnings,
        contentType: "application/json",
      }
    }

    if (validationResult.warnings.length > 0) {
      console.warn("Advertencias de validación:", validationResult.warnings)
    }
  }

  try {
    // Crear un nuevo documento PDF
    const doc = new jsPDF()

    // Configurar colores
    const primaryColor = [59, 130, 246] // Azul
    const secondaryColor = [16, 185, 129] // Verde
    const accentColor = [139, 92, 246] // Púrpura
    const lightBlue = [239, 246, 255] // Fondo azul claro

    // Añadir logo si existe
    if (companyInfo.logo) {
      try {
        // Cargar la imagen del logo de forma síncrona
        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous" // Importante para evitar problemas CORS

          img.onload = () => {
            try {
              // Calcular dimensiones para mantener la proporción (tamaño reducido)
              const imgWidth = 30 // Reducido de 40 a 30
              const imgHeight = (img.height * imgWidth) / img.width

              // Añadir la imagen al PDF
              doc.addImage(img, "PNG", 15, 15, imgWidth, imgHeight)
              resolve()
            } catch (error) {
              console.error("Error al añadir la imagen al PDF:", error)
              resolve() // Continuamos aunque haya error
            }
          }

          img.onerror = (error) => {
            console.error("Error al cargar el logo:", error)
            resolve() // Continuamos aunque haya error
          }

          // Asignar la URL después de configurar los handlers
          img.src = companyInfo.logo

          // Si la imagen ya está en caché, el evento onload podría no dispararse
          if (img.complete) {
            try {
              const imgWidth = 30
              const imgHeight = (img.height * imgWidth) / img.width
              doc.addImage(img, "PNG", 15, 15, imgWidth, imgHeight)
              resolve()
            } catch (error) {
              console.error("Error al añadir la imagen al PDF (caché):", error)
              resolve()
            }
          }
        })
      } catch (error) {
        console.error("Error general al procesar el logo:", error)
        // Continuar sin el logo
      }
    }

    // Añadir encabezado con información de la empresa
    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(companyInfo.name, 50, 20)

    doc.setFontSize(9)
    doc.setTextColor(80)
    doc.text(companyInfo.address, 50, 25)
    doc.text(`Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`, 50, 30)
    doc.text(`NIF: ${companyInfo.taxId}`, 50, 35)

    // Añadir información del recibo en un cuadro destacado
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.roundedRect(140, 15, 55, 25, 3, 3, "F")

    doc.setFontSize(11)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text("RECIBO", 168, 22, { align: "center" })

    doc.setFontSize(9)
    doc.setTextColor(60)
    doc.text(`ID: ${transactionData.receiptId}`, 168, 28, { align: "center" })
    doc.text(`Fecha: ${formatDate(transactionData.date.toString())}`, 168, 34, { align: "center" })

    // Línea separadora
    doc.setDrawColor(220)
    doc.line(15, 45, 195, 45)

    // Información del cliente
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text("Información del Cliente", 15, 55)

    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text(`Nombre: ${client.name}`, 15, 62)
    doc.text(`Email: ${client.email}`, 15, 68)

    if (client.phone) {
      doc.text(`Teléfono: ${client.phone}`, 15, 74)
    }

    if (client.dni) {
      doc.text(`DNI/NIE: ${client.dni}`, 15, 80)
    }

    if (client.address) {
      let addressText = `Dirección: ${client.address}`
      if (client.city) addressText += `, ${client.city}`
      if (client.postalCode) addressText += ` ${client.postalCode}`
      if (client.country) addressText += `, ${client.country}`

      // Comprobar si la dirección es demasiado larga
      if (doc.getTextWidth(addressText) > 90) {
        const addressParts = addressText.split(", ")
        doc.text(`Dirección: ${addressParts[0]}`, 15, 86)
        doc.text(addressParts.slice(1).join(", "), 25, 92)
      } else {
        doc.text(addressText, 15, 86)
      }
    }

    // Detalles de la transacción
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text("Detalles de la Transacción", 15, 105)

    // Crear un cuadro para los detalles
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(15, 110, 85, 40, 3, 3, "F")

    doc.setFontSize(9)
    doc.setTextColor(60)

    // Primera columna de detalles
    doc.text("Euros Recibidos:", 20, 118)
    doc.text("Bolívares Entregados:", 20, 126)
    doc.text("Tasa de Cambio:", 20, 134)

    // Valores alineados a la derecha
    doc.text(formatCurrency(transactionData.eurosReceived, "EUR"), 95, 118, { align: "right" })
    doc.text(formatCurrency(transactionData.bsDelivered, "VES"), 95, 126, { align: "right" })
    doc.text(`${transactionData.exchangeRate.toFixed(2)} Bs/€`, 95, 134, { align: "right" })

    // Información adicional
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(110, 110, 85, 40, 3, 3, "F")

    doc.text("Método de Pago:", 115, 118)
    doc.text("Estado:", 115, 126)
    doc.text("Referencia:", 115, 134)

    doc.text("Transferencia Bancaria", 190, 118, { align: "right" })

    // Estado en verde
    doc.setTextColor(16, 185, 129)
    doc.text("Completado", 190, 126, { align: "right" })

    // Volver al color normal
    doc.setTextColor(60)
    doc.text(transactionData.receiptId, 190, 134, { align: "right" })

    // Resumen
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text("Resumen", 15, 165)

    // Cuadro de resumen
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.roundedRect(15, 170, 180, 30, 3, 3, "F")

    doc.setFontSize(9)
    doc.setTextColor(60)

    doc.text("Monto Enviado:", 20, 178)
    doc.text("Monto Recibido:", 20, 186)

    doc.text(formatCurrency(transactionData.eurosReceived, "EUR"), 190, 178, { align: "right" })
    doc.text(formatCurrency(transactionData.bsDelivered, "VES"), 190, 186, { align: "right" })

    // Línea separadora en el resumen
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.line(20, 190, 190, 190)

    doc.setFontSize(10)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text("Tasa de Cambio Aplicada:", 20, 196)
    doc.text(`${transactionData.exchangeRate.toFixed(2)} Bs/€`, 190, 196, { align: "right" })

    // Términos y condiciones
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text("Términos y Condiciones:", 15, 210)
    doc.text("Este recibo es un comprobante de la transacción realizada. La empresa no se hace responsable", 15, 215)
    doc.text("por información incorrecta proporcionada por el cliente.", 15, 220)
    doc.text("Para cualquier consulta relacionada con esta transacción, por favor contacte a nuestro", 15, 225)
    doc.text("servicio de atención al cliente mencionando el número de recibo.", 15, 230)

    // Pie de página
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(
      `Este recibo fue generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
      105,
      245,
      { align: "center" },
    )
    doc.text(`© ${new Date().getFullYear()} ${companyInfo.name}. Todos los derechos reservados.`, 105, 250, {
      align: "center",
    })

    // Generar el resultado según el formato solicitado
    let result: PDFGenerationResult

    switch (options.outputFormat) {
      case "blob":
        const blob = doc.output("blob")
        result = {
          success: true,
          data: blob,
          contentType: "application/pdf",
          filename: options.filename || `recibo-${transactionData.receiptId}.pdf`,
        }
        break
      case "arraybuffer":
        const buffer = doc.output("arraybuffer")
        result = {
          success: true,
          data: buffer,
          contentType: "application/pdf",
          filename: options.filename || `recibo-${transactionData.receiptId}.pdf`,
        }
        break
      case "datauri":
      default:
        const dataUri = doc.output("datauristring")
        result = {
          success: true,
          data: dataUri,
          contentType: "application/pdf",
          filename: options.filename || `recibo-${transactionData.receiptId}.pdf`,
        }
    }

    // Descargar automáticamente si se solicita
    if (options.autoDownload && isBrowser && result.data) {
      downloadFile(result.data, result.filename || `recibo-${transactionData.receiptId}.pdf`, result.contentType)
    }

    return result
  } catch (error) {
    console.error("Error al generar el PDF del recibo:", error)
    return {
      success: false,
      error: `Error al generar el PDF del recibo: ${error instanceof Error ? error.message : String(error)}`,
      contentType: "application/json",
    }
  }
}

/**
 * Descarga un archivo en el navegador
 */
export function downloadFile(
  data: string | Blob | ArrayBuffer,
  filename: string,
  contentType = "application/pdf",
): void {
  // Esta función solo debe ejecutarse en el navegador
  if (!isBrowser) {
    console.error("La función downloadFile solo puede ser utilizada en el navegador")
    return
  }

  try {
    let url: string

    if (typeof data === "string") {
      // Si es un dataURI, usarlo directamente
      if (data.startsWith("data:")) {
        url = data
      } else {
        // Si es una cadena normal, convertirla a blob
        const blob = new Blob([data], { type: contentType })
        url = URL.createObjectURL(blob)
      }
    } else if (data instanceof Blob) {
      // Si es un blob, crear URL
      url = URL.createObjectURL(data)
    } else if (data instanceof ArrayBuffer) {
      // Si es un ArrayBuffer, convertirlo a blob
      const blob = new Blob([data], { type: contentType })
      url = URL.createObjectURL(blob)
    } else {
      throw new Error("Tipo de datos no soportado para descarga")
    }

    // Crear enlace y descargar
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Limpiar
    setTimeout(() => {
      document.body.removeChild(link)
      if (!url.startsWith("data:")) {
        URL.revokeObjectURL(url)
      }
    }, 100)
  } catch (error) {
    console.error("Error al descargar el archivo:", error)
    throw error
  }
}

// Función auxiliar para formatear fechas
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Función auxiliar para formatear moneda
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

