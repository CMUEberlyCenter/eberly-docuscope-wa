import { images } from 'mammoth';

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

// A function that resizes an image and returns its attributes
function createResizedImageConverter(maxWidth: number, maxHeight: number) {
  return images.imgElement(async (image) => {
    const arrayBuffer = await image.readAsArrayBuffer();
    // Use the image data to perform client-side resizing
    const blob = new Blob([arrayBuffer], { type: image.contentType });
    const imageUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(imageUrl);
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Get the base64 string from the canvas
        const dataUrl = canvas.toDataURL(image.contentType);
        resolve({
          src: dataUrl,
          width: `${width}px`,
          height: `${height}px`,
        });
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  });
}

export const convertOptions = {
  convertImage: createResizedImageConverter(MAX_WIDTH, MAX_HEIGHT),
  styleMap: 'u => u', // Preserve underline styles (str | str[] | regexp)
};
