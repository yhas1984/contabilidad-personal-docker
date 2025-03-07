import ReportGenerator from "@/components/ReportGenerator"

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Reportes Financieros</h1>
      <p className="text-gray-600 mb-8">
        Genere reportes financieros detallados para analizar el rendimiento de su negocio en períodos específicos.
      </p>

      <ReportGenerator />
    </div>
  )
}

