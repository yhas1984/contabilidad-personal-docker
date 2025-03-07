import { Suspense } from "react"
import { notFound } from "next/navigation"
import prisma from "@/lib/prisma"
import { ReceiptView } from "./receipt-view"
import LoadingSkeleton from "./loading-skeleton"

// Función para obtener los datos de la transacción
async function getTransactionData(id: string) {
  try {
    // Buscar por receiptId en lugar de id numérico
    const transaction = await prisma.transaction.findFirst({
      where: { 
        receiptId: id // Buscar por receiptId en lugar de id
      },
      include: {
        client: true,
      },
    })
    
    if (!transaction) {
      return null
    }
    
    const companyInfo = await prisma.companyInfo.findFirst()
    
    return {
      transaction,
      companyInfo,
    }
  } catch (error) {
    console.error("Error al obtener datos de la transacción:", error)
    return null
  }
}

// Componente principal de la página (Componente de Servidor)
export default async function ReceiptPage({
  params,
}: {
  params: { id: string }
}) {
  const data = await getTransactionData(params.id)
  
  if (!data) {
    notFound()
  }
  
  return (
    <div className="container py-8">
      <Suspense fallback={<LoadingSkeleton />}>
        <ReceiptView
          transaction={data.transaction}
          companyInfo={data.companyInfo}
        />
      </Suspense>
    </div>
  )
}