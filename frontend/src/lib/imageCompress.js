// Client-side image resize + JPEG re-encode so phone photos fit comfortably
// inside the JSON body limit. 1600 px long edge + quality 0.82 keeps enough
// detail for inspection / repair evidence but typically lands under ~400 KB.

export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_EDGE_PX = 1600;
export const JPEG_QUALITY = 0.82;

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = dataUrl;
  });
}

export async function compressImage(file) {
  const rawUrl = await readFileAsDataURL(file);
  const img = await loadImage(rawUrl);
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

// Replace the extension on a file name with .jpg since we always re-encode.
export function renameToJpg(originalName) {
  return (originalName || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
}
