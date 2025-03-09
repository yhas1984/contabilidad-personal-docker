"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Edit, Trash2, Download, Upload, RefreshCw } from "lucide-react"
import * as XLSX from "xlsx"

interface Client {
  id?: number
  name: string
  email: string
  dni?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  notes?: string
}

export function ClientManager() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentClient, setCurrentClient] = useState<Client>({
    name: "",
    email: "",
    dni: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "España",
    notes: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState("list")

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentClient((prev) => ({ ...prev, [name]: value }))
  }

  // Actualizar la función handleEdit
  const handleEdit = async (client: Client) => {
    setCurrentClient(client)
    setIsEditing(true)
    setActiveTab("form")
  }

  // Actualizar la función handleSubmit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = isEditing && currentClient.id ? `/api/clients/${currentClient.id}` : "/api/clients"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentClient),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Ha ocurrido un error al procesar la solicitud")
      }

      const data = await response.json()
      resetForm()
      fetchClients()
      alert(isEditing ? "Cliente actualizado exitosamente" : "Cliente agregado exitosamente")
    } catch (error) {
      console.error("Error:", error)
      alert(error instanceof Error ? error.message : "Ha ocurrido un error al procesar la solicitud")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        await fetchClients() // Refetch the clients list
        alert("Cliente eliminado exitosamente")
      } else {
        // Show the specific error message from the server
        alert(data.message || "Ha ocurrido un error al eliminar el cliente")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Ha ocurrido un error al eliminar el cliente")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentClient({
      name: "",
      email: "",
      dni: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "España",
      notes: "",
    })
    setIsEditing(false)
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(clients)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes")
    XLSX.writeFile(workbook, "clientes.xlsx")
  }

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet)

        // Validar y transformar los datos
        const validClients = jsonData.map((row: any) => ({
          name: row.name || row.nombre || row.Name || row.NOMBRE || "",
          email: row.email || row.Email || row.EMAIL || row.correo || row.Correo || "",
          dni: row.dni || row.DNI || row.id || row.ID || "",
          phone: row.phone || row.Phone || row.telefono || row.Telefono || row.TELEFONO || "",
          address: row.address || row.Address || row.direccion || row.Direccion || row.DIRECCION || "",
          city: row.city || row.City || row.ciudad || row.Ciudad || row.CIUDAD || "",
          postalCode:
            row.postalCode || row.PostalCode || row.codigoPostal || row.CodigoPostal || row.CODIGOPOSTAL || "",
          country: row.country || row.Country || row.pais || row.Pais || row.PAIS || "España",
          notes: row.notes || row.Notes || row.notas || row.Notas || row.NOTAS || "",
        }))

        // Filtrar clientes válidos (deben tener al menos nombre y email)
        const clientsToImport = validClients.filter((client) => client.name && client.email)

        if (clientsToImport.length === 0) {
          alert("No se encontraron clientes válidos en el archivo. Cada cliente debe tener al menos nombre y email.")
          return
        }

        setIsLoading(true)
        try {
          const response = await fetch("/api/clients/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ clients: clientsToImport }),
          })

          if (response.ok) {
            const result = await response.json()
            fetchClients()
            alert(
              `Importación exitosa: ${result.imported} clientes importados, ${result.duplicates} duplicados omitidos.`,
            )
          } else {
            const error = await response.json()
            alert(`Error: ${error.message || "Ha ocurrido un error al importar los clientes"}`)
          }
        } catch (error) {
          console.error("Error:", error)
          alert("Ha ocurrido un error al importar los clientes")
        } finally {
          setIsLoading(false)
          // Limpiar el input de archivo
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      } catch (error) {
        console.error("Error al procesar el archivo:", error)
        alert("Error al procesar el archivo Excel. Asegúrate de que el formato sea correcto.")
      }
    }

    reader.onerror = () => {
      alert("Error al leer el archivo")
    }

    reader.readAsBinaryString(file)
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.dni && client.dni.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
          <TabsTrigger value="form">{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, DNI o teléfono"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchClients} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
              <Button variant="outline" onClick={exportToExcel} disabled={clients.length === 0 || isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={importFromExcel}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Clientes ({filteredClients.length})</CardTitle>
              <CardDescription>Gestiona la información de tus clientes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Cargando...</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No se encontraron clientes</p>
                  {searchTerm && (
                    <Button variant="link" onClick={() => setSearchTerm("")}>
                      Limpiar búsqueda
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Código Postal</TableHead>
                        <TableHead>País</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.dni || "-"}</TableCell>
                          <TableCell>{client.phone || "-"}</TableCell>
                          <TableCell>{client.address || "-"}</TableCell>
                          <TableCell>{client.city || "-"}</TableCell>
                          <TableCell>{client.postalCode || "-"}</TableCell>
                          <TableCell>{client.country || "España"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(client)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar cliente</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => client.id && handleDelete(client.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Eliminar cliente</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</CardTitle>
              <CardDescription>
                {isEditing ? "Actualiza la información del cliente" : "Ingresa los datos del nuevo cliente"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <Input id="name" name="name" value={currentClient.name} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={currentClient.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI/NIE</Label>
                    <Input id="dni" name="dni" value={currentClient.dni || ""} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" value={currentClient.phone || ""} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      name="address"
                      value={currentClient.address || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" name="city" value={currentClient.city || ""} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={currentClient.postalCode || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      name="country"
                      value={currentClient.country || "España"}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={currentClient.notes || ""}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Guardando..." : isEditing ? "Actualizar Cliente" : "Guardar Cliente"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}