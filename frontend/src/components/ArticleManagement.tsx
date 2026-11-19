import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, FileText, ImagePlus, Italic,
  Link2, List, ListOrdered, Plus, Redo2, Save, Search, Send, Table2,
  Trash2, Underline, Undo2, Type, Eye, Pencil, X, ImageIcon, Upload,
} from 'lucide-react';
import {
  FONT_ACCEPT, FONT_MAX_MB, fontFamilyFromFileName, isFontFile, loadArticleFonts,
  readFileAsBase64, fontTagsToInlineStyle, type UploadedFont,
} from '../utils/articleFonts.ts';

type ArticleStatus = 'draft' | 'published';

type Article = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
};

type Message = { type: 'success' | 'error'; text: string } | null;

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const API = `${API_BASE}/api`;

const DEFAULT_CATEGORIES = [
  'Pedoman Braille',
  'Panduan Braille',
  'Pedoman Isyarat',
  'Panduan Isyarat',
  'Kosa Isyarat',
];

const DEFAULT_FONTS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Courier New',
];

const COVER_MAX_FILE_MB = 5;
const COVER_MAX_WIDTH = 1280;
const COVER_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

// Gambar yang disisipkan di isi artikel (bukan sampul).
const INLINE_MAX_FILE_MB = 5;
const INLINE_MAX_WIDTH = 1024;

/** Perkecil & kompres foto sampul di browser agar ringan disimpan dan dimuat. */
function compressImage(file: File, maxWidth: number = COVER_MAX_WIDTH): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File gambar tidak dapat dibaca.'));
    reader.onload = () => {
      // GIF dipertahankan apa adanya (agar animasi tidak hilang) bila sudah kecil.
      if (file.type === 'image/gif' && file.size <= 1_500_000) {
        resolve(String(reader.result));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser tidak mendukung pemrosesan gambar.'));
          return;
        }
        // Latar putih agar PNG transparan tidak menjadi hitam saat dijadikan JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function plainText(html: string) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || '').trim();
}

/**
 * Pembersih HTML sederhana agar konten tidak membawa script / event handler
 * saat ditampilkan di editor atau pratinjau.
 * (Server tetap wajib melakukan sanitasi sendiri.)
 */
function sanitizeHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc
    .querySelectorAll('script,iframe,object,embed,style,link,meta,form')
    .forEach((node) => node.remove());

  doc.body.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'href' || name === 'src') {
        const dangerous = /^(javascript|vbscript|data):/.test(value);
        const safeImage = name === 'src' && value.startsWith('data:image/');
        if (dangerous && !safeImage) el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const ArticleManagement: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [fonts, setFonts] = useState<string[]>(DEFAULT_FONTS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [message, setMessage] = useState<Message>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('Semua');
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const [inlineBusy, setInlineBusy] = useState(false);

  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(16);

  const [newCategory, setNewCategory] = useState('');
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [fontFamilyName, setFontFamilyName] = useState('');
  const [fontBusy, setFontBusy] = useState(false);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [tableContext, setTableContext] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */

  const apiRequest = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Permintaan gagal (${response.status})`);
    }

    return data;
  };

  const errorText = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const loadFromApi = async () => {
    setLoading(true);
    setApiError('');

    try {
      const [articleData, settingsData, fontData] = await Promise.all([
        apiRequest('/admin/articles'),
        apiRequest('/admin/article-settings'),
        apiRequest('/article-fonts').catch(() => ({ fonts: [] })),
      ]);

      setUploadedFonts(Array.isArray(fontData.fonts) ? fontData.fonts : []);
      loadArticleFonts(Date.now());

      setArticles(Array.isArray(articleData.articles) ? articleData.articles : []);

      setCategories(
        Array.isArray(settingsData.categories) && settingsData.categories.length
          ? settingsData.categories
          : DEFAULT_CATEGORIES,
      );

      setFonts(
        Array.isArray(settingsData.fonts) && settingsData.fonts.length
          ? settingsData.fonts
          : DEFAULT_FONTS,
      );
    } catch (error) {
      setApiError(errorText(error, 'Gagal menghubungi API.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async (nextCategories: string[], nextFonts: string[]) => {
    await apiRequest('/admin/article-settings', {
      method: 'PUT',
      body: JSON.stringify({ categories: nextCategories, fonts: nextFonts }),
    });
  };

  const persistSettings = async (nextCategories: string[], nextFonts: string[]) => {
    try {
      await saveSettings(nextCategories, nextFonts);
      return true;
    } catch (error) {
      setMessage({
        type: 'error',
        text: errorText(error, 'Pengaturan gagal disimpan.'),
      });
      return false;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Daftar artikel                                                      */
  /* ------------------------------------------------------------------ */

  // Font bawaan/sistem + font hasil impor, dipakai pada dropdown toolbar editor.
  const allFonts = useMemo(
    () => [...fonts, ...uploadedFonts.map((item) => item.family).filter((name) => !fonts.includes(name))],
    [fonts, uploadedFonts],
  );

  const filteredArticles = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();

    return articles
      .filter((article) => {
        const matchesFilter =
          filter === 'Semua' ||
          (filter === 'Draf' && article.status === 'draft') ||
          (filter === 'Terbit' && article.status === 'published') ||
          article.category === filter;

        const matchesSearch =
          !needle ||
          `${article.title} ${article.excerpt} ${article.category}`
            .toLocaleLowerCase()
            .includes(needle);

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [articles, filter, search]);

  /* ------------------------------------------------------------------ */
  /* Editor                                                              */
  /* ------------------------------------------------------------------ */

  const resetEditor = () => {
    setSelectedId(null);
    setTitle('');
    setCategory(categories[0] || 'Umum');
    setExcerpt('');
    setCoverImage('');
    if (coverInputRef.current) coverInputRef.current.value = '';
    setFont(fonts.includes('Arial') ? 'Arial' : fonts[0] || 'Arial');
    setFontSize(16);
    setPreview(false);
    setMessage(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const editArticle = (article: Article) => {
    setSelectedId(article.id);
    setTitle(article.title);
    setCategory(article.category);
    setExcerpt(article.excerpt);
    setCoverImage(article.coverImage || '');
    if (coverInputRef.current) coverInputRef.current.value = '';
    setPreview(false);
    setMessage(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = fontTagsToInlineStyle(sanitizeHtml(article.content));
    }
  };

  const rememberSelection = () => {
    const selection = window.getSelection();

    if (
      selection &&
      selection.rangeCount &&
      editorRef.current?.contains(selection.anchorNode)
    ) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // Simpan posisi kursor setiap kali seleksi berubah di dalam editor,
  // sehingga toolbar/dropdown tetap bekerja walau fokus pindah.
  useEffect(() => {
    const handleSelectionChange = () => { rememberSelection(); updateTableContext(); };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const restoreSelection = () => {
    editorRef.current?.focus();

    const selection = window.getSelection();

    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  };

  const runCommand = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
  };

  /** Ubah tag <font face> bawaan execCommand menjadi span inline !important. */
  const normalizeEditorFontMarkup = () => {
    const root = editorRef.current;
    if (!root) return;
    root.querySelectorAll('font[face]').forEach((node) => {
      const old = node as HTMLElement;
      const span = document.createElement('span');
      span.style.setProperty('font-family', `"${(old.getAttribute('face') || '').replace(/["']/g, '')}", sans-serif`, 'important');
      while (old.firstChild) span.appendChild(old.firstChild);
      old.replaceWith(span);
    });
    root.querySelectorAll<HTMLElement>('[style*="font-family"]').forEach((node) => {
      const family = node.style.fontFamily;
      if (family) node.style.setProperty('font-family', family, 'important');
    });
  };

  /** Pasang span font pada caret agar karakter yang diketik berikutnya memakai font terpilih. */
  const ensureCaretFont = (family: string) => {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (!root || !selection || !selection.rangeCount || !family) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !range.collapsed) return;
    const parent = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer as HTMLElement
      : range.startContainer.parentElement;

    // Sel tabel harus mewarisi font toolbar sejak caret pertama kali masuk,
    // bukan menunggu pengguna menekan Enter. Ini juga menangani sel kosong.
    const cell = parent?.closest<HTMLTableCellElement>('td, th');
    if (cell && root.contains(cell)) {
      cell.style.setProperty('font-family', `"${family.replace(/["']/g, '')}", sans-serif`, 'important');
    }

    const existing = parent?.closest<HTMLElement>('[data-article-font="true"]');
    if (existing) {
      existing.style.setProperty('font-family', `"${family.replace(/["']/g, '')}", sans-serif`, 'important');
      return;
    }
    const span = document.createElement('span');
    span.dataset.articleFont = 'true';
    span.style.setProperty('font-family', `"${family.replace(/["']/g, '')}", sans-serif`, 'important');
    span.appendChild(document.createTextNode('\u200B'));
    range.insertNode(span);
    range.setStart(span.firstChild as Text, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const setInlineStyle = (property: 'fontName' | 'fontSize', value: string) => {
    restoreSelection();
    ensureEditorSelection();

    if (property === 'fontName') {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (range?.collapsed) {
        ensureCaretFont(value);
      } else {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('fontName', false, value);
        document.execCommand('styleWithCSS', false, 'false');
        normalizeEditorFontMarkup();
      }
    } else {
      document.execCommand('fontSize', false, '7');
      editorRef.current?.querySelectorAll('font[size="7"]').forEach((node) => {
        const element = node as HTMLElement;
        element.removeAttribute('size');
        element.style.fontSize = `${value}px`;
      });
    }

    rememberSelection();
  };



  const isAllowedUrl = (value: string, protocols: string[]) => {
    try {
      return protocols.includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };

  const addLink = () => {
    const url = window.prompt('Masukkan URL lengkap (https://...)')?.trim();
    if (!url) return;

    if (!isAllowedUrl(url, ['http:', 'https:', 'mailto:'])) {
      setMessage({
        type: 'error',
        text: 'URL tidak valid. Gunakan https://, http://, atau mailto:.',
      });
      return;
    }

    runCommand('createLink', url);
  };

  // Posisi kursor sudah tersimpan lewat rememberSelection, jadi cukup buka pemilih file.
  const addImage = () => {
    inlineImageInputRef.current?.click();
  };

  const handleInlineImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!COVER_ACCEPT.split(',').includes(file.type)) {
      setMessage({ type: 'error', text: 'Format gambar harus PNG, JPG, WEBP, atau GIF.' });
      return;
    }

    if (file.size > INLINE_MAX_FILE_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `Ukuran gambar maksimal ${INLINE_MAX_FILE_MB} MB.` });
      return;
    }

    setInlineBusy(true);
    setMessage(null);

    try {
      const dataUrl = await compressImage(file, INLINE_MAX_WIDTH);
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/"/g, '');
      runCommand(
        'insertHTML',
        `<img src="${dataUrl}" alt="${alt}" style="max-width:100%;height:auto" />`,
      );
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error, 'Gambar gagal diproses.') });
    } finally {
      setInlineBusy(false);
    }
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!COVER_ACCEPT.split(',').includes(file.type)) {
      setMessage({ type: 'error', text: 'Format foto sampul harus PNG, JPG, WEBP, atau GIF.' });
      return;
    }

    if (file.size > COVER_MAX_FILE_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `Ukuran foto sampul maksimal ${COVER_MAX_FILE_MB} MB.` });
      return;
    }

    setCoverBusy(true);
    setMessage(null);

    try {
      setCoverImage(await compressImage(file));
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error, 'Foto sampul gagal diproses.') });
    } finally {
      setCoverBusy(false);
    }
  };

  /**
   * Resize tabel dengan drag pada batas sel:
   * - batas kanan sel: ubah lebar kolom tersebut;
   * - batas bawah sel: ubah tinggi baris tersebut;
   * - sudut kanan-bawah sel terakhir: ubah ukuran tabel secara keseluruhan.
   */
  const startTableResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement | null;
    if (!cell || !editorRef.current?.contains(cell)) return;

    const table = cell.closest('table') as HTMLTableElement | null;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row) return;

    const rect = cell.getBoundingClientRect();
    const edgeSize = 7;
    const nearRight = rect.right - event.clientX <= edgeSize;
    const nearBottom = rect.bottom - event.clientY <= edgeSize;
    if (!nearRight && !nearBottom) return;

    const rows = Array.from(table.rows);
    const rowIndex = rows.indexOf(row);
    const cellIndex = Array.from(row.cells).indexOf(cell);
    const isLastCell = rowIndex === rows.length - 1 && cellIndex === row.cells.length - 1;
    const mode: 'table' | 'column' | 'row' =
      nearRight && nearBottom && isLastCell
        ? 'table'
        : nearRight
          ? 'column'
          : 'row';

    event.preventDefault();
    event.stopPropagation();
    rememberSelection();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = table.getBoundingClientRect().width;
    const startHeight = table.getBoundingClientRect().height;
    const startCellWidth = cell.getBoundingClientRect().width;
    const startRowHeight = row.getBoundingClientRect().height;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = mode === 'row' ? 'row-resize' : mode === 'column' ? 'col-resize' : 'nwse-resize';
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (mode === 'table') {
        table.style.width = `${Math.max(120, startWidth + dx)}px`;
        table.style.height = `${Math.max(45, startHeight + dy)}px`;
      } else if (mode === 'column') {
        const nextWidth = Math.max(45, startCellWidth + dx);
        table.style.tableLayout = 'fixed';
        rows.forEach((tableRow) => {
          const targetCell = tableRow.cells[cellIndex];
          if (targetCell) {
            targetCell.style.width = `${nextWidth}px`;
            targetCell.style.minWidth = `${nextWidth}px`;
          }
        });
      } else {
        const nextHeight = Math.max(28, startRowHeight + dy);
        row.style.height = `${nextHeight}px`;
        Array.from(row.cells).forEach((rowCell) => {
          rowCell.style.height = `${nextHeight}px`;
        });
      }
    };

    const onEnd = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      rememberSelection();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd, { once: true });
    window.addEventListener('pointercancel', onEnd, { once: true });
  };

  const getActiveTableCell = (): HTMLTableCellElement | null => {
    const range = savedRangeRef.current;
    const node = range?.startContainer || window.getSelection()?.anchorNode;
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE
      ? node as Element
      : node.parentElement;
    const cell = element?.closest('td,th') as HTMLTableCellElement | null;
    return cell && editorRef.current?.contains(cell) ? cell : null;
  };

  const updateTableContext = () => setTableContext(Boolean(getActiveTableCell()));

  const insertTable = () => {
    const rows = Math.max(1, Math.min(20, Number(window.prompt('Jumlah baris:', '2')) || 2));
    const cols = Math.max(1, Math.min(12, Number(window.prompt('Jumlah kolom:', '2')) || 2));
    const body = Array.from({ length: rows }, () =>
      `<tr>${Array.from({ length: cols }, () => '<td style="border:1px solid #cbd5e1;padding:8px;min-width:80px"><br></td>').join('')}</tr>`,
    ).join('');
    runCommand('insertHTML', `<table style="width:100%;border-collapse:collapse;margin:12px 0" border="1"><tbody>${body}</tbody></table><p><br></p>`);
    updateTableContext();
  };

  const requireTableCell = () => {
    const cell = getActiveTableCell();
    if (!cell) setMessage({ type: 'error', text: 'Letakkan kursor di dalam sel tabel terlebih dahulu.' });
    return cell;
  };

  const insertTableRow = (where: 'above' | 'below') => {
    const cell = requireTableCell(); if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest('table'); if (!table) return;
    const newRow = table.insertRow(row.rowIndex + (where === 'below' ? 1 : 0));
    Array.from(row.cells).forEach((source) => {
      const newCell = newRow.insertCell();
      newCell.innerHTML = '<br>';
      newCell.style.cssText = source.style.cssText || 'border:1px solid #cbd5e1;padding:8px';
    });
    setMessage({ type: 'success', text: `Baris berhasil ditambahkan ${where === 'above' ? 'di atas' : 'di bawah'}.` });
  };

  const insertTableColumn = (where: 'left' | 'right') => {
    const cell = requireTableCell(); if (!cell) return;
    const table = cell.closest('table'); if (!table) return;
    const row = cell.parentElement as HTMLTableRowElement;
    const index = Array.prototype.indexOf.call(row.cells, cell) + (where === 'right' ? 1 : 0);
    Array.from(table.rows).forEach((tableRow) => {
      const reference = tableRow.cells[Math.min(index, tableRow.cells.length - 1)];
      const newCell = tableRow.insertCell(reference ? Math.min(index, tableRow.cells.length) : -1);
      newCell.innerHTML = '<br>';
      newCell.style.cssText = cell.style.cssText || 'border:1px solid #cbd5e1;padding:8px';
    });
    setMessage({ type: 'success', text: `Kolom berhasil ditambahkan di ${where === 'left' ? 'kiri' : 'kanan'}.` });
  };

  const deleteTableRow = () => {
    const cell = requireTableCell(); if (!cell) return;
    const table = cell.closest('table'); const row = cell.parentElement as HTMLTableRowElement;
    if (!table || table.rows.length <= 1) { setMessage({ type: 'error', text: 'Tabel harus menyisakan minimal satu baris.' }); return; }
    table.deleteRow(row.rowIndex);
  };

  const deleteTableColumn = () => {
    const cell = requireTableCell(); if (!cell) return;
    const table = cell.closest('table'); const row = cell.parentElement as HTMLTableRowElement;
    if (!table || row.cells.length <= 1) { setMessage({ type: 'error', text: 'Tabel harus menyisakan minimal satu kolom.' }); return; }
    const index = Array.prototype.indexOf.call(row.cells, cell);
    Array.from(table.rows).forEach((tableRow) => tableRow.cells[index]?.remove());
  };

  const mergeTableCell = (direction: 'right' | 'down') => {
    const cell = requireTableCell(); if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest('table'); if (!table) return;
    if (direction === 'right') {
      const next = cell.nextElementSibling as HTMLTableCellElement | null;
      if (!next || next.tagName !== cell.tagName) { setMessage({ type: 'error', text: 'Tidak ada sel di sebelah kanan untuk digabung.' }); return; }
      cell.innerHTML += next.innerHTML ? `<br>${next.innerHTML}` : '';
      cell.colSpan += next.colSpan;
      next.remove();
    } else {
      const nextRow = table.rows[row.rowIndex + 1];
      const index = Array.prototype.indexOf.call(row.cells, cell);
      const next = nextRow?.cells[index];
      if (!next) { setMessage({ type: 'error', text: 'Tidak ada sel di bawah untuk digabung.' }); return; }
      cell.innerHTML += next.innerHTML ? `<br>${next.innerHTML}` : '';
      cell.rowSpan += next.rowSpan;
      next.remove();
    }
    setMessage({ type: 'success', text: 'Sel berhasil digabung. Gunakan Pisahkan sel untuk membatalkan penggabungan.' });
  };

  const splitTableCell = () => {
    const cell = requireTableCell(); if (!cell) return;
    const colspan = cell.colSpan; const rowspan = cell.rowSpan;
    if (colspan === 1 && rowspan === 1) { setMessage({ type: 'error', text: 'Sel ini belum digabung.' }); return; }
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest('table'); if (!table) return;
    const originalContent = cell.innerHTML;
    cell.colSpan = 1; cell.rowSpan = 1;
    for (let c = 1; c < colspan; c++) {
      const newCell = row.insertCell(cell.cellIndex + c);
      newCell.innerHTML = '<br>'; newCell.style.cssText = cell.style.cssText;
    }
    for (let r = 1; r < rowspan; r++) {
      const targetRow = table.rows[row.rowIndex + r];
      if (targetRow) {
        const newCell = targetRow.insertCell(Math.min(cell.cellIndex, targetRow.cells.length));
        newCell.innerHTML = '<br>'; newCell.style.cssText = cell.style.cssText;
      }
    }
    cell.innerHTML = originalContent;
    setMessage({ type: 'success', text: 'Sel berhasil dipisahkan.' });
  };

  const deleteTable = () => {
    const cell = requireTableCell(); if (!cell) return;
    if (window.confirm('Hapus seluruh tabel ini?')) cell.closest('table')?.remove();
    setTableContext(false);
  };

  const setTableCellBackground = () => {
    const cell = requireTableCell(); if (!cell) return;
    const color = window.prompt('Masukkan warna latar (contoh: #f1f5f9):', '#f1f5f9');
    if (color && /^#[0-9a-f]{6}$/i.test(color.trim())) cell.style.backgroundColor = color.trim();
    else if (color) setMessage({ type: 'error', text: 'Format warna tidak valid. Gunakan kode HEX, misalnya #f1f5f9.' });
  };

  const togglePreview = () => {
    if (!preview) {
      setPreviewHtml(sanitizeHtml(editorRef.current?.innerHTML || ''));
    }
    setPreview((value) => !value);
  };

  /* ------------------------------------------------------------------ */
  /* Simpan / hapus artikel                                              */
  /* ------------------------------------------------------------------ */

  const saveArticle = async (status: ArticleStatus) => {
    const cleanTitle = title.trim();
    const content = fontTagsToInlineStyle(sanitizeHtml(editorRef.current?.innerHTML.trim() || ''));

    if (!cleanTitle) {
      setMessage({ type: 'error', text: 'Judul artikel wajib diisi.' });
      return;
    }

    const hasMedia = /<(img|table)\b/i.test(content);
    if (!plainText(content) && !hasMedia) {
      setMessage({
        type: 'error',
        text: 'Isi artikel masih kosong. Silakan tulis isi artikel terlebih dahulu.',
      });
      return;
    }

    if (!category || !categories.includes(category)) {
      setMessage({ type: 'error', text: 'Pilih kategori artikel yang valid.' });
      return;
    }

    const existing = articles.find((item) => item.id === selectedId);
    const now = new Date().toISOString();

    const draft: Article = {
      id: existing?.id || makeId(),
      title: cleanTitle,
      category,
      excerpt: excerpt.trim(),
      content,
      coverImage,
      status,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    setSaving(true);
    setMessage(null);

    try {
      const data = existing
        ? await apiRequest(`/admin/articles/${encodeURIComponent(existing.id)}`, {
            method: 'PUT',
            body: JSON.stringify(draft),
          })
        : await apiRequest('/admin/articles', {
            method: 'POST',
            body: JSON.stringify(draft),
          });

      const saved: Article = data.article ?? draft;

      setArticles((current) =>
        existing
          ? current.map((item) => (item.id === existing.id ? saved : item))
          : [saved, ...current],
      );

      setSelectedId(saved.id);
      setMessage({
        type: 'success',
        text:
          status === 'published'
            ? 'Artikel berhasil diterbitkan.'
            : 'Draf berhasil disimpan.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: errorText(error, 'Artikel gagal disimpan.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (article: Article) => {
    if (
      !window.confirm(
        `Hapus artikel “${article.title}”? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/admin/articles/${encodeURIComponent(article.id)}`, {
        method: 'DELETE',
      });

      setArticles((current) => current.filter((item) => item.id !== article.id));

      if (selectedId === article.id) {
        resetEditor();
      }

      setMessage({ type: 'success', text: 'Artikel dihapus.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: errorText(error, 'Artikel gagal dihapus.'),
      });
    }
  };

  /* ------------------------------------------------------------------ */
  /* Kategori & font                                                     */
  /* ------------------------------------------------------------------ */

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();

    const value = newCategory.trim();
    if (!value) return;

    if (categories.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setMessage({ type: 'error', text: 'Kategori tersebut sudah ada.' });
      return;
    }

    const next = [...categories, value];

    if (await persistSettings(next, fonts)) {
      setCategories(next);
      setCategory(value);
      setNewCategory('');
    }
  };

  const deleteCategory = async (value: string) => {
    if (articles.some((article) => article.category === value)) {
      setMessage({
        type: 'error',
        text: 'Kategori masih digunakan artikel. Pindahkan atau hapus artikel terkait terlebih dahulu.',
      });
      return;
    }

    if (categories.length <= 1) {
      setMessage({ type: 'error', text: 'Minimal harus ada satu kategori.' });
      return;
    }

    if (!window.confirm(`Hapus kategori “${value}”?`)) return;

    const next = categories.filter((item) => item !== value);

    if (await persistSettings(next, fonts)) {
      setCategories(next);

      if (category === value) setCategory(next[0] || 'Umum');
      if (filter === value) setFilter('Semua');
    }
  };

  const handleFontFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!isFontFile(file)) {
      setMessage({ type: 'error', text: 'Format tidak didukung. Pilih file TTF, OTF, WOFF, atau WOFF2.' });
      event.target.value = '';
      return;
    }

    if (file.size > FONT_MAX_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `Ukuran file font maksimal ${FONT_MAX_MB} MB.` });
      event.target.value = '';
      return;
    }

    setFontFile(file);
    setFontFamilyName(fontFamilyFromFileName(file.name));
  };

  const importFont = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fontFile) {
      setMessage({ type: 'error', text: 'Pilih file font terlebih dahulu.' });
      return;
    }

    const family = fontFamilyName.trim();
    if (!family) {
      setMessage({ type: 'error', text: 'Nama font wajib diisi.' });
      return;
    }

    if (
      [...fonts, ...uploadedFonts.map((item) => item.family)].some(
        (item) => item.toLocaleLowerCase() === family.toLocaleLowerCase(),
      )
    ) {
      setMessage({ type: 'error', text: 'Nama font sudah ada di daftar.' });
      return;
    }

    setFontBusy(true);
    try {
      const data = await readFileAsBase64(fontFile);
      const result = await apiRequest('/admin/article-fonts', {
        method: 'POST',
        body: JSON.stringify({ family, fileName: fontFile.name, data }),
      });

      const created: UploadedFont = result.font;
      setUploadedFonts((current) => [...current, created]);
      setFont(created.family);
      loadArticleFonts(Date.now());
      setFontFile(null);
      setFontFamilyName('');
      if (fontInputRef.current) fontInputRef.current.value = '';
      setMessage({ type: 'success', text: `Font “${created.family}” berhasil diimpor.` });
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error, 'Font gagal diimpor.') });
    } finally {
      setFontBusy(false);
    }
  };

  const deleteUploadedFont = async (item: UploadedFont) => {
    if (
      !window.confirm(
        `Hapus font “${item.family}”? Artikel yang memakai font ini akan tampil dengan font cadangan.`,
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/admin/article-fonts/${item.id}`, { method: 'DELETE' });
      setUploadedFonts((current) => current.filter((entry) => entry.id !== item.id));
      if (font === item.family) setFont(fonts[0] || 'Arial');
      loadArticleFonts(Date.now());
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error, 'Font gagal dihapus.') });
    }
  };

  const deleteFont = async (value: string) => {
    if (fonts.length <= 1) {
      setMessage({ type: 'error', text: 'Minimal harus ada satu font.' });
      return;
    }

    if (
      !window.confirm(
        `Hapus “${value}” dari daftar font? Teks yang sudah diformat tidak diubah.`,
      )
    ) {
      return;
    }

    const next = fonts.filter((item) => item !== value);

    if (await persistSettings(categories, next)) {
      setFonts(next);
      if (font === value) setFont(next[0] || 'Arial');
    }
  };

  /* ------------------------------------------------------------------ */
  /* Toolbar                                                             */
  /* ------------------------------------------------------------------ */

  const toolbar = [
    { label: 'Tebal', icon: Bold, action: () => runCommand('bold') },
    { label: 'Miring', icon: Italic, action: () => runCommand('italic') },
    { label: 'Garis bawah', icon: Underline, action: () => runCommand('underline') },
    { label: 'Rata kiri', icon: AlignLeft, action: () => runCommand('justifyLeft') },
    { label: 'Rata tengah', icon: AlignCenter, action: () => runCommand('justifyCenter') },
    { label: 'Rata kanan', icon: AlignRight, action: () => runCommand('justifyRight') },
    { label: 'Daftar bullet', icon: List, action: () => runCommand('insertUnorderedList') },
    { label: 'Daftar nomor', icon: ListOrdered, action: () => runCommand('insertOrderedList') },
    { label: 'Urungkan', icon: Undo2, action: () => runCommand('undo') },
    { label: 'Ulangi', icon: Redo2, action: () => runCommand('redo') },
    { label: 'Sisipkan tautan', icon: Link2, action: addLink },
    { label: 'Unggah gambar dari file', icon: ImagePlus, action: addImage },
    { label: 'Sisipkan tabel', icon: Table2, action: insertTable },
  ];

  const filterOptions = ['Semua', 'Draf', 'Terbit', ...categories];

  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30';

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600';

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FileText aria-hidden="true" className="h-5 w-5" />
            Kelola artikel
          </h1>
          <p className="text-sm text-slate-600">
            Tulis, ubah, dan terbitkan artikel pedoman Braille dan bahasa isyarat.
          </p>
        </div>

        <button
          type="button"
          onClick={resetEditor}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Artikel baru
        </button>
      </header>

      {apiError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => void loadFromApi()}
            className="rounded-md border border-red-400 px-3 py-1 font-medium hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            Coba lagi
          </button>
        </div>
      )}

      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-2 rounded-md border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-green-300 bg-green-50 text-green-800'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            aria-label="Tutup pesan"
            onClick={() => setMessage(null)}
            className="rounded p-0.5 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1">
        {/* ---------------------------- Daftar artikel ---------------------------- */}
        <section
          aria-labelledby="article-list-heading"
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 id="article-list-heading" className="text-base font-semibold text-slate-900">
            Daftar artikel
          </h2>

          <div className="relative">
            <label htmlFor="article-search" className="sr-only">
              Cari artikel
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            />
            <input
              id="article-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul atau kategori"
              className={`${inputClass} pl-9`}
            />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter artikel">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`rounded-full border px-3 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  filter === option
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="py-6 text-center text-sm text-slate-600" role="status">
              Memuat artikel…
            </p>
          ) : filteredArticles.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-600">
              {articles.length === 0
                ? 'Belum ada artikel. Klik “Artikel baru” untuk mulai menulis.'
                : 'Tidak ada artikel yang cocok dengan pencarian atau filter.'}
            </p>
          ) : (
            <ul className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {filteredArticles.map((article) => (
                <li
                  key={article.id}
                  className={`rounded-md border p-3 ${
                    selectedId === article.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {article.coverImage && (
                    <img
                      src={article.coverImage}
                      alt=""
                      loading="lazy"
                      className="mb-2 aspect-[16/9] w-full rounded object-cover"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {article.title}
                      </p>
                      <p className="text-xs text-slate-600">
                        {article.category} • {formatDate(article.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        article.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {article.status === 'published' ? 'Terbit' : 'Draf'}
                    </span>
                  </div>

                  {article.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => editArticle(article)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteArticle(article)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* -------------------------------- Editor -------------------------------- */}
        <section
          aria-labelledby="editor-heading"
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="editor-heading" className="text-base font-semibold text-slate-900">
              {selectedId ? 'Ubah artikel' : 'Artikel baru'}
            </h2>

            <button
              type="button"
              onClick={togglePreview}
              aria-pressed={preview}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {preview ? (
                <Pencil aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
              {preview ? 'Kembali ke editor' : 'Pratinjau'}
            </button>
          </div>

          <div>
            <label htmlFor="article-title" className="mb-1 block text-sm font-medium text-slate-800">
              Judul
            </label>
            <input
              id="article-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Contoh: Pedoman dasar huruf Braille"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="article-category" className="mb-1 block text-sm font-medium text-slate-800">
                Kategori
              </label>
              <select
                id="article-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="article-excerpt" className="mb-1 block text-sm font-medium text-slate-800">
                Ringkasan
              </label>
              <input
                id="article-excerpt"
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                placeholder="Satu atau dua kalimat singkat"
                className={inputClass}
              />
            </div>
          </div>

          {/* Foto sampul */}
          <div>
            <span id="cover-label" className="mb-1 block text-sm font-medium text-slate-800">
              Foto sampul
            </span>

            <input
              ref={coverInputRef}
              id="article-cover"
              type="file"
              accept={COVER_ACCEPT}
              onChange={(event) => void handleCoverChange(event)}
              className="sr-only"
              aria-labelledby="cover-label"
            />

            {coverImage ? (
              <div className="space-y-2">
                <img
                  src={coverImage}
                  alt="Pratinjau foto sampul artikel"
                  className="aspect-[16/9] max-h-64 w-full rounded-md border border-slate-200 object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={coverBusy}
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
                  >
                    <Upload aria-hidden="true" className="h-4 w-4" />
                    {coverBusy ? 'Memproses…' : 'Ganti foto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Hapus foto
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={coverBusy}
                onClick={() => coverInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-700 hover:border-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
              >
                <ImageIcon aria-hidden="true" className="h-6 w-6 text-slate-500" />
                <span className="font-medium">
                  {coverBusy ? 'Memproses gambar…' : 'Klik untuk unggah foto sampul'}
                </span>
                <span className="text-xs text-slate-600">
                  PNG, JPG, WEBP, atau GIF · maks. {COVER_MAX_FILE_MB} MB · rasio 16:9 disarankan
                </span>
              </button>
            )}
          </div>

          <input
            ref={inlineImageInputRef}
            type="file"
            accept={COVER_ACCEPT}
            onChange={(event) => void handleInlineImageChange(event)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* Toolbar */}
          <div
            role="toolbar"
            aria-label="Format teks"
            className={`flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1.5 ${
              preview ? 'hidden' : ''
            }`}
          >
            <Type aria-hidden="true" className="mx-1 h-4 w-4 text-slate-500" />

            <label htmlFor="font-select" className="sr-only">
              Jenis font
            </label>
            <select
              id="font-select"
              value={font}
              onChange={(event) => {
                setFont(event.target.value);
                setInlineStyle('fontName', event.target.value);
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {allFonts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label htmlFor="size-select" className="sr-only">
              Ukuran font
            </label>
            <select
              id="size-select"
              value={fontSize}
              onChange={(event) => {
                const size = Number(event.target.value);
                setFontSize(size);
                setInlineStyle('fontSize', String(size));
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>

            <span aria-hidden="true" className="mx-1 h-6 w-px bg-slate-300" />

            {toolbar.map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                // mencegah editor kehilangan seleksi saat tombol diklik
                onMouseDown={(event) => event.preventDefault()}
                onClick={action}
                disabled={label === 'Unggah gambar dari file' && inlineBusy}
                className={iconButtonClass}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </button>
            ))}
          </div>

          {tableContext && !preview && (
            <div role="toolbar" aria-label="Operasi tabel" className="flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2">
              <span className="px-1 text-xs font-semibold text-blue-900">Operasi tabel</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableRow('above')} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">+ Baris atas</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableRow('below')} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">+ Baris bawah</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableColumn('left')} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">+ Kolom kiri</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableColumn('right')} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">+ Kolom kanan</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => mergeTableCell('right')} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">Gabung ke kanan</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => mergeTableCell('down')} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">Gabung ke bawah</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={splitTableCell} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">Pisahkan sel</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={deleteTableRow} className="rounded border bg-white px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">Hapus baris</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={deleteTableColumn} className="rounded border bg-white px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">Hapus kolom</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={setTableCellBackground} className="rounded border bg-white px-2 py-1.5 text-xs hover:bg-blue-100">Warna sel</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={deleteTable} className="rounded border border-red-300 bg-white px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">Hapus tabel</button>
            </div>
          )}

          {/* Editor tetap ter-mount agar isi tidak hilang saat pratinjau */}
          <div className={preview ? 'hidden' : ''}>
            <label id="editor-label" className="mb-1 block text-sm font-medium text-slate-800">
              Isi artikel
            </label>
            <div
              ref={editorRef}
              role="textbox"
              aria-multiline="true"
              aria-labelledby="editor-label"
              contentEditable
              suppressContentEditableWarning
              onPointerDown={startTableResize}
              onBlur={rememberSelection}
              onFocus={() => {
                // Terapkan font aktif sejak editor atau sel tabel menerima fokus.
                ensureCaretFont(font);
                rememberSelection();
                updateTableContext();
              }}
              onBeforeInput={() => {
                // Terapkan font sebelum karakter pertama diketik, termasuk pada sel kosong.
                ensureCaretFont(font);
              }}
              onKeyUp={(event) => {
                if (event.key === 'Enter') ensureCaretFont(font);
                normalizeEditorFontMarkup();
                rememberSelection();
                updateTableContext();
              }}
              onMouseUp={() => {
                rememberSelection();
                updateTableContext();
              }}
              onClick={() => {
                // Saat sel kosong diklik, caret langsung dibungkus font toolbar aktif.
                ensureCaretFont(font);
                rememberSelection();
                updateTableContext();
              }}
              style={{ fontFamily: font, fontSize: `${fontSize}px` }}
              className="min-h-[32rem] w-full max-w-none overflow-auto rounded-md border border-slate-300 bg-white p-4 leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_td]:border [&_td]:border-slate-300 [&_td]:cursor-text [&_th]:border [&_th]:border-slate-300 [&_th]:cursor-text [&_table]:max-w-full [&_ul]:list-disc [&_ul]:pl-6"
            />
          </div>

          {preview && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-800">Pratinjau</h3>
              <article className="min-h-[32rem] w-full rounded-md border border-slate-200 bg-white p-4">
                {coverImage && (
                  <img
                    src={coverImage}
                    alt=""
                    className="mb-4 aspect-[16/9] w-full rounded-md object-cover"
                  />
                )}
                <h4 className="mb-1 text-2xl font-semibold text-slate-900">
                  {title || 'Tanpa judul'}
                </h4>
                <p className="mb-4 text-xs text-slate-600">{category}</p>
                <div
                  className="leading-relaxed text-slate-900 [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_td]:border [&_td]:border-slate-300 [&_ul]:list-disc [&_ul]:pl-6"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </article>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveArticle('draft')}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {saving ? 'Menyimpan…' : 'Simpan draf'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveArticle('published')}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
              {saving ? 'Menyimpan…' : 'Terbitkan'}
            </button>
          </div>
        </section>
      </div>

      {/* ------------------------ Pengaturan kategori & font ------------------------ */}
      <section
        aria-labelledby="settings-heading"
        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2"
      >
        <h2 id="settings-heading" className="sr-only">
          Pengaturan kategori dan font
        </h2>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Kategori</h3>

          <form onSubmit={(event) => void addCategory(event)} className="flex gap-2">
            <label htmlFor="new-category" className="sr-only">
              Nama kategori baru
            </label>
            <input
              id="new-category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Kategori baru"
              className={inputClass}
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Tambah
            </button>
          </form>

          <ul className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 py-1 pl-3 pr-1 text-xs text-slate-800"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Hapus kategori ${item}`}
                  onClick={() => void deleteCategory(item)}
                  className="rounded-full p-1 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Font</h3>

          <form onSubmit={(event) => void importFont(event)} className="space-y-2">
            <div>
              <label htmlFor="font-file" className="mb-1 block text-xs font-medium text-slate-700">
                File font (TTF, OTF, WOFF, WOFF2 · maks {FONT_MAX_MB} MB)
              </label>
              <input
                id="font-file"
                ref={fontInputRef}
                type="file"
                accept={FONT_ACCEPT}
                onChange={handleFontFileChange}
                className="block w-full text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
              />
            </div>

            <div className="flex gap-2">
              <label htmlFor="new-font" className="sr-only">
                Nama font
              </label>
              <input
                id="new-font"
                value={fontFamilyName}
                onChange={(event) => setFontFamilyName(event.target.value)}
                placeholder="Nama font yang tampil di daftar"
                maxLength={60}
                disabled={!fontFile}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={!fontFile || fontBusy}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
                {fontBusy ? 'Mengimpor…' : 'Impor font'}
              </button>
            </div>
          </form>

          <ul className="flex flex-wrap gap-2">
            {fonts.map((item) => (
              <li
                key={item}
                style={{ fontFamily: item }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 py-1 pl-3 pr-1 text-xs text-slate-800"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Hapus font ${item}`}
                  onClick={() => void deleteFont(item)}
                  className="rounded-full p-1 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </li>
            ))}

            {uploadedFonts.map((item) => (
              <li
                key={`file-${item.id}`}
                style={{ fontFamily: `"${item.family}", sans-serif` }}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 py-1 pl-3 pr-1 text-xs text-slate-800"
              >
                {item.family}
                <span className="rounded bg-emerald-100 px-1 text-[10px] font-semibold uppercase text-emerald-800">
                  {item.format}
                </span>
                <button
                  type="button"
                  aria-label={`Hapus font ${item.family}`}
                  onClick={() => void deleteUploadedFont(item)}
                  className="rounded-full p-1 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};