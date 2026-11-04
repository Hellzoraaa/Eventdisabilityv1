import React, { useEffect, useMemo } from 'react';
import { loadArticleFonts } from '../utils/articleFonts.ts';
import { toDisplayHtml } from '../utils/richText.ts';

/**
 * Menampilkan teks soal / pilihan jawaban hasil editor (HTML yang sudah dibersihkan).
 * Juga memuat font hasil unggah agar tampil sama seperti di editor, termasuk di halaman test peserta.
 */
export const RichContent: React.FC<{ html: string; className?: string }> = ({ html, className = '' }) => {
  useEffect(() => { loadArticleFonts(); }, []);
  const safe = useMemo(() => toDisplayHtml(html), [html]);
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: safe }} />;
};
