"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { downloadFile } from "@/utils/pdf-service"
import { FileBarChart, Download, Calendar, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ReportGenerator() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { toast } = useToast()

  const validateDates = (): boolean => {
    if (!startDate || !endDate) {
      setError("Por favor, seleccione fechas de inicio y fin")
      return false
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError("Las fechas seleccionadas no son válidas")
      return false
    }

    if (start > end) {
      setError("La fecha de inicio no puede ser posterior a la fecha de fin")
      return false
    }

    setError(null)
    return true
  }

  const generateReport = async () => {
    // Limpiar estados previos
    setError(null)
    setSuccess(null)

    // Validar fechas
    if (!validateDates()) {
      return
    }

    setIsGenerating(true)

    try {
      console.log("Solicitando generación de reporte para fechas:", startDate, "a", endDate)

      // Realizar la solicitud al servidor
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      })

      console.log("Respuesta recibida, status:", response.status)

      // Verificar el tipo de contenido
      const contentType = response.headers.get("Content-Type")
      console.log("Tipo de contenido:", contentType)

      if (contentType && contentType.includes("application/pdf")) {
        // Es un PDF, descargarlo directamente
        console.log("Procesando respuesta como PDF binario")

        const blob = await response.blob()
        const filename = `reporte-financiero-${startDate}-a-${endDate}.pdf`

        // Usar la función de descarga del servicio PDF
        downloadFile(blob, filename, "application/pdf")

        setSuccess("El reporte ha sido generado y descargado correctamente")
        toast({
          title: "Reporte generado",
          description: "El reporte ha sido generado y descargado correctamente como PDF",
          duration: 5000,
        })
      } else {
        // No es un PDF, intentar procesar como JSON
        console.log("Procesando respuesta como JSON")

        const data = await response.json()
        console.log("Datos recibidos:", data)

        if (!response.ok) {
          throw new Error(data.error || "Error al generar el reporte")
        }

        if (data.success === false) {
          throw new Error(data.error || "Error al generar el reporte")
        }

        if (data.pdfDataUri) {
          // Verificar si es un PDF en base64
          if (data.pdfDataUri.startsWith("data:application/pdf;base64,")) {
            console.log("Descargando PDF desde dataURI")

            // Es un PDF en base64, descargarlo
            const filename = data.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`
            downloadFile(data.pdfDataUri, filename, "application/pdf")

            setSuccess("El reporte ha sido generado y descargado correctamente")
            toast({
              title: "Reporte generado",
              description: "El reporte ha sido generado y descargado correctamente como PDF",
              duration: 5000,
            })
          } else if (data.pdfDataUri.startsWith("data:application/json;base64,")) {
            console.log("Recibido JSON en lugar de PDF, intentando procesar")

            // Es un JSON, mostrar mensaje al usuario
            toast({
              title: "Formato alternativo",
              description: "Se ha generado una versión simplificada del reporte en formato JSON",
              duration: 5000,
            })

            // Descargar como JSON
            const filename = data.filename || `reporte-financiero-${startDate}-a-${endDate}.json`
            downloadFile(data.pdfDataUri, filename, "application/json")

            setSuccess("Se ha generado una versión simplificada del reporte")
          } else {
            console.log("Formato de datos no reconocido")

            // Formato desconocido, intentar descargar de todos modos
            const filename = data.filename || `reporte-financiero-${startDate}-a-${endDate}.pdf`
            downloadFile(data.pdfDataUri, filename)

            setSuccess("El reporte ha sido generado en un formato alternativo")
            toast({
              title: "Formato alternativo",
              description: "El reporte ha sido generado en un formato alternativo",
              duration: 5000,
            })
          }
        } else {
          throw new Error("No se recibieron datos del reporte")
        }
      }
    } catch (error) {
      console.error("Error al generar el reporte:", error)

      setError(error instanceof Error ? error.message : "Error al generar el reporte")

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar el reporte",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-t-4 border-t-blue-500 shadow-md">
      <CardHeader className="bg-gradient-to-b from-blue-500/10 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-blue-500" />
          Generador de Reportes Financieros
        </CardTitle>
        <CardDescription>Genere reportes financieros detallados para períodos específicos</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4 bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Éxito</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Fecha de Inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-blue-200 focus-visible:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Fecha de Fin
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-blue-200 focus-visible:ring-blue-500"
              />
            </div>

            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-500 to-primary hover:from-blue-600 hover:to-primary/90"
            >
              {isGenerating ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generando Reporte...
                </div>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generar y Descargar Reporte
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 shadow-inner">
            <h3 className="text-lg font-medium mb-2 text-purple-600 dark:text-purple-400">
              Información Incluida en el Reporte
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="bg-primary/20 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Resumen financiero con totales de euros, bolívares y beneficios</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/20 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Rentabilidad promedio del período seleccionado</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/20 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Listado detallado de todas las transacciones en el período</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/20 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Información de clientes y detalles de cada transacción</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/20 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Formato PDF profesional con la información de su empresa</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

