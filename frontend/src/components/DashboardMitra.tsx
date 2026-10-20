import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { TPQRegistrations } from './TPQRegistrations.tsx';
import { 
  TrainingProposal, 
  Participant, 
  User 
} from '../types.ts';
import { PartnerLogo } from './PartnerLogo.tsx';
import { VerifiedBadge } from './VerifiedBadge.tsx';
import { IndonesiaLocationFields } from './IndonesiaLocationFields.tsx';

const parseEventCoordinate = (value: string) => {
  const rawParts = value.split(',').map(part => part.trim());
  if (rawParts.length !== 2 || rawParts.some(part => part === '')) return null;
  const parts = rawParts.map(Number);
  if (parts.some(part => !Number.isFinite(part))) return null;
  const [latitude, longitude] = parts;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

interface DashboardMitraProps {
  currentUser: User;
  proposals: TrainingProposal[];
  participants: Participant[];
  onProposalCreated: (newProposal: TrainingProposal) => void;
  onProposalUpdated: (updatedProposal: TrainingProposal) => void;
  onOpenChangePassword?: () => void;
  onUserUpdated?: (updatedUser: User) => void;
  showToast?: (message: string) => void;
}

export const DashboardMitra: React.FC<DashboardMitraProps> = ({
  currentUser,
  proposals,
  participants,
  onProposalCreated,
  onProposalUpdated,
  onOpenChangePassword,
  onUserUpdated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'daftar' | 'ajukan' | 'peserta' | 'peserta_tpq'>('daftar');
  type MasterOption = { id: string; nama: string; kode?: string; isAktif?: boolean; urutan?: number };
  const [kategoriEventOptions, setKategoriEventOptions] = useState<MasterOption[]>([]);
  const [disabilitasOptions, setDisabilitasOptions] = useState<MasterOption[]>([]);
  const [loadingMasterOptions, setLoadingMasterOptions] = useState(true);
  const [masterOptionsError, setMasterOptionsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMasterOptions(true);
      setMasterOptionsError('');
      try {
        const [categoryResponse, disabilityResponse] = await Promise.all([
          fetch('/api/event-categories'),
          fetch('/api/disabilities'),
        ]);
        const [categoryPayload, disabilityPayload] = await Promise.all([
          categoryResponse.json(), disabilityResponse.json(),
        ]);
        if (!categoryResponse.ok) throw new Error(categoryPayload?.error || 'Gagal memuat Kelola Kategori.');
        if (!disabilityResponse.ok) throw new Error(disabilityPayload?.error || 'Gagal memuat Kelola Disabilitas.');
        const categories = categoryPayload?.categories ?? categoryPayload?.data ?? categoryPayload;
        const disabilities = disabilityPayload?.disabilities ?? disabilityPayload?.data ?? disabilityPayload;
        if (!Array.isArray(categories) || !Array.isArray(disabilities)) throw new Error('Format data master tidak valid.');
        if (!cancelled) {
          setKategoriEventOptions(categories.filter((x: MasterOption) => x?.isAktif !== false).sort((a: MasterOption,b: MasterOption) => Number(a.urutan ?? 0)-Number(b.urutan ?? 0)));
          setDisabilitasOptions(disabilities.filter((x: MasterOption) => x?.isAktif !== false));
        }
      } catch (error) {
        if (!cancelled) setMasterOptionsError(error instanceof Error ? error.message : 'Gagal memuat data master.');
      } finally {
        if (!cancelled) setLoadingMasterOptions(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mitra's proposals only
  const myProposals = proposals.filter(p => p.mitraId === currentUser.id || p.mitraOrg === currentUser.organizationName);

  // Logo Upload Modal State
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(currentUser.organizationLogo || '');
  const [logoInputUrl, setLogoInputUrl] = useState<string>(currentUser.organizationLogo || '');
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoTab, setLogoTab] = useState<'upload' | 'url'>('upload');

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('File harus berupa berkas gambar (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Ukuran file maksimal 5 MB.');
      return;
    }

    setLogoError(null);
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setLogoInputUrl('');
      };
      reader.onerror = () => setLogoError('Gagal membaca berkas gambar.');
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 480;
        const MAX_HEIGHT = 240;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png', 0.92);
          setLogoPreview(compressed);
          setLogoInputUrl('');
        }
      };
      img.onerror = () => setLogoError('Gagal memproses gambar logo.');
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setLogoError('Gagal membaca berkas gambar.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveLogo = async () => {
    setIsSavingLogo(true);
    setLogoError(null);
    const logoValue = (logoPreview || '').trim();

    try {
      let res = await fetch(`/api/users/${currentUser.id}/logo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationLogo: logoValue,
        }),
      });

      if (!res.ok) {
        res = await fetch(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationLogo: logoValue,
            name: currentUser.name,
            email: currentUser.email,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan logo mitra.');
      }

      const updatedUser: User = data.user || {
        ...currentUser,
        organizationLogo: logoValue,
      };

      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }
      if (showToast) {
        showToast(logoValue ? 'Logo mitra berhasil diperbarui dan tampil di homepage!' : 'Logo mitra berhasil direset.');
      }
      setIsLogoModalOpen(false);
    } catch (err: any) {
      setLogoError(err.message || 'Terjadi kesalahan saat menyimpan logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setLogoInputUrl('');
  };

  // Form State for "Ajukan Permintaan Pelatihan" (or "Perbaiki Data" when rejected)
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [jenisEvent, setJenisEvent] = useState('');
  const [deskripsiPelatihan, setDeskripsiPelatihan] = useState('');
  const [fotoDokumentasiEvent, setFotoDokumentasiEvent] = useState<string[]>([]);
  const [fotoEventError, setFotoEventError] = useState('');
  const [lokasiDanAlamat, setLokasiDanAlamat] = useState('');
  const [provinsi, setProvinsi] = useState(currentUser.province || 'Jawa Barat');
  const [kota, setKota] = useState(currentUser.city || 'Kota Bandung');
  const [koordinat, setKoordinat] = useState('-6.9175, 107.6191');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('');
  const [jamMulaiEvent, setJamMulaiEvent] = useState('09:00');
  const [jamSelesaiEvent, setJamSelesaiEvent] = useState('12:00');
  const [namaLokasiEvent, setNamaLokasiEvent] = useState('');
  const [alamatEvent, setAlamatEvent] = useState('');
  const [disabilitasEvent, setDisabilitasEvent] = useState('');
  const [benefitEvent, setBenefitEvent] = useState('');
  const [persyaratanEvent, setPersyaratanEvent] = useState('');
  const [batasPendaftaranEvent, setBatasPendaftaranEvent] = useState('');
  const [targetDanKuotaPeserta, setTargetDanKuotaPeserta] = useState('50');
  const [kebutuhanPeserta, setKebutuhanPeserta] = useState<string[]>([
    'Mushaf Quran Braille Standar LPMQ',
    'Relawan Pendamping Mobilitas',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProposalForParticipants, setSelectedProposalForParticipants] = useState<string>('all');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartPerbaikiData = (proposal: TrainingProposal) => {
    setEditingProposalId(proposal.id);
    setNamaKegiatan(proposal.namaKegiatan);
    setJenisEvent(proposal.jenisEvent);
    setDeskripsiPelatihan(proposal.deskripsiPelatihan);
    setFotoDokumentasiEvent(proposal.fotoDokumentasi || []);
    setFotoEventError('');
    setLokasiDanAlamat(proposal.lokasiDanAlamat);
    setProvinsi(proposal.provinsi);
    setKota(proposal.kota);
    setKoordinat(`${proposal.latitude}, ${proposal.longitude}`);
    const legacySchedule = String(proposal.tanggalKegiatan || '').match(/^(\d{4}-\d{2}-\d{2})\s*\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)$/);
    setTanggalKegiatan(legacySchedule ? legacySchedule[1] : proposal.tanggalKegiatan);
    setJamMulaiEvent((proposal.waktuMulai || proposal.jamMulai || legacySchedule?.[2] || '09:00').slice(0, 5));
    setJamSelesaiEvent((proposal.waktuSelesai || proposal.jamSelesai || legacySchedule?.[3] || '12:00').slice(0, 5));
    setNamaLokasiEvent(proposal.lokasiDanAlamat || '');
    setAlamatEvent('');
    setTargetDanKuotaPeserta(proposal.targetDanKuotaPeserta.toString());
    setKebutuhanPeserta(proposal.kebutuhanPeserta);
    setBenefitEvent(proposal.benefit || '');
    setBatasPendaftaranEvent(proposal.batasPendaftaran || '');
    setPersyaratanEvent(proposal.persyaratan || '');
    setActiveTab('ajukan');
  };

  const handleResetForm = () => {
    setEditingProposalId(null);
    setNamaKegiatan('');
    setDeskripsiPelatihan('');
    setFotoDokumentasiEvent([]);
    setFotoEventError('');
    setLokasiDanAlamat('');
    setKoordinat('-6.9175, 107.6191');
    setTanggalKegiatan('');
    setJamMulaiEvent('09:00');
    setJamSelesaiEvent('12:00');
    setNamaLokasiEvent('');
    setAlamatEvent('');
    setDisabilitasEvent('');
    setBenefitEvent('');
    setPersyaratanEvent('');
    setBatasPendaftaranEvent('');
    setTargetDanKuotaPeserta('50');
    setKebutuhanPeserta(['Mushaf Quran Braille Standar LPMQ']);
  };

  const handleEventPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setFotoEventError('Pilih file gambar JPG, PNG, atau WebP.'); return; }
    if (file.size > 8 * 1024 * 1024) { setFotoEventError('Ukuran foto maksimal 8 MB.'); return; }
    setFotoEventError('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { setFotoEventError('Foto gagal diproses. Coba gambar lain.'); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFotoDokumentasiEvent([canvas.toDataURL('image/jpeg', 0.82)]);
      };
      img.onerror = () => setFotoEventError('Foto tidak dapat dibaca. Coba file JPG atau PNG lain.');
      img.src = String(reader.result || '');
    };
    reader.onerror = () => setFotoEventError('Gagal membaca file foto.');
    reader.readAsDataURL(file);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jamSelesaiEvent <= jamMulaiEvent) { alert('Jam selesai harus setelah jam mulai.'); return; }
    if (batasPendaftaranEvent && tanggalKegiatan && batasPendaftaranEvent > tanggalKegiatan) { alert('Batas pendaftaran tidak boleh melewati tanggal kegiatan.'); return; }
    const coordinates = koordinat.trim() ? parseEventCoordinate(koordinat) : { latitude: 0, longitude: 0 };
    if (!coordinates) { alert('Koordinat harus ditulis dengan format Latitude, Longitude. Contoh: -6.9175, 107.6191'); return; }

    setIsSubmitting(true);

    try {
      if (editingProposalId) {
        // Revision of rejected proposal (Perbaiki Data -> Kirim Permintaan ulang)
        const res = await fetch(`/api/events/${editingProposalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namaKegiatan,
            jenisEvent,
            eventCategoryId: kategoriEventOptions.find(option => option.nama === jenisEvent)?.id ?? null,
            disabilityId: disabilitasOptions.find(option => option.nama === disabilitasEvent)?.id ?? null,
            deskripsiPelatihan,
            fotoDokumentasi: fotoDokumentasiEvent,
            lokasiDanAlamat: `${namaLokasiEvent || lokasiDanAlamat} — ${alamatEvent}`.trim(),
            provinsi,
            kota,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            tanggalKegiatan,
            waktuMulai: jamMulaiEvent,
            waktuSelesai: jamSelesaiEvent,
            targetDanKuotaPeserta: parseInt(targetDanKuotaPeserta || '50'),
            kategoriDisabilitas: disabilitasEvent,
            batasPendaftaran: batasPendaftaranEvent,
            benefit: benefitEvent,
            persyaratan: persyaratanEvent,
            kebutuhanPeserta,
          }),
        });
        const data = await res.json();
        if (res.ok && data.proposal) {
          onProposalUpdated(data.proposal);
          handleResetForm();
          setActiveTab('daftar');
        } else {
          alert(data.error || 'Gagal merevisi permintaan');
        }
      } else {
        // New Proposal
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mitraId: currentUser.id,
            mitraName: currentUser.name,
            mitraOrg: currentUser.organizationName || 'Lembaga Mitra',
            namaKegiatan,
            jenisEvent,
            eventCategoryId: kategoriEventOptions.find(option => option.nama === jenisEvent)?.id ?? null,
            disabilityId: disabilitasOptions.find(option => option.nama === disabilitasEvent)?.id ?? null,
            deskripsiPelatihan,
            fotoDokumentasi: fotoDokumentasiEvent,
            lokasiDanAlamat: `${namaLokasiEvent || lokasiDanAlamat} — ${alamatEvent}`.trim(),
            provinsi,
            kota,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            tanggalKegiatan,
            waktuMulai: jamMulaiEvent,
            waktuSelesai: jamSelesaiEvent,
            targetDanKuotaPeserta: parseInt(targetDanKuotaPeserta || '50'),
            kategoriDisabilitas: disabilitasEvent,
            batasPendaftaran: batasPendaftaranEvent,
            benefit: benefitEvent,
            persyaratan: persyaratanEvent,
            kebutuhanPeserta,
          }),
        });
        const data = await res.json();
        if (res.ok && data.proposal) {
          onProposalCreated(data.proposal);
          handleResetForm();
          setActiveTab('daftar');
        } else {
          alert(data.error || 'Gagal mengirim permintaan');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter participants for approved proposals
  const myApprovedEventIds = myProposals.filter(p => p.status === 'disetujui').map(p => p.id);
  const myParticipants = participants.filter(pt => {
    if (!myApprovedEventIds.includes(pt.eventId)) return false;
    if (selectedProposalForParticipants !== 'all') {
      return pt.eventId === selectedProposalForParticipants;
    }
    return true;
  });

  return (
    <>
      {/* Header Info */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          {/* Mitra Organization Logo Display */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-outline-variant/40 p-1.5 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
            <PartnerLogo
              name={currentUser.organizationName || currentUser.name}
              logoUrl={currentUser.organizationLogo}
              size="md"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container text-on-primary-container text-[11px] font-bold rounded-md tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Portal Mitra Penyelenggara
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284c7] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                <VerifiedBadge size="xs" />
                <span>Mitra Resmi Terverifikasi</span>
              </span>
            </div>
            <h1 className="text-[22px] md:text-[26px] font-semibold text-on-surface tracking-tight leading-tight truncate flex items-center gap-2">
              <span className="truncate">{currentUser.organizationName || 'Dashboard Mitra Pelatihan'}</span>
              <VerifiedBadge size="md" />
            </h1>
            <p className="text-on-surface-variant text-[13.5px] mt-1 font-medium truncate">
              Penanggung Jawab: <strong className="text-on-surface">{currentUser.name}</strong> • Wilayah: {currentUser.city}, {currentUser.province}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto shrink-0">
          {/* Button to Upload / Change Logo */}
          <button
            onClick={() => {
              setLogoPreview(currentUser.organizationLogo || '');
              setLogoInputUrl(currentUser.organizationLogo || '');
              setLogoError(null);
              setIsLogoModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-300 rounded-xl text-[13px] font-semibold shadow-xs transition-colors cursor-pointer"
            title="Kelola Logo Lembaga Mitra"
          >
            <Icon name="image" className="text-[18px] text-emerald-700" />
            <span>{currentUser.organizationLogo ? 'Perbarui Logo' : 'Unggah Logo'}</span>
          </button>

          {onOpenChangePassword && (
            <button
              onClick={onOpenChangePassword}
              className="inline-flex items-center gap-2 px-4 py-3 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/40 rounded-xl text-[13px] font-semibold shadow-xs transition-colors cursor-pointer"
              title="Ganti Kata Sandi Akun Mitra"
            >
              <Icon name="lock_reset" className="text-[18px] text-primary" />
              Ganti Kata Sandi
            </button>
          )}

          <button
            onClick={() => {
              handleResetForm();
              setActiveTab('ajukan');
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[13px] font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Ajukan Permintaan Pelatihan
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <p className="text-[12px] text-outline font-semibold uppercase tracking-wider mb-2">Total Permintaan</p>
          <p className="text-[32px] font-semibold text-on-surface leading-none">{myProposals.length}</p>
        </div>
        <div className="p-5 bg-tertiary-container/30 rounded-xl border border-tertiary-container shadow-sm flex flex-col justify-between">
          <p className="text-[12px] text-on-tertiary-container font-semibold uppercase tracking-wider mb-2">Menunggu Persetujuan</p>
          <p className="text-[32px] font-semibold text-tertiary leading-none">
            {myProposals.filter(p => p.status === 'menunggu_persetujuan').length}
          </p>
        </div>
        <div className="p-5 bg-primary-container/30 rounded-xl border border-primary-container shadow-sm flex flex-col justify-between">
          <p className="text-[12px] text-on-primary-container font-semibold uppercase tracking-wider mb-2">Event Disetujui</p>
          <p className="text-[32px] font-semibold text-primary leading-none">
            {myProposals.filter(p => p.status === 'disetujui').length}
          </p>
        </div>
        <div className="p-5 bg-secondary-container/30 rounded-xl border border-secondary-container shadow-sm flex flex-col justify-between">
          <p className="text-[12px] text-on-secondary-container font-semibold uppercase tracking-wider mb-2">Total Pendaftar</p>
          <p className="text-[32px] font-semibold text-secondary leading-none">{myParticipants.length} <span className="text-[14px]">Peserta</span></p>
        </div>
      </div>

      {/* Tabs matching flow */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 mb-6 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('daftar')}
          className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'daftar'
              ? 'bg-on-surface text-surface'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          Status Permintaan ({myProposals.length})
        </button>
        <button
          onClick={() => {
            handleResetForm();
            setActiveTab('ajukan');
          }}
          className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'ajukan'
              ? 'bg-on-surface text-surface'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          {editingProposalId ? 'Perbaiki Permintaan' : 'Form Event Baru'}
        </button>
        <button
          onClick={() => setActiveTab('peserta')}
          className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'peserta'
              ? 'bg-on-surface text-surface'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          Data Peserta Event ({myParticipants.length})
        </button>
        <button
          onClick={() => setActiveTab('peserta_tpq')}
          className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'peserta_tpq'
              ? 'bg-on-surface text-surface'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          Data Peserta TPQ
        </button>
      </div>

      {/* TAB 1: DAFTAR STATUS PERMINTAAN PELATIHAN */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {myProposals.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center text-on-surface-variant shadow-sm">
              <Icon name="calendar_month" className="text-[48px] text-outline mb-4" />
              <h3 className="font-semibold text-on-surface text-[16px]">Belum Ada Permintaan Pelatihan</h3>
              <p className="text-[14px] mt-2 max-w-md mx-auto mb-6">
                Sebagai mitra lembaga, Anda dapat mengajukan pelatihan Al-Quran ramah disabilitas (Braille, Isyarat, Daksa, dll.) untuk disetujui Superadmin.
              </p>
              <button
                onClick={() => setActiveTab('ajukan')}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[13px] font-semibold shadow-sm cursor-pointer"
              >
                Mulai Ajukan Permintaan
              </button>
            </div>
          ) : (
            myProposals.map((prop) => {
              const kuotaMax = prop.kuotaDisetujui || prop.targetDanKuotaPeserta;
              const percentage = Math.min(100, Math.round((prop.jumlahPendaftar / kuotaMax) * 100));

              return (
                <div 
                  key={prop.id}
                  className={`bg-surface-container-lowest rounded-2xl border p-6 shadow-sm transition-all flex flex-col md:flex-row gap-6 ${
                    prop.status === 'ditolak'
                      ? 'border-error/30'
                      : prop.status === 'disetujui'
                      ? 'border-primary/30'
                      : 'border-tertiary/30'
                  }`}
                >
                  <div className="flex-1">
                    {/* Status Chip */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {prop.status === 'menunggu_persetujuan' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-tertiary-container text-on-tertiary-container">
                          <Icon name="schedule" className="text-[14px]" />
                          Menunggu Persetujuan Super Admin
                        </span>
                      )}
                      {prop.status === 'disetujui' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-primary-container text-on-primary-container">
                          <Icon name="check_circle" className="text-[14px]" />
                          Event Disetujui (Aktif di Peta)
                        </span>
                      )}
                      {prop.status === 'ditolak' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-error-container text-on-error-container">
                          <Icon name="cancel" className="text-[14px]" />
                          Permintaan Ditolak
                        </span>
                      )}
                      <span className="text-[12px] text-outline font-mono font-medium">ID: {prop.id}</span>
                    </div>

                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant/40 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        <PartnerLogo
                          name={currentUser.organizationName || currentUser.name}
                          logoUrl={currentUser.organizationLogo}
                          size="sm"
                          className="w-full h-full object-contain p-0 border-0 shadow-none"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-semibold text-on-surface leading-snug">
                          {prop.namaKegiatan}
                        </h3>
                        <div className="text-[12px] font-medium text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-on-surface">{currentUser.organizationName || currentUser.name}</span>
                          <VerifiedBadge size="xs" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[13px] text-on-surface-variant leading-relaxed mb-4">
                      {prop.deskripsiPelatihan}
                    </p>

                    {/* Event details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] text-on-surface-variant bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 mb-4">
                      <div>
                        <span className="text-outline block font-medium mb-0.5">Tanggal Kegiatan:</span>
                        <span className="font-semibold text-on-surface">{prop.tanggalKegiatan}</span>
                      </div>
                      <div>
                        <span className="text-outline block font-medium mb-0.5">Lokasi:</span>
                        <span className="font-semibold text-on-surface">{prop.lokasiDanAlamat}</span>
                      </div>
                      <div>
                        <span className="text-outline block font-medium mb-0.5">Target & Kuota:</span>
                        <span className="font-semibold text-primary">
                          {prop.kuotaDisetujui || prop.targetDanKuotaPeserta} Orang
                        </span>
                      </div>
                    </div>

                    {/* Kebutuhan Peserta */}
                    <div className="flex flex-wrap gap-2">
                      {prop.kebutuhanPeserta.map((keb, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 bg-surface-container text-on-surface rounded-md font-medium border border-outline-variant/20">
                          ✓ {keb}
                        </span>
                      ))}
                    </div>

                    {/* JIKA DITOLAK */}
                    {prop.status === 'ditolak' && (
                      <div className="mt-5 p-4 rounded-xl bg-error-container border border-error/20 flex flex-col sm:flex-row sm:items-start gap-4">
                        <Icon name="error" className="text-[24px] text-on-error-container shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-[13px] font-bold text-on-error-container mb-1">Alasan Penolakan dari Superadmin:</h4>
                          <p className="text-[13px] text-on-error-container/80 leading-relaxed mb-4">
                            {prop.alasanPenolakan || 'Mohon sesuaikan kuota atau fasilitas aksesibilitas.'}
                          </p>
                          <button
                            onClick={() => handleStartPerbaikiData(prop)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-on-error-container hover:bg-on-error-container/90 text-error-container rounded-lg text-[12px] font-semibold transition-colors cursor-pointer"
                          >
                            <Icon name="edit_document" className="text-[16px]" />
                            Perbaiki Data & Kirim Ulang
                          </button>
                        </div>
                      </div>
                    )}

                    {/* JIKA DISETUJUI */}
                    {prop.status === 'disetujui' && (
                      <div className="mt-5 p-5 rounded-xl bg-surface-container-low border border-primary/20 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-[12px] font-bold text-on-surface uppercase tracking-wider mb-1">Link Pendaftaran Resmi Peserta:</p>
                            <p className="text-[13px] font-mono font-medium text-primary break-all">
                              {prop.linkPendaftaran || window.location.origin + `/#daftar/${prop.id}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(prop.linkPendaftaran || window.location.origin + `/#daftar/${prop.id}`, prop.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant rounded-xl text-[12px] font-semibold text-on-surface transition-colors cursor-pointer"
                            >
                              <Icon name={copiedId === prop.id ? 'check' : 'content_copy'} className="text-[16px]" />
                              {copiedId === prop.id ? 'Tersalin!' : 'Salin Link'}
                            </button>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nTelah dibuka pendaftaran pelatihan Al-Quran Disabilitas: *${prop.namaKegiatan}*.\n\n🗓️ Tanggal: ${prop.tanggalKegiatan}\n📍 Lokasi: ${prop.lokasiDanAlamat}\n👥 Kuota: ${kuotaMax} peserta\n\nSilakan klik tautan resmi untuk mendaftar:\n${prop.linkPendaftaran || window.location.origin + '/#daftar/' + prop.id}`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl text-[12px] font-semibold transition-colors shadow-sm"
                            >
                              <Icon name="share" className="text-[16px]" />
                              Bagikan ke WA
                            </a>
                          </div>
                        </div>

                        {/* Progress pendaftar */}
                        <div className="pt-2 border-t border-outline-variant/20">
                          <div className="flex justify-between text-[12px] font-medium text-on-surface-variant mb-1.5">
                            <span>Jumlah Pendaftar: <strong className="text-on-surface">{prop.jumlahPendaftar} / {kuotaMax}</strong> ({percentage}%)</span>
                            <button
                              onClick={() => {
                                setSelectedProposalForParticipants(prop.id);
                                setActiveTab('peserta');
                              }}
                              className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span>Lihat Data Peserta</span>
                              <Icon name="arrow_forward" className="text-[14px]" />
                            </button>
                          </div>
                          <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: FORM PERMINTAAN PELATIHAN */}
      {activeTab === 'ajukan' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-sm">
          <div className="pb-5 border-b border-outline-variant/30 mb-6">
            <h2 className="text-[20px] font-semibold text-on-surface">
              {editingProposalId ? 'Perbaiki Permintaan Pelatihan (Revisi)' : 'Daftarkan Event Anda'}
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1.5 font-medium">
              Lengkapi formulir spesifikasi kegiatan pelatihan quran disabilitas. Permintaan Anda akan ditinjau oleh Superadmin untuk penetapan kuota & tautan registrasi publik.
            </p>
          </div>

          <form onSubmit={handleSubmitProposal} className="space-y-5 text-[13px]">
            <style>{`.request-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.request-field{display:flex;flex-direction:column;gap:7px}.request-field label{font-size:13px;font-weight:650;color:var(--color-on-surface)}.request-field input,.request-field select,.request-field textarea{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;background:white;color:#182230;font:inherit}.request-field textarea{min-height:82px}.request-full{grid-column:1/-1}@media(max-width:600px){.request-grid{grid-template-columns:1fr}.request-full{grid-column:auto}}`}</style>
            <div className="request-grid">
              <div className="request-field request-full"><label>Nama Event *</label><input required value={namaKegiatan} onChange={e=>setNamaKegiatan(e.target.value)} placeholder="Nama event" /></div>
              <div className="request-field"><label>Kategori / Fokus *</label><select required value={jenisEvent} onChange={e=>setJenisEvent(e.target.value)} disabled={loadingMasterOptions || kategoriEventOptions.length === 0}><option value="">{loadingMasterOptions ? 'Memuat kategori...' : 'Pilih kategori'}</option>{kategoriEventOptions.map(option=><option key={option.id} value={option.nama}>{option.nama}</option>)}</select>{!loadingMasterOptions && kategoriEventOptions.length===0 && <small>Belum ada kategori aktif. Tambahkan melalui Kelola Kategori.</small>}</div>
              <div className="request-field"><label>Jenis Disabilitas *</label><select required value={disabilitasEvent} onChange={e=>setDisabilitasEvent(e.target.value)} disabled={loadingMasterOptions || disabilitasOptions.length === 0}><option value="">{loadingMasterOptions ? 'Memuat jenis disabilitas...' : 'Pilih jenis disabilitas'}</option>{disabilitasOptions.map(option=><option key={option.id} value={option.nama}>{option.nama}</option>)}</select>{!loadingMasterOptions && disabilitasOptions.length===0 && <small>Belum ada jenis disabilitas aktif. Tambahkan melalui Kelola Disabilitas.</small>}</div>
              {masterOptionsError && <div className="request-field request-full text-red-600" role="alert">{masterOptionsError} Pastikan backend berjalan dan endpoint master data tersedia.</div>}
              <div className="request-field request-full"><label>Deskripsi</label><textarea value={deskripsiPelatihan} onChange={e=>setDeskripsiPelatihan(e.target.value)} placeholder="Deskripsi kegiatan" /></div>
              <div className="request-field request-full">
                <label>Foto Dokumentasi / Sampul Event</label>
                <p className="text-[11px] text-slate-500">Unggah foto kegiatan atau poster resmi. Foto ini menjadi gambar utama di halaman detail event setelah pengajuan disetujui.</p>
                {fotoDokumentasiEvent[0] ? (
                  <div className="relative max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={fotoDokumentasiEvent[0]} alt="Pratinjau foto event" className="w-full max-h-64 object-cover" />
                    <button type="button" onClick={() => setFotoDokumentasiEvent([])} className="absolute right-2 top-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-rose-700 shadow">Hapus foto</button>
                  </div>
                ) : (
                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-emerald-500 hover:bg-emerald-50/40">
                    <Icon name="add_photo_alternate" className="text-3xl text-emerald-700" />
                    <span className="text-xs font-bold text-slate-700">Klik untuk mengunggah foto event</span>
                    <span className="text-[11px] text-slate-500">JPG, PNG, WebP · Maks. 8 MB</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEventPhotoUpload} className="hidden" />
                  </label>
                )}
                {fotoEventError && <small className="text-red-600" role="alert">{fotoEventError}</small>}
              </div>
              <div className="request-field"><label>Tanggal Kegiatan *</label><input required type="date" value={tanggalKegiatan} onChange={e=>setTanggalKegiatan(e.target.value)} /></div>
              <div className="request-field"><label>Jam Mulai *</label><input required type="time" value={jamMulaiEvent} onChange={e=>setJamMulaiEvent(e.target.value)} /></div>
              <div className="request-field"><label>Jam Selesai *</label><input required type="time" value={jamSelesaiEvent} onChange={e=>setJamSelesaiEvent(e.target.value)} /></div>
              <div className="request-field"><label>Lokasi *</label><input required value={namaLokasiEvent} onChange={e=>setNamaLokasiEvent(e.target.value)} placeholder="Nama tempat" /></div>
              <div className="request-field"><label>Alamat *</label><input required value={alamatEvent} onChange={e=>setAlamatEvent(e.target.value)} placeholder="Alamat lengkap" /></div>
              <IndonesiaLocationFields
                province={provinsi}
                city={kota}
                onProvinceChange={(value) => { setProvinsi(value); setKota(''); }}
                onCityChange={setKota}
                variant="mitra"
              />
              <div className="request-field request-full"><label>Koordinat</label><input value={koordinat} onChange={e=>setKoordinat(e.target.value)} placeholder="-6.200000, 106.816666" /></div>
              <div className="request-field request-full"><label>Persyaratan Peserta</label><textarea rows={4} value={persyaratanEvent} onChange={e=>setPersyaratanEvent(e.target.value)} placeholder={"Contoh:\n1. Mengisi formulir pendaftaran\n2. Bersedia mengikuti kegiatan sampai selesai\n3. Membawa identitas diri"} /><small>Masukkan satu persyaratan pada setiap baris. Persyaratan ini akan ditampilkan pada tab Persyaratan di Detail Event.</small></div>
              <div className="request-field request-full"><label>Benefit</label><textarea value={benefitEvent} onChange={e=>setBenefitEvent(e.target.value)} placeholder="Benefit bagi peserta" /></div>
              <div className="request-field"><label>Batas Pendaftaran *</label><input required type="date" value={batasPendaftaranEvent} onChange={e=>setBatasPendaftaranEvent(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-outline-variant/30"><button type="button" onClick={()=>{handleResetForm();setActiveTab('daftar')}} className="px-5 py-2.5 rounded-xl font-semibold hover:bg-surface-container">Batal</button><button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold disabled:opacity-50">{isSubmitting?'Mengirim Permintaan...':editingProposalId?'Kirim Revisi Permintaan Ulang':'Kirim'}</button></div>
          </form>
        </div>
      )}

      {/* TAB 3: PELAKSANAAN PELATIHAN & DATA PESERTA */}
      {activeTab === 'peserta' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/30 mb-6">
            <div>
              <h2 className="text-[20px] font-semibold text-on-surface">
                Data Peserta Event
              </h2>
              <p className="text-[13px] text-on-surface-variant mt-1.5 font-medium">
                Daftar peserta terdaftar dari link registrasi publik untuk pelaksanaan pelatihan.
              </p>
            </div>

            {/* Filter by event */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-outline font-medium">Filter Event:</span>
              <select
                value={selectedProposalForParticipants}
                onChange={(e) => setSelectedProposalForParticipants(e.target.value)}
                className="px-4 py-2 border border-outline-variant/50 rounded-xl text-[13px] bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Semua Event Saya ({myParticipants.length} Peserta)</option>
                {myProposals.filter(p => p.status === 'disetujui').map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.namaKegiatan.slice(0, 35)}...</option>
                ))}
              </select>
            </div>
          </div>

          {myParticipants.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-[14px]">
              Belum ada peserta terdaftar pada event yang dipilih. Pastikan event Anda telah disetujui dan link pendaftaran telah dibagikan ke calon peserta.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant font-semibold">
                    <th className="p-3.5 rounded-tl-xl">Nama Lengkap</th>
                    <th className="p-3.5">Kategori Disabilitas</th>
                    <th className="p-3.5">Kontak WhatsApp</th>
                    <th className="p-3.5">Kebutuhan Fasilitas</th>
                    <th className="p-3.5">Event Pelatihan</th>
                    <th className="p-3.5">Catatan</th>
                    <th className="p-3.5 rounded-tr-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {myParticipants.map((pt) => (
                    <tr key={pt.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-3.5 font-semibold text-on-surface">{pt.namaLengkap} ({pt.usia} th)</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary-container text-on-primary-container uppercase tracking-wide">
                          {pt.kategoriDisabilitas}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-medium">
                        <a 
                          href={`https://wa.me/62${pt.noWa.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1.5"
                        >
                          {pt.noWa}
                          <Icon name="open_in_new" className="text-[14px]" />
                        </a>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {pt.kebutuhanFasilitas.map((f, i) => (
                            <span key={i} className="text-[11px] bg-surface-container px-2 py-0.5 rounded-md text-on-surface font-medium border border-outline-variant/20">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-on-surface-variant max-w-xs truncate">{pt.eventTitle || pt.eventId}</td>
                      <td className="p-3.5 text-outline italic max-w-xs truncate">{pt.catatanKhusus || '-'}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-surface-container text-on-surface border border-outline-variant/30 uppercase tracking-wide">
                          {pt.statusKehadiran}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PESERTA PENDIDIKAN TPQ */}
      {activeTab === 'peserta_tpq' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-semibold text-on-surface">Data Peserta Pendidikan</h2>
            <p className="text-[13px] text-on-surface-variant mt-1.5 font-medium">
              Peserta yang mendaftar melalui formulir pendaftaran pada program TPQ yang Anda selenggarakan.
            </p>
          </div>
          <TPQRegistrations scope="mitra" />
        </div>
      )}

      {/* MITRA LOGO UPLOAD & MANAGEMENT MODAL */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                  <Icon name="image" className="text-[26px]" />
                </div>
                <div>
                  <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-snug">
                    Kelola Logo Lembaga Mitra
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Logo otomatis tampil di Header Portal Mitra, Homepage Direktori Mitra, dan Kartu Pelatihan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Error Message */}
            {logoError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <Icon name="error" className="text-[18px] shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            {/* Source Mode Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setLogoTab('upload')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  logoTab === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon name="upload_file" className="text-[16px]" />
                Unggah Berkas Gambar
              </button>
              <button
                type="button"
                onClick={() => setLogoTab('url')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  logoTab === 'url'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon name="link" className="text-[16px]" />
                Tautan URL Gambar
              </button>
            </div>

            {/* Tab: Upload File */}
            {logoTab === 'upload' && (
              <div className="space-y-4 mb-6">
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/40">
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-emerald-600 mb-2">
                    <Icon name="cloud_upload" className="text-[26px]" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800">
                    Klik untuk memilih berkas logo dari perangkat
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Format didukung: PNG, JPG, WebP, SVG (Maks. 5 MB). Direkomendasikan gambar persegi dengan latar transparan.
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Tab: URL Input */}
            {logoTab === 'url' && (
              <div className="space-y-2 mb-6">
                <label className="block text-[12px] font-bold text-slate-700">
                  URL / Tautan Gambar Logo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={logoInputUrl}
                    onChange={e => {
                      setLogoInputUrl(e.target.value);
                      setLogoPreview(e.target.value);
                    }}
                    placeholder="https://example.com/logo-mitra.png"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Pastikan tautan dapat diakses secara publik (HTTPS).
                </p>
              </div>
            )}

            {/* Live Preview Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
                Pratinjau Tampilan Logo
              </span>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-14 rounded-xl border border-slate-200 p-1 flex items-center justify-center bg-white shadow-2xs shrink-0">
                    <PartnerLogo
                      name={currentUser.organizationName || currentUser.name}
                      logoUrl={logoPreview}
                      size="md"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-[13.5px] text-slate-900 leading-tight">
                      {currentUser.organizationName || 'Nama Lembaga Mitra'}
                    </h5>
                    <span className="text-[11.5px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <Icon name="verified" className="text-[14px]" />
                      Mitra Resmi Terverifikasi
                    </span>
                  </div>
                </div>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold border border-red-200 transition-colors cursor-pointer shrink-0"
                  >
                    Reset ke Emblem
                  </button>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                disabled={isSavingLogo}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={isSavingLogo}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSavingLogo ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" className="text-[18px]" />
                    <span>Simpan Perubahan Logo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
