import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { TPQProgram, User } from '../types.ts';
import { IndonesiaLocationFields } from './IndonesiaLocationFields.tsx';
import { TPQRegistrations } from './TPQRegistrations.tsx';
import { JENIS_PESERTA_OPTIONS, getKategoriOptions, findKategori, TPQ_MENU } from './TpqNavMenu.tsx';

interface TPQManagementProps {
  currentUser: User;
  onProgramsUpdated?: (programs: TPQProgram[]) => void;
}

const EMPTY_FORM = {
  namaProgram: '',
  jenisTPQ: 'isyarat' as 'isyarat' | 'braille',
  deskripsiProgram: '',
  tujuanPembelajaran: '',
  targetPeserta: '',
  kuotaPeserta: '30',
  materiPembelajaran: '',
  metodePembelajaran: '',
  kebutuhanFasilitas: [] as string[],
  frekuensiPertemuan: '1 kali seminggu',
  hariPertemuan: [] as string[],
  jamMulai: '08:00',
  jamSelesai: '10:00',
  tanggalMulai: '',
  tanggalSelesai: '',
  benefitProgram: '',
  provinsi: '',
  kota: '',
  lokasiDanAlamat: '',
  koordinat: '',
};

const fasilitasOptions = [
  'Mushaf Al-Qur’an  Braille',
  'Media pembelajaran bahasa isyarat',
  'Ruang belajar aksesibel',
  'Materi audio digital',
  'Pendamping mobilitas',
  'Perangkat pembelajaran digital',
];

const hariOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const parseCoordinate = (value: string) => {
  const rawParts = value.split(',').map(v => v.trim());
  if (rawParts.length !== 2 || rawParts.some(v => v === '')) return null;
  const parts = rawParts.map(Number);
  if (parts.some(v => !Number.isFinite(v))) return null;
  const [latitude, longitude] = parts;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const addCalendarMonths = (source: Date, amount: number) => {
  const result = new Date(source);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
};

const maxEndDateForDuration = (start: string, duration: string) => {
  const match = duration.trim().match(/^(?:program\s*)?(\d+)\s*(hari|minggu|bulan|tahun)$/i);
  if (!start || !match || Number(match[1]) < 1) return undefined;
  const date = new Date(`${start}T00:00:00`);
  const amount = Number(match[1]), unit = match[2].toLowerCase();
  if (unit === 'hari') date.setDate(date.getDate() + amount - 1);
  else if (unit === 'minggu') date.setDate(date.getDate() + amount * 7 - 1);
  else if (unit === 'bulan') { const next = addCalendarMonths(date, amount); next.setDate(next.getDate() - 1); date.setTime(next.getTime()); }
  else { date.setFullYear(date.getFullYear() + amount); date.setDate(date.getDate() - 1); }
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  // Perlakukan tanggal YYYY-MM-DD sebagai tanggal kalender lokal, bukan UTC,
  // supaya tidak bergeser sehari akibat timezone browser.
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
    : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const TPQManagement: React.FC<TPQManagementProps> = ({ currentUser, onProgramsUpdated }) => {
  const [activeTab, setActiveTab] = useState<'daftar' | 'ajukan' | 'peserta'>('daftar');
  const [programs, setPrograms] = useState<TPQProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<TPQProgram['status'] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Pilihan kategori dan jenis peserta independen: pengguna bebas memilih beberapa opsi.
  const [kategoriPendidikan, setKategoriPendidikan] = useState<string[]>([]);
  const [disabilitasPendidikan, setDisabilitasPendidikan] = useState<string[]>([]);
  const kategoriOptions = getKategoriOptions('Tunanetra Dan Tunarungu');
  const toggleSelection = (items: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    setter(items.includes(value) ? items.filter(item => item !== value) : [...items, value]);
  const [durasiPendidikan, setDurasiPendidikan] = useState('Program 3 Minggu');
  const [waLink, setWaLink] = useState('');
  const [waProgramId, setWaProgramId] = useState<string | null>(null);
  const [waSaving, setWaSaving] = useState(false);
  const [documentationPhotos, setDocumentationPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPrograms = async () => {
    setIsLoading(true);
    try {
      const url = currentUser.role === 'superadmin' ? '/api/tpq' : `/api/tpq?mitraId=${encodeURIComponent(currentUser.id)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengambil program TPQ.');
      const allPrograms: TPQProgram[] = Array.isArray(data.programs) ? data.programs : [];
      // Lapisan pengaman: Mitra hanya melihat program TPQ miliknya sendiri; Superadmin melihat semua.
      const loadedPrograms = currentUser.role === 'superadmin'
        ? allPrograms
        : allPrograms.filter(program => String(program.mitraId) === String(currentUser.id));
      setPrograms(loadedPrograms);
      onProgramsUpdated?.(loadedPrograms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil program TPQ.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    void loadPrograms();
  }, [currentUser.id]);

  const resetForm = () => {
    setEditingId(null);
    setEditingStatus(null);
    setForm({ ...EMPTY_FORM, provinsi: currentUser.province || '', kota: currentUser.city || '' });
    setKategoriPendidikan([]); setDisabilitasPendidikan([]);
    setDurasiPendidikan('Program 3 Minggu'); setWaLink(''); setDocumentationPhotos([]); setPhotoError('');
    setError(null);
    setSuccess(null);
  };

  const update = <K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleArray = (key: 'kebutuhanFasilitas' | 'hariPertemuan', value: string) => {
    const current = form[key];
    update(key, current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.hariPertemuan.length) update('hariPertemuan', ['Senin']);
    const coordinates = form.koordinat.trim() ? parseCoordinate(form.koordinat) : { latitude: 0, longitude: 0 };
    if (!coordinates) { setError('Koordinat harus ditulis dengan format Latitude, Longitude. Contoh: -6.9175, 107.6191'); return; }
    if (form.tanggalSelesai < form.tanggalMulai) { setError('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return; }
    const durationMatch = durasiPendidikan.trim().match(/^(?:program\s*)?(\d+)\s*(hari|minggu|bulan|tahun)$/i);
    if (!durationMatch || Number(durationMatch[1]) < 1) { setError('Format durasi harus seperti “Program 3 Minggu”.'); return; }
    const durationAmount = Number(durationMatch[1]);
    const durationUnit = durationMatch[2].toLowerCase();
    const startDate = new Date(`${form.tanggalMulai}T00:00:00`);
    const endDate = new Date(`${form.tanggalSelesai}T00:00:00`);
    const maxDate = new Date(startDate);
    if (durationUnit === 'hari') maxDate.setDate(maxDate.getDate() + durationAmount - 1);
    else if (durationUnit === 'minggu') maxDate.setDate(maxDate.getDate() + durationAmount * 7 - 1);
    else if (durationUnit === 'bulan') { const next = addCalendarMonths(maxDate, durationAmount); next.setDate(next.getDate() - 1); maxDate.setTime(next.getTime()); }
    else { maxDate.setFullYear(maxDate.getFullYear() + durationAmount); maxDate.setDate(maxDate.getDate() - 1); }
    if (endDate > maxDate) { setError(`Tanggal selesai melewati durasi ${durasiPendidikan}. Maksimal tanggal ${maxDate.toLocaleDateString('id-ID')}.`); return; }
    if (form.tanggalMulai && form.tanggalSelesai && endDate < startDate) { setError('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        jenisTPQ: kategoriPendidikan.some(k => findKategori(k)?.jenis === 'braille') ? 'braille' : (kategoriPendidikan.length ? 'isyarat' : form.jenisTPQ),
        kuotaPeserta: Number(form.kuotaPeserta || 30),
        targetPeserta: disabilitasPendidikan.join(', '),
        tujuanPembelajaran: `TPQ_META:${JSON.stringify({ kategoriPendidikan, jenisPesertaPendidikan: disabilitasPendidikan, durasi: durasiPendidikan })}`,
        durasiProgram: durasiPendidikan.trim(),
        fotoDokumentasi: documentationPhotos,
        linkGrupWa: '',
        frekuensiPertemuan: form.frekuensiPertemuan,
        hariPertemuan: form.hariPertemuan.length ? form.hariPertemuan : ['Senin'],
        adminEdit: currentUser.role === 'superadmin' && Boolean(editingId),
        mitraId: currentUser.id,
        mitraName: currentUser.name,
        mitraOrg: currentUser.organizationName || 'Lembaga Mitra',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
      const url = editingId ? `/api/tpq/${editingId}` : '/api/tpq';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan program TPQ.');

      resetForm();
      setSuccess(editingId
        ? (currentUser.role === 'superadmin' ? 'Data Pendidikan TPQ berhasil diperbarui.' : 'Perubahan program TPQ berhasil dikirim ulang untuk ditinjau.')
        : 'Program TPQ berhasil diajukan ke Superadmin.');
      await loadPrograms();
      setActiveTab('daftar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan program TPQ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProgram = async (program: TPQProgram) => {
    const approved = window.confirm(`Hapus program \"${program.namaProgram}\"? Tindakan ini tidak dapat dibatalkan.`);
    if (!approved) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tpq/${encodeURIComponent(program.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus program TPQ.');
      setSuccess('Program TPQ berhasil dihapus.');
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus program TPQ.');
    }
  };

  const startEdit = (program: TPQProgram) => {
    // Pulihkan kategori dan jenis disabilitas yang disimpan di tujuanPembelajaran,
    // agar saat Superadmin membuka Edit, nilai pengajuan tidak kembali ke nilai default.
    const savedMeta = String(program.tujuanPembelajaran || '');
    let savedCategories: string[] = [];
    let savedDisabilities: string[] = [];
    if (savedMeta.startsWith('TPQ_META:')) {
      try {
        const meta = JSON.parse(savedMeta.slice('TPQ_META:'.length));
        savedCategories = Array.isArray(meta.kategoriPendidikan) ? meta.kategoriPendidikan.filter((v: unknown) => typeof v === 'string') : [];
        savedDisabilities = Array.isArray(meta.jenisPesertaPendidikan) ? meta.jenisPesertaPendidikan.filter((v: unknown) => typeof v === 'string') : [];
      } catch { /* kompatibilitas dengan data lama */ }
    }
    if (!savedCategories.length) {
      const legacyCategory = savedMeta.match(/Kategori:\s*([^.]*)/i)?.[1]?.trim() || '';
      const match = findKategori(legacyCategory);
      if (match) savedCategories = [match.label];
    }
    if (!savedDisabilities.length) {
      const legacyDisability = savedMeta.match(/Jenis disabilitas:\s*([^.]*)/i)?.[1]?.trim() || '';
      const legacy = JENIS_PESERTA_OPTIONS.find(o => o.toLowerCase() === legacyDisability.toLowerCase());
      if (legacy && legacy !== 'Tunanetra Dan Tunarungu') savedDisabilities = [legacy];
      else if (legacy === 'Tunanetra Dan Tunarungu') savedDisabilities = ['Tunanetra', 'Tunarungu'];
    }
    setKategoriPendidikan(savedCategories);
    setDisabilitasPendidikan(savedDisabilities);
    setEditingId(program.id);
    setEditingStatus(program.status);
    setForm({
      namaProgram: program.namaProgram,
      jenisTPQ: program.jenisTPQ,
      deskripsiProgram: program.deskripsiProgram,
      tujuanPembelajaran: program.tujuanPembelajaran || '',
      targetPeserta: program.targetPeserta || '',
      kuotaPeserta: String(program.kuotaPeserta || 0),
      materiPembelajaran: program.materiPembelajaran || '',
      metodePembelajaran: program.metodePembelajaran || '',
      kebutuhanFasilitas: program.kebutuhanFasilitas || [],
      frekuensiPertemuan: program.frekuensiPertemuan || '1 kali seminggu',
      hariPertemuan: program.hariPertemuan || [],
      jamMulai: program.jamMulai || '08:00',
      jamSelesai: program.jamSelesai || '10:00',
      tanggalMulai: program.tanggalMulai || '',
      tanggalSelesai: program.tanggalSelesai || '',
      benefitProgram: program.benefitProgram || '',
      provinsi: program.provinsi,
      kota: program.kota,
      lokasiDanAlamat: program.lokasiDanAlamat,
      koordinat: `${program.latitude}, ${program.longitude}`,
    });
    setDurasiPendidikan((program as any).durasiProgram || 'Program 3 Minggu');
    setDocumentationPhotos((program as any).fotoDokumentasi || []);
    setWaLink('');
    if (currentUser.role === 'superadmin' && program.status === 'disetujui') fetch(`/api/tpq/${program.id}/wa-link`).then(r => r.ok ? r.json() : Promise.reject()).then(d => setWaLink(d.waLink || '')).catch(() => setWaLink(''));
    setError(null);
    setSuccess(null);
    setActiveTab('ajukan');
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold uppercase tracking-wide">
            <Icon name="menu_book" className="text-[16px]" />
            Pendidikan TPQ
          </div>
          <h1 className="text-[24px] md:text-[28px] font-semibold text-on-surface mt-3">Pendidikan TPQ Al-Qur’an Disabilitas</h1>
          <p className="text-[13px] text-on-surface-variant mt-1.5 max-w-2xl">Kelola program pendidikan TPQ Al-Qur’an Isyarat atau Braille secara terpisah dari kegiatan Event.</p>
        </div>
        <button onClick={() => { resetForm(); setActiveTab('ajukan'); }} className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[13px] font-semibold shadow-sm cursor-pointer shrink-0">
          <Icon name="add_circle" className="text-[18px]" />
          Ajukan Program TPQ
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 overflow-x-auto">
        <button onClick={() => setActiveTab('daftar')} className={`px-4 py-2 text-[13px] font-semibold rounded-full whitespace-nowrap ${activeTab === 'daftar' ? 'bg-on-surface text-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}>{currentUser.role === 'superadmin' ? 'Semua Program TPQ' : 'Program TPQ Saya'} ({programs.length})</button>
        <button onClick={() => { resetForm(); setActiveTab('ajukan'); }} className={`px-4 py-2 text-[13px] font-semibold rounded-full whitespace-nowrap ${activeTab === 'ajukan' ? 'bg-on-surface text-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}>{editingId ? 'Perbaiki Program' : 'Program TPQ Baru'}</button>
        <button onClick={() => setActiveTab('peserta')} className={`px-4 py-2 text-[13px] font-semibold rounded-full whitespace-nowrap ${activeTab === 'peserta' ? 'bg-on-surface text-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}>Peserta TPQ</button>
      </div>

      {error && <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}
      {success && <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px]">{success}</div>}

      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {isLoading ? <div className="p-10 text-center text-on-surface-variant">Memuat program TPQ...</div> : programs.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
              <Icon name="menu_book" className="text-[48px] text-outline" />
              <h3 className="font-semibold text-on-surface mt-3">Belum Ada Program TPQ</h3>
              <p className="text-[13px] text-on-surface-variant mt-2 mb-5">Ajukan program TPQ Al-Qur’an Isyarat atau Braille untuk ditinjau Superadmin.</p>
              <button onClick={() => { resetForm(); setActiveTab('ajukan'); }} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold">Ajukan Program</button>
            </div>
          ) : programs.map(program => (
            <div key={program.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <span className="inline-flex px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wide">TPQ {program.jenisTPQ === 'isyarat' ? 'Al-Qur’an Isyarat' : 'Al-Qur’an Braille'}</span>
                  <h3 className="text-[18px] font-semibold text-on-surface mt-2">{program.namaProgram}</h3>
                  <p className="text-[13px] text-on-surface-variant mt-1 line-clamp-2">{program.deskripsiProgram}</p>
                </div>
                <div className="flex flex-wrap gap-2">{currentUser.role === 'superadmin' && program.status === 'menunggu_persetujuan' && <button onClick={async()=>{try{const r=await fetch(`/api/tpq/${encodeURIComponent(program.id)}/approve`,{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal menyetujui program.');setSuccess('Program TPQ disetujui. Selanjutnya klik Izinkan Publikasi di Web agar tampil di homepage.');await loadPrograms();}catch(e){setError(e instanceof Error?e.message:'Gagal menyetujui program.')}}} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700">Setujui</button>}{currentUser.role === 'superadmin' && program.status === 'menunggu_persetujuan' && <button onClick={async()=>{const reason=window.prompt('Tuliskan alasan penolakan atau data yang perlu direvisi Mitra:');if(!reason || !reason.trim())return;try{const r=await fetch(`/api/tpq/${encodeURIComponent(program.id)}/reject`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alasanPenolakan:reason.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal meminta revisi.');setSuccess('Pengajuan dikembalikan untuk revisi Mitra.');await loadPrograms();}catch(e){setError(e instanceof Error?e.message:'Gagal meminta revisi.')}}} className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-[12px] font-semibold hover:bg-amber-100">Tolak / Minta Revisi</button>}{currentUser.role === 'superadmin' && program.status === 'disetujui' && <button onClick={async()=>{try{const allow=!Boolean(program.izinkanPublikasi);const r=await fetch(`/api/tpq/${encodeURIComponent(program.id)}/publish`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({izinkanPublikasi:allow})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal mengubah publikasi.');setSuccess(allow?'Publikasi diizinkan. Program akan tampil di homepage.':'Publikasi dinonaktifkan. Program tidak lagi tampil di homepage.');await loadPrograms();}catch(e){setError(e instanceof Error?e.message:'Gagal mengubah publikasi.')}}} className={`px-4 py-2 rounded-xl text-[12px] font-semibold ${program.izinkanPublikasi?'bg-amber-100 text-amber-800 border border-amber-200':'bg-blue-600 text-white hover:bg-blue-700'}`}>{program.izinkanPublikasi?'Cabut Publikasi':'Izinkan Publikasi di Web'}</button>}<button onClick={() => startEdit(program)} className="px-4 py-2 rounded-xl border border-outline-variant/40 text-[12px] font-semibold hover:bg-surface-container">{currentUser.role === 'superadmin' ? 'Edit' : 'Perbaiki Data'}</button><button onClick={() => void deleteProgram(program)} className="px-4 py-2 rounded-xl border border-red-200 text-red-700 text-[12px] font-semibold hover:bg-red-50">Hapus</button></div>
              </div>
              {program.status === 'ditolak' && program.alasanPenolakan && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="text-[11px] font-bold uppercase text-amber-900">Catatan revisi dari Super Admin</div><p className="mt-1 text-[13px] text-amber-900 whitespace-pre-line">{program.alasanPenolakan}</p>{currentUser.role !== 'superadmin' && <p className="mt-2 text-[12px] text-amber-800">Silakan klik <strong>Perbaiki Data</strong>, sesuaikan data berdasarkan catatan, lalu kirim revisi untuk ditinjau ulang.</p>}</div>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <div className="p-3 rounded-xl bg-surface-container-low"><div className="text-[10px] text-outline font-semibold uppercase">Status</div><div className="text-[12px] font-semibold mt-1">{program.status.replaceAll('_', ' ')}</div></div>{currentUser.role === 'superadmin' && <div className="p-3 rounded-xl bg-surface-container-low"><div className="text-[10px] text-outline font-semibold uppercase">Publikasi Web</div><div className="text-[12px] font-semibold mt-1">{program.izinkanPublikasi ? 'Diizinkan' : 'Belum diizinkan'}</div></div>}
                <div className="p-3 rounded-xl bg-surface-container-low"><div className="text-[10px] text-outline font-semibold uppercase">Pertemuan</div><div className="text-[12px] font-semibold mt-1">{(program as any).durasiProgram || program.frekuensiPertemuan || '-'}</div></div>
                <div className="p-3 rounded-xl bg-surface-container-low"><div className="text-[10px] text-outline font-semibold uppercase">Periode</div><div className="text-[12px] font-semibold mt-1">{formatDate(program.tanggalMulai)} - {formatDate(program.tanggalSelesai)}</div></div>
                <div className="p-3 rounded-xl bg-surface-container-low"><div className="text-[10px] text-outline font-semibold uppercase">Kuota</div><div className="text-[12px] font-semibold mt-1">{program.kuotaPeserta} peserta</div></div>
              </div>
              {(program as any).fotoDokumentasi?.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{(program as any).fotoDokumentasi.map((photo: string, i: number) => <a key={i} href={photo} target="_blank" rel="noreferrer"><img src={photo} alt={`Dokumentasi ${i+1}`} className="w-24 h-20 object-cover rounded-lg border" /></a>)}</div>}
              {program.status === 'disetujui' && (!program.izinkanPublikasi || currentUser.role === 'superadmin') && <div className="mt-4 rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-2">
                <div><h4 className="text-[13px] font-bold text-green-900">Link Grup WhatsApp</h4><p className="text-[12px] text-green-800 mt-1">Lengkapi link ini sebelum Super Admin mengizinkan publikasi. Link akan diberikan kepada peserta setelah pendaftaran berhasil.</p></div>
                {waProgramId === program.id ? <form onSubmit={async (e) => { e.preventDefault(); setError(null); setSuccess(null); setWaSaving(true); try { const r = await fetch(`/api/tpq/${encodeURIComponent(program.id)}/wa-link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ waLink: waLink.trim() }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Gagal menyimpan link WhatsApp.'); setSuccess('Link grup WhatsApp berhasil disimpan.'); setWaProgramId(null); setWaLink(''); await loadPrograms(); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan link WhatsApp.'); } finally { setWaSaving(false); } }} className="flex flex-col sm:flex-row gap-2">
                  <input aria-label="Link Grup WhatsApp" type="url" value={waLink} onChange={e => setWaLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-green-200 bg-white text-[12px]" />
                  <button disabled={waSaving} type="submit" className="px-4 py-2 rounded-lg bg-green-700 text-white text-[12px] font-semibold disabled:opacity-50">{waSaving ? 'Menyimpan...' : 'Simpan Link'}</button>
                  <button type="button" onClick={() => { setWaProgramId(null); setWaLink(''); }} className="px-3 py-2 rounded-lg border border-green-200 text-green-900 text-[12px]">Batal</button>
                </form> : <div className="flex flex-wrap items-center gap-2">
                  {(program as any).linkGrupWa ? <a href={(program as any).linkGrupWa} target="_blank" rel="noreferrer" className="inline-flex px-3 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold">Uji Link WhatsApp</a> : <span className="text-[12px] text-amber-800">Link belum diisi</span>}
                  <button type="button" onClick={async () => { setError(null); try { const r = await fetch(`/api/tpq/${encodeURIComponent(program.id)}/wa-link`); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Gagal memuat link WhatsApp.'); setWaLink(d.waLink || ''); setWaProgramId(program.id); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat link WhatsApp.'); } }} className="px-3 py-2 rounded-lg border border-green-300 bg-white text-green-900 text-xs font-semibold">{(program as any).linkGrupWa ? 'Ubah Link' : 'Isi Link Grup WA'}</button>
                </div>}
              </div>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'peserta' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[20px] font-semibold text-on-surface">Peserta Pendidikan TPQ</h2>
            <p className="text-[13px] text-on-surface-variant mt-1">
              {currentUser.role === 'superadmin' ? 'Peserta yang mendaftar pada seluruh program TPQ.' : 'Peserta yang mendaftar pada program TPQ yang Anda selenggarakan.'}
            </p>
          </div>
          <TPQRegistrations scope={currentUser.role === 'superadmin' ? 'superadmin' : 'mitra'} />
        </div>
      )}

      {activeTab === 'ajukan' && (
        <form onSubmit={submit} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-sm space-y-5 text-[13px]">
          <style>{`.request-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.request-field{display:flex;flex-direction:column;gap:7px}.request-field label{font-size:13px;font-weight:650;color:#182230}.request-field input,.request-field select,.request-field textarea{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;background:white;color:#182230;font:inherit}.request-field textarea{min-height:82px}.request-full{grid-column:1/-1}.request-options{display:flex;gap:14px;flex-wrap:wrap}.request-options label{display:flex;align-items:center;gap:6px;font-weight:500}.request-options input[type=checkbox]{width:auto;flex:0 0 auto;margin-top:2px}@media(max-width:600px){.request-grid{grid-template-columns:1fr}.request-full{grid-column:auto}}`}</style>
          <div><h2 className="text-[20px] font-semibold text-on-surface">{editingId ? 'Perbaiki Program Pendidikan TPQ' : 'Pengajuan Pendidikan TPQ'}</h2><p className="text-[13px] text-on-surface-variant mt-1">Form khusus program pendidikan TPQ. Target Peserta dan Kuota tidak ditampilkan.</p></div>
          <div className="request-grid">

            <div className="request-field request-full"><label>Nama Pendidikan TPQ *</label><input required value={form.namaProgram} onChange={e=>update('namaProgram',e.target.value)} /></div>
            <div className="request-field"><label>Jenis Peserta / Disabilitas</label><div className="request-options" role="group" aria-label="Pilih jenis peserta">
              {TPQ_MENU.map(group => <label key={group.label} className="!items-start rounded-lg border border-slate-200 p-2.5"><input type="checkbox" checked={disabilitasPendidikan.includes(group.label)} onChange={() => toggleSelection(disabilitasPendidikan, setDisabilitasPendidikan, group.label)} /> <span>{group.label}</span></label>)}
            </div><small>Boleh memilih satu atau beberapa jenis peserta. Pilihan kategori tidak dibatasi oleh pilihan ini.</small></div>
            <div className="request-field"><label>Kategori Pendidikan TPQ</label><div className="request-options" role="group" aria-label="Pilih kategori pendidikan TPQ">
              {kategoriOptions.map(k => <label key={k.label} className="!items-start rounded-lg border border-slate-200 p-2.5"><input type="checkbox" checked={kategoriPendidikan.includes(k.label)} onChange={() => toggleSelection(kategoriPendidikan, setKategoriPendidikan, k.label)} /> <span>{k.label}</span></label>)}
            </div><small>Boleh memilih beberapa kategori sekaligus, termasuk kombinasi kategori apa pun.</small></div>
            <div className="request-field request-full"><label>Deskripsi</label><textarea value={form.deskripsiProgram} onChange={e=>update('deskripsiProgram',e.target.value)} /></div>
            <div className="request-field request-full"><label>Durasi Program *</label><input required value={durasiPendidikan} onChange={e=>setDurasiPendidikan(e.target.value)} placeholder="Program 3 Minggu" title="Contoh: Program 3 Minggu" /><small>Template durasi: <strong>Durasi = Program 3 Minggu</strong>. Isi angka dan satuan, misalnya “Program 2 Bulan”. Tanggal selesai akan dibatasi sesuai durasi yang diisi.</small></div>
            <div className="request-field"><label>Tanggal Mulai *</label><input required type="date" value={form.tanggalMulai} onChange={e=>update('tanggalMulai',e.target.value)} /></div>
            <div className="request-field"><label>Tanggal Selesai *</label><input required type="date" min={form.tanggalMulai || undefined} max={maxEndDateForDuration(form.tanggalMulai, durasiPendidikan)} value={form.tanggalSelesai} onChange={e=>update('tanggalSelesai',e.target.value)} /></div>
            <div className="request-field"><label>Lokasi *</label><input required value={form.lokasiDanAlamat.split(' — ')[0] || ''} onChange={e=>update('lokasiDanAlamat',`${e.target.value} — ${form.lokasiDanAlamat.split(' — ').slice(1).join(' — ')}`)} placeholder="Nama lokasi" /></div>
            <div className="request-field"><label>Alamat *</label><input required value={form.lokasiDanAlamat.includes(' — ')?form.lokasiDanAlamat.split(' — ').slice(1).join(' — '):form.lokasiDanAlamat} onChange={e=>update('lokasiDanAlamat',`${form.lokasiDanAlamat.split(' — ')[0] || ''} — ${e.target.value}`)} placeholder="Alamat lengkap" /></div>
            <IndonesiaLocationFields
              province={form.provinsi}
              city={form.kota}
              variant="mitra"
              required
              onProvinceChange={(value) => setForm(previous => ({ ...previous, provinsi: value, kota: '' }))}
              onCityChange={(value) => setForm(previous => ({ ...previous, kota: value }))}
            />
            <div className="request-field request-full"><label>Koordinat</label><input value={form.koordinat} onChange={e=>update('koordinat',e.target.value)} placeholder="-6.200000, 106.816666" /></div>
            <div className="request-field request-full"><label>Upload Dokumentasi</label><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e=>{const files=Array.from(e.target.files||[]);setPhotoError('');if(documentationPhotos.length + files.length > 5){setPhotoError('Maksimal 5 foto dokumentasi per program.');return;}if(files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>5*1024*1024)){setPhotoError('Format JPG, PNG, WebP; maksimal 5 MB per foto.');return;}files.forEach(file=>{const reader=new FileReader();reader.onload=()=>setDocumentationPhotos(prev=>[...prev,String(reader.result)]);reader.readAsDataURL(file);});e.currentTarget.value='';}} /><small>Unggah foto dokumentasi JPG/PNG/WebP, maksimal 5 MB per foto.</small>{photoError&&<p className="text-red-600">{photoError}</p>}<div className="flex flex-wrap gap-3 mt-2">{documentationPhotos.map((photo,i)=><div key={i} className="relative"><img src={photo} alt={`Dokumentasi ${i+1}`} className="w-24 h-20 object-cover rounded-lg border" /><button type="button" onClick={()=>setDocumentationPhotos(prev=>prev.filter((_,j)=>j!==i))} className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white w-6 h-6">×</button></div>)}</div></div>
            <div className="request-field request-full"><label>Benefit</label><textarea value={form.benefitProgram} onChange={e=>update('benefitProgram',e.target.value)} /></div>
          </div>
          {error && <p className="rounded-lg bg-red-50 text-red-700 p-3">{error}</p>}{success && <p className="rounded-lg bg-green-50 text-green-700 p-3">{success}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30"><button type="button" onClick={()=>{resetForm();setActiveTab('daftar')}} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold">Batal</button><button disabled={isSubmitting} type="submit" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold disabled:opacity-50">{isSubmitting?'Menyimpan...':editingId?'Kirim Revisi':'Ajukan Program TPQ'}</button></div>
        </form>
      )}
    </div>
  );
};
