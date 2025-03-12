import { jsPDF } from "jspdf"
import "jspdf-autotable"
import type { UserOptions } from "jspdf-autotable"

// Add the missing type declaration for jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF
  }
}

// Verificar si estamos en el navegador o en el servidor
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

// Función para generar el PDF del recibo - Solo para el navegador
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
) {
  // Crear un nuevo documento PDF
  const doc = new jsPDF()

  // Configurar colores
  const primaryColor = [59, 130, 246] // Azul
  const secondaryColor = [16, 185, 129] // Verde
  const accentColor = [139, 92, 246] // Púrpura
  const lightBlue = [239, 246, 255] // Fondo azul claro

  // Formatear números como moneda
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Formatear fecha
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Añadir logo si existe (con tamaño reducido) - Solo en el navegador
  if (companyInfo.logo && isBrowser) {
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
  doc.text(`Fecha: ${formatDate(transactionData.date)}`, 168, 34, { align: "center" })

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

  // Añadir metadatos al PDF para mejorar la compatibilidad
  doc.setProperties({
    title: `Recibo ${transactionData.receiptId}`,
    subject: `Recibo de transacción - ${formatDate(transactionData.date)}`,
    author: companyInfo.name,
    keywords: "recibo, transacción, envío",
    creator: "Tu Envío Express",
  })

  // Asegurar que el PDF se finalice correctamente
  try {
    // Convertir el PDF a una cadena base64 con el formato correcto
    const pdfOutput = doc.output("datauristring")

    // Verificar que el PDF tenga un tamaño razonable
    const base64Data = pdfOutput.split(",")[1]
    const pdfSize = base64Data.length * 0.75 // Estimación aproximada del tamaño en bytes

    console.log(`PDF generado correctamente. Tamaño aproximado: ${Math.round(pdfSize / 1024)} KB`)
    console.log(`Formato del data URI: ${pdfOutput.substring(0, 50)}...`)

    if (pdfSize < 1000) {
      console.warn("Advertencia: El PDF generado es muy pequeño, podría estar incompleto")
    }

    return pdfOutput
  } catch (error) {
    console.error("Error al generar el PDF:", error)
    throw new Error(`Error al generar el PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Función para generar un reporte financiero - Versión para cliente y servidor
export async function generateFinancialReport(
  companyInfo: any,
  transactions: any[],
  startDate: string,
  endDate: string,
): Promise<string> {
  console.log("Entorno de ejecución:", isBrowser ? "Navegador" : "Servidor")

  // Crear un objeto JSON con los datos del reporte (para servidor)
  const createJSONReport = () => {
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

    // Convertir a base64 para simular un PDF
    const jsonString = JSON.stringify(reportData)
    const base64Data = isBrowser ? btoa(jsonString) : Buffer.from(jsonString).toString("base64")

    return `data:application/json;base64,${base64Data}`
  }

  // Si estamos en el servidor, devolver el formato JSON
  if (!isBrowser) {
    console.log("Generando reporte en formato JSON (servidor)")
    return createJSONReport()
  }

  // IMPORTANTE: Estamos en el navegador, verificamos que jsPDF y autoTable estén disponibles
  if (typeof jsPDF === "undefined") {
    console.error("jsPDF no está disponible en este entorno")
    return createJSONReport()
  }

  try {
    console.log("Generando reporte en formato PDF (navegador)")
    // Si estamos en el navegador, generar el PDF real
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

    // Convertir el PDF a una cadena base64
    const pdfOutput = doc.output("datauristring")
    console.log("PDF generado exitosamente con URI que comienza con:", pdfOutput.substring(0, 50) + "...")
    return pdfOutput
  } catch (error) {
    console.error("Error al generar el PDF en el navegador:", error)
    // Si falla la generación del PDF, devolver el formato JSON como respaldo
    return createJSONReport()
  }
}

// Función para descargar un PDF (que se estaba importando en app/page.tsx y components/ReportGenerator.tsx)
export function downloadPDF(dataUri: string | Promise<string>, filename: string) {
  // Esta función solo debe ejecutarse en el navegador
  if (!isBrowser) {
    console.error("La función downloadPDF solo puede ser utilizada en el navegador")
    return
  }

  // Si dataUri es una promesa, esperar a que se resuelva
  if (dataUri instanceof Promise) {
    dataUri
      .then((resolvedDataUri) => {
        const link = document.createElement("a")
        link.href = resolvedDataUri
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
      .catch((error) => {
        console.error("Error al descargar el PDF:", error)
      })
  } else {
    // Si dataUri es una cadena, proceder normalmente
    const link = document.createElement("a")
    link.href = dataUri
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

