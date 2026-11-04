import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Redo2,
  RemoveFormatting, Subscript, Superscript, Underline, Undo2, Upload, X,
} from 'lucide-react';
import { FONT_ACCEPT, FONT_MAX_MB, fontFamilyFromFileName, isFontFile } from '../utils/articleFonts.ts';
import { SYSTEM_FONTS, fontFamilyCss, useUploadedFonts } from '../utils/useUploadedFonts.ts';
import { isRichEmpty, normalizeStoredHtml, sanitizeRichHtml } from '../utils/richText.ts';

/**
 * Satu toolbar untuk banyak kolom (seperti keyboard HP):
 *   <RichEditorProvider>
 *     <RichToolbar />                       // hanya satu
 *     <RichField ... />  <RichField ... />  // kolom pertanyaan, pilihan jawaban, dst.
 *   </RichEditorProvider>
 * Toolbar bekerja pada kolom yang terakhir diklik / sedang diketik.
 */

interface ActiveField { el: HTMLDivElement; emit: () => void; label: string }
interface Ctx {
  register: (field: ActiveField) => void;
  withActive: (fn: (field: ActiveField) => void) => void;
  activeLabel: string;
}
const EditorCtx = createContext<Ctx | null>(null);
const useEditorCtx = () => {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error('RichToolbar / RichField harus berada di dalam RichEditorProvider.');
  return ctx;
};

export const RichEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeRef = useRef<ActiveField | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const [activeLabel, setActiveLabel] = useState('');

  // Simpan posisi kursor / seleksi di kolom aktif, agar tetap ada saat fokus pindah ke toolbar.
  useEffect(() => {
    const save = () => {
      const field = activeRef.current;
      const sel = window.getSelection();
      if (field && sel && sel.rangeCount && field.el.contains(sel.anchorNode)) rangeRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', save);
    return () => document.removeEventListener('selectionchange', save);
  }, []);

  const register = useCallback((field: ActiveField) => {
    if (activeRef.current?.el !== field.el) rangeRef.current = null;
    activeRef.current = field;
    setActiveLabel(field.label);
  }, []);

  const withActive = useCallback((fn: (field: ActiveField) => void) => {
    const field = activeRef.current;
    if (!field || !field.el.isConnected) return;
    field.el.focus();
    const sel = window.getSelection();
    if (sel && rangeRef.current) { sel.removeAllRanges(); sel.addRange(rangeRef.current); }
    fn(field);
    if (sel && sel.rangeCount && field.el.contains(sel.anchorNode)) rangeRef.current = sel.getRangeAt(0).cloneRange();
    field.emit();
  }, []);

  const value = useMemo(() => ({ register, withActive, activeLabel }), [register, withActive, activeLabel]);
  return <EditorCtx.Provider value={value}>{children}</EditorCtx.Provider>;
};

const ZWSP = '\u200B';

/**
 * Kursor tanpa teks yang di-blok: execCommand membuat <font face>/<font size> yang dikalahkan CSS global (tetap Lato),
 * jadi di sini dibuat <span style> langsung di posisi kursor. Teks yang diketik berikutnya masuk ke span itu.
 * Mengembalikan false bila ada teks yang di-blok (ditangani execCommand biasa).
 */
function styleAtCaret(prop: 'font-family' | 'font-size', value: string): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const parent = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
  // Span penanda dari pilihan sebelumnya (masih kosong): cukup ubah gayanya, tanpa membuat span bersarang.
  if (parent && parent.tagName === 'SPAN' && parent.textContent === ZWSP) {
    parent.style.setProperty(prop, value);
    return true;
  }
  const span = document.createElement('span');
  span.style.setProperty(prop, value);
  const marker = document.createTextNode(ZWSP);
  span.appendChild(marker);
  range.insertNode(span);
  const caret = document.createRange();
  caret.setStart(marker, 1);
  caret.collapse(true);
  sel.removeAllRanges();
  sel.addRange(caret);
  return true;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
const btnCls = 'inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const selectCls = 'h-9 rounded-md border border-slate-300 bg-white px-1.5 text-[12px] disabled:opacity-40';

export const RichToolbar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { withActive, activeLabel } = useEditorCtx();
  const { fonts: uploaded, upload, remove } = useUploadedFonts();
  const disabled = !activeLabel;

  const [panelOpen, setPanelOpen] = useState(false);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [fontName, setFontName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const run = (command: string, arg?: string) => withActive(() => { document.execCommand(command, false, arg); });

  const applyFont = (family: string) => {
    if (!family) return;
    withActive(() => {
      if (styleAtCaret('font-family', fontFamilyCss(family))) return;
      // Ada teks yang di-blok. styleWithCSS -> <span style="font-family:..."> (bukan <font face>).
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontName', false, family);
      document.execCommand('styleWithCSS', false, 'false');
    });
  };

  const applySize = (px: number) => {
    if (!px) return;
    withActive((field) => {
      if (styleAtCaret('font-size', `${px}px`)) return;
      document.execCommand('fontSize', false, '7');
      field.el.querySelectorAll('font[size="7"]').forEach((node) => {
        const span = document.createElement('span');
        span.style.fontSize = `${px}px`;
        while (node.firstChild) span.appendChild(node.firstChild);
        node.replaceWith(span);
      });
    });
  };

  const pickFontFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMsg(null);
    if (!file) return;
    if (!isFontFile(file)) { setMsg({ type: 'err', text: 'Format tidak didukung. Gunakan TTF, OTF, WOFF, atau WOFF2.' }); e.target.value = ''; return; }
    if (file.size > FONT_MAX_MB * 1024 * 1024) { setMsg({ type: 'err', text: `Ukuran file font maksimal ${FONT_MAX_MB} MB.` }); e.target.value = ''; return; }
    setFontFile(file);
    setFontName(fontFamilyFromFileName(file.name));
  };

  const submitFont = async () => {
    if (!fontFile) { setMsg({ type: 'err', text: 'Pilih file font terlebih dahulu.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const created = await upload(fontFile, fontName);
      setFontFile(null); setFontName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMsg({ type: 'ok', text: `Font “${created.family}” berhasil diunggah. Pilih dari daftar font.` });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Font gagal diunggah.' });
    } finally { setBusy(false); }
  };

  const deleteFont = async (font: (typeof uploaded)[number]) => {
    if (!window.confirm(`Hapus font “${font.family}”? Soal dan artikel yang memakai font ini akan tampil dengan font cadangan.`)) return;
    try { await remove(font); setMsg(null); }
    catch (err) { setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Font gagal dihapus.' }); }
  };

  const keep = (e: React.MouseEvent) => e.preventDefault(); // cegah kolom kehilangan seleksi saat tombol diklik
  const tool = (title: string, Ico: React.ElementType, onClick: () => void) => (
    <button type="button" title={title} aria-label={title} disabled={disabled} onMouseDown={keep} onClick={onClick} className={btnCls}>
      <Ico aria-hidden="true" className="h-4 w-4" />
    </button>
  );
  const sep = <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-300" />;

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 shadow-sm ${className}`}>
      <div role="toolbar" aria-label="Format teks" className="flex flex-wrap items-center gap-1 p-1.5">
        <select aria-label="Jenis font" disabled={disabled} value="" onChange={(e) => applyFont(e.target.value)} className={selectCls}>
          <option value="">Font</option>
          <optgroup label="Bawaan">
            {SYSTEM_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </optgroup>
          {uploaded.length > 0 && (
            <optgroup label="Font hasil unggah (sama dengan Manajemen Artikel)">
              {uploaded.map((f) => <option key={f.id} value={f.family}>{f.family}</option>)}
            </optgroup>
          )}
        </select>
        <select aria-label="Ukuran font" disabled={disabled} value="" onChange={(e) => applySize(Number(e.target.value))} className={selectCls}>
          <option value="">Ukuran</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
        {sep}
        {tool('Tebal', Bold, () => run('bold'))}
        {tool('Miring', Italic, () => run('italic'))}
        {tool('Garis bawah', Underline, () => run('underline'))}
        {tool('Subskrip', Subscript, () => run('subscript'))}
        {tool('Superskrip', Superscript, () => run('superscript'))}
        {sep}
        {tool('Rata kiri', AlignLeft, () => run('justifyLeft'))}
        {tool('Rata tengah', AlignCenter, () => run('justifyCenter'))}
        {tool('Rata kanan', AlignRight, () => run('justifyRight'))}
        {tool('Daftar bullet', List, () => run('insertUnorderedList'))}
        {tool('Daftar nomor', ListOrdered, () => run('insertOrderedList'))}
        {sep}
        {tool('Hapus format', RemoveFormatting, () => run('removeFormat'))}
        {tool('Urungkan', Undo2, () => run('undo'))}
        {tool('Ulangi', Redo2, () => run('redo'))}
        {sep}
        <button
          type="button" aria-expanded={panelOpen} onClick={() => { setPanelOpen((v) => !v); setMsg(null); }}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-[12px] font-semibold text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <Upload aria-hidden="true" className="h-3.5 w-3.5" />Unggah Font
        </button>
      </div>
      <p className="border-t border-slate-200 px-3 py-1 text-[11px] text-slate-500" aria-live="polite">
        {activeLabel ? <>Mengedit: <strong className="text-slate-700">{activeLabel}</strong></> : 'Klik kolom pertanyaan atau pilihan jawaban, lalu gunakan toolbar ini.'}
      </p>

      {panelOpen && (
        <div className="space-y-2 border-t border-slate-200 bg-emerald-50/40 p-3 text-[12px]">
          <p className="text-slate-600">Unggah file font (TTF, OTF, WOFF, WOFF2; maks. {FONT_MAX_MB} MB), misalnya font isyarat atau Braille. Font disimpan di daftar yang sama dengan Manajemen Artikel dan tampil sama untuk peserta.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 font-semibold text-white hover:bg-slate-800 cursor-pointer">
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />{fontFile ? 'Ganti File' : 'Pilih File Font'}
              <input ref={fileInputRef} type="file" accept={FONT_ACCEPT} className="hidden" onChange={pickFontFile} />
            </label>
            <div className="min-w-[10rem] flex-1">
              <label htmlFor="soal-fontname" className="mb-0.5 block font-semibold text-slate-700">Nama font</label>
              <input id="soal-fontname" value={fontName} maxLength={60} onChange={(e) => setFontName(e.target.value)} placeholder="Nama yang tampil di daftar" className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[13px]" />
            </div>
            <button type="button" disabled={busy || !fontFile} onClick={() => void submitFont()} className="h-9 rounded-lg bg-primary px-4 font-semibold text-on-primary disabled:opacity-50 cursor-pointer">
              {busy ? 'Mengunggah…' : 'Unggah'}
            </button>
          </div>
          {fontFile && <p className="text-slate-600">File dipilih: <strong>{fontFile.name}</strong></p>}
          {msg && <p role={msg.type === 'err' ? 'alert' : 'status'} className={msg.type === 'err' ? 'text-rose-700' : 'text-emerald-700'}>{msg.text}</p>}
          {uploaded.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Font hasil unggah">
              {uploaded.map((f) => (
                <li key={f.id} className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white py-0.5 pl-2.5 pr-1 text-slate-800">
                  <span style={{ fontFamily: fontFamilyCss(f.family) }}>{f.family}</span>
                  <span className="rounded bg-emerald-100 px-1 text-[10px] font-semibold uppercase text-emerald-800">{f.format}</span>
                  <button type="button" aria-label={`Hapus font ${f.family}`} onClick={() => void deleteFont(f)} className="rounded-full p-1 hover:bg-emerald-100 cursor-pointer"><X aria-hidden="true" className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

interface FieldProps {
  id: string;
  /** Nama kolom, ditampilkan di toolbar ("Mengedit: …"). */
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  required?: boolean;
}

/** Kolom ketik tanpa toolbar sendiri; formatnya diatur oleh <RichToolbar /> bersama. */
export const RichField: React.FC<FieldProps> = ({ id, label, value, onChange, placeholder, minHeight = 96, required }) => {
  const { register } = useEditorCtx();
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [empty, setEmpty] = useState(true);

  // Sinkronkan isi dengan `value` dari luar (mis. form di-reset) tanpa menimpa ketikan pengguna.
  useEffect(() => {
    const el = ref.current;
    if (!el || value === lastEmitted.current) return;
    el.innerHTML = sanitizeRichHtml(normalizeStoredHtml(value));
    lastEmitted.current = value;
    setEmpty(isRichEmpty(value));
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const blank = isRichEmpty(el.innerHTML);
    const html = blank ? '' : sanitizeRichHtml(el.innerHTML).replace(/\u200B/g, '');
    lastEmitted.current = html;
    setEmpty(blank);
    onChangeRef.current(html);
  }, []);

  const activate = () => { if (ref.current) register({ el: ref.current, emit, label }); };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Tempel sebagai teks polos agar format dari Word / web tidak ikut masuk.
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  };

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
      {empty && placeholder && (
        <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-2.5 text-[13px] text-slate-400">{placeholder}</span>
      )}
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        aria-required={required || undefined}
        contentEditable
        suppressContentEditableWarning
        onFocus={activate}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        style={{ minHeight }}
        className="rich-content w-full overflow-auto rounded-xl px-3.5 py-2.5 text-[13px] text-slate-900 focus:outline-none"
      />
    </div>
  );
};
