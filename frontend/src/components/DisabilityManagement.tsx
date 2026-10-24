import React, { useState, useEffect } from 'react';
import { Icon } from './Icon.tsx';
import { DisabilityMaster, User, TrainingProposal, QuranCommunity, Participant, EventCategory } from '../types.ts';

interface DisabilityManagementProps {
  currentUser?: User | null;
  events?: TrainingProposal[];
  communities?: QuranCommunity[];
  participants?: Participant[];
  disabilitiesList?: DisabilityMaster[];
  onDisabilitiesChange?: (updated: DisabilityMaster[]) => void;
  eventCategoriesList?: EventCategory[];
  onEventCategoriesChange?: (updated: EventCategory[]) => void;
  onNavigateToDashboard?: (targetDashboard: 'events' | 'map', categoryFilter?: string) => void;
}

export const DisabilityManagement: React.FC<DisabilityManagementProps> = ({
  currentUser,
  events = [],
  communities = [],
  participants = [],
  disabilitiesList,
  onDisabilitiesChange,
  eventCategoriesList,
  onEventCategoriesChange,
  onNavigateToDashboard,
}) => {
  // Tabs: 'disabilities' | 'event_categories'
  const [activeTab, setActiveTab] = useState<'disabilities' | 'event_categories'>('disabilities');

  // ==================== DISABILITY STATE ====================
  const [disabilities, setDisabilities] = useState<DisabilityMaster[]>(disabilitiesList || []);
  const [isLoadingDisabilities, setIsLoadingDisabilities] = useState(!disabilitiesList || disabilitiesList.length === 0);
  const [disabilitySearchQuery, setDisabilitySearchQuery] = useState('');

  // Disability Modals
  const [isAddDisabilityModalOpen, setIsAddDisabilityModalOpen] = useState(false);
  const [editingDisability, setEditingDisability] = useState<DisabilityMaster | null>(null);
  const [deletingDisability, setDeletingDisability] = useState<DisabilityMaster | null>(null);

  const initialDisabilityFormState = {
    kode: '',
    nama: '',
    kategoriUtama: 'Sensorik' as DisabilityMaster['kategoriUtama'],
    deskripsi: '',
    metodePembelajaran: '',
    fasilitasInput: '',
    icon: 'accessible',
    warnaHex: '#005a71',
    isAktif: true,
  };
  const [disabilityFormData, setDisabilityFormData] = useState(initialDisabilityFormState);

  // ==================== EVENT CATEGORY STATE ====================
  const [eventCategories, setEventCategories] = useState<EventCategory[]>(eventCategoriesList || []);
  const [isLoadingCategories, setIsLoadingCategories] = useState(!eventCategoriesList || eventCategoriesList.length === 0);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Event Category Modals
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<EventCategory | null>(null);

  const initialCategoryFormState = {
    kode: '',
    nama: '',
    deskripsi: '',
    icon: 'category',
    warnaHex: '#0284c7',
    isAktif: true,
    urutan: 1,
  };
  const [categoryFormData, setCategoryFormData] = useState(initialCategoryFormState);

  // Common UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preset Colors & Icons for categories
  const PRESET_COLORS = [
    { label: 'Biru Cerah', hex: '#0284c7' },
    { label: 'Hijau Zamrud', hex: '#16a34a' },
    { label: 'Kuning Kunyit', hex: '#d97706' },
    { label: 'Ungu Elegan', hex: '#9333ea' },
    { label: 'Merah Bata', hex: '#dc2626' },
    { label: 'Slate / Abu', hex: '#475569' },
    { label: 'Toska Kemenag', hex: '#005a71' },
    { label: 'Teal Laut', hex: '#0d9488' },
  ];

  const PRESET_ICONS = [
    { name: 'category', label: 'Umum' },
    { name: 'devices', label: 'Digital / Komputer' },
    { name: 'menu_book', label: 'Quran / Mushaf' },
    { name: 'handyman', label: 'Kriya / Vokasi' },
    { name: 'sign_language', label: 'Isyarat Tuli' },
    { name: 'groups', label: 'Komunitas / Publik' },
    { name: 'school', label: 'Pendidikan' },
    { name: 'emoji_events', label: 'Prestasi' },
    { name: 'palette', label: 'Seni & Kaligrafi' },
    { name: 'psychology', label: 'Sensori / Inklusif' },
    { name: 'auto_stories', label: 'Literasi' },
    { name: 'record_voice_over', label: 'Tilawah' },
  ];

  // Sync with props
  useEffect(() => {
    if (disabilitiesList && disabilitiesList.length > 0) {
      setDisabilities(disabilitiesList);
      setIsLoadingDisabilities(false);
    }
  }, [disabilitiesList]);

  useEffect(() => {
    if (eventCategoriesList && eventCategoriesList.length > 0) {
      setEventCategories(eventCategoriesList);
      setIsLoadingCategories(false);
    }
  }, [eventCategoriesList]);

  // Fetch initial data if missing
  const fetchDisabilities = async () => {
    setIsLoadingDisabilities(true);
    try {
      const res = await fetch('/api/disabilities');
      if (res.ok) {
        const data = await res.json();
        const items = data.disabilities || data.data || [];
        setDisabilities(items);
        if (onDisabilitiesChange) onDisabilitiesChange(items);
      }
    } catch (err) {
      console.error('Failed to load disabilities:', err);
    } finally {
      setIsLoadingDisabilities(false);
    }
  };

  const fetchEventCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('/api/event-categories');
      if (res.ok) {
        const data = await res.json();
        const items = data.categories || data.data || [];
        setEventCategories(items);
        if (onEventCategoriesChange) onEventCategoriesChange(items);
      }
    } catch (err) {
      console.error('Failed to load event categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (!disabilitiesList || disabilitiesList.length === 0) {
      fetchDisabilities();
    }
    if (!eventCategoriesList || eventCategoriesList.length === 0) {
      fetchEventCategories();
    }
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // ==================== DISABILITY HANDLERS ====================
  const handleOpenAddDisability = () => {
    setDisabilityFormData(initialDisabilityFormState);
    setIsAddDisabilityModalOpen(true);
  };

  const handleOpenEditDisability = (item: DisabilityMaster) => {
    setEditingDisability(item);
    setDisabilityFormData({
      kode: item.kode,
      nama: item.nama,
      kategoriUtama: item.kategoriUtama,
      deskripsi: item.deskripsi,
      metodePembelajaran: item.metodePembelajaran,
      fasilitasInput: (item.fasilitasRekomendasi || []).join(', '),
      icon: item.icon,
      warnaHex: item.warnaHex,
      isAktif: item.isAktif,
    });
  };

  const handleSaveAddDisability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabilityFormData.nama.trim() || !disabilityFormData.kode.trim()) {
      alert('Nama dan kode kategori disabilitas wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const facilities = disabilityFormData.fasilitasInput
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);

      const res = await fetch('/api/disabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kode: disabilityFormData.kode.toLowerCase().replace(/\s+/g, '_'),
          nama: disabilityFormData.nama,
          kategoriUtama: disabilityFormData.kategoriUtama,
          deskripsi: disabilityFormData.deskripsi,
          metodePembelajaran: disabilityFormData.metodePembelajaran,
          fasilitasRekomendasi: facilities,
          icon: disabilityFormData.icon || 'accessible',
          warnaHex: disabilityFormData.warnaHex,
          isAktif: disabilityFormData.isAktif,
        }),
      });

      const data = await res.json();
      const savedItem = data.item || data.disability;
      if (res.ok && savedItem) {
        const updated = [savedItem, ...(Array.isArray(disabilities) ? disabilities : [])];
        setDisabilities(updated);
        if (onDisabilitiesChange) onDisabilitiesChange(updated);
        setIsAddDisabilityModalOpen(false);
        showNotification('success', `Ragam Disabilitas "${savedItem.nama}" berhasil ditambahkan.`);
      } else {
        alert(data.error || 'Gagal menambahkan data');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditDisability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisability) return;

    setIsSubmitting(true);
    try {
      const facilities = disabilityFormData.fasilitasInput
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);

      const res = await fetch(`/api/disabilities/${editingDisability.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kode: disabilityFormData.kode.toLowerCase().replace(/\s+/g, '_'),
          nama: disabilityFormData.nama,
          kategoriUtama: disabilityFormData.kategoriUtama,
          deskripsi: disabilityFormData.deskripsi,
          metodePembelajaran: disabilityFormData.metodePembelajaran,
          fasilitasRekomendasi: facilities,
          icon: disabilityFormData.icon,
          warnaHex: disabilityFormData.warnaHex,
          isAktif: disabilityFormData.isAktif,
        }),
      });

      const data = await res.json();
      const savedItem = data.item || data.disability;
      if (res.ok && savedItem) {
        const updated = (Array.isArray(disabilities) ? disabilities : []).map(d =>
          d.id === editingDisability.id ? savedItem : d
        );
        setDisabilities(updated);
        if (onDisabilitiesChange) onDisabilitiesChange(updated);
        setEditingDisability(null);
        showNotification('success', `Ragam Disabilitas "${savedItem.nama}" berhasil diperbarui.`);
      } else {
        alert(data.error || 'Gagal memperbarui data');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDisabilityStatus = async (item: DisabilityMaster) => {
    try {
      const updatedItem = { ...item, isAktif: !item.isAktif };
      const res = await fetch(`/api/disabilities/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
      const data = await res.json();
      const savedItem = data.item || data.disability;
      if (res.ok && savedItem) {
        const updated = (Array.isArray(disabilities) ? disabilities : []).map(d =>
          d.id === item.id ? savedItem : d
        );
        setDisabilities(updated);
        if (onDisabilitiesChange) onDisabilitiesChange(updated);
        showNotification(
          'success',
          `Status "${savedItem.nama}" diubah: ${savedItem.isAktif ? 'Aktif' : 'Nonaktif'}`
        );
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteDisabilityConfirm = async () => {
    if (!deletingDisability) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/disabilities/${deletingDisability.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = (Array.isArray(disabilities) ? disabilities : []).filter(d => d.id !== deletingDisability.id);
        setDisabilities(updated);
        if (onDisabilitiesChange) onDisabilitiesChange(updated);
        showNotification('success', `Ragam Disabilitas "${deletingDisability.nama}" berhasil dihapus.`);
        setDeletingDisability(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus data');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan teknis');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== EVENT CATEGORY HANDLERS ====================
  const handleOpenAddCategory = () => {
    setCategoryFormData({
      ...initialCategoryFormState,
      urutan: eventCategories.length + 1,
    });
    setIsAddCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: EventCategory) => {
    setEditingCategory(cat);
    setCategoryFormData({
      kode: cat.kode,
      nama: cat.nama,
      deskripsi: cat.deskripsi || '',
      icon: cat.icon || 'category',
      warnaHex: cat.warnaHex || '#0284c7',
      isAktif: cat.isAktif ?? true,
      urutan: cat.urutan || 1,
    });
  };

  const handleSaveAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.nama.trim()) {
      alert('Nama Kategori Event wajib diisi.');
      return;
    }

    const kodeToSave = (categoryFormData.kode.trim() || categoryFormData.nama.trim().split(' ')[0])
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .trim();

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/event-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kode: kodeToSave,
          nama: categoryFormData.nama.trim(),
          deskripsi: categoryFormData.deskripsi.trim(),
          icon: categoryFormData.icon || 'category',
          warnaHex: categoryFormData.warnaHex || '#0284c7',
          isAktif: categoryFormData.isAktif,
          urutan: Number(categoryFormData.urutan || eventCategories.length + 1),
        }),
      });

      const data = await res.json();
      const savedCategory = data.category || data.item;
      if (res.ok && savedCategory) {
        const updated = [...(Array.isArray(eventCategories) ? eventCategories : []), savedCategory];
        setEventCategories(updated);
        if (onEventCategoriesChange) onEventCategoriesChange(updated);
        setIsAddCategoryModalOpen(false);
        showNotification('success', `Kategori Event "${savedCategory.nama}" berhasil ditambahkan ke Homepage.`);
      } else {
        alert(data.error || 'Gagal menambahkan kategori event');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!categoryFormData.nama.trim()) {
      alert('Nama Kategori Event wajib diisi.');
      return;
    }

    const kodeToSave = (categoryFormData.kode.trim() || categoryFormData.nama.trim().split(' ')[0])
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .trim();

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/event-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kode: kodeToSave,
          nama: categoryFormData.nama.trim(),
          deskripsi: categoryFormData.deskripsi.trim(),
          icon: categoryFormData.icon,
          warnaHex: categoryFormData.warnaHex,
          isAktif: categoryFormData.isAktif ?? true,
          urutan: Number(categoryFormData.urutan || 1),
        }),
      });

      const data = await res.json();
      const savedCategory = data.category || data.item;
      if (res.ok && savedCategory) {
        const updated = (Array.isArray(eventCategories) ? eventCategories : []).map(c =>
          c.id === editingCategory.id ? savedCategory : c
        );
        setEventCategories(updated);
        if (onEventCategoriesChange) onEventCategoriesChange(updated);
        setEditingCategory(null);
        showNotification(
          'success',
          `Kategori Event "${savedCategory.nama}" berhasil diperbarui. Seluruh event dan filter homepage telah disinkronkan.`
        );
      } else {
        alert(data.error || 'Gagal memperbarui kategori event');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (cat: EventCategory) => {
    try {
      const updatedCat = { ...cat, isAktif: !cat.isAktif };
      const res = await fetch(`/api/event-categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCat),
      });
      const data = await res.json();
      const savedCategory = data.category || data.item;
      if (res.ok && savedCategory) {
        const updated = (Array.isArray(eventCategories) ? eventCategories : []).map(c =>
          c.id === cat.id ? savedCategory : c
        );
        setEventCategories(updated);
        if (onEventCategoriesChange) onEventCategoriesChange(updated);
        showNotification(
          'success',
          `Status Kategori "${savedCategory.nama}" diubah menjadi: ${savedCategory.isAktif ? 'Aktif (Tampil di Homepage)' : 'Nonaktif (Disembunyikan)'}`
        );
      }
    } catch (err) {
      console.error('Error toggling category status:', err);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/event-categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = (Array.isArray(eventCategories) ? eventCategories : []).filter(c => c.id !== deletingCategory.id);
        setEventCategories(updated);
        if (onEventCategoriesChange) onEventCategoriesChange(updated);
        showNotification(
          'success',
          `Kategori Event "${deletingCategory.nama}" berhasil dihapus dari Homepage dan event disinkronkan.`
        );
        setDeletingCategory(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus kategori event');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan teknis');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to compute related events for an event category
  const getRelatedEventsForCategory = (cat: EventCategory) => {
    const n = cat.nama.toLowerCase();
    const k = cat.kode.toLowerCase();
    return events.filter(ev => {
      const j = (ev.jenisEvent || '').toLowerCase();
      const title = (ev.namaKegiatan || '').toLowerCase();
      const desc = (ev.deskripsiPelatihan || '').toLowerCase();
      if (j === n || j === k) return true;
      if (cat.kode === 'Orang Umum' || cat.kode === 'Umum') {
        return j.includes('umum') || title.includes('umum') || desc.includes('umum');
      }
      return j.includes(k) || (k.length > 3 && title.includes(k));
    });
  };

  // Helper to compute concrete relation to Website Utama for a disability
  const getRelatedEventsForDisability = (item: DisabilityMaster) => {
    const k = item.kode.toLowerCase();
    const nameKeywords = item.nama
      .toLowerCase()
      .replace(/[()/]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4);

    return events.filter(ev => {
      const text = `${ev.jenisEvent} ${ev.namaKegiatan} ${ev.deskripsiPelatihan} ${(ev.kebutuhanPeserta || []).join(' ')}`.toLowerCase();
      if (text.includes(k)) return true;
      return nameKeywords.some(w => text.includes(w));
    });
  };

  const getRelatedCommunities = (item: DisabilityMaster) => {
    const k = item.kode.toLowerCase();
    return communities.filter(c => {
      if (!c.kategoriDisabilitas) return false;
      return c.kategoriDisabilitas.some(cat => {
        const catStr = String(cat).toLowerCase();
        return catStr === k || k.includes(catStr) || catStr.includes(k);
      });
    });
  };

  const getRelatedParticipants = (item: DisabilityMaster) => {
    const k = item.kode.toLowerCase();
    return participants.filter(p => {
      const pCat = String(p.kategoriDisabilitas || '').toLowerCase();
      return pCat === k || k.includes(pCat) || pCat.includes(k);
    });
  };

  // Filtered lists
  const filteredDisabilities = (Array.isArray(disabilities) ? disabilities : []).filter(item => {
    const query = disabilitySearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.nama.toLowerCase().includes(query) ||
      item.kode.toLowerCase().includes(query) ||
      item.kategoriUtama.toLowerCase().includes(query) ||
      item.deskripsi.toLowerCase().includes(query)
    );
  });

  const filteredCategories = (Array.isArray(eventCategories) ? eventCategories : []).filter(cat => {
    const query = categorySearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      cat.nama.toLowerCase().includes(query) ||
      cat.kode.toLowerCase().includes(query) ||
      (cat.deskripsi || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-md text-white flex items-center gap-2 text-[13px] font-medium animate-in fade-in ${
            feedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          <Icon name={feedback.type === 'success' ? 'check_circle' : 'error'} className="text-[18px]" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="pb-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-800">
            Kelola Disabilitas & Kategori
          </h1>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Pusat konfigurasi master ragam disabilitas serta kategori event yang terhubung dengan filter Homepage.
          </p>
        </div>

        {/* Action Button based on Active Tab */}
        <div>
          {activeTab === 'disabilities' ? (
            <button
              onClick={handleOpenAddDisability}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#007bff] hover:bg-blue-600 text-white rounded-md text-[13px] font-medium shadow-xs transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-bold leading-none">+</span>
              <span>Tambah Ragam Disabilitas</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[13px] font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Icon name="add_circle" className="text-[16px]" />
              <span>Tambah Kategori Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Clean Tab Bar Separating Both Features */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('disabilities')}
          className={`pb-3 px-4 font-semibold text-[13.5px] flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'disabilities'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon name="accessibility_new" className="text-[18px]" />
          <span>Ragam Disabilitas</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
            {disabilities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('event_categories')}
          className={`pb-3 px-4 font-semibold text-[13.5px] flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'event_categories'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon name="category" className="text-[18px]" />
          <span>Kategori Event Homepage</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
            {eventCategories.length}
          </span>
        </button>
      </div>

      {/* ==================== TAB 1: RAGAM DISABILITAS ==================== */}
      {activeTab === 'disabilities' && (
        <div className="bg-white rounded-md border border-gray-200 shadow-xs p-5 space-y-4">
          {/* Search bar */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <span className="text-[12px] text-gray-500">
              Menampilkan {filteredDisabilities.length} dari {disabilities.length} ragam disabilitas
            </span>
            <input
              type="text"
              placeholder="Cari ragam disabilitas..."
              value={disabilitySearchQuery}
              onChange={e => setDisabilitySearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Table layout matching screenshot columns: #, Nama, Relasi, Action */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700 text-[13px] font-bold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4 w-44">Kategori Utama</th>
                  <th className="py-3 px-4">Relasi Terarah (Website Utama)</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {isLoadingDisabilities ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                      <p>Memuat ragam disabilitas...</p>
                    </td>
                  </tr>
                ) : filteredDisabilities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      Tidak ada ragam disabilitas ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredDisabilities.map((item, index) => {
                    const relEvents = getRelatedEventsForDisability(item);
                    const relComms = getRelatedCommunities(item);
                    const relParts = getRelatedParticipants(item);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Row number (#) */}
                        <td className="py-3.5 px-4 font-bold text-gray-800 text-center align-middle">
                          {index + 1}
                        </td>

                        {/* Nama */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="font-semibold text-gray-900">{item.nama}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold">
                              {item.kode}
                            </span>
                            {item.metodePembelajaran && (
                              <span className="truncate max-w-xs text-gray-400">
                                • {item.metodePembelajaran}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Kategori Utama */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-medium rounded">
                            {item.kategoriUtama}
                          </span>
                        </td>

                        {/* Relasi Terarah ke Website Utama */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onNavigateToDashboard && onNavigateToDashboard('events', item.nama)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11.5px] font-medium transition-colors cursor-pointer border border-blue-200"
                              title={`Buka Dashboard Event dengan filter "${item.nama}"`}
                            >
                              <Icon name="event" className="text-[13px]" />
                              <span>{relEvents.length} Event</span>
                              <Icon name="arrow_outward" className="text-[11px]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onNavigateToDashboard && onNavigateToDashboard('map', item.kode)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11.5px] font-medium transition-colors cursor-pointer border border-emerald-200"
                              title={`Buka Dashboard Peta dengan filter "${item.kode}"`}
                            >
                              <Icon name="public" className="text-[13px]" />
                              <span>{relComms.length} Lembaga di Peta</span>
                              <Icon name="arrow_outward" className="text-[11px]" />
                            </button>

                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] font-medium"
                              title="Jumlah pendaftar santri dengan kategori ini"
                            >
                              <Icon name="person" className="text-[12px]" />
                              <span>{relParts.length} Santri</span>
                            </span>
                          </div>
                        </td>

                        {/* Status (Aktif / Nonaktif Toggle) */}
                        <td className="py-3.5 px-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleToggleDisabilityStatus(item)}
                            className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                              item.isAktif
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {item.isAktif ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDisability(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit Ragam Disabilitas"
                            >
                              <Icon name="edit" className="text-[17px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingDisability(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Hapus Ragam Disabilitas"
                            >
                              <Icon name="delete" className="text-[17px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: KATEGORI EVENT HOMEPAGE ==================== */}
      {activeTab === 'event_categories' && (
        <div className="bg-white rounded-md border border-gray-200 shadow-xs p-5 space-y-4">
          {/* Synchronized Notice Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-3 text-blue-900">
            <Icon name="sync" className="text-blue-600 text-[20px] shrink-0 mt-0.5" />
            <div className="text-[12.5px] leading-relaxed">
              <span className="font-bold">Sinkronisasi Otomatis Homepage & Pelatihan:</span>
              <p className="text-blue-800 text-[12px] mt-0.5">
                Kategori event di bawah ini terhubung langsung dengan dropdown filter <strong>Kategori Event</strong> di Homepage publik.
                Jika Anda <strong>mengubah</strong> atau <strong>menghapus</strong> kategori, seluruh event yang terhubung serta filter di homepage akan otomatis diperbarui dan diselaraskan.
              </p>
            </div>
          </div>

          {/* Search bar & info */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <span className="text-[12px] text-gray-500">
              Menampilkan {filteredCategories.length} dari {eventCategories.length} kategori event
            </span>
            <input
              type="text"
              placeholder="Cari kategori event..."
              value={categorySearchQuery}
              onChange={e => setCategorySearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Event Categories Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700 text-[13px] font-bold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Kategori Event (Homepage)</th>
                  <th className="py-3 px-4">Deskripsi Program</th>
                  <th className="py-3 px-4 w-44 text-center">Event Terhubung</th>
                  <th className="py-3 px-4 w-32 text-center">Status Homepage</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {isLoadingCategories ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                      <p>Memuat kategori event...</p>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      Tidak ada kategori event ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, index) => {
                    const relEvents = getRelatedEventsForCategory(cat);

                    return (
                      <tr key={cat.id || cat.kode} className="hover:bg-gray-50/70 transition-colors">
                        {/* Row number */}
                        <td className="py-3.5 px-4 font-bold text-gray-800 text-center align-middle">
                          {index + 1}
                        </td>

                        {/* Kategori Name with badge and icon */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: cat.warnaHex || '#0284c7' }}
                            >
                              <Icon name={cat.icon || 'category'} className="text-[19px]" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                <span>{cat.nama}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold">
                                  ID: {cat.kode}
                                </span>
                                <span className="text-gray-400">• Urutan #{cat.urutan || index + 1}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Deskripsi */}
                        <td className="py-3.5 px-4 align-middle text-gray-600 max-w-xs">
                          <p className="line-clamp-2 text-[12px]">
                            {cat.deskripsi || 'Tidak ada deskripsi'}
                          </p>
                        </td>

                        {/* Event Terhubung Relation Button */}
                        <td className="py-3.5 px-4 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => onNavigateToDashboard && onNavigateToDashboard('events', cat.nama)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[12px] font-medium transition-colors cursor-pointer border border-blue-200"
                            title={`Filter event di Homepage dengan kategori "${cat.nama}"`}
                          >
                            <Icon name="event" className="text-[15px]" />
                            <span className="font-bold">{relEvents.length} Event</span>
                            <Icon name="arrow_outward" className="text-[13px]" />
                          </button>
                        </td>

                        {/* Status Homepage Toggle */}
                        <td className="py-3.5 px-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryStatus(cat)}
                            className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                              cat.isAktif
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            title="Klik untuk mengubah visibilitas di Homepage"
                          >
                            {cat.isAktif ? 'Tampil' : 'Disembunyikan'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit Kategori Event (Otomatis sinkronkan event)"
                            >
                              <Icon name="edit" className="text-[17px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCategory(cat)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Hapus Kategori Event"
                            >
                              <Icon name="delete" className="text-[17px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT DISABILITY ==================== */}
      {(isAddDisabilityModalOpen || editingDisability) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-[16px] text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Icon name="accessibility_new" className="text-[24px] text-blue-600" />
              <span>{editingDisability ? 'Edit Ragam Disabilitas' : 'Tambah Ragam Disabilitas'}</span>
            </h3>

            <form onSubmit={editingDisability ? handleSaveEditDisability : handleSaveAddDisability} className="space-y-3.5 text-[13px]">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Nama Ragam Disabilitas *</label>
                <input
                  type="text"
                  placeholder="Contoh: Tunanetra (Braille)"
                  value={disabilityFormData.nama}
                  onChange={e => setDisabilityFormData({ ...disabilityFormData, nama: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Kode Identifier *</label>
                  <input
                    type="text"
                    placeholder="Contoh: tunanetra"
                    value={disabilityFormData.kode}
                    onChange={e => setDisabilityFormData({ ...disabilityFormData, kode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Kategori Utama</label>
                  <select
                    value={disabilityFormData.kategoriUtama}
                    onChange={e => setDisabilityFormData({ ...disabilityFormData, kategoriUtama: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Sensorik">Sensorik</option>
                    <option value="Fisik">Fisik</option>
                    <option value="Intelektual">Intelektual</option>
                    <option value="Mental">Mental</option>
                    <option value="Ganda">Ganda</option>
                    <option value="Umum">Umum / Non-Disabilitas</option>
                    <option value="Lainnya"></option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan ringkas ragam disabilitas..."
                  value={disabilityFormData.deskripsi}
                  onChange={e => setDisabilityFormData({ ...disabilityFormData, deskripsi: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Metode Pembelajaran Quran</label>
                <input
                  type="text"
                  placeholder="Contoh: Al-Quran Braille dan audio"
                  value={disabilityFormData.metodePembelajaran}
                  onChange={e => setDisabilityFormData({ ...disabilityFormData, metodePembelajaran: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Fasilitas Rekomendasi (Pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="Mushaf Braille, Audio Quran, JBI"
                  value={disabilityFormData.fasilitasInput}
                  onChange={e => setDisabilityFormData({ ...disabilityFormData, fasilitasInput: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="statusAktifDisability"
                  checked={disabilityFormData.isAktif}
                  onChange={e => setDisabilityFormData({ ...disabilityFormData, isAktif: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="statusAktifDisability" className="text-gray-700 font-medium cursor-pointer text-[12.5px]">
                  Aktifkan di filter Dashboard Event & Peta Komunitas
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddDisabilityModalOpen(false);
                    setEditingDisability(null);
                  }}
                  className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-[13px] font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#007bff] hover:bg-blue-600 text-white rounded text-[13px] font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT EVENT CATEGORY ==================== */}
      {(isAddCategoryModalOpen || editingCategory) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-[16px] text-gray-800 mb-1 flex items-center gap-2">
              <Icon name="category" className="text-[24px] text-emerald-600" />
              <span>{editingCategory ? 'Edit Kategori Event Homepage' : 'Tambah Kategori Event Homepage'}</span>
            </h3>
            <p className="text-[12px] text-gray-500 mb-4 pb-2 border-b border-gray-100">
              Kategori ini akan langsung muncul pada filter pencarian event di Homepage publik.
            </p>

            <form onSubmit={editingCategory ? handleSaveEditCategory : handleSaveAddCategory} className="space-y-3.5 text-[13px]">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Nama Kategori Event *</label>
                <input
                  type="text"
                  placeholder="Contoh: Teknologi & Digital, Tahfidz & Quran"
                  value={categoryFormData.nama}
                  onChange={e => {
                    const newNama = e.target.value;
                    setCategoryFormData(prev => ({
                      ...prev,
                      nama: newNama,
                      kode: prev.kode || newNama.split(' ')[0].replace(/[^a-zA-Z0-9]/g, ''),
                    }));
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Kode / Slug Filter *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Teknologi"
                    value={categoryFormData.kode}
                    onChange={e => setCategoryFormData({ ...categoryFormData, kode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-gray-400">Digunakan untuk parameter filter homepage</span>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Urutan Tampilan</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={categoryFormData.urutan}
                    onChange={e => setCategoryFormData({ ...categoryFormData, urutan: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Deskripsi Kategori</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat tentang fokus materi atau target pelatihan ini..."
                  value={categoryFormData.deskripsi}
                  onChange={e => setCategoryFormData({ ...categoryFormData, deskripsi: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Warna Badge Kategori</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, warnaHex: c.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        categoryFormData.warnaHex === c.hex ? 'border-gray-900 scale-110 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {categoryFormData.warnaHex === c.hex && (
                        <Icon name="check" className="text-white text-[15px]" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={categoryFormData.warnaHex}
                    onChange={e => setCategoryFormData({ ...categoryFormData, warnaHex: e.target.value })}
                    className="w-7 h-7 p-0 rounded-full border-0 cursor-pointer"
                    title="Pilih warna kustom"
                  />
                  <span className="font-mono text-xs text-gray-500">{categoryFormData.warnaHex}</span>
                </div>
              </div>

              {/* Icon Presets */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Icon Kategori</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-gray-50 rounded border border-gray-200">
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, icon: ic.name })}
                      className={`p-2 rounded text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        categoryFormData.icon === ic.name
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                      title={ic.label}
                    >
                      <Icon name={ic.name} className="text-[18px]" />
                      <span className="text-[9.5px] truncate w-full">{ic.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="statusAktifCategory"
                  checked={categoryFormData.isAktif}
                  onChange={e => setCategoryFormData({ ...categoryFormData, isAktif: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="statusAktifCategory" className="text-gray-700 font-medium cursor-pointer text-[12.5px]">
                  Tampilkan kategori ini pada filter dropdown di Homepage
                </label>
              </div>

              {/* Notice on Cascade Edit */}
              {editingCategory && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11.5px] flex items-center gap-2">
                  <Icon name="info" className="text-amber-600 text-[17px] shrink-0" />
                  <span>
                    Perubahan nama kategori akan otomatis memperbarui seluruh data event terkait di sistem.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-[13px] font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[13px] font-medium disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE DISABILITY MODAL ==================== */}
      {deletingDisability && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 border border-gray-200 shadow-xl">
            <h3 className="font-bold text-[15px] text-gray-900 mb-2">
              Hapus Ragam Disabilitas?
            </h3>
            <p className="text-[13px] text-gray-600 mb-4">
              Apakah Anda yakin ingin menghapus <strong>"{deletingDisability.nama}"</strong>?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingDisability(null)}
                className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-[13px] font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteDisabilityConfirm}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[13px] font-medium disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE EVENT CATEGORY MODAL ==================== */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 border border-gray-200 shadow-xl">
            <div className="flex items-center gap-2.5 text-red-600 mb-2 font-bold text-[15px]">
              <Icon name="warning" className="text-[20px]" />
              <h3>Hapus Kategori Event Homepage?</h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-3">
              Apakah Anda yakin ingin menghapus kategori <strong>"{deletingCategory.nama}"</strong>?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[12px] mb-4">
              <p className="font-semibold mb-1">Dampak Sinkronisasi:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Kategori ini akan dihilangkan dari opsi filter dropdown di Homepage.</li>
                <li>Event pelatihan yang terkait dengan kategori ini akan disinkronkan ke kategori umum agar tetap tampil konsisten.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded text-[13px] font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteCategoryConfirm}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[13px] font-medium disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Hapus & Sinkronkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
