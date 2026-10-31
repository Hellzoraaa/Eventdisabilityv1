import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { TrainingProposal, DisabilityMaster } from '../types.ts';
import { PartnerLogo } from './PartnerLogo.tsx';
import { VerifiedBadge } from './VerifiedBadge.tsx';
import { isRegistrationDeadlinePassed } from '../utils/registrationStatus.ts';

import { getParticipantCategoryOptions } from '../utils/participantCategory.ts';
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
  if (!tanggal) return "Belum ditentukan";
  const [tahun, bulan, hari] = String(tanggal).slice(0, 10).split("-").map(Number);
  if (!tahun || !bulan || !hari) return "Belum ditentukan";
  return new Date(tahun, bulan - 1, hari).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

interface EventDetailModalProps {
  event: TrainingProposal | null;
  onClose: () => void;
  onRegisterSubmit: (formData: {
    namaLengkap: string;
    noWa: string;
    email: string;
    usia: number;
    kategoriDisabilitas: string;
    kebutuhanFasilitas: string[];
    catatanKhusus: string;
  }) => Promise<void>;
  disabilities?: DisabilityMaster[];
  isSubmitting?: boolean;
  initialStep?: 'detail' | 'form';
  appSettings?: { logo?: string; applicationName?: string; institutionSubtitle?: string; topbarColor?: string };
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRegisterSubmit,
  disabilities = [],
  isSubmitting = false,
  initialStep = 'detail',
  appSettings,
}) => {
  if (!event) return null;

  const [activeStep, setActiveStep] = useState<'detail' | 'form' | 'success'>(initialStep);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'deskripsi' | 'kurikulum' | 'syarat' | 'fasilitas'>('deskripsi');

  // Form states
  const [regName, setRegName] = useState('');
  const [regWa, setRegWa] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAge, setRegAge] = useState('');
  // Pilihan kategori peserta mengikuti kategori event (1 kategori -> 1 pilihan; 2 kategori -> 3 pilihan).
  const activeDisabilities = disabilities.filter(d => d.isAktif !== false);
  const eventMaster = activeDisabilities.find(d => d.id === (event as any).disabilityId);
  const disabilityOptions = getParticipantCategoryOptions(
    eventMaster?.nama || String(event.kategoriDisabilitasUtama || event.kategoriDisabilitas || '').trim(),
    activeDisabilities,
  );
  const [regDisability, setRegDisability] = useState(disabilityOptions[0].value);
  const [regFacilities, setRegFacilities] = useState<string[]>([]);
  const [regNotes, setRegNotes] = useState('');

  // Data yang ditampilkan mengikuti field Form Permintaan Event.
  // Form menyimpan satu alamat lengkap (data lama: "nama lokasi — alamat").
  const eventAddress = (event.lokasiDanAlamat || '').replace(/\s+[—–]\s+/g, ', ').trim() || '—';
  const eventDate = (event.tanggalKegiatan || '').split(' (')[0].trim() || '—';
  const eventEndDate = (event as any).tanggalBerakhirKegiatan || (event as any).tanggal_berakhir_kegiatan || (event as any).tanggalSelesai || (event as any).tanggal_selesai || '';
  const eventStart = event.jamMulai || event.waktuMulai || (event.tanggalKegiatan?.match(/\((\d{1,2}:\d{2})\s*-/)?.[1]) || '—';
  const eventEnd = event.jamSelesai || event.waktuSelesai || (event.tanggalKegiatan?.match(/-\s*(\d{1,2}:\d{2})\)/)?.[1]) || '—';
  const eventDisabilityRaw = String(event.kategoriDisabilitasUtama || event.kategoriDisabilitas || '').trim();
  const eventDisability = !eventDisabilityRaw || eventDisabilityRaw.toLowerCase() === 'umum' || eventDisabilityRaw.toLowerCase().includes('non-disabilitas') ? 'Umum / Non-Disabilitas' : eventDisabilityRaw;

  const kuotaMax = event.kuotaDisetujui || event.targetDanKuotaPeserta || 30;
  const pendaftar = event.jumlahPendaftar || 0;
  const sisaKuota = Math.max(0, kuotaMax - pendaftar);

  const toggleFacility = (facility: string) => {
    setRegFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regWa.trim()) return;

    await onRegisterSubmit({
      namaLengkap: regName.trim(),
      noWa: regWa.trim(),
      email: regEmail.trim(),
      usia: Number(regAge) || 20,
      kategoriDisabilitas: regDisability,
      kebutuhanFasilitas: regFacilities,
      catatanKhusus: regNotes.trim(),
    });
    setActiveStep('success');
  };

  const handleShare = () => {
    const url = `${window.location.origin}/#daftar/${event.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full min-h-screen bg-slate-50 overflow-y-auto animate-in fade-in duration-200">
      <nav
        className="sticky top-0 z-40 w-full border-b shadow-2xs"
        style={{
          backgroundColor: appSettings?.topbarColor || '#ffffff',
          borderColor: appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
          color: appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? '#ffffff' : '#1e293b',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appSettings?.logo ? <img src={appSettings.logo} alt={appSettings.applicationName || 'Logo Aplikasi'} className="w-10 h-10 object-contain" /> : <Icon name="menu_book" className="text-4xl text-teal-700" />}
            <div className="flex flex-col">
              <span className={`font-bold text-[17px] sm:text-[19px] tracking-tight leading-tight ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'text-white' : 'text-slate-900'}`}>{appSettings?.applicationName || "Event for Disability to Qur'an"}</span>
              <span className={`text-[11px] font-medium hidden sm:inline ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'text-white/80' : 'text-slate-500'}`}>{appSettings?.institutionSubtitle || 'Platform Pelatihan & Pemberdayaan Sahabat Disabilitas'}</span>
            </div>
          </div>
          <button onClick={onClose} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}>
            <Icon name="arrow_back" className="text-[20px]" /><span>Kembali</span>
          </button>
        </div>
      </nav>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-3xl w-full shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Event context strip */}
        <div className="bg-[#005a71] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-[12px] sm:text-[13px] font-medium shrink-0">
          <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Icon name="location_on" className="text-[16px] text-cyan-200" />
              <span className="text-cyan-100">Lokasi:</span>
              <span className="font-bold text-white">{event.kota || event.provinsi || 'Lokasi belum ditentukan'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Kembali ke katalog event"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Detail event page body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeStep === 'detail' && (
            <div>
              {/* Partner Info Row */}
              <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <PartnerLogo
                      name={event.mitraOrg || event.mitraName}
                      logoUrl={event.mitraLogo || event.logoUrl}
                      size="md"
                      className="w-full h-full object-contain p-0 border-0 shadow-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Penyelenggara Resmi:
                    </div>
                    <div className="text-[16px] sm:text-[17px] font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{event.mitraOrg || event.mitraName || 'Yayasan Mitra'}</span>
                      <VerifiedBadge size="sm" />
                    </div>
                    <div className="text-[12px] text-sky-700 font-semibold flex items-center gap-1 mt-0.5">
                      <VerifiedBadge size="xs" />
                      <span>Mitra Resmi Terverifikasi Kementerian Agama RI</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${isRegistrationDeadlinePassed(event.batasPendaftaran) ? 'bg-slate-200 text-slate-700 border-slate-300/60' : 'bg-emerald-100 text-emerald-800 border-emerald-300/40'}`}>
                    {isRegistrationDeadlinePassed(event.batasPendaftaran) ? 'Pendaftaran Berakhir' : 'Pendaftaran Dibuka'}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Sisa Kuota: <strong>{sisaKuota}</strong> dari {kuotaMax} peserta
                  </div>
                </div>
              </div>

              {/* Main 2-Column Grid (Left: Poster + Details, Right: Sticky Card) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column (~65%) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Poster Hero Card (Exactly matching Screenshot 2 design) */}
                  <div className="rounded-2xl border-4 border-cyan-800/20 bg-gradient-to-br from-[#024059] via-[#005a71] to-[#046a85] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
                    {/* Window Control Dots */}
                    <div className="flex items-center gap-1.5 mb-5 opacity-80">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-300" />
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-200" />
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-100" />
                      <span className="text-[10px] text-cyan-200 ml-2 tracking-widest font-mono">
                        KEMENAG RI & INKLUSI QURAN
                      </span>
                    </div>

                    {/* Poster Content */}
                    <div className="relative z-10 max-w-md">
                      <span className="inline-block px-3 py-0.5 rounded-md bg-white/20 text-cyan-100 text-[11px] font-bold tracking-wider uppercase mb-2">
                        Pelatihan
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight uppercase text-white mb-2">
                        {event.namaKegiatan}
                      </h2>
                      <p className="text-[13px] text-cyan-100 font-medium mb-4 leading-relaxed">
                        Diselenggarakan oleh Yayasan Tunanetra Indonesia Untuk Seluruh Masyarakat Indonesia.
                      </p>
                    </div>

                    {/* Decorative Student/Learner Silhouette Visual */}
                    <div className="absolute right-2 bottom-0 w-44 sm:w-56 h-48 sm:h-60 pointer-events-none opacity-90 flex items-end justify-center">
                      <svg viewBox="0 0 200 220" className="w-full h-full" fill="none">
                        <circle cx="100" cy="50" r="32" fill="#E2E8F0" />
                        <path d="M100 88C60 88 40 115 40 150V220H160V150C160 115 140 88 100 88Z" fill="#CBD5E1" />
                        {/* Open Quran Book */}
                        <path d="M60 170L100 160L140 170L140 210L100 200L60 210Z" fill="#F8FAFC" stroke="#005A71" strokeWidth="3" />
                        <path d="M100 160V200" stroke="#005A71" strokeWidth="2.5" />
                        {/* Tactile sparkles / ray */}
                        <circle cx="135" cy="40" r="5" fill="#FBBF24" />
                        <circle cx="65" cy="40" r="4" fill="#38BDF8" />
                      </svg>
                    </div>

                    {/* Subtle background glow */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />
                  </div>

                  {/* Navigation Tabs below poster */}
                  <div className="flex border-b border-slate-200 gap-2">
                    <button
                      onClick={() => setActiveTab('deskripsi')}
                      className={`pb-3 px-2 text-[13px] font-bold border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'deskripsi'
                          ? 'border-[#005a71] text-[#005a71]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Deskripsi Pelatihan
                    </button>
                    <button
                      onClick={() => setActiveTab('kurikulum')}
                      className={`pb-3 px-2 text-[13px] font-bold border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'kurikulum'
                          ? 'border-[#005a71] text-[#005a71]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Persyaratan
                    </button>
                    <button
                      onClick={() => setActiveTab('fasilitas')}
                      className={`pb-3 px-2 text-[13px] font-bold border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'fasilitas'
                          ? 'border-[#005a71] text-[#005a71]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Benefit Event/Pelatihan
                    </button>
                  </div>

                  {/* Tab Content Panels */}
                  <div className="text-[13.5px] text-slate-700 leading-relaxed min-h-[160px]">
                    {activeTab === 'deskripsi' && (
                      <div className="space-y-4">
                        <p>{event.deskripsiPelatihan || 'Belum ada deskripsi event.'}</p>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-[13px]">
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Nama Event</span><strong>{event.namaKegiatan || '—'}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Kategori Kegiatan</span><strong>{event.jenisEvent || '—'}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Kategori Peserta</span><strong>{eventDisability}</strong></div>
                          {event.fotoDokumentasi?.[0] && <div className="sm:col-span-2"><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-2">Foto Dokumentasi / Sampul Event</span><img src={event.fotoDokumentasi[0]} alt={`Sampul ${event.namaKegiatan}`} className="w-full max-h-64 object-cover rounded-xl border border-slate-200" /></div>}
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Durasi Program</span><strong>{event.durasiProgram || '—'}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Tanggal Mulai Kegiatan</span><strong>{formatTanggal(eventDate)}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Tanggal Berakhir Kegiatan</span><strong>{formatTanggal(eventEndDate)}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Jam Mulai</span><strong>{eventStart} WIB</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Jam Selesai</span><strong>{eventEnd} WIB</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Alamat Lengkap</span><strong>{eventAddress}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Provinsi</span><strong>{event.provinsi || '—'}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Kota / Kabupaten</span><strong>{event.kota || '—'}</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Kuota Peserta</span><strong>{kuotaMax} peserta</strong></div>
                          <div><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Batas Pendaftaran</span><strong>{formatTanggal(event.batasPendaftaran)}</strong></div>
                          {event.benefit && <div className="sm:col-span-2"><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Benefit</span><p className="whitespace-pre-line">{event.benefit}</p></div>}
                          <div className="sm:col-span-2"><span className="block text-slate-500 text-[11px] font-semibold uppercase mb-1">Persyaratan</span><div className="whitespace-pre-line">{getPersyaratanItems(event.persyaratan).length ? getPersyaratanItems(event.persyaratan).map((item, i) => `${i + 1}. ${item.text}${item.wajib === false ? ' (opsional)' : ''}`).join('\n') : 'Persyaratan belum dicantumkan.'}</div></div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'kurikulum' && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        {getPersyaratanItems(event.persyaratan).length ? (
                          <ul className="space-y-2.5">
                            {getPersyaratanItems(event.persyaratan).map((item, index) => (
                              <li key={`${index}-${item.text}`} className="flex items-start gap-2.5">
                                <Icon name="check_circle" className="text-[18px] text-emerald-600" />
                                <span className="whitespace-pre-line">{item.text}{item.jenis ? <span className="ml-2 text-xs text-slate-500">({item.jenis}{item.wajib === false ? ', opsional' : ''})</span> : null}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500">Persyaratan belum dicantumkan oleh penyelenggara.</p>
                        )}
                      </div>
                    )}

                    {activeTab === 'syarat' && (
                      <ul className="space-y-2.5 list-disc pl-5 text-slate-700">
                        <li>Penyandang disabilitas (Tunanetra, Tunarungu, Tunadaksa, Autisme) atau pendamping keluarga.</li>
                        <li>Memiliki tekad dan komitmen kuat untuk belajar membaca Al-Quran.</li>
                        <li>Berusia minimal 7 tahun ke atas.</li>
                        <li>Mengisi formulir pendaftaran dengan nomor WhatsApp aktif yang dapat dihubungi.</li>
                        <li>Bagi peserta anak atau disabilitas berat, disarankan didampingi satu orang anggota keluarga.</li>
                      </ul>
                    )}

                    {activeTab === 'fasilitas' && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        {event.benefit?.trim() ? (
                          <p className="whitespace-pre-line">{event.benefit}</p>
                        ) : (
                          <p className="text-slate-500">Benefit belum dicantumkan pada Form Permintaan Event.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (~35%) - Sticky Floating Action Card (Digitalent Style) */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-5 sticky top-4">
                    {/* Deadline and Open Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Batas Pendaftaran
                        </div>
                        <div className="text-[17px] sm:text-[18px] font-extrabold text-slate-900 mt-0.5">
                          {formatTanggal(event.batasPendaftaran)}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-white text-[11px] font-bold tracking-wide ${isRegistrationDeadlinePassed(event.batasPendaftaran) ? 'bg-slate-500' : 'bg-emerald-600'}`}>
                        {isRegistrationDeadlinePassed(event.batasPendaftaran) ? 'Berakhir' : 'Buka'}
                      </span>
                    </div>

                    {/* Big Action Button: DAFTAR SEKARANG */}
                    <button
                      onClick={() => setActiveStep('form')}
                      disabled={isRegistrationDeadlinePassed(event.batasPendaftaran)}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#0b63e5] hover:bg-[#0952c4] text-white font-extrabold text-[14px] sm:text-[15px] tracking-wide transition-all shadow-md hover:shadow-lg cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRegistrationDeadlinePassed(event.batasPendaftaran) ? 'PENDAFTARAN BERAKHIR' : 'DAFTAR SEKARANG'}
                    </button>
                    {/* Share Button (Screenshot 2 footer) */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
                      <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <Icon name="share" className="text-[17px]" />
                        <span>{copiedLink ? 'Tautan Disalin!' : 'Bagikan pelatihan ini'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'form' && (
            <div className="max-w-2xl mx-auto">
              {/* Form Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <button
                    onClick={() => setActiveStep('detail')}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                  >
                    <Icon name="arrow_back" className="text-[16px]" />
                    <span>Kembali ke Detail Pelatihan</span>
                  </button>
                  <h3 className="text-xl font-bold text-slate-900">
                    Formulir Pendaftaran Peserta Pelatihan
                  </h3>
                  <p className="text-[13px] text-slate-600 mt-1">
                    Pelatihan: <strong className="text-slate-900">{event.namaKegiatan}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shadow-2xs overflow-hidden">
                    <PartnerLogo
                      name={event.mitraOrg || event.mitraName}
                      logoUrl={event.mitraLogo || event.logoUrl}
                      size="sm"
                      className="w-full h-full object-contain p-0 border-0 shadow-none"
                    />
                  </div>
                  <VerifiedBadge size="xs" />
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[13px] text-cyan-950 flex items-center gap-2">
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                    Nama Lengkap Santri / Peserta *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Nama sesuai identitas..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-cyan-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                      Nomor WhatsApp Aktif *
                    </label>
                    <input
                      type="tel"
                      required
                      value={regWa}
                      onChange={e => setRegWa(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-cyan-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                      Email (Opsional)
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-cyan-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                      Usia (Tahun)
                    </label>
                    <input
                      type="number"
                      value={regAge}
                      onChange={e => setRegAge(e.target.value)}
                      placeholder="Contoh: 19"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-cyan-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                      Kategori Peserta / Disabilitas *
                    </label>
                    <select
                      value={regDisability}
                      onChange={e => setRegDisability(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-cyan-700"
                    >
                      {disabilityOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>


                <div>
                  <label className="block text-[12.5px] font-bold text-slate-700 mb-1">
                    Catatan Khusus / Riwayat Belajar Sebelumnya (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={regNotes}
                    onChange={e => setRegNotes(e.target.value)}
                    placeholder="Contoh: Sudah hafal surat An-Nas s/d Al-Ikhlas, memerlukan penjemputan dari stasiun terdekat..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-cyan-700"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveStep('detail')}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 rounded-xl bg-[#0b63e5] hover:bg-[#0952c4] text-white font-extrabold text-[13px] shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeStep === 'success' && (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Icon name="check_circle" className="text-[36px]" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                Pendaftaran Berhasil!
              </h3>
              <p className="text-[13.5px] text-slate-600 leading-relaxed">
                Alhamdulillah, berkas pendaftaran Anda telah tercatat pada sistem pelatihan <strong>{event.namaKegiatan}</strong> oleh <strong>{event.mitraOrg || event.mitraName}</strong>. Panitia akan menghubungi Anda melalui WhatsApp untuk jadwal verifikasi dan temu awal.
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#005a71] hover:bg-cyan-900 text-white font-bold text-[13px] shadow-sm cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
