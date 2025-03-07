/**
 * Utilidad para validar la integridad de archivos y datos antes de procesarlos
 */

// Tipos de validación disponibles
export type ValidationTarget = "transaction" | "client" | "company" | "report" | "receipt"

// Interfaz para resultados de validación
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Función principal de validación
export async function validateData(data: any, type: ValidationTarget): Promise<ValidationResult> {
  console.log(`Validando datos de tipo: ${type}`)

  // Resultado por defecto
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  try {
    switch (type) {
      case "transaction":
        validateTransaction(data, result)
        break
      case "client":
        validateClient(data, result)
        break
      case "company":
        validateCompany(data, result)
        break
      case "report":
        await validateReport(data, result)
        break
      case "receipt":
        validateReceipt(data, result)
        break
      default:
        result.warnings.push(`Tipo de validación '${type}' no reconocido`)
    }

    // Si hay errores, el resultado no es válido
    if (result.errors.length > 0) {
      result.isValid = false
    }

    return result
  } catch (error) {
    console.error(`Error durante la validación de ${type}:`, error)
    return {
      isValid: false,
      errors: [`Error inesperado durante la validación: ${error instanceof Error ? error.message : String(error)}`],
      warnings: [],
    }
  }
}

// Validación de transacciones
function validateTransaction(transaction: any, result: ValidationResult): void {
  if (!transaction) {
    result.errors.push("La transacción es nula o indefinida")
    return
  }

  // Validar campos obligatorios
  if (transaction.eurosReceived === undefined || transaction.eurosReceived === null) {
    result.errors.push("El campo eurosReceived es obligatorio")
  } else if (typeof transaction.eurosReceived !== "number" || transaction.eurosReceived <= 0) {
    result.errors.push("El campo eurosReceived debe ser un número positivo")
  }

  if (transaction.bsDelivered === undefined || transaction.bsDelivered === null) {
    result.errors.push("El campo bsDelivered es obligatorio")
  } else if (typeof transaction.bsDelivered !== "number" || transaction.bsDelivered <= 0) {
    result.errors.push("El campo bsDelivered debe ser un número positivo")
  }

  if (transaction.exchangeRate === undefined || transaction.exchangeRate === null) {
    result.errors.push("El campo exchangeRate es obligatorio")
  } else if (typeof transaction.exchangeRate !== "number" || transaction.exchangeRate <= 0) {
    result.errors.push("El campo exchangeRate debe ser un número positivo")
  }

  // Validar fecha
  if (!transaction.date) {
    result.errors.push("El campo date es obligatorio")
  } else {
    const date = new Date(transaction.date)
    if (isNaN(date.getTime())) {
      result.errors.push("El campo date debe ser una fecha válida")
    }
  }

  // Validar cliente
  if (!transaction.client || typeof transaction.client !== "object") {
    result.errors.push("El campo client es obligatorio y debe ser un objeto")
  }

  // Validar campos opcionales
  if (transaction.profit !== undefined && transaction.profit !== null) {
    if (typeof transaction.profit !== "number") {
      result.errors.push("El campo profit debe ser un número")
    }
  }

  if (transaction.profitPercentage !== undefined && transaction.profitPercentage !== null) {
    if (typeof transaction.profitPercentage !== "number") {
      result.errors.push("El campo profitPercentage debe ser un número")
    }
  }
}

// Validación de clientes
function validateClient(client: any, result: ValidationResult): void {
  if (!client) {
    result.errors.push("El cliente es nulo o indefinido")
    return
  }

  // Validar campos obligatorios
  if (!client.name || typeof client.name !== "string" || client.name.trim() === "") {
    result.errors.push("El nombre del cliente es obligatorio")
  }

  // Validar email (opcional pero debe ser válido si existe)
  if (client.email !== undefined && client.email !== null && client.email !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(client.email)) {
      result.errors.push("El email del cliente no es válido")
    }
  }

  // Validar teléfono (opcional)
  if (client.phone !== undefined && client.phone !== null && client.phone !== "") {
    // Permitir formatos internacionales y diferentes separadores
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/
    if (!phoneRegex.test(client.phone)) {
      result.warnings.push("El formato del teléfono del cliente podría no ser válido")
    }
  }

  // Validar DNI/NIE (opcional pero debe ser válido si existe)
  if (client.dni !== undefined && client.dni !== null && client.dni !== "") {
    // Formato básico para DNI/NIE español
    const dniRegex = /^[0-9XYZ][0-9]{7}[A-Z]$/
    if (!dniRegex.test(client.dni)) {
      result.warnings.push("El formato del DNI/NIE del cliente podría no ser válido")
    }
  }
}

// Validación de información de empresa
function validateCompany(company: any, result: ValidationResult): void {
  if (!company) {
    result.errors.push("La información de la empresa es nula o indefinida")
    return
  }

  // Validar campos obligatorios
  if (!company.name || typeof company.name !== "string" || company.name.trim() === "") {
    result.errors.push("El nombre de la empresa es obligatorio")
  }

  // Validar campos opcionales pero importantes
  if (!company.address || typeof company.address !== "string" || company.address.trim() === "") {
    result.warnings.push("La dirección de la empresa es recomendada para los reportes")
  }

  if (!company.phone || typeof company.phone !== "string" || company.phone.trim() === "") {
    result.warnings.push("El teléfono de la empresa es recomendado para los reportes")
  }

  if (!company.email || typeof company.email !== "string" || company.email.trim() === "") {
    result.warnings.push("El email de la empresa es recomendado para los reportes")
  }

  if (!company.taxId || typeof company.taxId !== "string" || company.taxId.trim() === "") {
    result.warnings.push("El NIF/CIF de la empresa es recomendado para los reportes")
  }

  // Validar logo si existe
  if (company.logo) {
    if (typeof company.logo !== "string") {
      result.errors.push("El logo de la empresa debe ser una URL válida")
    } else if (!company.logo.startsWith("data:image/") && !company.logo.startsWith("http")) {
      result.warnings.push("El formato del logo podría no ser compatible con la generación de PDF")
    }
  }
}

// Validación de datos para reportes
async function validateReport(reportData: any, result: ValidationResult): Promise<void> {
  if (!reportData) {
    result.errors.push("Los datos del reporte son nulos o indefinidos")
    return
  }

  // Validar fechas
  if (!reportData.startDate) {
    result.errors.push("La fecha de inicio es obligatoria")
  } else {
    const startDate = new Date(reportData.startDate)
    if (isNaN(startDate.getTime())) {
      result.errors.push("La fecha de inicio no es válida")
    }
  }

  if (!reportData.endDate) {
    result.errors.push("La fecha de fin es obligatoria")
  } else {
    const endDate = new Date(reportData.endDate)
    if (isNaN(endDate.getTime())) {
      result.errors.push("La fecha de fin no es válida")
    }
  }

  // Validar que la fecha de inicio no sea posterior a la fecha de fin
  if (reportData.startDate && reportData.endDate) {
    const startDate = new Date(reportData.startDate)
    const endDate = new Date(reportData.endDate)

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
      result.errors.push("La fecha de inicio no puede ser posterior a la fecha de fin")
    }
  }

  // Validar transacciones si están presentes
  if (reportData.transactions) {
    if (!Array.isArray(reportData.transactions)) {
      result.errors.push("Las transacciones deben ser un array")
    } else if (reportData.transactions.length === 0) {
      result.warnings.push("No hay transacciones para el período seleccionado")
    } else {
      // Validar cada transacción (solo la primera para no sobrecargar)
      const transactionResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      }

      validateTransaction(reportData.transactions[0], transactionResult)

      if (!transactionResult.isValid) {
        result.warnings.push("Algunas transacciones podrían tener datos inválidos")
      }
    }
  }

  // Validar información de la empresa si está presente
  if (reportData.companyInfo) {
    const companyResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    validateCompany(reportData.companyInfo, companyResult)

    if (!companyResult.isValid) {
      result.errors.push("La información de la empresa no es válida")
      result.errors = [...result.errors, ...companyResult.errors]
    }

    result.warnings = [...result.warnings, ...companyResult.warnings]
  } else {
    result.errors.push("La información de la empresa es obligatoria para generar reportes")
  }
}

// Validación de datos para recibos
function validateReceipt(receiptData: any, result: ValidationResult): void {
  if (!receiptData) {
    result.errors.push("Los datos del recibo son nulos o indefinidos")
    return
  }

  // Validar transacción
  if (receiptData.transactionData) {
    const transactionResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    validateTransaction(receiptData.transactionData, transactionResult)

    if (!transactionResult.isValid) {
      result.errors.push("Los datos de la transacción no son válidos")
      result.errors = [...result.errors, ...transactionResult.errors]
    }

    result.warnings = [...result.warnings, ...transactionResult.warnings]
  } else {
    result.errors.push("Los datos de la transacción son obligatorios para generar un recibo")
  }

  // Validar cliente
  if (receiptData.client) {
    const clientResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    validateClient(receiptData.client, clientResult)

    if (!clientResult.isValid) {
      result.errors.push("Los datos del cliente no son válidos")
      result.errors = [...result.errors, ...clientResult.errors]
    }

    result.warnings = [...result.warnings, ...clientResult.warnings]
  } else {
    result.errors.push("Los datos del cliente son obligatorios para generar un recibo")
  }

  // Validar información de la empresa
  if (receiptData.companyInfo) {
    const companyResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    validateCompany(receiptData.companyInfo, companyResult)

    if (!companyResult.isValid) {
      result.errors.push("La información de la empresa no es válida")
      result.errors = [...result.errors, ...companyResult.errors]
    }

    result.warnings = [...result.warnings, ...companyResult.warnings]
  } else {
    result.errors.push("La información de la empresa es obligatoria para generar un recibo")
  }

  // Validar ID del recibo
  if (!receiptData.transactionData?.receiptId) {
    result.errors.push("El ID del recibo es obligatorio")
  }
}

