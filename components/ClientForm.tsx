"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ClientFormProps {
  onClientAdded: () => void
}

export function ClientForm({ onClientAdded }: ClientFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      })

      if (response.ok) {
        setName("")
        setEmail("")
        onClientAdded()
        alert("Cliente agregado exitosamente")
      } else {
        const errorData = await response.json()
        alert(`Error al agregar el cliente: ${errorData.error || "Error desconocido"}`)
      }
    } catch (error) {
      console.error("Error al agregar el cliente:", error)
      alert("Error al agregar el cliente")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar Nuevo Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit">Agregar Cliente</Button>
        </form>
      </CardContent>
    </Card>
  )
}

