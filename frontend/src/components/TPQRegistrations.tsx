import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.tsx';

export interface TPQRegistration {
  id: string;
  programId: string;
  programName: string;
  mitraName: string;
  namaLengkap: string;
  noWa: string;
  email: string;
  usia: number;
  kategoriDisabilitas: string;
  gender: string;
  alamat?: string;
  catatanKhusus: string;
  waktuDaftar: string;
}

interface Props {
  /** 'superadmin' menampilkan semua peserta + kolom Mitra; 'mitra' hanya peserta program miliknya (dibatasi di server). */
  scope: 'mitra' | 'superadmin';
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const TPQRegistrations: React.FC<Props> = ({ scope }) => {
  const [rows, setRows] = useState<TPQRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [kategoriFilter, setKategoriFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tpq/registrations');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal memuat peserta TPQ.');
      setRows(Array.isArray(data.registrations) ? data.registrations : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat peserta TPQ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const programs = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => map.set(r.programId, r.programName || r.programId));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'id'));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (programFilter !== 'all' && r.programId !== programFilter) return false;
      if (kategoriFilter !== 'all' && r.kategoriDisabilitas !== kategoriFilter) return false;
      if (!q) return true;
      return [r.namaLengkap, r.noWa, r.email, r.programName, r.mitraName]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, search, programFilter, kategoriFilter]);

  const totalNetra = rows.filter(r => r.kategoriDisabilitas === 'Tunanetra').length;
  const totalRungu = rows.filter(r => r.kategoriDisabilitas === 'Tunarungu').length;

  const exportCsv = () => {
    const header = ['No', 'Nama Lengkap', 'Usia', 'Jenis Kelamin', 'Alamat', 'Kategori Peserta', 'No WhatsApp', 'Email', 'Lembaga Pendidikan'];
    if (scope === 'superadmin') header.push('Mitra Penyelenggara');
    header.push('Catatan Khusus', 'Waktu Pendaftaran');
    const lines = filtered.map((r, i) => {
      const cols: unknown[] = [i + 1, r.namaLengkap, r.usia || '', r.gender || '', (r as any).alamat || '', r.kategoriDisabilitas, r.noWa, r.email, r.programName];
      if (scope === 'superadmin') cols.push(r.mitraName);
      cols.push(r.catatanKhusus, r.waktuDaftar);
      return cols.map(csvCell).join(',');
    });
    const blob = new Blob(['\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Peserta_TPQ_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls = 'px-3.5 py-2 border border-outline-variant/50 rounded-xl text-[13px] bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          ['Total Peserta', rows.length],
          ['Tunanetra', totalNetra],
          ['Tunarungu', totalRungu],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-on-surface-variant text-[12px] font-medium">{label}</span>
            <div className="mt-1 text-[24px] font-bold text-on-surface">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, WhatsApp, email, program…"
          className={`${inputCls} flex-1 min-w-0`}
        />
        <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className={inputCls}>
          <option value="all">Semua Lembaga Pendidikan</option>
          {programs.map(([id, name]) => <option key={id} value={id}>{name.length > 40 ? `${name.slice(0, 40)}…` : name}</option>)}
        </select>
        <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value)} className={inputCls}>
          <option value="all">Semua Kategori</option>
          <option value="Tunanetra">Tunanetra</option>
          <option value="Tunarungu">Tunarungu</option>
        </select>
        <button type="button" onClick={load} className="px-4 py-2 rounded-xl border border-outline-variant/40 text-[12px] font-semibold hover:bg-surface-container cursor-pointer inline-flex items-center gap-1.5">
          <Icon name="refresh" className="text-[18px]" />Muat Ulang
        </button>
        <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-[12px] font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5">
          <Icon name="file_download" className="text-[18px]" />Unduh CSV
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant text-[14px]">Memuat peserta TPQ…</div>
        ) : error ? (
          <div role="alert" className="p-12 text-center text-red-700 text-[14px]">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-[14px]">
            {rows.length === 0
              ? 'Belum ada peserta yang mendaftar pada lembaga pendidikan.'
              : 'Tidak ada peserta yang cocok dengan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap & Usia</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Jenis Kelamin</th>
                  <th className="py-3 px-4">Alamat</th>
                  <th className="py-3 px-4">Kontak (WhatsApp & Email)</th>
                  <th className="py-3 px-4">Lembaga Pendidikan</th>
                  {scope === 'superadmin' && <th className="py-3 px-4">Mitra</th>}
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4">Tgl Daftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-on-surface">{r.namaLengkap}{r.usia ? ` (${r.usia} th)` : ''}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary-container text-on-primary-container uppercase tracking-wide">{r.kategoriDisabilitas}</span>
                    </td>
                    <td className="py-3 px-4">{r.gender || '-'}</td>
                    <td className="py-3 px-4 max-w-[16rem] whitespace-normal break-words" style={{ overflowWrap: 'anywhere' }}>{(r as any).alamat || '-'}</td>
                    <td className="py-3 px-4">
                      <a href={`https://wa.me/62${r.noWa.replace(/^0/, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{r.noWa}</a>
                      <div className="text-on-surface-variant">{r.email || '-'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[14rem] truncate" title={r.programName}>{r.programName}</td>
                    {scope === 'superadmin' && <td className="py-3 px-4 max-w-[12rem] truncate" title={r.mitraName}>{r.mitraName || '-'}</td>}
                    <td className="py-3 px-4 text-outline italic max-w-[14rem] truncate" title={r.catatanKhusus}>{r.catatanKhusus || '-'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(r.waktuDaftar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
