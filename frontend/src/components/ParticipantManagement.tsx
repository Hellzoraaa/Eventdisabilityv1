import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icon.tsx';
import { Participant, TrainingProposal, User, DisabilityMaster } from '../types.ts';
import { TPQRegistrations } from './TPQRegistrations.tsx';

interface ParticipantManagementProps {
  currentUser?: User | null;
  events?: TrainingProposal[];
  disabilities?: DisabilityMaster[];
  onParticipantCreated?: (p: Participant) => void;
  onParticipantDeleted?: (pId: string, eventId?: string) => void;
}

export const ParticipantManagement: React.FC<ParticipantManagementProps> = ({
  currentUser,
  events = [],
  disabilities = [],
  onParticipantCreated,
  onParticipantDeleted,
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [disabilityFilter, setDisabilityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [sourceTab, setSourceTab] = useState<'event' | 'tpq'>('event');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeDisabilities = useMemo(() => {
    return (disabilities || []).filter(d => d.isAktif !== false);
  }, [disabilities]);

  // Edit modal state
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editForm, setEditForm] = useState({
    namaLengkap: '',
    noWa: '',
    email: '',
    usia: 25,
    kategoriDisabilitas: 'tunanetra' as Participant['kategoriDisabilitas'],
    statusKehadiran: 'terdaftar' as Participant['statusKehadiran'],
    kebutuhanFasilitas: [] as string[],
    catatanKhusus: '',
  });

  // Delete modal state
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add new participant modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    eventId: '',
    namaLengkap: '',
    noWa: '',
    email: '',
    usia: 25,
    kategoriDisabilitas: 'tunanetra' as Participant['kategoriDisabilitas'],
    statusKehadiran: 'terdaftar' as Participant['statusKehadiran'],
    kebutuhanFasilitas: [] as string[],
    catatanKhusus: '',
  });

  const fetchParticipants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/participants');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.participants)
          ? data.participants
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setParticipants(list);
      } else {
        // Fallback to summary endpoint if needed
        const summaryRes = await fetch('/api/reports/summary');
        const summaryData = await summaryRes.json();
        if (summaryData?.participants && Array.isArray(summaryData.participants)) {
          setParticipants(summaryData.participants);
        }
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleOpenEdit = (p: Participant) => {
    setEditingParticipant(p);
    setEditForm({
      namaLengkap: p.namaLengkap,
      noWa: p.noWa,
      email: p.email || '',
      usia: p.usia,
      kategoriDisabilitas: p.kategoriDisabilitas,
      statusKehadiran: p.statusKehadiran,
      kebutuhanFasilitas: p.kebutuhanFasilitas || [],
      catatanKhusus: p.catatanKhusus || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/participants/${editingParticipant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok && data.participant) {
        setParticipants(prev => prev.map(p => p.id === editingParticipant.id ? data.participant : p));
        setEditingParticipant(null);
        showNotification('success', `Data peserta "${data.participant.namaLengkap}" berhasil diperbarui!`);
      } else {
        alert(data.error || 'Gagal memperbarui data peserta');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (participantId: string, newStatus: 'terdaftar' | 'hadir' | 'batal') => {
    try {
      const target = participants.find(p => p.id === participantId);
      if (!target) return;

      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, statusKehadiran: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.participant) {
        setParticipants(prev => prev.map(p => p.id === participantId ? data.participant : p));
        showNotification('success', `Status kehadiran peserta diubah menjadi: ${newStatus.toUpperCase()}`);
      }
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingParticipant) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/participants/${deletingParticipant.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setParticipants(prev => prev.filter(p => p.id !== deletingParticipant.id));
        showNotification('success', `Peserta "${deletingParticipant.namaLengkap}" berhasil dihapus.`);
        if (onParticipantDeleted) {
          onParticipantDeleted(deletingParticipant.id, deletingParticipant.eventId);
        }
        setDeletingParticipant(null);
      } else {
        alert(data.error || 'Gagal menghapus peserta');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghapus');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.namaLengkap.trim() || !addForm.noWa.trim()) {
      alert('Nama lengkap dan nomor WhatsApp wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          eventId: addForm.eventId || (events[0]?.id || 'evt-braille-sby'),
        }),
      });
      const data = await res.json();
      if (res.ok && data.participant) {
        setParticipants(prev => [data.participant, ...prev]);
        setIsAddModalOpen(false);
        showNotification('success', `Peserta baru "${data.participant.namaLengkap}" berhasil ditambahkan!`);
        if (onParticipantCreated) {
          onParticipantCreated(data.participant);
        }
        setAddForm({
          eventId: '',
          namaLengkap: '',
          noWa: '',
          email: '',
          usia: 25,
          kategoriDisabilitas: 'tunanetra',
          statusKehadiran: 'terdaftar',
          kebutuhanFasilitas: [],
          catatanKhusus: '',
        });
      } else {
        alert(data.error || 'Gagal menambahkan peserta');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    let csv = '\uFEFF';
    csv += 'No,ID Peserta,Nama Lengkap,Usia,Ragam Disabilitas,No WhatsApp,Email,Event Terdaftar,Kebutuhan Fasilitas,Status Kehadiran,Waktu Pendaftaran\n';
    filteredParticipants.forEach((p, idx) => {
      const fasil = (p.kebutuhanFasilitas || []).join('; ');
      const waktu = p.waktuDaftar ? new Date(p.waktuDaftar).toLocaleString('id-ID') : '-';
      csv += `${idx + 1},"${p.id}","${p.namaLengkap}",${p.usia},"${p.kategoriDisabilitas}","${p.noWa}","${p.email || '-'}","${p.eventTitle || '-'}","${fasil}","${p.statusKehadiran}","${waktu}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Peserta_Pelatihan_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', 'Data peserta berhasil diexport ke CSV / Excel');
  };

  // Safe participants array and filter
  const safeParticipants = Array.isArray(participants) ? participants : [];

  const filteredParticipants = safeParticipants.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.namaLengkap.toLowerCase().includes(query) ||
      p.noWa.includes(query) ||
      (p.email && p.email.toLowerCase().includes(query)) ||
      (p.eventTitle && p.eventTitle.toLowerCase().includes(query));

    const matchesDisability = disabilityFilter === 'all' || p.kategoriDisabilitas === disabilityFilter;
    const matchesStatus = statusFilter === 'all' || p.statusKehadiran === statusFilter;
    const matchesEvent = eventFilter === 'all' || p.eventId === eventFilter;

    return matchesSearch && matchesDisability && matchesStatus && matchesEvent;
  });

  const totalHadir = safeParticipants.filter(p => p.statusKehadiran === 'hadir').length;
  const totalTerdaftar = safeParticipants.filter(p => p.statusKehadiran === 'terdaftar').length;
  const totalBatal = safeParticipants.filter(p => p.statusKehadiran === 'batal').length;

  const sourceTabs = (
    <div className="inline-flex p-1 rounded-full bg-surface-container-low border border-outline-variant/30 self-start">
      {([['event', 'Peserta Event'], ['tpq', 'Peserta Pendidikan TPQ']] as const).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setSourceTab(key)}
          className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-colors cursor-pointer ${
            sourceTab === key ? 'bg-on-surface text-surface' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (sourceTab === 'tpq') {
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="groups" className="text-primary text-[26px]" />
            <h1 className="text-[20px] font-bold text-on-surface">Dashboard Data Peserta</h1>
          </div>
          <p className="text-[13px] text-on-surface-variant mb-4">Peserta yang mendaftar pada program Pendidikan TPQ dari seluruh mitra penyelenggara.</p>
          {sourceTabs}
        </div>
        <TPQRegistrations scope="superadmin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex">{sourceTabs}</div>
      {/* Toast Notification */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-white ${
          feedback.type === 'success' ? 'bg-emerald-700' : 'bg-red-700'
        }`}>
          <Icon name={feedback.type === 'success' ? 'check_circle' : 'error'} className="text-[20px]" />
          <span className="text-[13px] font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="groups" className="text-primary text-[26px]" />
            <h1 className="text-[20px] font-bold text-on-surface">Dashboard Data Peserta</h1>
          </div>
          <p className="text-[13px] text-on-surface-variant">
            Pusat data terverifikasi santri, peserta pelatihan Al-Quran, pendamping, dan kebutuhan aksesibilitas inklusif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-[12px] font-semibold flex items-center gap-2 border border-outline-variant/30 transition-all cursor-pointer"
          >
            <Icon name="file_download" className="text-[18px]" />
            <span>Unduh CSV Peserta</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-[12px] font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Icon name="person_add" className="text-[18px]" />
            <span>Tambah Peserta Baru</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-on-surface-variant text-[12px] font-medium">Total Peserta Terdata</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-bold text-on-surface">{participants.length}</span>
            <span className="text-[12px] text-outline">Santri</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-on-surface-variant text-[12px] font-medium">Hadir di Pelatihan</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-bold text-emerald-600">{totalHadir}</span>
            <span className="text-[12px] text-emerald-700 font-medium">
              ({participants.length > 0 ? Math.round((totalHadir / participants.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-on-surface-variant text-[12px] font-medium">Status Terdaftar</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-bold text-blue-600">{totalTerdaftar}</span>
            <span className="text-[12px] text-blue-700 font-medium">
              ({participants.length > 0 ? Math.round((totalTerdaftar / participants.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="text-on-surface-variant text-[12px] font-medium">Batal / Absen</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-bold text-amber-600">{totalBatal}</span>
            <span className="text-[12px] text-amber-700 font-medium">
              ({participants.length > 0 ? Math.round((totalBatal / participants.length) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card with Search & Filters */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
        {/* Controls Bar */}
        <div className="p-5 border-b border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama peserta, nomor WhatsApp, email, atau pelatihan..."
              className="w-full pl-9 pr-4 py-2 text-[13px] bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Icon name="search" className="absolute left-3 top-2.5 text-[18px] text-on-surface-variant" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Disability Filter */}
            <select
              value={disabilityFilter}
              onChange={e => setDisabilityFilter(e.target.value)}
              className="py-2 px-3 text-[12px] bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Kategori (Disabilitas & Umum)</option>
              {activeDisabilities.length > 0 ? (
                activeDisabilities.map(d => (
                  <option key={d.id || d.kode} value={d.kode}>
                    {d.nama}
                  </option>
                ))
              ) : (
                <>
                  <option value="umum">Umum / Non-Disabilitas</option>
                  <option value="tunanetra">Tunanetra (Braille)</option>
                  <option value="tunarungu">Tunarungu / Tuli (Isyarat)</option>
                  <option value="tunadaksa">Tunadaksa (Fisik)</option>
                  <option value="intelektual_autisme">Intelektual & Autisme</option>
                  <option value="pendamping_umum">Pendamping / Relawan</option>
                </>
              )}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-[12px] bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="terdaftar">Terdaftar</option>
              <option value="hadir">Hadir</option>
              <option value="batal">Batal</option>
            </select>

            {/* Event Filter if events provided */}
            {events.length > 0 && (
              <select
                value={eventFilter}
                onChange={e => setEventFilter(e.target.value)}
                className="py-2 px-3 text-[12px] bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary max-w-xs truncate"
              >
                <option value="all">Semua Event Pelatihan</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.namaKegiatan}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Participant Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-on-surface-variant">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-[13px]">Memuat data peserta...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <Icon name="person_search" className="text-[40px] text-outline mb-2" />
              <p className="text-[14px] font-semibold text-on-surface">Tidak ada peserta ditemukan</p>
              <p className="text-[12px] text-outline mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap & Usia</th>
                  <th className="py-3 px-4">Ragam Disabilitas</th>
                  <th className="py-3 px-4">Kontak (WhatsApp & Email)</th>
                  <th className="py-3 px-4">Event Pelatihan</th>
                  <th className="py-3 px-4">Kebutuhan Fasilitas</th>
                  <th className="py-3 px-4">Status Kehadiran</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredParticipants.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-on-surface">
                      {p.namaLengkap}
                      <span className="block text-[11px] font-normal text-on-surface-variant">
                        Usia: {p.usia} tahun {p.catatanKhusus ? `• Catatan: ${p.catatanKhusus}` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        p.kategoriDisabilitas === 'tunanetra'
                          ? 'bg-[#005a71]/10 text-[#005a71]'
                          : p.kategoriDisabilitas === 'tunarungu'
                          ? 'bg-[#fc6f5a]/15 text-[#b93822]'
                          : p.kategoriDisabilitas === 'tunadaksa'
                          ? 'bg-[#ffb95f]/20 text-[#855300]'
                          : p.kategoriDisabilitas === 'intelektual_autisme'
                          ? 'bg-[#81d1f0]/20 text-[#004f64]'
                          : p.kategoriDisabilitas === 'umum'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {p.kategoriDisabilitas.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-on-surface">
                      <div className="font-mono text-[12px]">{p.noWa}</div>
                      {p.email && <div className="text-[11px] text-on-surface-variant">{p.email}</div>}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-on-surface font-medium truncate" title={p.eventTitle}>
                      {p.eventTitle || 'Pelatihan Disabilitas'}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant text-[11px]">
                      {(p.kebutuhanFasilitas || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.kebutuhanFasilitas.map((f, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-surface-container text-on-surface rounded text-[10px]">
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-outline">Standar Inklusif</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {/* Quick status toggle button */}
                      <select
                        value={p.statusKehadiran}
                        onChange={e => handleQuickStatusChange(p.id, e.target.value as any)}
                        className={`text-[11px] font-semibold py-1 px-2 rounded-lg border-0 cursor-pointer ${
                          p.statusKehadiran === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.statusKehadiran === 'batal'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <option value="terdaftar">TERDAFTAR</option>
                        <option value="hadir">HADIR</option>
                        <option value="batal">BATAL</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container cursor-pointer transition-colors"
                          title="Edit Peserta"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button
                          onClick={() => setDeletingParticipant(p)}
                          className="p-1 text-on-surface-variant hover:text-error rounded hover:bg-error/10 cursor-pointer transition-colors"
                          title="Hapus Peserta"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Participant Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 border border-outline-variant/30 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30 mb-4">
              <h3 className="font-bold text-[16px] text-on-surface">Edit Data Peserta</h3>
              <button
                onClick={() => setEditingParticipant(null)}
                className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container"
              >
                <Icon name="close" className="text-[24px]" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editForm.namaLengkap}
                  onChange={e => setEditForm({ ...editForm, namaLengkap: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={editForm.noWa}
                    onChange={e => setEditForm({ ...editForm, noWa: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Usia (Tahun)</label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    required
                    value={editForm.usia}
                    onChange={e => setEditForm({ ...editForm, usia: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Ragam Disabilitas</label>
                  <select
                    value={editForm.kategoriDisabilitas}
                    onChange={e => setEditForm({ ...editForm, kategoriDisabilitas: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {activeDisabilities.length > 0 ? (
                      activeDisabilities.map(d => (
                        <option key={d.id || d.kode} value={d.kode}>
                          {d.nama}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="tunanetra">Tunanetra (Braille)</option>
                        <option value="tunarungu">Tunarungu (Isyarat)</option>
                        <option value="tunadaksa">Tunadaksa</option>
                        <option value="intelektual_autisme">Intelektual & Autisme</option>
                        <option value="pendamping_umum">Pendamping / Umum</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Status Kehadiran</label>
                  <select
                    value={editForm.statusKehadiran}
                    onChange={e => setEditForm({ ...editForm, statusKehadiran: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="terdaftar">Terdaftar</option>
                    <option value="hadir">Hadir</option>
                    <option value="batal">Batal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Catatan Khusus</label>
                <textarea
                  rows={2}
                  value={editForm.catatanKhusus}
                  onChange={e => setEditForm({ ...editForm, catatanKhusus: e.target.value })}
                  placeholder="Contoh: Membutuhkan pendamping relawan, memakai alat bantu dengar..."
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Participant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 border border-outline-variant/30 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30 mb-4">
              <h3 className="font-bold text-[16px] text-on-surface">Tambah Peserta Pelatihan Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container"
              >
                <Icon name="close" className="text-[24px]" />
              </button>
            </div>

            <form onSubmit={handleCreateParticipant} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Pilih Event Pelatihan</label>
                <select
                  value={addForm.eventId}
                  onChange={e => setAddForm({ ...addForm, eventId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.namaKegiatan} ({ev.kota})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Nama Lengkap Peserta *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Faiz"
                  value={addForm.namaLengkap}
                  onChange={e => setAddForm({ ...addForm, namaLengkap: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Nomor WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={addForm.noWa}
                    onChange={e => setAddForm({ ...addForm, noWa: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Usia (Tahun)</label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    required
                    value={addForm.usia}
                    onChange={e => setAddForm({ ...addForm, usia: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Email</label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Ragam Disabilitas</label>
                  <select
                    value={addForm.kategoriDisabilitas}
                    onChange={e => setAddForm({ ...addForm, kategoriDisabilitas: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {activeDisabilities.length > 0 ? (
                      activeDisabilities.map(d => (
                        <option key={d.id || d.kode} value={d.kode}>
                          {d.nama}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="tunanetra">Tunanetra (Braille)</option>
                        <option value="tunarungu">Tunarungu (Isyarat)</option>
                        <option value="tunadaksa">Tunadaksa</option>
                        <option value="intelektual_autisme">Intelektual & Autisme</option>
                        <option value="pendamping_umum">Pendamping / Umum</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">Status Awal</label>
                  <select
                    value={addForm.statusKehadiran}
                    onChange={e => setAddForm({ ...addForm, statusKehadiran: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="terdaftar">Terdaftar</option>
                    <option value="hadir">Hadir Langsung</option>
                    <option value="batal">Batal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Catatan Khusus Kebutuhan</label>
                <textarea
                  rows={2}
                  value={addForm.catatanKhusus}
                  onChange={e => setAddForm({ ...addForm, catatanKhusus: e.target.value })}
                  placeholder="Contoh: Butuh penjemputan dari stasiun, butuh mushaf braille juz 30..."
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menambahkan...' : 'Simpan Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingParticipant && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 border border-outline-variant/30 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
              <Icon name="warning" className="text-[28px]" />
            </div>
            <h3 className="text-center font-bold text-[16px] text-on-surface mb-1">Hapus Data Peserta?</h3>
            <p className="text-center text-[13px] text-on-surface-variant mb-6">
              Apakah Anda yakin ingin menghapus peserta <strong>"{deletingParticipant.namaLengkap}"</strong> ({deletingParticipant.noWa})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingParticipant(null)}
                className="flex-1 py-2.5 bg-surface-container text-on-surface rounded-xl text-[13px] font-semibold hover:bg-surface-container-high transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-error text-on-error rounded-xl text-[13px] font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
