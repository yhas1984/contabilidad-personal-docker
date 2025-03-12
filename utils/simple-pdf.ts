import { jsPDF } from "jspdf"

/**
 * Genera un PDF simple para un recibo
 */
export function generateSimplePDF(
  receiptId: string,
  clientName: string,
  date: string | Date,
  eurosReceived: number,
  bsDelivered: number,
  exchangeRate: number,
): string {
  try {
    // Crear un nuevo documento PDF
    const doc = new jsPDF()

    // Formatear fecha
    const formattedDate = new Date(date).toLocaleDateString()

    // Formatear números
    const formatNumber = (num: number) => num.toFixed(2).replace(".", ",")

    // Añadir título
    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text("RECIBO DE TRANSACCIÓN", 105, 20, { align: "center" })

    // Añadir información del recibo
    doc.setFontSize(12)
    doc.text(`Recibo #: ${receiptId}`, 20, 40)
    doc.text(`Fecha: ${formattedDate}`, 20, 50)
    doc.text(`Cliente: ${clientName}`, 20, 60)

    // Añadir línea separadora
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 70, 190, 70)

    // Añadir detalles de la transacción
    doc.setFontSize(14)
    doc.text("Detalles de la Transacción", 105, 85, { align: "center" })

    doc.setFontSize(12)
    doc.text(`Euros Recibidos: ${formatNumber(eurosReceived)} €`, 60, 100)
    doc.text(`Bolívares Entregados: ${formatNumber(bsDelivered)} Bs`, 60, 110)
    doc.text(`Tasa de Cambio: ${formatNumber(exchangeRate)} Bs/€`, 60, 120)

    // Añadir pie de página
    doc.setFontSize(10)
    doc.text(`Generado el ${new Date().toLocaleString()}`, 105, 180, { align: "center" })
    doc.text("Tu Envío Express", 105, 190, { align: "center" })

    // Convertir a data URI
    return doc.output("datauristring")
  } catch (error) {
    console.error("Error al generar PDF simple:", error)
    throw new Error(`Error al generar PDF simple: ${error instanceof Error ? error.message : String(error)}`)
  }
}

