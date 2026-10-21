import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { TrainingProposal, User } from '../types.ts';

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
  const [pertanyaan, setPertanyaan] = useState('');
  const [pilihan, setPilihan] = useState<string[]>(['', '', '', '']);
  const [jawabanBenar, setJawabanBenar] = useState('A');

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

  const reset = () => { setPertanyaan(''); setPilihan(['', '', '', '']); setJawabanBenar('A'); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/bank-soal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: eventId || null, tipe, pertanyaan, pilihan, jawabanBenar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan soal.');
      setNotice('Soal berhasil ditambahkan.');
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
          <div><label className="block font-semibold mb-1">Pertanyaan *</label>
            <textarea required rows={3} value={pertanyaan} onChange={e => setPertanyaan(e.target.value)} className={inputCls} /></div>
          <div className="space-y-2">
            <label className="block font-semibold">Pilihan Jawaban * (minimal 2)</label>
            {pilihan.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 font-bold text-slate-600">{HURUF[i]}.</span>
                <input value={p} onChange={e => setPilihan(prev => prev.map((v, j) => j === i ? e.target.value : v))} className={inputCls} placeholder={`Pilihan ${HURUF[i]}`} />
              </div>
            ))}
          </div>
          <div className="max-w-xs"><label className="block font-semibold mb-1">Jawaban Benar *</label>
            <select value={jawabanBenar} onChange={e => setJawabanBenar(e.target.value)} className={inputCls}>
              {pilihan.map((_, i) => <option key={i} value={HURUF[i]}>{HURUF[i]}</option>)}
            </select></div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-100">Batal</button>
            <button disabled={saving} type="submit" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Soal'}</button>
          </div>
        </form>
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
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="rounded-full bg-sky-50 text-sky-800 px-2.5 py-1 text-[11px] font-bold">{TIPE_LABEL[s.tipe]}</span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-semibold">{s.eventId ? eventName(s.eventId) : 'Semua event'}</span>
                  </div>
                  <p className="font-semibold text-slate-900 whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{idx + 1}. {s.pertanyaan}</p>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {s.pilihan.map((p, i) => <li key={i} className={HURUF[i] === s.jawabanBenar ? 'font-bold text-emerald-700' : 'text-slate-600'}>{HURUF[i]}. {p}{HURUF[i] === s.jawabanBenar ? ' ✓' : ''}</li>)}
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
