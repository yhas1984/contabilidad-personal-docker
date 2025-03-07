"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Search, FileText, RefreshCw } from "lucide-react"

interface Transaction {
  id: string
  receiptId: string
  date: string
  eurosReceived: number
  bsDelivered: number
  client: {
    name: string
  }
}

export default function ReceiptsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/receipts")
      if (!response.ok) {
        throw new Error("Error al cargar los recibos")
      }
      const data = await response.json()
      setTransactions(
        data.map((item: any) => ({
          id: item.id,
          receiptId: item.receiptId || item.id,
          date: item.transaction?.date || item.createdAt,
          eurosReceived: item.transaction?.eurosReceived || 0,
          bsDelivered: item.transaction?.bsDelivered || 0,
          client: {
            name: item.transaction?.client?.name || "Cliente desconocido",
          },
        })),
      )
    } catch (error) {
      console.error("Error al cargar los recibos:", error)
      setError(error instanceof Error ? error.message : "Error al cargar los recibos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.client.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Búsqueda de Recibos</h1>
        <Button variant="outline" className="flex items-center gap-1" onClick={loadTransactions} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Buscar por ID de recibo o nombre de cliente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="overflow-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID de Recibo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Euros Recibidos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bolívares Entregados
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span>Cargando recibos...</span>
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  {searchTerm
                    ? "No se encontraron recibos que coincidan con la búsqueda"
                    : "No hay recibos disponibles"}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{transaction.receiptId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{transaction.client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(transaction.eurosReceived)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "VES",
                    }).format(transaction.bsDelivered)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">
                    <Link href={`/receipt/${transaction.receiptId}`} className="flex items-center hover:underline">
                      <FileText className="mr-1 h-4 w-4" />
                      Ver Recibo
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

