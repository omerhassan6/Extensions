declare const chrome: any

import { PageMetadata, ScreenshotResponse } from '../types'

export class ScreenshotService {
  static async captureScreenshot(): Promise<ScreenshotResponse> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tabs[0]?.id) {
        return { success: false, error: 'No active tab found' }
      }

      const screenshot = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
        format: 'png',
        quality: 90
      })

      const metadata: PageMetadata = {
        url: tabs[0].url || '',
        title: tabs[0].title || '',
        timestamp: new Date().toISOString(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio
      }

      return {
        success: true,
        screenshot,
        metadata
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to capture screenshot'
      }
    }
  }

  static async uploadScreenshot(file: File): Promise<ScreenshotResponse> {
    try {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const metadata: PageMetadata = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            userAgent: navigator.userAgent,
            devicePixelRatio: window.devicePixelRatio
          }

          resolve({
            success: true,
            screenshot: e.target?.result as string,
            metadata
          })
        }
        reader.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to read file'
          })
        }
        reader.readAsDataURL(file)
      })
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async drawAnnotations(
    screenshot: string,
    boxes: Array<{
      x: number
      y: number
      width: number
      height: number
      color?: string
      label?: string
    }>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)

        boxes.forEach(box => {
          ctx.strokeStyle = box.color || 'red'
          ctx.lineWidth = 2
          ctx.strokeRect(box.x, box.y, box.width, box.height)

          if (box.label) {
            ctx.fillStyle = box.color || 'red'
            ctx.font = 'bold 14px Arial'
            ctx.fillText(box.label, box.x + 5, box.y - 5)
          }
        })

        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      img.src = screenshot
    })
  }
}
