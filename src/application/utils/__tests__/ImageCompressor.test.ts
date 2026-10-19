import { describe, it, expect } from 'vitest';
import { ImageCompressor } from '../ImageCompressor';

describe('ImageCompressor', () => {
  it('debe devolver archivos que no son imágenes intactos', async () => {
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await ImageCompressor.compressImage(textFile);
    expect(result).toBe(textFile);
  });

  it('debe convertir un dataURL a un objeto File', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const file = ImageCompressor.dataURLtoFile(dataUrl, 'sample.png');
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('sample.png');
  });
});
