import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { User } from '../types.ts';
import { PartnerLogo } from './PartnerLogo.tsx';
import { VerifiedBadge } from './VerifiedBadge.tsx';

interface UserManagementProps {
  users: User[];
  currentUser?: User | null;
  onUserUpdated: (updatedUser: User) => void;
  onUserDeleted: (deletedUserId: string) => void;
  onSuperadminCreated: (newUser: User) => void;
  onMitraCreated: (newMitra: User) => void;
  showToast?: (msg: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onUserUpdated,
  onUserDeleted,
  onSuperadminCreated,
  onMitraCreated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'superadmin' | 'mitra'>('mitra');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [orgLogo, setOrgLogo] = useState<string>('');
  const [addLogoTab, setAddLogoTab] = useState<'upload' | 'url'>('upload');
  const [addLogoUrlInput, setAddLogoUrlInput] = useState<string>('');
  const [isCompressingAddOrgLogo, setIsCompressingAddOrgLogo] = useState(false);
  const [province, setProvince] = useState('Jawa Timur');
  const [city, setCity] = useState('');

  // Quick Logo Management Modal for Mitra
  const [logoModalUser, setLogoModalUser] = useState<User | null>(null);
  const [logoModalPreview, setLogoModalPreview] = useState<string>('');
  const [logoModalUrlInput, setLogoModalUrlInput] = useState<string>('');
  const [logoModalTab, setLogoModalTab] = useState<'upload' | 'url'>('upload');
  const [isSavingModalLogo, setIsSavingModalLogo] = useState(false);
  const [modalLogoError, setModalLogoError] = useState<string | null>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'superadmin' | 'mitra'>('mitra');
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgLogo, setEditOrgLogo] = useState<string | undefined>(undefined);
  const [editLogoTab, setEditLogoTab] = useState<'upload' | 'url'>('upload');
  const [editLogoUrlInput, setEditLogoUrlInput] = useState<string>('');
  const [isCompressingOrgLogo, setIsCompressingOrgLogo] = useState(false);
  const [editProvince, setEditProvince] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | undefined>(undefined);
  const [editBio, setEditBio] = useState('');
  const [editModalSection, setEditModalSection] = useState<'info' | 'branding'>('info');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);

  // Deleting user state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const filteredUsers = users.filter((u) => u.role === activeTab);

  // Open Edit Modal with user data populated
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditModalSection('info');
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditOrgName(user.organizationName || '');
    const currentLogo = user.organizationLogo || '';
    setEditOrgLogo(currentLogo);
    setEditLogoUrlInput(currentLogo);
    setEditLogoTab(currentLogo.startsWith('http') ? 'url' : 'upload');
    setEditProvince(user.province || '');
    setEditCity(user.city || '');
    setEditAvatar(user.avatar || '');
    setEditBio(user.bio || '');
  };

  const handleOpenLogoModal = (user: User) => {
    setLogoModalUser(user);
    const currentLogo = user.organizationLogo || '';
    setLogoModalPreview(currentLogo);
    setLogoModalUrlInput(currentLogo);
    setLogoModalTab(currentLogo.startsWith('http') ? 'url' : 'upload');
    setModalLogoError(null);
  };

  const handleCloseLogoModal = () => {
    setLogoModalUser(null);
    setLogoModalPreview('');
    setLogoModalUrlInput('');
    setModalLogoError(null);
    setIsSavingModalLogo(false);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setIsSavingEdit(false);
  };

  // Profile Photo Upload & Compression (Super Admin only)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang berhak mengubah foto profil.');
      return;
    }

    setIsCompressingAvatar(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setEditAvatar(compressedBase64);
        }
        setIsCompressingAvatar(false);
      };
      img.onerror = () => {
        setIsCompressingAvatar(false);
        alert('Gagal memproses gambar foto profil.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang berhak mengubah foto profil.');
      return;
    }
    setEditAvatar('');
  };

  // Partner Organization Logo Compression & Upload (Super Admin manageable)
  const compressLogoImage = (
    file: File,
    onSuccess: (base64: string) => void,
    onError: (err: string) => void,
    setLoading: (val: boolean) => void
  ) => {
    setLoading(true);
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        onSuccess(e.target?.result as string);
        setLoading(false);
      };
      reader.onerror = () => {
        onError('Gagal memproses file SVG logo.');
        setLoading(false);
      };
      reader.readAsDataURL(file);
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
          onSuccess(compressed);
        }
        setLoading(false);
      };
      img.onerror = () => {
        setLoading(false);
        onError('Gagal memproses format gambar logo.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOrgLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressLogoImage(
      file,
      (base64) => {
        setEditOrgLogo(base64);
        setEditLogoUrlInput('');
      },
      (msg) => alert(msg),
      setIsCompressingOrgLogo
    );
    e.target.value = '';
  };

  const handleRemoveOrgLogo = () => {
    setEditOrgLogo('');
    setEditLogoUrlInput('');
  };

  const handleAddOrgLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressLogoImage(
      file,
      (base64) => {
        setOrgLogo(base64);
        setAddLogoUrlInput('');
      },
      (msg) => alert(msg),
      setIsCompressingAddOrgLogo
    );
    e.target.value = '';
  };

  const handleRemoveAddOrgLogo = () => {
    setOrgLogo('');
    setAddLogoUrlInput('');
  };

  // Dedicated Logo Modal Handlers
  const handleModalLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalLogoError('File harus berupa berkas gambar (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalLogoError('Ukuran file maksimal 5 MB.');
      return;
    }

    setModalLogoError(null);
    compressLogoImage(
      file,
      (base64) => {
        setLogoModalPreview(base64);
        setLogoModalUrlInput('');
      },
      (err) => setModalLogoError(err),
      () => {}
    );
    e.target.value = '';
  };

  const handleSaveModalLogo = async () => {
    if (!logoModalUser) return;
    setIsSavingModalLogo(true);
    setModalLogoError(null);

    const logoValue = (logoModalPreview || '').trim();

    try {
      // 1. Try dedicated logo endpoint
      let res = await fetch(`/api/users/${logoModalUser.id}/logo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationLogo: logoValue }),
      });

      if (!res.ok) {
        // Fallback to standard users endpoint
        res = await fetch(`/api/users/${logoModalUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationLogo: logoValue,
            name: logoModalUser.name,
            email: logoModalUser.email,
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.user) {
        onUserUpdated(data.user);
        if (showToast) {
          showToast(
            logoValue
              ? `Logo untuk "${data.user.organizationName || data.user.name}" berhasil diperbarui!`
              : `Logo untuk "${data.user.organizationName || data.user.name}" berhasil dihapus.`
          );
        }
        handleCloseLogoModal();
      } else {
        setModalLogoError(data.error || 'Gagal menyimpan logo mitra.');
      }
    } catch (err) {
      console.error(err);
      setModalLogoError('Terjadi kesalahan saat menyimpan logo mitra.');
    } finally {
      setIsSavingModalLogo(false);
    }
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingEdit(true);
    const payload = {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      role: isSuperAdmin ? editRole : editingUser.role,
      organizationName: editOrgName.trim(),
      organizationLogo: editOrgLogo,
      province: editProvince.trim(),
      city: editCity.trim(),
      bio: editBio.trim(),
      // Only Super Admin can change avatar
      ...(isSuperAdmin ? { avatar: editAvatar } : {}),
    };

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        onUserUpdated(data.user);
        if (showToast) {
          showToast(`Data pengguna "${data.user.name}" berhasil diperbarui.`);
        }
        handleCloseEdit();
      } else {
        alert(data.error || 'Gagal memperbarui data pengguna.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan perubahan pengguna.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (user: User) => {
    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang memiliki hak akses untuk menghapus pengguna.');
      return;
    }

    if (user.role === 'superadmin') {
      const totalSuperadmins = users.filter((u) => u.role === 'superadmin').length;
      if (totalSuperadmins <= 1) {
        alert('Tidak dapat menghapus Super Admin terakhir di sistem!');
        return;
      }
    }

    if (currentUser?.id === user.id) {
      if (
        !confirm(
          `Peringatan: Anda sedang login dengan akun "${user.name}". Menghapus akun ini akan mengakhiri sesi login Anda. Lanjutkan?`
        )
      ) {
        return;
      }
    } else {
      if (
        !confirm(
          `Apakah Anda yakin ingin menghapus pengguna "${user.name}" (${
            user.role === 'superadmin' ? 'Super Admin' : 'Mitra'
          })? Tindakan ini tidak dapat dibatalkan.`
        )
      ) {
        return;
      }
    }

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        onUserDeleted(user.id);
        if (showToast) {
          showToast(`Pengguna "${user.name}" berhasil dihapus.`);
        }
      } else {
        alert(data.error || 'Gagal menghapus pengguna.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghapus pengguna.');
    } finally {
      setDeletingId(null);
    }
  };

  // Add User Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name,
      email,
      phone,
      organizationName:
        activeTab === 'mitra'
          ? organizationName
          : 'Pusat Layanan Al-Quran Disabilitas Indonesia (PLQDI)',
      organizationLogo: activeTab === 'mitra' ? (orgLogo || null) : undefined,
      province,
      city,
    };

    try {
      const endpoint = activeTab === 'mitra' ? '/api/users/mitra' : '/api/users/superadmin';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        if (activeTab === 'mitra') {
          onMitraCreated(data.user);
        } else {
          onSuperadminCreated(data.user);
        }
        setShowAddForm(false);
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setOrganizationName('');
        setOrgLogo('');
        setCity('');
        if (showToast) {
          showToast(`Berhasil menambahkan ${data.user.name} sebagai ${activeTab}.`);
        }
      } else {
        alert(data.error || 'Gagal menambahkan user');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => {
            setActiveTab('mitra');
            setShowAddForm(false);
          }}
          className={`px-4 py-2 text-[13px] font-semibold rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'mitra'
              ? 'bg-surface-container text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          Mitra Penyelenggara ({users.filter((u) => u.role === 'mitra').length})
        </button>
        <button
          onClick={() => {
            setActiveTab('superadmin');
            setShowAddForm(false);
          }}
          className={`px-4 py-2 text-[13px] font-semibold rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'superadmin'
              ? 'bg-surface-container text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          Super Admin ({users.filter((u) => u.role === 'superadmin').length})
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-on-surface">
            Daftar {activeTab === 'mitra' ? 'Mitra Penyelenggara' : 'Super Administrator'}
          </h2>
          <p className="text-[12px] text-on-surface-variant">
            {activeTab === 'mitra'
              ? 'Kelola lembaga mitra penyelenggara pelatihan Al-Quran disabilitas se-Indonesia.'
              : 'Kelola akun administrator dengan hak akses penuh sistem.'}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary text-on-primary text-[13px] font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <Icon name={showAddForm ? 'close' : 'add'} className="text-[18px]" />
            {showAddForm ? 'Batal' : `Tambah ${activeTab === 'mitra' ? 'Mitra' : 'Admin'}`}
          </button>
        )}
      </div>

      {/* Add User Form */}
      {showAddForm && isSuperAdmin && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-[16px] font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Icon name="person_add" className="text-teal-800 text-[20px]" />
            Form Tambah {activeTab === 'mitra' ? 'Mitra Baru' : 'Super Admin Baru'}
          </h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-on-surface mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Ust. Ahmad Fauzi, M.Pd"
                className="w-full px-3 py-2 text-[13px] border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-on-surface mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@domain.org"
                className="w-full px-3 py-2 text-[13px] border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-on-surface mb-1.5">
                No WhatsApp
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 text-[13px] border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface"
              />
            </div>
            {activeTab === 'mitra' && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold text-on-surface mb-1.5">
                    Nama Lembaga / Yayasan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Yayasan Sahabat Difabel Mengaji"
                    className="w-full px-3 py-2 text-[13px] border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface"
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-16 rounded-xl bg-white border border-outline-variant/40 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs">
                      {orgLogo ? (
                        <img src={orgLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                      ) : (
                        <PartnerLogo name={organizationName || 'Mitra'} size="sm" className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <span className="block text-[13px] font-bold text-on-surface">Logo Mitra / Yayasan</span>
                      <span className="text-[11px] text-on-surface-variant">
                        Dapat berupa upload berkas gambar (PNG, JPG, SVG) atau tautan URL online logo yayasan.
                      </span>
                    </div>
                  </div>

                  {/* Tabs: Upload File / Input URL */}
                  <div className="flex items-center gap-2 border-b border-outline-variant/30 pt-1 text-[12px]">
                    <button
                      type="button"
                      onClick={() => setAddLogoTab('upload')}
                      className={`pb-1.5 font-semibold flex items-center gap-1 border-b-2 transition-colors cursor-pointer ${
                        addLogoTab === 'upload'
                          ? 'border-emerald-600 text-emerald-700'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Icon name="upload_file" className="text-[15px]" />
                      Unggah File
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddLogoTab('url')}
                      className={`pb-1.5 font-semibold flex items-center gap-1 border-b-2 transition-colors cursor-pointer ${
                        addLogoTab === 'url'
                          ? 'border-emerald-600 text-emerald-700'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Icon name="link" className="text-[15px]" />
                      Link URL Gambar
                    </button>
                  </div>

                  {addLogoTab === 'upload' ? (
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-[12px] font-semibold hover:bg-emerald-800 cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1.5">
                        <Icon name="upload_file" className="text-[16px]" />
                        <span>{isCompressingAddOrgLogo ? 'Memproses File...' : orgLogo ? 'Ganti File Logo' : 'Pilih Berkas Logo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={handleAddOrgLogoFileChange}
                        />
                      </label>
                      {orgLogo && (
                        <button
                          type="button"
                          onClick={handleRemoveAddOrgLogo}
                          className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-[12px] font-semibold transition-colors border border-red-200 cursor-pointer flex items-center gap-1"
                        >
                          <Icon name="delete" className="text-[15px]" />
                          <span>Hapus</span>
                        </button>
                      )}
                      <span className="text-[11px] text-on-surface-variant">PNG / JPG / SVG (Maks. 5MB)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={addLogoUrlInput}
                        onChange={(e) => {
                          setAddLogoUrlInput(e.target.value);
                          setOrgLogo(e.target.value);
                        }}
                        placeholder="https://example.org/logo.png"
                        className="flex-1 px-3 py-1.5 text-[12px] border border-outline-variant rounded-lg focus:outline-none focus:border-emerald-600 bg-surface-container-lowest text-on-surface"
                      />
                      {orgLogo && (
                        <button
                          type="button"
                          onClick={handleRemoveAddOrgLogo}
                          className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-[12px] font-semibold transition-colors border border-red-200 cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="block text-[12px] font-semibold text-on-surface mb-1.5">
                Provinsi
              </label>
              <input
                type="text"
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Jawa Barat"
                className="w-full px-3 py-2 text-[13px] border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-on-surface mb-1.5">
                Kota / Kabupaten
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kota Bandung"
                className="w-full px-3 py-2 text-[13px] border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface"
              />
            </div>
            <div className="md:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-primary text-on-primary text-[13px] font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80">
                <th className="px-4 py-3.5 text-[12px] font-semibold text-on-surface-variant">
                  Pengguna
                </th>
                {activeTab === 'mitra' && (
                  <th className="px-4 py-3.5 text-[12px] font-semibold text-on-surface-variant">
                    Lembaga
                  </th>
                )}
                <th className="px-4 py-3.5 text-[12px] font-semibold text-on-surface-variant">
                  Kontak
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-on-surface-variant">
                  Lokasi
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-on-surface-variant">
                  Tgl Bergabung
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-on-surface-variant text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'mitra' ? 6 : 5}
                    className="px-4 py-10 text-center text-on-surface-variant text-[13px]"
                  >
                    Belum ada data {activeTab === 'mitra' ? 'Mitra' : 'Super Admin'}.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-container-low/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover border border-outline-variant/40 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[14px] shrink-0 border border-primary/20">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-on-surface leading-snug">
                            {u.name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant truncate">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    {activeTab === 'mitra' && (
                      <td className="px-4 py-3 text-[13px] text-on-surface">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenLogoModal(u)}
                            title="Klik untuk Mengunggah atau Mengubah Logo Lembaga Ini"
                            className="group relative w-10 h-10 rounded-lg bg-white border border-outline-variant/40 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs hover:border-emerald-600 transition-colors cursor-pointer"
                          >
                            <PartnerLogo
                              name={u.organizationName || u.name}
                              logoUrl={u.organizationLogo}
                              size="sm"
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Icon name="edit" className="text-[16px]" />
                            </div>
                          </button>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-on-surface leading-tight truncate max-w-[200px] flex items-center gap-1.5">
                              <span className="truncate">{u.organizationName || '-'}</span>
                              <VerifiedBadge size="xs" />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenLogoModal(u)}
                              className="text-left cursor-pointer hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              {u.organizationLogo ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#0284c7] font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                                  <VerifiedBadge size="xs" />
                                  <span>Mitra Resmi · Ganti Logo</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-800 font-semibold bg-amber-50 px-1 rounded border border-amber-200 hover:bg-amber-100">
                                  <Icon name="add_photo_alternate" className="text-[12px]" />
                                  + Upload Logo
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-[13px] text-on-surface">
                      <span className="font-mono text-[12px]">{u.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-on-surface">
                      {u.city ? `${u.city}, ` : ''}
                      {u.province || '-'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-on-surface-variant">
                      {new Date(u.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {/* KELOLA LOGO MITRA KHUSUS TAB MITRA */}
                        {activeTab === 'mitra' && (
                          <button
                            onClick={() => handleOpenLogoModal(u)}
                            title="Unggah / Perbarui Logo Lembaga Mitra"
                            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Icon name="add_photo_alternate" className="text-[19px]" />
                          </button>
                        )}

                        {/* ICON EDIT */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit Data Diri & Foto Profil"
                          className="p-1.5 rounded-lg text-primary hover:text-primary-dark hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <Icon name="edit" className="text-[19px]" />
                        </button>

                        {/* ICON HAPUS */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingId === u.id}
                            title="Hapus Pengguna"
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Icon name={deletingId === u.id ? 'hourglass_empty' : 'delete'} className="text-[19px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP-UP MODAL EDIT DATA DIRI & FOTO PROFIL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full border border-slate-200/90 shadow-2xl shadow-slate-950/20 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                  {editingUser.role === 'mitra' ? (
                    <PartnerLogo
                      name={editOrgName || editingUser.organizationName || editingUser.name}
                      logoUrl={editOrgLogo}
                      size="sm"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Icon name="admin_panel_settings" className="text-[22px]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-slate-900 truncate">
                    {editingUser.role === 'mitra' ? 'Edit Data Mitra Penyelenggara' : 'Edit Data Super Administrator'}
                  </h3>
                  <div className="flex items-center gap-2 text-[12px] text-slate-500">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{editingUser.name}</span>
                    <span className="text-slate-300">·</span>
                    <span className="truncate max-w-[200px]">{editingUser.organizationName || editingUser.email}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseEdit}
                aria-label="Tutup Modal"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Segmented Navigation Bar */}
            <div className="px-6 border-b border-slate-100 bg-white flex items-center gap-6 shrink-0">
              <button
                type="button"
                onClick={() => setEditModalSection('info')}
                className={`py-3 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  editModalSection === 'info'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon name="badge" className="text-[18px]" />
                <span>Informasi Lembaga & PIC</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalSection('branding')}
                className={`py-3 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  editModalSection === 'branding'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon name="palette" className="text-[18px]" />
                <span>Logo & Identitas Visual</span>
                {editOrgLogo ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Terpasang
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Logo Sistem
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                {editModalSection === 'info' ? (
                  /* TAB 1: INFORMASI LEMBAGA & PIC */
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Bagian Penanggung Jawab (PIC) */}
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-2 text-[12px] font-bold text-on-surface uppercase tracking-wider">
                        <Icon name="person" className="text-primary text-[18px]" />
                        <span>Data Penanggung Jawab (PIC)</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[12px] font-semibold text-on-surface mb-1">
                            Nama Lengkap PIC <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Contoh: Ust. Ahmad Fauzi, M.Pd"
                            className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[12px] font-semibold text-on-surface mb-1">
                              Email Akun (Login) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="mitra@domain.id"
                              className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-semibold text-on-surface mb-1">
                              Nomor WhatsApp / HP <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="081234567890"
                              className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-outline-variant/20" />

                    {/* Bagian Lembaga & Domisili */}
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-2 text-[12px] font-bold text-on-surface uppercase tracking-wider">
                        <Icon name="corporate_fare" className="text-emerald-600 text-[18px]" />
                        <span>Profil Lembaga & Lokasi</span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[12px] font-semibold text-on-surface mb-1">
                              Nama Lembaga / Yayasan
                            </label>
                            <input
                              type="text"
                              value={editOrgName}
                              onChange={(e) => setEditOrgName(e.target.value)}
                              placeholder="Contoh: Yayasan Sahabat Netra Mengaji"
                              className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-semibold text-on-surface mb-1">
                              Peran (Role)
                            </label>
                            <select
                              disabled={!isSuperAdmin}
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as 'superadmin' | 'mitra')}
                              className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 bg-surface-container-lowest text-on-surface disabled:opacity-60 transition-all"
                            >
                              <option value="mitra">Mitra Penyelenggara</option>
                              <option value="superadmin">Super Administrator</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[12px] font-semibold text-on-surface mb-1">
                              Provinsi
                            </label>
                            <input
                              type="text"
                              value={editProvince}
                              onChange={(e) => setEditProvince(e.target.value)}
                              placeholder="Contoh: DKI Jakarta"
                              className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-semibold text-on-surface mb-1">
                              Kota / Kabupaten
                            </label>
                            <input
                              type="text"
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              placeholder="Contoh: Jakarta Selatan"
                              className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] font-semibold text-on-surface mb-1">
                            Bio / Catatan Khusus Profil
                          </label>
                          <textarea
                            rows={2}
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            placeholder="Catatan keahlian, tugas, atau profil singkat mitra..."
                            className="w-full px-3.5 py-2 text-[13px] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 bg-surface-container-lowest text-on-surface transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: LOGO RESMI & IDENTITAS VISUAL */
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Card 1: Logo Lembaga */}
                    <div className="p-4.5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="corporate_fare" className="text-emerald-600 text-[20px]" />
                          <span className="text-[13px] font-bold text-on-surface">Logo Resmi Lembaga / Yayasan</span>
                        </div>
                        {editOrgLogo ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Icon name="verified" className="text-[13px]" />
                            Logo Aktif
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant">Menggunakan Inisial Sistem</span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Preview Box */}
                        <div className="relative shrink-0 w-32 h-24 bg-white rounded-xl border border-outline-variant/40 flex items-center justify-center p-2 shadow-2xs overflow-hidden">
                          {editOrgLogo ? (
                            <img
                              src={editOrgLogo}
                              alt="Logo Mitra"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <PartnerLogo
                              name={editOrgName || editingUser.organizationName || editingUser.name}
                              size="md"
                              className="w-full h-full"
                            />
                          )}
                          {isCompressingOrgLogo && (
                            <div className="absolute inset-0 bg-black/60 text-white text-[10px] flex items-center justify-center font-bold">
                              Memproses...
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                          {/* Segmented Picker */}
                          <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1 text-[12px]">
                            <button
                              type="button"
                              onClick={() => setEditLogoTab('upload')}
                              className={`pb-1 font-semibold flex items-center gap-1 border-b-2 transition-colors cursor-pointer ${
                                editLogoTab === 'upload'
                                  ? 'border-emerald-600 text-emerald-700'
                                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              <Icon name="upload_file" className="text-[15px]" />
                              Unggah Berkas File
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditLogoTab('url')}
                              className={`pb-1 font-semibold flex items-center gap-1 border-b-2 transition-colors cursor-pointer ${
                                editLogoTab === 'url'
                                  ? 'border-emerald-600 text-emerald-700'
                                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              <Icon name="link" className="text-[15px]" />
                              Link URL Gambar
                            </button>
                          </div>

                          {editLogoTab === 'upload' ? (
                            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-[12px] font-semibold hover:bg-emerald-800 cursor-pointer transition-colors shadow-2xs">
                                <Icon name="upload_file" className="text-[16px]" />
                                <span>{isCompressingOrgLogo ? 'Memproses File...' : editOrgLogo ? 'Ganti File Logo' : 'Pilih Berkas Logo'}</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  className="hidden"
                                  onChange={handleOrgLogoFileChange}
                                />
                              </label>

                              {editOrgLogo && (
                                <button
                                  type="button"
                                  onClick={handleRemoveOrgLogo}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-[12px] font-semibold transition-colors cursor-pointer border border-red-200"
                                >
                                  <Icon name="delete" className="text-[15px]" />
                                  <span>Hapus Logo</span>
                                </button>
                              )}
                              <span className="text-[11px] text-on-surface-variant w-full sm:w-auto">
                                PNG, JPG, WebP, SVG (Maks. 5 MB)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="url"
                                value={editLogoUrlInput}
                                onChange={(e) => {
                                  setEditLogoUrlInput(e.target.value);
                                  setEditOrgLogo(e.target.value);
                                }}
                                placeholder="https://domain-yayasan.org/logo.png"
                                className="flex-1 px-3 py-1.5 text-[12px] border border-outline-variant/60 rounded-xl focus:outline-none focus:border-emerald-600 bg-surface-container-lowest text-on-surface"
                              />
                              {editOrgLogo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditLogoUrlInput('');
                                    setEditOrgLogo('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-[12px] font-semibold transition-colors border border-red-200 cursor-pointer"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/40 text-[11px] text-emerald-900 flex items-start gap-2">
                        <Icon name="info" className="text-emerald-700 text-[16px] shrink-0 mt-0.5" />
                        <span>
                          Logo resmi ini otomatis disinkronkan ke Header Portal Mitra, Direktori Komunitas Disabilitas, dan Kartu Event Pelatihan.
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Foto Profil PIC */}
                    <div className="p-4.5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="account_circle" className="text-primary text-[20px]" />
                          <span className="text-[13px] font-bold text-on-surface">Foto Profil Akun (PIC)</span>
                        </div>
                        {isSuperAdmin ? (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Hak Akses: Super Admin
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Dikelola Super Admin
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative shrink-0">
                          {editAvatar ? (
                            <img
                              src={editAvatar}
                              alt="Preview Foto"
                              className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 shadow-2xs"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[22px] font-bold border-2 border-primary/20 shadow-2xs">
                              {editName ? editName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          {isCompressingAvatar && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                              Proses...
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 flex-1 text-center sm:text-left">
                          {isSuperAdmin ? (
                            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-[12px] font-semibold hover:bg-primary/90 cursor-pointer transition-colors shadow-2xs">
                                <Icon name="upload" className="text-[16px]" />
                                <span>{editAvatar ? 'Ganti Foto' : 'Unggah Foto'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleAvatarFileChange}
                                />
                              </label>

                              {editAvatar && (
                                <button
                                  type="button"
                                  onClick={handleRemoveAvatar}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-[12px] font-semibold transition-colors cursor-pointer border border-red-200"
                                >
                                  <Icon name="delete" className="text-[15px]" />
                                  <span>Hapus</span>
                                </button>
                              )}
                              <span className="text-[11px] text-on-surface-variant">
                                Format JPG, PNG, atau WebP
                              </span>
                            </div>
                          ) : (
                            <p className="text-[12px] text-on-surface-variant">
                              Penggantian foto profil PIC akun dikelola oleh Super Administrator.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer (Sticky) */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
                {editModalSection === 'info' ? (
                  <button
                    type="button"
                    onClick={() => setEditModalSection('branding')}
                    className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Lanjut ke Logo & Visual</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditModalSection('info')}
                    className="text-[12px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Icon name="arrow_back" className="text-[16px]" />
                    <span>Kembali ke Data Lembaga</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-200/60 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit || isCompressingAvatar || isCompressingOrgLogo}
                    className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-[13px] font-bold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingEdit ? (
                      <>
                        <Icon name="progress_activity" className="text-[16px] animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="save" className="text-[16px]" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KHUSUS KELOLA & UNGGAH LOGO MITRA / YAYASAN */}
      {logoModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full border border-slate-200/90 shadow-2xl shadow-slate-950/20 overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center border border-emerald-600/20 shrink-0">
                  <Icon name="corporate_fare" className="text-[22px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-slate-900 truncate">Kelola Logo Mitra / Yayasan</h3>
                  <p className="text-[12px] text-slate-500 truncate max-w-[280px]">
                    {logoModalUser.organizationName || logoModalUser.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseLogoModal}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors flex items-center justify-center cursor-pointer"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto bg-white">
              {/* Preview Box */}
              <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Pratinjau Tampilan Logo
                </span>
                <div className="w-48 h-28 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-3 shadow-2xs overflow-hidden">
                  {logoModalPreview ? (
                    <img
                      src={logoModalPreview}
                      alt="Logo Mitra"
                      className="w-full h-full object-contain"
                      onError={() => {
                        setModalLogoError('URL gambar tidak valid atau tidak dapat dimuat.');
                      }}
                    />
                  ) : (
                    <PartnerLogo
                      name={logoModalUser.organizationName || logoModalUser.name}
                      size="lg"
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  {logoModalPreview ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      <Icon name="check_circle" className="text-[13px]" />
                      Logo Khusus Mitra Terpasang
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                      Menggunakan Inisial Logo Sistem
                    </span>
                  )}
                </div>
              </div>

              {/* Segmented Picker: Upload File or Input URL */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setLogoModalTab('upload')}
                  className={`flex-1 py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                    logoModalTab === 'upload'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon name="upload_file" className="text-[16px]" />
                  Unggah dari Komputer
                </button>
                <button
                  type="button"
                  onClick={() => setLogoModalTab('url')}
                  className={`flex-1 py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                    logoModalTab === 'url'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon name="link" className="text-[16px]" />
                  Input Link / URL Logo
                </button>
              </div>

              {modalLogoError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] flex items-center gap-2">
                  <Icon name="error" className="text-[18px]" />
                  <span>{modalLogoError}</span>
                </div>
              )}

              {logoModalTab === 'upload' ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer relative bg-slate-50/40">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleModalLogoFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-11 h-11 rounded-full bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                        <Icon name="cloud_upload" className="text-[22px]" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-900">
                        Klik atau Tarik Berkas Logo ke Sini
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Mendukung PNG, JPG, WebP, SVG (Maks. 5 MB)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[12px] font-semibold text-slate-800">
                    Alamat URL Gambar / Logo
                  </label>
                  <input
                    type="url"
                    value={logoModalUrlInput}
                    onChange={(e) => {
                      setLogoModalUrlInput(e.target.value);
                      setLogoModalPreview(e.target.value);
                      setModalLogoError(null);
                    }}
                    placeholder="https://contoh-mitra.org/logo.png"
                    className="w-full px-3.5 py-2.5 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 bg-white text-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">
                    Tempelkan tautan langsung ke logo gambar (akhiran .png, .jpg, .svg).
                  </p>
                </div>
              )}

              {/* Info Note */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/50 flex items-start gap-2.5 text-[11px] text-emerald-900">
                <Icon name="info" className="text-emerald-700 text-[16px] shrink-0 mt-0.5" />
                <span>
                  Logo ini akan otomatis disinkronkan ke seluruh sistem: Header Dashboard Mitra, Profil Mitra, Peta Quran Komunitas, dan Kartu Event Pelatihan.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              {logoModalPreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setLogoModalPreview('');
                    setLogoModalUrlInput('');
                    setModalLogoError(null);
                  }}
                  className="px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200 cursor-pointer flex items-center gap-1"
                >
                  <Icon name="delete" className="text-[15px]" />
                  <span>Hapus Logo</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseLogoModal}
                  className="px-4 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingModalLogo}
                  onClick={handleSaveModalLogo}
                  className="px-5 py-2.5 text-[12px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingModalLogo ? (
                    <>
                      <Icon name="progress_activity" className="text-[16px] animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="save" className="text-[16px]" />
                      <span>Simpan Logo Mitra</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
