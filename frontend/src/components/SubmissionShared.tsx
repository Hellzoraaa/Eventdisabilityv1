import React from 'react';
import type { TrainingProposal, TPQProgram } from '../types.ts';

// Tampilan bersama untuk Persetujuan Pengajuan, Kelola Event, dan Kelola Pendidikan,
// agar format kartu dan detail data pengajuan selalu sama di dashboard Superadmin dan Mitra.

export type SubmissionKind = 'event' | 'tpq';
export interface SubmissionItem {
  id: string;
  kind: SubmissionKind;
  title: string;
  org: string;
  city: string;
  date?: string | null;
  status: string;
  description?: string;
  raw: any;
}

export const statusLabel = (status: string) => status === 'disetujui' ? 'Disetujui' : status === 'ditolak' ? 'Ditolak' : 'Menunggu Persetujuan';
export const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';


// Urutan field baku untuk detail event/pendidikan (sama di dashboard Superadmin, dashboard Mitra, dan halaman Detail Event).
const FIELD_RANK: Record<string, number> = {
  mitralogo: 0, mitraorg: 1, mitraname: 2,
  namakegiatan: 10, namaprogram: 10, jenisevent: 11, jenistpq: 11, jenispendidikan: 11, jenispengajuan: 11,
  kategoridisabilitasutama: 12, kategoridisabilitas: 12,
  deskripsipelatihan: 13, deskripsiprogram: 13,
  durasiprogram: 20, tanggalkegiatan: 21, tanggalmulai: 21, tanggalberakhirkegiatan: 22, tanggalselesai: 22,
  waktumulai: 23, jammulai: 23, waktuselesai: 24, jamselesai: 24,
  lokasidanalamat: 30, provinsi: 31, kota: 32,
  targetdankuotapeserta: 40, kuotapeserta: 40, bataspendaftaran: 41,
  benefit: 50, benefitprogram: 50, persyaratan: 51,
  fotodokumentasi: 95,
};
export const sortCanonical = (entries: [string, any][]): [string, any][] =>
  entries
    .map((entry, index) => ({ entry, index, rank: FIELD_RANK[entry[0].toLowerCase().replace(/[^a-z0-9]/g, '')] ?? 90 }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(item => item.entry);

// Persyaratan tersimpan sebagai JSON [{ text, wajib }]; tampilkan sebagai daftar yang mudah dibaca.
export const formatPersyaratan = (value: unknown): string => {
  if (typeof value !== 'string') return String(value ?? '');
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(item => item && typeof item.text === 'string')) {
      return parsed.filter(item => item.text.trim()).map((item, i) => `${i + 1}. ${item.text.trim()}${item.wajib === false ? ' (opsional)' : ''}`).join('\n');
    }
  } catch { /* format lama: teks per baris */ }
  return value;
};

export const eventToItem = (e: TrainingProposal): SubmissionItem => ({ id: e.id, kind: 'event', title: e.namaKegiatan, org: e.mitraOrg || e.mitraName || 'Mitra', city: `${e.kota || ''}${e.provinsi ? `, ${e.provinsi}` : ''}`, date: e.tanggalKegiatan, status: e.status, description: e.deskripsiPelatihan, raw: e });
export const tpqToItem = (p: TPQProgram): SubmissionItem => ({ id: p.id, kind: 'tpq', title: p.namaProgram, org: p.mitraOrg || p.mitraName || 'Mitra', city: `${p.kota || ''}${p.provinsi ? `, ${p.provinsi}` : ''}`, date: p.tanggalMulai, status: p.status, description: p.deskripsiProgram, raw: p });

export const SubmissionSummary: React.FC<{ item: SubmissionItem }> = ({ item }) => (
  <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 items-center"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.kind === 'event' ? 'bg-sky-50 text-sky-800' : 'bg-violet-50 text-violet-800'}`}>{item.kind === 'event' ? 'EVENT' : 'PENDIDIKAN'}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'disetujui' ? 'bg-emerald-50 text-emerald-800' : item.status === 'ditolak' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>{statusLabel(item.status)}</span></div><h2 className="text-lg font-bold text-slate-900 mt-3">{item.title}</h2><div className="text-sm text-slate-600 mt-1">{item.org} · {item.city || 'Lokasi belum diisi'} · Mulai {dateLabel(item.date)}</div>{item.description && <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">{item.description}</p>}</div>
);

export const DetailButton: React.FC<{ kind: SubmissionKind; onClick: () => void }> = ({ kind, onClick }) => (
  <button onClick={onClick} className="rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-50">Lihat Detail {kind === 'event' ? 'Event' : 'Pendidikan'}</button>
);

export const SubmissionDetailModal: React.FC<{ item: SubmissionItem; onClose: () => void }> = ({ item, onClose }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Detail pengajuan"><div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"><div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Detail Pengajuan {item.kind === 'event' ? 'Event' : 'Pendidikan'}</p><h2 className="text-xl font-bold text-slate-900 mt-1">{item.title}</h2></div><button onClick={() => onClose()} className="rounded-lg border px-3 py-2 text-sm font-semibold">Tutup</button></div><div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">{(() => { const raw = item.raw || {}; const rawEntries: [string, any][] = Object.entries(raw); const hasEndDate = Boolean(raw.tanggalBerakhirKegiatan || raw.tanggal_berakhir_kegiatan); const durationMatch = String(raw.durasiProgram || raw.durasi_program || '').trim().match(/^(\d+)\s*(jam|hari|minggu|bulan)$/i); let derivedEndDate = ''; const startDate = String(raw.tanggalKegiatan || raw.tanggal_kegiatan || ''); if (!hasEndDate && startDate && durationMatch && durationMatch[2].toLowerCase() !== 'jam') { const d = new Date(`${startDate.slice(0,10)}T12:00:00`); const count = Math.max(1, Number(durationMatch[1])); d.setDate(d.getDate() + (durationMatch[2].toLowerCase() === 'hari' ? count - 1 : durationMatch[2].toLowerCase() === 'minggu' ? count * 7 - 1 : count * 30 - 1)); derivedEndDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; } if (item.kind === 'event' && !hasEndDate && derivedEndDate) rawEntries.push(['tanggalBerakhirKegiatan', derivedEndDate]); const hasStartTime = rawEntries.some(([k,v]) => ['waktumulai','waktuselesai'].includes(k.toLowerCase().replace(/[^a-z0-9]/g,'')) && v); const filteredEntries = rawEntries.filter(([key, value]) => { const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, ''); if (hasStartTime && ['jammulai','jamselesai'].includes(normalizedKey)) return false; const hiddenKeys = ['id','password','token','kebutuhanpeserta','eventcategoryid','disabilityid','mitraid','kuotadisetujui','kategoridisabilitas','jumlahpendaftar','logourl','ismitraresmi','createdat','metodebelajar','alurseleksi','batch','isaktif']; const hiddenEducationKeys = ['mitraphone','tujuanpembelajaran','frekuensipertemuan','kebutuhanfasilitas','haripertemuan','jammulai','jamselesai','waktumulai','waktuselesai','izinkanpublikasi','updatedat']; return !hiddenKeys.includes(normalizedKey) && !(item.kind === 'tpq' && hiddenEducationKeys.includes(normalizedKey)) && value !== null && value !== undefined && value !== ''; }); const startIndex = filteredEntries.findIndex(([key]) => ['tanggalkegiatan', 'tanggalmulai'].includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))); const endIndex = filteredEntries.findIndex(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'tanggalberakhirkegiatan'); if (startIndex >= 0 && endIndex >= 0 && endIndex !== startIndex + 1) { const [endDateEntry] = filteredEntries.splice(endIndex, 1); const refreshedStartIndex = filteredEntries.findIndex(([key]) => ['tanggalkegiatan', 'tanggalmulai'].includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))); filteredEntries.splice(refreshedStartIndex + 1, 0, endDateEntry); } return sortCanonical(filteredEntries); })().map(([key, value]) => { const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, ''); const labels: Record<string, string> = { mitralogo: 'Logo Mitra', mitraname: 'Penanggung Jawab Mitra', mitraorg: 'Mitra Penyelenggara', mitraphone: 'Mitra Phone', lokasidanalamat: 'Alamat Lengkap', jenisevent: 'Kategori / Fokus', kategoridisabilitas: 'Jenis Disabilitas', kategoridisabilitasutama: 'Jenis Disabilitas', jenistpq: 'Jenis Pendidikan', jenistpqprogram: 'Jenis Pendidikan', jenispengajuan: 'Jenis Pendidikan', jenispendidikan: 'Jenis Pendidikan', fotodokumentasi: item.kind === 'tpq' ? 'Foto Fasilitas' : 'Foto Dokumentasi', durasiprogram: 'Durasi Program', tanggalkegiatan: 'Tanggal Mulai Kegiatan', tanggalberakhirkegiatan: 'Tanggal Berakhir Kegiatan', bataspendaftaran: 'Batas Pendaftaran', targetdankuotapeserta: 'Kuota Peserta', waktumulai: 'Jam Mulai', waktuselesai: 'Jam Selesai', jammulai: 'Jam Mulai', jamselesai: 'Jam Selesai', benefit: 'Manfaat', persyaratan: 'Persyaratan', deskripsipelatihan: 'Deskripsi Event', provinsi: 'Provinsi', kota: 'Kota / Kabupaten', latitude: 'Latitude', longitude: 'Longitude' }; const label = labels[normalizedKey] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); const isLogo = normalizedKey === 'mitralogo'; const isPhoto = ['fotodokumentasi','fotodokumentasiurl','dokumentasifoto'].includes(normalizedKey); const imageSources: string[] = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map(v => v.trim()) : typeof value === 'string' && value.trim() ? [value.trim()] : typeof value === 'object' && value !== null ? Object.values(value as Record<string, unknown>).filter((v): v is string => typeof v === 'string' && v.trim() !== '').map(v => v.trim()) : []; const imageSrc = imageSources[0] || ''; const dateKeys = ['tanggalkegiatan','tanggalberakhirkegiatan','bataspendaftaran','tanggalmulai','tanggalselesai','tanggalpersetujuan','createdat']; const timeKeys = ['waktumulai','waktuselesai','jammulai','jamselesai']; const displayValue = dateKeys.includes(normalizedKey) && typeof value === 'string' ? (() => { const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/); if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); })() : timeKeys.includes(normalizedKey) ? String(value).slice(0, 5) : value; const isImage = isLogo || isPhoto; return <div key={key} className={`rounded-xl border border-slate-200 p-3 min-w-0 ${isImage ? 'sm:col-span-2' : ''}`}><div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>{isImage ? (imageSources.length > 0 ? <div className="flex flex-wrap items-start gap-3">{(isPhoto ? imageSources : imageSources.slice(0, 1)).map((src, index) => <div key={`${key}-${index}`} className="flex flex-col gap-1"><a href={src} target="_blank" rel="noreferrer"><img src={src} alt={`${label}${isPhoto ? ` ${index + 1}` : ''}`} className={`${isPhoto ? 'max-h-64 max-w-full' : 'h-20 w-20'} rounded-lg border border-slate-200 bg-white object-contain p-2`} onError={e => { e.currentTarget.style.display = 'none'; }} /></a><a href={src} target="_blank" rel="noreferrer" className="text-sm text-sky-700 underline break-all">Lihat {isPhoto ? `foto ${index + 1}` : 'logo'}</a></div>)}</div> : <span className="text-sm text-slate-500">{isPhoto ? 'Foto dokumentasi belum diunggah pada pengajuan ini' : 'Logo tidak tersedia'}</span>) : <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">{typeof displayValue === 'object' ? JSON.stringify(displayValue, null, 2) : normalizedKey === 'persyaratan' ? formatPersyaratan(displayValue) : String(displayValue)}</div>}</div>; })}</div></div></div>
);
