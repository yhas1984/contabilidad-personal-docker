"use client"

import { Button } from "@/components/ui/button"
import { Download, Printer, Share2, Mail } from "lucide-react"
import { generateReceiptPDF } from "@/utils/pdfGenerator"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { downloadPDF } from "@/utils/download-pdf"

export function ReceiptView({ transaction, companyInfo, selectedTransaction, setSelectedTransaction }: any) {
  const { toast } = useToast()
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Estado para la fecha/hora actual
  const [currentDateTime, setCurrentDateTime] = useState<string>("")

  // Actualizar la fecha/hora solo en el cliente
  useEffect(() => {
    setCurrentDateTime(`${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`)
  }, [])

  if (!transaction || !companyInfo) {
    return <div className="text-center py-10">No se encontró el recibo</div>
  }

  // Asegurarnos de que el cliente tenga todas las propiedades requeridas
  const client = {
    id: transaction.client.id,
    name: transaction.client.name,
    email: transaction.client.email,
    dni: transaction.client.dni || "",
    phone: transaction.client.phone || "",
    address: transaction.client.address || "",
    city: transaction.client.city || "",
    postalCode: transaction.client.postalCode || "",
    country: transaction.client.country || "España",
    notes: transaction.client.notes || "",
  }

  // Generar el PDF
  const handleDownload = async () => {
    if (!transaction || !companyInfo) return

    try {
      const pdfDataUri = await generateReceiptPDF(companyInfo, client, {
        receiptId: transaction.receiptId,
        date: transaction.date,
        eurosReceived: transaction.eurosReceived,
        bsDelivered: transaction.bsDelivered,
        exchangeRate: transaction.exchangeRate,
        timestamp: transaction.timestamp || new Date().toISOString(),
        profit: transaction.profit,
        profitPercentage: transaction.profitPercentage,
      })

      // Solo descargar el PDF
      downloadPDF(pdfDataUri, `recibo-${transaction.receiptId}.pdf`)

      toast({
        title: "PDF generado",
        description: "El recibo ha sido generado y descargado correctamente",
        duration: 5000,
      })
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      toast({
        title: "Error",
        description: "Hubo un error al generar el PDF",
        variant: "destructive",
      })
    }
  }

  const handleSendEmail = async () => {
    if (!transaction || !companyInfo) return

    setIsSendingEmail(true)
    try {
      // Generar el PDF
      const pdfDataUri = await generateReceiptPDF(companyInfo, client, {
        receiptId: transaction.receiptId,
        date: transaction.date,
        eurosReceived: transaction.eurosReceived,
        bsDelivered: transaction.bsDelivered,
        exchangeRate: transaction.exchangeRate,
        timestamp: transaction.timestamp || new Date().toISOString(),
        profit: transaction.profit,
        profitPercentage: transaction.profitPercentage,
      })

      // Enviar el correo con el PDF adjunto
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptId: transaction.receiptId,
          pdfDataUri,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al enviar el correo")
      }

      // Mostrar notificación de éxito
      toast({
        title: "Correo enviado",
        description: `Recibo enviado correctamente a ${client.email}`,
        variant: "success",
      })

      // Actualizar el estado de envío en la interfaz
      if (selectedTransaction) {
        setSelectedTransaction({
          ...selectedTransaction,
          emailSent: true,
        })
      }
    } catch (error) {
      console.error("Error al enviar el recibo por correo:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al enviar el recibo por correo",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Imprimir el recibo
  const handlePrint = () => {
    window.print()
  }

  // Compartir el recibo
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recibo #${transaction.receiptId}`,
          text: `Recibo de transacción por ${transaction.eurosReceived}€ a ${transaction.bsDelivered}Bs`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error al compartir:", error)
      }
    } else {
      // Copiar al portapapeles si Web Share API no está disponible
      navigator.clipboard.writeText(window.location.href)
      alert("Enlace copiado al portapapeles")
    }
  }

  // Formatear números como moneda
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md print:shadow-none">
      {/* Cabecera con acciones */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Recibo #{transaction.receiptId}</h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
            <Printer size={16} />
            Imprimir
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex items-center gap-2">
            <Share2 size={16} />
            Compartir
          </Button>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download size={16} />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Contenido del recibo */}
      <div className="border rounded-lg overflow-hidden print:border-none">
        {/* Encabezado del recibo */}
        <div className="bg-gray-50 p-6 border-b print:bg-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {companyInfo.logo && (
                <img
                  src={companyInfo.logo || "/placeholder.svg"}
                  alt={companyInfo.name}
                  className="h-16 w-auto object-contain"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-800">{companyInfo.name}</h2>
                <p className="text-gray-600 text-sm">{companyInfo.address}</p>
                <p className="text-gray-600 text-sm">
                  Tel: {companyInfo.phone} | Email: {companyInfo.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block border border-blue-200 rounded px-3 py-1 bg-blue-50 text-blue-700">
                <p className="font-medium">Recibo #{transaction.receiptId}</p>
                <p className="text-sm">Fecha: {new Date(transaction.date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cuerpo del recibo */}
        <div className="p-6">
          {/* Información del cliente */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-gray-600">Email: {client.email}</p>
                {client.phone && <p className="text-gray-600">Tel: {client.phone}</p>}
              </div>
              <div>
                {client.dni && <p className="text-gray-600">DNI/NIE: {client.dni}</p>}
                {client.address && (
                  <p className="text-gray-600">
                    Dirección: {client.address}
                    {client.city && `, ${client.city}`}
                    {client.postalCode && ` ${client.postalCode}`}
                    {client.country && `, ${client.country}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detalles de la transacción */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Detalles de la Transacción</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Euros Recibidos:</span>
                  <span className="font-medium">{formatCurrency(transaction.eurosReceived, "EUR")}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Bolívares Entregados:</span>
                  <span className="font-medium">{formatCurrency(transaction.bsDelivered, "VES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tasa de Cambio:</span>
                  <span className="font-medium">{transaction.exchangeRate.toFixed(2)} Bs/€</span>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Método de Pago:</span>
                  <span className="font-medium">Transferencia Bancaria</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium text-green-600">Completado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Referencia:</span>
                  <span className="font-medium">{transaction.receiptId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen y notas */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Resumen</h3>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Monto Enviado:</span>
                <span className="font-medium">{formatCurrency(transaction.eurosReceived, "EUR")}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Monto Recibido:</span>
                <span className="font-medium">{formatCurrency(transaction.bsDelivered, "VES")}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="font-medium text-gray-700">Tasa de Cambio Aplicada:</span>
                <span className="font-bold">{transaction.exchangeRate.toFixed(2)} Bs/€</span>
              </div>
            </div>
          </div>

          {/* Términos y condiciones */}
          <div className="text-xs text-gray-500 mt-8 border-t pt-4">
            <p className="mb-1">
              <strong>Términos y Condiciones:</strong> Este recibo es un comprobante de la transacción realizada. La
              empresa no se hace responsable por información incorrecta proporcionada por el cliente.
            </p>
            <p>
              Para cualquier consulta relacionada con esta transacción, por favor contacte a nuestro servicio de
              atención al cliente mencionando el número de recibo.
            </p>
          </div>
        </div>

        {/* Pie de página */}
        <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 border-t print:bg-white">
          <p>Este recibo fue generado el {currentDateTime || "Cargando..."}</p>
          <p>
            ID de Transacción: {transaction.id} | IP: {transaction.ipAddress}
          </p>
          <p className="mt-1">
            © {new Date().getFullYear()} {companyInfo.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          onClick={handleDownload}
          className="w-full bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-500"
        >
          <Download className="mr-2 h-4 w-4" />
          Generar y Descargar Recibo PDF
        </Button>

        <Button onClick={handleSendEmail} disabled={isSendingEmail} className="w-full bg-blue-500 hover:bg-blue-600">
          {isSendingEmail ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
              Enviando...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Recibo por Email
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

