import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.tsx';
import { TPQProgram, TrainingProposal } from '../types.ts';
import { goHome, leaveEventPage } from './EventDetailPage.tsx';
import { PartnerLogo } from './PartnerLogo.tsx';
import { JENIS_PESERTA_GABUNGAN, JENIS_PESERTA_OPTIONS, getKategoriOptions, normalizeTpqLabel } from './TpqNavMenu.tsx';

// ---------------------------------------------------------------------------
// Helper bersama (dipakai homepage dan peta)
// ---------------------------------------------------------------------------

/** Program TPQ tampil publik hanya jika disetujui Super Admin dan diizinkan publikasi. */
export const isTPQPublished = (p: TPQProgram): boolean =>
  String(p.status ?? '').trim().toLowerCase() === 'disetujui' &&
  (p.izinkanPublikasi === true || Number(p.izinkanPublikasi) === 1);

const TPQ_MAP_PREFIX = 'tpq-map-';
export const isTPQMapId = (id: string) => id.startsWith(TPQ_MAP_PREFIX);
export const tpqIdFromMapId = (id: string) => id.slice(TPQ_MAP_PREFIX.length);

/** Ubah program TPQ menjadi item peta (PetaPersebaran memakai bentuk TrainingProposal). */
export const tpqToMapItem = (p: TPQProgram): TrainingProposal =>
  ({
    id: `${TPQ_MAP_PREFIX}${p.id}`,
    mitraId: p.mitraId,
    mitraName: p.mitraName,
    mitraOrg: p.mitraOrg,
    mitraLogo: p.mitraLogo,
    namaKegiatan: p.namaProgram,
    jenisEvent: `Pendidikan TPQ ${p.jenisTPQ === 'braille' ? 'Braille' : 'Isyarat'}`,
    deskripsiPelatihan: p.deskripsiProgram,
    lokasiDanAlamat: p.lokasiDanAlamat,
    provinsi: p.provinsi,
    kota: p.kota,
    latitude: p.latitude,
    longitude: p.longitude,
    tanggalKegiatan: p.tanggalMulai || '',
    targetDanKuotaPeserta: p.kuotaPeserta,
    kebutuhanPeserta: p.kebutuhanFasilitas || [],
    status: 'disetujui' as const,
    isAktif: true,
    createdAt: p.createdAt,
    jumlahPendaftar: p.jumlahPendaftar,
    kategoriDisabilitasUtama: p.jenisTPQ === 'braille' ? 'Tunanetra' : 'Tunarungu',
    targetPeserta: p.targetPeserta || '',
  } as unknown as TrainingProposal);

const todayIso = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const formatDate = (raw?: string | null) => {
  if (!raw) return '-';
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};

type Phase = 'dibuka' | 'berlangsung' | 'ditutup' | 'selesai';

const getPhase = (p: TPQProgram): Phase => {
  const today = todayIso();
  if (p.tanggalSelesai && p.tanggalSelesai < today) return 'selesai';
  if (p.tanggalMulai && p.tanggalMulai <= today) return 'berlangsung';
  return 'dibuka';
};

const PHASE_META: Record<Phase, { label: string; cls: string }> = {
  dibuka: { label: 'Pendaftaran Dibuka', cls: 'bg-emerald-600 text-white' },
  berlangsung: { label: 'Sedang Berlangsung', cls: 'bg-blue-600 text-white' },
  ditutup: { label: 'Pendaftaran Ditutup', cls: 'bg-amber-500 text-white' },
  selesai: { label: 'Selesai', cls: 'bg-slate-500 text-white' },
};

const PHASE_ORDER: Record<Phase, number> = { dibuka: 0, berlangsung: 1, ditutup: 2, selesai: 3 };

const jenisLabel = (p: TPQProgram) => (p.jenisTPQ === 'braille' ? 'Braille' : 'Isyarat');
const jenisIcon = (p: TPQProgram) => (p.jenisTPQ === 'braille' ? 'touch_app' : 'sign_language');

const getTPQSelectionMeta = (program: TPQProgram) => {
  const raw = String(program.tujuanPembelajaran || '');
  if (raw.startsWith('TPQ_META:')) {
    try {
      const meta = JSON.parse(raw.slice('TPQ_META:'.length));
      return {
        categories: Array.isArray(meta.kategoriPendidikan) ? meta.kategoriPendidikan.filter((v: unknown) => typeof v === 'string') as string[] : [],
        participants: Array.isArray(meta.jenisPesertaPendidikan) ? meta.jenisPesertaPendidikan.filter((v: unknown) => typeof v === 'string') as string[] : [],
      };
    } catch { /* data lama */ }
  }
  const category = raw.match(/Kategori:\s*([^.]*)/i)?.[1]?.trim();
  const disability = raw.match(/Jenis disabilitas:\s*([^.]*)/i)?.[1]?.trim();
  return {
    categories: category ? [category] : [],
    participants: disability ? (disability === 'Tunanetra Dan Tunarungu' ? ['Tunanetra', 'Tunarungu'] : [disability]) : [],
  };
};


// Tautan WhatsApp hanya diterima bila berasal dari chat.whatsapp.com (tidak ada skema berbahaya).
const safeWaLink = (url?: string) =>
  url && /^https:\/\/chat\.whatsapp\.com\//.test(url.trim()) ? url.trim() : '';

// ---------------------------------------------------------------------------
// Routing berbasis hash: #tpq/<id>  (detail program TPQ sebagai halaman penuh)
// ---------------------------------------------------------------------------

export type TPQRouteStep = 'detail' | 'form';
export type TPQRoute = { id: string; step: TPQRouteStep };

// #tpq/<id>  → halaman detail,  #tpq/<id>/daftar → halaman formulir pendaftaran
export function parseTPQRoute(hash: string): TPQRoute | null {
  const match = hash.match(/^#tpq\/([^/?#]+)(?:\/(daftar))?\/?$/);
  if (!match) return null;
  let id = match[1];
  try { id = decodeURIComponent(id); } catch { /* pakai apa adanya */ }
  return { id, step: match[2] ? 'form' : 'detail' };
}

export const tpqHash = (id: string, step: TPQRouteStep = 'detail') =>
  `#tpq/${encodeURIComponent(id)}${step === 'form' ? '/daftar' : ''}`;

function navigateTPQHash(hash: string, replace = false) {
  const url = window.location.pathname + window.location.search + hash;
  if (replace) window.history.replaceState({ evt: true }, '', url);
  else window.history.pushState({ evt: true }, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Buka halaman detail TPQ (menambah riwayat browser, jadi tombol Back berfungsi). */
export function openTPQPage(id: string, step: TPQRouteStep = 'detail') {
  try { sessionStorage.setItem('tpq_scroll', String(window.scrollY)); } catch { /* abaikan */ }
  navigateTPQHash(tpqHash(id, step));
}

// ---------------------------------------------------------------------------
// Halaman detail
// ---------------------------------------------------------------------------

interface TPQDetailPageProps {
  programId: string;
  /** 'detail' = halaman detail program, 'form' = halaman formulir pendaftaran. */
  step?: TPQRouteStep;
  /** Program dari daftar di App. Boleh null (data belum selesai dimuat); halaman akan mengambilnya sendiri. */
  program: TPQProgram | null;
  /** true bila ada pengguna login (pratinjau), supaya program yang belum tayang tetap bisa dilihat. */
  canViewUnpublished?: boolean;
  appSettings?: { logo?: string; applicationName?: string; institutionSubtitle?: string; topbarColor?: string };
}

export const TPQDetailPage: React.FC<TPQDetailPageProps> = ({ programId, step = 'detail', program: programFromApp, canViewUnpublished = false, appSettings }) => {
  const [fetched, setFetched] = useState<TPQProgram | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [registration, setRegistration] = useState({ namaLengkap: '', noWa: '', email: '', usia: '', kategoriDisabilitas: '', gender: '', alamat: '', catatanKhusus: '' });
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredWaLink, setRegisteredWaLink] = useState('');

  // Selalu mulai dari atas saat halaman dibuka / pindah program
  useEffect(() => { window.scrollTo(0, 0); setPhotoIdx(0); }, [programId, step]);

  useEffect(() => {
    if (programFromApp) { setLoadState('idle'); return; }
    let cancelled = false;
    setLoadState('loading');
    fetch('/api/tpq?publicCatalog=true')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => {
        if (cancelled) return;
        const found = (Array.isArray(d?.programs) ? d.programs : []).find((x: TPQProgram) => String(x.id) === programId);
        if (found) { setFetched(found); setLoadState('idle'); } else setLoadState('notfound');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [programId, programFromApp?.id]);

  const program = programFromApp ?? fetched;
  const isVisible = !!program && (isTPQPublished(program) || canViewUnpublished);
  const darkBar = !!appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff';

  const topBar = (
    <nav
      className="sticky top-0 z-40 w-full border-b shadow-2xs"
      style={{
        backgroundColor: appSettings?.topbarColor || '#ffffff',
        borderColor: darkBar ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
        color: darkBar ? '#ffffff' : '#1e293b',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <button type="button" onClick={goHome} className="flex items-center gap-3 text-left cursor-pointer" aria-label="Ke beranda">
          {appSettings?.logo
            ? <img src={appSettings.logo} alt={appSettings.applicationName || 'Logo Aplikasi'} className="w-10 h-10 object-contain" />
            : <Icon name="menu_book" className="text-4xl text-teal-700" />}
          <span className="flex flex-col">
            <span className={`font-bold text-[16px] sm:text-[19px] tracking-tight leading-tight ${darkBar ? 'text-white' : 'text-slate-900'}`}>
              {appSettings?.applicationName || "Event for Disability to Qur'an"}
            </span>
            <span className={`text-[11px] font-medium hidden sm:inline ${darkBar ? 'text-white/80' : 'text-slate-500'}`}>
              {appSettings?.institutionSubtitle || 'Platform Pelatihan & Pemberdayaan Sahabat Disabilitas'}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={leaveEventPage}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${darkBar ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Kembali</span>
        </button>
      </div>
    </nav>
  );

  if (!program || !isVisible) {
    const loading = loadState === 'loading' || (loadState === 'idle' && !program && !fetched);
    const message = loadState === 'error'
      ? 'Program gagal dimuat. Periksa koneksi lalu coba lagi.'
      : 'Pendidikan tidak ditemukan, atau belum dipublikasikan.';
    return (
      <div className="min-h-screen w-full bg-slate-50">
        {topBar}
        <main className="max-w-xl mx-auto px-4 py-20 text-center">
          {loading ? (
            <p className="text-slate-500 text-[14px]" role="status">Memuat detail program…</p>
          ) : (
            <>
              <Icon name="menu_book" className="text-[48px] text-slate-400" />
              <h1 className="text-xl font-bold text-slate-900 mt-2">{message}</h1>
              <button
                type="button"
                onClick={goHome}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-bold cursor-pointer"
              >
                <Icon name="home" className="text-[18px]" />
                Ke Beranda
              </button>
            </>
          )}
        </main>
      </div>
    );
  }

  const photos = (program.fotoDokumentasi || []).filter(Boolean);
  const phase = getPhase(program);
  const wa = safeWaLink(registeredWaLink);
  const submitTPQRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (registering) return;
    setRegistrationError(''); setRegistering(true);
    try {
      const response = await fetch(`/api/tpq/${encodeURIComponent(program.id)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaLengkap: registration.namaLengkap.trim(),
          noWa: registration.noWa.trim(),
          email: registration.email.trim(),
          usia: registration.usia.trim() === '' ? undefined : Number(registration.usia),
          kategoriDisabilitas: registration.kategoriDisabilitas,
          gender: registration.gender,
          alamat: registration.alamat.trim(),
          catatanKhusus: registration.catatanKhusus.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Pendaftaran TPQ gagal dikirim.');
      const safeLink = safeWaLink(data.waLink);
      if (!safeLink) throw new Error('Pendaftaran tersimpan, tetapi link WhatsApp belum valid. Hubungi penyelenggara.');
      setRegisteredWaLink(safeLink); setRegistrationSuccess(true);
      window.scrollTo(0, 0);
    } catch (error) { setRegistrationError(error instanceof Error ? error.message : 'Pendaftaran TPQ gagal dikirim.'); }
    finally { setRegistering(false); }
  };

  const inputClass = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 bg-white focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700';
  const labelClass = 'block text-[12.5px] font-bold text-slate-700 mb-1';
  const setField = (key: keyof typeof registration) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setRegistration((v) => ({ ...v, [key]: e.target.value }));
  const backToDetail = () => navigateTPQHash(tpqHash(program.id, 'detail'), true);
  const registrationClosed = phase === 'selesai';

  const breadcrumb = (
    <nav aria-label="Navigasi halaman" className="flex items-center gap-1.5 text-[12px] text-slate-500 flex-wrap">
      <button type="button" onClick={goHome} className="hover:text-slate-900 hover:underline cursor-pointer">Beranda</button>
      <Icon name="chevron_right" className="text-[14px]" />
      <span>Pendidikan TPQ</span>
      <Icon name="chevron_right" className="text-[14px]" />
      <span className="text-slate-800 font-semibold truncate max-w-[60vw] sm:max-w-md" aria-current="page">{program.namaProgram}</span>
    </nav>
  );

  /* ---------- Layar sukses ---------- */
  if (registrationSuccess && wa) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        {topBar}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
          {breadcrumb}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-8">
            <h1 className="text-xl font-bold text-green-900">Pendaftaran berhasil dikirim!</h1>
            <p className="text-sm text-green-800 mt-1">Terima kasih sudah mendaftar di <strong>{program.namaProgram}</strong>. Silakan bergabung ke grup WhatsApp resmi pendidikan ini. Tautan juga dikirim ke email Anda.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[13px] font-bold transition-colors"><Icon name="forum" className="text-[18px]" />Gabung Grup WhatsApp</a>
              <button type="button" onClick={goHome} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-[13px] hover:bg-slate-50 cursor-pointer">Ke Beranda</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Halaman formulir pendaftaran ---------- */
  if (step === 'form') {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        {topBar}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
          {breadcrumb}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">
            <div className="mb-6">
              <button type="button" onClick={backToDetail} className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer">
                <Icon name="arrow_back" className="text-[16px]" />
                <span>Kembali ke Detail Program</span>
              </button>
              <h1 className="text-xl font-bold text-slate-900">Formulir Pendaftaran Peserta</h1>
            </div>

            {registrationClosed && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800">
                Program ini sudah selesai, pendaftaran baru tidak dapat diterima.
              </div>
            )}

            <form onSubmit={submitTPQRegistration} className="space-y-4">
              <div>
                <label htmlFor="tpq-program" className={labelClass}>Nama Lembaga Pendidikan</label>
                <input id="tpq-program" type="text" readOnly value={program.namaProgram} className={`${inputClass} bg-slate-50 text-slate-700 cursor-not-allowed`} />
              </div>

              <div>
                <label htmlFor="tpq-name" className={labelClass}>Nama Lengkap Peserta *</label>
                <input id="tpq-name" type="text" required autoComplete="name" value={registration.namaLengkap} onChange={setField('namaLengkap')} placeholder="Nama sesuai identitas" className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tpq-wa" className={labelClass}>Nomor WhatsApp Aktif *</label>
                  <input id="tpq-wa" type="tel" inputMode="tel" required autoComplete="tel" value={registration.noWa} onChange={setField('noWa')} placeholder="Contoh: 08123456789" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="tpq-email" className={labelClass}>Email Aktif *</label>
                  <input id="tpq-email" type="email" required autoComplete="email" value={registration.email} onChange={setField('email')} placeholder="nama@email.com" className={inputClass} />
                </div>
              </div>
              <p className="text-[11.5px] text-slate-500 -mt-2">Tautan grup WhatsApp event juga dikirim ke email ini, jadi pastikan alamatnya benar.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tpq-age" className={labelClass}>Usia (Tahun)</label>
                  <input id="tpq-age" type="number" min={1} max={120} value={registration.usia} onChange={setField('usia')} placeholder="Contoh: 19" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="tpq-dis" className={labelClass}>Kategori Peserta *</label>
                  <select id="tpq-dis" required value={registration.kategoriDisabilitas} onChange={setField('kategoriDisabilitas')} className={inputClass}>
                    <option value="">Pilih kategori peserta</option>
                    <option value="Tunanetra">Tunanetra (Sensorik)</option>
                    <option value="Tunarungu">Tunarungu (Sensorik)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="tpq-gender" className={labelClass}>Jenis Kelamin</label>
                <select id="tpq-gender" value={registration.gender} onChange={setField('gender')} className={inputClass}>
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label htmlFor="tpq-address" className={labelClass}>Alamat *</label>
                <textarea id="tpq-address" required rows={2} value={registration.alamat} onChange={setField('alamat')} placeholder="Alamat lengkap tempat tinggal" className={inputClass} />
              </div>

              <div>
                <label htmlFor="tpq-notes" className={labelClass}>Catatan Khusus / Riwayat Belajar (Opsional)</label>
                <textarea id="tpq-notes" rows={3} value={registration.catatanKhusus} onChange={setField('catatanKhusus')} placeholder="Contoh: sudah hafal surat An-Nas sampai Al-Ikhlas, membutuhkan pendamping." className={inputClass} />
              </div>

              {registrationError && (
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800 flex items-start gap-2">
                  <Icon name="error" className="text-[18px] shrink-0" />
                  <span>{registrationError}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={backToDetail} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 cursor-pointer">Batal</button>
                <button type="submit" disabled={registering || registrationClosed} className="px-8 py-2.5 rounded-xl bg-[#0b63e5] hover:bg-[#0952c4] text-white font-extrabold text-[13px] shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {registering ? 'Mengirim…' : 'Kirim Pendaftaran'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  const rows: Array<[string, string, string]> = [
    ['schedule', 'Durasi Program', program.durasiProgram || '-'],
    ['calendar_month', 'Tanggal Pelaksanaan', `${formatDate(program.tanggalMulai)} – ${formatDate(program.tanggalSelesai)}`],
    [
      'event_repeat',
      'Jadwal Pertemuan',
      [
        program.hariPertemuan?.length ? program.hariPertemuan.join(', ') : '',
        program.jamMulai ? `${program.jamMulai}${program.jamSelesai ? ` – ${program.jamSelesai}` : ''} WIB` : '',
      ]
        .filter(Boolean)
        .join(' • ') || '-',
    ],
    ['groups', 'Kuota Peserta', program.kuotaPeserta > 0 ? `${program.kuotaPeserta} peserta` : 'Tidak dibatasi'],
    ['person', 'Jenis Peserta', getTPQSelectionMeta(program).participants.join(', ') || program.targetPeserta || '-'],
    ['category', 'Kategori Pendidikan', getTPQSelectionMeta(program).categories.join(', ') || '-'],
    ['location_on', 'Lokasi', `${program.lokasiDanAlamat}, ${program.kota}, ${program.provinsi}`],
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {topBar}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Galeri */}
          <div className="relative bg-slate-100 h-56 sm:h-96">
            {photos.length > 0 ? (
              <img src={photos[photoIdx]} alt={`Dokumentasi ${program.namaProgram} ${photoIdx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100">
                <Icon name="menu_book" className="text-[72px] text-emerald-700/30" />
              </div>
            )}
            <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold shadow ${PHASE_META[phase].cls}`}>
              {PHASE_META[phase].label}
            </span>
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 px-5 pt-3 overflow-x-auto">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 cursor-pointer ${i === photoIdx ? 'border-emerald-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wide">
                <Icon name={jenisIcon(program)} className="text-[14px]" />
                Pendidikan TPQ • Al-Qur’an {jenisLabel(program)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{program.namaProgram}</h1>
            <div className="flex items-center gap-2.5 mt-2">
              <PartnerLogo name={program.mitraOrg || program.mitraName} logoUrl={program.mitraLogo} size="sm" className="!w-10 !h-10 shrink-0" />
              <p className="text-[13px] text-slate-500">Penyelenggara: <strong className="text-slate-700">{program.mitraOrg || program.mitraName || '-'}</strong></p>
            </div>

            <p className="text-[14px] text-slate-700 mt-4 whitespace-pre-line">{program.deskripsiProgram}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              {rows.map(([icon, label, value]) => (
                <div key={label} className={`rounded-xl bg-slate-50 border border-slate-100 p-3 flex gap-2.5 ${label === 'Lokasi' ? 'sm:col-span-2' : ''}`}>
                  <Icon name={icon} className="text-[18px] text-emerald-700 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-[13px] text-slate-800 break-words">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {[
              ['Tujuan Pembelajaran', program.tujuanPembelajaran],
              ['Materi Pembelajaran', program.materiPembelajaran],
              ['Metode Pembelajaran', program.metodePembelajaran],
              ['Benefit Program', program.benefitProgram],
            ]
              .filter(([, v]) => v && String(v).trim())
              .map(([title, v]) => (
                <div key={title as string} className="mt-4">
                  <h2 className="text-[13px] font-bold text-slate-900">{title}</h2>
                  <p className="text-[13px] text-slate-600 whitespace-pre-line">{v}</p>
                </div>
              ))}

            {program.kebutuhanFasilitas?.length > 0 && (
              <div className="mt-4">
                <h2 className="text-[13px] font-bold text-slate-900 mb-1.5">Fasilitas Pendukung</h2>
                <div className="flex flex-wrap gap-1.5">
                  {program.kebutuhanFasilitas.map(f => (
                    <span key={f} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px]">{f}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Pendaftaran Pendidikan TPQ</h2>
                  <p className="text-sm text-slate-600 mt-1">{registrationClosed ? 'Program ini sudah selesai.' : 'Daftarkan diri Anda melalui formulir pendaftaran. Link grup WhatsApp akan muncul setelah pendaftaran berhasil.'}</p>
                </div>
                <button
                  type="button"
                  disabled={registrationClosed}
                  onClick={() => openTPQPage(program.id, 'form')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold cursor-pointer shrink-0"
                >
                  <Icon name="edit_square" className="text-[18px]" />
                  Daftar Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section homepage
// ---------------------------------------------------------------------------

const INITIAL_VISIBLE = 6;

interface TPQHomeSectionProps {
  programs: TPQProgram[];
  onOpenDetail: (program: TPQProgram) => void;
  /** Permintaan filter jenis peserta dari menu navbar. `n` berubah tiap klik agar filter yang sama bisa diterapkan ulang. */
  pesertaRequest?: { label: string; n: number } | null;
}

const ALL = 'Semua';

/** Jenis peserta sebuah program (Tunanetra / Tunarungu / keduanya) dari form; data lama memakai jenis Braille/Isyarat. */
const getProgramParticipants = (p: TPQProgram): string[] => {
  const fromForm = getTPQSelectionMeta(p).participants.map(v => normalizeTpqLabel(v)).filter(Boolean);
  if (fromForm.length) {
    // Nilai gabungan "Tunanetra Dan Tunarungu" dipecah menjadi dua jenis.
    return Array.from(new Set(fromForm.flatMap(v => (v === normalizeTpqLabel(JENIS_PESERTA_GABUNGAN) ? ['Tunanetra', 'Tunarungu'] : [v]))));
  }
  return [p.jenisTPQ === 'braille' ? 'Tunanetra' : 'Tunarungu'];
};

/** Cocokkan program dengan pilihan filter jenis peserta. "Tunanetra Dan Tunarungu" = program yang melayani keduanya. */
const matchesPeserta = (p: TPQProgram, wanted: string): boolean => {
  const have = getProgramParticipants(p);
  if (wanted === JENIS_PESERTA_GABUNGAN) return have.includes('Tunanetra') && have.includes('Tunarungu');
  return have.includes(wanted);
};

/** Kategori sebuah program = kategori yang diisi pada form Pendidikan TPQ (bisa 1 sampai banyak). */
const getProgramCategories = (p: TPQProgram): string[] => {
  const seen = new Set<string>();
  return getTPQSelectionMeta(p).categories
    .map(c => String(c).trim())
    .filter(c => c && !seen.has(normalizeTpqLabel(c)) && !!seen.add(normalizeTpqLabel(c)));
};

export const TPQHomeSection: React.FC<TPQHomeSectionProps> = ({ programs, onOpenDetail, pesertaRequest }) => {
  // Kembali dari halaman detail: pulihkan posisi scroll terakhir di homepage
  useEffect(() => {
    let y: string | null = null;
    try { y = sessionStorage.getItem('tpq_scroll'); sessionStorage.removeItem('tpq_scroll'); } catch { /* abaikan */ }
    if (y && Number.isFinite(Number(y))) {
      const t = window.setTimeout(() => window.scrollTo(0, Number(y)), 60);
      return () => window.clearTimeout(t);
    }
  }, []);
  const [keyword, setKeyword] = useState('');
  const [kategori, setKategori] = useState<string>(ALL);
  const [peserta, setPeserta] = useState<string>(ALL);
  const [kota, setKota] = useState('Semua');
  // Terapkan filter jenis peserta yang dipilih dari menu navbar.
  useEffect(() => { if (pesertaRequest) setPeserta(pesertaRequest.label); }, [pesertaRequest]);
  const [showAll, setShowAll] = useState(false);

  const published = useMemo(() => programs.filter(isTPQPublished), [programs]);

  const cities = useMemo(() => {
    const map = new Map<string, string>();
    published.forEach(p => {
      const c = String(p.kota || '').trim();
      if (c && !map.has(c.toLowerCase())) map.set(c.toLowerCase(), c);
    });
    return ['Semua', ...Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'id'))];
  }, [published]);

  // Daftar kategori di filter = hanya kategori yang benar-benar dipilih pada program yang tayang.
  // Program yang memilih beberapa kategori dihitung di setiap kategori tersebut.
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    published.forEach(p => {
      getProgramCategories(p).forEach(c => {
        const key = normalizeTpqLabel(c);
        const cur = counts.get(key);
        if (cur) cur.count += 1; else counts.set(key, { label: c, count: 1 });
      });
    });
    const order = getKategoriOptions(JENIS_PESERTA_GABUNGAN).map(k => normalizeTpqLabel(k.label));
    const list = Array.from(counts.entries()).sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b, 'id');
    }).map(([, v]) => v);
    return list;
  }, [published]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const wanted = normalizeTpqLabel(kategori);
    return published
      .filter(p => {
        if (peserta !== ALL && !matchesPeserta(p, peserta)) return false;
        if (kategori !== ALL) {
          const cats = getProgramCategories(p);
          // Data lama tanpa kategori: cocokkan lewat jenis (Braille/Isyarat) agar tidak hilang.
          const matched = cats.length > 0
            ? cats.some(c => normalizeTpqLabel(c) === wanted)
            : getKategoriOptions(JENIS_PESERTA_GABUNGAN).some(k => normalizeTpqLabel(k.label) === wanted && k.jenis === p.jenisTPQ);
          if (!matched) return false;
        }
        if (kota !== 'Semua' && String(p.kota).trim().toLowerCase() !== kota.toLowerCase()) return false;
        if (!q) return true;
        return [p.namaProgram, p.deskripsiProgram, p.mitraOrg, p.mitraName, p.kota, p.provinsi]
          .some(v => String(v ?? '').toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const diff = PHASE_ORDER[getPhase(a)] - PHASE_ORDER[getPhase(b)];
        if (diff) return diff;
        return String(a.tanggalMulai || '').localeCompare(String(b.tanggalMulai || ''));
      });
  }, [published, keyword, peserta, kategori, kota]);

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasFilter = keyword.trim() !== '' || peserta !== ALL || kategori !== ALL || kota !== 'Semua';

  return (
    <section id="program-tpq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-100 scroll-mt-12">
      <div className="mb-6">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 block mb-1">
          PENDIDIKAN TPQ AL-QUR’AN DISABILITAS
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          Katalog Pendidikan
        </h2>
        <p className="text-[14px] text-slate-600 max-w-3xl">
          Program belajar Al-Qur’an yang dirancang untuk sahabat tunarungu dan tunanetra.
        </p>
      </div>

      {published.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs mb-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
          <div>
            <label htmlFor="tpq-q" className="block text-[12px] font-semibold text-slate-700 mb-1.5">Kata Kunci</label>
            <input
              id="tpq-q"
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Nama program, penyelenggara, kota..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-slate-800"
            />
          </div>
          <div>
            <label htmlFor="tpq-peserta" className="block text-[12px] font-semibold text-slate-700 mb-1.5">Jenis Peserta</label>
            <select
              id="tpq-peserta"
              value={peserta}
              onChange={e => setPeserta(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-slate-800"
            >
              <option value={ALL}>Semua Jenis Peserta</option>
              {JENIS_PESERTA_OPTIONS.map(o => <option key={o} value={o}>{o === JENIS_PESERTA_GABUNGAN ? 'Tunanetra dan Tunarungu' : o}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tpq-kategori" className="block text-[12px] font-semibold text-slate-700 mb-1.5">Kategori</label>
            <select
              id="tpq-kategori"
              value={kategori}
              onChange={e => setKategori(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-slate-800"
            >
              <option value={ALL}>Semua Kategori</option>
              {categoryOptions.map(c => <option key={c.label} value={c.label}>{c.label} ({c.count})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tpq-kota" className="block text-[12px] font-semibold text-slate-700 mb-1.5">Kota</label>
            <select
              id="tpq-kota"
              value={kota}
              onChange={e => setKota(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-slate-800"
            >
              {cities.map(c => <option key={c} value={c}>{c === 'Semua' ? 'Semua Kota' : c}</option>)}
            </select>
          </div>
          <button
            type="button"
            disabled={!hasFilter}
            onClick={() => { setKeyword(''); setPeserta(ALL); setKategori(ALL); setKota('Semua'); }}
            className="px-4 py-2.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {published.length > 0 && (
        <p className="mb-5 text-[13px] font-semibold text-slate-600">
          Ditemukan <strong className="text-slate-900">{filtered.length}</strong> lembaga pendidikan
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 sm:p-12 text-center">
          <Icon name="menu_book" className="text-[48px] text-slate-400 mb-3" />
          <h3 className="text-[16px] font-bold text-slate-800">
            {published.length === 0 ? 'Belum ada pendidikan yang dipublikasikan' : 'Tidak ada program yang sesuai'}
          </h3>
          <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">
            {published.length === 0
              ? 'Katalog pendidikan akan tampil di sini setelah disetujui dan dipublikasikan oleh admin. Silakan kembali lagi nanti.'
              : 'Coba ubah kata kunci atau pilihan filter.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(p => {
              const phase = getPhase(p);
              const cover = p.fotoDokumentasi?.[0];
              return (
                <article
                  key={p.id}
                  className="group bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                >
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    {cover ? (
                      <img src={cover} alt={p.namaProgram} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100">
                        <Icon name="menu_book" className="text-[56px] text-emerald-700/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${PHASE_META[phase].cls}`}>
                      {PHASE_META[phase].label}
                    </span>

                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2.5 mb-2 min-w-0">
                      <PartnerLogo name={p.mitraOrg || p.mitraName} logoUrl={p.mitraLogo} size="sm" className="!w-10 !h-10 shrink-0" />
                      <p className="text-[12px] font-semibold text-slate-600 truncate">{p.mitraOrg || p.mitraName}</p>
                    </div>
                    <h3 className="text-[17px] font-bold text-slate-900 leading-snug line-clamp-2">{p.namaProgram}</h3>
                    {(() => {
                      const selections = getTPQSelectionMeta(p);
                      return (selections.participants.length > 0 || selections.categories.length > 0) ? (
                        <div className="mt-3 space-y-2">
                          {selections.participants.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Jenis Peserta</p><div className="flex flex-wrap gap-1.5">{selections.participants.map(v => <span key={v} className="px-2 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100 text-[10px] font-semibold">{v}</span>)}</div></div>}
                          {selections.categories.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Kategori</p><div className="flex flex-wrap gap-1.5">{selections.categories.map(v => <span key={v} className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-semibold">{v}</span>)}</div></div>}
                        </div>
                      ) : null;
                    })()}
                    <ul className="mt-3 space-y-1.5 text-[12px] text-slate-600">
                      <li className="flex items-center gap-2"><Icon name="schedule" className="text-[16px] text-emerald-700" />{p.durasiProgram || '-'}</li>
                      <li className="flex items-center gap-2"><Icon name="calendar_month" className="text-[16px] text-emerald-700" />{formatDate(p.tanggalMulai)} – {formatDate(p.tanggalSelesai)}</li>
                      <li className="flex items-center gap-2"><Icon name="location_on" className="text-[16px] text-emerald-700" />{p.kota}, {p.provinsi}</li>
                    </ul>
                    <p className="text-[12px] text-slate-600 line-clamp-3 mt-3">{p.deskripsiProgram}</p>
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(p)}
                        className="w-full py-2.5 bg-[#006316] hover:bg-[#004D11] text-white rounded-xl text-[13px] font-bold transition-colors cursor-pointer"
                      >
                        Lihat Detail Program
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {filtered.length > INITIAL_VISIBLE && (
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-[13px] font-semibold cursor-pointer"
              >
                {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${filtered.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
