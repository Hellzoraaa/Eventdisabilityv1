import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.tsx';
import { User } from '../types.ts';

interface Kata { id: string; kata: string; kategori: string; deskripsi: string; videoUrl: string; }

const KATEGORI = ['Ibadah', 'Al-Qur’an', 'Akhlak', 'Aqidah', 'Doa Harian', 'Lainnya'];

export const KosakataIsyarat: React.FC<{ currentUser?: User | null }> = ({ currentUser }) => {
  const canManage = currentUser?.role === 'superadmin' || currentUser?.role === 'mitra';
  const [items, setItems] = useState<Kata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kata, setKata] = useState('');
  const [kategori, setKategori] = useState(KATEGORI[0]);
  const [deskripsi, setDeskripsi] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/kosakata-isyarat');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat kosakata.');
      setItems(Array.isArray(data.kosakata) ? data.kosakata : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat kosakata.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => (kategoriFilter === 'Semua' || i.kategori === kategoriFilter) && (!q || `${i.kata} ${i.deskripsi}`.toLowerCase().includes(q)));
  }, [items, search, kategoriFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/kosakata-isyarat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kata, kategori, deskripsi, videoUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kosakata.');
      setKata(''); setDeskripsi(''); setVideoUrl(''); setShowForm(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menyimpan kosakata.'); }
    finally { setSaving(false); }
  };

  const remove = async (item: Kata) => {
    if (!window.confirm(`Hapus kosakata “${item.kata}”?`)) return;
    try {
      const res = await fetch(`/api/kosakata-isyarat/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus kosakata.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal menghapus kosakata.'); }
  };

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="space-y-5 p-4 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Kosakata Isyarat Keislaman</h1>
          <p className="text-sm text-slate-600 mt-1.5">Perbendaharaan kosakata bahasa isyarat untuk istilah-istilah keislaman.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold cursor-pointer">
            <Icon name="add_circle" className="text-[18px]" />{showForm ? 'Tutup Form' : 'Tambah Kosakata'}
          </button>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

      {canManage && showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-[13px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block font-semibold mb-1">Kata / Istilah *</label><input required value={kata} onChange={e => setKata(e.target.value)} className={inputCls} placeholder="Contoh: Wudhu" /></div>
            <div><label className="block font-semibold mb-1">Kategori</label><select value={kategori} onChange={e => setKategori(e.target.value)} className={inputCls}>{KATEGORI.map(k => <option key={k}>{k}</option>)}</select></div>
          </div>
          <div><label className="block font-semibold mb-1">Cara Isyarat / Keterangan</label><textarea rows={3} value={deskripsi} onChange={e => setDeskripsi(e.target.value)} className={inputCls} placeholder="Jelaskan gerakan isyarat" /></div>
          <div><label className="block font-semibold mb-1">Tautan Video (opsional)</label><input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-100">Batal</button>
            <button disabled={saving} type="submit" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kosakata…" className={`${inputCls} flex-1`} />
        <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)} className={`${inputCls} sm:w-56`}>
          <option>Semua</option>{KATEGORI.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {loading ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">Memuat kosakata…</div>
        : shown.length === 0 ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">Belum ada kosakata.</div>
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map(i => (
            <article key={i.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900" style={{ overflowWrap: 'anywhere' }}>{i.kata}</h3>
                <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-1 text-[11px] font-bold shrink-0">{i.kategori || 'Lainnya'}</span>
              </div>
              {i.deskripsi && <p className="text-[13px] text-slate-600 whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{i.deskripsi}</p>}
              <div className="flex items-center gap-3 mt-auto pt-2">
                {i.videoUrl && <a href={i.videoUrl} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-primary hover:underline inline-flex items-center gap-1"><Icon name="play_circle" className="text-[16px]" />Lihat video</a>}
                {canManage && <button onClick={() => void remove(i)} className="ml-auto text-[12px] font-semibold text-rose-700 hover:underline">Hapus</button>}
              </div>
            </article>
          ))}
        </div>}
    </div>
  );
};
