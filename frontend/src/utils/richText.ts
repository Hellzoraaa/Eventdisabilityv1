/**
 * Pembantu teks kaya (rich text) untuk Bank Soal.
 * Dipakai oleh editor (RichTextEditor) dan semua tempat yang menampilkan soal.
 * Server tetap membersihkan HTML sendiri; fungsi di sini adalah lapisan kedua di browser.
 */

const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'br',
  'p', 'div', 'span', 'ul', 'ol', 'li',
]);
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'link', 'meta', 'form', 'svg', 'math',
]);

const FONT_FAMILY_RE = /^[\p{L}\p{N} _,"'-]{1,200}$/u;
const FONT_SIZE_RE = /^\d{1,3}(\.\d+)?(px|pt|em|rem|%)$/;
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)|[a-z]{3,20})$/i;

/** Hanya properti gaya yang aman dan relevan untuk teks soal. */
function cleanStyle(raw: string): string {
  const out: string[] = [];
  for (const part of raw.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!value) continue;
    switch (prop) {
      case 'font-family': if (FONT_FAMILY_RE.test(value)) out.push(`font-family: ${value}`); break;
      case 'font-size': if (FONT_SIZE_RE.test(value)) out.push(`font-size: ${value}`); break;
      case 'color': if (COLOR_RE.test(value)) out.push(`color: ${value}`); break;
      case 'text-align': if (/^(left|right|center|justify)$/i.test(value)) out.push(`text-align: ${value.toLowerCase()}`); break;
      case 'font-weight': if (/^(normal|bold|bolder|lighter|[1-9]00)$/i.test(value)) out.push(`font-weight: ${value.toLowerCase()}`); break;
      case 'font-style': if (/^(normal|italic|oblique)$/i.test(value)) out.push(`font-style: ${value.toLowerCase()}`); break;
      case 'text-decoration': case 'text-decoration-line':
        if (/^(none|underline|line-through|underline line-through|line-through underline)$/i.test(value)) out.push(`text-decoration: ${value.toLowerCase()}`);
        break;
      default: break;
    }
  }
  return out.join('; ');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Teks polos lama (tanpa tag HTML) diubah menjadi HTML aman agar tampil sama seperti sebelumnya. */
export function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
}

const HAS_TAG_RE = /<\/?[a-z][^>]*>/i;

/** Soal lama disimpan sebagai teks polos; soal baru disimpan sebagai HTML. */
export function normalizeStoredHtml(value: string): string {
  const v = String(value ?? '');
  return HAS_TAG_RE.test(v) ? v : plainTextToHtml(v);
}

/** Ubah <font face/color> menjadi <span style>, karena aturan global `*` mengalahkan atribut face. */
function convertFontNode(doc: Document, node: Element): Element {
  const span = doc.createElement('span');
  const face = node.getAttribute('face');
  const color = node.getAttribute('color');
  const styles: string[] = [];
  const existing = node.getAttribute('style');
  if (existing) styles.push(existing);
  if (face) styles.push(`font-family: "${face.replace(/["']/g, '')}"`);
  if (color) styles.push(`color: ${color}`);
  const cleaned = cleanStyle(styles.join(';'));
  if (cleaned) span.setAttribute('style', cleaned);
  while (node.firstChild) span.appendChild(node.firstChild);
  node.replaceWith(span);
  return span;
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return escapeHtml(html);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

  const walk = (parent: Element) => {
    Array.from(parent.children).forEach((child) => {
      let el: Element = child;
      const tag = el.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) { el.remove(); return; }
      if (tag === 'font') el = convertFontNode(doc, el);
      const name = el.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) {
        walk(el);
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.remove();
        return;
      }
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase() === 'style') {
          const cleaned = cleanStyle(attr.value);
          if (cleaned) el.setAttribute('style', cleaned); else el.removeAttribute('style');
        } else {
          el.removeAttribute(attr.name);
        }
      });
      walk(el);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/** Teks polos dari HTML (untuk validasi "kosong" dan ringkasan). */
export function richToText(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/[\u00a0\u200B]/g, ' ');
}

export function isRichEmpty(html: string): boolean {
  return richToText(html).trim().length === 0;
}

/** HTML siap tampil: soal lama dinormalkan, lalu dibersihkan. */
export function toDisplayHtml(value: string): string {
  return sanitizeRichHtml(normalizeStoredHtml(value));
}
