"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"
import { CompanyForm } from "@/components/CompanyForm"
import { ClientManager } from "@/components/ClientManager"
import { generateReceiptPDF, downloadPDF } from "@/utils/pdfGenerator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { CreditCard, Users, Settings, FileText, FileBarChart, Check, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'

interface Client {
  id: number
  name: string
  email: string
  dni?: string
  phone?: string
  address?: string
}

interface CompanyInfo {
  id?: number
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  logo?: string
}

interface Transaction {
  id: number
  date: string
  clientId: number
  eurosReceived: number
  bsDelivered: number
  bsCost: number
  exchangeRate: number
  profit: number
  profitPercentage: number
  ipAddress: string
  timestamp: string
  receiptId: string
  client: Client
}

export default function ContabilidadPersonal() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [eurosReceived, setEurosReceived] = useState("")
  const [bsDelivered, setBsDelivered] = useState("")
  const [bsCost, setBsCost] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  useEffect(() => {
    fetchClients()
    fetchTransactions()
    fetchCompanyInfo()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients")
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      } else {
        console.error("Error al obtener clientes")
      }
    } catch (error) {
      console.error("Error al obtener clientes:", error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions")
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      } else {
        console.error("Error al obtener transacciones")
      }
    } catch (error) {
      console.error("Error al obtener transacciones:", error)
    }
  }

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch("/api/company")
      if (response.ok) {
        const data = await response.json()
        setCompanyInfo(data)
      }
    } catch (error) {
      console.error("Error al obtener información de la empresa:", error)
    }
  }

  const addTransaction = async () => {
    if (!selectedClientId || !companyInfo) {
      alert("Por favor, seleccione un cliente y asegúrese de que la información de la empresa esté configurada.")
      return
    }

    const eurosAmount = Number.parseFloat(eurosReceived)
    const bsAmount = Number.parseFloat(bsDelivered)
    const bsCostAmount = Number.parseFloat(bsCost)
    const profit = eurosAmount - bsCostAmount
    const profitPercentage = (profit / bsCostAmount) * 100
    const receiptId = generateReceiptId()
    const timestamp = new Date().toISOString()

    const newTransaction = {
      date: timestamp,
      clientId: selectedClientId,
      eurosReceived: eurosAmount,
      bsDelivered: bsAmount,
      bsCost: bsCostAmount,
      exchangeRate: bsAmount / eurosAmount,
      profit: profit,
      profitPercentage: profitPercentage,
      ipAddress: generateRandomIP(),
      timestamp: timestamp,
      receiptId: receiptId,
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTransaction),
      })

      if (response.ok) {
        const createdTransaction = await response.json()
        setTransactions([...transactions, createdTransaction])

        // Generamos el PDF
        setIsGeneratingPDF(true)
        try {
          const client = clients.find((c) => c.id === selectedClientId)!

          // Generamos el PDF
          const pdfDataUri = await generateReceiptPDF(companyInfo, client, {
            receiptId,
            date: newTransaction.date,
            eurosReceived: eurosAmount,
            bsDelivered: bsAmount,
            exchangeRate: bsAmount / eurosAmount,
            timestamp: newTransaction.timestamp,
          })

          // Descargamos el PDF
          downloadPDF(pdfDataUri, `recibo-${receiptId}.pdf`)

          alert(`Transacción creada exitosamente. El recibo ha sido generado y descargado.`)
        } catch (error) {
          console.error("Error al generar el PDF:", error)
          alert("La transacción se ha registrado, pero hubo un error al generar el PDF.")
        } finally {
          setIsGeneratingPDF(false)
        }

        // Limpiamos el formulario
        setEurosReceived("")
        setBsDelivered("")
        setBsCost("")
        setSelectedClientId(null)
      } else {
        console.error("Error al crear la transacción")
        alert("Error al crear la transacción")
      }
    } catch (error) {
      console.error("Error al procesar la transacción:", error)
      alert("Error al procesar la transacción")
    }
  }

  const calculateTotals = () => {
    const totalEuros = transactions.reduce((sum, t) => sum + t.eurosReceived, 0)
    const totalBs = transactions.reduce((sum, t) => sum + t.bsDelivered, 0)
    const totalProfit = transactions.reduce((sum, t) => sum + t.profit, 0)
    const totalCost = transactions.reduce((sum, t) => sum + t.bsCost, 0)
    const averageRate = totalBs / totalEuros || 0
    const overallProfitPercentage = (totalProfit / totalCost) * 100 || 0
    return { totalEuros, totalBs, totalProfit, averageRate, overallProfitPercentage }
  }

  const { totalEuros, totalBs, totalProfit, averageRate, overallProfitPercentage } = calculateTotals()

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.dni && client.dni.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const generateRandomIP = () => {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
  }

  const generateReceiptId = () => {
    return `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }

  const generatePDFForTransaction = async (transaction: Transaction) => {
    if (!companyInfo) {
      alert("Por favor, configure la información de la empresa primero.")
      return
    }

    const client = clients.find((c) => c.id === transaction.clientId)!

    try {
      const pdfDataUri = await generateReceiptPDF(companyInfo, client, {
        receiptId: transaction.receiptId,
        date: transaction.date,
        eurosReceived: transaction.eurosReceived,
        bsDelivered: transaction.bsDelivered,
        exchangeRate: transaction.exchangeRate,
        timestamp: transaction.timestamp,
      })

      downloadPDF(pdfDataUri, `recibo-${transaction.receiptId}.pdf`)
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      alert("Hubo un error al generar el PDF.")
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-primary">Contabilidad Personal - Cambio de Divisas</h1>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="tabs-list grid w-full grid-cols-4">
          <TabsTrigger value="transactions" className="tabs-trigger">
            <CreditCard className="mr-2 h-4 w-4" />
            Transacciones
          </TabsTrigger>
          <TabsTrigger value="clients" className="tabs-trigger">
            <Users className="mr-2 h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="reports" className="tabs-trigger">
            <FileBarChart className="mr-2 h-4 w-4" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="settings" className="tabs-trigger">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="border-l-4 border-l-primary shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Agregar Transacción
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="clientSearch">Buscar Cliente</Label>
                    <Input
                      id="clientSearch"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nombre, email, DNI o teléfono"
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="clientSelect">Seleccionar Cliente</Label>
                    <Select onValueChange={(value) => setSelectedClientId(Number(value))}>
                      <SelectTrigger className="border-primary/20">
                        <SelectValue placeholder="Seleccione un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}{" "}
                            {client.dni ? `(${client.dni})` : client.phone ? `(${client.phone})` : `(${client.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="eurosReceived">Euros Recibidos</Label>
                    <Input
                      id="eurosReceived"
                      value={eurosReceived}
                      onChange={(e) => setEurosReceived(e.target.value)}
                      type="number"
                      placeholder="Cantidad en Euros"
                      className="border-blue-200 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="bsDelivered">Bolívares Entregados</Label>
                    <Input
                      id="bsDelivered"
                      value={bsDelivered}
                      onChange={(e) => setBsDelivered(e.target.value)}
                      type="number"
                      placeholder="Cantidad en Bolívares"
                      className="border-green-200 focus-visible:ring-green-500"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="bsCost">Costo de Bolívares (en Euros)</Label>
                    <Input
                      id="bsCost"
                      value={bsCost}
                      onChange={(e) => setBsCost(e.target.value)}
                      type="number"
                      placeholder="Costo en Euros"
                      className="border-amber-200 focus-visible:ring-amber-500"
                    />
                  </div>
                  <Button
                    onClick={addTransaction}
                    disabled={isGeneratingPDF}
                    className="bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-500"
                  >
                    {isGeneratingPDF ? "Generando PDF..." : "Agregar Transacción"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Resumen
                </CardTitle>
                <CardDescription>Totales, promedio de tasa de cambio y ganancias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Euros</p>
                      <p className="text-xl font-bold">{totalEuros.toFixed(2)} €</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400">Total Bolívares</p>
                      <p className="text-xl font-bold">{totalBs.toFixed(2)} Bs</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">Tasa de Cambio Promedio</p>
                    <p className="text-xl font-bold">{averageRate.toFixed(2)} Bs/€</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Ganancia Total</p>
                      <p className="text-xl font-bold flex items-center">
                        {totalProfit.toFixed(2)} €
                        <ArrowUp className="h-4 w-4 ml-1 text-emerald-500" />
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
                      <p className="text-sm text-purple-600 dark:text-purple-400">% Ganancia</p>
                      <p className="text-xl font-bold flex items-center">
                        {overallProfitPercentage.toFixed(2)}%
                        {overallProfitPercentage > 0 ? (
                          <ArrowUp className="h-4 w-4 ml-1 text-emerald-500" />
                        ) : (
                          <ArrowDown className="h-4 w-4 ml-1 text-red-500" />
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <Link
                      href="/reports"
                      className="flex items-center text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generar Reporte Financiero
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-t-4 border-t-purple-500 shadow-md">
            <CardHeader className="bg-gradient-to-b from-purple-500/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Historial de Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left p-2 rounded-tl-md">Fecha</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Euros Recibidos</th>
                      <th className="text-left p-2">Bolívares Entregados</th>
                      <th className="text-left p-2">Tasa de Cambio</th>
                      <th className="text-left p-2">Costo (€)</th>
                      <th className="text-left p-2">Ganancia (€)</th>
                      <th className="text-left p-2">% Ganancia</th>
                      <th className="text-left p-2 rounded-tr-md">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, index) => (
                      <tr
                        key={t.id}
                        className={`border-b hover:bg-muted/30 transition-colors ${
                          index % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-muted/20"
                        }`}
                      >
                        <td className="p-2">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="p-2 font-medium">{t.client.name}</td>
                        <td className="p-2 text-blue-600 dark:text-blue-400">{t.eurosReceived.toFixed(2)} €</td>
                        <td className="p-2 text-green-600 dark:text-green-400">{t.bsDelivered.toFixed(2)} Bs</td>
                        <td className="p-2 text-amber-600 dark:text-amber-400">{t.exchangeRate.toFixed(2)} Bs/€</td>
                        <td className="p-2">{t.bsCost.toFixed(2)} €</td>
                        <td
                          className={`p-2 ${t.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {t.profit.toFixed(2)} €
                        </td>
                        <td
                          className={`p-2 ${t.profitPercentage > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {t.profitPercentage.toFixed(2)}%
                        </td>
                        <td className="p-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                onClick={() => setSelectedTransaction(t)}
                                className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                              >
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle className="text-primary">Detalles de la Transacción</DialogTitle>
                                <DialogDescription>Información detallada y opciones de recibo</DialogDescription>
                              </DialogHeader>
                              {selectedTransaction && (
                                <div className="grid gap-4 py-4">
                                  <div className="bg-primary/5 p-3 rounded-lg">
                                    <p className="font-medium text-primary">
                                      ID de Recibo: {selectedTransaction.receiptId}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Fecha y Hora: {new Date(selectedTransaction.timestamp).toLocaleString()}
                                    </p>
                                  </div>

                                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                                    <p className="font-medium text-blue-600 dark:text-blue-400">
                                      Cliente: {selectedTransaction.client.name}
                                    </p>
                                    {selectedTransaction.client.dni && (
                                      <p className="text-sm">DNI: {selectedTransaction.client.dni}</p>
                                    )}
                                    {selectedTransaction.client.phone && (
                                      <p className="text-sm">Teléfono: {selectedTransaction.client.phone}</p>
                                    )}
                                    <p className="text-sm">Email: {selectedTransaction.client.email}</p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                                      <p className="text-sm text-green-600 dark:text-green-400">Euros Recibidos</p>
                                      <p className="font-medium">{selectedTransaction.eurosReceived.toFixed(2)} €</p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                                      <p className="text-sm text-amber-600 dark:text-amber-400">Bolívares Entregados</p>
                                      <p className="font-medium">{selectedTransaction.bsDelivered.toFixed(2)} Bs</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
                                      <p className="text-sm text-purple-600 dark:text-purple-400">Tasa de Cambio</p>
                                      <p className="font-medium">{selectedTransaction.exchangeRate.toFixed(2)} Bs/€</p>
                                    </div>
                                    <div
                                      className={`p-3 rounded-lg ${
                                        selectedTransaction.profit > 0
                                          ? "bg-emerald-50 dark:bg-emerald-950/30"
                                          : "bg-red-50 dark:bg-red-950/30"
                                      }`}
                                    >
                                      <p
                                        className={`text-sm ${
                                          selectedTransaction.profit > 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        Ganancia
                                      </p>
                                      <p className="font-medium flex items-center">
                                        {selectedTransaction.profit.toFixed(2)} € (
                                        {selectedTransaction.profitPercentage.toFixed(2)}%)
                                        {selectedTransaction.profit > 0 ? (
                                          <ArrowUp className="h-4 w-4 ml-1 text-emerald-500" />
                                        ) : (
                                          <ArrowDown className="h-4 w-4 ml-1 text-red-500" />
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <p className="text-sm text-muted-foreground">
                                    Dirección IP: {selectedTransaction.ipAddress}
                                  </p>

                                  <div className="mt-4">
                                    <Button
                                      onClick={() => generatePDFForTransaction(selectedTransaction)}
                                      className="w-full bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-500"
                                    >
                                      Generar y Descargar Recibo PDF
                                    </Button>
                                  </div>

                                  <div className="mt-4 bg-muted/20 p-4 rounded-lg flex flex-col items-center">
                                    <p className="text-sm font-medium mb-2">Código QR del Recibo:</p>
                                    <QRCodeSVG
                                      value={`${window.location.origin}/receipt/${selectedTransaction.receiptId}`}
                                      className="mt-2 border-4 border-white dark:border-gray-800 rounded-lg p-1 bg-white"
                                      size={150}
                                    />
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientManager />
        </TabsContent>

        <TabsContent value="reports" className="tabs-content mt-6">
          <Card className="dashboard-card border-t-4 border-t-blue-500 shadow-md">
            <CardHeader className="dashboard-card-header bg-gradient-to-b from-blue-500/10 to-transparent">
              <CardTitle className="dashboard-card-title">
                <FileBarChart className="h-5 w-5 mr-2 inline-block text-blue-500" />
                Reportes Financieros
              </CardTitle>
              <CardDescription className="dashboard-card-description">
                Genera informes detallados para auditorías y análisis
              </CardDescription>
            </CardHeader>
            <CardContent className="dashboard-card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-blue-600 dark:text-blue-400">Reportes Disponibles</h3>
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      onClick={() => (window.location.href = "/reports")}
                    >
                      <FileBarChart className="mr-2 h-4 w-4" />
                      Reporte Financiero Completo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Genera reportes financieros detallados con información completa de transacciones, ganancias y
                      estadísticas para períodos específicos.
                    </p>
                  </div>
                </div>
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 shadow-inner">
                  <h3 className="text-lg font-medium mb-2 text-purple-600 dark:text-purple-400">
                    Características de los Reportes
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="bg-primary/20 text-primary rounded-full p-1 mr-2">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Resumen financiero con totales y promedios</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/20 text-primary rounded-full p-1 mr-2">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Listado detallado de todas las transacciones</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/20 text-primary rounded-full p-1 mr-2">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Verificación mediante hash para auditorías</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/20 text-primary rounded-full p-1 mr-2">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Exportación en formato PDF profesional</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            <CompanyForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
