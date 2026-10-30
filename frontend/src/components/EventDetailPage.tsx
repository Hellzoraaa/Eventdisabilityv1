import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { TrainingProposal, DisabilityMaster, Participant } from '../types.ts';
import { PartnerLogo } from './PartnerLogo.tsx';
import { VerifiedBadge } from './VerifiedBadge.tsx';

/* ------------------------------------------------------------------ */
/* Routing berbasis hash: #event/<id>  dan  #event/<id>/daftar         */
/* Tautan lama #daftar/<id> tetap dikenali (diarahkan ke halaman detail) */
/* ------------------------------------------------------------------ */

export type EventRouteStep = 'detail' | 'form';
export type EventRoute = { id: string; step: EventRouteStep };

export function parseEventRoute(hash: string): EventRoute | null {
  const match = hash.match(/^#(?:event|daftar)\/([^/?#]+)(?:\/(daftar))?\/?$/);
  if (!match) return null;
  let id = match[1];
  try { id = decodeURIComponent(id); } catch { /* pakai apa adanya */ }
  return { id, step: match[2] ? 'form' : 'detail' };
}

export const eventHash = (id: string, step: EventRouteStep = 'detail') =>
  `#event/${encodeURIComponent(id)}${step === 'form' ? '/daftar' : ''}`;

function navigateHash(hash: string, replace = false) {
  const url = window.location.pathname + window.location.search + hash;
  if (replace) window.history.replaceState({ evt: true }, '', url);
  else window.history.pushState({ evt: true }, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Buka halaman detail event (menambah riwayat browser, jadi tombol Back berfungsi). */
export function openEventPage(id: string, step: EventRouteStep = 'detail') {
  try { sessionStorage.setItem('evt_scroll', String(window.scrollY)); } catch { /* abaikan */ }
  navigateHash(eventHash(id, step));
}

/** Kembali ke beranda tanpa menambah riwayat browser. */
export function goHome() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Kembali satu langkah jika datang dari dalam aplikasi, kalau tidak (tautan langsung) ke beranda. */
export function leaveEventPage() {
  if (window.history.state?.evt) window.history.back();
  else goHome();
}

/* ------------------------------------------------------------------ */
/* Util tampilan                                                       */
/* ------------------------------------------------------------------ */

function getPersyaratanItems(value: string | null | undefined): { text: string; jenis?: string; wajib?: boolean }[] {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => item && typeof item.text === 'string')) {
      return parsed.filter((item) => item.text.trim()).map((item) => ({
        text: item.text.trim(),
        jenis: typeof item.jenis === 'string' ? item.jenis : undefined,
        wajib: item.wajib !== false,
      }));
    }
  } catch { /* Format lama berupa teks per baris. */ }
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).map((text) => ({
    text: text.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, ''),
  }));
}

function formatTanggal(tanggal: string | null | undefined): string {
  if (!tanggal) return 'Belum ditentukan';
  const [tahun, bulan, hari] = String(tanggal).slice(0, 10).split('-').map(Number);
  if (!tahun || !bulan || !hari) return 'Belum ditentukan';
  return new Date(tahun, bulan - 1, hari).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* Komponen                                                            */
/* ------------------------------------------------------------------ */

interface EventDetailPageProps {
  eventId: string;
  step: EventRouteStep;
  /** Event dari daftar di App. Boleh null (misalnya data belum selesai dimuat); halaman akan mengambilnya sendiri. */
  event: TrainingProposal | null;
  /** true untuk superadmin / pemilik event, supaya event yang belum tayang tetap bisa dilihat. */
  canViewUnpublished?: boolean;
  disabilities?: DisabilityMaster[];
  appSettings?: { logo?: string; applicationName?: string; institutionSubtitle?: string; topbarColor?: string };
  onRegisterSuccess: (participant: Participant) => void;
}

import { getParticipantCategoryOptions } from '../utils/participantCategory.ts';

const FALLBACK_DISABILITY_OPTIONS = [
  { value: 'umum', label: 'Umum / Non-Disabilitas (Masyarakat, Relawan, Guru)' },
  { value: 'tunanetra', label: 'Tunanetra (Braille / Audio)' },
  { value: 'tunarungu', label: 'Tunarungu (Bahasa Isyarat)' },
  { value: 'tunadaksa', label: 'Tunadaksa (Akses Kursi Roda)' },
  { value: 'intelektual_autisme', label: 'Intelektual / Autisme' },
];

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  step,
  event: eventFromApp,
  canViewUnpublished = false,
  disabilities = [],
  appSettings,
  onRegisterSuccess,
}) => {
  // Event bisa belum ada di daftar App (data masih dimuat / tautan dibuka langsung): ambil sendiri dari server.
  const [fetchedEvent, setFetchedEvent] = useState<TrainingProposal | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle');

  useEffect(() => {
    if (eventFromApp) { setLoadState('idle'); return; }
    let cancelled = false;
    setLoadState('loading');
    fetch(`/api/events/${encodeURIComponent(eventId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        if (d?.event) { setFetchedEvent(d.event as TrainingProposal); setLoadState('idle'); }
        else setLoadState('notfound');
      })
      .catch((status) => { if (!cancelled) setLoadState(status === 404 ? 'notfound' : 'error'); });
    return () => { cancelled = true; };
  }, [eventId, eventFromApp?.id]);

  const event = eventFromApp ?? fetchedEvent;
  const isVisible = !!event && (event.isAktif || event.status === 'disetujui' || canViewUnpublished);

  // Pendaftar tambahan hanya perlu dihitung lokal kalau event berasal dari fetch (bukan dari state App).
  const [addedLocally, setAddedLocally] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState<'deskripsi' | 'persyaratan' | 'benefit'>('deskripsi');
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form state
  const [regName, setRegName] = useState('');
  const [regWa, setRegWa] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regDisability, setRegDisability] = useState('');
  const [regFacilities, setRegFacilities] = useState<string[]>([]);
  const [regGender, setRegGender] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regNotes, setRegNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registered, setRegistered] = useState<{ participant: Participant; waLink: string | null } | null>(null);

  const activeDisabilities = disabilities.filter((d) => d.isAktif !== false);

  // Pilihan kategori peserta mengikuti kategori event:
  // 1 kategori -> 1 pilihan; 2 kategori -> masing-masing + gabungan (3 pilihan).
  const eventCategoryLabel = (() => {
    if (!event) return '';
    const master = activeDisabilities.find((d) => d.id === (event as any).disabilityId);
    return master?.nama || String(event.kategoriDisabilitasUtama || event.kategoriDisabilitas || '').trim();
  })();
  const disabilityOptions = getParticipantCategoryOptions(
    eventCategoryLabel,
    activeDisabilities,
    { value: FALLBACK_DISABILITY_OPTIONS[0].value, label: FALLBACK_DISABILITY_OPTIONS[0].label },
  );
  const disabilityOptionsKey = disabilityOptions.map((o) => o.value).join('|');

  // Tetapkan/koreksi pilihan awal bila nilai sekarang tidak termasuk pilihan event ini.
  useEffect(() => {
    if (!event) return;
    setRegDisability((current) => (disabilityOptions.some((o) => o.value === current) ? current : disabilityOptions[0].value));
  }, [event?.id, disabilityOptionsKey]);

  // Reset form saat pindah event
  useEffect(() => {
    setRegistered(null);
    setSubmitError('');
    setAddedLocally(0);
    setActiveTab('deskripsi');
    setRegName(''); setRegWa(''); setRegEmail(''); setRegAge(''); setRegNotes(''); setRegGender(''); setRegAddress('');
    setRegFacilities([]);
  }, [eventId]);

  // Judul tab browser + gulir ke atas setiap pindah halaman/langkah
  useEffect(() => {
    if (!event) return;
    const previousTitle = document.title;
    document.title = `${event.namaKegiatan} | ${appSettings?.applicationName || 'Event'}`;
    return () => { document.title = previousTitle; };
  }, [event?.id, appSettings?.applicationName]);

  useEffect(() => { window.scrollTo(0, 0); }, [eventId, step]);

  // Tutup pratinjau foto dengan tombol Escape
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

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

  /* ---------- Keadaan: memuat / tidak ditemukan / error ---------- */
  if (!event || !isVisible) {
    const message =
      loadState === 'loading' || (loadState === 'idle' && !event && !isVisible && !fetchedEvent && !eventFromApp)
        ? null
        : loadState === 'error'
          ? 'Event gagal dimuat. Periksa koneksi lalu coba lagi.'
          : 'Event tidak ditemukan, atau belum dipublikasikan.';
    return (
      <div className="min-h-screen w-full bg-slate-50">
        {topBar}
        <main className="max-w-xl mx-auto px-4 py-20 text-center">
          {message === null ? (
            <p className="text-slate-500 text-[14px]" role="status">Memuat detail event…</p>
          ) : (
            <>
              <Icon name="event_busy" className="text-[48px] text-slate-400" />
              <h1 className="text-xl font-bold text-slate-900 mt-2">{message}</h1>
              <button
                type="button"
                onClick={goHome}
                className="mt-6 px-6 py-2.5 rounded-xl bg-[#005a71] hover:bg-cyan-900 text-white font-bold text-[13px] cursor-pointer"
              >
                Lihat Semua Event
              </button>
            </>
          )}
        </main>
      </div>
    );
  }

  /* ---------- Data turunan ---------- */
  const organizer = event.mitraOrg || event.mitraName || 'Yayasan Mitra';
  // Hanya alamat lengkap yang dipakai. Data lama berformat "Nama lokasi — alamat" digabung dengan koma.
  const eventAddress = (event.lokasiDanAlamat || '').replace(/\s+[—–]\s+/g, ', ').trim() || '—';
  const eventDate = (event.tanggalKegiatan || '').split(' (')[0].trim();
  const eventEndDate = (event as any).tanggalBerakhirKegiatan || (event as any).tanggal_berakhir_kegiatan || (event as any).tanggalSelesai || (event as any).tanggal_selesai || '';
  const eventStart = event.jamMulai || event.waktuMulai || event.tanggalKegiatan?.match(/\((\d{1,2}:\d{2})\s*-/)?.[1] || '';
  const eventEnd = event.jamSelesai || event.waktuSelesai || event.tanggalKegiatan?.match(/-\s*(\d{1,2}:\d{2})\)/)?.[1] || '';
  const eventDisabilityRaw = String(event.kategoriDisabilitasUtama || event.kategoriDisabilitas || '').trim();
  const eventDisability = !eventDisabilityRaw || eventDisabilityRaw.toLowerCase() === 'umum' || eventDisabilityRaw.toLowerCase().includes('non-disabilitas') ? 'Umum / Non-Disabilitas' : eventDisabilityRaw;
  const hasCoordinates =
    Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude)) &&
    !(Number(event.latitude) === 0 && Number(event.longitude) === 0);
  const mapsUrl = hasCoordinates ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}` : '';

  const kuotaMax = event.kuotaDisetujui || event.targetDanKuotaPeserta || 30;
  const pendaftar = (event.jumlahPendaftar || 0) + (eventFromApp ? 0 : addedLocally);
  const sisaKuota = Math.max(0, kuotaMax - pendaftar);
  const isFull = sisaKuota <= 0;
  const kuotaPercent = Math.min(100, Math.round((pendaftar / Math.max(1, kuotaMax)) * 100));
  const requirements = getPersyaratanItems(event.persyaratan);
  const photos = event.fotoDokumentasi || [];
  const facilitiesOffered = event.kebutuhanPeserta || [];

  const toggleFacility = (facility: string) =>
    setRegFacilities((prev) => (prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]));

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}${eventHash(event.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      window.prompt('Salin tautan event ini:', url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isFull) return;
    if (!regName.trim() || !regWa.trim() || !regEmail.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          namaLengkap: regName.trim(),
          noWa: regWa.trim(),
          email: regEmail.trim(),
          usia: Number(regAge) || 20,
          kategoriDisabilitas: regDisability,
          kebutuhanFasilitas: regFacilities,
          catatanKhusus: regNotes.trim(),
          jenisKelamin: regGender,
          alamat: regAddress.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.success || data.participant)) {
        setSubmitError(data.error || 'Pendaftaran gagal disimpan. Silakan coba lagi.');
        return;
      }
      const participant: Participant = data.participant;
      setRegistered({ participant, waLink: data.waLink ?? null });
      setAddedLocally((n) => n + 1);
      onRegisterSuccess(participant);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Gagal mengirim pendaftaran:', err);
      setSubmitError('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 bg-white focus:outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700';
  const labelClass = 'block text-[12.5px] font-bold text-slate-700 mb-1';

  const tabClass = (tab: typeof activeTab) =>
    `pb-3 px-2 text-[13px] font-bold border-b-2 transition-colors cursor-pointer ${
      activeTab === tab ? 'border-[#005a71] text-[#005a71]' : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  /* ---------- Layar sukses ---------- */
  if (registered) {
    const { participant, waLink } = registered;
    return (
      <div className="min-h-screen w-full bg-slate-50">
        {topBar}
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Icon name="check_circle" className="text-[36px]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Pendaftaran Berhasil!</h1>
            <p className="text-[13.5px] text-slate-600 leading-relaxed">
              Pendaftaran Anda untuk <strong>{event.namaKegiatan}</strong> oleh <strong>{organizer}</strong> sudah tercatat.
            </p>

            <div className="text-left bg-slate-50 rounded-xl border border-slate-200 p-4 text-[13px] space-y-2">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Nomor registrasi</span><span className="font-mono font-bold text-slate-900 break-all text-right">{participant.id}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Nama</span><span className="font-semibold text-slate-900 text-right">{participant.namaLengkap}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Jadwal</span><span className="font-semibold text-slate-900 text-right">{formatTanggal(eventDate)}{eventStart ? `, ${eventStart} WIB` : ''}</span></div>
            </div>

            {waLink ? (
              <div className="space-y-2 pt-1">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold text-[14px] shadow-md transition-colors"
                >
                  <Icon name="groups" className="text-[20px]" />
                  <span>Gabung Grup WhatsApp Event</span>
                </a>
                <p className="text-[12px] text-slate-500">
                  Tautan yang sama juga dikirim ke <strong>{participant.email}</strong> (cek folder Spam/Promosi bila belum masuk).
                  Gunakan nomor WhatsApp yang Anda daftarkan.
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3.5 leading-relaxed">
                Tautan grup WhatsApp belum disiapkan panitia. Begitu tersedia, tautan akan dikirim otomatis ke email Anda.
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={goHome}
                className="px-6 py-2.5 rounded-xl bg-[#005a71] hover:bg-cyan-900 text-white font-bold text-[13px] shadow-sm cursor-pointer"
              >
                Lihat Event Lainnya
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Langkah formulir ---------- */
  if (step === 'form') {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        {topBar}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => navigateHash(eventHash(event.id, 'detail'), true)}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                >
                  <Icon name="arrow_back" className="text-[16px]" />
                  <span>Kembali ke Detail Event</span>
                </button>
                <h1 className="text-xl font-bold text-slate-900">Formulir Pendaftaran Peserta</h1>
                <p className="text-[13px] text-slate-600 mt-1">
                  Event: <strong className="text-slate-900">{event.namaKegiatan}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center overflow-hidden">
                  <PartnerLogo name={organizer} logoUrl={event.mitraLogo || event.logoUrl} size="sm" className="w-full h-full object-contain p-0 border-0 shadow-none" />
                </div>
                <VerifiedBadge size="xs" />
              </div>
            </div>

            {isFull && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800">
                Kuota event ini sudah penuh, pendaftaran baru tidak dapat diterima.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className={labelClass}>Nama Lengkap Peserta *</label>
                <input id="reg-name" type="text" required autoComplete="name" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Nama sesuai identitas" className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-wa" className={labelClass}>Nomor WhatsApp Aktif *</label>
                  <input id="reg-wa" type="tel" inputMode="tel" required autoComplete="tel" value={regWa} onChange={(e) => setRegWa(e.target.value)} placeholder="Contoh: 08123456789" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="reg-email" className={labelClass}>Email Aktif *</label>
                  <input id="reg-email" type="email" required autoComplete="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="nama@email.com" className={inputClass} />
                </div>
              </div>
              <p className="text-[11.5px] text-slate-500 -mt-2">Tautan grup WhatsApp event juga dikirim ke email ini, jadi pastikan alamatnya benar.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-age" className={labelClass}>Usia (Tahun)</label>
                  <input id="reg-age" type="number" min={1} max={120} value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="Contoh: 19" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="reg-dis" className={labelClass}>Kategori Peserta  *</label>
                  <select id="reg-dis" required value={regDisability} onChange={(e) => setRegDisability(e.target.value)} className={inputClass}>
                    {disabilityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            
       
              <div>
                <label htmlFor="reg-gender" className={labelClass}>
                  Jenis Kelamin
                </label>
                <select
                  id="reg-gender"
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              

              <div>
                <label htmlFor="reg-address" className={labelClass}>Alamat *</label>
                <textarea id="reg-address" required rows={2} value={regAddress} onChange={(e) => setRegAddress(e.target.value)} placeholder="Alamat lengkap tempat tinggal (jalan, RT/RW, kelurahan, kota)" className={inputClass} />
              </div>

              <div>
                <label htmlFor="reg-notes" className={labelClass}>Catatan Khusus / Riwayat Belajar (Opsional)</label>
                <textarea id="reg-notes" rows={3} value={regNotes} onChange={(e) => setRegNotes(e.target.value)} placeholder="Contoh: sudah hafal surat An-Nas sampai Al-Ikhlas, membutuhkan pendamping." className={inputClass} />
              </div>

              {submitError && (
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800 flex items-start gap-2">
                  <Icon name="error" className="text-[18px] shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigateHash(eventHash(event.id, 'detail'), true)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isFull}
                  className="px-8 py-2.5 rounded-xl bg-[#0b63e5] hover:bg-[#0952c4] text-white font-extrabold text-[13px] shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Mengirim…' : 'Kirim Pendaftaran'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Halaman detail ---------- */
  const facts: { icon: string; label: string; value: string; sub?: string }[] = [
    { icon: 'hourglass_top', label: 'Durasi Program', value: event.durasiProgram || '—' },
    { icon: 'calendar_month', label: 'Tanggal Mulai Kegiatan', value: formatTanggal(eventDate) },
    { icon: 'event_available', label: 'Tanggal Berakhir Kegiatan', value: formatTanggal(eventEndDate) },
    { icon: 'schedule', label: 'Jam Mulai', value: eventStart ? `${eventStart} WIB` : '—' },
    { icon: 'schedule', label: 'Jam Selesai', value: eventEnd ? `${eventEnd} WIB` : '—' },
    { icon: 'location_on', label: 'Alamat Lengkap', value: eventAddress, sub: [event.kota, event.provinsi].filter(Boolean).join(', ') },
    { icon: 'group', label: 'Kuota Peserta', value: `${pendaftar} / ${kuotaMax} peserta`, sub: isFull ? 'Kuota penuh' : `Sisa ${sisaKuota} kursi` },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {topBar}

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Judul halaman */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-cyan-50 text-[#005a71] text-[11px] font-bold border border-cyan-100">Pelatihan</span>
            <span className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-100">{eventDisability !== '—' ? eventDisability : 'Umum / Non-Disabilitas'}</span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${isFull ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {isFull ? 'Kuota Penuh' : 'Pendaftaran Dibuka'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">{event.namaKegiatan}</h1>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 overflow-hidden">
              <PartnerLogo name={organizer} logoUrl={event.mitraLogo || event.logoUrl} size="md" className="w-full h-full object-contain p-0 border-0 shadow-none" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Penyelenggara</div>
              <div className="text-[15px] font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>{organizer}</span>
                <VerifiedBadge size="sm" />
              </div>
            </div>
          </div>
        </header>

        {/* Ringkasan cepat */}
        <section aria-label="Ringkasan event" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
              <Icon name={f.icon} className="text-[22px] text-[#005a71] shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{f.label}</div>
                <div className="text-[13.5px] font-bold text-slate-900 break-words">{f.value}</div>
                {f.sub && <div className="text-[11.5px] text-slate-500 break-words">{f.sub}</div>}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom kiri */}
          <div className="lg:col-span-7 space-y-8">
            <div className="relative min-h-[250px] sm:min-h-[300px] rounded-2xl text-white shadow-lg overflow-hidden bg-slate-900">
              {photos[0] ? (
                <img src={photos[0]} alt={`Dokumentasi ${event.namaKegiatan}`} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#024059] via-[#005a71] to-[#046a85]" aria-hidden="true" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/10" aria-hidden="true" />
              <div className="relative z-10 flex min-h-[250px] sm:min-h-[300px] items-end p-6 sm:p-8">
                <div className="max-w-md">
                  <span className="inline-block px-3 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-bold tracking-wider uppercase mb-2">Pelatihan</span>
                  <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight uppercase text-white mb-2">{event.namaKegiatan}</h2>
                  <p className="text-[13px] text-white font-medium mb-4 leading-relaxed">Diselenggarakan oleh Yayasan Tunanetra Indonesia Untuk Seluruh Masyarakat Indonesia.</p>
                </div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="photo_library" className="text-[16px] text-[#005a71]" />
                  Foto Dokumentasi / Sampul Event
                </h2>
                {photos.length > 0 && <span className="text-[11px] font-bold text-[#005a71] bg-cyan-50 px-2 py-0.5 rounded">{photos.length} Foto</span>}
              </div>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {photos.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setPreviewImage(url)}
                      className="relative h-28 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-white"
                      aria-label={`Perbesar foto dokumentasi ${idx + 1}`}
                    >
                      <img src={url} alt={`Dokumentasi kegiatan ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
                  <p className="text-[12px] text-slate-500">Dokumentasi foto kegiatan akan diunggah oleh mitra penyelenggara.</p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Tentang Event</h2>
                <p className="mt-2 text-[13.5px] leading-6 text-slate-700 whitespace-pre-line">{event.deskripsiPelatihan || 'Deskripsi kegiatan belum ditambahkan oleh penyelenggara.'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Nama Event', event.namaKegiatan],
                  ['Kategori Kegiatan', event.jenisEvent],
                  ['Kategori Peserta', eventDisability !== '—' ? eventDisability : 'Umum / Non-Disabilitas'],
                  ['Durasi Program', event.durasiProgram],
                  ['Tanggal Mulai Kegiatan', formatTanggal(eventDate)],
                  ['Tanggal Berakhir Kegiatan', formatTanggal(eventEndDate)],
                  ['Jam Mulai', eventStart ? `${eventStart} WIB` : '—'],
                  ['Jam Selesai', eventEnd ? `${eventEnd} WIB` : '—'],
                  ['Alamat Lengkap', eventAddress],
                  ['Provinsi', event.provinsi],
                  ['Kota / Kabupaten', event.kota],
                  ['Kuota Peserta', `${kuotaMax} peserta`],
                  ['Batas Pendaftaran', formatTanggal(event.batasPendaftaran)],
                  ['Benefit', event.benefit],
                ].filter(([, value]) => value && String(value).trim()).map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</div>
                    <div className="mt-1 text-[13px] text-slate-800 whitespace-pre-line break-words">{value}</div>
                  </div>
                ))}
              </div>
              {requirements.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-slate-900 mb-2">Persyaratan Peserta</h3>
                  <ul className="space-y-2">{requirements.map((item, index) => <li key={`${index}-${item.text}`} className="flex gap-2 text-[13px] text-slate-700"><Icon name="check_circle" className="text-[17px] text-emerald-600 shrink-0" /><span className="whitespace-pre-line">{item.text}</span></li>)}</ul>
                </div>
              )}
            </section>
          </div>

          {/* Kolom kanan: kartu pendaftaran */}
          <aside className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-5 lg:sticky lg:top-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batas Pendaftaran</div>
                  <div className="text-[17px] sm:text-[18px] font-extrabold text-slate-900 mt-0.5">{formatTanggal(event.batasPendaftaran)}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-white text-[11px] font-bold tracking-wide ${isFull ? 'bg-rose-600' : 'bg-emerald-600'}`}>{isFull ? 'Penuh' : 'Buka'}</span>
              </div>

              <div>
                <div className="flex justify-between text-[12px] text-slate-600 mb-1.5">
                  <span>{pendaftar} terdaftar</span>
                  <span>{isFull ? 'Kuota penuh' : `Sisa ${sisaKuota} dari ${kuotaMax}`}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={kuotaPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Kuota terisi">
                  <div className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${kuotaPercent}%` }} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEventPage(event.id, 'form')}
                disabled={isFull}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0b63e5] hover:bg-[#0952c4] text-white font-extrabold text-[14px] sm:text-[15px] tracking-wide transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFull ? 'KUOTA PENUH' : 'DAFTAR SEKARANG'}
              </button>
              

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
                <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">
                  <Icon name="share" className="text-[17px]" />
                  <span>{copiedLink ? 'Tautan Disalin!' : 'Bagikan event ini'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Pratinjau foto layar penuh */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto dokumentasi"
          onClick={() => setPreviewImage(null)}
        >
          <button type="button" onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer" aria-label="Tutup pratinjau">
            <Icon name="close" className="text-[24px]" />
          </button>
          <img src={previewImage} alt="Foto dokumentasi kegiatan" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};