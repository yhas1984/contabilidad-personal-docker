"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Mail, Phone, MapPin, FileText, Image } from "lucide-react"

interface CompanyInfo {
  id?: number
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  logo?: string
}

export function CompanyForm() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
    logo: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCompanyInfo()
  }, [])

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch("/api/company")
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setCompanyInfo(data)
        }
      }
    } catch (error) {
      console.error("Error al obtener información de la empresa:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCompanyInfo((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(companyInfo),
      })

      if (response.ok) {
        alert("Información de la empresa actualizada correctamente")
        fetchCompanyInfo()
      } else {
        alert("Error al actualizar la información de la empresa")
      }
    } catch (error) {
      console.error("Error al actualizar la información de la empresa:", error)
      alert("Error al actualizar la información de la empresa")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        <p className="ml-2">Cargando...</p>
      </div>
    )
  }

  return (
    <Card className="dashboard-card">
      <CardHeader className="dashboard-card-header">
        <CardTitle className="dashboard-card-title">
          <Building2 className="h-5 w-5 mr-2 inline-block text-primary" />
          Información de la Empresa
        </CardTitle>
        <CardDescription className="dashboard-card-description">
          Configura los datos de tu empresa para los recibos y documentos
        </CardDescription>
      </CardHeader>
      <CardContent className="dashboard-card-content">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <Label htmlFor="name" className="form-label">
                Nombre de la Empresa
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  value={companyInfo.name}
                  onChange={handleChange}
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <Label htmlFor="email" className="form-label">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={companyInfo.email}
                  onChange={handleChange}
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <Label htmlFor="address" className="form-label">
                Dirección
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  name="address"
                  value={companyInfo.address}
                  onChange={handleChange}
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <Label htmlFor="phone" className="form-label">
                Teléfono
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  value={companyInfo.phone}
                  onChange={handleChange}
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <Label htmlFor="taxId" className="form-label">
                Identificación Fiscal
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="taxId"
                  name="taxId"
                  value={companyInfo.taxId}
                  onChange={handleChange}
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="form-group">
              <Label htmlFor="logo" className="form-label">
                URL del Logo
              </Label>
              <div className="relative">
                <Image className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="logo"
                  name="logo"
                  value={companyInfo.logo || ""}
                  onChange={handleChange}
                  placeholder="https://ejemplo.com/logo.png"
                  className="form-input pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="btn-hover">
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                  Guardando...
                </>
              ) : (
                "Guardar Información"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

