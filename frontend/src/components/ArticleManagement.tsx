import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, FileText, ImagePlus, Italic,
  Link2, List, ListOrdered, Plus, Redo2, Save, Search, Send, Table2,
  Trash2, Underline, Undo2, Type, Eye, Pencil, X,
} from 'lucide-react';

type ArticleStatus = 'draft' | 'published';

type Article = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
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

  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(16);

  const [newCategory, setNewCategory] = useState('');
  const [newFont, setNewFont] = useState('');
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

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
      const [articleData, settingsData] = await Promise.all([
        apiRequest('/admin/articles'),
        apiRequest('/admin/article-settings'),
      ]);

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
    setPreview(false);
    setMessage(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = sanitizeHtml(article.content);
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
    document.addEventListener('selectionchange', rememberSelection);
    return () => document.removeEventListener('selectionchange', rememberSelection);
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

  const setInlineStyle = (property: 'fontName' | 'fontSize', value: string) => {
    restoreSelection();

    if (property === 'fontName') {
      document.execCommand('fontName', false, value);
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

  const addImage = () => {
    const url = window.prompt('Masukkan URL gambar (https://...)')?.trim();
    if (!url) return;

    if (!isAllowedUrl(url, ['http:', 'https:'])) {
      setMessage({ type: 'error', text: 'URL gambar tidak valid.' });
      return;
    }

    runCommand('insertImage', url);
  };

  const insertTable = () => {
    runCommand(
      'insertHTML',
      '<table style="width:100%;border-collapse:collapse" border="1"><tbody><tr><td style="padding:8px">Isi sel</td><td style="padding:8px">Isi sel</td></tr><tr><td style="padding:8px">Isi sel</td><td style="padding:8px">Isi sel</td></tr></tbody></table><p><br></p>',
    );
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
    const content = sanitizeHtml(editorRef.current?.innerHTML.trim() || '');

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

  const addFont = async (event: React.FormEvent) => {
    event.preventDefault();

    const value = newFont.trim();
    if (!value) return;

    if (fonts.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setMessage({ type: 'error', text: 'Font sudah ada di daftar.' });
      return;
    }

    const next = [...fonts, value];

    if (await persistSettings(categories, next)) {
      setFonts(next);
      setFont(value);
      setNewFont('');
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
    { label: 'Sisipkan gambar', icon: ImagePlus, action: addImage },
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

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
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
            <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {filteredArticles.map((article) => (
                <li
                  key={article.id}
                  className={`rounded-md border p-3 ${
                    selectedId === article.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
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
              {fonts.map((item) => (
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
                className={iconButtonClass}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </button>
            ))}
          </div>

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
              onBlur={rememberSelection}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              style={{ fontFamily: font, fontSize: `${fontSize}px` }}
              className="min-h-[20rem] max-w-none overflow-auto rounded-md border border-slate-300 bg-white p-4 leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_td]:border [&_td]:border-slate-300 [&_ul]:list-disc [&_ul]:pl-6"
            />
          </div>

          {preview && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-800">Pratinjau</h3>
              <article className="min-h-[20rem] rounded-md border border-slate-200 bg-white p-4">
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

          <form onSubmit={(event) => void addFont(event)} className="flex gap-2">
            <label htmlFor="new-font" className="sr-only">
              Nama font baru
            </label>
            <input
              id="new-font"
              value={newFont}
              onChange={(event) => setNewFont(event.target.value)}
              placeholder="Font baru, mis. Calibri"
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
          </ul>
        </div>
      </section>
    </div>
  );
};