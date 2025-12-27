import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(__dirname, '..', 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const PROMO_CODES_FILE = path.join(DATA_DIR, 'promoCodes.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Helper functions
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
  }
  return defaultValue
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
  }
}

// Products
export function loadProducts(): any[] {
  return readJsonFile(PRODUCTS_FILE, [])
}

export function saveProducts(products: any[]): void {
  writeJsonFile(PRODUCTS_FILE, products)
}

// Promo codes
export function loadPromoCodes(): any[] {
  return readJsonFile(PROMO_CODES_FILE, [])
}

export function savePromoCodes(promoCodes: any[]): void {
  writeJsonFile(PROMO_CODES_FILE, promoCodes)
}
