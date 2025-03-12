/**
 * Servicio centralizado para la generación y gestión de PDFs
 */
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import type { UserOptions } from "jspdf-autotable"
import { validateData } from "./file-validator"

// Añadir la declaración de tipo faltante para jsPDF con autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF
  }
}

// Verificar si estamos en el navegador o en el servidor
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

// Constantes para colores y estilos
const COLORS = {
  primary: "#3b82f6", // Azul
  secondary: "#10b981", // Verde
  accent: "#8b5cf6", // Púrpura
  success: "#22c55e", // Verde éxito
  warning: "#f59e0b", // Ámbar
  danger: "#ef4444", // Rojo
  light: "#f3f4f6", // Gris claro
  dark: "#1f2937", // Gris oscuro
}

// Tipos e interfaces
export interface PDFGenerationOptions {
  forceClientSide?: boolean
  enableValidation?: boolean
  outputFormat?: "datauri" | "blob" | "arraybuffer"
  filename?: string
  autoDownload?: boolean
  modernDesign?: boolean
  requestOptions?: {
    chartType?: string
    includeComparison?: boolean
    comparisonStartDate?: string
    comparisonEndDate?: string
    comparisonPeriod?: string
    comparisonData?: any
    modernDesign?: boolean
  }
}

export interface PDFGenerationResult {
  success: boolean
  data?: string | Blob | ArrayBuffer
  error?: string
  warnings?: string[]
  contentType: string
  filename?: string
}

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  logo?: string
}

// Modificar la interfaz Transaction para que acepte date como string o Date
interface Transaction {
  id: string | number
  date: string | Date
  client: {
    id: string | number
    name: string
    email: string
  }
  eurosReceived: number
  bsDelivered: number
  exchangeRate: number
  profit?: number
  profitPercentage?: number
}

interface ReceiptData {
  receiptId: string
  date: string | Date
  eurosReceived: number
  bsDelivered: number
  exchangeRate: number
  timestamp: string
  profit?: number
  profitPercentage?: number
}

// Opciones por defecto para la generación de PDFs
const DEFAULT_PDF_OPTIONS: PDFGenerationOptions = {
  forceClientSide: false,
  enableValidation: true,
  outputFormat: "datauri",
  autoDownload: false,
  modernDesign: true,
}

/**
 * Genera un PDF de reporte financiero
 */
export async function generateFinancialReportPDF(
  companyInfo: CompanyInfo,
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  options: PDFGenerationOptions = {},
): Promise<PDFGenerationResult> {
  console.log("Entorno de ejecución:", isBrowser ? "Navegador" : "Servidor")

  const finalOptions = { ...DEFAULT_PDF_OPTIONS, ...options }

  try {
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
    return await generateClientSideReport(companyInfo, transactions, startDate, endDate, finalOptions)
  } catch (error) {
    console.error("Error al generar el PDF:", error)

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
  companyInfo: CompanyInfo,
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  options: PDFGenerationOptions,
): Promise<PDFGenerationResult> {
  try {
    console.log("Generando reporte en formato JSON (servidor)")

    // Calcular resumen de datos
    const summary = calculateSummary(transactions)

    // Crear un objeto JSON con los datos del reporte
    const reportData = {
      companyInfo,
      period: { startDate, endDate },
      summary,
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

      doc.setFontSize(10)
      doc.text(`Total Transacciones: ${transactions.length}`, 20, 50)
      doc.text(`Total Euros Recibidos: ${summary.totalEurosReceived.toFixed(2)} EUR`, 20, 60)
      doc.text(`Total Bs Entregados: ${summary.totalBsDelivered.toFixed(2)} VES`, 20, 70)
      doc.text(`Beneficio Total: ${summary.totalProfit.toFixed(2)} EUR`, 20, 80)

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
  companyInfo: CompanyInfo,
  transactions: Transaction[],
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

    // Extraer opciones adicionales si existen
    const requestOptions = options.requestOptions || {}
    const chartType = requestOptions.chartType || "bar"
    const includeComparison = requestOptions.includeComparison || false
    const comparisonData = requestOptions.comparisonData || null
    const modernDesign =
      requestOptions.modernDesign !== undefined ? requestOptions.modernDesign : options.modernDesign !== false // Por defecto true

    // Crear un nuevo documento PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Añadir encabezado según el diseño
    await addReportHeader(doc, companyInfo, startDate, endDate, modernDesign)

    // Calcular resumen de datos
    const summary = calculateSummary(transactions)

    // Posición Y inicial para el contenido (después del encabezado)
    let yPos = modernDesign ? 50 : 65

    // Añadir resumen financiero
    yPos = addFinancialSummary(doc, summary, transactions.length, yPos, modernDesign)

    // Omitimos la generación de gráficos ya que Chart.js no está disponible
    // Añadimos un mensaje indicando que los gráficos no están disponibles
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.warning))
    doc.text("Gráficos no disponibles", 105, yPos + 10, { align: "center" })

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text("Para incluir gráficos en el reporte, instale Chart.js con: npm install chart.js", 105, yPos + 20, {
      align: "center",
    })

    yPos += 30

    // Verificar si necesitamos añadir una nueva página para la tabla
    if (yPos > 200) {
      doc.addPage()
      yPos = 20
    }

    // Añadir tabla de transacciones
    yPos = addTransactionsTable(doc, transactions, yPos, modernDesign)

    // Añadir comparación con período anterior si está disponible
    if (includeComparison && comparisonData) {
      yPos = addComparisonSection(doc, summary, comparisonData, yPos, modernDesign)
    }

    // Añadir pie de página
    addFooter(doc, companyInfo, modernDesign)

    // Generar el resultado según el formato solicitado
    const result = generatePdfOutput(doc, options, startDate, endDate)

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
  companyInfo: CompanyInfo,
  client: any,
  transactionData: ReceiptData,
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

  const finalOptions = { ...DEFAULT_PDF_OPTIONS, ...options, forceClientSide: true }

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

    // Añadir logo si existe
    await addCompanyLogo(doc, companyInfo.logo)

    // Añadir encabezado con información de la empresa
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text(companyInfo.name, 50, 20)

    doc.setFontSize(9)
    doc.setTextColor(80)
    doc.text(companyInfo.address, 50, 25)
    doc.text(`Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`, 50, 30)
    doc.text(`NIF: ${companyInfo.taxId}`, 50, 35)

    // Añadir información del recibo en un cuadro destacado
    const lightBlue = hexToRgb("#e9f2ff")
    doc.setFillColor(...lightBlue)
    doc.roundedRect(140, 15, 55, 25, 3, 3, "F")

    doc.setFontSize(11)
    doc.setTextColor(...hexToRgb(COLORS.primary))
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
    doc.setTextColor(...hexToRgb(COLORS.secondary))
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
    doc.setTextColor(...hexToRgb(COLORS.secondary))
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
    doc.setTextColor(...hexToRgb(COLORS.success))
    doc.text("Completado", 190, 126, { align: "right" })

    // Volver al color normal
    doc.setTextColor(60)
    doc.text(transactionData.receiptId, 190, 134, { align: "right" })

    // Resumen
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.secondary))
    doc.text("Resumen", 15, 165)

    // Cuadro de resumen
    doc.setFillColor(...lightBlue)
    doc.roundedRect(15, 170, 180, 30, 3, 3, "F")

    doc.setFontSize(9)
    doc.setTextColor(60)

    doc.text("Monto Enviado:", 20, 178)
    doc.text("Monto Recibido:", 20, 186)

    doc.text(formatCurrency(transactionData.eurosReceived, "EUR"), 190, 178, { align: "right" })
    doc.text(formatCurrency(transactionData.bsDelivered, "VES"), 190, 186, { align: "right" })

    // Línea separadora en el resumen
    doc.setDrawColor(...hexToRgb(COLORS.primary))
    doc.line(20, 190, 190, 190)

    doc.setFontSize(10)
    doc.setTextColor(...hexToRgb(COLORS.primary))
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
    const result = generatePdfOutput(doc, options, undefined, undefined, `recibo-${transactionData.receiptId}`)

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

// Funciones auxiliares

/**
 * Convierte color hex a RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

// También necesitamos modificar la función formatDate para manejar objetos Date
function formatDate(dateString: string | Date): string {
  const date = dateString instanceof Date ? dateString : new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formatea un valor monetario
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calcula el resumen de las transacciones
 */
function calculateSummary(transactions: Transaction[]) {
  const totalEurosReceived = transactions.reduce((sum, t) => sum + t.eurosReceived, 0)
  const totalBsDelivered = transactions.reduce((sum, t) => sum + t.bsDelivered, 0)
  const totalProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0)
  const avgProfitPercentage =
    transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.profitPercentage || 0), 0) / transactions.length
      : 0

  return {
    totalEurosReceived,
    totalBsDelivered,
    totalProfit,
    avgProfitPercentage,
  }
}

/**
 * Añade el logo de la empresa al PDF
 */
async function addCompanyLogo(doc: jsPDF, logoUrl?: string): Promise<void> {
  if (!logoUrl) return

  try {
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous" // Importante para evitar problemas CORS

      img.onload = () => {
        try {
          // Calcular dimensiones para mantener la proporción
          const imgWidth = 30
          const imgHeight = (img.height * imgWidth) / img.width

          // Añadir la imagen al PDF
          doc.addImage(img, "PNG", 15, 15, imgWidth, imgHeight)
        } catch (error) {
          console.error("Error al añadir la imagen al PDF:", error)
        }
        resolve()
      }

      img.onerror = () => resolve()
      img.src = logoUrl

      // Si la imagen ya está en caché, el evento onload podría no dispararse
      if (img.complete) {
        try {
          const imgWidth = 30
          const imgHeight = (img.height * imgWidth) / img.width
          doc.addImage(img, "PNG", 15, 15, imgWidth, imgHeight)
        } catch (error) {
          console.error("Error al añadir la imagen al PDF (caché):", error)
        }
        resolve()
      }
    })
  } catch (error) {
    console.error("Error general al procesar el logo:", error)
  }
}

/**
 * Añade el encabezado al reporte
 */
async function addReportHeader(
  doc: jsPDF,
  companyInfo: CompanyInfo,
  startDate: string,
  endDate: string,
  modernDesign: boolean,
): Promise<void> {
  if (modernDesign) {
    // Añadir un rectángulo de color en la parte superior
    doc.setFillColor(...hexToRgb(COLORS.primary))
    doc.rect(0, 0, 210, 40, "F")

    // Añadir título del reporte en blanco
    doc.setFontSize(24)
    doc.setTextColor(255, 255, 255)
    doc.text("REPORTE FINANCIERO", 105, 20, { align: "center" })

    // Añadir período del reporte en blanco
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text(`Período: ${formatDate(startDate)} - ${formatDate(endDate)}`, 105, 30, { align: "center" })

    // Añadir logo si existe
    await addCompanyLogo(doc, companyInfo.logo)

    // Añadir información de la empresa en la parte inferior del encabezado
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(`${companyInfo.name} | ${companyInfo.address} | Tel: ${companyInfo.phone}`, 105, 37, { align: "center" })
  } else {
    // Diseño clásico
    // Añadir logo si existe
    await addCompanyLogo(doc, companyInfo.logo)

    // Añadir encabezado con información de la empresa
    doc.setFontSize(18)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text(companyInfo.name, 60, 20)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(companyInfo.address, 60, 25)
    doc.text(`Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`, 60, 30)
    doc.text(`NIF: ${companyInfo.taxId}`, 60, 35)

    // Añadir título del reporte
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb(COLORS.accent))
    doc.text("Reporte Financiero", 105, 50, { align: "center" })

    // Añadir período del reporte
    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(`Período: ${formatDate(startDate)} - ${formatDate(endDate)}`, 105, 58, { align: "center" })
  }
}

/**
 * Añade el resumen financiero al reporte
 */
function addFinancialSummary(
  doc: jsPDF,
  summary: ReturnType<typeof calculateSummary>,
  transactionCount: number,
  yPos: number,
  modernDesign: boolean,
): number {
  if (modernDesign) {
    // Título de sección
    doc.setFillColor(...hexToRgb(COLORS.light))
    doc.roundedRect(10, yPos, 190, 8, 2, 2, "F")
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text("RESUMEN FINANCIERO", 15, yPos + 5.5)

    yPos += 15

    // Crear tarjetas para cada métrica
    const cardWidth = 44
    const cardHeight = 30
    const cardGap = 4
    const startX = 10

    // Tarjeta 1: Total Transacciones
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(startX, yPos, cardWidth, cardHeight, 3, 3, "F")
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text("Total Transacciones", startX + cardWidth / 2, yPos + 8, { align: "center" })
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(COLORS.dark))
    doc.text(transactionCount.toString(), startX + cardWidth / 2, yPos + 20, { align: "center" })

    // Tarjeta 2: Euros Recibidos
    doc.setFillColor(240, 249, 255)
    doc.roundedRect(startX + cardWidth + cardGap, yPos, cardWidth, cardHeight, 3, 3, "F")
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text("Euros Recibidos", startX + cardWidth + cardGap + cardWidth / 2, yPos + 8, { align: "center" })
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text(`${summary.totalEurosReceived.toFixed(2)} €`, startX + cardWidth + cardGap + cardWidth / 2, yPos + 20, {
      align: "center",
    })

    // Tarjeta 3: Bs Entregados
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(startX + (cardWidth + cardGap) * 2, yPos, cardWidth, cardHeight, 3, 3, "F")
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text("Bs Entregados", startX + (cardWidth + cardGap) * 2 + cardWidth / 2, yPos + 8, { align: "center" })
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(COLORS.secondary))
    doc.text(
      `${summary.totalBsDelivered.toFixed(2)} Bs`,
      startX + (cardWidth + cardGap) * 2 + cardWidth / 2,
      yPos + 20,
      {
        align: "center",
      },
    )

    // Tarjeta 4: Beneficio Total
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(startX + (cardWidth + cardGap) * 3, yPos, cardWidth, cardHeight, 3, 3, "F")
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text("Beneficio Total", startX + (cardWidth + cardGap) * 3 + cardWidth / 2, yPos + 8, { align: "center" })
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(COLORS.success))
    doc.text(`${summary.totalProfit.toFixed(2)} €`, startX + (cardWidth + cardGap) * 3 + cardWidth / 2, yPos + 20, {
      align: "center",
    })

    return yPos + cardHeight + 10
  } else {
    // Diseño clásico para el resumen
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(15, yPos, 180, 30, 3, 3, "F")

    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text("Resumen Financiero", 20, yPos + 10)

    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.text(`Total Euros Recibidos: ${formatCurrency(summary.totalEurosReceived, "EUR")}`, 20, yPos + 17)
    doc.text(`Total Bs Entregados: ${formatCurrency(summary.totalBsDelivered, "VES")}`, 80, yPos + 17)
    doc.text(`Beneficio Total: ${formatCurrency(summary.totalProfit, "EUR")}`, 150, yPos + 17)
    doc.text(`Rentabilidad Promedio: ${summary.avgProfitPercentage.toFixed(2)}%`, 20, yPos + 24)

    return yPos + 40
  }
}

/**
 * Añade la tabla de transacciones al reporte
 */
function addTransactionsTable(doc: jsPDF, transactions: Transaction[], yPos: number, modernDesign: boolean): number {
  // Añadir título de sección
  if (modernDesign) {
    doc.setFillColor(...hexToRgb(COLORS.light))
    doc.roundedRect(10, yPos, 190, 8, 2, 2, "F")
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text("DETALLE DE TRANSACCIONES", 15, yPos + 5.5)
    yPos += 15
  } else {
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.secondary))
    doc.text("Detalle de Transacciones", 15, yPos)
    yPos += 10
  }

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
    // Configuración de estilo según el diseño
    const tableStyles = modernDesign
      ? {
          head: {
            fillColor: hexToRgb(COLORS.primary),
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: "bold" as const,
            fontSize: 8,
          },
          body: {
            fontSize: 8,
          },
          alternateRow: {
            fillColor: [245, 247, 250] as [number, number, number],
          },
        }
      : {
          head: {
            fillColor: hexToRgb(COLORS.primary) as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: "bold" as const,
          },
          alternateRow: {
            fillColor: [245, 247, 250] as [number, number, number],
          },
        }

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      theme: modernDesign ? "grid" : "striped",
      headStyles: tableStyles.head,
      bodyStyles: tableStyles.body,
      alternateRowStyles: tableStyles.alternateRow,
      margin: { top: 10, right: 15, bottom: 10, left: 15 },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [220, 220, 220] as [number, number, number],
        lineWidth: 0.1,
      },
    })

    // Actualizar la posición Y después de la tabla
    // @ts-ignore - Acceder a lastAutoTable que no está en la definición de tipos
    return doc.lastAutoTable.finalY + 10
  } else {
    // Si autoTable no está disponible, crear una tabla manual básica
    console.warn("autoTable no está disponible, creando tabla manual")
    const cellHeight = 8
    const cellPadding = 2

    // Encabezado
    doc.setFillColor(...hexToRgb(COLORS.primary))
    doc.setTextColor(255, 255, 255)
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

    return yPos + 10
  }
}

/**
 * Añade la sección de comparación al reporte
 */
function addComparisonSection(
  doc: jsPDF,
  summary: ReturnType<typeof calculateSummary>,
  comparisonData: any,
  yPos: number,
  modernDesign: boolean,
): number {
  // Verificar si necesitamos añadir una nueva página
  if (yPos > 230) {
    doc.addPage()
    yPos = 20
  }

  // Título de sección
  if (modernDesign) {
    doc.setFillColor(...hexToRgb(COLORS.light))
    doc.roundedRect(10, yPos, 190, 8, 2, 2, "F")
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.primary))
    doc.text("COMPARACIÓN CON PERÍODO ANTERIOR", 15, yPos + 5.5)
    yPos += 15
  } else {
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(COLORS.accent))
    doc.text("Comparación con Período Anterior", 15, yPos)
    yPos += 10
  }

  // Crear tabla de comparación
  const comparisonColumns = ["Métrica", "Período Actual", "Período Anterior", "Diferencia", "% Cambio"]

  // Calcular totales del período anterior
  const prevTotalEuros = comparisonData.totalEurosReceived || 0
  const prevTotalBs = comparisonData.totalBsDelivered || 0
  const prevTotalProfit = comparisonData.totalProfit || 0
  const prevTransactionCount = comparisonData.transactionCount || 0

  // Calcular diferencias
  const eurosDiff = summary.totalEurosReceived - prevTotalEuros
  const bsDiff = summary.totalBsDelivered - prevTotalBs
  const profitDiff = summary.totalProfit - prevTotalProfit
  const transactionDiff = comparisonData.currentTransactionCount - prevTransactionCount

  // Calcular porcentajes de cambio
  const eurosChangePercent = prevTotalEuros ? ((eurosDiff / prevTotalEuros) * 100).toFixed(2) : "N/A"
  const bsChangePercent = prevTotalBs ? ((bsDiff / prevTotalBs) * 100).toFixed(2) : "N/A"
  const profitChangePercent = prevTotalProfit ? ((profitDiff / prevTotalProfit) * 100).toFixed(2) : "N/A"
  const transactionChangePercent = prevTransactionCount
    ? ((transactionDiff / prevTransactionCount) * 100).toFixed(2)
    : "N/A"

  // Crear filas de comparación
  const comparisonRows = [
    [
      "Transacciones",
      comparisonData.currentTransactionCount.toString(),
      prevTransactionCount.toString(),
      transactionDiff.toString(),
      `${transactionChangePercent}%`,
    ],
    [
      "Euros Recibidos",
      formatCurrency(summary.totalEurosReceived, "EUR").replace("€", ""),
      formatCurrency(prevTotalEuros, "EUR").replace("€", ""),
      formatCurrency(eurosDiff, "EUR").replace("€", ""),
      `${eurosChangePercent}%`,
    ],
    [
      "Bs Entregados",
      formatCurrency(summary.totalBsDelivered, "VES").replace("VES", ""),
      formatCurrency(prevTotalBs, "VES").replace("VES", ""),
      formatCurrency(bsDiff, "VES").replace("VES", ""),
      `${bsChangePercent}%`,
    ],
    [
      "Beneficio",
      formatCurrency(summary.totalProfit, "EUR").replace("€", ""),
      formatCurrency(prevTotalProfit, "EUR").replace("€", ""),
      formatCurrency(profitDiff, "EUR").replace("€", ""),
      `${profitChangePercent}%`,
    ],
  ]

  // Añadir tabla de comparación
  if (typeof doc.autoTable === "function") {
    doc.autoTable({
      head: [comparisonColumns],
      body: comparisonRows,
      startY: yPos,
      theme: modernDesign ? "grid" : "striped",
      headStyles: {
        fillColor: hexToRgb(COLORS.accent),
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250] as [number, number, number],
      },
      margin: { top: 10, right: 15, bottom: 10, left: 15 },
      styles: {
        cellPadding: 3,
        lineColor: [220, 220, 220] as [number, number, number],
        lineWidth: 0.1,
      },
    })

    // @ts-ignore - Acceder a lastAutoTable que no está en la definición de tipos
    return doc.lastAutoTable.finalY + 10
  } else {
    // Implementación manual si autoTable no está disponible
    return yPos + 20
  }
}

/**
 * Añade el pie de página al reporte
 */
function addFooter(doc: jsPDF, companyInfo: CompanyInfo, modernDesign: boolean): void {
  const pageCount = doc.getNumberOfPages()

  // Añadir pie de página a todas las páginas
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    if (modernDesign) {
      // Línea separadora
      doc.setDrawColor(...hexToRgb(COLORS.primary))
      doc.setLineWidth(0.5)
      doc.line(10, 285, 200, 285)

      // Texto del pie de página
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(
        `Generado el ${new Date().toLocaleDateString("es-ES")} | ${companyInfo.name} | Página ${i} de ${pageCount}`,
        105,
        290,
        { align: "center" },
      )
    } else {
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Generado el ${new Date().toLocaleDateString("es-ES")} | Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      )
    }
  }
}

/**
 * Genera el resultado del PDF según el formato solicitado
 */
function generatePdfOutput(
  doc: jsPDF,
  options: PDFGenerationOptions,
  startDate?: string,
  endDate?: string,
  baseFilename?: string,
): PDFGenerationResult {
  let filename = options.filename

  if (!filename) {
    if (baseFilename) {
      filename = `${baseFilename}.pdf`
    } else if (startDate && endDate) {
      filename = `reporte-financiero-${startDate}-a-${endDate}.pdf`
    } else {
      filename = `documento-${new Date().toISOString().slice(0, 10)}.pdf`
    }
  }

  switch (options.outputFormat) {
    case "blob":
      const blob = doc.output("blob")
      return {
        success: true,
        data: blob,
        contentType: "application/pdf",
        filename,
      }
    case "arraybuffer":
      const buffer = doc.output("arraybuffer")
      return {
        success: true,
        data: buffer,
        contentType: "application/pdf",
        filename,
      }
    case "datauri":
    default:
      const dataUri = doc.output("datauristring")
      return {
        success: true,
        data: dataUri,
        contentType: "application/pdf",
        filename,
      }
  }
}

