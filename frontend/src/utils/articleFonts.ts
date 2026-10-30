/** Font artikel hasil impor file (TTF / OTF / WOFF / WOFF2). */
export type UploadedFont = {
  id: number;
  family: string;
  format: string;
  fileName: string;
  size: number;
};

export const FONT_ACCEPT = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2';
export const FONT_MAX_MB = 5;

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

/**
 * Memasang <link> ke stylesheet @font-face dari server.
 * Beri `version` baru (mis. Date.now()) setelah impor/hapus font agar browser memuat ulang daftar.
 */
export function loadArticleFonts(version?: string | number): void {
  if (typeof document === 'undefined') return;
  const href = `${API_BASE}/api/article-fonts.css${version ? `?v=${version}` : ''}`;
  let link = document.getElementById('article-fonts-css') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'article-fonts-css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
}

/** Nama font default dari nama file: "Roboto-Regular.ttf" -> "Roboto Regular". */
export function fontFamilyFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N} _-]/gu, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function isFontFile(file: File): boolean {
  return /\.(ttf|otf|woff2?)$/i.test(file.name);
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File font tidak dapat dibaca.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

/**
 * Ubah <font face/color/size> hasil editor menjadi inline style.
 * Penting: aturan global `* { font-family: Lato }` di index.css mengalahkan atribut `face`,
 * sehingga font hasil impor (isyarat / braille) tampil sebagai teks biasa. Inline style tidak kalah.
 */
export function fontTagsToInlineStyle(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll('font').forEach((node) => {
    const face = node.getAttribute('face');
    const color = node.getAttribute('color');
    if (face) node.style.fontFamily = `"${face.replace(/["']/g, '')}", sans-serif`;
    if (color) node.style.color = color;
    if (!node.style.fontSize) node.removeAttribute('size');
    node.removeAttribute('face');
    node.removeAttribute('color');
  });
  return doc.body.innerHTML;
}
