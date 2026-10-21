import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icon.tsx';
import { TrainingProposal, Participant, DisabilityMaster, EventCategory, TPQProgram } from '../types.ts';

interface EventCatalogPublicProps {
  events: TrainingProposal[];
  tpqPrograms?: TPQProgram[];
  onRegisterSuccess: (participant: Participant) => void;
  selectedEventIdFromMap?: string | null;
  onClearSelectedEventId?: () => void;
  disabilities?: DisabilityMaster[];
  selectedCategoryFilter?: string;
  onSelectCategoryFilter?: (category: string) => void;
  eventCategories?: EventCategory[];
}

export const EventCatalogPublic: React.FC<EventCatalogPublicProps> = ({
  events,
  tpqPrograms = [],
  onRegisterSuccess,
  selectedEventIdFromMap,
  onClearSelectedEventId,
  disabilities = [],
  selectedCategoryFilter,
  onSelectCategoryFilter,
  eventCategories = [],
}) => {
  const activeEvents = events.filter(e => e.isAktif && e.status === 'disetujui');
  // Izin publikasi adalah sumber utama visibilitas; jangan sembunyikan program hanya karena flag isAktif lama bernilai 0.
  const activeTPQPrograms = tpqPrograms.filter(p =>
    String(p.status ?? '').trim().toLowerCase() === 'disetujui' &&
    (p.izinkanPublikasi === true || Number(p.izinkanPublikasi) === 1)
  );

  // Helpers untuk kompatibilitas dengan data event lama dan data master terbaru.
  const getEventDisability = (event: TrainingProposal) => {
    const ref = String(event.disabilityIdString || '').trim().toLowerCase();
    if (!ref) return null;
    return activeDisabilities.find(d =>
      String(d.id).toLowerCase() === ref || String(d.kode).toLowerCase() === ref || String(d.nama).toLowerCase() === ref
    ) || null;
  };

  const formatEventDate = (value: string) => {
    if (!value) return '-';
    // Mendukung format lama seperti "2026-10-15 s/d 2026-10-18".
    const parts = value.split(/\s+s\/d\s+/i);
    const formatOne = (raw: string) => {
      const date = new Date(`${raw.trim()}T00:00:00`);
      if (Number.isNaN(date.getTime())) return raw.trim();
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    };
    return parts.length > 1 ? `${formatOne(parts[0])} – ${formatOne(parts[1])}` : formatOne(parts[0]);
  };

  const formatEventTime = (event: TrainingProposal) => {
    const start = event.jamMulai?.trim();
    const end = event.jamSelesai?.trim();
    if (start && end) return `${start} – ${end} WIB`;
    if (start) return `${start} WIB`;
    return null;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryFilter || 'Semua');
  const [programTypeFilter, setProgramTypeFilter] = useState<'Semua' | 'Event Pelatihan' | 'Pendidikan TPQ'>('Semua');
  const [activeTPQDetail, setActiveTPQDetail] = useState<TPQProgram | null>(null);
  const [activeModalEvent, setActiveModalEvent] = useState<TrainingProposal | null>(() => {
    if (selectedEventIdFromMap) {
      return activeEvents.find(e => e.id === selectedEventIdFromMap) || null;
    }
    return null;
  });

  // Flow step inside modal: 'detail' | 'form' | 'question_next_event' | 'finished_status'
  const [modalStep, setModalStep] = useState<'detail' | 'form' | 'question_next_event' | 'finished_status'>('detail');

  // Sync if selected from outside (e.g. map or URL hash)
  React.useEffect(() => {
    if (selectedEventIdFromMap) {
      const target = activeEvents.find(e => e.id === selectedEventIdFromMap);
      if (target) {
        setActiveModalEvent(target);
        setModalStep('detail');
      }
    }
  }, [selectedEventIdFromMap, activeEvents]);

  // Form State
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noWa, setNoWa] = useState('');
  const [email, setEmail] = useState('');
  const [usia, setUsia] = useState('');
  const [kategoriDisabilitas, setKategoriDisabilitas] = useState<
    'tunanetra' | 'tunarungu' | 'tunadaksa' | 'intelektual_autisme' | 'pendamping_umum'
  >('tunanetra');
  const [kebutuhanFasilitas, setKebutuhanFasilitas] = useState<string[]>([]);
  const [catatanKhusus, setCatatanKhusus] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRegisteredParticipant, setLastRegisteredParticipant] = useState<Participant | null>(null);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Sync if selectedCategoryFilter changes from parent (e.g. from DisabilityManagement)
  useEffect(() => {
    if (selectedCategoryFilter) {
      setSelectedCategory(selectedCategoryFilter);
    }
  }, [selectedCategoryFilter]);

  // Active disabilities list from master data
  const activeDisabilities = useMemo(() => {
    return (disabilities || []).filter(d => d.isAktif !== false);
  }, [disabilities]);

  const categories = useMemo(() => {
    if (activeDisabilities.length > 0) {
      return ['Semua', ...activeDisabilities.map(d => d.nama)];
    }
    return ['Semua'];
  }, [activeDisabilities]);

  // Keep selected category valid against current active categories
  useEffect(() => {
    if (selectedCategory !== 'Semua' && !categories.includes(selectedCategory)) {
      setSelectedCategory('Semua');
    }
  }, [categories, selectedCategory]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (onSelectCategoryFilter) onSelectCategoryFilter(cat);
  };

  const filteredEvents = activeEvents.filter(ev => {
    if (programTypeFilter === 'Pendidikan TPQ') return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || ev.namaKegiatan.toLowerCase().includes(q) || ev.kota.toLowerCase().includes(q) || ev.mitraOrg.toLowerCase().includes(q);
  });
  const filteredTPQPrograms = activeTPQPrograms.filter(program => {
    if (programTypeFilter === 'Event Pelatihan') return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || program.namaProgram.toLowerCase().includes(q) || program.kota.toLowerCase().includes(q) || program.mitraOrg.toLowerCase().includes(q);
  });

  const handleOpenDetail = (ev: TrainingProposal) => {
    setActiveModalEvent(ev);
    setModalStep('detail');
    setLastRegisteredParticipant(null);
    setWaLink(null);
    setNamaLengkap('');
    setNoWa('');
    setEmail('');
    setUsia('');
    setCatatanKhusus('');
    setKebutuhanFasilitas([]);
  };

  const toggleFasilitas = (item: string) => {
    setKebutuhanFasilitas(prev => 
      prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
    );
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalEvent || !namaLengkap.trim() || !noWa.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: activeModalEvent.id,
          namaLengkap: namaLengkap.trim(),
          noWa: noWa.trim(),
          email: email.trim() || undefined,
          usia: parseInt(usia) || 25,
          kategoriDisabilitas,
          kebutuhanFasilitas,
          catatanKhusus: catatanKhusus.trim(),
        }),
      });

      const data = await response.json();
      const participantObj: Participant = data.participant || data;
      if (response.ok && (data.participant || data.success)) {
        setLastRegisteredParticipant(participantObj);
        setWaLink(data.waLink ?? null);
        onRegisterSuccess(participantObj);
        if (activeModalEvent) {
          setActiveModalEvent(prev => prev ? {
            ...prev,
            jumlahPendaftar: (Number(prev.jumlahPendaftar) || 0) + 1,
          } : null);
        }
        setModalStep('question_next_event');
      } else {
        alert(data.error || 'Terjadi kendala saat menyimpan pendaftaran.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim formulir pendaftaran. Silakan periksa koneksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setActiveModalEvent(null);
    setModalStep('detail');
    if (onClearSelectedEventId) onClearSelectedEventId();
  };

  const handleChooseAnotherEvent = () => {
    setActiveModalEvent(null);
    setModalStep('detail');
    if (onClearSelectedEventId) onClearSelectedEventId();
  };

  const handleFinishedRegistration = () => {
    setModalStep('finished_status');
  };

  return (
    <>
      {/* Intro Header */}
      <div className="mb-6 sm:mb-10 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl md:text-[36px] font-semibold text-on-surface tracking-tight leading-tight mb-2 sm:mb-3">
          Temukan Pelatihan Al-Quran<br />yang Tepat Untuk Anda.
        </h1>
        <p className="text-xs sm:text-[14px] md:text-[15px] text-on-surface-variant font-medium">
          Daftar program belajar yang inklusif, ramah disabilitas, dan didampingi langsung oleh ahli bersertifikat nasional.
        </p>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-outline-variant/30">
        <div className="w-full md:w-72">
          <label htmlFor="program-type-filter" className="block text-[11px] font-bold text-slate-500 mb-1.5 ml-2 uppercase tracking-wide">Kategori Program</label>
          <select id="program-type-filter" value={programTypeFilter} onChange={e => setProgramTypeFilter(e.target.value as 'Semua' | 'Event Pelatihan' | 'Pendidikan TPQ')} className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-full text-xs sm:text-[14px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
            <option value="Semua">Semua Program</option>
            <option value="Event Pelatihan">Event Pelatihan</option>
            <option value="Pendidikan TPQ">Pendidikan TPQ</option>
          </select>
        </div>
        <div className="relative w-full md:w-80 md:ml-auto">
          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px] sm:text-[20px]" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lokasi atau nama program..." 
            className="w-full pl-10 sm:pl-11 pr-4 py-2 sm:py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-full text-xs sm:text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Course Grid */}
      {filteredEvents.length + filteredTPQPrograms.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center">
          <Icon name="event_busy" className="text-[48px] text-outline mb-4" />
          <h3 className="font-semibold text-on-surface text-[16px]">Tidak ada jadwal kegiatan ditemukan</h3>
          <p className="text-[14px] text-on-surface-variant mt-2 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau pilih kategori pelatihan lain.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('Semua');
              setProgramTypeFilter('Semua');
              setSearchQuery('');
            }}
            className="mt-6 px-6 py-2.5 text-[14px] font-semibold text-primary bg-primary-container hover:bg-primary-container/80 rounded-full transition-colors cursor-pointer"
          >
            Tampilkan Seluruh Jadwal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 w-full">
          {filteredEvents.map((event) => {
            const kuotaMax = Number(event.kuotaDisetujui || event.targetDanKuotaPeserta || 0);
            const jumlahPendaftar = Number(event.jumlahPendaftar || 0);
            const sisaKuota = Math.max(0, kuotaMax - jumlahPendaftar);
            const isAlmostFull = sisaKuota <= 5 && sisaKuota > 0;
            const isFull = sisaKuota === 0;
            const eventDisability = getEventDisability(event);
            const eventTime = formatEventTime(event);
            const eventCategory = event.jenisEvent?.trim() || 'Event Umum';

            return (
              <article key={event.id} className="group bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
                {/* Banner */}
                <div className="h-48 sm:h-52 bg-slate-100 relative overflow-hidden">
                  {event.fotoDokumentasi?.[0] ? (
                    <img
                      src={event.fotoDokumentasi[0]}
                      alt={event.namaKegiatan}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100">
                      <Icon name="menu_book" className="text-[56px] text-emerald-700/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none" />

                  <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[85%]">
                    <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold text-emerald-800 uppercase tracking-wide shadow-sm">
                      {eventCategory}
                    </span>
                    {eventDisability && (
                      <span className="px-2.5 py-1 bg-emerald-700/95 text-white backdrop-blur-sm rounded-full text-[10px] font-bold shadow-sm">
                        {eventDisability.nama}
                      </span>
                    )}
                  </div>

                  {isFull ? (
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase shadow-sm">Penuh</span>
                  ) : isAlmostFull ? (
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-400 text-slate-900 rounded-full text-[10px] font-bold shadow-sm">Sisa {sisaKuota}</span>
                  ) : null}

                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-[11px] font-medium text-white/80 mb-1">Penyelenggara: {event.mitraOrg}</p>
                    <h3 className="text-[18px] sm:text-[20px] font-bold leading-tight line-clamp-2">{event.namaKegiatan}</h3>
                  </div>
                </div>

                {/* Informasi utama */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="grid grid-cols-1 gap-2.5 mb-4">
                    <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
                      <Icon name="calendar_month" className="text-[18px] text-emerald-700" />
                      <div>
                        <p className="font-semibold text-slate-900">Tanggal Pelaksanaan</p>
                        <p>{formatEventDate(event.tanggalKegiatan)}</p>
                      </div>
                    </div>

                    {eventTime && (
                      <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
                        <Icon name="schedule" className="text-[18px] text-emerald-700" />
                        <div>
                          <p className="font-semibold text-slate-900">Waktu</p>
                          <p>{eventTime}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
                      <Icon name="location_on" className="text-[18px] text-emerald-700" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">Lokasi</p>
                        <p className="line-clamp-2">{event.kota}, {event.provinsi}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-[12px] text-slate-600">
                      <Icon name="groups" className="text-[18px] text-emerald-700" />
                      <div>
                        <p className="font-semibold text-slate-900">Ditujukan untuk</p>
                        <p>{eventDisability?.nama || event.targetPeserta || 'Peserta umum'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3 text-[11px]">
                      <span className="text-slate-500">Kuota peserta</span>
                      <span className="font-bold text-slate-800">{jumlahPendaftar} / {kuotaMax}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-emerald-700 rounded-full transition-all"
                        style={{ width: `${kuotaMax > 0 ? Math.min(100, (jumlahPendaftar / kuotaMax) * 100) : 0}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(event)}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[13px] font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      Lihat Detail & Daftar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredTPQPrograms.map(program => (
            <article key={`tpq-${program.id}`} className="group bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
              <div className="h-48 sm:h-52 bg-slate-100 relative overflow-hidden">
                {program.fotoDokumentasi?.[0] ? <img src={program.fotoDokumentasi[0]} alt={program.namaProgram} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100"><Icon name="menu_book" className="text-[56px] text-emerald-700/30" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 rounded-full text-[10px] font-bold text-emerald-800 uppercase tracking-wide shadow-sm">Pendidikan TPQ</span>
                <div className="absolute bottom-3 left-4 right-4 text-white"><p className="text-[11px] font-medium text-white/80 mb-1">Penyelenggara: {program.mitraOrg}</p><h3 className="text-[18px] sm:text-[20px] font-bold leading-tight line-clamp-2">{program.namaProgram}</h3></div>
              </div>
              <div className="p-5 flex flex-col flex-1"><div className="grid grid-cols-1 gap-2.5 mb-4 text-[12px] text-slate-600">
                <div className="flex items-start gap-2.5"><Icon name="calendar_month" className="text-[18px] text-emerald-700" /><div><p className="font-semibold text-slate-900">Tanggal Mulai – Berakhir</p><p>{formatEventDate(program.tanggalMulai || '')} – {formatEventDate(program.tanggalSelesai || '')}</p></div></div>
                <div className="flex items-start gap-2.5"><Icon name="location_on" className="text-[18px] text-emerald-700" /><div><p className="font-semibold text-slate-900">Lokasi</p><p>{program.kota}, {program.provinsi}</p></div></div>
                <div className="flex items-start gap-2.5"><Icon name="menu_book" className="text-[18px] text-emerald-700" /><div><p className="font-semibold text-slate-900">Metode Pendidikan</p><p>Al-Qur’an {program.jenisTPQ === 'braille' ? 'Braille' : 'Isyarat'}</p></div></div>
              </div><p className="text-[12px] text-slate-600 line-clamp-3 mb-4">{program.deskripsiProgram}</p><div className="mt-auto pt-4 border-t border-slate-100"><button type="button" onClick={() => setActiveTPQDetail(program)} className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[13px] font-bold transition-colors shadow-sm">Lihat Detail Pendidikan TPQ</button></div></div>
            </article>
          ))}
        </div>
      )}

      {activeTPQDetail && <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setActiveTPQDetail(null)}><div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}><div className="flex justify-between gap-3"><div><span className="inline-flex px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">Pendidikan TPQ</span><h2 className="text-xl font-bold mt-2">{activeTPQDetail.namaProgram}</h2></div><button onClick={() => setActiveTPQDetail(null)} className="text-2xl leading-none" aria-label="Tutup">×</button></div><p className="text-sm text-slate-600 mt-3">{activeTPQDetail.deskripsiProgram}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm"><div className="rounded-xl bg-slate-50 p-3"><strong>Durasi</strong><p>{activeTPQDetail.durasiProgram || '-'}</p></div><div className="rounded-xl bg-slate-50 p-3"><strong>Tanggal mulai</strong><p>{formatEventDate(activeTPQDetail.tanggalMulai || '')}</p></div><div className="rounded-xl bg-slate-50 p-3"><strong>Tanggal berakhir</strong><p>{formatEventDate(activeTPQDetail.tanggalSelesai || '')}</p></div><div className="rounded-xl bg-slate-50 p-3"><strong>Lokasi</strong><p>{activeTPQDetail.lokasiDanAlamat}, {activeTPQDetail.kota}, {activeTPQDetail.provinsi}</p></div></div>{activeTPQDetail.fotoDokumentasi?.length ? <div className="flex flex-wrap gap-2 mt-4">{activeTPQDetail.fotoDokumentasi.map((photo,i)=><img key={i} src={photo} alt={`Dokumentasi TPQ ${i+1}`} className="w-24 h-20 object-cover rounded-lg" />)}</div>:null}{activeTPQDetail.linkGrupWa && <a href={activeTPQDetail.linkGrupWa} target="_blank" rel="noreferrer" className="inline-flex mt-5 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold">Gabung Grup WhatsApp</a>}</div></div>}

      {/* MODAL (Unchanged logic, just styled to match) */}
      {activeModalEvent && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-xl sm:rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-xl p-4 sm:p-6 md:p-8 border border-outline-variant/30 my-3 sm:my-6 transition-all animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3.5 sm:pb-5 border-b border-outline-variant/30 mb-4 sm:mb-6">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-primary bg-primary-container px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md uppercase tracking-wider">
                  {activeModalEvent.jenisEvent}
                </span>
                <h2 className="text-lg sm:text-[20px] font-semibold text-on-surface leading-snug mt-2 sm:mt-3">
                  {activeModalEvent.namaKegiatan}
                </h2>
                <p className="text-xs sm:text-[13px] text-on-surface-variant mt-1">Penyelenggara: {activeModalEvent.mitraOrg}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 sm:p-1.5 text-outline hover:text-on-surface rounded-full hover:bg-surface-container cursor-pointer transition-colors shrink-0"
                aria-label="Tutup"
              >
                <Icon name="close" className="text-[20px] sm:text-[24px]" />
              </button>
            </div>

            {/* STEP 1: Detail Kegiatan */}
            {modalStep === 'detail' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Deskripsi Pelatihan
                  </h4>
                  <p className="text-[14px] text-on-surface leading-relaxed">
                    {activeModalEvent.deskripsiPelatihan}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                  <div>
                    <span className="text-[12px] text-outline font-medium">Jadwal:</span>
                    <p className="font-semibold text-on-surface text-[13px] mt-0.5">{activeModalEvent.tanggalKegiatan}</p>
                  </div>
                  <div>
                    <span className="text-[12px] text-outline font-medium">Lokasi:</span>
                    <p className="font-semibold text-on-surface text-[13px] mt-0.5">{activeModalEvent.lokasiDanAlamat}, {activeModalEvent.kota}</p>
                  </div>
                  <div>
                    <span className="text-[12px] text-outline font-medium">Kuota Peserta:</span>
                    <p className="font-semibold text-on-surface text-[13px] mt-0.5">
                      {activeModalEvent.kuotaDisetujui || activeModalEvent.targetDanKuotaPeserta} Peserta ({activeModalEvent.jumlahPendaftar} terisi)
                    </p>
                  </div>
                  <div>
                    <span className="text-[12px] text-outline font-medium">Biaya:</span>
                    <p className="font-semibold text-primary text-[13px] mt-0.5">Gratis (Bersertifikat)</p>
                  </div>
                </div>

                {activeModalEvent.kebutuhanPeserta && activeModalEvent.kebutuhanPeserta.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5">
                      Fasilitas Aksesibilitas Disediakan:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeModalEvent.kebutuhanPeserta.map((keb, i) => (
                        <span key={i} className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-[12px] font-medium border border-outline-variant/20">
                          ✓ {keb}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Foto Dokumentasi Kegiatan Event */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="photo_library" className="text-[16px] text-primary" />
                      <span>Foto Dokumentasi Kegiatan</span>
                    </h4>
                    {activeModalEvent.fotoDokumentasi && activeModalEvent.fotoDokumentasi.length > 0 && (
                      <span className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                        {activeModalEvent.fotoDokumentasi.length} Foto
                      </span>
                    )}
                  </div>

                  {activeModalEvent.fotoDokumentasi && activeModalEvent.fotoDokumentasi.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {activeModalEvent.fotoDokumentasi.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPreviewImage(imgUrl)}
                          className="relative h-24 rounded-xl overflow-hidden border border-outline-variant/30 cursor-pointer group shadow-sm bg-surface-container-low"
                          title="Klik untuk memperbesar foto"
                        >
                          <img
                            src={imgUrl}
                            alt={`Dokumentasi kegiatan ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="zoom_in" className="text-white text-[22px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 text-center">
                      <Icon name="add_photo_alternate" className="text-[24px] text-outline mb-1" />
                      <p className="text-[12px] text-on-surface-variant">Dokumentasi foto kegiatan akan diunggah oleh mitra penyelenggara.</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-2 border-t border-outline-variant/30 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 text-[13px] font-semibold text-on-surface hover:bg-surface-container rounded-xl cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStep('form')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[13px] font-semibold shadow-sm cursor-pointer transition-colors"
                  >
                    <span>Lanjut ke Formulir</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Formulir Pendaftaran */}
            {modalStep === 'form' && (
              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-on-surface mb-1.5">
                    Nama Lengkap Peserta *
                  </label>
                  <input
                    type="text"
                    required
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Contoh: Ahmad Fadli"
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-[14px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-on-surface mb-1.5">
                      Nomor WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={noWa}
                      onChange={(e) => setNoWa(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-on-surface mb-1.5">
                      Usia (Tahun)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="99"
                      value={usia}
                      onChange={(e) => setUsia(e.target.value)}
                      placeholder="25"
                      className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-[14px]"
                    />
                  </div>
                </div>
                <div>
                <label className="block text-[13px] font-semibold text-on-surface mb-1.5">
                  Email * <span className="font-normal text-on-surface-variant">(link grup WhatsApp dikirim ke sini)</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="..."   // salin isi className dari input "Nama Lengkap" di atasnya
                />
              </div>
                <div>
                  <label className="block text-[13px] font-semibold text-on-surface mb-1.5">
                    Kategori Kebutuhan Khusus *
                  </label>
                  <select
                    value={kategoriDisabilitas}
                    onChange={(e) => setKategoriDisabilitas(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-[14px]"
                  >
                    {disabilities && disabilities.length > 0 ? (
                      disabilities.filter(d => d.isAktif).map(d => (
                        <option key={d.id} value={d.kode}>
                          {d.nama} ({d.kategoriUtama})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="tunanetra">Tunanetra (Braille / Audio)</option>
                        <option value="tunarungu">Tunarungu / Tuli (Bahasa Isyarat BISINDO)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-on-surface mb-1.5">
                    Catatan Khusus (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={catatanKhusus}
                    onChange={(e) => setCatatanKhusus(e.target.value)}
                    placeholder="Contoh: Butuh penjemputan dari stasiun atau pendampingan khusus..."
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-[14px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setModalStep('detail')}
                    className="px-5 py-2.5 text-[13px] font-semibold text-on-surface hover:bg-surface-container rounded-xl cursor-pointer transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[13px] font-semibold disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                  >
                    <Icon name="send" className="text-[18px]" />
                    {isSubmitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Ingin Mengikuti Event Lainnya? */}
            {modalStep === 'question_next_event' && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="check_circle" className="text-[32px]" />
                </div>
                <h3 className="text-[20px] font-semibold text-on-surface mb-2">
                  Pendaftaran Berhasil Dikirim
                </h3>
                <p className="text-[14px] text-on-surface-variant max-w-sm mx-auto mb-8">
                  Data Anda untuk kegiatan <strong className="text-on-surface font-semibold">"{activeModalEvent.namaKegiatan}"</strong> telah tercatat.
                </p>

                <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 max-w-md mx-auto">
                  <p className="font-semibold text-on-surface text-[15px] mb-2">
                    Apakah Anda ingin mengikuti kegiatan pelatihan lainnya?
                  </p>
                  <p className="text-[13px] text-on-surface-variant mb-6">
                    Pilih "Ya" untuk melihat dan memilih jadwal lainnya, atau "Tidak" jika sudah selesai.
                  </p>

                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button
                      onClick={handleChooseAnotherEvent}
                      className="py-2.5 px-5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon name="replay" className="text-[18px]" />
                      <span>Ya, Pilih Lainnya</span>
                    </button>
                    <button
                      onClick={handleFinishedRegistration}
                      className="py-2.5 px-5 bg-surface-container-lowest border border-outline hover:bg-surface-container text-on-surface rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon name="done" className="text-[18px]" />
                      <span>Tidak, Selesai</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Status Selesai */}
            {modalStep === 'finished_status' && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="task_alt" className="text-[32px]" />
                </div>
                <h3 className="text-[20px] font-semibold text-on-surface mb-2">
                  Pendaftaran Telah Selesai
                </h3>
                <p className="text-[14px] text-on-surface-variant max-w-sm mx-auto mb-8">
                  Panitia akan memverifikasi dan menghubungi Anda via WhatsApp di nomor <strong className="text-on-surface font-semibold">{lastRegisteredParticipant?.noWa || noWa}</strong>.
                </p>
                {waLink ? (
              <>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[14px] font-semibold mb-3 transition-colors"
                >
                  <Icon name="groups" className="text-[18px]" />
                  <span>Gabung Grup WhatsApp Event</span>
                </a>
                <p className="text-[12px] text-on-surface-variant max-w-sm mx-auto mb-8">
                  Link juga dikirim ke email Anda (cek folder Spam/Promosi).
                </p>
              </>
            ) : (
              <p className="text-[13px] text-on-surface-variant max-w-sm mx-auto mb-8">
                Link grup WhatsApp akan dikirim ke email Anda setelah panitia menyiapkannya.
              </p>
            )}

                {lastRegisteredParticipant && (
                  <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 text-left max-w-md mx-auto mb-8 text-[13px] space-y-3">
                    <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                      <span className="text-outline font-medium">Nomor Registrasi:</span>
                      <span className="font-mono font-bold text-on-surface">{lastRegisteredParticipant.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-outline font-medium">Nama:</span>
                      <span className="font-semibold text-on-surface">{lastRegisteredParticipant.namaLengkap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-outline font-medium">Kegiatan:</span>
                      <span className="font-semibold text-on-surface truncate max-w-[200px]" title={activeModalEvent.namaKegiatan}>{activeModalEvent.namaKegiatan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-outline font-medium">Jadwal:</span>
                      <span className="font-semibold text-on-surface">{activeModalEvent.tanggalKegiatan}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCloseModal}
                  className="py-3 px-8 bg-on-surface hover:bg-on-surface/90 text-surface rounded-xl text-[14px] font-semibold transition-colors cursor-pointer"
                >
                  Tutup & Kembali ke Beranda
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedPreviewImage && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-white/80 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5 text-[13px]"
            >
              <Icon name="close" className="text-[20px]" />
              <span>Tutup Preview</span>
            </button>
            <img
              src={selectedPreviewImage}
              alt="Preview Dokumentasi Kegiatan"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
            <p className="text-white/80 text-[12px] mt-3 font-medium text-center">
              Dokumentasi Resmi Kegiatan Al-Quran Ramah Disabilitas
            </p>
          </div>
        </div>
      )}
    </>
  );
};
