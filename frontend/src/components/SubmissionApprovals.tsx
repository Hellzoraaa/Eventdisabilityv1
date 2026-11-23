import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TrainingProposal, TPQProgram, User } from '../types.ts';
import { SubmissionDetailModal, SubmissionSummary, DetailButton, eventToItem, tpqToItem } from './SubmissionShared.tsx';

type Kind = 'semua' | 'event' | 'tpq';
type Status = 'semua' | 'menunggu_persetujuan' | 'disetujui' | 'event_terbatas' | 'ditolak';


export const SubmissionApprovals: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [events, setEvents] = useState<TrainingProposal[]>([]);
  const [programs, setPrograms] = useState<TPQProgram[]>([]);
  const [kind, setKind] = useState<Kind>('semua');
  const [status, setStatus] = useState<Status>('menunggu_persetujuan');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);
  const [decisionItem, setDecisionItem] = useState<any>(null);
  const [decisionMode, setDecisionMode] = useState<'public' | 'private'>('public');
  const [eventCategories, setEventCategories] = useState<any[]>([]);
  const [approvedPrivateLink, setApprovedPrivateLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [eventRes, tpqRes, categoryRes] = await Promise.all([fetch('/api/events'), fetch('/api/tpq'), fetch('/api/event-categories')]);
      const [eventData, tpqData, categoryData] = await Promise.all([eventRes.json(), tpqRes.json(), categoryRes.json()]);
      if (!eventRes.ok) throw new Error(eventData.error || 'Gagal memuat pengajuan event.');
      if (!tpqRes.ok) throw new Error(tpqData.error || 'Gagal memuat pengajuan TPQ.');
      setEvents(Array.isArray(eventData.events) ? eventData.events : []);
      setPrograms(Array.isArray(tpqData.programs) ? tpqData.programs : []);
      setEventCategories(Array.isArray(categoryData.categories) ? categoryData.categories : Array.isArray(categoryData.data) ? categoryData.data : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat pengajuan.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const items = useMemo(() => {
    const all = [
      ...events.map(eventToItem),
      ...programs.map(tpqToItem),
    ];
    const q = search.trim().toLowerCase();
    return all.filter(x => { const raw = x.raw as TrainingProposal; const matchesStatus = status === 'semua' || (status === 'event_terbatas' ? x.kind === 'event' && raw.publishMode === 'private' && x.status === 'disetujui' : status === 'disetujui' ? x.status === 'disetujui' && (x.kind !== 'event' || raw.publishMode !== 'private') : x.status === status); return (kind === 'semua' || x.kind === kind) && matchesStatus && (!q || `${x.title} ${x.org} ${x.city}`.toLowerCase().includes(q)); }).sort((a,b) => (a.status === 'menunggu_persetujuan' ? 0 : 1) - (b.status === 'menunggu_persetujuan' ? 0 : 1));
  }, [events, programs, kind, status, search]);

  const act = async (item: (typeof items)[number], action: 'approve' | 'reject', publishMode: 'public' | 'private' = 'public') => {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt(`Tuliskan alasan penolakan untuk “${item.title}”:`, 'Mohon lengkapi atau perbaiki informasi pengajuan.')?.trim() || '';
      if (!reason) return;
    } else {
      if (publishMode === 'private') {
        const raw = item.raw as TrainingProposal;
        const categoryId = String(raw.eventCategoryIdString || raw.eventCategoryId || '').trim();
        const category = eventCategories.find(c => String(c.id || c.categoryIdString) === categoryId || String(c.kode || '').toLowerCase() === categoryId.toLowerCase());
        if (!categoryId || !category || category.isAktif === false) { setError(`Event “${item.title}” belum memiliki kategori event yang valid. Periksa kategori pada data pengajuan/master kategori sebelum menyetujui sebagai Event Terbatas.`); return; }
        if (!window.confirm(`Kategori event ini adalah “${category.nama}”. Lanjutkan persetujuan sebagai Event Terbatas?`)) return;
      } else if (!window.confirm(`Setujui “${item.title}” dan tampilkan di homepage serta peta?`)) return;
    }
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const url = item.kind === 'event' ? `/api/events/${encodeURIComponent(item.id)}/${action}` : `/api/tpq/${encodeURIComponent(item.id)}/${action}`;
      const body = item.kind === 'event' && action === 'approve'
        ? { targetKuota: (item.raw as TrainingProposal).targetDanKuotaPeserta, reviewerId: currentUser.id, publishMode }
        : action === 'reject' ? { alasanPenolakan: reason, reviewerId: currentUser.id } : { reviewerId: currentUser.id };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pengajuan.');
      if (action === 'approve' && item.kind === 'event' && publishMode === 'private') {
        const privateLink = `${window.location.origin}/#undangan/${String(item.title || 'event').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}/`;
        if (!privateLink) throw new Error('Event berhasil diproses, tetapi link terbatas tidak diterima dari server. Periksa data event di database.');
        setApprovedPrivateLink(privateLink);
        setNotice('Event berhasil disetujui sebagai Event Terbatas.');
      } else {
        setNotice(action === 'approve' && item.kind === 'event' ? `Event “${item.title}” disetujui sebagai event publik di homepage dan peta.` : `Pengajuan “${item.title}” berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.`);
      }
      setDecisionItem(null);
      window.dispatchEvent(new Event('data-refresh'));
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memproses pengajuan.'); }
    finally { setBusyId(null); }
  };

  const pendingCount = events.filter(e => e.status === 'menunggu_persetujuan').length + programs.filter(p => p.status === 'menunggu_persetujuan').length;
  const approvedCount = events.filter(e => e.status === 'disetujui').length + programs.filter(p => p.status === 'disetujui').length;
  const rejectedCount = events.filter(e => e.status === 'ditolak').length + programs.filter(p => p.status === 'ditolak').length;

  if (currentUser.role !== 'superadmin') return <div className="p-8 text-center text-red-700">Halaman ini hanya dapat diakses Super Admin.</div>;
  return <div className="space-y-6 p-4 md:p-7">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><div className="text-xs uppercase tracking-widest font-bold text-sky-700">Moderasi & Verifikasi</div><h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">Persetujuan Pengajuan</h1><p className="text-sm text-slate-600 mt-2">Tinjau pengajuan Event dan Pendidikan TPQ dari seluruh mitra sebelum dipublikasikan.</p></div>
      <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50">↻ Perbarui data</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[['Menunggu Persetujuan', pendingCount, 'bg-amber-50 text-amber-800'], ['Disetujui', approvedCount, 'bg-emerald-50 text-emerald-800'], ['Ditolak', rejectedCount, 'bg-rose-50 text-rose-800']].map(([label, count, cls]) => <div key={String(label)} className="bg-white rounded-2xl border border-slate-200 p-5"><div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{label}</div><div className="text-3xl font-bold mt-3 text-slate-900">{count}</div></div>)}
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama pengajuan, mitra, atau kota…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
      <select value={kind} onChange={e => setKind(e.target.value as Kind)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="semua">Semua kategori</option><option value="event">Event</option><option value="tpq">Pendidikan</option></select>
      <select value={status} onChange={e => setStatus(e.target.value as Status)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="menunggu_persetujuan">Menunggu Persetujuan</option><option value="semua">Semua status</option><option value="disetujui">Disetujui (Tampil di Web & Peta)</option><option value="event_terbatas">Event Terbatas</option><option value="ditolak">Ditolak</option></select>
    </div>
    <div className="space-y-3">
      {loading ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">Memuat data pengajuan…</div> : items.length === 0 ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center"><div className="text-lg font-bold text-slate-800">Tidak ada pengajuan</div><p className="text-sm text-slate-500 mt-1">Tidak ada data yang cocok dengan filter saat ini.</p></div> : items.map(item => <article key={`${item.kind}-${item.id}`} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4"><SubmissionSummary item={item} />
          <div className="flex flex-wrap gap-2 shrink-0"><DetailButton kind={item.kind} onClick={() => setDetailItem(item)} />{item.status === 'menunggu_persetujuan' && <><button disabled={busyId === item.id} onClick={() => { setDecisionItem(item); setDecisionMode('public'); setError(''); }} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busyId === item.id ? 'Memproses…' : 'Setujui'}</button><button disabled={busyId === item.id} onClick={() => void act(item, 'reject')} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Tolak</button></>}</div>
        </div>
      </article>)}
    </div>
    {detailItem && <SubmissionDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
    {decisionItem && <div className="fixed inset-0 z-[100] bg-slate-950/50 flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"><div><h2 className="text-xl font-bold text-slate-900">Tentukan Persetujuan Event</h2><p className="text-sm text-slate-600 mt-1">Pilih bagaimana event ini akan ditampilkan setelah disetujui.</p></div><label className="block text-sm font-semibold text-slate-700">Status persetujuan<select value={decisionMode} onChange={e => setDecisionMode(e.target.value as 'public' | 'private')} className="mt-2 w-full rounded-xl border border-slate-300 p-3"><option value="public">Disetujui — Tampil di Homepage & Peta</option><option value="private">Disetujui — Event Terbatas</option></select></label>{decisionMode === 'private' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b>Validasi kategori wajib.</b><p className="mt-1">Sistem akan memeriksa kategori event yang dipilih mitra. Persetujuan Event Terbatas hanya dapat dilanjutkan jika kategori terdaftar dan aktif pada master kategori.</p></div>}<div className="flex justify-end gap-2"><button onClick={() => setDecisionItem(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Batal</button><button disabled={busyId === decisionItem.id} onClick={() => void act(decisionItem, 'approve', decisionMode)} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busyId === decisionItem.id ? 'Memproses…' : 'Konfirmasi Persetujuan'}</button></div></div></div>}
    {approvedPrivateLink && <div className="fixed inset-0 z-[120] bg-slate-950/60 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-labelledby="private-link-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4"><div><div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Persetujuan berhasil</div><h2 id="private-link-title" className="mt-1 text-xl font-bold text-slate-900">Tautan Undangan Peserta</h2><p className="mt-2 text-sm text-slate-600">Event Terbatas tidak tampil untuk umum. Bagikan tautan ini hanya kepada peserta yang diizinkan.</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-1 text-xs font-semibold text-slate-500">LINK UNDANGAN</div><p title={approvedPrivateLink} className="truncate font-mono text-sm text-slate-800">{approvedPrivateLink}</p><p className="mt-2 text-xs text-slate-500">Tautan lengkap akan disalin melalui tombol di bawah.</p></div><div className="flex flex-wrap justify-end gap-2"><a href={approvedPrivateLink} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Buka Link</a><button onClick={() => { void navigator.clipboard?.writeText(approvedPrivateLink); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Salin Link</button><button onClick={() => setApprovedPrivateLink(null)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Selesai</button></div></div></div>}
  </div>;
};
