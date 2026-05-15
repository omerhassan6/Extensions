class ScreenshotHandler {
  constructor() {
    this.currentScreenshot = null;
    this.currentMetadata = null;
  }

  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          reject(new Error('No active tab'));
          return;
        }

        chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: 'png', quality: 90 })
          .then(dataUrl => {
            this.currentScreenshot = dataUrl;
            this.currentMetadata = {
              url: tabs[0].url,
              title: tabs[0].title,
              timestamp: new Date().toISOString(),
              tabId: tabs[0].id,
              userAgent: navigator.userAgent
            };
            resolve({
              screenshot: dataUrl,
              metadata: this.currentMetadata
            });
          })
          .catch(reject);
      });
    });
  }

  async uploadScreenshot(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentScreenshot = e.target.result;
        this.currentMetadata = {
          filename: file.name,
          filesize: file.size,
          filetype: file.type,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        };
        resolve(this.currentScreenshot);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  getCurrentScreenshot() {
    return this.currentScreenshot;
  }

  getCurrentMetadata() {
    return this.currentMetadata;
  }

  canvasToImage(canvas) {
    return canvas.toDataURL('image/png');
  }

  drawBoxOnScreenshot(x, y, width, height, color = 'red', thickness = 2) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.strokeRect(x, y, width, height);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = this.currentScreenshot;
    });
  }

  async drawMultipleBoxes(boxes) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);

        boxes.forEach(box => {
          ctx.strokeStyle = box.color || 'red';
          ctx.lineWidth = box.thickness || 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Add label if provided
          if (box.label) {
            ctx.fillStyle = box.color || 'red';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(box.label, box.x + 5, box.y - 5);
          }
        });

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = this.currentScreenshot;
    });
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotHandler;
}