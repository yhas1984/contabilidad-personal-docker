"use client"

import { ClientManager } from "@/components/ClientManager"

export default function ClientsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestión de Clientes</h1>
      <ClientManager />
    </div>
  )
}

