import { google } from "googleapis"

const sheets = google.sheets("v4")

// Asegúrate de configurar estas variables de entorno en tu proyecto de Vercel
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID

const jwtClient = new google.auth.JWT(GOOGLE_CLIENT_EMAIL, undefined, GOOGLE_PRIVATE_KEY, [
  "https://www.googleapis.com/auth/spreadsheets",
])

export async function addTransactionToGoogleSheets(transaction: any) {
  try {
    await jwtClient.authorize()

    const result = await sheets.spreadsheets.values.append({
      auth: jwtClient,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Transacciones!A:K", // Ajusta esto según tu hoja de cálculo
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
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
          ],
        ],
      },
    })

    console.log("Transacción añadida a Google Sheets:", result.data)
    return result
  } catch (error) {
    console.error("Error al añadir la transacción a Google Sheets:", error)
    throw error
  }
}

