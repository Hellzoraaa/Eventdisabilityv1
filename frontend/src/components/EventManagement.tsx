import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { SubmissionDetailModal, SubmissionSummary, DetailButton, eventToItem, type SubmissionItem } from './SubmissionShared.tsx';
import { TrainingProposal, User } from '../types.ts';
import { IndonesiaLocationFields } from './IndonesiaLocationFields.tsx';

interface EventCategoryOption {
  id: string;
  nama: string;
  kode?: string;
  deskripsi?: string;
  icon?: string;
  warnaHex?: string;
  isAktif?: boolean;
  urutan?: number;
}

interface DisabilityOption {
  id: string;
  nama: string;
  kode?: string;
  kategoriUtama?: string;
  deskripsi?: string;
  isAktif?: boolean;
}

type EventWithRelations = TrainingProposal & {
  eventCategoryId?: string | null;
  disabilityId?: string | null;
};

type RequirementRow = { text: string; jenis: string; wajib: boolean };

function parseRequirementRows(value: string | undefined): RequirementRow[] {
  if (!value?.trim()) return [{ text: '', jenis: 'Kriteria peserta', wajib: true }];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => item && typeof item.text === 'string')) {
      return parsed.map((item) => ({
        text: item.text,
        jenis: typeof item.jenis === 'string' ? item.jenis : 'Kriteria peserta',
        wajib: item.wajib !== false,
      }));
    }
  } catch { /* Data lama disimpan sebagai teks per baris. */ }
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((text) => ({
    text: text.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, ''),
    jenis: 'Kriteria peserta',
    wajib: true,
  }));
}

interface EventManagementProps {
  currentUser: User;
  events: TrainingProposal[];
  onEventUpdated: (updatedEvent: TrainingProposal) => void;
  onEventDeleted: (deletedEventId: string) => void;
  onOpenCreateModal?: () => void;
}

// Tanggal berakhir kegiatan dihitung otomatis dari tanggal mulai + durasi program
// (aturan sama dengan form pengajuan event di Dashboard Mitra).
const DURASI_SATUAN = ['Jam', 'Hari', 'Minggu', 'Bulan'];
const hitungTanggalBerakhir = (tanggalMulai: string, jumlah: string, satuan: string) => {
  if (!tanggalMulai || !Number.isInteger(Number(jumlah)) || Number(jumlah) < 1) return '';
  const date = new Date(`${tanggalMulai}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const n = Number(jumlah);
  if (satuan === 'Minggu') date.setDate(date.getDate() + n * 7 - 1);
  else if (satuan === 'Bulan') { date.setMonth(date.getMonth() + n); date.setDate(date.getDate() - 1); }
  else if (satuan === 'Hari') date.setDate(date.getDate() + n - 1);
  // Durasi dalam jam masih berlangsung pada tanggal yang sama.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const bacaDurasi = (ev: { durasiProgram?: string; tanggalKegiatan?: string; tanggalBerakhirKegiatan?: string }) => {
  const match = String(ev.durasiProgram || '').trim().match(/^(\d+)\s+(Jam|Hari|Minggu|Bulan)$/i);
  if (match) return { jumlah: match[1], satuan: match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase() };
  // Event lama tanpa durasi: perkirakan dari selisih tanggal mulai dan berakhir (dalam hari).
  const start = String(ev.tanggalKegiatan || '').slice(0, 10);
  const end = String(ev.tanggalBerakhirKegiatan || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start) {
    const days = Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000) + 1;
    return { jumlah: String(days), satuan: 'Hari' };
  }
  return { jumlah: '1', satuan: 'Hari' };
};

export const EventManagement: React.FC<EventManagementProps> = ({
  currentUser,
  events,
  onEventUpdated,
  onEventDeleted,
  onOpenCreateModal,
}) => {
  const isSuperadmin = currentUser.role === 'superadmin';

  // Filter events: Superadmin sees all events, Mitra sees their own events
  const userEvents = isSuperadmin 
    ? events 
    : events.filter(e => e.mitraId === currentUser.id || e.mitraOrg === currentUser.organizationName);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'disetujui' | 'menunggu_persetujuan' | 'ditolak'>('all');

  // Master data untuk Kategori Event dan Jenis Disabilitas.
  const [eventCategories, setEventCategories] = useState<EventCategoryOption[]>([]);
  const [disabilityCategories, setDisabilityCategories] = useState<DisabilityOption[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);
  const [masterDataError, setMasterDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMasterData = async () => {
      setIsLoadingMasterData(true);
      setMasterDataError(null);

      try {
        const [categoryRes, disabilityRes] = await Promise.all([
          fetch('/api/event-categories'),
          fetch('/api/disabilities'),
        ]);

        const categoryJson = await categoryRes.json().catch(() => ({}));
        const disabilityJson = await disabilityRes.json().catch(() => ({}));

        if (!categoryRes.ok) {
          throw new Error(categoryJson?.error || 'Gagal memuat kategori event.');
        }

        if (!disabilityRes.ok) {
          throw new Error(disabilityJson?.error || 'Gagal memuat jenis disabilitas.');
        }

        const categories = Array.isArray(categoryJson?.categories)
          ? categoryJson.categories
          : Array.isArray(categoryJson?.data)
            ? categoryJson.data
            : Array.isArray(categoryJson)
              ? categoryJson
              : [];

        const disabilities = Array.isArray(disabilityJson?.disabilities)
          ? disabilityJson.disabilities
          : Array.isArray(disabilityJson?.data)
            ? disabilityJson.data
            : Array.isArray(disabilityJson)
              ? disabilityJson
              : [];

        if (!cancelled) {
          setEventCategories(
            categories
              .filter((item: EventCategoryOption) => item?.isAktif !== false)
              .sort(
                (a: EventCategoryOption, b: EventCategoryOption) =>
                  Number(a.urutan ?? 0) - Number(b.urutan ?? 0)
              )
          );
          setDisabilityCategories(
            disabilities.filter(
              (item: DisabilityOption) => item?.isAktif !== false
            )
          );
        }
      } catch (error) {
        console.error('[EventManagement] Gagal memuat master data:', error);
        if (!cancelled) {
          setMasterDataError(
            error instanceof Error
              ? error.message
              : 'Gagal memuat master data.'
          );
        }
      } finally {
        if (!cancelled) setIsLoadingMasterData(false);
      }
    };

    void loadMasterData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Edit modal state
  const [editingEvent, setEditingEvent] = useState<TrainingProposal | null>(null);
  const [durasiJumlah, setDurasiJumlah] = useState('1');
  const [durasiSatuan, setDurasiSatuan] = useState('Hari');
  const [editForm, setEditForm] = useState({
    namaKegiatan: '',
    jenisEvent: '',
    eventCategoryId: '',
    disabilityId: '',
    deskripsiPelatihan: '',
    lokasiDanAlamat: '',
    provinsi: '',
    kota: '',
    latitude: 0,
    longitude: 0,
    tanggalKegiatan: '',
    waktuMulai: '',
    waktuSelesai: '',
    benefit: '',
    linkGrupWa: '',
    persyaratan: '',
    batasPendaftaran: '',
    targetDanKuotaPeserta: 50,
    status: 'menunggu_persetujuan' as 'menunggu_persetujuan' | 'disetujui' | 'ditolak',
    isAktif: true,
    fotoDokumentasi: [] as string[],
  });

  const [newPhotoInput, setNewPhotoInput] = useState('');
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [coordinateInput, setCoordinateInput] = useState('');
  const [requirementRows, setRequirementRows] = useState<RequirementRow[]>([{ text: '', jenis: 'Kriteria peserta', wajib: true }]);
  // Link grup WA diambil terpisah dari server (sengaja tidak ada di tipe TrainingProposal agar tidak bocor ke publik).
  // Link baru boleh disimpan hanya setelah link lama berhasil dimuat, supaya tidak menimpa dengan kosong.
  const [waLinkStatus, setWaLinkStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Detail pengajuan (format sama dengan Persetujuan Pengajuan)

  const [detailItem, setDetailItem] = useState<SubmissionItem | null>(null);


  // Delete modal state
  const [deletingEvent, setDeletingEvent] = useState<TrainingProposal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter logic
  const filteredEvents = userEvents.filter(ev => {
    const matchesSearch = 
      ev.namaKegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.mitraOrg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.kota.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.jenisEvent.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenEdit = (ev: TrainingProposal) => {
    const durasi = bacaDurasi(ev as any);
    setDurasiJumlah(durasi.jumlah);
    setDurasiSatuan(durasi.satuan);
    setEditingEvent(ev);
    setNewPhotoInput('');
    setPhotoUploadError('');
    setCoordinateInput(`${ev.latitude ?? ''}, ${ev.longitude ?? ''}`);
    setRequirementRows(parseRequirementRows(ev.persyaratan));
    setWaLinkStatus('loading');
    setEditForm({
      namaKegiatan: ev.namaKegiatan,
      jenisEvent: ev.jenisEvent,
      eventCategoryId: (ev as EventWithRelations).eventCategoryId || '',
      disabilityId: (ev as EventWithRelations).disabilityId || '',
      deskripsiPelatihan: ev.deskripsiPelatihan,
      lokasiDanAlamat: ev.lokasiDanAlamat,
      provinsi: ev.provinsi,
      kota: ev.kota,
      latitude: ev.latitude,
      longitude: ev.longitude,
      tanggalKegiatan: /^\d{4}-\d{2}-\d{2}$/.test(ev.tanggalKegiatan) ? ev.tanggalKegiatan : '',
      waktuMulai: ev.waktuMulai || '',
      waktuSelesai: ev.waktuSelesai || '',
      benefit: ev.benefit || '',
      persyaratan: ev.persyaratan || '',
      batasPendaftaran: ev.batasPendaftaran ? String(ev.batasPendaftaran).slice(0, 10) : '',
      targetDanKuotaPeserta: ev.targetDanKuotaPeserta,
      status: ev.status,
      isAktif: ev.isAktif,
      fotoDokumentasi: ev.fotoDokumentasi || [],
      linkGrupWa: '',
    });

    fetch(`/api/events/${ev.id}/wa-link`)
      .then((r) => {
        if (!r.ok) throw new Error('Gagal memuat link WA');
        return r.json();
      })
      .then((d) => {
        setEditForm((f) => ({ ...f, linkGrupWa: d.waLink || '' }));
        setWaLinkStatus('ready');
      })
      .catch(() => setWaLinkStatus('error'));
  };

  const handleDocumentationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoUploadError('Pilih gambar JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoUploadError('Ukuran foto maksimal 8 MB.');
      return;
    }

    setPhotoUploadError('');
    setIsProcessingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1600 / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          setPhotoUploadError('Foto gagal diproses. Silakan pilih foto lain.');
          setIsProcessingPhoto(false);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.82);
        setEditForm((current) => ({
          ...current,
          fotoDokumentasi: [...current.fotoDokumentasi, compressedPhoto],
        }));
        setIsProcessingPhoto(false);
      };
      image.onerror = () => {
        setPhotoUploadError('Foto tidak dapat dibaca. Coba file gambar lain.');
        setIsProcessingPhoto(false);
      };
      image.src = String(reader.result || '');
    };
    reader.onerror = () => {
      setPhotoUploadError('Gagal membaca file foto.');
      setIsProcessingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const durasiValid = Number.isInteger(Number(durasiJumlah)) && Number(durasiJumlah) >= 1;
  const tanggalBerakhirOtomatis = hitungTanggalBerakhir(editForm.tanggalKegiatan, durasiJumlah, durasiSatuan);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (!editForm.tanggalKegiatan || !editForm.waktuMulai || !editForm.waktuSelesai) {
      alert('Tanggal mulai, waktu mulai, dan waktu selesai wajib diisi.');
      return;
    }
    if (!durasiValid) {
      alert('Durasi program wajib diisi dengan angka bulat minimal 1.');
      return;
    }
    if (editForm.waktuSelesai <= editForm.waktuMulai) {
      alert('Waktu selesai harus lebih besar dari waktu mulai.');
      return;
    }
    if (!requirementRows.some((row) => row.text.trim())) {
      alert('Tambahkan minimal satu persyaratan peserta.');
      return;
    }

    setIsSubmitting(true);
    try {
      // linkGrupWa disimpan lewat endpoint tersendiri, jadi tidak ikut dikirim di sini
      const { linkGrupWa, ...eventPayload } = editForm;
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventPayload,
          durasiProgram: `${durasiJumlah} ${durasiSatuan}`,
          tanggalBerakhirKegiatan: tanggalBerakhirOtomatis || editForm.tanggalKegiatan,
          persyaratan: JSON.stringify(requirementRows.filter((row) => row.text.trim()).map((row) => ({ ...row, text: row.text.trim() }))),
        }),
      });

      const data = await res.json();
      if (res.ok && data.proposal) {
        let waNote = '';
        if (waLinkStatus === 'ready') {
          try {
            const waRes = await fetch(`/api/events/${editingEvent.id}/wa-link`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ waLink: linkGrupWa.trim() }),
            });
            const waData = await waRes.json().catch(() => ({}));
            if (!waRes.ok) {
              alert(waData.error || 'Event tersimpan, tetapi link grup WhatsApp tidak valid.');
            } else if (Number(waData.antrean) > 0) {
              waNote = ` ${waData.antrean} peserta akan dikirimi link grup WhatsApp lewat email.`;
            }
          } catch (waErr) {
            console.error(waErr);
            alert('Event tersimpan, tetapi link grup WhatsApp gagal disimpan.');
          }
        }
        onEventUpdated(data.proposal);
        setEditingEvent(null);
        setFeedbackMsg({ type: 'success', text: `Event "${data.proposal.namaKegiatan}" berhasil diperbarui!${waNote}` });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert(data.error || 'Gagal memperbarui event');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan saat memperbarui event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${deletingEvent.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        onEventDeleted(deletingEvent.id);
        setFeedbackMsg({ type: 'success', text: `Event "${deletingEvent.namaKegiatan}" berhasil dihapus!` });
        setDeletingEvent(null);
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert(data.error || 'Gagal menghapus event');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghapus event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-semibold text-on-surface tracking-tight">
              Kelola Event & Pelatihan
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
              {isSuperadmin ? 'Admin Control' : 'Mitra Penyelenggara'}
            </span>
          </div>
          <p className="text-[13px] text-on-surface-variant mt-1 font-medium">
            {isSuperadmin 
              ? 'Pantau, edit spesifikasi kuota, publish ke peta publik, atau hapus kegiatan pelatihan Al-Quran se-Indonesia.'
              : 'Kelola jadwal, perbarui deskripsi fasilitas kegiatan, dan pantau status persetujuan dari Superadmin.'}
          </p>
        </div>

        {onOpenCreateModal && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-[13px] font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Icon name="add" className="text-[18px]" />
            <span>Tambah Event Baru</span>
          </button>
        )}
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-[13px] font-medium ${
          feedbackMsg.type === 'success' 
            ? 'bg-secondary/10 border-secondary/30 text-secondary' 
            : 'bg-error/10 border-error/30 text-error'
        }`}>
          <div className="flex items-center gap-2">
            <Icon name={feedbackMsg.type === 'success' ? 'check_circle' : 'error'} className="text-[18px]" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="cursor-pointer text-outline hover:text-on-surface">
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}

      {masterDataError && (
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-[12px] font-medium">
          <div className="flex items-start gap-2">
            <Icon name="warning" className="text-[17px]" />
            <div>
              <div className="font-semibold">Master data belum dapat dimuat.</div>
              <div>{masterDataError}</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">Total Event</span>
          <span className="text-[24px] font-semibold text-on-surface">{userEvents.length}</span>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">Disetujui & Aktif</span>
          <span className="text-[24px] font-semibold text-primary">
            {userEvents.filter(e => e.status === 'disetujui').length}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">Menunggu Review</span>
          <span className="text-[24px] font-semibold text-secondary">
            {userEvents.filter(e => e.status === 'menunggu_persetujuan').length}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">Perlu Revisi / Ditolak</span>
          <span className="text-[24px] font-semibold text-error">
            {userEvents.filter(e => e.status === 'ditolak').length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari event, mitra, atau kota..."
            className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Semua ({userEvents.length})
          </button>
          <button
            onClick={() => setStatusFilter('disetujui')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'disetujui'
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Disetujui ({userEvents.filter(e => e.status === 'disetujui').length})
          </button>
          <button
            onClick={() => setStatusFilter('menunggu_persetujuan')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'menunggu_persetujuan'
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Menunggu ({userEvents.filter(e => e.status === 'menunggu_persetujuan').length})
          </button>
          <button
            onClick={() => setStatusFilter('ditolak')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'ditolak'
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Ditolak ({userEvents.filter(e => e.status === 'ditolak').length})
          </button>
        </div>
      </div>

      {/* Event Cards & Management Table */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-on-surface-variant">
            <Icon name="event_busy" className="text-[40px] text-outline mb-2" />
            <p className="text-[14px] font-medium">Tidak ada kegiatan pelatihan yang sesuai filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((ev) => (
              <article key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <SubmissionSummary item={eventToItem(ev)} />
                  <div className="mt-3 text-sm font-semibold text-slate-700">{ev.jumlahPendaftar || 0} / {ev.kuotaDisetujui || ev.targetDanKuotaPeserta} Kuota{ev.isAktif && ev.status === 'disetujui' ? ' · Tayang di Peta' : ''}</div>
                  {ev.alasanPenolakan && (
                    <div className="p-2.5 bg-error/5 border border-error/20 rounded-lg text-[12px] text-error flex items-start gap-1.5 mt-2">
                      <Icon name="info" className="text-[16px] mt-0.5" />
                      <div>
                        <span className="font-bold">Catatan Penolakan: </span>
                        {ev.alasanPenolakan}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <DetailButton kind="event" onClick={() => setDetailItem(eventToItem(ev))} />
                  <button
                    onClick={() => handleOpenEdit(ev)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px] font-semibold transition-colors cursor-pointer border border-outline-variant/30"
                    title="Edit spesifikasi event"
                  >
                    <Icon name="edit" className="text-[16px] text-primary" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setDeletingEvent(ev)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-error/10 hover:bg-error/20 text-error text-[12px] font-semibold transition-colors cursor-pointer border border-error/20"
                    title="Hapus kegiatan pelatihan"
                  >
                    <Icon name="delete" className="text-[16px]" />
                    <span>Hapus</span>
                  </button>
                </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {detailItem && <SubmissionDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-0 sm:p-5 overflow-y-auto">
          <div className="bg-white text-slate-800 rounded-none sm:rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full min-h-screen sm:min-h-0 max-h-none sm:max-h-[calc(100vh-40px)] overflow-y-auto my-0 sm:my-0 animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 bg-white/95 backdrop-blur border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon name="edit_calendar" className="text-[22px]" />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-slate-900">Edit Event</h3>
                  <p className="text-[12px] text-slate-500">Perbarui informasi event, persyaratan, benefit, dan publikasi.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 px-4 py-5 sm:px-7 sm:py-6">
              <section className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-800"><Icon name="event_note" className="text-[24px] text-emerald-700" />Informasi Event</h4>
              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">
                  Nama Kegiatan Pelatihan *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.namaKegiatan}
                  onChange={(e) => setEditForm({ ...editForm, namaKegiatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">
                    Kategori
                  </label>
                  <select
                    required
                    value={editForm.eventCategoryId}
                    disabled={isLoadingMasterData}
                    onChange={(e) => {
                      const eventCategoryId = e.target.value;
                      const category = eventCategories.find(
                        (item) => item.id === eventCategoryId
                      );

                      setEditForm({
                        ...editForm,
                        eventCategoryId,
                        jenisEvent: category?.nama || editForm.jenisEvent,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingMasterData
                        ? 'Memuat kategori...'
                        : 'Pilih kategori event'}
                    </option>
                    {eventCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">
                    Jenis Disabilitas *
                  </label>
                  <select
                    required
                    value={editForm.disabilityId}
                    disabled={isLoadingMasterData}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        disabilityId: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingMasterData
                        ? 'Memuat jenis disabilitas...'
                        : 'Pilih jenis disabilitas'}
                    </option>
                    {disabilityCategories.map((disability) => (
                      <option key={disability.id} value={disability.id}>
                        {disability.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-800"><Icon name="calendar_month" className="text-[24px] text-emerald-700" />Tanggal & Waktu</h4>
                <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <label className="block text-[12px] font-semibold text-on-surface mb-2">
                    Durasi Program *
                  </label>
                  <div className="flex gap-2 mb-4 sm:max-w-sm">
                    <input
                      type="number"
                      required
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={durasiJumlah}
                      onChange={(e) => setDurasiJumlah(e.target.value)}
                      placeholder="Contoh: 3"
                      className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="Jumlah durasi program"
                    />
                    <select
                      value={durasiSatuan}
                      onChange={(e) => setDurasiSatuan(e.target.value)}
                      className="w-32 shrink-0 px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      aria-label="Satuan durasi program"
                    >
                      {DURASI_SATUAN.map((satuan) => <option key={satuan} value={satuan}>{satuan}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <span className="block text-[11px] font-semibold text-on-surface-variant mb-1">Tanggal Mulai Kegiatan *</span>
                    <div className="relative">
                      <Icon name="calendar_month" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[18px] pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={editForm.tanggalKegiatan}
                        onChange={(e) => setEditForm({ ...editForm, tanggalKegiatan: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        aria-label="Tanggal mulai kegiatan"
                      />
                    </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-on-surface-variant mb-1">Tanggal Berakhir Kegiatan (otomatis)</span>
                    <div className="relative">
                      <Icon name="event_available" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[18px] pointer-events-none" />
                      <input
                        type="date"
                        readOnly
                        tabIndex={-1}
                        value={tanggalBerakhirOtomatis}
                        className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface-variant cursor-not-allowed"
                        aria-label="Tanggal berakhir kegiatan (otomatis sesuai durasi)"
                        title="Tanggal berakhir kegiatan (otomatis sesuai durasi)"
                      />
                    </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-on-surface-variant mb-1">Jam Mulai *</span>
                    <div className="relative">
                      <Icon name="schedule" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[18px] pointer-events-none" />
                      <input
                        type="time"
                        required
                        value={editForm.waktuMulai}
                        onChange={(e) => setEditForm({ ...editForm, waktuMulai: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        aria-label="Waktu mulai"
                      />
                    </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-on-surface-variant mb-1">Jam Selesai *</span>
                    <div className="relative">
                      <Icon name="schedule" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[18px] pointer-events-none" />
                      <input
                        type="time"
                        required
                        value={editForm.waktuSelesai}
                        min={editForm.waktuMulai || undefined}
                        onChange={(e) => setEditForm({ ...editForm, waktuSelesai: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        aria-label="Waktu selesai"
                      />
                    </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">Tanggal berakhir dihitung otomatis dari tanggal mulai dan durasi program{tanggalBerakhirOtomatis ? ` (sampai ${tanggalBerakhirOtomatis})` : ''}. Durasi dalam jam berlangsung pada hari yang sama.</p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-800"><Icon name="location_on" className="text-[24px] text-emerald-700" />Lokasi Kegiatan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IndonesiaLocationFields
                  province={editForm.provinsi}
                  city={editForm.kota}
                  onProvinceChange={(provinsi) => setEditForm((previous) => ({ ...previous, provinsi, kota: '' }))}
                  onCityChange={(kota) => setEditForm((previous) => ({ ...previous, kota }))}
                  variant="admin"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">
                  Lokasi & Alamat Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.lokasiDanAlamat}
                  onChange={(e) => setEditForm({ ...editForm, lokasiDanAlamat: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">Koordinat Lokasi (Latitude, Longitude)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={coordinateInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCoordinateInput(value);
                    const parts = value.split(',').map((part) => part.trim());
                    if (parts.length === 2 && parts[0] !== '' && parts[1] !== '') {
                      const latitude = Number(parts[0]);
                      const longitude = Number(parts[1]);
                      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                        setEditForm((prev) => ({ ...prev, latitude, longitude }));
                      }
                    }
                  }}
                  placeholder="-6.200000, 106.816666"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Masukkan latitude dan longitude dalam satu kolom, dipisahkan dengan koma. Contoh: -6.200000, 106.816666.</p>
              </div>

              </section>

              <section className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-800"><Icon name="settings" className="text-[24px] text-emerald-700" />Publikasi & Pendaftaran</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">
                    Kuota Peserta *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.targetDanKuotaPeserta}
                    onChange={(e) => setEditForm({ ...editForm, targetDanKuotaPeserta: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {isSuperadmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <div>
                    <label className="block text-[12px] font-semibold text-on-surface mb-1">
                      Status Persetujuan (Superadmin)
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                    >
                      <option value="disetujui">Disetujui (Tayang di Web & Peta)</option>
                      <option value="menunggu_persetujuan">Menunggu Persetujuan</option>
                      <option value="ditolak">Ditolak / Perlu Revisi</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-on-surface select-none">
                      <input
                        type="checkbox"
                        checked={editForm.isAktif}
                        onChange={(e) => setEditForm({ ...editForm, isAktif: e.target.checked })}
                        className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>Publikasikan & Tampilkan di Peta</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">Deskripsi</label>
                <textarea
                  rows={4}
                  value={editForm.deskripsiPelatihan}
                  onChange={(e) => setEditForm({ ...editForm, deskripsiPelatihan: e.target.value })}
                  placeholder="Deskripsi kegiatan"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-800"><Icon name="checklist" className="text-[24px] text-emerald-700" />Persyaratan Peserta</h4>
                  <button type="button" onClick={() => setRequirementRows((rows) => [...rows, { text: '', jenis: 'Kriteria peserta', wajib: true }])} className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100">
                    <Icon name="add" className="text-[16px]" />Tambah Persyaratan
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">Masukkan satu persyaratan per baris. Tambah atau hapus baris sesuai kebutuhan.</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-147.5 border-collapse text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600"><tr><th className="w-12 px-3 py-2.5">No.</th><th className="px-3 py-2.5">Persyaratan</th><th className="w-36 px-3 py-2.5">Jenis</th><th className="w-24 px-3 py-2.5">Wajib?</th><th className="w-20 px-3 py-2.5">Aksi</th></tr></thead>
                    <tbody>
                      {requirementRows.map((row, index) => <tr key={index} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                        <td className="px-2 py-2"><input value={row.text} onChange={(e) => setRequirementRows((rows) => rows.map((item, i) => i === index ? { ...item, text: e.target.value } : item))} placeholder="Masukkan persyaratan" className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-[11px] focus:border-emerald-500 focus:outline-none" /></td>
                        <td className="px-2 py-2"><select value={row.jenis} onChange={(e) => setRequirementRows((rows) => rows.map((item, i) => i === index ? { ...item, jenis: e.target.value } : item))} className="w-full rounded-md border border-slate-200 px-2 py-2 text-[11px]"><option>Kriteria peserta</option><option>Dokumen</option><option>Administrasi</option><option>Lainnya</option></select></td>
                        <td className="px-2 py-2"><select value={row.wajib ? 'ya' : 'tidak'} onChange={(e) => setRequirementRows((rows) => rows.map((item, i) => i === index ? { ...item, wajib: e.target.value === 'ya' } : item))} className="w-full rounded-md border border-slate-200 px-2 py-2 text-[11px]"><option value="ya">Ya</option><option value="tidak">Tidak</option></select></td>
                        <td className="px-2 py-2"><button type="button" onClick={() => setRequirementRows((rows) => rows.length <= 1 ? rows : rows.filter((_, i) => i !== index))} className="rounded-md bg-rose-50 px-2 py-1.5 font-semibold text-rose-700 hover:bg-rose-100">Hapus</button></td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-on-surface mb-1">Link Grup WhatsApp Event</label>
                <input
                  type="url"
                  pattern="https://chat\.whatsapp\.com/.+"
                  title="Gunakan link grup WhatsApp, contoh: https://chat.whatsapp.com/AbCdEf123"
                  value={editForm.linkGrupWa}
                  disabled={waLinkStatus !== 'ready'}
                  onChange={(e) => setEditForm({ ...editForm, linkGrupWa: e.target.value })}
                  placeholder={waLinkStatus === 'loading' ? 'Memuat link tersimpan...' : 'https://chat.whatsapp.com/...'}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
                {waLinkStatus === 'error' ? (
                  <p className="text-[11px] text-error mt-1">Link tersimpan gagal dimuat, jadi kolom ini dikunci agar tidak menimpa data lama. Tutup lalu buka kembali form edit.</p>
                ) : (
                  <p className="text-[11px] text-on-surface-variant mt-1">Link ini hanya diberikan ke peserta setelah mereka mendaftar, dan hanya jika event berstatus Disetujui &amp; aktif. Peserta yang sudah mendaftar sebelum link diisi akan otomatis dikirimi email.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">Batas Pendaftaran *</label>
                  <input type="date" required value={editForm.batasPendaftaran} max={editForm.tanggalKegiatan || undefined}
                    onChange={(e) => setEditForm({ ...editForm, batasPendaftaran: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1">Benefit</label>
                  <textarea rows={2} value={editForm.benefit} onChange={(e) => setEditForm({ ...editForm, benefit: e.target.value })}
                    placeholder="Benefit bagi peserta"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              </section>

              <section className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3">
              {/* FOTO DOKUMENTASI KEGIATAN */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="photo_camera" className="text-[16px] text-primary" />
                    <span>Foto Dokumentasi Kegiatan Event</span>
                  </label>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {editForm.fotoDokumentasi.length} Foto Tersimpan
                  </span>
                </div>

                {/* Existing Photos Gallery */}
                {editForm.fotoDokumentasi.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {editForm.fotoDokumentasi.map((photoUrl, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-outline-variant/40 bg-surface-container-lowest h-24">
                        <img
                          src={photoUrl}
                          alt={`Dokumentasi ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({
                              ...editForm,
                              fotoDokumentasi: editForm.fotoDokumentasi.filter((_, i) => i !== idx),
                            });
                          }}
                          className="absolute top-1.5 right-1.5 bg-error/90 hover:bg-error text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                          title="Hapus foto ini"
                        >
                          <Icon name="close" className="text-[14px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-on-surface-variant italic">
                    Belum ada foto dokumentasi untuk kegiatan ini. Tambahkan URL foto di bawah.
                  </p>
                )}

                {/* Upload foto langsung dari perangkat; komponen ini dipakai Superadmin dan Mitra. */}
                <div className="rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest p-3 space-y-2">
                  <label className="block text-[12px] font-semibold text-on-surface">Unggah dari perangkat</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleDocumentationUpload}
                    disabled={isProcessingPhoto}
                    className="block w-full text-[12px] text-on-surface file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-on-primary hover:file:opacity-90 disabled:opacity-60"
                  />
                  <p className="text-[11px] text-on-surface-variant">Format JPG, PNG, WebP · Maks. 8 MB per foto. Foto akan diperkecil otomatis sebelum disimpan.</p>
                  {isProcessingPhoto && <p className="text-[11px] text-primary">Memproses foto...</p>}
                  {photoUploadError && <p role="alert" className="text-[11px] text-error">{photoUploadError}</p>}
                </div>

                {/* Optional URL photo source remains supported. */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="url"
                    placeholder="Atau tempel URL foto kegiatan"
                    value={newPhotoInput}
                    onChange={(e) => setNewPhotoInput(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-[12px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPhotoInput.trim()) return;
                      try {
                        const parsed = new URL(newPhotoInput.trim());
                        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
                        setEditForm((current) => ({
                          ...current,
                          fotoDokumentasi: [...current.fotoDokumentasi, parsed.href],
                        }));
                        setNewPhotoInput('');
                        setPhotoUploadError('');
                      } catch {
                        setPhotoUploadError('Masukkan URL foto yang valid (http/https).');
                      }
                    }}
                    className="px-3 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-semibold hover:bg-primary/90 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Tambah URL
                  </button>
                </div>


              </div>

              </section>

              <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 pb-1 border-t border-slate-200 bg-white/95 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/50 text-[13px] font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-[13px] font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Icon name="save" className="text-[18px]" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
              <Icon name="delete_forever" className="text-[26px]" />
            </div>

            <h3 className="text-[18px] font-semibold text-on-surface mb-2">
              Hapus Kegiatan Pelatihan?
            </h3>

            <p className="text-[13px] text-on-surface-variant leading-relaxed mb-6 font-medium">
              Apakah Anda yakin ingin menghapus <strong className="text-on-surface font-semibold">"{deletingEvent.namaKegiatan}"</strong>? 
              Tindakan ini tidak dapat dibatalkan dan seluruh data pendaftar terkait event ini akan dihapus.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/50 text-[13px] font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-error hover:bg-error/90 text-on-error text-[13px] font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Icon name="delete" className="text-[18px]" />
                <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus Event'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};