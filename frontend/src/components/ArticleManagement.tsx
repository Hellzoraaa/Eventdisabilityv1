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

export const ArticleManagement: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [fonts, setFonts] = useState<string[]>(DEFAULT_FONTS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

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

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const apiRequest = async (
    path: string,
    init: RequestInit = {},
  ) => {
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
      throw new Error(
        data.error || `Permintaan gagal (${response.status})`,
      );
    }

    return data;
  };

  const loadFromApi = async () => {
    setLoading(true);
    setApiError('');

    try {
      const [articleData, settingsData] = await Promise.all([
        apiRequest('/admin/articles'),
        apiRequest('/admin/article-settings'),
      ]);

      setArticles(
        Array.isArray(articleData.articles)
          ? articleData.articles
          : [],
      );

      setCategories(
        Array.isArray(settingsData.categories) &&
          settingsData.categories.length
          ? settingsData.categories
          : DEFAULT_CATEGORIES,
      );

      setFonts(
        Array.isArray(settingsData.fonts) &&
          settingsData.fonts.length
          ? settingsData.fonts
          : DEFAULT_FONTS,
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Gagal menghubungi API.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFromApi();
  }, []);

  const saveSettings = async (
    nextCategories: string[],
    nextFonts: string[],
  ) => {
    await apiRequest('/admin/article-settings', {
      method: 'PUT',
      body: JSON.stringify({
        categories: nextCategories,
        fonts: nextFonts,
      }),
    });
  };

  const filteredArticles = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();

    return articles
      .filter((article) => {
        const matchesFilter =
          filter === 'Semua' ||
          (filter === 'Draf' && article.status === 'draft') ||
          (filter === 'Terbit' &&
            article.status === 'published') ||
          article.category === filter;

        const matchesSearch =
          !needle ||
          `${article.title} ${article.excerpt} ${article.category}`
            .toLocaleLowerCase()
            .includes(needle);

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [articles, filter, search]);
    const resetEditor = () => {
    setSelectedId(null);
    setTitle('');
    setCategory(categories[0] || 'Umum');
    setExcerpt('');
    setFont(fonts.includes('Arial') ? 'Arial' : fonts[0] || 'Arial');
    setFontSize(16);
    setPreview(false);

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

    if (editorRef.current) {
      editorRef.current.innerHTML = article.content;
    }
  };

  const rememberSelection = () => {
    const selection = window.getSelection();

    if (
      selection?.rangeCount &&
      editorRef.current?.contains(selection.anchorNode)
    ) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();

    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }

    editorRef.current?.focus();
  };

  const runCommand = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
  };

  const setInlineStyle = (
    property: 'fontName' | 'fontSize',
    value: string,
  ) => {
    restoreSelection();

    if (property === 'fontName') {
      document.execCommand('fontName', false, value);
    } else {
      document.execCommand('fontSize', false, '7');

      editorRef.current
        ?.querySelectorAll('font[size="7"]')
        .forEach((node) => {
          const element = node as HTMLElement;
          element.removeAttribute('size');
          element.style.fontSize = `${value}px`;
        });
    }

    rememberSelection();
  };

  const addLink = () => {
    const url = window.prompt('Masukkan URL lengkap (https://...)');

    if (!url) return;

    try {
      const parsed = new URL(url);

      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        throw new Error('URL tidak diizinkan');
      }
    } catch {
      window.alert(
        'URL tidak valid. Gunakan https://, http://, atau mailto:.',
      );
      return;
    }

    runCommand('createLink', url);
  };

  const addImage = () => {
    const url = window.prompt('Masukkan URL gambar (https://...)');

    if (!url) return;

    try {
      const parsed = new URL(url);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL tidak diizinkan');
      }
    } catch {
      window.alert('URL gambar tidak valid.');
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

  const saveArticle = (status: ArticleStatus) => {
    const cleanTitle = title.trim();
    const content = editorRef.current?.innerHTML.trim() || '';

    if (!cleanTitle) {
      window.alert('Judul artikel wajib diisi.');
      return;
    }

    if (!plainText(content)) {
      window.alert(
        'Isi artikel masih kosong. Silakan tulis isi artikel terlebih dahulu.',
      );
      return;
    }

    if (!category || !categories.includes(category)) {
      window.alert('Pilih kategori artikel yang valid.');
      return;
    }

    const existing = articles.find((item) => item.id === selectedId);
    const now = new Date().toISOString();

    const article: Article = {
      id: existing?.id || makeId(),
      title: cleanTitle,
      category,
      excerpt: excerpt.trim(),
      content,
      status,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    setArticles((current) =>
      existing
        ? current.map((item) =>
            item.id === existing.id ? article : item,
          )
        : [article, ...current],
    );

    setSelectedId(article.id);

    window.alert(
      status === 'published'
        ? 'Status artikel diubah menjadi Terbit (tersimpan di browser ini).'
        : 'Draf tersimpan di browser ini.',
    );
  };

  const deleteArticle = (article: Article) => {
    if (
      !window.confirm(
        `Hapus artikel “${article.title}”? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setArticles((current) =>
      current.filter((item) => item.id !== article.id),
    );

    if (selectedId === article.id) {
      resetEditor();
    }
  };

  const addCategory = (event: React.FormEvent) => {
    event.preventDefault();

    const value = newCategory.trim();
    if (!value) return;

    if (
      categories.some(
        (item) => item.toLocaleLowerCase() === value.toLocaleLowerCase(),
      )
    ) {
      window.alert('Kategori tersebut sudah ada.');
      return;
    }

    setCategories((current) => [...current, value]);
    setCategory(value);
    setNewCategory('');
  };

  const deleteCategory = (value: string) => {
    if (articles.some((article) => article.category === value)) {
      window.alert(
        'Kategori masih digunakan artikel. Pindahkan atau hapus artikel terkait terlebih dahulu.',
      );
      return;
    }

    if (!window.confirm(`Hapus kategori “${value}”?`)) return;

    setCategories((current) =>
      current.filter((item) => item !== value),
    );

    if (category === value) {
      setCategory(
        categories.find((item) => item !== value) || 'Umum',
      );
    }

    if (filter === value) {
      setFilter('Semua');
    }
  };

  const addFont = () => {
    const value = newFont.trim();
    if (!value) return;

    if (
      fonts.some(
        (item) => item.toLocaleLowerCase() === value.toLocaleLowerCase(),
      )
    ) {
      window.alert('Font sudah ada di daftar.');
      return;
    }

    setFonts((current) => [...current, value]);
    setFont(value);
    setNewFont('');
  };

  const deleteFont = (value: string) => {
    if (
      !window.confirm(
        `Hapus “${value}” dari daftar font? Teks yang sudah diformat tidak diubah.`,
      )
    ) {
      return;
    }

    setFonts((current) => current.filter((item) => item !== value));

    if (font === value) {
      setFont(fonts.find((item) => item !== value) || 'Arial');
    }
  };

  const toolbar = [
    { label: 'Tebal', icon: Bold, action: () => runCommand('bold') },
    { label: 'Miring', icon: Italic, action: () => runCommand('italic') },
    {
      label: 'Garis bawah',
      icon: Underline,
      action: () => runCommand('underline'),
    },
    {
      label: 'Rata kiri',
      icon: AlignLeft,
      action: () => runCommand('justifyLeft'),
    },
    {
      label: 'Rata tengah',
      icon: AlignCenter,
      action: () => runCommand('justifyCenter'),
    },
    {
      label: 'Rata kanan',
      icon: AlignRight,
      action: () => runCommand('justifyRight'),
    },
    {
      label: 'Daftar bullet',
      icon: List,
      action: () => runCommand('insertUnorderedList'),
    },
    {
      label: 'Daftar nomor',
      icon: ListOrdered,
      action: () => runCommand('insertOrderedList'),
    },
    { label: 'Urungkan', icon: Undo2, action: () => runCommand('undo') },
    { label: 'Ulangi', icon: Redo2, action: () => runCommand('redo') },
  ];