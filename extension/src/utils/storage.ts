import { ExtensionSettings } from '../types'

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiKey: '',
      backendUrl: 'http://localhost:3000',
      apiToken: '',
      bugPriority: 'medium',
      screenshotQuality: 90,
      autoAnalyze: true
    }, (items: any) => {
      resolve(items as ExtensionSettings)
    })
  })
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve()
    })
  })
}

export async function getLocalData(key: string): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (items: any) => {
      resolve(items[key])
    })
  })
}

export async function saveLocalData(key: string, value: any): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve()
    })
  })
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function detectOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone')) return 'iOS'
  return 'Unknown'
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    'Critical': '#dc2626',
    'High': '#f97316',
    'Medium': '#eab308',
    'Low': '#22c55e'
  }
  return colors[severity] || '#6b7280'
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
