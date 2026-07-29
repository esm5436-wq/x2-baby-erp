const FAVICON_ID = 'dynamic-favicon';
const APPLE_TOUCH_ID = 'dynamic-apple-touch-icon';

function setOrCreateLink(id: string, rel: string, href: string, type?: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) link.type = type;
}

async function generatePngAtSize(base64: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }

      const aspect = img.width / img.height;
      let sw: number, sh: number, sx: number, sy: number;
      if (aspect > 1) {
        sh = img.height;
        sw = sh;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sw = img.width;
        sh = sw;
        sx = 0;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64);
  });
}

export async function updateFavicon(brandLogo: string) {
  if (!brandLogo) return resetFavicon();

  try {
    const png192 = await generatePngAtSize(brandLogo, 192);

    setOrCreateLink(FAVICON_ID, 'icon', png192, 'image/png');
    setOrCreateLink(APPLE_TOUCH_ID, 'apple-touch-icon', png192, 'image/png');
  } catch (err) {
    console.error('Failed to update favicon:', err);
  }
}

export function resetFavicon() {
  setOrCreateLink(FAVICON_ID, 'icon', '/icon-brand.png', 'image/png');
  setOrCreateLink(APPLE_TOUCH_ID, 'apple-touch-icon', '/icon-brand.png');
}
