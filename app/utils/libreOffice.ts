import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"

const EXCEL_FILE_PATH = path.join(process.cwd(), "transacciones.xlsx")

export async function addTransactionToLibreOffice(transaction: any) {
  let workbook: XLSX.WorkBook

  if (fs.existsSync(EXCEL_FILE_PATH)) {
    workbook = XLSX.readFile(EXCEL_FILE_PATH)
  } else {
    workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          "Fecha",
          "Cliente ID",
          "Euros Recibidos",
          "Bolívares Entregados",
          "Costo (€)",
          "Tasa de Cambio",
          "Ganancia (€)",
          "% Ganancia",
          "ID de Recibo",
          "Timestamp",
          "Dirección IP",
        ],
      ]),
      "Transacciones",
    )
  }

  const sheet = workbook.Sheets["Transacciones"]

  const newRow = [
    transaction.date,
    transaction.clientId,
    transaction.eurosReceived,
    transaction.bsDelivered,
    transaction.bsCost,
    transaction.exchangeRate,
    transaction.profit,
    transaction.profitPercentage,
    transaction.receiptId,
    transaction.timestamp,
    transaction.ipAddress,
  ]

  XLSX.utils.sheet_add_aoa(sheet, [newRow], { origin: -1 })

  XLSX.writeFile(workbook, EXCEL_FILE_PATH)
}

