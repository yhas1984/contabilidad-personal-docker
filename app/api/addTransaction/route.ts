import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(req: Request) {
  const transaction = await req.json()

  // Crear un nuevo libro de trabajo
  const workbook = XLSX.utils.book_new()

  // Crear una nueva hoja
  const worksheet = XLSX.utils.json_to_sheet([transaction])

  // Añadir la hoja al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones")

  // Convertir el libro a un array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

  // Convertir el array buffer a un Blob
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

  // Convertir el Blob a una cadena base64
  const reader = new FileReader()
  reader.readAsDataURL(blob)

  return new Promise<Response>((resolve) => {
    reader.onloadend = () => {
      const base64data = reader.result as string
      resolve(NextResponse.json({ fileContent: base64data }))
    }
  })
}
