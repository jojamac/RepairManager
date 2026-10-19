/**
 * Utilidad de compresión y optimización de imágenes en el cliente (Browser Canvas).
 * Reduce la resolución a dimensiones óptimas (máx 1600px) y comprime a WebP/JPEG/PNG
 * reduciendo el peso significativamente sin pérdida apreciable de calidad visual.
 */
export class ImageCompressor {
  private static supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    } catch {
      return false;
    }
  }

  static compressImage(
    file: File,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format?: 'webp' | 'jpeg' | 'png'
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      // Si el archivo no es una imagen, devolverlo intacto
      if (!file.type.startsWith('image/')) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Redimensionar respetando el aspect ratio
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          // Renderizar imagen redimensionada con suavizado de alta calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Determinar formato mime de salida
          let mimeType = 'image/jpeg';
          let extension = 'jpg';

          if (format === 'png' || (!format && file.type === 'image/png')) {
            mimeType = 'image/png';
            extension = 'png';
          } else if (format === 'webp' || (!format && this.supportsWebP())) {
            mimeType = 'image/webp';
            extension = 'webp';
          }

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '.' + extension,
                {
                  type: mimeType,
                  lastModified: Date.now(),
                }
              );
              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  /**
   * Convierte un DataURL (Base64) a un objeto File para subirlo a Storage.
   */
  static dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
