"use client"

import { CompanyForm } from "@/components/CompanyForm"

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>
      <CompanyForm />
    </div>
  )
}

