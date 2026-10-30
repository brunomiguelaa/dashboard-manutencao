/**
 * ============================================================================
 * Camada de Serviço: Otimização e Compressão de Imagens
 * Arquitetura MVC - Backend / Services
 * ============================================================================
 * Responsabilidade:
 * - Redimensionar e comprimir imagens client-side via HTML5 Canvas.
 * - Gerar strings Base64 ultraleves (~40KB a 80KB) para persistência direta.
 * - Eliminar necessidade de custos de Firebase Storage e cartão de crédito.
 */

export async function compressImageToBase64(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido para compressão.');
  }

  const isImage = (
    (file.type && file.type.startsWith('image/')) || 
    /\.(jpe?g|png|webp|gif|bmp|heic|heif|jfif|svg)$/i.test(file.name || '')
  );

  if (!isImage) {
    throw new Error('O arquivo selecionado não é uma imagem válida.');
  }

  // Abordagem 1: createImageBitmap (otimizado para dispositivos móveis)
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file);
      let { width, height } = bitmap;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();

      const base64String = canvas.toDataURL('image/jpeg', quality);
      const approxSizeKb = Math.round((base64String.length * 3 / 4) / 1024);

      return {
        base64: base64String,
        sizeKb: approxSizeKb,
        width: canvas.width,
        height: canvas.height,
        fileName: file.name || 'foto_chamado.jpg'
      };
    } catch (bitmapError) {
      console.warn('[ImageCompressorService] Fallback de bitmap para Image Loader:', bitmapError);
    }
  }

  // Abordagem 2: Fallback via DOM Image e FileReader
  return new Promise((resolve, reject) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (event) => processImageSrc(event.target.result, null, file, maxWidth, maxHeight, quality, resolve, reject);
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem via FileReader.'));
      reader.readAsDataURL(file);
      return;
    }

    processImageSrc(objectUrl, objectUrl, file, maxWidth, maxHeight, quality, resolve, reject);
  });
}

function processImageSrc(src, objectUrlToRevoke, file, maxWidth, maxHeight, quality, resolve, reject) {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  const cleanup = () => {
    if (objectUrlToRevoke) {
      try { URL.revokeObjectURL(objectUrlToRevoke); } catch (e) {}
    }
  };

  img.onload = () => {
    try {
      let width = img.naturalWidth || img.width || 800;
      let height = img.naturalHeight || img.height || 600;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const base64String = canvas.toDataURL('image/jpeg', quality);
      const approxSizeKb = Math.round((base64String.length * 3 / 4) / 1024);

      cleanup();
      resolve({
        base64: base64String,
        sizeKb: approxSizeKb,
        width: canvas.width,
        height: canvas.height,
        fileName: file.name || 'foto_chamado.jpg'
      });
    } catch (err) {
      cleanup();
      reject(err);
    }
  };

  img.onerror = () => {
    cleanup();
    reject(new Error('Não foi possível renderizar a imagem para compressão. Formato não suportado.'));
  };

  img.src = src;
}
