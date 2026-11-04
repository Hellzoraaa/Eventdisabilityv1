import { useCallback, useEffect, useState } from 'react';
import {
  FONT_MAX_MB, isFontFile, loadArticleFonts, readFileAsBase64, type UploadedFont,
} from './articleFonts.ts';

/** Font bawaan sistem yang selalu tersedia di dropdown editor. */
export const SYSTEM_FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New'];

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const API = `${API_BASE}/api`;

// Satu daftar font dipakai bersama oleh semua editor di halaman, sehingga unggahan di satu editor langsung muncul di editor lain.
let cache: UploadedFont[] = [];
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<(fonts: UploadedFont[]) => void>();
const publish = () => listeners.forEach((listener) => listener(cache));

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API}/article-fonts`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      cache = res.ok && Array.isArray(data.fonts) ? data.fonts : [];
    } catch {
      cache = [];
    }
    loaded = true;
    loadArticleFonts(Date.now());
    publish();
  })().finally(() => { inflight = null; });
  return inflight;
}

export function fontFamilyCss(family: string): string {
  return `"${family.replace(/["']/g, '')}", sans-serif`;
}

export function useUploadedFonts() {
  const [fonts, setFonts] = useState<UploadedFont[]>(cache);

  useEffect(() => {
    listeners.add(setFonts);
    if (!loaded) void refresh(); else { loadArticleFonts(); setFonts(cache); }
    return () => { listeners.delete(setFonts); };
  }, []);

  const upload = useCallback(async (file: File, familyInput: string): Promise<UploadedFont> => {
    if (!isFontFile(file)) throw new Error('Format file tidak didukung. Gunakan TTF, OTF, WOFF, atau WOFF2.');
    if (file.size > FONT_MAX_MB * 1024 * 1024) throw new Error(`Ukuran file font maksimal ${FONT_MAX_MB} MB.`);
    const family = familyInput.trim();
    if (!family) throw new Error('Nama font wajib diisi.');
    const taken = [...SYSTEM_FONTS, ...cache.map((f) => f.family)].some((n) => n.toLowerCase() === family.toLowerCase());
    if (taken) throw new Error('Nama font sudah ada di daftar.');
    const data = await readFileAsBase64(file);
    const res = await fetch(`${API}/admin/article-fonts`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family, fileName: file.name, data }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Font gagal diunggah.');
    const created: UploadedFont = body.font;
    cache = [...cache, created];
    loadArticleFonts(Date.now());
    publish();
    return created;
  }, []);

  const remove = useCallback(async (font: UploadedFont) => {
    const res = await fetch(`${API}/admin/article-fonts/${font.id}`, { method: 'DELETE', credentials: 'include' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Font gagal dihapus.');
    cache = cache.filter((f) => f.id !== font.id);
    loadArticleFonts(Date.now());
    publish();
  }, []);

  return { fonts, upload, remove };
}
