import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';
import { RichEditorProvider, RichField, RichToolbar } from './RichTextEditor.tsx';
import { RichContent } from './RichContent.tsx';
import { TrainingProposal, User } from '../types.ts';
import { isRichEmpty } from '../utils/richText.ts';

interface Soal {
  id: string;
  eventId: string;
  tipe: 'pretest' | 'postest' | 'latihan';
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: string;
}

interface Props {
  currentUser: User;
  events: TrainingProposal[];
}

/** Satu soal di dalam form. Beberapa soal dalam satu form disimpan sekaligus sebagai satu kelompok (event dan jenis sama). */
interface Draft { key: string; pertanyaan: string; pilihan: string[]; jawabanBenar: string }
const MAX_DRAFTS = 50;
const newDraft = (): Draft => ({ key: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, pertanyaan: '', pilihan: ['', '', '', ''], jawabanBenar: 'A' });

const TIPE_LABEL: Record<Soal['tipe'], string> = { pretest: 'Pretest', postest: 'Postest', latihan: 'Latihan' };
const HURUF = ['A', 'B', 'C', 'D', 'E'];

export const BankSoal: React.FC<Props> = ({ currentUser, events }) => {
  const [soal, setSoal] = useState<Soal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filterTipe, setFilterTipe] = useState<'semua' | Soal['tipe']>('semua');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [eventId, setEventId] = useState('');
  const [tipe, setTipe] = useState<Soal['tipe']>('pretest');
  // Pertanyaan dan pilihan disimpan sebagai HTML hasil editor teks.
  const [drafts, setDrafts] = useState<Draft[]>(() => [newDraft()]);
  const focusKey = useRef<string | null>(null);

  const myEvents = events.filter(e => currentUser.role === 'superadmin' || String(e.mitraId) === String(currentUser.id));

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/bank-soal');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat bank soal.');
      setSoal(Array.isArray(data.soal) ? data.soal : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat bank soal.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const reset = () => setDrafts([newDraft()]);

  const patchDraft = (key: string, fn: (d: Draft) => Draft) => setDrafts(prev => prev.map(d => d.key === key ? fn(d) : d));

  const addDraft = () => {
    if (drafts.length >= MAX_DRAFTS) { setError(`Maksimal ${MAX_DRAFTS} soal sekali simpan.`); return; }
    const d = newDraft();
    focusKey.current = d.key;
    setError('');
    setDrafts(prev => [...prev, d]);
  };

  const removeDraft = (key: string) => {
    const d = drafts.find(x => x.key === key);
    const hasContent = d && (!isRichEmpty(d.pertanyaan) || d.pilihan.some(p => !isRichEmpty(p)));
    if (hasContent && !window.confirm('Hapus soal ini dari form?')) return;
    setDrafts(prev => prev.length > 1 ? prev.filter(x => x.key !== key) : prev);
  };

  // Soal yang baru ditambahkan langsung diberi fokus pada kolom pertanyaannya.
  useEffect(() => {
    const key = focusKey.current;
    if (!key) return;
    focusKey.current = null;
    const el = document.getElementById(`soal-${key}-pertanyaan`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [drafts]);

  // Validasi di browser (server memvalidasi ulang). Mengembalikan pesan error atau null.
  const validateDraft = (d: Draft): string | null => {
    if (isRichEmpty(d.pertanyaan)) return 'Pertanyaan wajib diisi.';
    const filled = d.pilihan.map(p => !isRichEmpty(p));
    const lastFilled = filled.lastIndexOf(true);
    if (filled.filter(Boolean).length < 2) return 'Isi minimal 2 pilihan jawaban.';
    if (filled.slice(0, lastFilled + 1).some(f => !f)) return 'Isi pilihan jawaban secara berurutan (A, B, C, D) tanpa melewatkan satu pun.';
    if (HURUF.indexOf(d.jawabanBenar) > lastFilled) return 'Jawaban benar harus salah satu pilihan yang terisi.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');

    for (let i = 0; i < drafts.length; i++) {
      const problem = validateDraft(drafts[i]);
      if (problem) { setError(drafts.length > 1 ? `Soal ${i + 1}: ${problem}` : problem); return; }
    }

    setSaving(true);
    try {
      const items = drafts.map(d => {
        const lastFilled = d.pilihan.map(p => !isRichEmpty(p)).lastIndexOf(true);
        return { pertanyaan: d.pertanyaan, pilihan: d.pilihan.slice(0, lastFilled + 1), jawabanBenar: d.jawabanBenar };
      });
      const res = await fetch('/api/bank-soal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: eventId || null, tipe, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan soal.');
      const total = Number(data.inserted) || items.length;
      setNotice(total > 1 ? `${total} soal berhasil ditambahkan.` : 'Soal berhasil ditambahkan.');
      reset(); setShowForm(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan soal.'); }
    finally { setSaving(false); }
  };

  const remove = async (item: Soal) => {
    if (!window.confirm('Hapus soal ini?')) return;
    try {
      const res = await fetch(`/api/bank-soal/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus soal.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menghapus soal.'); }
  };

  const eventName = (id: string) => events.find(e => e.id === id)?.namaKegiatan || 'Semua event';
  const shown = soal.filter(s => filterTipe === 'semua' || s.tipe === filterTipe);
  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="space-y-5 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bank Soal</h1>
          <p className="text-sm text-slate-600 mt-1.5">Bank soal terpusat. Soal pretest dan postest tampil untuk peserta di menu Pendidikan, lalu Test. Soal tanpa event tertentu berlaku untuk semua event.</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setError(''); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold cursor-pointer">
          <Icon name="add_circle" className="text-[18px]" />{showForm ? 'Tutup Form' : 'Tambah Soal'}
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {showForm && (
        <RichEditorProvider>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-[13px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block font-semibold mb-1">Event</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className={inputCls}>
                <option value="">Semua event (soal umum)</option>
                {myEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.namaKegiatan}</option>)}
              </select></div>
            <div><label className="block font-semibold mb-1">Jenis Soal *</label>
              <select value={tipe} onChange={e => setTipe(e.target.value as Soal['tipe'])} className={inputCls}>
                <option value="pretest">Pretest</option><option value="postest">Postest</option><option value="latihan">Latihan</option>
              </select></div>
          </div>

          {/* Satu toolbar untuk semua kolom: berlaku di kolom yang sedang diklik (pertanyaan atau pilihan jawaban). */}
          <RichToolbar className="sticky top-2 z-10" />

          {drafts.map((d, n) => (
            <fieldset key={d.key} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <legend className="px-2 text-[13px] font-bold text-slate-800">Soal {n + 1}</legend>
              {drafts.length > 1 && (
                <div className="flex justify-end -mt-2">
                  <button type="button" onClick={() => removeDraft(d.key)} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-[12px] font-semibold hover:bg-rose-50 cursor-pointer">Hapus Soal {n + 1}</button>
                </div>
              )}
              <div>
                <span className="block font-semibold mb-1">Pertanyaan *</span>
                <RichField id={`soal-${d.key}-pertanyaan`} label={`Soal ${n + 1}: Pertanyaan`} value={d.pertanyaan} placeholder="Ketik pertanyaan di sini…" minHeight={120} required
                  onChange={html => patchDraft(d.key, x => ({ ...x, pertanyaan: html }))} />
              </div>

              <div className="space-y-3">
                <span className="block font-semibold">Pilihan Jawaban * <span className="font-normal text-slate-500">(minimal 2, isi berurutan)</span></span>
                {d.pilihan.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-6 pt-2.5 font-bold text-slate-600 shrink-0">{HURUF[i]}.</span>
                    <div className="min-w-0 flex-1">
                      <RichField id={`soal-${d.key}-pilihan-${i}`} label={`Soal ${n + 1}: Pilihan ${HURUF[i]}`} value={p} placeholder={`Pilihan ${HURUF[i]}`} minHeight={44}
                        onChange={html => patchDraft(d.key, x => ({ ...x, pilihan: x.pilihan.map((v, j) => j === i ? html : v) }))} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="max-w-xs"><label className="block font-semibold mb-1" htmlFor={`soal-${d.key}-kunci`}>Jawaban Benar *</label>
                <select id={`soal-${d.key}-kunci`} value={d.jawabanBenar} onChange={e => patchDraft(d.key, x => ({ ...x, jawabanBenar: e.target.value }))} className={inputCls}>
                  {d.pilihan.map((_, i) => <option key={i} value={HURUF[i]}>{HURUF[i]}</option>)}
                </select></div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-100">Batal</button>
            <button type="button" onClick={addDraft} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary text-primary font-semibold hover:bg-primary/5 cursor-pointer">
              <Icon name="add_circle" className="text-[18px]" />Tambah Soal
            </button>
            <button disabled={saving} type="submit" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold disabled:opacity-50">
              {saving ? 'Menyimpan...' : drafts.length > 1 ? `Simpan ${drafts.length} Soal` : 'Simpan Soal'}
            </button>
          </div>
        </form>
        </RichEditorProvider>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {(['semua', 'pretest', 'postest', 'latihan'] as const).map(t => (
          <button key={t} onClick={() => setFilterTipe(t)} className={`px-4 py-2 text-[13px] font-semibold rounded-full whitespace-nowrap ${filterTipe === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t === 'semua' ? 'Semua' : TIPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">Memuat bank soal…</div>
          : shown.length === 0 ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">Belum ada soal.</div>
          : shown.map((s, idx) => (
            <article key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="rounded-full bg-sky-50 text-sky-800 px-2.5 py-1 text-[11px] font-bold">{TIPE_LABEL[s.tipe]}</span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-semibold">{s.eventId ? eventName(s.eventId) : 'Semua event'}</span>
                  </div>
                  <div className="flex gap-1.5 font-semibold text-slate-900">
                    <span className="shrink-0">{idx + 1}.</span>
                    <RichContent html={s.pertanyaan} className="min-w-0 flex-1" />
                  </div>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {s.pilihan.map((p, i) => (
                      <li key={i} className={`flex gap-1.5 ${HURUF[i] === s.jawabanBenar ? 'font-bold text-emerald-700' : 'text-slate-600'}`}>
                        <span className="shrink-0">{HURUF[i]}.</span>
                        <RichContent html={p} className="min-w-0" />
                        {HURUF[i] === s.jawabanBenar && <span aria-label="jawaban benar">✓</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => void remove(s)} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-[12px] font-semibold hover:bg-rose-50 shrink-0">Hapus</button>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
};
