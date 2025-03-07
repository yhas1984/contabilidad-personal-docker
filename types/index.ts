export interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  logo?: string
}

export interface Client {
  id: number
  name: string
  email: string
  dni?: string
  phone?: string
  address?: string
}

export interface Transaction {
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

